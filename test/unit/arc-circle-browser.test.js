/**
 * SYS-015/SYS-016 WebGL regressions using fresh in-memory full and lite bundles.
 * Set PI_RASTER_VISUAL=true to also compare existing fixtures with approved PNG baselines.
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
window.rasterTest = { manager, renderer };`, "resolveDir": path.join( root, "src" ) },
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
		await page.evaluate( () => {
			window.inspect = screen => rasterTest.manager.getScreenData( "test", screen.id );
			window.pixels = screen => {
				const data = inspect( screen );
				const result = rasterTest.renderer.readPixelsRaw(
					data, 0, 0, data.width, data.height
				);
				if( data.gl.getError() !== data.gl.NO_ERROR ) {
					throw new Error( "WebGL error after readback" );
				}
				return Array.from( result );
			};
			window.expectEqual = ( actual, expected ) => {
				if( actual.length !== expected.length ||
					actual.some( ( value, index ) => value !== expected[ index ] ) ) {
					throw new Error( "Pixel buffers differ" );
				}
			};
		} );
		const result = await page.evaluate( fn );
		assert.deepEqual( errors, [] );
		return result;
	} finally {
		await page.close();
	}
}

for( const bundle of [ "full", "lite" ] ) {
	test( `SYS-015 ${bundle}: full arcs match circles through public degree APIs`, async () => {
		const count = await probe( bundle, () => {
			const screen = $.screen( "48x48" );
			screen.setColor( "rgba(255,0,0,0.5)" );
			screen.setBlend( "alpha" );
			let checked = 0;
			for( const radius of [ 0, 1, 2, 3, 5, 10, 20 ] ) {
				screen.cls();
				screen.circle( 24, 24, radius );
				const expected = pixels( screen );
				for( const start of [ 0, 45, -90 ] ) {
					for( const sweep of [ -720, -450, -360, 360, 450, 720 ] ) {
						screen.cls();
						screen.arc( 24, 24, radius, start, start + sweep );
						expectEqual( pixels( screen ), expected );
						checked++;
					}
				}
				screen.cls();
				screen.arc( { "x": 24, "y": 24, "radius": radius,
					"angle1": 45, "angle2": 405 } );
				expectEqual( pixels( screen ), expected );
			}
			screen.cls();
			screen.arc( 24, 24, 10, 0, 360 );
			const covered = pixels( screen ).filter( ( value, i ) => i % 4 === 3 && value );
			if( covered.length !== 52 ) { throw new Error( "Full-turn outline is incomplete" ); }
			return checked;
		} );
		assert.equal( count, 126 );
	} );

	test( `SYS-015 ${bundle}: equal angles and wrapped partial arcs`, async () => {
		await probe( bundle, () => {
			const screen = $.screen( "32x32" );
			screen.setColor( "white" );
			for( const start of [ 0, 45, -360 ] ) {
				screen.arc( 16, 16, 10, start, start );
				if( pixels( screen ).some( value => value !== 0 ) ) {
					throw new Error( "Equal angles drew pixels" );
				}
			}
			screen.arc( 16, 16, 10, -45, 45 );
			const expected = pixels( screen );
			screen.cls();
			screen.arc( 16, 16, 10, 315, 45 );
			expectEqual( pixels( screen ), expected );
			screen.cls();
			screen.circle( 16, 16, 10 );
			const circle = pixels( screen );
			for( const end of [ 360 - 0.00005 * 180 / Math.PI, -0.00005 * 180 / Math.PI ] ) {
				screen.cls();
				screen.arc( 16, 16, 10, 0, end );
				expectEqual( pixels( screen ), circle );
			}
		} );
	} );

	test( `SYS-016 ${bundle}: translucent outlines contribute once per draw`, async () => {
		await probe( bundle, () => {
			const screen = $.screen( "48x48" );
			screen.setColor( "rgba(255,0,0,0.5)" );
			screen.setBlend( "alpha" );
			for( const radius of [ 1, 2, 3, 4, 5, 10, 20 ] ) {
				const drawFns = [
					() => screen.circle( 24, 24, radius ),
					() => screen.arc( 24, 24, radius, 0, 360 )
				];
				if( radius > 1 ) {
					drawFns.push( () => screen.arc( 24, 24, radius, 0, 270 ) );
				}
				for( const draw of drawFns ) {
					screen.cls();
					draw();
					const single = pixels( screen );
					const alphas = single.filter( ( value, i ) => i % 4 === 3 && value );
					if( alphas.length === 0 || alphas.some( value => value !== 128 ) ) {
						throw new Error( `Uneven single-draw alpha at radius ${radius}` );
					}
					draw();
					const double = pixels( screen );
					for( let i = 3; i < double.length; i += 4 ) {
						let expected = 0;
						if( single[ i ] ) { expected = 192; }
						if( double[ i ] !== expected ) {
							throw new Error( `Incorrect repeated-draw alpha at radius ${radius}` );
						}
					}
				}
			}
		} );
	} );

	test( `SYS-015/SYS-016 ${bundle}: translated clipping survives forced chunks`, async () => {
		const draws = await probe( bundle, () => {
			const screen = $.screen( "64x64" );
			screen.setColor( "rgba(255,0,0,0.5)" );
			screen.setBlend( "alpha" );
			const data = inspect( screen );
			const batch = data.batches[ rasterTest.renderer.POINTS_BATCH ];
			const gl = data.gl;
			const drawArrays = gl.drawArrays.bind( gl );
			let draws = 0;
			gl.drawArrays = ( mode, first, count ) => {
				if( mode === gl.POINTS ) {
					draws++;
					if( count > batch.maxCapacity || batch.count > batch.capacity ) {
						throw new Error( "Point batch exceeded capacity" );
					}
				}
				drawArrays( mode, first, count );
			};
			for( const shape of [ "circle", "full arc", "partial arc" ] ) {
				function draw( x, y ) {
					if( shape === "circle" ) { screen.circle( x, y, 14 ); }
					else if( shape === "full arc" ) { screen.arc( x, y, 14, 0, 360 ); }
					else { screen.arc( x, y, 14, 0, 270 ); }
				}
				screen.cls();
				draw( 22, 24 );
				const expected = pixels( screen );
				const unclippedCount = expected.filter( ( value, i ) => i % 4 === 3 && value ).length;

				// Raw WebGL rows start at the bottom; the view uses top-left coordinates.
				for( let y = 0; y < 64; y++ ) {
					for( let x = 0; x < 64; x++ ) {
						if( x < 10 || x >= 34 || y < 12 || y >= 36 ) {
							const index = ( ( 63 - y ) * 64 + x ) * 4;
							expected.fill( 0, index, index + 4 );
						}
					}
				}
				const alphas = expected.filter( ( value, i ) => i % 4 === 3 && value );
				if( alphas.length === 0 || alphas.length >= unclippedCount ||
					alphas.some( value => value !== 128 ) ) {
					throw new Error( "Clipping must retain a translucent portion of the outline" );
				}
				screen.cls();
				pixels( screen );
				batch.minCapacity = 8;
				batch.capacity = 8;
				batch.maxCapacity = 19;
				batch.vertices = new Float32Array( 8 * batch.vertexComps );
				batch.colors = new Uint8Array( 8 * batch.colorComps );
				batch.capacityChanged = true;
				screen.pushView( 10, 12, 24, 24 );
				draw( 12, 12 );
				screen.popView();
				expectEqual( pixels( screen ), expected );
			}
			return draws;
		} );
		assert.ok( draws > 4 );
	} );
}

if( process.env.PI_RASTER_VISUAL === "true" ) {
	for( const bundle of [ "full", "lite" ] ) {
		for( const fixture of [ "graphics_comprehensive", "renderer_comprehensive" ] ) {
			test( `SYS-015/SYS-016 ${bundle}: visual fixture ${fixture}`, async t => {
				const html = await fs.readFile(
					path.join( root, "test/tests/html-core", fixture + ".html" ), "utf8"
				);
				const metadata = toml.parse(
					html.match( /\[\[TOML_START\]\]([\s\S]*?)\[\[TOML_END\]\]/ )[ 1 ]
				);
				const page = await browser.newPage( {
					"viewport": { "width": metadata.width, "height": metadata.height }
				} );
				const errors = [];
				page.on( "pageerror", error => errors.push( error.message ) );
				try {
					await page.route( "http://raster.test/**", async route => {
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
					await page.goto( `http://raster.test/test/tests/html-core/${fixture}.html`, {
						"waitUntil": "networkidle"
					} );
					await page.evaluate( () => $.ready() );
					await page.waitForTimeout( Math.max( metadata.delay || 0, 200 ) );
					assert.deepEqual( errors, [] );
					const actualBuffer = await page.screenshot();
					const output = path.join( root, "test/tests/screenshots/new",
						`${fixture}-raster-${bundle}.png` );
					await fs.mkdir( path.dirname( output ), { "recursive": true } );
					await fs.writeFile( output, actualBuffer );
					const actual = PNG.sync.read( actualBuffer );
					const expected = PNG.sync.read( await fs.readFile(
						path.join( root, "test/tests/screenshots", fixture + ".png" )
					) );
					assert.equal( actual.width, expected.width );
					assert.equal( actual.height, expected.height );
					let different = 0;
					for( let i = 0; i < actual.data.length; i += 4 ) {
						let difference = 0;
						for( let channel = 0; channel < 4; channel++ ) {
							difference += Math.abs( actual.data[ i + channel ] -
								expected.data[ i + channel ] );
						}
						if( difference > 6 ) { different++; }
					}
					t.diagnostic( `${different} changed pixels; review ${output}` );
					assert.ok( different / ( actual.width * actual.height ) < 0.001,
						"Visual baseline differs; review the saved image before approving changes" );
				} finally {
					await page.close();
				}
			} );
		}
	}
}
