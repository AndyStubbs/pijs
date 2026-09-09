/**
 * SYS-015 full-turn and zero-length arc regressions against source modules.
 */
"use strict";

const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const { createHarness } = require( "./rasterization-harness.js" );
const TWO_PI = Math.PI * 2;
const EPSILON = 0.0001;

test( "SYS-015 full turns reuse circle coverage and colors at every radius", () => {
	const h = createHarness();
	for( const radius of [ -1, 0, 1, 2, 3, 5, 10, 20, 128 ] ) {
		for( const start of [ 0, Math.PI / 4, -Math.PI * 3 ] ) {
			for( const turns of [ -2, -1.25, -1, 1, 1.25, 2 ] ) {
				assert.deepEqual( h.arc( radius, start, start + turns * TWO_PI ),
					h.circle( radius ), `radius ${radius}, start ${start}, turns ${turns}` );
			}
		}
	}
} );

test( "SYS-015 equal angles draw nothing, including nonzero starts", () => {
	const h = createHarness();
	for( const start of [ 0, Math.PI / 4, -TWO_PI, TWO_PI ] ) {
		assert.deepEqual( h.arc( 10, start, start ), [] );
	}
} );

test( "SYS-015 wrapped partial arcs retain their clockwise coverage", () => {
	const h = createHarness();
	const start = -Math.PI / 4;
	const end = Math.PI / 4;
	assert.deepEqual( h.arc( 10, start, end ), h.arc( 10, start + TWO_PI, end ) );
	const partial = h.arc( 10, start, end );
	assert.ok( partial.length > 0 && partial.length < h.circle( 10 ).length );
	assert.ok( partial.every( ( [ x, y ] ) => x > 0 && Math.abs( y ) <= x ) );
	assert.deepEqual( h.arc( 1, start, end ), [] );
} );

test( "SYS-015 near-full tolerance applies on both sides of the turn boundary", () => {
	const h = createHarness();
	for( const end of [ TWO_PI - EPSILON, TWO_PI - EPSILON / 2,
		-TWO_PI + EPSILON / 2, -EPSILON / 2 ] ) {
		assert.deepEqual( h.arc( 10, 0, end ), h.circle( 10 ) );
	}
	assert.notDeepEqual( h.arc( 10, 0, TWO_PI - EPSILON * 2 ), h.circle( 10 ) );
	assert.notDeepEqual( h.arc( 10, 0, -TWO_PI + EPSILON * 2 ), h.circle( 10 ) );
} );
