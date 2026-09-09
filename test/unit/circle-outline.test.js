/**
 * SYS-016 outline uniqueness and midpoint coverage regressions.
 */
"use strict";

const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const { createHarness } = require( "./rasterization-harness.js" );

test( "SYS-016 circle and arc coordinates are unique for radii 1 through 128", () => {
	const h = createHarness();
	for( let radius = 1; radius <= 128; radius++ ) {
		const circle = h.circle( radius );
		const outlines = [ circle ];
		for( const [ start, end ] of [ [ 0, Math.PI / 2 ], [ 0, Math.PI * 1.5 ],
			[ -Math.PI / 4, Math.PI / 4 ], [ 0, Math.PI * 2 ] ] ) {
			outlines.push( h.arc( radius, start, end ) );
		}
		const circleKeys = new Set( circle.map( point => point.slice( 0, 2 ).join( "," ) ) );
		for( const points of outlines ) {
			const keys = points.map( point => point.slice( 0, 2 ).join( "," ) );
			assert.equal( new Set( keys ).size, keys.length, `radius ${radius}` );
			assert.ok( keys.every( key => circleKeys.has( key ) ), `radius ${radius}` );
		}
	}
} );

test( "SYS-016 radius 5 stops at the diagonal without reflected stray pixels", () => {
	const h = createHarness();
	const expected = [
		"4,0", "-4,0", "0,4", "0,-4",
		"4,1", "4,-1", "-4,1", "-4,-1", "1,4", "-1,4", "1,-4", "-1,-4",
		"3,2", "3,-2", "-3,2", "-3,-2", "2,3", "-2,3", "2,-3", "-2,-3",
		"3,3", "3,-3", "-3,3", "-3,-3"
	];
	assert.deepEqual( h.circle( 5 ).map( point => point.slice( 0, 2 ).join( "," ) ).sort(),
		expected.sort() );
} );

test( "SYS-016 circle cardinal points, symmetry and small-radius conventions", () => {
	const h = createHarness();
	assert.deepEqual( h.circle( 0 ), [] );
	assert.deepEqual( h.circle( 1 ).map( point => point.slice( 0, 2 ) ), [ [ 1, 0 ] ] );
	for( const [ radius, count ] of [ [ 2, 4 ], [ 3, 12 ], [ 4, 16 ], [ 10, 52 ], [ 20, 108 ] ] ) {
		const points = h.circle( radius );
		assert.equal( points.length, count );
		const keys = new Set( points.map( point => point.slice( 0, 2 ).join( "," ) ) );
		for( const [ x, y ] of points ) {
			assert.ok( keys.has( `${-x},${y}` ) );
			assert.ok( keys.has( `${x},${-y}` ) );
			assert.ok( keys.has( `${y},${x}` ) );
		}
		assert.ok( keys.has( `${radius - 1},0` ) );
	}
} );
