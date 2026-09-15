/**
 * COV-003 public API numeric boundary regressions using fresh in-memory bundles.
 * Run with node --test test/unit/numeric-boundaries-browser.test.js; no server required.
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
						const font = {
							"data": "data:image/webp;base64," + data.toString( "base64" )
						};
						return {
							"contents": "export default " + JSON.stringify( font ),
							"loader": "js"
						};
					} );
				}
			} ]
		} );
		bundles[ name ] = result.outputFiles[ 0 ].text;
	}
	browser = await chromium.launch( { "headless": true } );
} );

after( async () => { await browser?.close(); } );

async function probe( bundle, fn ) {
	const page = await browser.newPage();
	const errors = [];
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.setContent( "<!doctype html><html><body></body></html>" );
		await page.addScriptTag( { "content": bundles[ bundle ] } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( () => {
			window.checkCode = ( call, code ) => {
				let caught;
				try { call(); } catch( error ) { caught = error.code; }
				if( caught !== code ) {
					throw new Error( "Expected " + code + ", got " + caught );
				}
			};
		} );
		await page.evaluate( fn );
		assert.deepEqual( errors, [] );
	} finally {
		await page.close();
	}
}

for( const bundle of [ "full", "lite" ] ) {
	test( `COV-003 ${bundle}: view, blend, paint, geometry and font boundaries`, async () => {
		await probe( bundle, () => {
			const screen = $.screen( "32x24" );

			for( const value of [ NaN, Infinity, -Infinity, null, undefined ] ) {
				checkCode( () => screen.pushView( value, 0, 8, 8 ), "INVALID_PARAMETER" );
				checkCode( () => screen.paint( value, 1, 1 ), "INVALID_PARAMETER" );
				checkCode( () => screen.circle( value, 4, 2 ), "INVALID_PARAMETER" );
				checkCode( () => screen.rect( 0, 0, value, 4 ), "INVALID_PARAMETER" );
			}

			checkCode( () => screen.pushView( 0, 0, -1, 8 ), "INVALID_PARAMETER" );
			screen.setBlend( "alpha" );
			checkCode( () => screen.setBlend( "multiply" ), "INVALID_BLEND_MODE" );
			checkCode( () => screen.setBlend( "Blend" ), "INVALID_BLEND_MODE" );
			screen.setBlend( "replace" );
			checkCode( () => screen.paint( 1, 1, 1, -0.01 ), "INVALID_PARAMETER" );
			checkCode( () => screen.paint( 1, 1, 1, 1.01 ), "INVALID_PARAMETER" );
			checkCode( () => screen.arc( 4, 4, 2, NaN, 90 ), "INVALID_PARAMETER" );
			checkCode( () => screen.setFont( 999 ), "INVALID_FONT_ID" );
			checkCode(
				() => $.loadFont( { "src": "x.png", "width": NaN, "height": 8 } ),
				"INVALID_DIMENSIONS"
			);
		} );
	} );
}
