/**
 * SYS-007 WebGL regressions using fresh in-memory full and lite bundles.
 * Set PI_BATCH_VISUAL=true to also compare existing fixtures with approved PNG baselines.
 */
"use strict";

const { test, before, after } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs/promises" );
const path = require( "node:path" );
const esbuild = require( "esbuild" );
const { chromium } = require( "@playwright/test" );
const { PNG } = require( "pngjs" );
const toml = require( "@iarna/toml" );
const root = path.join( __dirname, "../.." );
const bundles = {};
let browser;

before( async () => {
	for( const [ name, entry ] of [ [ "full", "index-full.js" ], [ "lite", "index.js" ] ] ) {
		const result = await esbuild.build( {
			"stdin": { "contents": `import "./${entry}";
import * as manager from "./core/screen-manager.js";
import * as renderer from "./renderer/renderer.js";
window.batchTest = { manager, renderer };`, "resolveDir": path.join( root, "src" ) },
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
			window.inspect = screen => batchTest.manager.getScreenData( "test", screen.id );
			window.rawPixels = screen => {
				const data = inspect( screen );
				const pixels = batchTest.renderer.readPixelsRaw( data, 0, 0, data.width, data.height );
				if( data.gl.getError() !== data.gl.NO_ERROR ) {
					throw new Error( "WebGL error after readback" );
				}
				return pixels;
			};
			window.checkSolid = ( pixels, rgba ) => {
				for( let i = 0; i < pixels.length; i++ ) {
					if( pixels[ i ] !== rgba[ i % 4 ] ) {
						throw new Error( `Unexpected channel ${i}: ${pixels[ i ]}` );
					}
				}
			};
			window.track = screen => {
				const data = inspect( screen );
				const gl = data.gl;
				const drawArrays = gl.drawArrays.bind( gl );
				const stats = { "pointDraws": 0, "points": 0, "maxPoints": 0 };
				gl.drawArrays = ( mode, start, count ) => {
					for( const batch of Object.values( data.batches ) ) {
						if( batch.type === batchTest.renderer.SHADER_BATCH ) { continue; }
						if( batch.count > batch.capacity || batch.capacity > batch.maxCapacity ) {
							throw new Error( "Batch exceeded capacity" );
						}
					}
					if( mode === gl.POINTS ) {
						stats.pointDraws++;
						stats.points += count;
						stats.maxPoints = Math.max( stats.maxPoints, count );
					}
					drawArrays( mode, start, count );
				};
				return stats;
			};
			window.reduceLimits = screen => {
				const data = inspect( screen );
				for( const batch of Object.values( data.batches ) ) {
					if( batch.type === batchTest.renderer.SHADER_BATCH ) { continue; }
					batch.minCapacity = 8;
					batch.capacity = 8;
					batch.maxCapacity = 19;
					batch.vertices = new Float32Array( 8 * batch.vertexComps );
					batch.colors = new Uint8Array( 8 * batch.colorComps );
					if( batch.useTexture ) {
						batch.texCoords = new Float32Array( 8 * batch.texCoordComps );
					}
					batch.capacityChanged = true;
				}
			};
		} );
		const result = await page.evaluate( fn, arg );
		await page.evaluate( () => new Promise( resolve => setTimeout( resolve, 0 ) ) );
		assert.deepEqual( errors, [] );
		return result;
	} finally {
		await page.close();
	}
}

for( const bundle of [ "full", "lite" ] ) {
	test( `SYS-007 ${bundle}: Full HD paint fills every pixel within batch limits`, async t => {
		const result = await probe( bundle, () => {
			const screen = $.screen( "1920x1080" );
			const stats = track( screen );
			const start = performance.now();
			screen.paint( 0, 0, "red" );
			checkSolid( rawPixels( screen ), [ 255, 0, 0, 255 ] );
			return { ...stats, "ms": Math.round( performance.now() - start ) };
		} );
		assert.equal( result.points, 1920 * 1080 );
		assert.ok( result.pointDraws >= 2 );
		assert.ok( result.maxPoints <= 1920000 );
		t.diagnostic( `Full HD paint and complete readback: ${result.ms} ms` );
	} );

	test( `SYS-007 ${bundle}: Full HD put replaces opaque and transparent pixels`, async () => {
		const result = await probe( bundle, () => {
			const screen = $.screen( "1920x1080" );
			const stats = track( screen );
			screen.setPal( [ "#FF0000" ] );
			const rows = Array( 1080 ).fill( Array( 1920 ).fill( 1 ) );
			screen.put( rows, 0, 0 );
			checkSolid( rawPixels( screen ), [ 255, 0, 0, 255 ] );
			rows.fill( Array( 1920 ).fill( 0 ) );
			screen.put( rows, 0, 0 );
			checkSolid( rawPixels( screen ), [ 255, 0, 0, 255 ] );
			screen.put( rows, 0, 0, true );
			checkSolid( rawPixels( screen ), [ 0, 0, 0, 0 ] );
			return stats;
		} );
		assert.equal( result.points, 2 * 1920 * 1080 );
		assert.ok( result.pointDraws >= 4 );
		assert.ok( result.maxPoints <= 1920000 );
	} );

	test( `SYS-007 ${bundle}: oversized arc completes and drawing continues`, async () => {
		const result = await probe( bundle, () => {
			const screen = $.screen( "32x32" );
			const stats = track( screen );
			screen.arc( 0, 0, 500000, 0, 270 );
			screen.setColor( "red" );
			screen.pset( 1, 1 );
			rawPixels( screen );
			return { ...stats, "red": screen.getPixel( 1, 1 ).r };
		} );
		assert.equal( result.red, 255 );
		assert.ok( result.points > 1920000 );
		assert.ok( result.pointDraws >= 2 );
		assert.ok( result.maxPoints <= 1920000 );
	} );

	test( `SYS-007 ${bundle}: 10000 unique points survive buffer growth`, async () => {
		assert.equal( await probe( bundle, () => {
			const screen = $.screen( "100x100" );
			screen.setColor( "red" );
			for( let y = 0; y < 100; y++ ) {
				for( let x = 0; x < 100; x++ ) { screen.pset( x, y ); }
			}
			const capacity = inspect( screen ).batches[ 0 ].capacity;
			checkSolid( rawPixels( screen ), [ 255, 0, 0, 255 ] );
			return capacity;
		} ), 15000 );
	} );

	for( const mode of [ "exact", "tolerance", "boundary" ] ) {
		test( `SYS-007 ${bundle}: clipped ${mode} paint matches across forced flushes`, async () => {
			const result = await probe( bundle, mode => {
				const results = [];
				for( const reduced of [ false, true ] ) {
					const screen = $.screen( "48x32" );
					if( reduced ) { reduceLimits( screen ); }
					track( screen );
					screen.paint( 0, 0, "blue" );
					screen.pushView( 5, 4, 32, 24 );
					screen.setColor( "white" );
					screen.rect( 2, 2, 27, 19 );
					screen.setColor( "#0000FE" );
					screen.line( 4, 6, 25, 6 );
					let tolerance = 0;
					let boundary = null;
					if( mode === "tolerance" ) { tolerance = 0.01; }
					if( mode === "boundary" ) { boundary = "white"; }
					screen.setBlend( "alpha" );
					screen.paint( 4, 4, "#FF000080", tolerance, boundary );
					screen.resetView();
					const inside = screen.getPixel( 9, 8 );
					if( inside.r !== 128 || inside.b !== 127 || inside.a !== 255 ) {
						throw new Error( "Paint did not alpha-blend the seed pixel exactly once" );
					}
					const outside = screen.getPixel( 0, 0 );
					if( outside.r !== 0 || outside.b !== 255 ) {
						throw new Error( "Paint escaped the view" );
					}
					results.push( Array.from( rawPixels( screen ) ) );
					screen.removeScreen();
				}
				return results;
			}, mode );
			assert.deepEqual( result[ 1 ], result[ 0 ] );
		} );
	}

	test( `SYS-007 ${bundle}: mixed geometry, points, replacement and textures retain order`,
		async () => {
			const result = await probe( bundle, () => {
				const results = [];
				const textures = [ "#00FF0080", "#0000FF80" ].map( color => {
					const canvas = document.createElement( "canvas" );
					canvas.width = 12; canvas.height = 12;
					const ctx = canvas.getContext( "2d" );
					ctx.fillStyle = color; ctx.fillRect( 0, 0, 12, 12 );
					return canvas;
				} );
				for( const reduced of [ false, true ] ) {
					const screen = $.screen( "48x32" );
					if( reduced ) { reduceLimits( screen ); }
					track( screen );
					screen.setPal( [ "#FF0000" ] );
					screen.paint( 0, 0, "black" );
					screen.pushView( 3, 2, 40, 28 );
					for( let i = 0; i < 4; i++ ) {
						screen.setBlend( "alpha" );
						screen.setColor( "#FF000080" );
						screen.line( 0, i + 5, 39, i + 5 );
						screen.drawImage( textures[ i % 2 ], i + 5, 5 );
						screen.circle( 20, 14, 9, "#FFFF0080" );
						screen.ellipse( 20, 14, 15, 10, "#00FFFF80" );
						screen.put( [ Array( 40 ).fill( 1 ), Array( 40 ).fill( 0 ) ], 0, i, true );
						screen.bezier( 0, 0, 39, 3, 0, 24, 39, 27 );
						screen.setBlend( "replace" );
						screen.arc( 20, 14, 12, 0, 270 );
					}
					screen.resetView();
					results.push( Array.from( rawPixels( screen ) ) );
					screen.removeScreen();
				}
				return results;
			} );
			assert.deepEqual( result[ 1 ], result[ 0 ] );
		}
	);
}

if( process.env.PI_BATCH_VISUAL === "true" ) {
	for( const bundle of [ "full", "lite" ] ) {
		for( const fixture of [ "paint_01", "paint_02", "paint_03", "graphics_comprehensive",
			"renderer_comprehensive", "view_comprehensive" ] ) {
			test( `SYS-007 ${bundle}: existing visual fixture ${fixture}`, async t => {
				const html = await fs.readFile(
					path.join( root, "test/tests/html-core", fixture + ".html" ), "utf8"
				);
				const metadata = toml.parse(
					html.match( /\[\[TOML_START\]\]([\s\S]*?)\[\[TOML_END\]\]/ )[ 1 ]
				);
				if( bundle === "lite" && metadata.lite !== true ) {
					t.skip( "Fixture requires full-bundle plugins" );
					return;
				}
				const page = await browser.newPage( {
					"viewport": { "width": metadata.width, "height": metadata.height }
				} );
				const errors = [];
				page.on( "pageerror", error => errors.push( error.message ) );
				try {
					await page.route( "http://batch.test/**", async route => {
						const url = new URL( route.request().url() );
						if( url.pathname === "/build/pi.js" ) {
							await route.fulfill( { "contentType": "text/javascript",
								"body": bundles[ bundle ] } );
							return;
						}
						const file = path.resolve( root, "." + decodeURIComponent( url.pathname ) );
						assert.ok( file.startsWith( root + path.sep ) );
						await route.fulfill( { "path": file } );
					} );
					await page.goto( `http://batch.test/test/tests/html-core/${fixture}.html`, {
						"waitUntil": "networkidle"
					} );
					await page.evaluate( async () => {
						await $.ready();
						if( window.patchResult ) { await window.patchResult; }
					} );
					await page.waitForTimeout( Math.max( metadata.delay || 0, 200 ) );
					for( const line of ( metadata.commands || "" ).trim().split( "\n" ) ) {
						const command = line.trim().slice( 0, 2 );
						const value = line.trim().slice( 2 ).trim();
						if( command === "DL" ) {
							await page.waitForTimeout( Number( value ) );
						} else if( command === "SL" ) {
							await page.focus( JSON.parse( value ) );
						} else if( command === "MV" ) {
							const [ x, y ] = value.split( "," ).map( Number );
							await page.mouse.move( x, y );
						} else if( command === "MD" ) {
							await page.mouse.down();
						} else if( command === "MU" ) {
							await page.mouse.up();
						} else {
							assert.equal( command, "", "Unsupported fixture command" );
						}
					}
					await page.waitForTimeout( 100 );
					assert.deepEqual( errors, [] );
					const actualBuffer = await page.screenshot();
					const actual = PNG.sync.read( actualBuffer );
					const expected = PNG.sync.read( await fs.readFile(
						path.join( root, "test/tests/screenshots", fixture + ".png" )
					) );
					assert.equal( actual.width, expected.width );
					assert.equal( actual.height, expected.height );
					let different = 0;
					for( let i = 0; i < actual.data.length; i += 4 ) {

						// Match the existing visual runner's per-pixel channel tolerance.
						let difference = 0;
						for( let channel = 0; channel < 4; channel++ ) {
							difference += Math.abs( actual.data[ i + channel ] -
								expected.data[ i + channel ] );
						}
						if( difference > 6 ) {
							different++;
						}
					}
					if( different / ( actual.width * actual.height ) >= 0.001 ) {
						const output = path.join( root, "test/tests/screenshots/new",
							`${fixture}-sys007-${bundle}.png` );
						await fs.mkdir( path.dirname( output ), { "recursive": true } );
						await fs.writeFile( output, actualBuffer );
						assert.fail( `${different} pixels differ; inspect ${output}` );
					}
				} finally { await page.close(); }
			} );
		}
	}
}
