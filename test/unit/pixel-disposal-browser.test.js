/**
 * SYS-005 browser regressions against fresh in-memory full and lite bundles.
 * Run with node --test test/unit/pixel-disposal-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./browser-source-harness.js";
const { test } = g_test;
const assert = g_assert;

const { probe } = g_harness.useBrowserBundles();

for( const bundle of g_harness.BUNDLES ) {
	test( `SYS-005 ${bundle}: pending reads reject and surviving screens remain usable`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const survivor = $.screen( "4x4" );
			const screen = $.screen( "4x4" );
			screen.setColor( "red" );
			screen.pset( 0, 0 );
			const promises = [ screen.getPixelAsync( 0, 0 ), screen.getPixelAsync( 0, 0, true ),
				screen.getAsync( 0, 0, 2, 2 ), screen.getAsync( 0, 0, 2, 2, 1, false ) ];
			const settled = Promise.all( promises.map( promise => promise.then(
				() => "unexpected resolution", error => error.code
			) ) );
			screen.removeScreen();
			const codes = await Promise.race( [ settled,
				new Promise( resolve => setTimeout( () => resolve( "pending" ), 500 ) ) ] );
			$.setColor( "red" );
			$.pset( 1, 1 );
			const pixel = await survivor.getPixelAsync( 1, 1 );
			const replacement = $.screen( "2x2" );
			replacement.setColor( "blue" );
			replacement.pset( 0, 0 );
			return [ codes, pixel.r, ( await replacement.getPixelAsync( 0, 0 ) ).b ];
		} ), [ Array( 4 ).fill( "SCREEN_REMOVED" ), 255, 255 ] );
	} );

	test( `SYS-005 ${bundle}: live reads and filters preserve captured views and timing`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const screen = $.screen( "4x4" );
			screen.setColor( "blue" );
			screen.pset( 1, 1 );
			screen.pushView( 1, 1, 2, 2 );
			const pixel = screen.getPixelAsync( 0, 0 );
			const index = screen.getPixelAsync( 0, 0, true );
			const region = screen.getAsync( 0, 0, 1, 1, 1, false );
			const indices = screen.getAsync( 0, 0, 1, 1 );
			screen.setColor( "red" );
			screen.pset( 0, 0 );
			const expectedIndex = screen.getPixel( 0, 0, true );
			const coordinates = [];
			screen.filterImg( ( color, x, y ) => {
				coordinates.push( [ x, y ] );
				color.set( [ 0, 0, 255, 255 ] );
				return true;
			} );
			const immediateCount = coordinates.length;
			screen.resetView();
			const colors = await Promise.all( [ pixel, index, region, indices ] );
			await new Promise( resolve => setTimeout( resolve, 0 ) );
			return [ immediateCount, colors[ 0 ].r, colors[ 1 ] === expectedIndex,
				colors[ 2 ][ 0 ][ 0 ].r, colors[ 3 ][ 0 ][ 0 ] === expectedIndex,
				coordinates, screen.getPixel( 1, 1 ).b, screen.getPixel( 0, 0 ).b ];
		} ), [ 0, 255, true, 255, true, [ [ 0, 0 ], [ 1, 0 ], [ 0, 1 ], [ 1, 1 ] ], 255, 0 ] );
	} );

	test( `SYS-005 ${bundle}: completed empty reads survive disposal`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const screen = $.screen( "2x2" );
			const invalidCodes = [];
			for( const invalid of [ () => screen.getPixelAsync( "bad", 0 ),
				() => screen.getAsync( 0, 0, "bad", 1 ), () => screen.filterImg( null ) ] ) {
				try {
					invalid();
				} catch( error ) {
					invalidCodes.push( error.code );
				}
			}
			const promises = [ screen.getPixelAsync( 9, 9 ), screen.getPixelAsync( 9, 9, true ),
				screen.getAsync( 9, 9, 1, 1 ), screen.getAsync( 0, 0, 0, 1 ) ];
			const expectedIndex = screen.getPixel( 9, 9, true );
			screen.removeScreen();
			const results = await Promise.all( promises );
			return [ results[ 0 ].a, results[ 1 ] === expectedIndex, results[ 2 ], results[ 3 ],
				invalidCodes ];
		} ), [ 0, true, [], [], [ "INVALID_PARAMETER", "INVALID_PARAMETER", "INVALID_CALLBACK" ] ] );
	} );
}
