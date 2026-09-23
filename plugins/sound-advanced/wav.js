/**
 * Pi.js - Sound Advanced WAV Encoder Module (Plugin)
 *
 * Pure WAV encoding for recordings: 16-bit PCM or 32-bit float, interleaved, at the audio
 * context's sample rate. It uses no audio context, so Node tests can call it directly.
 *
 * @module plugins/sound-advanced/wav
 */

"use strict";

// RIFF header bytes before the sample data
const HEADER_BYTES = 44;


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Write an ASCII chunk ID
 *
 * @param {DataView} view - Header view
 * @param {number} offset - Byte offset
 * @param {string} text - Four-character chunk ID
 * @returns {void}
 */
function writeId( view, offset, text ) {
	for( let i = 0; i < text.length; i++ ) {
		view.setUint8( offset + i, text.charCodeAt( i ) );
	}
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Convert float samples to 16-bit PCM, clamping to ±1 and scaling by 32767 without dither
 *
 * @param {Float32Array} samples - Float samples
 * @returns {Int16Array} PCM samples
 */
export function toPcm16( samples ) {
	const pcm = new Int16Array( samples.length );
	for( let i = 0; i < samples.length; i++ ) {
		let sample = samples[ i ];
		if( sample > 1 ) {
			sample = 1;
		} else if( sample < -1 ) {
			sample = -1;
		}
		pcm[ i ] = Math.round( sample * 32767 );
	}
	return pcm;
}

/**
 * Encode chunks of channel data as a WAV file
 *
 * Each chunk is an array with one typed array per channel, all the same length: Int16Array
 * samples from toPcm16() for 16-bit files, or Float32Array samples for 32-bit float files.
 * Samples are written straight into the file buffer, so the chunks are never concatenated.
 *
 * @param {Array<Array<Int16Array|Float32Array>>} chunks - Chunks of per-channel samples
 * @param {number} channelCount - Number of channels
 * @param {number} sampleRate - Sample rate in Hz
 * @param {number} bitDepth - 16 (PCM) or 32 (float)
 * @returns {ArrayBuffer} WAV file bytes
 */
export function encodeWav( chunks, channelCount, sampleRate, bitDepth ) {
	let frames = 0;
	for( const chunk of chunks ) {
		frames += chunk[ 0 ].length;
	}
	const sampleBytes = bitDepth / 8;
	const blockAlign = channelCount * sampleBytes;
	const dataBytes = frames * blockAlign;
	const buffer = new ArrayBuffer( HEADER_BYTES + dataBytes );
	const view = new DataView( buffer );
	let format = 1;
	if( bitDepth === 32 ) {
		format = 3;
	}
	writeId( view, 0, "RIFF" );
	view.setUint32( 4, HEADER_BYTES - 8 + dataBytes, true );
	writeId( view, 8, "WAVE" );
	writeId( view, 12, "fmt " );
	view.setUint32( 16, 16, true );
	view.setUint16( 20, format, true );
	view.setUint16( 22, channelCount, true );
	view.setUint32( 24, sampleRate, true );
	view.setUint32( 28, sampleRate * blockAlign, true );
	view.setUint16( 32, blockAlign, true );
	view.setUint16( 34, bitDepth, true );
	writeId( view, 36, "data" );
	view.setUint32( 40, dataBytes, true );

	// WAV samples are little-endian, like every platform browsers run on, so a typed array
	// view writes them directly
	let samples;
	if( bitDepth === 32 ) {
		samples = new Float32Array( buffer, HEADER_BYTES );
	} else {
		samples = new Int16Array( buffer, HEADER_BYTES );
	}
	let index = 0;
	for( const chunk of chunks ) {
		const length = chunk[ 0 ].length;
		for( let i = 0; i < length; i++ ) {
			for( let c = 0; c < channelCount; c++ ) {
				samples[ index++ ] = chunk[ c ][ i ];
			}
		}
	}
	return buffer;
}
