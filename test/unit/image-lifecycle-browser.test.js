/**
 * SYS-010 browser regressions against fresh in-memory full and lite bundles.
 * Run with node --test test/unit/image-lifecycle-browser.test.js; no server is required.
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

async function probe( bundle, fn, arg, expectedErrors = [] ) {
	const page = await browser.newPage();
	const errors = [];
	let timeout;
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.setContent( "<!doctype html><html><body></body></html>" );
		await page.addScriptTag( { "content": bundles[ bundle ] } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( installImageHarness );
		const result = await Promise.race( [ page.evaluate( fn, arg ),
			new Promise( ( resolve, reject ) => {
				timeout = setTimeout( () => reject( new Error( "Image scenario timed out" ) ), 10000 );
			} ) ] );
		await page.evaluate( () => imageTest.checkpoint() );
		assert.deepEqual( errors, expectedErrors );
		return result;
	} finally {
		clearTimeout( timeout );
		await page.close();
	}
}

/**
 * Use real drawable canvases with controlled image source assignment and terminal DOM events.
 */
function installImageHarness() {
	const instances = [];
	const nativeImage = window.Image;
	window.Image = function() {
		const canvas = document.createElement( "canvas" );
		canvas.width = 4;
		canvas.height = 2;
		Object.defineProperty( canvas, "src", {
			"set": value => canvas.setAttribute( "src", value ),
			"get": () => canvas.getAttribute( "src" )
		} );
		instances.push( canvas );
		return canvas;
	};
	window.imageTest = {
		"nativeImage": nativeImage,
		"instances": instances,
		"paint": ( canvas, color ) => {
			const context = canvas.getContext( "2d" );
			context.fillStyle = color;
			context.fillRect( 0, 0, canvas.width, canvas.height );
		},
		"code": name => {
			try { $.getImage( name ); } catch( error ) { return error.code; }
			return "ready";
		},
		"checkpoint": () => new Promise( resolve => setTimeout( resolve, 20 ) )
	};
}

for( const bundle of [ "full", "lite" ] ) {
	test( `SYS-010 ${bundle}: cancellation isolates replacements and readiness`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const h = imageTest;
			let callbacks = 0;
			$.loadImage( { "src": "old.png", "name": "reuse",
				"onLoad": () => callbacks++, "onError": () => callbacks++ } );
			const old = h.instances[ 0 ];
			const ready = old.onload;
			const error = old.onerror;
			$.loadImage( "unrelated.png", "unrelated" );
			let settlements = 0;
			const promise = $.ready().then( () => settlements++ );
			$.removeImage( "reuse" );
			$.removeImage( "reuse" );
			const removed = h.code( "reuse" );
			$.loadImage( "new.png", "reuse" );
			ready(); error( new Event( "error" ) );
			h.paint( h.instances[ 2 ], "blue" );
			h.instances[ 2 ].dispatchEvent( new Event( "load" ) );
			await h.checkpoint();
			const pending = settlements;
			$.removeImage( "unrelated" );
			await promise;
			const screen = $.screen( "8x8" );
			screen.drawImage( "reuse", 0, 0 );
			const pixel = await screen.getPixelAsync( 0, 0 );
			return [ removed, pending, settlements, callbacks, old.onload, old.onerror,
				old.src, pixel.r, pixel.b ];
		} ), [ "IMAGE_NOT_FOUND", 0, 1, 0, null, null, null, 0, 255 ] );
	} );

	test( `SYS-010 ${bundle}: failed images can be removed and reused repeatedly`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const h = imageTest;
			let callbacks = 0;
			const result = [];
			for( let i = 0; i < 3; i++ ) {
				$.loadImage( { "src": "bad.png", "name": "reuse",
					"onError": () => callbacks++ } );
				const img = h.instances.at( -1 );
				const ready = img.onload;
				const error = img.onerror;
				img.dispatchEvent( new Event( "error" ) );
				await $.ready();
				result.push( h.code( "reuse" ) );
				$.removeImage( "reuse" );
				ready(); error();
				result.push( h.code( "reuse" ) );
			}
			return [ result, callbacks ];
		} ), [ Array( 3 ).fill( [ "IMAGE_LOAD_FAILED", "IMAGE_NOT_FOUND" ] ).flat(), 3 ] );
	} );

	for( const event of [ "load", "error" ] ) {
		test( `SYS-010 ${bundle}: throwing reentrant ${event} callbacks settle only old load`,
			async () => {
				assert.deepEqual( await probe( bundle, async eventName => {
					const h = imageTest;
					const callback = () => {
						$.removeImage( "reuse" );
						$.loadImage( "replacement.png", "reuse" );
						throw new Error( "expected image callback" );
					};
					$.loadImage( { "src": "old.png", "name": "reuse",
						"onLoad": callback, "onError": callback } );
					let settlements = 0;
					const promise = $.ready().then( () => settlements++ );
					h.instances[ 0 ].dispatchEvent( new Event( eventName ) );
					await h.checkpoint();
					const pending = settlements;
					const status = h.code( "reuse" );
					h.instances[ 1 ].dispatchEvent( new Event( "load" ) );
					await promise;
					return [ pending, status, settlements, $.getImage( "reuse" ) === h.instances[ 1 ] ];
				}, event, [ "expected image callback" ] ), [ 0, "IMAGE_NOT_READY", 1, true ] );
			} );
	}

	test( `SYS-010 ${bundle}: spritesheet cancellation preserves replacement metadata`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const h = imageTest;
			let oldCallbacks = 0;
			$.loadSpritesheet( { "src": "old.png", "name": "sheet", "width": 1,
				"height": 1, "onLoad": () => oldCallbacks++ } );
			const stale = h.instances[ 0 ].onload;
			$.removeImage( "sheet" );
			$.loadSpritesheet( "new.png", "sheet", 2, 2 );
			h.paint( h.instances[ 1 ], "red" );
			h.instances[ 1 ].dispatchEvent( new Event( "load" ) );
			stale();
			await $.ready();
			const screen = $.screen( "8x8" );
			const data = screen.getSpritesheetData( "sheet" );
			screen.drawSprite( "sheet", 1, 0, 0 );
			return [ oldCallbacks, data.frameCount,
				data.frames.map( frame => [ frame.x, frame.y, frame.width, frame.height ] ),
				( await screen.getPixelAsync( 0, 0 ) ).r ];
		} ), [ 0, 2, [ [ 0, 0, 2, 2 ], [ 2, 0, 2, 2 ] ], 255 ] );
	} );

	test( `SYS-010 ${bundle}: ready removal flushes queued draws on independent and shared screens`,
		async () => {
			assert.deepEqual( await probe( bundle, async () => {
				const h = imageTest;
				const first = $.screen( "8x8" );
				const second = $.screen( "8x8" );
				const child = $.screen( { "aspect": "8x8", "isOffscreen": true, "parent": first } );
				const canvas = document.createElement( "canvas" );
				canvas.width = 2;
				canvas.height = 2;
				h.paint( canvas, "red" );
				$.loadImage( canvas, "old" );
				const screens = [ first, second, child ];
				for( const screen of screens ) { screen.drawImage( "old", 0, 0 ); }
				$.removeImage( "old" );
				const reds = await Promise.all( screens.map( async screen => {
					return ( await screen.getPixelAsync( 0, 0 ) ).r;
				} ) );
				return [ reds, h.code( "old" ), canvas.width, canvas.height ];
			} ), [ [ 255, 255, 255 ], "IMAGE_NOT_FOUND", 2, 2 ] );
		} );

	test( `SYS-010 ${bundle}: native image decode, cancellation and failure permit name reuse`,
		async () => {
			assert.deepEqual( await probe( bundle, async () => {
				const h = imageTest;
				window.Image = h.nativeImage;
				const canvas = document.createElement( "canvas" );
				canvas.width = 2;
				canvas.height = 2;
				h.paint( canvas, "red" );
				const url = canvas.toDataURL();
				let cancelledCallbacks = 0;
				$.loadImage( { "src": url, "name": "native",
					"onLoad": () => cancelledCallbacks++, "onError": () => cancelledCallbacks++ } );
				$.removeImage( "native" );
				await $.ready();
				const cancelled = h.code( "native" );
				$.loadImage( url, "native" );
				await $.ready();
				const img = $.getImage( "native" );
				const screen = $.screen( "4x4" );
				screen.drawImage( "native", 0, 0 );
				$.removeImage( "native" );
				const red = ( await screen.getPixelAsync( 0, 0 ) ).r;
				let failures = 0;
				$.loadImage( { "src": "data:image/png;base64,invalid", "name": "native",
					"onError": () => failures++ } );
				await $.ready();
				const failed = h.code( "native" );
				$.removeImage( "native" );
				$.loadImage( url, "native" );
				await $.ready();
				return [ cancelledCallbacks, cancelled, red, img.onload, img.onerror,
					failures, failed, $.getImage( "native" ).naturalWidth ];
			} ), [ 0, "IMAGE_NOT_FOUND", 255, null, null, 1, "IMAGE_LOAD_FAILED", 2 ] );
		} );
}
