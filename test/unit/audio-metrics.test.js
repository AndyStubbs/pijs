/**
 * Unit tests for the audio metrics and oracle envelopes on synthetic sample arrays.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_metrics from "./audio-metrics.js";
const assert = g_assert;
const test = g_test.test;

const RATE = 48000;

function sine( frequency, seconds, amplitude = 1 ) {
	const data = new Float32Array( Math.round( seconds * RATE ) );
	for( let i = 0; i < data.length; i++ ) {
		data[ i ] = amplitude * Math.sin( ( 2 * Math.PI * frequency * i ) / RATE );
	}
	return data;
}

/** Gain that switches from one constant to another at a given time. */
function step( switchTime, before, after ) {
	return t => {
		if( t < switchTime ) {
			return before;
		}
		return after;
	};
}

function applyEnvelope( carrier, envelope ) {
	return carrier.map( ( value, i ) => value * envelope( i / RATE ) );
}

test( "peak, rms, and windows measure known signals", () => {
	const data = sine( 1000, 0.1, 0.5 );
	assert.ok( Math.abs( g_metrics.peak( data ) - 0.5 ) < 1e-6 );
	assert.ok( Math.abs( g_metrics.rms( data ) - 0.5 / Math.SQRT2 ) < 1e-4 );
	assert.equal( g_metrics.rms( data, 10, 10 ), 0 );
	const windows = g_metrics.rmsWindows( data, 480 );
	assert.equal( windows.length, 10 );
	assert.ok( windows.every( value => Math.abs( value - 0.5 / Math.SQRT2 ) < 1e-4 ) );
} );

test( "kneeShare counts samples above the knee", () => {
	assert.equal( g_metrics.kneeShare( [ 0.1, 0.95, -0.91, 0.9, -0.2 ] ), 0.4 );
	assert.equal( g_metrics.kneeShare( [] ), 0 );
	assert.equal( g_metrics.kneeShare( [ 0.5, 0.6 ], 0.55 ), 0.5 );
} );

test( "zeroCrossingFrequency resolves pitch within 0.5 percent", () => {
	for( const frequency of [ 55, 440, 1234.5, 5000 ] ) {
		const measured = g_metrics.zeroCrossingFrequency( sine( frequency, 0.2 ), RATE );
		const error = Math.abs( measured - frequency ) / frequency;
		assert.ok( error < 0.005, `${frequency}: ${measured}` );
	}
	assert.equal( g_metrics.zeroCrossingFrequency( new Float32Array( 100 ), RATE ), 0 );
} );

test( "silence helpers locate onsets and tails", () => {
	const data = new Float32Array( 1000 );
	data.fill( 0.2, 100, 600 );
	assert.equal( g_metrics.firstNonSilent( data ), 100 );
	assert.equal( g_metrics.lastNonSilent( data ), 599 );
	assert.equal( g_metrics.isSilent( data, 0, 100 ), true );
	assert.equal( g_metrics.isSilent( data, 0, 101 ), false );
	assert.equal( g_metrics.firstNonSilent( new Float32Array( 10 ) ), -1 );
	assert.equal( g_metrics.lastNonSilent( new Float32Array( 10 ) ), -1 );
} );

test( "automation envelopes follow Web Audio event semantics", () => {
	const linear = g_metrics.linearFade( 0.1, 0.01 );
	assert.equal( linear( 0.05 ), 1 );
	assert.ok( Math.abs( linear( 0.105 ) - 0.5 ) < 1e-9 );
	assert.equal( linear( 0.2 ), 0 );

	const exponential = g_metrics.exponentialFade( 0.1, 0.01 );
	assert.equal( exponential( 0.1 ), 1 );
	assert.ok( Math.abs( exponential( 0.1 + 0.00999999 ) - 1e-4 ) < 1e-6 );
	assert.equal( exponential( 0.11 ), 0 );

	const onset = g_metrics.linearOnset( 0.2, 0.003 );
	assert.equal( onset( 0.1 ), 0 );
	assert.ok( Math.abs( onset( 0.2015 ) - 0.5 ) < 1e-9 );
	assert.equal( onset( 0.3 ), 1 );

	const combined = g_metrics.automationEnvelope( [
		{ "type": "set", "time": 0, "value": 0 },
		{ "type": "linear", "time": 0.1, "value": 1 },
		{ "type": "target", "time": 0.2, "target": 0.5, "timeConstant": 0.05 }
	], 0 );
	assert.ok( Math.abs( combined( 0.05 ) - 0.5 ) < 1e-9 );
	assert.equal( combined( 0.15 ), 1 );
	assert.ok( Math.abs( combined( 0.25 ) - ( 0.5 + 0.5 * Math.exp( -1 ) ) ) < 1e-9 );
} );

test( "stop residuals accept the expected fade and reject an abrupt stop", () => {
	const carrier = sine( 440, 0.2 );
	const fade = g_metrics.linearFade( 0.1, 0.01 );
	const faded = applyEnvelope( carrier, fade );
	const options = { "sampleRate": RATE, "from": 4000, "stopEnd": 0.11 };
	const valid = g_metrics.stopResidual( faded, carrier, fade, options );
	assert.ok( valid.max < 1e-6 && valid.rms < 1e-6 );
	assert.equal( valid.silentAfter, true );

	const abrupt = applyEnvelope( carrier, step( 0.1, 1, 0 ) );
	const failed = g_metrics.stopResidual( abrupt, carrier, fade, options );
	assert.ok( failed.max > 0.5, `abrupt max ${failed.max}` );

	const ringing = applyEnvelope( carrier, step( 0.1, 1, 0.01 ) );
	assert.equal( g_metrics.stopResidual( ringing, carrier, fade, options ).silentAfter, false );
} );

test( "onset residuals check silence before the onset", () => {
	const carrier = sine( 300, 0.2 );
	const onset = g_metrics.linearOnset( 0.1, 0.003 );
	const rendered = applyEnvelope( carrier, onset );
	const options = { "sampleRate": RATE, "onset": 0.1, "to": 5400 };
	const valid = g_metrics.onsetResidual( rendered, carrier, onset, options );
	assert.ok( valid.max < 1e-6 );
	assert.equal( valid.silentBefore, true );

	const early = applyEnvelope( carrier, step( 0.095, 0, 1 ) );
	const failed = g_metrics.onsetResidual( early, carrier, onset, options );
	assert.equal( failed.silentBefore, false );
	assert.ok( failed.max > 0.5 );
} );

test( "referenceResidual rejects a silent reference", () => {
	const silent = new Float32Array( 100 );
	assert.throws(
		() => g_metrics.referenceResidual( silent, silent, () => 1, {
			"sampleRate": RATE, "from": 0, "to": 100
		} ),
		{ "name": "RangeError" }
	);
} );
