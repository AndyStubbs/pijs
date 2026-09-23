/**
 * Pi.js - Sound Noise Module (Plugin)
 *
 * White and pink noise sources. Each type shares one lazily generated, looped mono buffer;
 * every voice starts it at a random offset so repeated hits do not phase against each other.
 *
 * @module plugins/sound/noise
 */

"use strict";

export const NOISE_TYPES = [ "white", "pink" ];

// Buffer length, and the crossfade that joins its end to its start so the loop has no step
const NOISE_SECONDS = 2;
const SEAM_SECONDS = 0.01;

// Samples run through the pink filter before recording, so its state starts settled
const PINK_WARMUP = 4800;

// Buffers by type for the context they were made in
let m_context = null;
let m_buffers = {};


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Create a noise sample generator
 *
 * Pink noise uses Paul Kellet's refined filter on white input.
 *
 * @param {string} type - "white" or "pink"
 * @returns {Function} Returns the next sample
 */
function createGenerator( type ) {
	if( type === "white" ) {
		return () => Math.random() * 2 - 1;
	}
	let b0 = 0;
	let b1 = 0;
	let b2 = 0;
	let b3 = 0;
	let b4 = 0;
	let b5 = 0;
	let b6 = 0;
	return () => {
		const white = Math.random() * 2 - 1;
		b0 = 0.99886 * b0 + white * 0.0555179;
		b1 = 0.99332 * b1 + white * 0.0750759;
		b2 = 0.969 * b2 + white * 0.153852;
		b3 = 0.8665 * b3 + white * 0.3104856;
		b4 = 0.55 * b4 + white * 0.5329522;
		b5 = -0.7616 * b5 - white * 0.016898;
		const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
		b6 = white * 0.115926;
		return pink;
	};
}

/**
 * Generate a noise buffer: seamless when looped, with its peak normalized to 1
 *
 * @param {AudioContext} context - Audio context
 * @param {string} type - "white" or "pink"
 * @returns {AudioBuffer} Noise buffer
 */
function createNoiseBuffer( context, type ) {
	const length = Math.round( NOISE_SECONDS * context.sampleRate );
	const seam = Math.round( SEAM_SECONDS * context.sampleRate );
	const next = createGenerator( type );
	if( type === "pink" ) {
		for( let i = 0; i < PINK_WARMUP; i++ ) {
			next();
		}
	}
	const raw = new Float32Array( length + seam );
	for( let i = 0; i < raw.length; i++ ) {
		raw[ i ] = next();
	}

	// Equal-power crossfade of the samples past the end into the start, so the sample after
	// the last one on a loop wrap continues the generated signal
	const data = raw.subarray( 0, length );
	for( let i = 0; i < seam; i++ ) {
		const angle = ( ( i + 0.5 ) / seam ) * Math.PI / 2;
		data[ i ] = data[ i ] * Math.sin( angle ) + raw[ length + i ] * Math.cos( angle );
	}

	let peak = 0;
	for( let i = 0; i < length; i++ ) {
		peak = Math.max( peak, Math.abs( data[ i ] ) );
	}
	if( peak > 0 ) {
		for( let i = 0; i < length; i++ ) {
			data[ i ] /= peak;
		}
	}

	const buffer = context.createBuffer( 1, length, context.sampleRate );
	buffer.copyToChannel( data, 0 );
	return buffer;
}


/*************************************************************************************************
 * External API Functions
 ************************************************************************************************/


/**
 * Check whether an oType names a noise source
 *
 * @param {*} type - Oscillator type
 * @returns {boolean} True for "white" and "pink"
 */
export function isNoiseType( type ) {
	return NOISE_TYPES.indexOf( type ) !== -1;
}

/**
 * Create a looping noise source over the shared buffer for its type
 *
 * @param {AudioContext} context - Audio context
 * @param {string} type - "white" or "pink"
 * @returns {{ source: AudioBufferSourceNode, offset: number }} Source and its random start
 * offset in seconds
 */
export function createNoiseSource( context, type ) {
	if( m_context !== context ) {
		m_context = context;
		m_buffers = {};
	}
	if( !m_buffers[ type ] ) {
		m_buffers[ type ] = createNoiseBuffer( context, type );
	}
	const source = context.createBufferSource();
	source.buffer = m_buffers[ type ];
	source.loop = true;
	return {
		"source": source,
		"offset": Math.random() * NOISE_SECONDS
	};
}
