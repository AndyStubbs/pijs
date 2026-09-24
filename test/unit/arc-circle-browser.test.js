/**
 * SYS-015/SYS-016 WebGL regressions using fresh in-memory full and lite bundles.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./browser-source-harness.js";
const { test } = g_test;
const assert = g_assert;

const { probe } = g_harness.useBrowserBundles( {
	"expose": "rasterTest",
	"setup": () => {
		window.inspect = screen => rasterTest.manager.getScreenData( "test", screen.id );
		window.pixels = screen => {
			const data = inspect( screen );
			const result = rasterTest.renderer.readPixelsRaw(
				data, 0, 0, data.width, data.height
			);
			if( data.gl.getError() !== data.gl.NO_ERROR ) {
				throw new Error( "WebGL error after readback" );
			}
			return Array.from( result );
		};
		window.expectEqual = ( actual, expected ) => {
			if( actual.length !== expected.length ||
				actual.some( ( value, index ) => value !== expected[ index ] ) ) {
				throw new Error( "Pixel buffers differ" );
			}
		};
	}
} );

for( const bundle of g_harness.BUNDLES ) {
	test( `SYS-015 ${bundle}: full arcs match circles through public degree APIs`, async () => {
		const count = await probe( bundle, () => {
			const screen = $.screen( "48x48" );
			screen.setColor( "rgba(255,0,0,0.5)" );
			screen.setBlend( "alpha" );
			let checked = 0;
			for( const radius of [ 0, 1, 2, 3, 5, 10, 20 ] ) {
				screen.cls();
				screen.circle( 24, 24, radius );
				const expected = pixels( screen );
				for( const start of [ 0, 45, -90 ] ) {
					for( const sweep of [ -720, -450, -360, 360, 450, 720 ] ) {
						screen.cls();
						screen.arc( 24, 24, radius, start, start + sweep );
						expectEqual( pixels( screen ), expected );
						checked++;
					}
				}
				screen.cls();
				screen.arc( { "x": 24, "y": 24, "radius": radius,
					"angle1": 45, "angle2": 405 } );
				expectEqual( pixels( screen ), expected );
			}
			screen.cls();
			screen.arc( 24, 24, 10, 0, 360 );
			const covered = pixels( screen ).filter( ( value, i ) => i % 4 === 3 && value );
			if( covered.length !== 52 ) { throw new Error( "Full-turn outline is incomplete" ); }
			return checked;
		} );
		assert.equal( count, 126 );
	} );

	test( `SYS-015/SYS-016 ${bundle}: translated clipping survives forced chunks`, async () => {
		const draws = await probe( bundle, () => {
			const screen = $.screen( "64x64" );
			screen.setColor( "rgba(255,0,0,0.5)" );
			screen.setBlend( "alpha" );
			const data = inspect( screen );
			const batch = data.batches[ rasterTest.renderer.POINTS_BATCH ];
			const gl = data.gl;
			const drawArrays = gl.drawArrays.bind( gl );
			let draws = 0;
			gl.drawArrays = ( mode, first, count ) => {
				if( mode === gl.POINTS ) {
					draws++;
					if( count > batch.maxCapacity || batch.count > batch.capacity ) {
						throw new Error( "Point batch exceeded capacity" );
					}
				}
				drawArrays( mode, first, count );
			};
			for( const shape of [ "circle", "full arc", "partial arc" ] ) {
				function draw( x, y ) {
					if( shape === "circle" ) { screen.circle( x, y, 14 ); }
					else if( shape === "full arc" ) { screen.arc( x, y, 14, 0, 360 ); }
					else { screen.arc( x, y, 14, 0, 270 ); }
				}
				screen.cls();
				draw( 22, 24 );
				const expected = pixels( screen );
				const unclippedCount = expected.filter( ( value, i ) => i % 4 === 3 && value ).length;

				// Raw WebGL rows start at the bottom; the view uses top-left coordinates.
				for( let y = 0; y < 64; y++ ) {
					for( let x = 0; x < 64; x++ ) {
						if( x < 10 || x >= 34 || y < 12 || y >= 36 ) {
							const index = ( ( 63 - y ) * 64 + x ) * 4;
							expected.fill( 0, index, index + 4 );
						}
					}
				}
				const alphas = expected.filter( ( value, i ) => i % 4 === 3 && value );
				if( alphas.length === 0 || alphas.length >= unclippedCount ||
					alphas.some( value => value !== 128 ) ) {
					throw new Error( "Clipping must retain a translucent portion of the outline" );
				}
				screen.cls();
				pixels( screen );
				batch.minCapacity = 8;
				batch.capacity = 8;
				batch.maxCapacity = 19;
				batch.vertices = new Float32Array( 8 * batch.vertexComps );
				batch.colors = new Uint8Array( 8 * batch.colorComps );
				batch.capacityChanged = true;
				screen.pushView( 10, 12, 24, 24 );
				draw( 12, 12 );
				screen.popView();
				expectEqual( pixels( screen ), expected );
			}
			return draws;
		} );
		assert.ok( draws > 4 );
	} );
}
