/**
 * Pi.js - Sound Advanced Periodic Noise Module (Plugin)
 *
 * Registers oType "periodic": NES-style short-mode LFSR noise, a 93-step sequence that
 * repeats and sounds metallic or buzzy. `frequency` sets the LFSR clock rate in Hz, so the
 * sequence repeats at frequency / 93. The source plugs into the sound service through
 * registerSource and works in sound(), synth(), presets, and PLAY instruments.
 *
 * @module plugins/sound-advanced/periodic-noise
 */

"use strict";

export const PERIODIC_TYPE = "periodic";

// 15-bit LFSR; short mode taps bit 6 instead of bit 1
const LFSR_BITS = 15;
const SHORT_MODE_TAP = 6;
const LONG_MODE_TAP = 1;

// Each LFSR step spans this many buffer frames, so slow clocks keep their square steps
const FRAMES_PER_STEP = 16;

const m_buffers = new WeakMap();


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Get the looping sequence buffer for a context, generated once per context
 *
 * @param {BaseAudioContext} context - Audio context
 * @returns {AudioBuffer} Mono buffer holding one period of the short-mode sequence
 */
function getBuffer( context ) {
	let buffer = m_buffers.get( context );
	if( buffer ) {
		return buffer;
	}
	const sequence = lfsrSequence( true );
	buffer = context.createBuffer(
		1, sequence.length * FRAMES_PER_STEP, context.sampleRate
	);
	const data = buffer.getChannelData( 0 );
	for( let i = 0; i < data.length; i++ ) {
		data[ i ] = sequence[ Math.floor( i / FRAMES_PER_STEP ) ];
	}
	m_buffers.set( context, buffer );
	return buffer;
}

/**
 * Source factory for the sound service source contract
 *
 * The clock rate in Hz lives on a constant source whose output drives the buffer's playback
 * rate, so core's pitch and sweep automation work on a real frequency parameter.
 *
 * @param {BaseAudioContext} context - Audio context
 * @returns {Object} Source: output, frequency, detune, start, stop, onEnded, dispose
 */
function createPeriodicSource( context ) {
	const source = context.createBufferSource();
	source.buffer = getBuffer( context );
	source.loop = true;
	source.playbackRate.value = 0;
	const clock = context.createConstantSource();
	const scale = context.createGain();
	scale.gain.value = FRAMES_PER_STEP / context.sampleRate;
	clock.connect( scale );
	scale.connect( source.playbackRate );

	let stopAt = Infinity;
	let disposed = false;
	return {
		"output": source,
		"frequency": clock.offset,
		"detune": source.detune,
		"start": ( when ) => {
			clock.start( when );
			source.start( when );
		},
		"stop": ( when ) => {
			if( when >= stopAt ) {
				return;
			}
			stopAt = when;
			clock.stop( when );
			source.stop( when );
		},
		"onEnded": ( callback ) => {
			source.onended = callback;
		},
		"dispose": () => {
			if( disposed ) {
				return;
			}
			disposed = true;
			source.onended = null;
			source.disconnect();
			scale.disconnect();
			clock.disconnect();
		}
	};
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * One full period of a 15-bit NES LFSR, as ±1 samples
 *
 * The register starts at 1 and shifts right each step, feeding back bit 0 XOR the tap bit.
 * The output is high while bit 0 is clear. Short mode repeats every 93 steps from this seed;
 * long mode every 32,767.
 *
 * @param {boolean} shortMode - True for the 93-step periodic mode
 * @returns {Int8Array} Sequence of 1 and -1 values, one period long
 */
export function lfsrSequence( shortMode ) {
	let tap = LONG_MODE_TAP;
	if( shortMode ) {
		tap = SHORT_MODE_TAP;
	}
	const maxLength = ( 1 << LFSR_BITS ) - 1;
	const values = [];
	let register = 1;
	do {
		if( ( register & 1 ) === 0 ) {
			values.push( 1 );
		} else {
			values.push( -1 );
		}
		const feedback = ( register ^ ( register >> tap ) ) & 1;
		register = ( register >> 1 ) | ( feedback << ( LFSR_BITS - 1 ) );
	} while( register !== 1 && values.length < maxLength );
	return Int8Array.from( values );
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register the periodic noise source type
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} service - Sound extension service
 * @returns {void}
 */
export function register( pluginApi, service ) {
	service.registerSource( PERIODIC_TYPE, createPeriodicSource );
}
