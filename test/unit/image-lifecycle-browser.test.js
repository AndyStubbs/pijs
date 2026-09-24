/**
 * SYS-010 browser regressions against fresh in-memory full and lite bundles.
 * Run with node --test test/unit/image-lifecycle-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./browser-source-harness.js";
const { test } = g_test;
const assert = g_assert;

const { probe } = g_harness.useBrowserBundles( {
	"setup": installImageHarness,
	"timeout": 10000,
	"finish": () => imageTest.checkpoint()
} );

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

const LOADER_VARIANTS = [ "loadImage", "loadSpritesheet" ].flatMap( loader => [
	{ "loader": loader, "overload": "positional" },
	{ "loader": loader, "overload": "object" }
] );

for( const bundle of g_harness.BUNDLES ) {
	test( `2.2 ${bundle}: loader callbacks and readiness for every overload`, async () => {
		const result = await probe( bundle, async variants => {
			const results = [];
			for( const { loader, overload } of variants ) {
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
				results.push( calls );
			}
			return results;
		}, LOADER_VARIANTS, { "errors": Array( 8 ).fill( "expected loader callback" ) } );
		assert.deepEqual( result, Array( 4 ).fill( [ [ "load", "source" ], "ready",
			[ "load", "source" ], "ready", [ "error", "error" ], "IMAGE_LOAD_FAILED",
			[ "error", "error" ], "IMAGE_LOAD_FAILED" ] ) );
	} );

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
