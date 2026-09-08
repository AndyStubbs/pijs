/**
 * SYS-017 public API regressions using fresh in-memory full and lite bundles.
 * Run with node --test test/unit/color-validation-browser.test.js; no server is required.
 */
"use strict";

const { test, before, after } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs/promises" );
const path = require( "node:path" );
const esbuild = require( "esbuild" );
const { chromium } = require( "@playwright/test" );
const bundles = {};
let browser;

before( async () => {
	for( const [ name, entry ] of [ [ "full", "index-full.js" ], [ "lite", "index.js" ] ] ) {
		const result = await esbuild.build( {
			"entryPoints": [ path.join( __dirname, "../../src", entry ) ],
			"bundle": true, "write": false, "format": "iife", "target": "es2020",
			"define": { "__VERSION__": JSON.stringify( require( "../../package.json" ).version ) },
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
	browser = await chromium.launch( { "headless": true } );
} );

after( async () => { await browser?.close(); } );

async function probe( bundle, fn, arg ) {
	const page = await browser.newPage();
	const errors = [];
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.setContent( "<!doctype html><html><body></body></html>" );
		await page.addScriptTag( { "content": bundles[ bundle ] } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( () => {
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
		} );
		await page.evaluate( fn, arg );
		await page.evaluate( () => new Promise( resolve => requestAnimationFrame( resolve ) ) );
		assert.deepEqual( errors, [] );
	} finally {
		await page.close();
	}
}

for( const bundle of [ "full", "lite" ] ) {
	for( const overload of [ "positional", "object" ] ) {
		test( `SYS-017 ${bundle}: ${overload} setters preserve drawing and new-screen defaults`,
			async () => {
				await probe( bundle, overload => {
					$.setDefaultPal( [ "#FF0000", "#00FF00" ] );
					$.setDefaultColor( 1 );
					const screen = $.screen( "8x8" );
					const other = $.screen( { "aspect": "8x8", "isOffscreen": true,
						"parent": screen } );
					function set( target, command, value ) {
						if( overload === "object" ) { target[ command ]( { "color": value } ); }
						else { target[ command ]( value ); }
					}
					for( const value of [ -1, -0.5, 0.5, NaN, Infinity, -Infinity, 3 ] ) {
						for( const target of [ screen, $ ] ) {
							checkInvalid( () => set( target, "setColor", value ), "INVALID_PARAMETER" );
							checkEqual( Array.from( target.getColor().array ), [ 255, 0, 0, 255 ],
								"Current color changed" );
							target.pset( 1, 1 );
							checkEqual( Array.from( target.getPixel( 1, 1 ).array ),
								[ 255, 0, 0, 255 ], "Drawing after rejection" );
						}
						checkInvalid( () => set( $, "setDefaultColor", value ), "INVALID_PARAMETER" );
						checkEqual( Array.from( $.getDefaultColor( false ).array ),
							[ 255, 0, 0, 255 ], "Default color changed" );
						const child = $.screen( { "aspect": "8x8", "isOffscreen": true,
							"parent": screen } );
						child.pset( 1, 1 );
						checkEqual( Array.from( child.getPixel( 1, 1 ).array ),
							[ 255, 0, 0, 255 ], "New screen default" );
						child.removeScreen();
						$.setScreen( other );
					}
					for( const index of [ 0, 1, 2 ] ) {
						set( screen, "setColor", index );
						set( $, "setDefaultColor", index );
						const expected = Array.from( screen.getPalColor( index ).array );
						checkEqual( Array.from( screen.getColor().array ), expected, "Valid index" );
						checkEqual( Array.from( $.getDefaultColor( false ).array ), expected,
							"Valid default index" );
					}
				}, overload );
			} );
	}

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
			for( const index of [ "1", "length", "map", "__proto__", null, true ] ) {
				checkEqual( screen.getPalColor( { "index": index } ), null,
					"Index lookup must not coerce" );
			}
		} );
	} );
}
