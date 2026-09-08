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
	for( const loader of [ "loadImage", "loadSpritesheet" ] ) {
		for( const overload of [ "positional", "object" ] ) {
			test( `2.2 ${bundle}: ${loader} ${overload} callbacks and readiness`, async () => {
				const result = await probe( bundle, async ( { loader, overload } ) => {
					const h = imageTest;
					const calls = [];
					for( const eventName of [ "load", "error" ] ) {
						for( const shouldThrow of [ false, true ] ) {
							const onLoad = name => {
								calls.push( [ "load", name ] );
								if( shouldThrow ) { throw new Error( "expected loader callback" ); }
							};
							const onError = error => {
								calls.push( [ "error", error.type ] );
								if( shouldThrow ) { throw new Error( "expected loader callback" ); }
							};
							if( overload === "object" ) {
								$[ loader ]( { "src": "source.png", "name": "source",
									"width": 2, "height": 2, "onLoad": onLoad, "onError": onError } );
							} else if( loader === "loadImage" ) {
								$.loadImage( "source.png", "source", onLoad, onError );
							} else {
								$.loadSpritesheet( "source.png", "source", 2, 2, 0, onLoad, onError );
							}
							const img = h.instances.at( -1 );
							img.dispatchEvent( new Event( eventName ) );
							await $.ready();
							calls.push( h.code( "source" ) );
							$.removeImage( "source" );
						}
					}
					return calls;
				}, { "loader": loader, "overload": overload },
				[ "expected loader callback", "expected loader callback" ] );
				assert.deepEqual( result, [ [ "load", "source" ], "ready",
					[ "load", "source" ], "ready", [ "error", "error" ], "IMAGE_LOAD_FAILED",
					[ "error", "error" ], "IMAGE_LOAD_FAILED" ] );
			} );
		}
	}

	test( `2.2 ${bundle}: images and sprites retain source colors across palette changes`,
		async () => {
			const result = await probe( bundle, async () => {
				const first = $.screen( "12x12" );
				const source = document.createElement( "canvas" );
				source.width = 7;
				source.height = 3;
				const context = source.getContext( "2d" );
				context.fillStyle = "red";
				context.fillRect( 0, 0, 3, 3 );
				context.fillStyle = "blue";
				context.fillRect( 4, 0, 3, 3 );
				const original = Array.from( context.getImageData( 0, 0, 7, 3 ).data );
				let directCallbacks = 0;
				$.loadImage( source, "image", () => directCallbacks++ );

				// Removed object options follow the existing unknown-option behavior.
				$.loadImage( { "src": source, "name": "old-options", "usePalette": true,
					"paletteKeys": [ "black" ], "onLoad": () => directCallbacks++ } );
				$.loadSpritesheet( source, "fixed", 1, 1, 0, () => directCallbacks++ );
				$.loadSpritesheet( { "src": source, "name": "auto",
					"usePalette": true, "paletteKeys": [ "black" ],
					"onLoad": () => directCallbacks++ } );
				const second = $.screen( "12x12" );
				const samples = [];
				for( const screen of [ first, second ] ) {
					for( const change of [ () => {},
						() => screen.setPal( [ "black", "white" ] ),
						() => screen.setPalColors( [ 1 ], [ "lime" ] ),
						() => screen.addPalColors( [ "yellow" ] ) ] ) {
						change();
						screen.cls();
						screen.drawImage( "image", 0, 0 );
						screen.drawImage( "old-options", 0, 3 );
						screen.drawSprite( "fixed", 0, 0, 6 );
						screen.drawSprite( "fixed", 4, 4, 6 );
						screen.drawSprite( "auto", 0, 0, 9 );
						screen.drawSprite( "auto", 1, 4, 9 );
						for( const y of [ 0, 3, 6, 9 ] ) {
							for( const x of [ 0, 4 ] ) {
								const pixel = await screen.getPixelAsync( x, y );
								samples.push( [ pixel.r, pixel.g, pixel.b, pixel.a ] );
							}
						}
					}
				}
				const finalPixels = context.getImageData( 0, 0, 7, 3 ).data;
				return { "samples": samples, "directCallbacks": directCallbacks,
					"sourcePreserved": $.getImage( "image" ) === source &&
						original.every( ( value, i ) =>
							value === finalPixels[ i ] ),
					"frames": [ second.getSpritesheetData( "fixed" ).frameCount,
						second.getSpritesheetData( "auto" ).frameCount ] };
			} );
			assert.equal( result.directCallbacks, 4 );
			assert.equal( result.sourcePreserved, true );
			assert.deepEqual( result.frames, [ 21, 2 ] );
			assert.deepEqual( result.samples,
				Array( 32 ).fill( [ [ 255, 0, 0, 255 ], [ 0, 0, 255, 255 ] ] ).flat() );
		} );

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
