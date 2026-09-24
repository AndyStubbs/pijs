/**
 * SYS-021 public API regressions against fresh in-memory full and lite-plus-gamepad bundles.
 * Run with node --test test/unit/gamepad-validation-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./browser-source-harness.js";
const { test } = g_test;
const assert = g_assert;

const { probe } = g_harness.useBrowserBundles( {
	"litePlugins": [ "gamepad" ]
} );

for( const bundle of g_harness.BUNDLES ) {
	for( const overload of [ "positional", "object" ] ) {
		test( `SYS-021 ${bundle}: ${overload} sensitivity validates without corrupting axes`,
			async () => {
				await probe( bundle, overload => {
					const pad = { "index": 0, "id": "test-pad", "connected": true,
						"mapping": "standard", "timestamp": 0, "buttons": [],
						"axes": [ 0.5, -0.5, 0.1, -0.1, 0, 1, -1 ] };
					const frames = new Map();
					let nextFrame = 0;
					const nativeRequest = window.requestAnimationFrame;
					const nativeCancel = window.cancelAnimationFrame;
					Object.defineProperty( navigator, "getGamepads", {
						"configurable": true, "value": () => [ pad ]
					} );
					window.requestAnimationFrame = fn => {
						frames.set( ++nextFrame, fn ); return nextFrame;
					};
					window.cancelAnimationFrame = id => frames.delete( id );
					function set( value ) {
						if( overload === "object" ) {
							$.setGamepadSensitivity( { "sensitivity": value } );
						} else {
							$.setGamepadSensitivity( value );
						}
					}
					function checkAxes( expected ) {
						if( frames.size !== 1 ) { throw new Error( "Expected one gamepad frame" ); }
						const [ id, fn ] = frames.entries().next().value;
						frames.delete( id );
						fn();

						// Read after the loop advances the tick, forcing a fresh axis update.
						const axes = $.ingamepad( 0 ).axes;
						if( axes.length !== expected.length ) { throw new Error( "Axis count" ); }
						for( let i = 0; i < axes.length; i++ ) {
							if( !Number.isFinite( axes[ i ] ) ||
								Math.abs( axes[ i ] - expected[ i ] ) > 1e-10
							) {
								throw new Error( `Unexpected axis ${i}: ${axes[ i ]}` );
							}
						}
					}
					try {
						$.ingamepad( 0 );
						checkAxes( [ 0.375, -0.375, 0, 0, 0, 1, -1 ] );
						set( 0.25 );
						checkAxes( [ 1 / 3, -1 / 3, 0, 0, 0, 1, -1 ] );
						for( const value of [ NaN, Infinity, -Infinity, -0.01, 1.01,
							"0.2", null, undefined, true, false, {}, [], [ 0.2 ] ] ) {
							let caught;
							try { set( value ); } catch( error ) { caught = error; }
							if( !( caught instanceof TypeError ) ||
								caught.code !== "INVALID_PARAMETERS" || caught.message !==
								"setGamepadSensitivity: sensitivity must be a number between 0 and 1."
							) {
								throw new Error( `Expected validation error for ${String( value )}` );
							}
							pad.axes = [ 0.625, -0.625, 0.2, -0.2, 0, 1, -1 ];
							checkAxes( [ 0.5, -0.5, 0, 0, 0, 1, -1 ] );
						}
						for( const value of [ 0, -0 ] ) {
							set( value );
							checkAxes( [ 0.625, -0.625, 0.2, -0.2, 0, 1, -1 ] );
						}
						set( 0.5 );
						checkAxes( [ 0.25, -0.25, 0, 0, 0, 1, -1 ] );
						set( 1 );
						pad.axes = [ 0.999995, -0.999995, 0.5, -0.5, 0, 1, -1 ];
						checkAxes( [ 0.5, -0.5, 0, 0, 0, 1, -1 ] );
					} finally {
						$.stopGamepad();
						window.requestAnimationFrame = nativeRequest;
						window.cancelAnimationFrame = nativeCancel;
						delete navigator.getGamepads;
					}
				}, overload );
			} );
	}
}
