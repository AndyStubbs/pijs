/**
 * Unit tests for the noise buffers in plugins/sound/noise.js: length, peak normalization,
 * spectra, the loop seam, caching, and random start offsets. A fake context captures the
 * generated buffers, and Math.random is seeded per test.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_noise from "../../plugins/sound/noise.js";
import * as g_metrics from "./audio-metrics.js";
const assert = g_assert;
const test = g_test.test;

const RATE = 48000;

function fakeContext() {
	const context = {
		"sampleRate": RATE,
		"buffers": 0,
		"createBuffer": ( channels, length, sampleRate ) => {
			context.buffers++;
			return {
				"numberOfChannels": channels,
				"length": length,
				"sampleRate": sampleRate,
				"data": null,
				"copyToChannel"( data ) {
					this.data = Float32Array.from( data );
				}
			};
		},
		"createBufferSource": () => ( {} )
	};
	return context;
}

/** Runs fn with Math.random replaced by a seeded generator (mulberry32). */
function withSeed( seed, fn ) {
	const random = Math.random;
	let state = seed >>> 0;
	Math.random = () => {
		state = ( state + 0x6d2b79f5 ) >>> 0;
		let value = state;
		value = Math.imul( value ^ ( value >>> 15 ), value | 1 );
		value ^= value + Math.imul( value ^ ( value >>> 7 ), value | 61 );
		return ( ( value ^ ( value >>> 14 ) ) >>> 0 ) / 4294967296;
	};
	try {
		return fn();
	} finally {
		Math.random = random;
	}
}

function noiseData( type, seed ) {
	return withSeed( seed, () => {
		return g_noise.createNoiseSource( fakeContext(), type ).source.buffer.data;
	} );
}

test( "noise types are white and pink", () => {
	assert.deepEqual( g_noise.NOISE_TYPES, [ "white", "pink" ] );
	assert.ok( g_noise.isNoiseType( "white" ) );
	assert.ok( g_noise.isNoiseType( "pink" ) );
	assert.ok( !g_noise.isNoiseType( "noise" ) );
	assert.ok( !g_noise.isNoiseType( "sine" ) );
} );

test( "buffers are 2 s mono with their peak normalized to 1", () => {
	for( const type of g_noise.NOISE_TYPES ) {
		const data = noiseData( type, 1 );
		assert.equal( data.length, 2 * RATE );
		assert.ok( Math.abs( g_metrics.peak( data ) - 1 ) < 1e-6, type );
		assert.ok( g_metrics.rms( data ) > 0.1, type );
	}
} );

test( "white is flat and pink falls 3 dB per octave", () => {
	for( const seed of [ 1, 2, 3 ] ) {
		const white = g_metrics.spectrumSlope( noiseData( "white", seed ), RATE );
		assert.ok( Math.abs( white.slope ) < 0.3, `white slope ${white.slope}` );
		assert.ok( white.deviation < 1, `white deviation ${white.deviation}` );
		const pink = g_metrics.spectrumSlope( noiseData( "pink", seed ), RATE );
		assert.ok( Math.abs( pink.slope + 3 ) < 0.3, `pink slope ${pink.slope}` );
		assert.ok( pink.deviation < 1, `pink deviation ${pink.deviation}` );
	}
} );

test( "the loop wrap is no larger than an ordinary sample step", () => {
	for( const seed of [ 1, 2, 3, 4, 5 ] ) {
		const data = noiseData( "pink", seed );
		const steps = [];
		for( let i = 1; i < data.length; i++ ) {
			steps.push( Math.abs( data[ i ] - data[ i - 1 ] ) );
		}
		steps.sort( ( a, b ) => a - b );
		const typical = steps[ Math.floor( steps.length * 0.99 ) ];
		const wrap = Math.abs( data[ 0 ] - data[ data.length - 1 ] );
		assert.ok( wrap <= typical, `seed ${seed}: wrap step ${wrap} > ${typical}` );
	}
} );

test( "buffers are shared per type and context; offsets are random within the buffer", () => {
	withSeed( 9, () => {
		const context = fakeContext();
		const offsets = [];
		const first = g_noise.createNoiseSource( context, "white" );
		offsets.push( first.offset );
		for( let i = 0; i < 20; i++ ) {
			const noise = g_noise.createNoiseSource( context, "white" );
			assert.equal( noise.source.buffer, first.source.buffer );
			assert.equal( noise.source.loop, true );
			offsets.push( noise.offset );
		}
		assert.equal( context.buffers, 1 );
		g_noise.createNoiseSource( context, "pink" );
		g_noise.createNoiseSource( context, "pink" );
		assert.equal( context.buffers, 2 );
		assert.ok( offsets.every( offset => offset >= 0 && offset < 2 ) );
		assert.equal( new Set( offsets ).size, offsets.length );

		// A new context gets its own buffers
		const other = fakeContext();
		g_noise.createNoiseSource( other, "white" );
		assert.equal( other.buffers, 1 );
	} );
} );
