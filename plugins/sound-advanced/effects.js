/**
 * Pi.js - Sound Advanced Effects Module (Plugin)
 *
 * Bus effects: reverb, delay, filter, distortion, bitcrusher, and chorus. Each effect is a
 * stage builder with a declared list of rampable options. A bus holds one insert, placed
 * through the sound service's setBusInsert, that chains up to four stages in order. The bus
 * volume follows the insert, so changing it never replaces the effect, and muting a bus also
 * silences effect tails.
 *
 * A call whose effect types and order match the bus's current chain updates it in place: the
 * changed rampable options ramp to their new values, so tails continue. Any other change
 * builds a new insert.
 *
 * @module plugins/sound-advanced/effects
 */

"use strict";

import * as g_worklet from "./worklet.js";

export const EFFECT_BUSES = [ "sfx", "music", "audio", "master" ];
export const EFFECT_TYPES = [ "reverb", "delay", "filter", "distortion", "bitcrush", "chorus" ];

/** Most effects in one chain */
export const MAX_CHAIN = 4;

// Length of an in-place option ramp, in seconds
const RAMP_TIME = 0.02;

// Longest delay line, in seconds
const MAX_DELAY_TIME = 2;

// Chorus delay center, in seconds; longer than the deepest modulation
const CHORUS_DELAY = 0.015;

// Distortion curve steepness, and the pre-gain range that drive 0-1 maps to
const DRIVE_CURVE = 20;
const DRIVE_MIN_GAIN = 0.005;
const DRIVE_RANGE = 200;

// Generated reverb impulses by sample rate, length, and decay
const m_impulses = new Map();

// Shared distortion curve, created on first use
let m_driveCurve = null;

// Ramp records by AudioParam: { from, to, t0, t1 }
const m_ramps = new WeakMap();

// Current chain by bus: { context, chain, stages }
const m_chains = new Map();

// Whether the bitcrush worklet failure has been reported
let m_crushWarned = false;


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Throw an error with an error code
 *
 * @param {Function} ErrorType - Error constructor
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {never}
 */
function throwCode( ErrorType, message, code ) {
	const error = new ErrorType( message );
	error.code = code;
	throw error;
}

/**
 * Set an AudioParam immediately and record the value for later ramps
 *
 * @param {AudioParam} param - Parameter
 * @param {number} value - Value
 * @returns {void}
 */
function setParam( param, value ) {
	param.value = value;
	m_ramps.set( param, { "from": value, "to": value, "t0": 0, "t1": 0 } );
}

/**
 * Ramp an AudioParam linearly to a target over RAMP_TIME, continuing any ramp in progress.
 * The current value comes from the ramp record, not param.value, which engines report
 * differently during automation.
 *
 * @param {AudioParam} param - Parameter set with setParam
 * @param {number} target - Target value
 * @param {number} time - Context time at which the ramp begins
 * @returns {void}
 */
function rampParam( param, target, time ) {
	const ramp = m_ramps.get( param );
	let current = ramp.to;
	if( time <= ramp.t0 ) {
		current = ramp.from;
	} else if( time < ramp.t1 ) {
		current = ramp.from + ( ramp.to - ramp.from ) * ( time - ramp.t0 ) / ( ramp.t1 - ramp.t0 );
	}
	param.cancelScheduledValues( time );
	if( time > ramp.t0 && time <= ramp.t1 ) {
		param.linearRampToValueAtTime( current, time );
	} else {
		param.setValueAtTime( current, time );
	}
	param.linearRampToValueAtTime( target, time + RAMP_TIME );
	m_ramps.set( param, { "from": current, "to": target, "t0": time, "t1": time + RAMP_TIME } );
}

/**
 * Get a stereo decaying-noise impulse response, generated once per setting
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {number} time - Impulse length in seconds
 * @param {number} decay - Decay curve exponent; larger values die away faster
 * @returns {AudioBuffer} Impulse response
 */
function getImpulse( context, time, decay ) {
	const key = context.sampleRate + ":" + time + ":" + decay;
	let impulse = m_impulses.get( key );
	if( impulse ) {
		return impulse;
	}
	const length = Math.max( Math.round( time * context.sampleRate ), 1 );
	impulse = context.createBuffer( 2, length, context.sampleRate );
	for( let channel = 0; channel < 2; channel++ ) {
		const data = impulse.getChannelData( channel );
		for( let i = 0; i < length; i++ ) {
			data[ i ] = ( Math.random() * 2 - 1 ) * Math.pow( 1 - i / length, decay );
		}
	}
	m_impulses.set( key, impulse );
	return impulse;
}

/**
 * Get the shared distortion curve: tanh( DRIVE_CURVE * x ) over -1 to 1
 *
 * @returns {Float32Array} Curve
 */
function getDriveCurve() {
	if( !m_driveCurve ) {
		m_driveCurve = new Float32Array( 4097 );
		for( let i = 0; i < 4097; i++ ) {
			m_driveCurve[ i ] = Math.tanh( DRIVE_CURVE * ( i / 2048 - 1 ) );
		}
	}
	return m_driveCurve;
}

/**
 * Distortion gains for a drive setting. The pre-gain rises exponentially, from a nearly
 * linear part of the curve at drive 0 to heavy saturation at 1; the make-up gain keeps a
 * full-scale input at full scale.
 *
 * @param {number} drive - Drive, 0-1
 * @returns {Array<number>} [ pre-gain, make-up gain ]
 */
function driveGains( drive ) {
	const gain = DRIVE_MIN_GAIN * Math.pow( DRIVE_RANGE, drive );
	return [ gain, 1 / Math.tanh( DRIVE_CURVE * gain ) ];
}

/**
 * Create a stage that mixes a dry path with a wet processing chain
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {number} mix - Wet share, 0-1
 * @param {AudioNode|null} wetInput - First node of the wet chain; null leaves it unconnected
 * @param {AudioNode|null} wetOutput - Last node of the wet chain
 * @param {Array<AudioNode>} nodes - Wet chain nodes to disconnect on dispose
 * @returns {Object} Stage: input, output, dry, wet, nodes
 */
function createMixStage( context, mix, wetInput, wetOutput, nodes ) {
	const input = context.createGain();
	const output = context.createGain();
	const dry = context.createGain();
	const wet = context.createGain();
	setParam( dry.gain, 1 - mix );
	setParam( wet.gain, mix );
	input.connect( dry );
	dry.connect( output );
	if( wetInput ) {
		input.connect( wetInput );
		wetOutput.connect( wet );
	}
	wet.connect( output );
	return {
		"input": input,
		"output": output,
		"dry": dry,
		"wet": wet,
		"nodes": [ input, dry, wet, output ].concat( nodes )
	};
}

/**
 * Ramp targets for a mix stage's wet share; none while its wet chain is not ready
 *
 * @param {Object} stage - Mix stage
 * @param {number} mix - Wet share, 0-1
 * @returns {Array<Array>} [ param, target ] pairs
 */
function mixTargets( stage, mix ) {
	if( stage.pending ) {
		return [];
	}
	return [ [ stage.dry.gain, 1 - mix ], [ stage.wet.gain, mix ] ];
}

/**
 * Build a reverb stage: a convolver with a generated impulse
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} opts - time, decay, and mix
 * @returns {Object} Stage
 */
function buildReverb( context, opts ) {
	const convolver = context.createConvolver();
	convolver.buffer = getImpulse( context, opts.time, opts.decay );
	return createMixStage( context, opts.mix, convolver, convolver, [ convolver ] );
}

/**
 * Build a delay stage: a delay line with a feedback loop
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} opts - time, feedback, and mix
 * @returns {Object} Stage
 */
function buildDelay( context, opts ) {
	const delay = context.createDelay( MAX_DELAY_TIME );
	setParam( delay.delayTime, opts.time );
	const feedback = context.createGain();
	setParam( feedback.gain, opts.feedback );
	delay.connect( feedback );
	feedback.connect( delay );
	const stage = createMixStage( context, opts.mix, delay, delay, [ delay, feedback ] );
	stage.delay = delay;
	stage.feedback = feedback;
	return stage;
}

/**
 * Build a filter stage: one biquad filter
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} opts - type, cutoff, and q
 * @returns {Object} Stage
 */
function buildFilter( context, opts ) {
	const filter = context.createBiquadFilter();
	filter.type = opts.type;
	setParam( filter.frequency, opts.cutoff );
	setParam( filter.Q, opts.q );
	return { "input": filter, "output": filter, "filter": filter, "nodes": [ filter ] };
}

/**
 * Build a distortion stage: pre-gain, a 2x oversampled tanh shaper, a tone lowpass, and a
 * make-up gain on the wet path
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} opts - drive, tone, and mix
 * @returns {Object} Stage
 */
function buildDistortion( context, opts ) {
	const [ preGain, makeUpGain ] = driveGains( opts.drive );
	const pre = context.createGain();
	setParam( pre.gain, preGain );
	const shaper = context.createWaveShaper();
	shaper.curve = getDriveCurve();
	shaper.oversample = "2x";
	const tone = context.createBiquadFilter();
	setParam( tone.frequency, opts.tone );
	const makeUp = context.createGain();
	setParam( makeUp.gain, makeUpGain );
	pre.connect( shaper );
	shaper.connect( tone );
	tone.connect( makeUp );
	const stage = createMixStage(
		context, opts.mix, pre, makeUp, [ pre, shaper, tone, makeUp ]
	);
	stage.pre = pre;
	stage.tone = tone;
	stage.makeUp = makeUp;
	return stage;
}

/**
 * Build a chorus stage: two delays around CHORUS_DELAY, modulated by one LFO in opposite
 * phase and panned hard left and right
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} opts - rate, depth (ms), and mix
 * @returns {Object} Stage
 */
function buildChorus( context, opts ) {
	const lfo = context.createOscillator();
	setParam( lfo.frequency, opts.rate );
	const stage = createMixStage( context, opts.mix, null, null, [ lfo ] );
	stage.depths = [];
	for( const side of [ -1, 1 ] ) {

		// Each delay reads the downmixed bus, so a centered sound is not doubled by the pan
		const delay = context.createDelay( CHORUS_DELAY * 2 );
		delay.channelCount = 1;
		delay.channelCountMode = "explicit";
		delay.delayTime.value = CHORUS_DELAY;
		const depth = context.createGain();
		setParam( depth.gain, side * opts.depth / 1000 );
		const panner = context.createStereoPanner();
		panner.pan.value = side;
		lfo.connect( depth );
		depth.connect( delay.delayTime );
		stage.input.connect( delay );
		delay.connect( panner );
		panner.connect( stage.wet );
		stage.depths.push( depth );
		stage.nodes.push( delay, depth, panner );
	}
	lfo.start();
	stage.lfo = lfo;
	stage.end = () => {
		lfo.stop();
	};
	return stage;
}

/**
 * Build a bitcrush stage. It passes the dry signal until the worklet module loads, then
 * connects the crusher with the stage's current options. When the module cannot load, it
 * stays dry and warns once.
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} opts - bits, rate, and mix
 * @returns {Object} Stage
 */
function buildBitcrush( context, opts ) {
	const stage = createMixStage( context, 0, null, null, [] );
	stage.opts = opts;
	stage.pending = true;
	g_worklet.loadWorklet( context ).then( () => {
		if( stage.disposed ) {
			return;
		}
		const node = new AudioWorkletNode( context, g_worklet.CRUSHER_PROCESSOR, {
			"channelCount": 2,
			"channelCountMode": "explicit",
			"outputChannelCount": [ 2 ],
			"parameterData": { "bits": stage.opts.bits, "rate": stage.opts.rate }
		} );
		for( const name of [ "bits", "rate" ] ) {
			setParam( node.parameters.get( name ), stage.opts[ name ] );
		}
		stage.input.connect( node );
		node.connect( stage.wet );
		stage.node = node;
		stage.nodes.push( node );
		stage.end = () => {
			node.port.postMessage( "stop" );
			node.port.close();
		};
		stage.pending = false;
		for( const [ param, target ] of mixTargets( stage, stage.opts.mix ) ) {
			rampParam( param, target, context.currentTime );
		}
	}, () => {
		if( !m_crushWarned ) {
			m_crushWarned = true;
			console.warn(
				"setBusEffect: The bitcrush effect is unavailable; the audio worklet could " +
				"not load."
			);
		}
	} );
	return stage;
}

/**
 * Ramp targets for a bitcrush worklet parameter; none until the crusher exists
 *
 * @param {string} name - "bits" or "rate"
 * @returns {Function} Ramp function( stage, value )
 */
function crushTargets( name ) {
	return ( stage, value ) => {
		if( stage.pending ) {
			return [];
		}
		return [ [ stage.node.parameters.get( name ), value ] ];
	};
}

// Effects: option specs ([ default, min, max ] or [ default, allowed values ]), rampable
// options mapped to their [ param, target ] pairs, and the stage builder
const EFFECTS = {
	"reverb": {
		"options": {
			"time": [ 2, 0.1, 10 ],
			"decay": [ 3, 0.1, 20 ],
			"mix": [ 0.3, 0, 1 ]
		},
		"ramp": { "mix": mixTargets },
		"build": buildReverb
	},
	"delay": {
		"options": {
			"time": [ 0.25, 0.01, MAX_DELAY_TIME ],
			"feedback": [ 0.4, 0, 0.95 ],
			"mix": [ 0.3, 0, 1 ]
		},
		"ramp": {
			"time": ( stage, value ) => [ [ stage.delay.delayTime, value ] ],
			"feedback": ( stage, value ) => [ [ stage.feedback.gain, value ] ],
			"mix": mixTargets
		},
		"build": buildDelay
	},
	"filter": {
		"options": {
			"type": [ "lowpass", [ "lowpass", "highpass", "bandpass" ] ],
			"cutoff": [ 1000, 20, 20000 ],
			"q": [ 1, 0.0001, 100 ]
		},
		"ramp": {
			"cutoff": ( stage, value ) => [ [ stage.filter.frequency, value ] ],
			"q": ( stage, value ) => [ [ stage.filter.Q, value ] ]
		},
		"build": buildFilter
	},
	"distortion": {
		"options": {
			"drive": [ 0.5, 0, 1 ],
			"tone": [ 4000, 200, 20000 ],
			"mix": [ 1, 0, 1 ]
		},
		"ramp": {
			"drive": ( stage, value ) => {
				const [ preGain, makeUpGain ] = driveGains( value );
				return [ [ stage.pre.gain, preGain ], [ stage.makeUp.gain, makeUpGain ] ];
			},
			"tone": ( stage, value ) => [ [ stage.tone.frequency, value ] ],
			"mix": mixTargets
		},
		"build": buildDistortion
	},
	"bitcrush": {
		"options": {
			"bits": [ 8, 1, 16 ],
			"rate": [ 1, 1, 64 ],
			"mix": [ 1, 0, 1 ]
		},
		"ramp": {
			"bits": crushTargets( "bits" ),
			"rate": crushTargets( "rate" ),
			"mix": mixTargets
		},
		"build": buildBitcrush
	},
	"chorus": {
		"options": {
			"rate": [ 1.5, 0.1, 10 ],
			"depth": [ 3, 0, 10 ],
			"mix": [ 0.5, 0, 1 ]
		},
		"ramp": {
			"rate": ( stage, value ) => [ [ stage.lfo.frequency, value ] ],
			"depth": ( stage, value ) => [
				[ stage.depths[ 0 ].gain, -value / 1000 ], [ stage.depths[ 1 ].gain, value / 1000 ]
			],
			"mix": mixTargets
		},
		"build": buildChorus
	}
};

/**
 * Build a chain of stages into one bus insert
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Array<Object>} chain - Resolved chain: [ { effect, opts } ]
 * @returns {Object} { insert, stages }
 */
function buildChain( context, chain ) {
	const stages = chain.map( item => {
		const stage = EFFECTS[ item.effect ].build( context, item.opts );
		stage.opts = item.opts;
		return stage;
	} );
	for( let i = 1; i < stages.length; i++ ) {
		stages[ i - 1 ].output.connect( stages[ i ].input );
	}
	return {
		"stages": stages,
		"insert": {
			"input": stages[ 0 ].input,
			"output": stages[ stages.length - 1 ].output,
			"dispose": () => {
				for( const stage of stages ) {
					if( stage.disposed ) {
						continue;
					}
					stage.disposed = true;
					if( stage.end ) {
						stage.end();
					}
					for( const node of stage.nodes ) {
						node.disconnect();
					}
				}
			}
		}
	};
}

/**
 * Whether a resolved chain can update the current one in place: same context, same effects
 * in the same order, a live insert, and changes only to rampable options
 *
 * @param {Object|undefined} current - Current chain state
 * @param {BaseAudioContext} context - Audio context
 * @param {Array<Object>} chain - Resolved chain
 * @returns {boolean} True when the chain can ramp in place
 */
function canUpdate( current, context, chain ) {
	if(
		!current || current.context !== context || current.chain.length !== chain.length
	) {
		return false;
	}
	return chain.every( ( item, i ) => {
		const previous = current.chain[ i ];
		if( item.effect !== previous.effect || current.stages[ i ].disposed ) {
			return false;
		}
		const ramp = EFFECTS[ item.effect ].ramp;
		return Object.keys( item.opts ).every(
			name => ramp[ name ] || item.opts[ name ] === previous.opts[ name ]
		);
	} );
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Validate effect options and apply defaults
 *
 * @param {string} effect - Effect type
 * @param {Object|null|undefined} options - Effect options
 * @returns {Object} Resolved options
 */
export function resolveEffectOptions( effect, options ) {
	if( options == null ) {
		options = {};
	} else if( typeof options !== "object" ) {
		throwCode(
			TypeError, "setBusEffect: Parameter options must be an object.", "INVALID_OPTIONS"
		);
	}
	const specs = EFFECTS[ effect ].options;
	const resolved = {};
	for( const name of Object.keys( specs ) ) {
		const [ def, min, max ] = specs[ name ];
		let value = def;
		if( Array.isArray( min ) ) {
			if( options[ name ] != null ) {
				value = options[ name ];
			}
			if( min.indexOf( value ) === -1 ) {
				throwCode(
					RangeError,
					`setBusEffect: Option ${name} for ${effect} must be one of: ` +
					`${min.join( ", " )}.`,
					"INVALID_EFFECT_OPTION"
				);
			}
		} else {
			if( options[ name ] != null ) {
				value = Number( options[ name ] );
			}
			if( !( value >= min && value <= max ) ) {
				throwCode(
					RangeError,
					`setBusEffect: Option ${name} for ${effect} must be a number between ` +
					`${min} and ${max}.`,
					"INVALID_EFFECT_OPTION"
				);
			}
		}
		resolved[ name ] = value;
	}
	return resolved;
}

/**
 * Validate an effect or effect chain and resolve every option
 *
 * @param {string|Array<Object>|null|undefined} effect - Effect type, chain of
 *   { effect, ...options } items, or null
 * @param {Object|null|undefined} options - Options of a single effect; must be omitted for a
 *   chain
 * @returns {Array<Object>|null} [ { effect, opts } ] in order, or null to remove the effect
 */
export function resolveChain( effect, options ) {
	if( effect == null ) {
		return null;
	}
	if( !Array.isArray( effect ) ) {
		if( EFFECT_TYPES.indexOf( effect ) === -1 ) {
			throwCode(
				Error,
				`setBusEffect: Parameter effect must be one of: ${EFFECT_TYPES.join( ", " )}, ` +
				"an array, or null.",
				"INVALID_EFFECT"
			);
		}
		return [ { "effect": effect, "opts": resolveEffectOptions( effect, options ) } ];
	}
	if( options != null ) {
		throwCode(
			TypeError,
			"setBusEffect: Parameter options must be omitted for a chain; each item holds its " +
			"own options.",
			"INVALID_OPTIONS"
		);
	}
	if( effect.length > MAX_CHAIN ) {
		throwCode(
			RangeError,
			`setBusEffect: A chain holds at most ${MAX_CHAIN} effects.`,
			"INVALID_EFFECT"
		);
	}
	if( effect.length === 0 ) {
		return null;
	}
	return effect.map( item => {
		if(
			item === null || typeof item !== "object" ||
			EFFECT_TYPES.indexOf( item.effect ) === -1
		) {
			throwCode(
				Error,
				"setBusEffect: Each chain item must be an object whose effect is one of: " +
				`${EFFECT_TYPES.join( ", " )}.`,
				"INVALID_EFFECT"
			);
		}
		return { "effect": item.effect, "opts": resolveEffectOptions( item.effect, item ) };
	} );
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register the bus effect command
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} service - Sound extension service
 * @returns {void}
 */
export function register( pluginApi, service ) {


	pluginApi.addCommand( "setBusEffect", setBusEffect, false, [ "bus", "effect", "options" ] );

	/**
	 * Place an effect or a chain of up to four effects on a bus; null or an empty array
	 * removes it. The bus volume is unchanged.
	 *
	 * Effects and options: reverb (time, decay, mix), delay (time, feedback, mix), filter
	 * (type, cutoff, q), distortion (drive, tone, mix), bitcrush (bits, rate, mix), and chorus
	 * (rate, depth, mix). A chain is an array of { effect, ...options } items, applied in
	 * order.
	 *
	 * When the effects and their order match the bus's current ones, the call updates them in
	 * place: changed options ramp over 20 ms and tails continue. Reverb time and decay and the
	 * filter type cannot ramp, so changing them builds a new effect, which cuts the tail.
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.bus - "sfx", "music", "audio", or "master"
	 * @param {string|Array<Object>|null} options.effect - Effect type, chain, or null
	 * @param {Object} options.options - Options of a single effect
	 * @returns {void}
	 */
	function setBusEffect( options ) {
		const bus = options.bus;
		if( EFFECT_BUSES.indexOf( bus ) === -1 ) {
			throwCode(
				Error,
				"setBusEffect: Parameter bus must be one of: sfx, music, audio, master.",
				"INVALID_BUS"
			);
		}
		const chain = resolveChain( options.effect, options.options );
		if( chain === null ) {
			service.setBusInsert( bus, null );
			m_chains.delete( bus );
			return;
		}
		const context = service.getContext();
		const current = m_chains.get( bus );
		if( canUpdate( current, context, chain ) ) {
			const time = context.currentTime;
			chain.forEach( ( item, i ) => {
				const stage = current.stages[ i ];
				const ramp = EFFECTS[ item.effect ].ramp;
				for( const name of Object.keys( item.opts ) ) {
					const value = item.opts[ name ];
					if( value !== stage.opts[ name ] ) {
						for( const [ param, target ] of ramp[ name ]( stage, value ) ) {
							rampParam( param, target, time );
						}
					}
				}
				stage.opts = item.opts;
			} );
			current.chain = chain;
			return;
		}
		const built = buildChain( context, chain );
		service.setBusInsert( bus, built.insert );
		m_chains.set( bus, { "context": context, "chain": chain, "stages": built.stages } );
	}
}
