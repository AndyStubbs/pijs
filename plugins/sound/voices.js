/**
 * Pi.js - Sound Voices Module (Plugin)
 *
 * Synthesized voices: creation, occupancy-interval admission, voice stealing, the live-voice
 * cap, the single de-clicked stop path, and the sound() and stopSound() commands. Sample
 * instances from samples.js join the same voice table, caps, and stop path.
 *
 * @module plugins/sound/voices
 */

"use strict";

import * as g_context from "./context.js";
import * as g_envelope from "./envelope.js";
import * as g_noise from "./noise.js";
import * as g_scheduler from "./scheduler.js";

// Slot holders whose occupancy intervals may overlap at any instant
export const MAX_VOICES = 64;

// Voices in any node-holding state, including retiring and stopping
export const MAX_LIVE_VOICES = 128;

const OSCILLATOR_TYPES = [ "triangle", "sine", "square", "sawtooth" ];
const CAPACITY_WARNING_INTERVAL = 1000;

// Voices by sound ID, in creation order
const m_voices = new Map();
let m_nextSoundId = 0;
let m_nextOrder = 0;
let m_lastCapacityWarning = -Infinity;

g_scheduler.setFillProbe(
	() => countLiveVoices() < MAX_LIVE_VOICES - g_scheduler.FILL_HEADROOM
);


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Count voices that hold nodes and count toward the live-voice cap
 *
 * @returns {number} Live voice count
 */
function countLiveVoices() {
	return m_voices.size;
}

/**
 * Stop a voice's inserts at a deadline
 *
 * @param {Object} voice - Voice record
 * @param {number} when - Context time
 * @returns {void}
 */
function stopInserts( voice, when ) {
	for( const insert of voice.inserts ) {
		insert.stop( when );
	}
}

/**
 * Dispose of voice inserts once each
 *
 * @param {Array<Object>} inserts - Realized inserts
 * @returns {void}
 */
function disposeInserts( inserts ) {
	for( const insert of inserts.splice( 0, inserts.length ) ) {
		try {
			insert.dispose();
		} catch( error ) {
			console.error( "sound: Insert cleanup failed:", error );
		}
	}
}

/**
 * Log a capacity warning at most once per second
 *
 * @returns {void}
 */
function warnCapacity() {
	const now = Date.now();
	if( now - m_lastCapacityWarning >= CAPACITY_WARNING_INTERVAL ) {
		m_lastCapacityWarning = now;
		console.warn( "sound: Voice capacity reached; a new sound was not played." );
	}
}

/**
 * Disconnect a voice's nodes and remove it from the voice table; runs once per voice
 *
 * @param {Object} voice - Voice record
 * @returns {void}
 */
function disposeVoice( voice ) {
	if( voice.disposed ) {
		return;
	}
	voice.disposed = true;
	for( const node of voice.nodes ) {
		try {
			node.disconnect();
		} catch( caughtError ) {

			// Already disconnected
		}
	}
	m_voices.delete( voice.id );
	disposeInserts( voice.inserts );
	if( voice.onDispose ) {
		try {
			voice.onDispose( voice );
		} catch( error ) {
			console.error( "sound: Voice cleanup failed:", error );
		}
	}
}

/**
 * Stop a voice immediately without a fade and dispose of it now
 *
 * Used for voices that are not yet audible and for forced node-cap cleanup, the only path
 * that can click.
 *
 * @param {Object} voice - Voice record
 * @returns {void}
 */
function hardStop( voice ) {
	try {
		voice.source.stop();
	} catch( caughtError ) {

		// Already stopped
	}
	try {
		stopInserts( voice, g_context.getAudioContext().currentTime );
	} catch( error ) {
		console.error( "sound: Insert stop failed:", error );
	}
	disposeVoice( voice );
}

/**
 * Create an oscillator with its waveform and pitch, including an optional exponential sweep
 * over the gate
 *
 * @param {AudioContext} context - Audio context
 * @param {Object} spec - Voice spec
 * @param {number} begin - Audible start in context time
 * @param {number} offset - Seconds into the envelope at which a late voice begins
 * @returns {OscillatorNode} Oscillator
 */
function createOscillator( context, spec, begin, offset ) {
	const source = context.createOscillator();
	const env = spec.env;
	if( spec.oType === "custom" ) {
		source.setPeriodicWave(
			context.createPeriodicWave( spec.waveTables[ 0 ], spec.waveTables[ 1 ] )
		);
	} else {
		source.type = spec.oType;
	}

	if( spec.frequencyEnd != null ) {
		let frequency = spec.frequency;
		if( offset > 0 && env.gate > 0 ) {
			const progress = Math.min( offset / env.gate, 1 );
			const ratio = spec.frequencyEnd / spec.frequency;
			frequency = spec.frequency * Math.pow( ratio, progress );
		}
		source.frequency.setValueAtTime( frequency, begin );
		if( spec.start + env.gate > begin ) {
			source.frequency.exponentialRampToValueAtTime(
				spec.frequencyEnd, spec.start + env.gate
			);
		}
	} else {
		source.frequency.value = spec.frequency;
	}
	return source;
}

/**
 * Build a voice's nodes and start it
 *
 * @param {Object} spec - Voice spec
 * @param {string} soundId - Sound ID
 * @returns {Object} Voice record
 */
function buildVoice( spec, soundId ) {
	const context = g_context.getAudioContext();
	const env = spec.env;
	const offset = spec.offset || 0;
	const begin = spec.start + offset;
	const end = spec.start + g_envelope.getEnvelopeLength( env );
	let peak = spec.peak;
	if( spec.pan ) {
		peak *= panGain( spec.pan );
	}
	const voice = createVoiceRecord( {
		"id": soundId,
		"start": spec.start,
		"begin": begin,
		"end": end,
		"env": env,
		"peak": peak,
		"onDispose": spec.onDispose || null
	} );

	try {

		// Noise ignores frequency and frequencyEnd (decision D1)
		let source;
		let sourceOffset = null;
		if( g_noise.isNoiseType( spec.oType ) ) {
			const noise = g_noise.createNoiseSource( context, spec.oType );
			source = noise.source;
			sourceOffset = noise.offset;
		} else {
			source = createOscillator( context, spec, begin, offset );
		}
		voice.source = source;
		voice.nodes.push( source );
		let output = source;

		// Voice inserts are built only now, after admission, and chained after the source
		if( spec.inserts ) {
			for( const descriptor of spec.inserts ) {
				const insert = descriptor.factory( context, descriptor.params );
				voice.inserts.push( insert );
				output.connect( insert.input );
				output = insert.output;
				insert.start( begin, spec.start + env.gate );
				insert.stop( end );
			}
		}

		// A late start multiplies the remaining envelope by a MIN_RAMP fade-in
		if( offset > 0 ) {
			const onset = context.createGain();
			voice.nodes.push( onset );
			onset.gain.value = 0;
			onset.gain.setValueAtTime( 0, begin );
			onset.gain.linearRampToValueAtTime( 1, begin + g_envelope.MIN_RAMP );
			output.connect( onset );
			output = onset;
		}

		const gain = context.createGain();
		voice.gain = gain;
		voice.nodes.push( gain );
		gain.gain.value = 0;
		g_envelope.applySchedule(
			gain.gain, g_envelope.buildEnvelopeSchedule( env, spec.start, peak, offset )
		);
		output.connect( gain );
		output = gain;

		// Panner only for panned voices
		if( spec.pan ) {
			const panner = context.createStereoPanner();
			voice.nodes.push( panner );
			panner.pan.value = spec.pan;
			output.connect( panner );
			output = panner;
		}

		output.connect( g_context.getBusInput( spec.bus ) );
		source.onended = () => {
			disposeVoice( voice );
		};
		if( sourceOffset === null ) {
			source.start( begin );
		} else {
			source.start( begin, sourceOffset );
		}
		source.stop( end );
	} catch( error ) {
		voice.disposed = true;
		for( const node of voice.nodes ) {
			try {
				node.disconnect();
			} catch( caughtError ) {

				// Already disconnected
			}
		}
		disposeInserts( voice.inserts );
		throw error;
	}

	m_voices.set( soundId, voice );
	return voice;
}

/**
 * Admit a synth voice under the slot and live-voice caps, then create it
 *
 * @param {Object} spec - Voice spec with start, offset, and env
 * @param {string} soundId - Sound ID
 * @returns {Object|null} Voice record, or null when rejected
 */
function admitAndCreate( spec, soundId ) {
	return admitVoice( {
		"begin": spec.start + ( spec.offset || 0 ),
		"end": spec.start + g_envelope.getEnvelopeLength( spec.env ),
		"protected": false,
		"inherit": false,
		"build": () => buildVoice( spec, soundId )
	} );
}

/**
 * Throw a RangeError with an error code
 *
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {never}
 */
function throwRange( message, code ) {
	const error = new RangeError( message );
	error.code = code;
	throw error;
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Allocate a sound ID, shared by sound() requests and play() notes
 *
 * @returns {string} Sound ID
 */
export function nextSoundId() {
	const soundId = "sound_" + m_nextSoundId;
	m_nextSoundId += 1;
	return soundId;
}

/**
 * Start a synth voice now or at its scheduled time, applying the late-start rule
 *
 * An item is late when its start is before the scheduling lead. Expiration is checked
 * first; a surviving item within grace starts at the lead at its timeline position with an
 * onset fade, and an item beyond grace is skipped. Expired, skipped, and rejected items
 * create no nodes and their IDs are completed.
 *
 * @param {Object} spec - Voice spec: frequency, frequencyEnd, oType, waveTables, peak, pan,
 * bus, env, start, and optional inserts and onDispose. Its offset is set here.
 * @param {string} soundId - Sound ID
 * @returns {Object|null} Voice record, or null when the item did not play
 */
export function startVoice( spec, soundId ) {
	const context = g_context.getAudioContext();
	const now = context.currentTime;
	const lead = g_context.getScheduleLead();
	spec.offset = 0;
	if( spec.start < lead ) {
		const end = spec.start + g_envelope.getEnvelopeLength( spec.env );
		if( end - lead < g_envelope.MIN_RAMP ) {
			return null;
		}
		if( now - spec.start > g_scheduler.LATE_GRACE ) {
			return null;
		}
		spec.offset = lead - spec.start;
	}
	return admitAndCreate( spec, soundId );
}

/**
 * Gain that keeps a panned voice's louder channel at its peak
 *
 * A mono input to a StereoPannerNode gets cos θ and sin θ per channel, so the scaled
 * channels keep the equal-power ratio while center matches an unpanned voice.
 *
 * @param {number} pan - Stereo position from -1 to 1
 * @returns {number} Gain factor, from 1 at the edges to √2 at center
 */
export function panGain( pan ) {
	const angle = ( pan + 1 ) * Math.PI / 4;
	return 1 / Math.max( Math.cos( angle ), Math.sin( angle ) );
}

/**
 * Create a voice record with default lifecycle fields
 *
 * Sample instances build their own nodes and pass `kind`, their stop hooks, and `onDispose`.
 * `fade( fadeStart, deadline )` replaces the synth envelope fade in stopVoice.
 *
 * @param {Object} fields - Record fields; id, start, begin, and end are required
 * @returns {Object} Voice record
 */
export function createVoiceRecord( fields ) {
	const voice = Object.assign( {
		"kind": "synth",
		"order": m_nextOrder,
		"stopKind": null,
		"fadeStart": null,
		"protected": false,
		"nodes": [],
		"inserts": [],
		"source": null,
		"gain": null,
		"fade": null,
		"onDispose": null,
		"disposed": false
	}, fields );
	m_nextOrder += 1;
	if( voice.slotEnd === undefined ) {
		voice.slotEnd = voice.end;
	}
	return voice;
}

/**
 * Add an externally built voice to the voice table
 *
 * @param {Object} voice - Voice record from createVoiceRecord
 * @returns {void}
 */
export function registerVoice( voice ) {
	m_voices.set( voice.id, voice );
}

/**
 * Disconnect a voice's nodes and remove it from the voice table; runs once per voice
 *
 * @param {Object} voice - Voice record
 * @returns {void}
 */
export function releaseVoice( voice ) {
	disposeVoice( voice );
}

/**
 * Admit a voice under the slot and live-voice caps, then build it
 *
 * Victims and cleanup are chosen first and committed only when the voice is admitted, so a
 * rejection touches no existing voice. A voice that inherits a slot (stream replacement)
 * skips slot planning but still frees room under the live-voice cap.
 *
 * @param {Object} request - Admission request
 * @param {number} request.begin - Audible start in context time
 * @param {number} request.end - Occupancy end; Infinity for sample instances
 * @param {boolean} request.protected - Protected from automatic stealing (loops)
 * @param {boolean} request.inherit - Inherits the slot of a replaced instance
 * @param {Function} request.build - Creates the nodes and returns the voice record
 * @returns {Object|null} Voice record, or null when rejected
 */
export function admitVoice( request ) {
	const context = g_context.getAudioContext();
	const now = context.currentTime;
	const lead = g_context.getScheduleLead();
	const live = Array.from( m_voices.values() );

	// Node cap: pick the voice to free before planning admission
	let cleanup = null;
	if( live.length >= MAX_LIVE_VOICES ) {
		cleanup = chooseCleanup( live, now, lead );
		if( cleanup === null ) {
			warnCapacity();
			return null;
		}
	}

	let victims = [];
	if( !request.inherit ) {
		const holders = [];
		for( const voice of live ) {
			if(
				voice !== cleanup && voice.slotEnd !== null && voice.slotEnd > request.begin
			) {
				holders.push( {
					"voice": voice,
					"start": voice.begin,
					"end": voice.slotEnd,
					"order": voice.order,
					"protected": voice.protected
				} );
			}
		}
		const plan = planAdmission( holders, request.begin, request.end, MAX_VOICES );
		if( !plan.admit ) {
			warnCapacity();
			return null;
		}
		victims = plan.victims;
	}

	if( cleanup !== null ) {
		hardStop( cleanup );
	}
	for( const victim of victims ) {
		stopVoice( victim.holder.voice, victim.conflict, "steal" );
	}
	const voice = request.build();
	voice.protected = request.protected === true;
	return voice;
}

/**
 * Plan admission of an interval against slot holders' occupancy intervals
 *
 * The conflict time is the first instant in [start, end) at which the incoming voice would
 * make maxVoices + 1 overlapping holders. The victim is the oldest unprotected holder whose
 * interval contains it; its interval is truncated there and the check repeats. Victims are
 * tentative: when any conflict cannot be resolved, the result has no victims.
 *
 * @param {Array<Object>} holders - { start, end, order, protected } intervals [start, end)
 * @param {number} start - Incoming start time
 * @param {number} end - Incoming end time
 * @param {number} maxVoices - Slot limit
 * @returns {Object} { admit, victims: [{ holder, conflict }] }
 */
export function planAdmission( holders, start, end, maxVoices ) {
	const ends = new Map();
	for( const holder of holders ) {
		ends.set( holder, holder.end );
	}
	const victims = [];

	for( let guard = 0; guard <= holders.length; guard++ ) {

		// The peak count changes only at the incoming start and at holder starts inside it
		const points = [ start ];
		for( const holder of holders ) {
			if( holder.start > start && holder.start < end ) {
				points.push( holder.start );
			}
		}
		points.sort( ( a, b ) => a - b );

		let conflict = null;
		for( const point of points ) {
			let count = 0;
			for( const holder of holders ) {
				if( holder.start <= point && point < ends.get( holder ) ) {
					count += 1;
				}
			}
			if( count >= maxVoices ) {
				conflict = point;
				break;
			}
		}
		if( conflict === null ) {
			return { "admit": true, "victims": victims };
		}

		let victim = null;
		for( const holder of holders ) {
			if(
				!holder.protected && holder.start <= conflict && conflict < ends.get( holder ) &&
				( victim === null || holder.order < victim.order )
			) {
				victim = holder;
			}
		}
		if( victim === null ) {
			return { "admit": false, "victims": [] };
		}
		ends.set( victim, conflict );
		victims.push( { "holder": victim, "conflict": conflict } );
	}

	return { "admit": false, "victims": [] };
}

/**
 * Choose the voice to free when the live-voice cap is reached
 *
 * Order: a retiring voice not yet audible; the stopping voice furthest into its fade (earliest
 * deadline, including finished voices awaiting disposal); the oldest audible retiring voice;
 * the oldest unprotected active voice. Protected and scheduled voices are never chosen.
 *
 * @param {Array<Object>} voices - Records with begin, end, order, stopKind, fadeStart, protected
 * @param {number} now - Current context time
 * @param {number} lead - Scheduling lead
 * @returns {Object|null} Voice to free, or null to reject the incoming voice
 */
export function chooseCleanup( voices, now, lead ) {
	let silentRetiring = null;
	let stopping = null;
	let audibleRetiring = null;
	let active = null;
	for( const voice of voices ) {
		const retiring = voice.stopKind === "steal" && now < voice.fadeStart;
		if( retiring && voice.begin >= lead ) {
			if( silentRetiring === null || voice.order < silentRetiring.order ) {
				silentRetiring = voice;
			}
		} else if( ( voice.stopKind !== null && !retiring ) || voice.end <= now ) {
			if( stopping === null || voice.end < stopping.end ) {
				stopping = voice;
			}
		} else if( retiring ) {
			if( audibleRetiring === null || voice.order < audibleRetiring.order ) {
				audibleRetiring = voice;
			}
		} else if( !voice.protected && voice.begin < lead ) {
			if( active === null || voice.order < active.order ) {
				active = voice;
			}
		}
	}
	return silentRetiring || stopping || audibleRetiring || active;
}

/**
 * Lifecycle state of a node-holding voice
 *
 * @param {Object} voice - Voice record
 * @param {number} now - Current context time
 * @param {number} lead - Scheduling lead
 * @returns {string} "scheduled", "active", "retiring", or "stopping"
 */
export function getVoiceState( voice, now, lead ) {
	if( voice.stopKind === "stop" ) {
		return "stopping";
	}
	if( voice.stopKind === "steal" ) {
		if( now < voice.fadeStart ) {
			return "retiring";
		}
		return "stopping";
	}
	if( voice.begin >= lead ) {
		return "scheduled";
	}
	return "active";
}

/**
 * Stop a voice through the single de-clicked path
 *
 * `when` is the requested silence deadline; omitted, the fade starts at the scheduling
 * lead. A voice that would not sound before the fade starts is cancelled without sounding.
 * An earlier committed end or fade is never prolonged. Otherwise the analytic envelope value
 * is pinned at the fade start and gain ramps to 0 over STOP_FADE.
 *
 * @param {Object} voice - Voice record
 * @param {number|null} when - Silence deadline in context time, or null for now
 * @param {string} kind - "stop" for explicit stops (release the slot) or "steal"
 * @returns {void}
 */
export function stopVoice( voice, when, kind ) {
	if( voice.disposed ) {
		return;
	}
	const lead = g_context.getScheduleLead();
	let fadeStart = lead;
	if( when !== null && when !== undefined ) {
		fadeStart = Math.max( lead, when - g_envelope.STOP_FADE );
	}

	if( kind === "steal" ) {
		if( voice.slotEnd !== null ) {
			voice.slotEnd = Math.min( voice.slotEnd, when );
		}
	} else {
		voice.slotEnd = null;
	}

	if( voice.begin >= fadeStart ) {
		hardStop( voice );
		return;
	}

	const deadline = fadeStart + g_envelope.STOP_FADE;
	if( kind === "stop" ) {
		voice.stopKind = "stop";
	}
	if( voice.end <= deadline ) {
		return;
	}
	if( voice.stopKind === null ) {
		voice.stopKind = "steal";
	}
	voice.end = deadline;
	voice.fadeStart = fadeStart;
	if( voice.fade ) {
		voice.fade( fadeStart, deadline );
		return;
	}

	const param = voice.gain.gain;
	param.cancelScheduledValues( fadeStart );
	g_envelope.applySchedule( param, [
		g_envelope.stopHoldEvent( voice.env, voice.start, voice.peak, fadeStart ),
		{ "type": "linear", "time": deadline, "value": 0 }
	] );
	voice.source.stop( deadline );
	stopInserts( voice, deadline );
}

/**
 * Stop a sound or pending request by ID; unknown and completed IDs are ignored
 *
 * @param {string} soundId - Sound ID
 * @param {number|null} [when=null] - Silence deadline in context time
 * @returns {void}
 */
export function stopSoundById( soundId, when = null ) {
	if( g_scheduler.removePending( soundId ) ) {
		return;
	}
	const voice = m_voices.get( soundId );
	if( voice && voice.kind === "synth" ) {
		stopVoice( voice, when, "stop" );
	}
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register voice commands
 *
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
export function registerVoices( pluginApi ) {
	const utils = pluginApi.utils;


	pluginApi.addCommand( "sound", sound, false, [
		"frequency", "duration", "volume", "oType", "delay", "attackTime", "decayTime",
		"sustainLevel", "releaseTime", "pan", "frequencyEnd"
	] );

	/**
	 * Play a synthesized sound with an ADSR envelope
	 *
	 * @param {Object} options - Command options
	 * @param {number} options.frequency - Frequency in Hz; no effect on noise (default: 440)
	 * @param {number} options.duration - Gate length in seconds before release (default: 1)
	 * @param {number} options.volume - Peak gain 0-1 (default: 1)
	 * @param {string|Array} options.oType - Oscillator type, "white" or "pink" noise, or a
	 * custom wave table (default: "triangle")
	 * @param {number} options.delay - Delay before playing in seconds (default: 0)
	 * @param {number} options.attackTime - Seconds from silence to peak (default: 0)
	 * @param {number} options.decayTime - Seconds from peak to the sustain level (default: 0)
	 * @param {number} options.sustainLevel - Fraction of peak held until the gate ends
	 * (default: 1)
	 * @param {number} options.releaseTime - Seconds from the gate-end level to silence
	 * (default: 0.1)
	 * @param {number} options.pan - Stereo position from -1 (left) to 1 (right); the louder
	 * channel stays at the volume (default: 0)
	 * @param {number} options.frequencyEnd - Exponential sweep target in Hz over the duration;
	 * no effect on noise
	 * @returns {string} Sound ID for use with stopSound
	 */
	function sound( options ) {
		const frequency = utils.getFloat( options.frequency, 440 );
		const duration = utils.getFloat( options.duration, 1 );
		const volume = utils.getFloat( options.volume, 1 );
		let oType;
		if( options.oType != null ) {
			oType = options.oType;
		} else {
			oType = "triangle";
		}
		const delay = utils.getFloat( options.delay, 0 );
		const attackTime = utils.getFloat( options.attackTime, 0 );
		const decayTime = utils.getFloat( options.decayTime, 0 );
		const sustainLevel = utils.getFloat( options.sustainLevel, 1 );
		const releaseTime = utils.getFloat( options.releaseTime, 0.1 );
		const pan = utils.getFloat( options.pan, 0 );
		let frequencyEnd = null;
		if( options.frequencyEnd != null ) {
			frequencyEnd = utils.getFloat( options.frequencyEnd, NaN );
		}

		// Validate duration
		if( duration < 0 ) {
			throwRange(
				"sound: Parameter duration must be a number greater than or equal to 0.",
				"INVALID_DURATION"
			);
		}

		// Validate volume
		if( volume < 0 || volume > 1 ) {
			throwRange(
				"sound: Parameter volume must be a number between 0 and 1.", "INVALID_VOLUME"
			);
		}

		// Validate delay
		if( delay < 0 ) {
			throwRange(
				"sound: Parameter delay must be a number greater than or equal to 0.",
				"INVALID_DELAY"
			);
		}

		// Validate envelope stages
		if( attackTime < 0 ) {
			throwRange(
				"sound: Parameter attackTime must be a number greater than or equal to 0.",
				"INVALID_ATTACK_TIME"
			);
		}
		if( decayTime < 0 ) {
			throwRange(
				"sound: Parameter decayTime must be a number greater than or equal to 0.",
				"INVALID_DECAY_TIME"
			);
		}
		if( sustainLevel < 0 || sustainLevel > 1 ) {
			throwRange(
				"sound: Parameter sustainLevel must be a number between 0 and 1.",
				"INVALID_SUSTAIN_LEVEL"
			);
		}
		if( releaseTime < 0 ) {
			throwRange(
				"sound: Parameter releaseTime must be a number greater than or equal to 0.",
				"INVALID_RELEASE_TIME"
			);
		}

		// Validate pan
		if( pan < -1 || pan > 1 ) {
			throwRange( "sound: Parameter pan must be a number between -1 and 1.", "INVALID_PAN" );
		}

		// An exponential sweep cannot reach or cross zero
		if( frequencyEnd !== null && !( frequency > 0 && frequencyEnd > 0 ) ) {
			throwRange(
				"sound: Parameters frequency and frequencyEnd must be greater than 0 for a sweep.",
				"INVALID_FREQUENCY"
			);
		}

		let waveTables = null;

		// Check for custom waveform (array)
		if( Array.isArray( oType ) ) {
			if(
				oType.length !== 2 ||
				oType[ 0 ].length === 0 ||
				oType[ 1 ].length === 0 ||
				oType[ 0 ].length !== oType[ 1 ].length
			) {
				const error = new TypeError(
					"sound: Parameter oType array must contain two non-empty arrays of " +
					"equal length."
				);
				error.code = "INVALID_WAVE_TABLE";
				throw error;
			}

			waveTables = [];

			// Validate all values are numbers
			for( let i = 0; i < oType.length; i++ ) {
				for( let j = 0; j < oType[ i ].length; j++ ) {
					if( isNaN( oType[ i ][ j ] ) ) {
						const error = new TypeError(
							"sound: Parameter oType array must only contain numbers."
						);
						error.code = "INVALID_WAVE_TABLE_VALUE";
						throw error;
					}
				}
				waveTables.push( new Float32Array( oType[ i ] ) );
			}

			oType = "custom";
		} else if( typeof oType !== "string" ) {
			const error = new TypeError( "sound: Parameter oType must be a string or an array." );
			error.code = "INVALID_OTYPE";
			throw error;
		} else if( OSCILLATOR_TYPES.indexOf( oType ) === -1 && !g_noise.isNoiseType( oType ) ) {
			const error = new Error(
				"sound: Parameter oType must be one of: triangle, sine, square, sawtooth, " +
				"white, pink."
			);
			error.code = "INVALID_OTYPE";
			throw error;
		}

		// A locked context drops one-shots; the ID is returned in the completed state
		const context = g_context.getAudioContext();
		const soundId = nextSoundId();
		if( g_context.isLocked() ) {
			return soundId;
		}

		const now = context.currentTime;
		const spec = {
			"frequency": frequency,
			"frequencyEnd": frequencyEnd,
			"oType": oType,
			"waveTables": waveTables,
			"peak": volume,
			"pan": pan,
			"bus": "sfx",
			"env": g_envelope.resolveEnvelope( {
				"duration": duration,
				"attackTime": attackTime,
				"decayTime": decayTime,
				"sustainLevel": sustainLevel,
				"releaseTime": releaseTime
			} ),
			"start": Math.max( now + delay, g_context.getScheduleLead() )
		};

		// Start now inside the window; otherwise keep a pending record until the window
		if( g_scheduler.shouldCreate( spec.start, now ) ) {
			startVoice( spec, soundId );
		} else {
			g_scheduler.addPending( {
				"id": soundId,
				"kind": "sound",
				"start": spec.start,
				"run": () => startVoice( spec, soundId )
			}, "sound" );
		}

		return soundId;
	}


	pluginApi.addCommand( "stopSound", stopSound, false, [ "soundId" ] );

	/**
	 * Stop a playing sound or all sounds with a short fade
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.soundId - Sound ID (null to stop all sounds)
	 * @returns {void}
	 */
	function stopSound( options ) {
		const soundId = options.soundId;

		// If no soundId, stop all sounds and drop pending requests
		if( soundId == null ) {
			g_scheduler.clearPending( "sound" );
			for( const voice of Array.from( m_voices.values() ) ) {
				if( voice.kind === "synth" ) {
					stopVoice( voice, null, "stop" );
				}
			}
			return;
		}

		stopSoundById( soundId );
	}
}
