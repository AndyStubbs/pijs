/**
 * Pi.js - Sound Context Module (Plugin)
 *
 * Shared AudioContext lifecycle, the bus graph, the limiter, master volume, the scheduling
 * lead, and the autoplay unlock.
 *
 * Graph: bus input → [effects slot] → bus output gain → master input → master gain →
 * compressor → makeup trim → soft clipper → destination. The limiter stages can be bypassed
 * as a unit, and engines whose compressor fails the startup probe use the clipper alone.
 *
 * @module plugins/sound/context
 */

"use strict";

import * as g_envelope from "./envelope.js";

export const BUS_NAMES = [ "sfx", "music", "audio" ];

// Web Audio renders in blocks of this many frames
const QUANTUM_FRAMES = 128;

// Immediate changes are scheduled at least this many render quanta ahead
const MIN_SCHEDULE_LEAD_QUANTA = 2;

// Master volume time constant and bus volume ramp length, in seconds
const MASTER_TIME_CONSTANT = 0.015;
const BUS_RAMP = 0.01;

// Compressor settings. The knee must stay 0: the makeup trim below assumes a hard knee.
const COMPRESSOR_SETTINGS = {
	"threshold": -4,
	"knee": 0,
	"ratio": 20,
	"attack": 0.001,
	"release": 0.2
};

// Startup release and the context time at which the tuned release takes over, in seconds
const COMPRESSOR_STARTUP_RELEASE = 0.001;
const COMPRESSOR_SETTLE = 0.05;

// The compressor probe renders one second of a square this many dB below the threshold and
// measures its tail. An engine whose compressor cuts it by more than PROBE_TOLERANCE dB
// reacts to bright waveforms below the threshold (Firefox cuts squares and sawtooths by
// 6-14 dB), so its limiter uses only the soft clipper.
const PROBE_BELOW_THRESHOLD = 6;
const PROBE_TOLERANCE = 1;
const PROBE_FRAMES = 48000;
const PROBE_SAMPLE_RATE = 48000;
const PROBE_TAIL_FRAMES = 4800;

// Soft clipper: identity up to the knee, tanh toward ±1 above it. The curve spans input
// ±LIMITER_HEADROOM, and (points − 1) is a multiple of 80 so the knee is a curve sample.
const LIMITER_HEADROOM = 4;
const LIMITER_KNEE = 0.9;
const LIMITER_CURVE_POINTS = 8001;

const UNLOCK_EVENTS = [ "pointerdown", "keydown", "touchend" ];

let m_audioContext = null;
let m_volume = 0.75;
let m_limiterEnabled = true;
let m_compressorUsable = true;
let m_probeStarted = false;
let m_graph = null;
const m_busVolumes = { "sfx": 1, "music": 1, "audio": 1 };

// Autoplay unlock state
let m_unlockArmed = false;
let m_resumeRequested = false;
const m_unlockCallbacks = [];


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Build the soft clipper curve over input ±LIMITER_HEADROOM
 *
 * @returns {Float32Array} WaveShaper curve
 */
function createClipperCurve() {
	const curve = new Float32Array( LIMITER_CURVE_POINTS );
	const center = ( LIMITER_CURVE_POINTS - 1 ) / 2;
	const step = LIMITER_HEADROOM / center;
	const range = 1 - LIMITER_KNEE;
	for( let i = 0; i < LIMITER_CURVE_POINTS; i++ ) {
		const x = ( i - center ) * step;
		const magnitude = Math.abs( x );
		let y = magnitude;
		if( magnitude > LIMITER_KNEE ) {
			y = LIMITER_KNEE + range * Math.tanh( ( magnitude - LIMITER_KNEE ) / range );
		}
		if( x < 0 ) {
			y = -y;
		}
		curve[ i ] = y;
	}
	return curve;
}

/**
 * Linear makeup gain the compressor applies automatically
 *
 * The Web Audio specification scales output by ( 1 / fullRangeGain ) ^ 0.6, where
 * fullRangeGain is the curve's gain for a full-scale input. With a hard knee that gain is
 * threshold × ( 1 − 1 / ratio ) in dB.
 *
 * @returns {number} Makeup gain
 */
function getMakeupGain() {
	const fullRangeDb = COMPRESSOR_SETTINGS.threshold * ( 1 - 1 / COMPRESSOR_SETTINGS.ratio );
	return Math.pow( 10, -0.6 * fullRangeDb / 20 );
}

/**
 * Create a compressor with the limiter settings
 *
 * @param {BaseAudioContext} context - Audio context
 * @returns {DynamicsCompressorNode} Compressor
 */
function createCompressor( context ) {
	const compressor = context.createDynamicsCompressor();
	for( const name in COMPRESSOR_SETTINGS ) {
		compressor[ name ].value = COMPRESSOR_SETTINGS[ name ];
	}
	return compressor;
}

/**
 * Create the buses, master gain, and limiter for a new context
 *
 * @param {AudioContext} context - Audio context
 * @returns {Object} Graph nodes
 */
function createGraph( context ) {
	const masterInput = context.createGain();
	const masterGain = context.createGain();
	masterGain.gain.value = m_volume;
	masterInput.connect( masterGain );

	// Limiter: compressor and a trim that removes its makeup gain, so levels below the
	// threshold pass unchanged, then a 1/H gain feeding the soft clipper curve
	const compressor = createCompressor( context );

	// The compressor starts at full gain reduction and recovers at its release rate, which
	// would attenuate the first ~0.3 s of audio. A fast release until COMPRESSOR_SETTLE lets
	// it settle before the tuned release applies.
	compressor.release.value = COMPRESSOR_STARTUP_RELEASE;
	compressor.release.setValueAtTime( COMPRESSOR_SETTINGS.release, COMPRESSOR_SETTLE );
	const makeupTrim = context.createGain();
	makeupTrim.gain.value = 1 / getMakeupGain();
	const clipperGain = context.createGain();
	clipperGain.gain.value = 1 / LIMITER_HEADROOM;
	const clipper = context.createWaveShaper();
	clipper.curve = createClipperCurve();
	clipper.oversample = "none";
	compressor.connect( makeupTrim );
	makeupTrim.connect( clipperGain );
	clipperGain.connect( clipper );
	clipper.connect( context.destination );

	// Each bus: fixed input gain, an effects slot (empty), then its own output gain
	const buses = {};
	for( const name of BUS_NAMES ) {
		const input = context.createGain();
		const output = context.createGain();
		output.gain.value = m_busVolumes[ name ];
		input.connect( output );
		output.connect( masterInput );
		buses[ name ] = {
			"input": input,
			"insert": null,
			"output": output,
			"ramp": null
		};
	}

	return {
		"buses": buses,
		"masterInput": masterInput,
		"masterGain": masterGain,
		"compressor": compressor,
		"clipperGain": clipperGain
	};
}

/**
 * Connect the master gain through the limiter or straight to the destination
 *
 * @returns {void}
 */
function routeMaster() {
	const masterGain = m_graph.masterGain;
	masterGain.disconnect();
	if( !m_limiterEnabled ) {
		masterGain.connect( m_audioContext.destination );
	} else if( m_compressorUsable ) {
		masterGain.connect( m_graph.compressor );
	} else {
		masterGain.connect( m_graph.clipperGain );
	}
}

/**
 * Measure the engine's compressor on a bright waveform below the threshold
 *
 * Renders offline, so it needs no user gesture and produces no output. Until the result
 * arrives the limiter uses the compressor.
 *
 * @returns {void}
 */
function probeCompressor() {
	if( m_probeStarted || typeof OfflineAudioContext !== "function" ) {
		return;
	}
	m_probeStarted = true;
	try {
		const context = new OfflineAudioContext( 1, PROBE_FRAMES, PROBE_SAMPLE_RATE );
		const levelDb = COMPRESSOR_SETTINGS.threshold - PROBE_BELOW_THRESHOLD;
		const level = Math.pow( 10, levelDb / 20 );
		const oscillator = context.createOscillator();
		oscillator.type = "square";
		oscillator.frequency.value = 440;
		const gain = context.createGain();
		gain.gain.value = level;
		const compressor = createCompressor( context );
		oscillator.connect( gain );
		gain.connect( compressor );
		compressor.connect( context.destination );
		oscillator.start( 0 );
		context.startRendering().then( buffer => {
			oscillator.disconnect();
			const data = buffer.getChannelData( 0 );
			let peak = 0;
			for( let i = data.length - PROBE_TAIL_FRAMES; i < data.length; i++ ) {
				peak = Math.max( peak, Math.abs( data[ i ] ) );
			}
			const expected = level * getMakeupGain() * Math.pow( 10, -PROBE_TOLERANCE / 20 );
			m_compressorUsable = peak >= expected;
			if( m_audioContext ) {
				routeMaster();
			}
		}, () => {

			// Keep the compressor when the probe cannot render
		} );
	} catch( error ) {

		// Keep the compressor when the probe cannot run
	}
}

/**
 * Select the "ambient" audio session where supported (decision D5): sound respects the iOS
 * mute switch and mixes with audio from other apps
 *
 * @returns {void}
 */
function setAudioSession() {
	try {
		if( typeof navigator !== "undefined" && navigator.audioSession ) {
			navigator.audioSession.type = "ambient";
		}
	} catch( error ) {

		// Keep the browser's default session
	}
}

/**
 * Run and clear the callbacks deferred until unlock
 *
 * @returns {void}
 */
function runUnlockCallbacks() {
	const callbacks = m_unlockCallbacks.splice( 0, m_unlockCallbacks.length );
	for( const callback of callbacks ) {
		try {
			callback();
		} catch( error ) {
			console.error( "sound: Deferred start failed:", error );
		}
	}
}

/**
 * First user gesture while locked: resume, then start deferred requests in the same call
 * stack so they run under the gesture's user activation
 *
 * @returns {void}
 */
function handleUnlockGesture() {
	if( m_audioContext.state === "running" ) {
		disarmUnlock();
		runUnlockCallbacks();
		return;
	}
	m_resumeRequested = true;
	try {
		const result = m_audioContext.resume();
		if( result && typeof result.catch === "function" ) {
			result.catch( () => {

				// The next gesture tries again while the listeners stay armed
			} );
		}
	} catch( error ) {

		// The next gesture tries again while the listeners stay armed
	}
	runUnlockCallbacks();
}

/**
 * Add the capture-phase gesture listeners
 *
 * @returns {void}
 */
function armUnlock() {
	if( m_unlockArmed || typeof document === "undefined" ) {
		return;
	}
	m_unlockArmed = true;
	for( const type of UNLOCK_EVENTS ) {
		document.addEventListener(
			type, handleUnlockGesture, { "capture": true, "passive": true }
		);
	}
}

/**
 * Remove the gesture listeners
 *
 * @returns {void}
 */
function disarmUnlock() {
	if( !m_unlockArmed ) {
		return;
	}
	m_unlockArmed = false;
	for( const type of UNLOCK_EVENTS ) {
		document.removeEventListener( type, handleUnlockGesture, { "capture": true } );
	}
}

/**
 * Track context state: disarm once running, re-arm after a suspension or interruption
 *
 * @returns {void}
 */
function handleStateChange() {
	const state = m_audioContext.state;
	if( state === "running" ) {
		m_resumeRequested = false;
		disarmUnlock();
		runUnlockCallbacks();
	} else if( state === "suspended" || state === "interrupted" ) {
		m_resumeRequested = false;
		armUnlock();
	}
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Get the shared AudioContext, creating it and its graph if needed
 *
 * @returns {AudioContext} Shared audio context
 */
export function getAudioContext() {
	if( !m_audioContext ) {
		m_audioContext = new AudioContext();
		setAudioSession();
		m_graph = createGraph( m_audioContext );
		routeMaster();
		m_audioContext.addEventListener( "statechange", handleStateChange );
		if( m_audioContext.state !== "running" ) {
			armUnlock();
		}
	}

	return m_audioContext;
}

/**
 * Start the one-time compressor probe; called at plugin initialization so the result is
 * normally known before the first sound
 *
 * @returns {void}
 */
export function startLimiterProbe() {
	probeCompressor();
}

/**
 * Whether the shared AudioContext has been created
 *
 * @returns {boolean} True once a sound command has created the context
 */
export function hasAudioContext() {
	return m_audioContext !== null;
}

/**
 * Get the input node of a bus
 *
 * @param {string} bus - "sfx", "music", or "audio"
 * @returns {GainNode} Bus input
 */
export function getBusInput( bus ) {
	getAudioContext();
	return m_graph.buses[ bus ].input;
}

/**
 * Context time at which an immediate change is scheduled
 *
 * The main-thread clock lags the render thread, so immediate automation is placed at least
 * two render quanta (or the base latency, if larger) ahead, on a render-quantum boundary.
 *
 * @returns {number} Context time of the scheduling lead
 */
export function getScheduleLead() {
	const context = getAudioContext();
	const quantum = QUANTUM_FRAMES / context.sampleRate;
	const lead = Math.max( MIN_SCHEDULE_LEAD_QUANTA * quantum, context.baseLatency || 0 );
	return Math.ceil( ( context.currentTime + lead ) / quantum - 1e-6 ) * quantum;
}

/**
 * Set the master gain, shared by all buses; ramps with a ~15 ms time constant
 *
 * @param {number} volume - Volume (0-1); zero is valid
 * @returns {void}
 */
export function setMasterVolume( volume ) {
	m_volume = volume;
	if( !m_audioContext ) {
		return;
	}
	const lead = getScheduleLead();
	const gain = m_graph.masterGain.gain;
	gain.cancelScheduledValues( lead );
	gain.setTargetAtTime( volume, lead, MASTER_TIME_CONSTANT );
}

/**
 * Ramp a bus output gain over 10 ms from the scheduling lead. The output gain follows the
 * bus effects slot, so it also controls effect tails.
 *
 * @param {string} bus - "sfx", "music", or "audio"
 * @param {number} volume - Volume (0-1)
 * @returns {void}
 */
export function setBusOutputVolume( bus, volume ) {
	m_busVolumes[ bus ] = volume;
	if( !m_audioContext ) {
		return;
	}
	const busNodes = m_graph.buses[ bus ];
	const gain = busNodes.output.gain;
	const lead = getScheduleLead();
	let current = gain.value;
	let holdType = "set";
	if( busNodes.ramp ) {
		current = g_envelope.rampValueAt( busNodes.ramp, lead );
		if( lead > busNodes.ramp.t0 && lead < busNodes.ramp.t1 ) {
			holdType = "linear";
		}
	}

	// Cancelling removes a ramp still in progress at the lead, so re-create its value there
	gain.cancelScheduledValues( lead );
	if( holdType === "linear" ) {
		gain.linearRampToValueAtTime( current, lead );
	} else {
		gain.setValueAtTime( current, lead );
	}
	gain.linearRampToValueAtTime( volume, lead + BUS_RAMP );
	busNodes.ramp = { "from": current, "to": volume, "t0": lead, "t1": lead + BUS_RAMP };
}

/**
 * Enable or bypass both limiter stages; switching reconnects immediately
 *
 * @param {boolean} enabled - True routes the master gain through the limiter
 * @returns {void}
 */
export function setLimiterEnabled( enabled ) {
	m_limiterEnabled = enabled;
	if( m_audioContext ) {
		routeMaster();
	}
}

/**
 * Whether new requests must follow the locked-context policy
 *
 * The context counts as unlocked once a gesture has called resume(), so requests made in
 * that gesture's own handlers are kept while the resume promise settles.
 *
 * @returns {boolean} True while the context is suspended and no gesture has resumed it
 */
export function isLocked() {
	const context = getAudioContext();
	return context.state !== "running" && !m_resumeRequested;
}

/**
 * Defer a start until the unlocking gesture or the context starts running
 *
 * @param {Function} callback - Called once, synchronously inside the gesture listener
 * @returns {void}
 */
export function onUnlock( callback ) {
	m_unlockCallbacks.push( callback );
}

/**
 * Cancel a deferred start
 *
 * @param {Function} callback - Callback passed to onUnlock
 * @returns {void}
 */
export function cancelUnlock( callback ) {
	const index = m_unlockCallbacks.indexOf( callback );
	if( index > -1 ) {
		m_unlockCallbacks.splice( index, 1 );
	}
}
