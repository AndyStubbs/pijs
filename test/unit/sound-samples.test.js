/**
 * Unit tests for the sample position model in plugins/sound/samples.js: content budgets, rate
 * segment sums, end-time prediction, segment recording, loop wrap, and rate bounds. The
 * functions are pure, so no AudioContext is needed.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_samples from "../../plugins/sound/samples.js";
const assert = g_assert;
const test = g_test.test;

const EPSILON = 1e-12;

function near( actual, expected ) {
	assert.ok(
		Math.abs( actual - expected ) < EPSILON, `expected ${expected}, received ${actual}`
	);
}

test( "budgets: zero is the end of the file, or unbounded when looping", () => {
	assert.equal( g_samples.resolveBudget( 2, 0.5, 0, false ), 1.5 );
	assert.equal( g_samples.resolveBudget( 2, 0.5, 0, true ), Infinity );
	assert.equal( g_samples.resolveBudget( 2, 0.5, 5, true ), 5 );
	assert.equal( g_samples.resolveBudget( 2, 0.5, 1, false ), 1 );
} );

test( "budgets: non-loops are capped by available content and can be exhausted", () => {
	assert.equal( g_samples.resolveBudget( 2, 0.5, 5, false ), 1.5 );
	assert.equal( g_samples.resolveBudget( 2, 2, 0, false ), 0 );
	assert.equal( g_samples.resolveBudget( 2, 3, 1, false ), 0 );
} );

test( "consumed content sums rate × length over segments", () => {
	const segments = [
		{ "time": 1, "rate": 1 }, { "time": 2, "rate": 2 }, { "time": 3, "rate": 0.5 }
	];
	assert.equal( g_samples.consumedAt( segments, 0.5 ), 0 );
	assert.equal( g_samples.consumedAt( segments, 1 ), 0 );
	near( g_samples.consumedAt( segments, 1.5 ), 0.5 );
	near( g_samples.consumedAt( segments, 2.5 ), 2 );
	near( g_samples.consumedAt( segments, 4 ), 3.5 );
	assert.equal( g_samples.rateAt( segments, 0 ), 1 );
	assert.equal( g_samples.rateAt( segments, 2 ), 2 );
	assert.equal( g_samples.rateAt( segments, 10 ), 0.5 );
} );

test( "end prediction inverts the segment sum at several rates", () => {
	for( const rate of [ 0.0625, 0.5, 1, 2, 16 ] ) {
		const segments = [ { "time": 0.25, "rate": rate } ];
		near( g_samples.timeForContent( segments, 1 ), 0.25 + 1 / rate );
	}
	const segments = [
		{ "time": 0, "rate": 1 }, { "time": 1, "rate": 2 }, { "time": 2, "rate": 0.5 }
	];
	for( const content of [ 0.5, 1, 2, 3, 3.5, 10 ] ) {
		const time = g_samples.timeForContent( segments, content );
		near( g_samples.consumedAt( segments, time ), content );
	}
	assert.equal( g_samples.timeForContent( segments, Infinity ), Infinity );
} );

test( "a rate change before the intended start replaces the initial rate", () => {
	const segments = [ { "time": 2, "rate": 1 } ];
	g_samples.addRateSegment( segments, 1, 2 );
	assert.deepEqual( segments, [ { "time": 2, "rate": 2 } ] );
	g_samples.addRateSegment( segments, 2, 0.5 );
	assert.deepEqual( segments, [ { "time": 2, "rate": 0.5 } ] );
} );

test( "a later rate change adds a segment and replaces segments at or after it", () => {
	const segments = [ { "time": 0, "rate": 1 } ];
	g_samples.addRateSegment( segments, 1, 2 );
	g_samples.addRateSegment( segments, 2, 3 );
	g_samples.addRateSegment( segments, 2, 4 );
	assert.deepEqual( segments, [
		{ "time": 0, "rate": 1 }, { "time": 1, "rate": 2 }, { "time": 2, "rate": 4 }
	] );
	g_samples.addRateSegment( segments, 1.5, 0.5 );
	assert.deepEqual( segments, [
		{ "time": 0, "rate": 1 }, { "time": 1, "rate": 2 }, { "time": 1.5, "rate": 0.5 }
	] );
} );

test( "a delayed loop's late position includes rate changes made while pending", () => {

	// Intended start 1 s at rate 1; changed to rate 2 at 1.5 s; started late at 2 s
	const segments = [ { "time": 1, "rate": 1 } ];
	g_samples.addRateSegment( segments, 1.5, 2 );
	const skipped = g_samples.consumedAt( segments, 2 );
	near( skipped, 1.5 );
	near( g_samples.wrapPosition( 0.25, skipped, 1, true ), 0.75 );
} );

test( "positions wrap by file length only when looping", () => {
	near( g_samples.wrapPosition( 0.5, 3.25, 2, true ), 1.75 );
	near( g_samples.wrapPosition( 0.5, 1, 2, false ), 1.5 );
	near( g_samples.wrapPosition( 5, 0, 2, true ), 1 );
} );

test( "playback rate bounds depend on the loading mode", () => {
	for( const [ rate, decoded, streamed ] of [
		[ 0.0625, true, false ], [ 0.25, true, true ], [ 4, true, true ],
		[ 16, true, false ], [ 0.06, false, false ], [ 16.5, false, false ],
		[ NaN, false, false ]
	] ) {
		assert.equal( g_samples.isPlaybackRateValid( rate, false ), decoded, `decode ${rate}` );
		assert.equal( g_samples.isPlaybackRateValid( rate, true ), streamed, `stream ${rate}` );
	}
} );
