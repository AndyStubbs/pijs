/**
 * Unit tests for the sound-advanced WAV encoder used by recordings: header fields against an
 * independent writer, PCM conversion and clamping, float files, and odd or uneven chunk
 * lengths. The module is pure, so nothing here creates an AudioContext.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_wav from "../../plugins/sound-advanced/wav.js";
import * as g_fixtures from "./audio-sample-fixtures.js";
const assert = g_assert;
const test = g_test.test;

const RATE = g_fixtures.SAMPLE_RATE;

/**
 * Read the header fields of a WAV file
 *
 * @param {ArrayBuffer} buffer - WAV bytes
 * @returns {Object} Header fields
 */
function readHeader( buffer ) {
	const view = new DataView( buffer );
	const id = offset => String.fromCharCode( ...new Uint8Array( buffer, offset, 4 ) );
	return {
		"riff": id( 0 ),
		"riffSize": view.getUint32( 4, true ),
		"wave": id( 8 ),
		"fmt": id( 12 ),
		"fmtSize": view.getUint32( 16, true ),
		"format": view.getUint16( 20, true ),
		"channels": view.getUint16( 22, true ),
		"sampleRate": view.getUint32( 24, true ),
		"byteRate": view.getUint32( 28, true ),
		"blockAlign": view.getUint16( 32, true ),
		"bitDepth": view.getUint16( 34, true ),
		"data": id( 36 ),
		"dataSize": view.getUint32( 40, true )
	};
}

test( "a 16-bit file matches an independent WAV writer byte for byte", () => {
	const left = Int16Array.from( [ 0, 1, -1, 32767, -32767, 1234, -4321 ] );
	const right = Int16Array.from( [ 5, -5, 100, -100, 32000, -32000, 7 ] );

	// Split into uneven chunks to check the frames are joined in order
	const chunks = [
		[ left.subarray( 0, 3 ), right.subarray( 0, 3 ) ],
		[ left.subarray( 3, 4 ), right.subarray( 3, 4 ) ],
		[ left.subarray( 4 ), right.subarray( 4 ) ]
	];
	const wav = g_wav.encodeWav( chunks, 2, RATE, 16 );
	const expected = Buffer.from( g_fixtures.wavBase64( [ left, right ] ), "base64" );
	assert.deepEqual( Buffer.from( wav ), expected );
} );

test( "header fields describe 16-bit PCM and 32-bit float files", () => {
	const frames = 4097;
	const pcm = g_wav.encodeWav(
		[ [ new Int16Array( frames ), new Int16Array( frames ) ] ], 2, 44100, 16
	);
	assert.deepEqual( readHeader( pcm ), {
		"riff": "RIFF",
		"riffSize": 36 + frames * 4,
		"wave": "WAVE",
		"fmt": "fmt ",
		"fmtSize": 16,
		"format": 1,
		"channels": 2,
		"sampleRate": 44100,
		"byteRate": 44100 * 4,
		"blockAlign": 4,
		"bitDepth": 16,
		"data": "data",
		"dataSize": frames * 4
	} );
	assert.equal( pcm.byteLength, 44 + frames * 4 );

	const float = g_wav.encodeWav(
		[ [ new Float32Array( frames ), new Float32Array( frames ) ] ], 2, RATE, 32
	);
	const header = readHeader( float );
	assert.equal( header.format, 3 );
	assert.equal( header.bitDepth, 32 );
	assert.equal( header.blockAlign, 8 );
	assert.equal( header.byteRate, RATE * 8 );
	assert.equal( header.dataSize, frames * 8 );
	assert.equal( header.riffSize, 36 + frames * 8 );
	assert.equal( float.byteLength, 44 + frames * 8 );
} );

test( "float files keep the exact sample bits, interleaved", () => {
	const left = Float32Array.from( [ 0.1, -0.75, 1.5, -2, 1e-8 ] );
	const right = Float32Array.from( [ -0.1, 0.25, 0, 0.999, -1 ] );
	const wav = g_wav.encodeWav(
		[
			[ left.subarray( 0, 2 ), right.subarray( 0, 2 ) ],
			[ left.subarray( 2 ), right.subarray( 2 ) ]
		],
		2, RATE, 32
	);
	const view = new DataView( wav );
	for( let i = 0; i < left.length; i++ ) {
		assert.equal( view.getFloat32( 44 + i * 8, true ), left[ i ] );
		assert.equal( view.getFloat32( 48 + i * 8, true ), right[ i ] );
	}
} );

test( "PCM conversion clamps to ±1 and scales by 32767 without dither", () => {
	const pcm = g_wav.toPcm16( Float32Array.from( [
		0, 1, -1, 2, -2, 0.25, -0.25, 1 / 32767, 0.4 / 32767, 0.6 / 32767, NaN
	] ) );
	assert.deepEqual(
		Array.from( pcm ), [ 0, 32767, -32767, 32767, -32767, 8192, -8192, 1, 0, 1, 0 ]
	);
} );

test( "empty recordings and mono files encode valid headers", () => {
	const empty = g_wav.encodeWav( [], 2, RATE, 16 );
	const header = readHeader( empty );
	assert.equal( empty.byteLength, 44 );
	assert.equal( header.dataSize, 0 );
	assert.equal( header.riffSize, 36 );
	assert.equal( header.channels, 2 );

	const mono = g_wav.encodeWav( [ [ Int16Array.from( [ 1, 2, 3 ] ) ] ], 1, RATE, 16 );
	assert.equal( readHeader( mono ).blockAlign, 2 );
	assert.deepEqual( Array.from( new Int16Array( mono, 44 ) ), [ 1, 2, 3 ] );
} );
