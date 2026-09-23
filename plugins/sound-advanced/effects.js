/**
 * Pi.js - Sound Advanced Effects Module (Plugin)
 *
 * Bus reverb and delay. Each effect is one bus insert that mixes a dry path with a wet path,
 * placed through the sound service's setBusInsert. The bus volume follows the insert, so
 * changing it never replaces the effect, and muting a bus also silences effect tails.
 *
 * @module plugins/sound-advanced/effects
 */

"use strict";

export const EFFECT_BUSES = [ "sfx", "music", "audio", "master" ];
export const EFFECT_TYPES = [ "reverb", "delay" ];

// Option defaults and ranges per effect: [ default, min, max ]
const EFFECT_OPTIONS = {
	"reverb": {
		"time": [ 2, 0.1, 10 ],
		"decay": [ 3, 0.1, 20 ],
		"mix": [ 0.3, 0, 1 ]
	},
	"delay": {
		"time": [ 0.25, 0.01, 2 ],
		"feedback": [ 0.4, 0, 0.95 ],
		"mix": [ 0.3, 0, 1 ]
	}
};

// Longest delay line, in seconds
const MAX_DELAY_TIME = 2;

// Generated reverb impulses by sample rate, length, and decay
const m_impulses = new Map();


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
 * Create a dry/wet insert around a wet processing chain
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {number} mix - Wet share, 0-1
 * @param {AudioNode} wetInput - First node of the wet chain
 * @param {AudioNode} wetOutput - Last node of the wet chain
 * @param {Array<AudioNode>} nodes - Wet chain nodes to disconnect on dispose
 * @returns {Object} Bus insert: input, output, dispose
 */
function createMixInsert( context, mix, wetInput, wetOutput, nodes ) {
	const input = context.createGain();
	const output = context.createGain();
	const dry = context.createGain();
	const wet = context.createGain();
	dry.gain.value = 1 - mix;
	wet.gain.value = mix;
	input.connect( dry );
	dry.connect( output );
	input.connect( wetInput );
	wetOutput.connect( wet );
	wet.connect( output );
	const allNodes = [ input, dry, wet, output ].concat( nodes );
	let disposed = false;
	return {
		"input": input,
		"output": output,
		"dispose": () => {
			if( disposed ) {
				return;
			}
			disposed = true;
			for( const node of allNodes ) {
				node.disconnect();
			}
		}
	};
}

/**
 * Create a reverb insert: a convolver with a generated impulse
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} options - time, decay, and mix
 * @returns {Object} Bus insert
 */
function createReverb( context, options ) {
	const convolver = context.createConvolver();
	convolver.buffer = getImpulse( context, options.time, options.decay );
	return createMixInsert( context, options.mix, convolver, convolver, [ convolver ] );
}

/**
 * Create a delay insert: a delay line with a feedback loop
 *
 * @param {BaseAudioContext} context - Audio context
 * @param {Object} options - time, feedback, and mix
 * @returns {Object} Bus insert
 */
function createDelay( context, options ) {
	const delay = context.createDelay( MAX_DELAY_TIME );
	delay.delayTime.value = options.time;
	const feedback = context.createGain();
	feedback.gain.value = options.feedback;
	delay.connect( feedback );
	feedback.connect( delay );
	return createMixInsert( context, options.mix, delay, delay, [ delay, feedback ] );
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Validate effect options and apply defaults
 *
 * @param {string} effect - "reverb" or "delay"
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
	const ranges = EFFECT_OPTIONS[ effect ];
	const resolved = {};
	for( const name of Object.keys( ranges ) ) {
		const [ def, min, max ] = ranges[ name ];
		let value = def;
		if( options[ name ] != null ) {
			value = Number( options[ name ] );
		}
		if( !( value >= min && value <= max ) ) {
			throwCode(
				RangeError,
				`setBusEffect: Option ${name} for ${effect} must be a number between ${min} ` +
				`and ${max}.`,
				"INVALID_EFFECT_OPTION"
			);
		}
		resolved[ name ] = value;
	}
	return resolved;
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
	 * Place a reverb or delay on a bus, replacing its current effect; null removes it
	 *
	 * Reverb options: time (seconds, default 2), decay (curve exponent, default 3), and mix
	 * (wet share, default 0.3). Delay options: time (seconds, default 0.25), feedback (0-0.95,
	 * default 0.4), and mix (default 0.3). The bus volume is unchanged.
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.bus - "sfx", "music", "audio", or "master"
	 * @param {string|null} options.effect - "reverb", "delay", or null
	 * @param {Object} options.options - Effect options
	 * @returns {void}
	 */
	function setBusEffect( options ) {
		const bus = options.bus;
		const effect = options.effect;
		if( EFFECT_BUSES.indexOf( bus ) === -1 ) {
			throwCode(
				Error,
				"setBusEffect: Parameter bus must be one of: sfx, music, audio, master.",
				"INVALID_BUS"
			);
		}
		if( effect == null ) {
			service.setBusInsert( bus, null );
			return;
		}
		if( EFFECT_TYPES.indexOf( effect ) === -1 ) {
			throwCode(
				Error,
				"setBusEffect: Parameter effect must be one of: reverb, delay, null.",
				"INVALID_EFFECT"
			);
		}
		const resolved = resolveEffectOptions( effect, options.options );
		const context = service.getContext();
		if( effect === "reverb" ) {
			service.setBusInsert( bus, createReverb( context, resolved ) );
		} else {
			service.setBusInsert( bus, createDelay( context, resolved ) );
		}
	}
}
