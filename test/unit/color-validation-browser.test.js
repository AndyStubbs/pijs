/**
 * SYS-017 public API regressions using fresh in-memory full and lite bundles.
 * Run with node --test test/unit/color-validation-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./browser-source-harness.js";
const { test } = g_test;
const assert = g_assert;

const { probe } = g_harness.useBrowserBundles( {
	"setup": () => {
		window.checkEqual = ( actual, expected, message ) => {
			if( JSON.stringify( actual ) !== JSON.stringify( expected ) ) {
				throw new Error( message + ": " + JSON.stringify( actual ) );
			}
		};
		window.checkInvalid = ( fn, code ) => {
			let caught;
			try { fn(); } catch( error ) { caught = [ error.name, error.code ]; }
			checkEqual( caught, [ "TypeError", code ], "Expected validation error" );
		};
	},
	"settle": "frame"
} );

for( const bundle of g_harness.BUNDLES ) {
	test( `SYS-017 ${bundle}: background and fill validation leaves styles and pixels intact`,
		async () => {
			await probe( bundle, () => {
				const host = document.createElement( "div" );
				document.body.appendChild( host );
				const screen = $.screen( { "aspect": "8x8", "container": host } );
				screen.setPal( [ "#FF0000", "#00FF00" ] );
				screen.setBgColor( 1 );
				screen.setContainerBgColor( 2 );
				screen.setColor( 1 );
				screen.pset( 0, 0 );
				const canvas = host.querySelector( "canvas" );
				const styles = [ canvas.style.backgroundColor, host.style.backgroundColor ];
				const pixels = JSON.stringify( screen.get( 0, 0, 8, 8, 0, false ) );
				for( const value of [ -1, -0.5, 0.5, NaN, Infinity, -Infinity, 3 ] ) {
					checkInvalid( () => screen.setBgColor( value ), "INVALID_COLOR" );
					checkInvalid( () => screen.setContainerBgColor( value ), "INVALID_COLOR" );
					checkInvalid( () => screen.circle( 4, 4, 2, value ), "INVALID_PARAMETER" );
					checkInvalid( () => screen.ellipse( 4, 4, 2, 2, value ), "INVALID_PARAMETER" );
					checkInvalid( () => screen.rect( 1, 1, 4, 4, value ), "INVALID_PARAMETER" );
					checkEqual( [ canvas.style.backgroundColor, host.style.backgroundColor ],
						styles, "Background styles changed" );
					checkEqual( JSON.stringify( screen.get( 0, 0, 8, 8, 0, false ) ), pixels,
						"Rejected fill changed pixels" );
					checkEqual( screen.getPalColor( value ), null, "Invalid palette lookup" );
				}
			} );
		} );

	test( `SYS-017 ${bundle}: supported colors and string conversion remain available`, async () => {
		await probe( bundle, () => {
			$.setDefaultPal( [ "#FF0000", "#00FF00" ] );
			const screen = $.screen( "8x8" );
			for( const value of [ "#123456", "rgb(18, 52, 86)", [ 18, 52, 86, 255 ],
				{ "r": 18, "g": 52, "b": 86, "a": 255 }, $.createColor( "#123456" ) ] ) {
				screen.setColor( { "color": value } );
				$.setDefaultColor( { "color": value } );
				checkEqual( Array.from( screen.getColor().array ), [ 18, 52, 86, 255 ],
					"Supported current color" );
				checkEqual( Array.from( $.getDefaultColor( false ).array ), [ 18, 52, 86, 255 ],
					"Supported default color" );
			}
			for( const value of [ "blue", "1" ] ) {
				const expected = Array.from( $.createColor( value ).array );
				screen.setColor( value );
				$.setDefaultColor( value );
				checkEqual( Array.from( screen.getColor().array ), expected, "String current color" );
				checkEqual( Array.from( $.getDefaultColor( false ).array ), expected,
					"String default color" );
			}
		} );
	} );
}
