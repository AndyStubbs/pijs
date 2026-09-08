/**
 * SYS-005 browser regressions against fresh in-memory full and lite bundles.
 * Run with node --test test/unit/pixel-disposal-browser.test.js; no server is required.
 */
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

async function probe( bundle, fn ) {
	const page = await browser.newPage();
	const errors = [];
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.setContent( "<!doctype html><html><body></body></html>" );
		await page.addScriptTag( { "content": bundles[ bundle ] } );
		await page.evaluate( () => $.ready() );
		const result = await page.evaluate( fn );
		// Cross a task boundary to observe errors from all queued microtasks.
		await page.evaluate( () => new Promise( resolve => setTimeout( resolve, 0 ) ) );
		assert.deepEqual( errors, [] );
		return result;
	} finally {
		await page.close();
	}
}

for( const bundle of [ "full", "lite" ] ) {
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

	test( `SYS-005 ${bundle}: removal between readback and conversion rejects`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const screen = $.screen( "2x2" );
			const promises = [ screen.getPixelAsync( 0, 0, true ), screen.getAsync( 0, 0, 1, 1 ),
				screen.getPixelAsync( 0, 0 ), screen.getAsync( 0, 0, 1, 1, 1, false ) ];
			const settled = Promise.all( promises.map( promise => promise.then(
				() => "unexpected resolution", error => error.code
			) ) );
			queueMicrotask( () => screen.removeScreen() );
			return settled;
		} ), Array( 4 ).fill( "SCREEN_REMOVED" ) );
	} );

	test( `SYS-005 ${bundle}: queued and reentrant filters cancel`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const counts = [];
			for( const timing of [ "immediate", "between", "callback" ] ) {
				const screen = $.screen( "2x2" );
				let count = 0;
				screen.filterImg( () => {
					count++;
					if( timing === "callback" ) {
						screen.removeScreen();
					}
					return true;
				} );
				if( timing === "immediate" ) {
					screen.removeScreen();
				} else if( timing === "between" ) {
					queueMicrotask( () => screen.removeScreen() );
				}
				await new Promise( resolve => setTimeout( resolve, 0 ) );
				counts.push( count );
			}
			return counts;
		} ), [ 0, 0, 1 ] );
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
