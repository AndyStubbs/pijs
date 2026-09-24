/**
 * SYS-006 browser regressions against fresh in-memory full and lite bundles.
 * Run with node --test test/unit/alpha-composition-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fsPromises from "node:fs/promises";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_harness from "./browser-source-harness.js";
const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const { test } = g_test;
const assert = g_assert;
const fs = g_fsPromises;
const path = g_path;

const root = path.join( DIRNAME, "../.." );
const { probe } = g_harness.useBrowserBundles( {
	"expose": "alphaInternals",
	"setup": () => {
		window.alphaTest = {
			"rgba": color => [ color.r, color.g, color.b, color.a ],
			"data": screen => alphaInternals.manager.getScreenData( "alpha test", screen.id ),
			"raw": screen => Array.from( alphaInternals.renderer.readPixelsRaw(
				alphaTest.data( screen ), 0, 0, 1, 1
			) ),
			"screen": ( color = [ 0, 0, 0, 0 ], parent = null ) => {
				const screen = $.screen( {
					"aspect": "2x2", "isOffscreen": true, "parent": parent
				} );
				screen.setColor( color );
				screen.rect( 0, 0, 2, 2, color );
				return screen;
			},
			"canvas": color => {
				const canvas = document.createElement( "canvas" );
				canvas.width = canvas.height = 2;
				const context = canvas.getContext( "2d" );
				const data = context.createImageData( 2, 2 );
				for( let i = 0; i < data.data.length; i += 4 ) {
					data.data.set( color, i );
				}
				context.putImageData( data, 0, 0 );
				return canvas;
			},
			"shader": ( body, declarations = "", uniforms = {} ) => $.createShader(
				`#version 300 es
				precision highp float;
				in vec2 v_texCoord;
				uniform sampler2D u_texture;
				out vec4 fragColor;
				${declarations}
				void main() {
					vec4 color = texture(u_texture, v_texCoord);
					${body}
				}`, uniforms
			)
		};
	}
} );

for( const bundle of g_harness.BUNDLES ) {
	test( `SYS-006 ${bundle}: nested layers preserve transparent and translucent composition`,
		async () => {
			const results = await probe( bundle, () => {
				const results = [];
				for( const alpha of [ 0, 1, 64, 128, 255 ] ) {
					for( const backgroundAlpha of [ 128, 255 ] ) {
						const { screen, canvas, raw } = alphaTest;
						const background = [ 17, 81, 139, backgroundAlpha ];
						const direct = screen( background );
						const dest = screen( background );
						const first = screen( undefined, dest );
						const second = screen();
						const image = canvas( [ 153, 89, 201, alpha ] );
						direct.drawImage( image, 0, 0 );
						first.drawImage( image, 0, 0 );
						second.drawImage( first, 0, 0 );
						dest.drawImage( second, 0, 0 );
						results.push( [ raw( direct ), raw( dest ) ] );
						for( const item of [ first, second, direct, dest ] ) {
							item.removeScreen();
						}
					}
				}
				return results;
			} );
			for( const [ direct, layered ] of results ) {
				assert.deepEqual( layered, direct );
			}
		}
	);

	test( `SYS-006 ${bundle}: readback, palette, capture, and filters use straight colors`,
		async () => {
			const result = await probe( bundle, async () => {
				const { screen, canvas, raw, rgba } = alphaTest;
				const layer = screen();
				layer.drawImage( canvas( [ 255, 0, 0, 128 ] ), 0, 0 );
				const stored = raw( layer );
				const reads = [ rgba( layer.getPixel( 0, 0 ) ),
					rgba( await layer.getPixelAsync( 0, 0 ) ),
					rgba( layer.get( 0, 0, 1, 1, 1, false )[ 0 ][ 0 ] ),
					rgba( ( await layer.getAsync( 0, 0, 1, 1, 1, false ) )[ 0 ][ 0 ] ) ];
				layer.setPalColors( [ 1 ], [ [ 255, 0, 0, 128 ] ] );
				const indices = [ layer.getPixel( 0, 0, true ),
					await layer.getPixelAsync( 0, 0, true ), layer.get( 0, 0, 1, 1 )[ 0 ][ 0 ],
					( await layer.getAsync( 0, 0, 1, 1 ) )[ 0 ][ 0 ] ];
				const capture = layer.createImageFromScreen();
				const dest = screen( [ 0, 0, 255, 255 ] );
				dest.drawImage( capture, 0, 0 );
				const captured = raw( dest );
				const callbacks = [];
				layer.filterImg( pixel => { callbacks.push( Array.from( pixel ) ); return true; } );
				await new Promise( resolve => queueMicrotask( resolve ) );
				const identity = raw( layer );
				layer.filterImg( pixel => { pixel[ 3 ] = 64; return true; } );
				await new Promise( resolve => queueMicrotask( resolve ) );
				const changed = raw( layer );
				layer.filterImg( () => false );
				await new Promise( resolve => queueMicrotask( resolve ) );
				return { stored, reads, indices, captured, callbacks, identity, changed,
					"cleared": raw( layer ) };
			} );
			assert.deepEqual( result.stored, [ 128, 0, 0, 128 ] );
			assert.deepEqual( result.reads, Array( 4 ).fill( [ 255, 0, 0, 128 ] ) );
			assert.deepEqual( result.indices, [ 1, 1, 1, 1 ] );
			assert.deepEqual( result.captured, [ 128, 0, 127, 255 ] );
			assert.deepEqual( result.callbacks, Array( 4 ).fill( [ 255, 0, 0, 128 ] ) );
			assert.deepEqual( result.identity, result.stored );
			assert.deepEqual( result.changed, [ 64, 0, 0, 64 ] );
			assert.deepEqual( result.cleared, [ 0, 0, 0, 0 ] );
		}
	);

	test( `SYS-006 ${bundle}: browser uploads and failed uploads restore unpack state`, async () => {
		const result = await probe( bundle, async () => {
			const { screen, raw, canvas, data } = alphaTest;
			const source = canvas( [ 255, 0, 0, 128 ] );
			const image = new Image();
			image.src = source.toDataURL();
			await image.decode();
			const offscreen = new OffscreenCanvas( 2, 2 );
			offscreen.getContext( "2d" ).drawImage( source, 0, 0 );
			const pixels = [];
			const states = [];
			for( const input of [ source, image, offscreen, screen( [ 255, 0, 0, 128 ] ) ] ) {
				const dest = screen( [ 0, 0, 255, 255 ] );
				const gl = data( dest ).gl;
				gl.pixelStorei( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true );
				dest.drawImage( input, 0, 0 );
				pixels.push( raw( dest ) );
				states.push( gl.getParameter( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL ) );
				dest.removeScreen();
			}
			const dest = screen();
			const gl = data( dest ).gl;
			gl.pixelStorei( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false );
			const upload = gl.texImage2D;
			gl.texImage2D = () => { throw new Error( "upload failed" ); };
			let failure;
			try {
				dest.drawImage( source, 0, 0 );
			} catch( error ) {
				failure = error.message;
			} finally {
				gl.texImage2D = upload;
			}
			return [ pixels, states, failure,
				gl.getParameter( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL ), gl.getError() ];
		} );
		assert.deepEqual( result, [ Array( 4 ).fill( [ 128, 0, 127, 255 ] ),
			[ true, true, true, true ], "upload failed", false, 0 ] );
	} );

	test( `SYS-006 ${bundle}: replace, source-over, tint, and alpha noise agree`, async () => {
		const result = await probe( bundle, () => {
			const { screen, raw, canvas } = alphaTest;
			const layer = screen( [ 255, 0, 0, 128 ] );
			const replaced = raw( layer );
			layer.setBlend( "alpha" );
			layer.setColor( [ 0, 0, 255, 128 ] );
			layer.pset( 0, 0 );
			const blended = raw( layer );
			const tinted = screen();
			tinted.drawImage( canvas( [ 255, 255, 255, 128 ] ), 0, 0, [ 255, 0, 0, 128 ] );
			const noise = screen();
			noise.setColor( [ 255, 0, 0, 64 ] );
			noise.setNoise( [ [ 0, 0, 0, 32 ], [ 0, 0, 0, 64 ] ], 1 );
			noise.pset( 0, 0 );
			return [ replaced, blended, raw( tinted ), raw( noise ) ];
		} );
		assert.deepEqual( result.slice( 0, 3 ), [ [ 128, 0, 0, 128 ], [ 64, 0, 128, 192 ],
			[ 64, 0, 0, 64 ] ] );
		const noise = result[ 3 ];
		assert.ok( noise[ 3 ] >= 96 && noise[ 3 ] <= 128 );
		assert.deepEqual( noise, [ noise[ 3 ], 0, 0, noise[ 3 ] ] );
	} );

	test( `SYS-006 ${bundle}: custom shader passes and sampler sources stay premultiplied`,
		async () => {
			const result = await probe( bundle, () => {
				const { screen, raw, canvas, shader } = alphaTest;
				const identity = shader( "fragColor = color;" );
				const opacity = shader( "fragColor = color * 0.5;" );
				const invert = shader( "fragColor = vec4(color.a - color.rgb, color.a);" );
				const layer = screen( [ 255, 0, 0, 128 ] );
				layer.applyShader( identity );
				const unchanged = raw( layer );
				layer.applyShader( opacity );
				const faded = raw( layer );
				layer.applyShader( invert );
				const inverted = raw( layer );
				const dest = screen();
				const shared = screen( [ 255, 0, 0, 128 ], dest );
				const separate = screen( [ 255, 0, 0, 128 ] );
				const image = canvas( [ 255, 0, 0, 128 ] );
				const sampler = shader( "fragColor = color * 0.0 + texture(u_map, v_texCoord);",
					"uniform sampler2D u_map;" );
				const sources = [];
				for( const source of [ image, shared, separate ] ) {
					dest.applyShader( sampler, { "u_map": source } );
					sources.push( raw( dest ) );
				}
				return [ unchanged, faded, inverted, sources ];
			} );
			assert.deepEqual( result, [ [ 128, 0, 0, 128 ], [ 64, 0, 0, 64 ],
				[ 0, 64, 64, 64 ], Array( 3 ).fill( [ 128, 0, 0, 128 ] ) ] );
		}
	);

	test( `SYS-006 ${bundle}: display shaders and canvas compositing preserve alpha`, async () => {
		const result = await probe( bundle, () => {
			const { data, raw, shader } = alphaTest;
			const screen = $.screen( "2x2" );
			screen.setColor( [ 255, 0, 0, 128 ] );
			screen.rect( 0, 0, 2, 2, [ 255, 0, 0, 128 ] );
			const draw = () => {
				alphaInternals.renderer.flushBatches( data( screen ) );
				alphaInternals.renderer.displayToCanvas( data( screen ) );
				const canvas = document.createElement( "canvas" );
				canvas.width = canvas.height = 2;
				const context = canvas.getContext( "2d" );
				context.fillStyle = "#0000ff";
				context.fillRect( 0, 0, 2, 2 );
				context.drawImage( screen.canvas(), 0, 0, 2, 2 );
				return Array.from( context.getImageData( 0, 0, 1, 1 ).data );
			};
			const standard = draw();
			screen.setDisplayShader( shader( "fragColor = color;" ) );
			const identity = draw();
			screen.setDisplayShader( shader( "fragColor = color * 0.5;" ) );
			const faded = draw();
			const sampler = shader( "fragColor = color * 0.0 + texture(u_map, v_texCoord);",
				"uniform sampler2D u_map;" );
			const red = [ 255, 0, 0, 128 ];
			const sampled = [];
			for( const source of [ alphaTest.canvas( red ), alphaTest.screen( red, screen ),
				alphaTest.screen( red ) ] ) {
				screen.setDisplayShader( sampler, { "u_map": source } );
				sampled.push( draw() );
			}
			screen.setDisplayShader( null );
			return [ standard, identity, faded, raw( screen ),
				data( screen ).gl.getContextAttributes().premultipliedAlpha, sampled ];
		} );
		assert.deepEqual( result, [ [ 128, 0, 127, 255 ], [ 128, 0, 127, 255 ],
			[ 64, 0, 191, 255 ], [ 128, 0, 0, 128 ], true,
			Array( 3 ).fill( [ 128, 0, 127, 255 ] ) ] );
	} );

	test( `SYS-006 ${bundle}: glyph uploads and unpack state survive conversions`, async () => {
		const result = await probe( bundle, async () => {
			const { data, raw, canvas } = alphaTest;
			const screen = $.screen( "16x16" );
			screen.setFont( 1 );
			screen.setChar( "A", Array.from( { "length": 8 }, () => Array( 6 ).fill( 1 ) ) );
			screen.setColor( [ 255, 0, 0, 128 ] );
			screen.print( "A", true );
			const glyphBytes = alphaInternals.renderer.readPixelsRaw( data( screen ), 0, 0, 16, 16 );
			let glyph = [];
			for( let i = 0; i < glyphBytes.length; i += 4 ) {
				if( glyphBytes[ i + 3 ] !== 0 ) {
					glyph = Array.from( glyphBytes.slice( i, i + 4 ) );
					break;
				}
			}
			const gl = data( screen ).gl;
			gl.pixelStorei( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true );
			screen.filterImg( pixel => { pixel.set( [ 255, 0, 0, 64 ] ); return true; } );
			await new Promise( resolve => queueMicrotask( resolve ) );
			const filtered = raw( screen );
			const afterFilter = gl.getParameter( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL );
			gl.pixelStorei( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false );
			screen.drawImage( canvas( [ 255, 0, 0, 128 ] ), 0, 0 );
			const afterImage = gl.getParameter( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL );
			return [ glyph, filtered, afterFilter, afterImage, gl.getError() ];
		} );
		assert.deepEqual( result, [ [ 128, 0, 0, 128 ], [ 64, 0, 0, 64 ], true, false, 0 ] );
	} );
}

test( "SYS-006 maintained shader demos compile and return premultiplied pixels", async () => {
	const sources = [];
	for( let number = 1; number <= 7; number += 1 ) {
		const html = await fs.readFile(
			path.join( root, `test/demos/shader_demo_0${number}.html` ), "utf8"
		);
		for( const match of html.matchAll(
			/<script[^>]*id="([^"]+)"[^>]*type="x-shader\/x-fragment"[^>]*>([\s\S]*?)<\/script>/g
		) ) {
			sources.push( { "name": `${number}/${match[ 1 ]}`, "source": match[ 2 ].trim() } );
		}
	}
	assert.ok( sources.length >= 30 );
	await probe( "full", sources => {
		const screen = alphaTest.screen();
		for( const { name, source } of sources ) {
			const shader = $.createShader( source );
			for( const alpha of [ 0, 64, 128, 255 ] ) {
				screen.setColor( [ 255, 128, 64, alpha ] );
				screen.rect( 0, 0, 2, 2, [ 255, 128, 64, alpha ] );
				screen.applyShader( shader );
				const pixel = alphaTest.raw( screen );
				if( pixel.slice( 0, 3 ).some( value => value > pixel[ 3 ] ) ) {
					throw new Error( `${name}: invalid premultiplied output ${pixel}` );
				}
			}
			$.removeShader( shader );
		}
	}, sources );
} );
