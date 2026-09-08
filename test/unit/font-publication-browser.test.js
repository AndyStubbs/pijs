/**
 * SYS-022 font publication regressions using fresh in-memory full and lite bundles.
 * Run with node --test test/unit/font-publication-browser.test.js; no server is required.
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

async function probe( bundle, fn, overload, expectedErrors = [] ) {
	const page = await browser.newPage();
	const errors = [];
	const consoleErrors = [];
	page.on( "pageerror", error => errors.push( error.message ) );
	page.on( "console", message => {
		if( message.type() === "error" ) { consoleErrors.push( message.text() ); }
	} );
	try {
		await page.setContent( "<!doctype html><html><body></body></html>" );
		await page.addScriptTag( { "content": bundles[ bundle ] } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( overload => {
			window.checkEqual = ( actual, expected, message ) => {
				if( JSON.stringify( actual ) !== JSON.stringify( expected ) ) {
					throw new Error( message + ": " + JSON.stringify( actual ) );
				}
			};
			window.load = src => {
				if( overload === "object" ) {
					return $.loadFont( { "src": src, "width": 8, "height": 8, "charset": "A" } );
				}
				return $.loadFont( src, 8, 8, 0, "A" );
			};
			window.awaitReady = async () => {
				let timer;
				try {
					await Promise.race( [ $.ready(), new Promise( ( resolve, reject ) => {
						timer = setTimeout( () => reject( new Error( "readiness leaked" ) ), 2000 );
					} ) ] );
				} finally { clearTimeout( timer ); }
			};
			window.makeAtlas = () => {
				const canvas = document.createElement( "canvas" );
				canvas.width = 8; canvas.height = 8;
				const ctx = canvas.getContext( "2d" );
				ctx.fillStyle = "white";
				ctx.fillRect( 0, 0, 4, 8 );
				return canvas;
			};
			window.checkPrint = id => {
				const screen = $.screen( "32x16" );
				try {
					screen.setFont( id );
					screen.setColor( "#FF0000" );
					screen.print( "A", true );
					checkEqual( Array.from( screen.getPixel( 1, 1 ).array ),
						[ 255, 0, 0, 255 ], "Glyph ink" );
					checkEqual( screen.getPixel( 6, 1 ).a, 0, "Glyph transparency" );
				} finally { screen.removeScreen(); }
			};
		}, overload );
		await page.evaluate( fn );
		await page.evaluate( () => new Promise( resolve => requestAnimationFrame( resolve ) ) );
		assert.deepEqual( errors, [] );
		assert.deepEqual( consoleErrors, expectedErrors );
	} finally { await page.close(); }
}

for( const bundle of [ "full", "lite" ] ) {
	test( `SYS-022 ${bundle}: font 1 renders immediately while URL fonts remain pending`, async () => {
		const page = await browser.newPage();
		const errors = [];
		page.on( "pageerror", error => errors.push( error.message ) );
		page.on( "console", message => {
			if(
				message.type() === "error" ||
				message.text() === "bitmapPrint: Font image not loaded yet."
			) {
				errors.push( message.text() );
			}
		} );
		try {
			await page.setContent( "<!doctype html><html><body></body></html>" );
			await page.evaluate( () => {
				const NativeImage = window.Image;
				window.pendingFontUrls = [];
				window.Image = function() {
					const img = new NativeImage();
					Object.defineProperty( img, "src", {
						"set": value => pendingFontUrls.push( value )
					} );
					return img;
				};
			} );

			// Print in the same script turn as initialization, with no ready call or image events.
			await page.addScriptTag( { "content": bundles[ bundle ] + `
				const screen = $.screen( "32x16" );
				screen.setColor( "#FF0000" );
				screen.print( "A", true );
				screen.setFont( 1 );
				screen.setPosPx( 8, 0 );
				screen.print( "A", true );
				window.immediateFontPixels = [ [], [] ];
				for( let y = 0; y < 8; y++ ) {
					for( let x = 0; x < 6; x++ ) {
						immediateFontPixels[ 0 ].push( Array.from( screen.getPixel( x, y ).array ) );
						immediateFontPixels[ 1 ].push( Array.from( screen.getPixel( x + 8, y ).array ) );
					}
				}
				screen.removeScreen();
			` } );
			const result = await page.evaluate( () => ( {
				"pending": pendingFontUrls.length, "pixels": immediateFontPixels
			} ) );
			assert.equal( result.pending, 4 );
			assert.deepEqual( result.pixels[ 0 ], result.pixels[ 1 ] );
			assert.ok( result.pixels[ 0 ].some( pixel => pixel[ 0 ] === 255 && pixel[ 3 ] === 255 ) );
			assert.ok( result.pixels[ 0 ].some( pixel => pixel[ 3 ] === 0 ) );
			assert.deepEqual( errors, [] );
		} finally { await page.close(); }
	} );

	for( const overload of [ "positional", "object" ] ) {
		test( `SYS-022 ${bundle} ${overload}: rejection preserves defaults, IDs and rendering`,
			async () => {
				await probe( bundle, async () => {
					const initial = $.getAvailableFonts();
					checkEqual( initial, [
						{ "id": 0, "width": 6, "height": 6 },
						{ "id": 1, "width": 6, "height": 8 },
						{ "id": 2, "width": 8, "height": 8 },
						{ "id": 3, "width": 8, "height": 14 },
						{ "id": 4, "width": 8, "height": 16 }
					], "Default fonts" );
					const screen = $.screen( "32x16" );
					for( const src of [ {}, null, undefined, 12, false, [] ] ) {
						let caught;
						try { load( src ); } catch( error ) {
							caught = [ error.name, error.code, error.message ];
						}
						checkEqual( caught, [ "TypeError", "INVALID_FONT_SRC",
							"loadFont: fontSrc must be a string or Image element." ], "Source error" );
						checkEqual( $.getAvailableFonts(), initial, "Registry after rejection" );
						for( const select of [ () => screen.setFont( 5 ),
							() => $.setDefaultFont( 5 ) ] ) {
							let code;
							try { select(); } catch( error ) { code = error.code; }
							checkEqual( code, "INVALID_FONT_ID", "Rejected font selectable" );
						}
					}
					screen.removeScreen();
					const canvas = makeAtlas();
					checkEqual( load( canvas ), 5, "Rejection consumed an ID" );
					checkPrint( 5 );
					const url = canvas.toDataURL();
					checkEqual( load( url ), 6, "URL ID" );
					checkEqual( $.getAvailableFonts().length, 7, "Pending URL publication" );
					await awaitReady();
					checkPrint( 6 );
					const img = new Image();
					img.src = url;
					await img.decode();
					checkPrint( load( img ) );
					if( typeof OffscreenCanvas !== "undefined" ) {
						const offscreen = new OffscreenCanvas( 8, 8 );
						offscreen.getContext( "2d" ).drawImage( canvas, 0, 0 );
						checkPrint( load( offscreen ) );
					}
				}, overload );
			} );

		test( `SYS-022 ${bundle} ${overload}: synchronous setup failures release readiness`,
			async () => {
				await probe( bundle, async () => {
					const initial = $.getAvailableFonts();
					const NativeImage = window.Image;
					const failure = new Error( "controlled setup failure" );
					for( const step of [ "construct", "onload", "onerror", "src" ] ) {
						let image;
						window.Image = function() {
							if( step === "construct" ) { throw failure; }
							image = new NativeImage();
							Object.defineProperty( image, step, {
								"configurable": true,
								"set": value => { if( value !== null ) { throw failure; } }
							} );
							return image;
						};
						let caught;
						try { load( "data:image/png;base64,unused" ); }
						catch( error ) { caught = error; }
						finally { window.Image = NativeImage; }
						checkEqual( caught === failure, true, "Original exception" );
						checkEqual( $.getAvailableFonts(), initial, "Setup failure publication" );
						await awaitReady();
					}
					checkEqual( load( makeAtlas() ), 5, "Setup failure consumed an ID" );
					checkPrint( 5 );
				}, overload );
			} );

		test( `SYS-022 ${bundle} ${overload}: async failure retains a selectable font`, async () => {
			await probe( bundle, async () => {
				const id = load( "data:image/png;base64,invalid" );
				const pending = $.getAvailableFonts();
				checkEqual( id, 5, "Failed URL ID" );
				$.setDefaultFont( id );
				const screen = $.screen( "32x16" );
				screen.setFont( id );
				await awaitReady();
				checkEqual( $.getAvailableFonts(), pending, "Async failure registry" );
				screen.setFont( id );
				$.setDefaultFont( id );
				const other = $.screen( "32x16" );
				for( const target of [ screen, other ] ) {
					let code;
					try { target.setChar( "A", [] ); } catch( error ) { code = error.code; }
					checkEqual( code, "NO_FONT_IMAGE", "Failed font has no image" );
					target.removeScreen();
				}
				$.setDefaultFont( 1 );
				checkEqual( load( makeAtlas() ), 6, "Async failure retains its ID" );
				checkPrint( 6 );
			}, overload, [ "loadFont: Unable to load image for font." ] );
		} );
	}
}
