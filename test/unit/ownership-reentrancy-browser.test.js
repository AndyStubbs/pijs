/**
 * COV-004 browser ownership/reentrancy matrix using fresh in-memory bundles.
 * Run with node --test test/unit/ownership-reentrancy-browser.test.js; no server required.
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

async function probe( bundle, fn, expectedErrors = [] ) {
	const page = await browser.newPage();
	const errors = [];
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.setContent( "<!doctype html><html><body></body></html>" );
		await page.addScriptTag( { "content": bundles[ bundle ] } );
		await page.evaluate( () => $.ready() );
		const result = await page.evaluate( fn );
		await page.evaluate( () => new Promise( resolve => setTimeout( resolve, 0 ) ) );
		assert.deepEqual( errors, expectedErrors );
		return result;
	} finally {
		await page.close();
	}
}

for( const bundle of [ "full", "lite" ] ) {
	test( `COV-004 ${bundle}: dispose during pending pixel read cancels`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const survivor = $.screen( "4x4" );
			const screen = $.screen( "4x4" );
			screen.setColor( "red" );
			screen.pset( 0, 0 );
			const pending = screen.getPixelAsync( 0, 0 );
			const settled = pending.then(
				() => "resolved",
				error => error.code
			);
			screen.removeScreen();
			const code = await settled;
			survivor.setColor( "blue" );
			survivor.pset( 1, 1 );
			const pixel = await survivor.getPixelAsync( 1, 1 );
			return [ code, pixel.b ];
		} ), [ "SCREEN_REMOVED", 255 ] );
	} );

	test( `COV-004 ${bundle}: throwing ready leaves unrelated waiters settled`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const order = [];
			const failure = new Error( "ready-fail" );
			const outcomes = await Promise.allSettled( [
				$.ready( () => {
					order.push( "first" );
					throw failure;
				} ),
				$.ready( () => order.push( "second" ) )
			] );
			await $.ready( () => order.push( "third" ) );
			return [
				order,
				outcomes[ 0 ].status,
				outcomes[ 0 ].reason && outcomes[ 0 ].reason.message,
				outcomes[ 1 ].status
			];
		} ), [ [ "first", "second", "third" ], "rejected", "ready-fail", "fulfilled" ] );
	} );

	test( `COV-004 ${bundle}: image remove during load permits name reuse`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const canvas = document.createElement( "canvas" );
			canvas.width = 2;
			canvas.height = 2;
			$.loadImage( { "src": "pending.png", "name": "reuse" } );
			$.removeImage( "reuse" );
			$.loadImage( { "src": canvas, "name": "reuse" } );
			const image = $.getImage( "reuse" );
			return [ image === canvas, image.width, image.height ];
		} ), [ true, 2, 2 ] );
	} );

	test( `COV-004 ${bundle}: shared-context child survives parent removal then cleans up`,
		async () => {
			assert.deepEqual( await probe( bundle, async () => {
				const parent = $.screen( "8x8" );
				const child = $.screen( {
					"aspect": "4x4",
					"isOffscreen": true,
					"parent": parent
				} );
				child.setColor( "red" );
				child.pset( 1, 1 );
				parent.removeScreen();
				const afterParent = Array.from( child.getPixel( 1, 1 ).array );
				child.setColor( "blue" );
				child.pset( 2, 2 );
				const afterDraw = Array.from( child.getPixel( 2, 2 ).array );
				child.removeScreen();
				return [ afterParent, afterDraw, $.getAllScreens().length ];
			} ), [ [ 255, 0, 0, 255 ], [ 0, 0, 255, 255 ], 0 ] );
		} );
}
