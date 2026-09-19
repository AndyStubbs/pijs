/**
 * Polygon command regressions for nonzero spans, normalization, and rendering state.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_vm from "node:vm";
import * as g_polygons from "../../plugins/polygons/index.js";

function createHarness() {
	const utils = g_vm.createContext( {
		"document": { "createElement": () => ( { "getContext": () => ( {} ) } ) }
	} );
	const source = g_fs.readFileSync(
		new URL( "../../src/core/utils.js", import.meta.url ), "utf8"
	).replace( /export /g, "" );
	g_vm.runInContext( source, utils );
	const palette = [ "#00000000", "#ff0000", "#ffffff", "#ff000080" ].map(
		value => utils.convertToColor( value )
	);
	const calls = [];
	let currentColor = palette[ 2 ];
	let parseCount = 0;
	let command;
	const screen = { "api": {
		"getColor": () => ( { ...currentColor } ),
		"setColor": color => { currentColor = color; },
		"getPalColor": index => palette[ index ] ?? null,
		"rect": ( ...args ) => {
			calls.push( { "kind": "rect", "args": args, "color": currentColor.key } );
		},
		"line": ( ...args ) => {
			calls.push( { "kind": "line", "args": args, "color": currentColor.key } );
		}
	} };
	g_polygons.default( {
		"addCommand": ( name, fn, isScreen, parameters ) => {
			g_assert.equal( name, "polygon" );
			g_assert.equal( isScreen, true );
			g_assert.deepEqual( parameters, [ "points", "fillColor" ] );
			command = fn;
		},
		"utils": {
			"getInt": ( value, fallback ) => {
				parseCount++;
				return utils.getInt( value, fallback );
			},
			"convertToColor": utils.convertToColor
		}
	} );
	return {
		"screen": screen,
		"calls": calls,
		"parseCount": () => parseCount,
		"draw": ( points, fillColor ) => {
			calls.length = 0;
			command( screen, { "points": points, "fillColor": fillColor } );
			return calls;
		},
		"spans": () => calls.filter( call => call.kind === "rect" ).map( call => {
			const [ x, y, width, height ] = call.args;
			g_assert.equal( height, 1 );
			return [ y, x, x + width - 1 ];
		} )
	};
}

function reversePath( points ) {
	const reversed = [];
	for( let i = points.length - 2; i >= 0; i -= 2 ) {
		reversed.push( points[ i ], points[ i + 1 ] );
	}
	return reversed;
}

g_test.test( "polygon normalizes formats and closes open paths", () => {
	const h = createHarness();
	const expected = [ [ 0, 0, 4, 0 ], [ 4, 0, 0, 4 ], [ 0, 4, 0, 0 ] ];
	for( const points of [
		[ 0, 0, 4, 0, 0, 4 ],
		new Int16Array( [ 0, 0, 4, 0, 0, 4 ] ),
		[ { "x": 0.1, "y": 0.1 }, { "x": 3.9, "y": 0 }, { "x": 0, "y": 4 } ],
		[ 0, 0, 0, 0, 4, 0, 4, 0, 0, 4, 0, 0, 0, 0 ]
	] ) {
		g_assert.deepEqual( h.draw( points ).map( call => call.args ), expected );
		g_assert.deepEqual( h.spans(), [] );
	}
	h.draw( [ 0, 0, 2, 0, 4, 0, 0, 4 ] );
	g_assert.equal( h.calls.length, 4 );
} );

g_test.test( "polygon rejects only fewer than three distinct normalized geometry points", () => {
	const h = createHarness();
	for( const points of [ [], [ 0, 0 ], [ 0, 0, 1, 1 ],
		[ 0, 0, 1, 1, 0, 0, 1, 1 ], [ 0, 0, 0.1, 0.1, 1, 1 ] ] ) {
		g_assert.throws( () => h.draw( points, 1 ), {
			"name": "RangeError", "code": "INVALID_POLYGON"
		} );
	}
	for( const points of [
		[ 0, 0, 2, 0, 4, 0 ],
		[ 0, 0, 2, 2, 4, 4 ],
		[ 0, 0, 4, 4, 0, 4, 4, 0 ],
		[ 0, 0, 4, 0, 2, 0, 2, 4, 0, 4 ],
		[ 0, 0, 4, 0, 4, 4, 0, 0, -4, 0, -4, -4 ]
	] ) {
		g_assert.doesNotThrow( () => h.draw( points, 1 ) );
	}
	h.draw( [ 0, 0, 2, 0, 4, 0 ], 1 );
	g_assert.deepEqual( h.spans(), [] );
} );

g_test.test( "polygon spans include rounded X endpoints and exclude the maximum Y row", () => {
	const h = createHarness();
	h.draw( [ 0, 0, 4, 0, 4, 3, 0, 3 ], 1 );
	g_assert.deepEqual( h.spans(), [ [ 0, 0, 4 ], [ 1, 0, 4 ], [ 2, 0, 4 ] ] );
	h.draw( [ -3, -1, 2, -1, -3, 2 ], 1 );
	g_assert.deepEqual( h.spans(), [ [ -1, -3, 2 ], [ 0, -3, 0 ], [ 1, -3, -1 ] ] );
	h.draw( [ 0, 0, 4, 4, 0, 4, 4, 0 ], 1 );
	g_assert.deepEqual( h.spans(), [
		[ 0, 0, 4 ], [ 1, 1, 3 ], [ 2, 2, 2 ], [ 3, 1, 3 ]
	] );
} );

g_test.test( "nonzero winding fills double-wound paths and star centers in either order", () => {
	const h = createHarness();
	const twice = [ 0, 0, 4, 0, 4, 3, 0, 3, 0, 0, 4, 0, 4, 3, 0, 3 ];
	const star = [ 10, 0, 16, 20, 0, 7, 20, 7, 4, 20 ];
	for( const points of [ twice, star ] ) {
		h.draw( points, 1 );
		const expected = h.spans();
		h.draw( reversePath( points ), 1 );
		g_assert.deepEqual( h.spans(), expected );
	}
	h.draw( twice, 1 );
	g_assert.deepEqual( h.spans(), [ [ 0, 0, 4 ], [ 1, 0, 4 ], [ 2, 0, 4 ] ] );
	h.draw( star, 1 );
	g_assert.ok( h.spans().some( ( [ y, left, right ] ) => {
		return y === 10 && left <= 10 && right >= 10;
	} ) );
} );

g_test.test( "opposite winding cancels interiors while boundary crossings remain inclusive", () => {
	const h = createHarness();
	h.draw( [
		0, 0, 4, 0, 4, 3, 0, 3, 0, 0, 0, 3, 4, 3, 4, 0
	], 1 );
	g_assert.deepEqual( h.spans(), [
		[ 0, 0, 0 ], [ 0, 4, 4 ], [ 1, 0, 0 ], [ 1, 4, 4 ],
		[ 2, 0, 0 ], [ 2, 4, 4 ]
	] );
} );

g_test.test( "concave rows keep separate spans and merge adjacent or overlapping pixels", () => {
	const h = createHarness();
	for( const right of [ 2, 3, 4 ] ) {
		h.draw( [ 0, 0, 6, 0, 6, 4, right, 4, right, 2, 2, 2, 2, 4, 0, 4 ], 1 );
		const row = h.spans().filter( span => span[ 0 ] === 3 );
		if( right <= 3 ) {
			g_assert.deepEqual( row, [ [ 3, 0, 6 ] ] );
		} else {
			g_assert.deepEqual( row, [ [ 3, 0, 2 ], [ 3, 4, 6 ] ] );
		}
	}
} );

g_test.test( "fill precedes the closed outline and restores the active color", () => {
	const h = createHarness();
	const before = h.screen.api.getColor();
	h.draw( [ 0, 0, 4, 0, 0, 4 ], 1 );
	g_assert.deepEqual( h.calls.map( call => call.kind ),
		[ "rect", "rect", "rect", "rect", "line", "line", "line" ] );
	g_assert.deepEqual( h.calls.at( -1 ).args, [ 0, 4, 0, 0 ] );
	g_assert.ok( h.calls.filter( call => call.kind === "line" ).every(
		call => call.color === before.key
	) );
	g_assert.equal( h.screen.api.getColor().key, before.key );
	h.screen.api.rect = () => { throw new Error( "draw failure" ); };
	g_assert.throws( () => h.draw( [ 0, 0, 4, 0, 0, 4 ], 1 ), /draw failure/ );
	g_assert.equal( h.screen.api.getColor().key, before.key );
} );

g_test.test( "equal resolved RGBA colors skip outlines, including translucent colors", () => {
	const h = createHarness();
	for( const [ outline, fill ] of [ [ 2, "#ffffff" ], [ 1, [ 255, 0, 0, 255 ] ],
		[ 3, "#ff000080" ], [ 0, "#00000000" ] ] ) {
		h.screen.api.setColor( h.screen.api.getPalColor( outline ) );
		h.draw( [ 0, 0, 4, 0, 0, 4 ], fill );
		g_assert.ok( h.calls.length > 0 );
		g_assert.ok( h.calls.every( call => call.kind === "rect" ) );
	}
	h.screen.api.setColor( h.screen.api.getPalColor( 1 ) );
	h.draw( [ 0, 0, 4, 0, 0, 4 ], 3 );
	g_assert.equal( h.calls.filter( call => call.kind === "line" ).length, 3 );
} );

g_test.test( "outline calls stay lazy and cache reuse preserves coordinates and spans", () => {
	const h = createHarness();
	const points = [ 0, 0, 4, 0, 0, 4 ];
	h.draw( points, null );
	g_assert.equal( h.calls.length, 3 );
	const parsed = h.parseCount();
	points[ 2 ] = 40;
	h.draw( points, 1 );
	const spans = h.spans();
	g_assert.deepEqual( spans, [
		[ 0, 0, 4 ], [ 1, 0, 3 ], [ 2, 0, 2 ], [ 3, 0, 1 ]
	] );
	h.draw( points, 2 );
	g_assert.deepEqual( h.spans(), spans );
	g_assert.equal( h.parseCount(), parsed );
	h.draw( points.slice(), 1 );
	g_assert.equal( h.spans()[ 0 ][ 2 ], 40 );

	// A huge vertical range is safe for outline-only calls because no sweep occurs.
	h.draw( [ 0, -1000000000, 4, 0, 0, 1000000000 ] );
	g_assert.equal( h.calls.length, 3 );
} );

g_test.test( "invalid coordinates and fill colors retain parameter error codes", () => {
	const h = createHarness();
	for( const points of [ null, {}, new DataView( new ArrayBuffer( 8 ) ),
		[ 0, 0, 1 ], [ 0, 0, NaN, 4, 4, 0 ], [ 0, 0, Infinity, 4, 4, 0 ],
		[ 0, 0, Number.MAX_SAFE_INTEGER + 1, 4, 4, 0 ],
		[ { "x": 0, "y": 0 }, { "x": 1 }, { "x": 2, "y": 3 } ] ] ) {
		g_assert.throws( () => h.draw( points, 1 ), { "code": "INVALID_PARAMETER" } );
	}
	for( const fill of [ -1, 99, 0.5, NaN, Infinity, "", [] ] ) {
		g_assert.throws( () => h.draw( [ 0, 0, 4, 0, 0, 4 ], fill ), {
			"name": "TypeError", "code": "INVALID_PARAMETER"
		} );
		g_assert.equal( h.calls.length, 0 );
	}
} );
