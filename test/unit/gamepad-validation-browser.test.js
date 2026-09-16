/**
 * SYS-021 public API regressions against fresh in-memory full and lite-plus-gamepad bundles.
 * Run with node --test test/unit/gamepad-validation-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fsPromises from "node:fs/promises";
import * as g_path from "node:path";
import * as g_esbuild from "esbuild";
import * as g_playwright from "@playwright/test";
import * as g_fs from "node:fs";
import * as g_url from "node:url";
const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const { test, before, after } = g_test;
const assert = g_assert;
const fs = g_fsPromises;
const path = g_path;
const esbuild = g_esbuild;
const { chromium } = g_playwright;

const bundles = {};
let browser;
let gamepadBundle;

before( async () => {
	for( const [ name, entry ] of [ [ "full", "index-full.js" ], [ "lite", "index.js" ] ] ) {
		const result = await esbuild.build( {
			"entryPoints": [ path.join( DIRNAME, "../../src", entry ) ],
			"bundle": true, "write": false, "format": "iife", "target": "es2020",
			"define": { "__VERSION__": JSON.stringify( JSON.parse( g_fs.readFileSync( new URL( "../../package.json", import.meta.url ), "utf8" ) ).version ) },
			"loader": { ".vert": "text", ".frag": "text" },
			"plugins": [ {
				"name": "test-font-data",
				"setup": build => {
					build.onLoad( { "filter": /\.webp$/ }, async args => {
						const data = await fs.readFile( args.path );
						const font = { "data": "data:image/webp;base64," + data.toString( "base64" ) };
						return { "contents": "export default " + JSON.stringify( font ),
							"loader": "js" };
					} );
				}
			} ]
		} );
		bundles[ name ] = result.outputFiles[ 0 ].text;
	}
	const plugin = await esbuild.build( {
		"entryPoints": [ path.join( DIRNAME, "../../plugins/gamepad/index.js" ) ],
		"bundle": true, "write": false, "format": "iife", "target": "es2020"
	} );
	gamepadBundle = plugin.outputFiles[ 0 ].text;
	browser = await chromium.launch( { "headless": true } );
} );

after( async () => { await browser?.close(); } );

for( const bundle of [ "full", "lite" ] ) {
	for( const overload of [ "positional", "object" ] ) {
		test( `SYS-021 ${bundle}: ${overload} sensitivity validates without corrupting axes`,
			async () => {
				const page = await browser.newPage();
				const errors = [];
				page.on( "pageerror", error => errors.push( error.message ) );
				try {
					await page.setContent( "<!doctype html><html><body></body></html>" );
					await page.addScriptTag( { "content": bundles[ bundle ] } );
					if( bundle === "lite" ) {
						await page.addScriptTag( { "content": gamepadBundle } );
					}
					await page.evaluate( () => $.ready() );
					await page.evaluate( overload => {
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
					await page.evaluate( () => new Promise( resolve => setTimeout( resolve, 0 ) ) );
					assert.deepEqual( errors, [] );
				} finally {
					await page.close();
				}
			} );
	}
}
