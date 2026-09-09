/**
 * SYS-008 context-generation regressions against fresh in-memory full and lite bundles.
 * Run with node --test test/unit/context-recovery-browser.test.js.
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
			"stdin": { "contents": `import "./${entry}";
import * as manager from "./core/screen-manager.js";
import * as renderer from "./renderer/renderer.js";
window.recoveryTest = { manager, renderer };`,
				"resolveDir": path.join( __dirname, "../../src" ) },
			"bundle": true, "write": false, "format": "iife", "target": "es2020",
			"define": { "__VERSION__": JSON.stringify( require( "../../package.json" ).version ) },
			"loader": { ".vert": "text", ".frag": "text" },
			"plugins": [ {
				"name": "test-font-data",
				"setup": build => {
					build.onLoad( { "filter": /\.webp$/ }, async args => {
						const data = await fs.readFile( args.path );
						return { "contents": "export default " + JSON.stringify( {
							"data": "data:image/webp;base64," + data.toString( "base64" )
						} ), "loader": "js" };
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
	page.on( "console", message => {
		if( message.text().includes( "INVALID_OPERATION" ) ) {
			errors.push( message.text() );
		}
	} );
	try {
		await page.setContent( "<!doctype html><html><body></body></html>" );
		await page.addScriptTag( { "content": bundles[ bundle ] } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( () => {
			window.inspect = screen => recoveryTest.manager.getScreenData( "test", screen.id );
			window.pixel = ( screen, x = 0, y = 0 ) => {
				const color = screen.getPixel( x, y );
				return [ color.r, color.g, color.b, color.a ];
			};
			window.contextEvent = ( gl, name ) => new Promise( ( resolve, reject ) => {
				const timer = setTimeout( () => reject( new Error( name + " timeout" ) ), 10000 );
				gl.canvas.addEventListener( name, () => {
					clearTimeout( timer );
					resolve();
				}, { "once": true } );
			} );
			window.lose = async gl => {
				const extension = gl.getExtension( "WEBGL_lose_context" );
				if( !extension ) { throw new Error( "WEBGL_lose_context unavailable" ); }
				const lost = contextEvent( gl, "webglcontextlost" );
				extension.loseContext();
				await lost;
				// Finish loss-event dispatch before requesting restoration.
				await new Promise( resolve => setTimeout( resolve, 50 ) );
				return async () => {
					const restored = contextEvent( gl, "webglcontextrestored" );
					extension.restoreContext();
					await restored;
				};
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
	test( `SYS-008 ${bundle}: GPU boundaries detect loss before its event`, async () => {
		assert.equal( await probe( bundle, async () => {
			for( const operation of [ "pixel", "region", "clear", "shader", "resize", "image",
				"sampler" ] ) {
				const screen = $.screen( "4x4" );
				const data = inspect( screen ); const gl = data.gl;
				const image = document.createElement( "canvas" ); image.width = 2; image.height = 2;
				const shader = $.createShader( `#version 300 es
precision highp float;
uniform sampler2D u_texture;
in vec2 v_texCoord;
out vec4 fragColor;
void main(){fragColor=texture(u_texture,v_texCoord);}` );
				const operations = {
					"pixel": () => screen.getPixel( 0, 0 ),
					"region": () => screen.get( 0, 0, 2, 2 ),
					"clear": () => screen.cls(),
					"shader": () => screen.setDisplayShader( shader ),
					"resize": () => recoveryTest.renderer.resizeScreen( data, 4, 4 ),
					"image": () => screen.drawImage( image, 0, 0 ),
					"sampler": () => recoveryTest.renderer.getSamplerTexture( data, image )
				};
				const extension = gl.getExtension( "WEBGL_lose_context" );
				if( !extension ) { throw new Error( "WEBGL_lose_context unavailable" ); }
				const lost = contextEvent( gl, "webglcontextlost" );
				extension.loseContext();
				operations[ operation ]();
				if( !data.contextLost ) { throw new Error( operation + " missed pending loss" ); }
				await lost; await new Promise( resolve => setTimeout( resolve, 50 ) );
				const restored = contextEvent( gl, "webglcontextrestored" );
				extension.restoreContext(); await restored;
				screen.setColor( "blue" ); screen.pset( 0, 0 );
				if( pixel( screen )[ 2 ] !== 255 || gl.getError() !== 0 ) {
					throw new Error( operation + " failed after restoration" );
				}
				screen.removeScreen(); $.removeShader( shader );
			}
			return true;
		} ), true );
	} );

	test( `SYS-008 ${bundle}: pixel batching performs no WebGL loss queries`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			const screen = $.screen( "64x64" );
			const data = inspect( screen );
			pixel( screen );
			const nativeCheck = data.gl.isContextLost.bind( data.gl );
			let checks = 0;
			data.gl.isContextLost = () => { checks++; return nativeCheck(); };
			for( let i = 0; i < 1000; i++ ) { screen.pset( i % 64, 0 ); }
			const queuedChecks = checks;
			recoveryTest.renderer.flushBatches( data );
			const flushChecks = checks - queuedChecks;
			recoveryTest.renderer.displayToCanvas( data );
			return [ queuedChecks, flushChecks, checks, data.gl.getError() ];
		} ), [ 0, 1, 2, 0 ] );
	} );

	for( const operation of [ "pixel", "line", "put", "rectangle", "geometry", "ellipse",
		"image", "sprite" ] ) {
		test( `SYS-008 ${bundle}: ${operation} stops when its forced flush detects loss`, async () => {
			assert.deepEqual( await probe( bundle, async operation => {
				const screen = $.screen( "32x32" );
				const data = inspect( screen ); const gl = data.gl;
				const image = document.createElement( "canvas" ); image.width = 2; image.height = 2;
				const renderer = recoveryTest.renderer;
				const operations = {
					"pixel": [ renderer.POINTS_BATCH, () => screen.pset( 0, 0 ) ],
					"line": [ renderer.POINTS_BATCH, () => screen.line( 0, 0, 20, 20 ) ],
					"put": [ renderer.POINTS_REPLACE_BATCH, () => screen.put( [ [ 4 ] ], 0, 0 ) ],
					"rectangle": [ renderer.GEOMETRY_BATCH,
						() => renderer.drawRectFilled( data, 0, 0, 8, 8, data.color ) ],
					"geometry": [ renderer.GEOMETRY_BATCH,
						() => renderer.drawCachedGeometry( data, 0, 8, 8, 8, data.color ) ],
					"ellipse": [ renderer.GEOMETRY_BATCH,
						() => renderer.drawEllipse( data, 8, 8, 6, 4, data.color ) ],
					"image": [ renderer.IMAGE_BATCH, () => screen.drawImage( image, 0, 0 ) ],
					"sprite": [ renderer.IMAGE_BATCH,
						() => renderer.drawSprite( data, image, 0, 0, 2, 2, 0, 0, 2, 2, data.color ) ]
				};
				const [ type, draw ] = operations[ operation ];
				const batch = data.batches[ type ];
				batch.capacity = 6; batch.maxCapacity = 6; batch.minCapacity = 6;
				renderer.prepareBatch( data, type, 6 ); batch.count = 6;
				const extension = gl.getExtension( "WEBGL_lose_context" );
				if( !extension ) { throw new Error( "WEBGL_lose_context unavailable" ); }
				const lost = contextEvent( gl, "webglcontextlost" );
				const nativeCheck = gl.isContextLost.bind( gl );
				let probesBeforeLoss = 0;
				if( operation === "image" || operation === "sprite" ) { probesBeforeLoss = 1; }
				gl.isContextLost = () => {
					if( probesBeforeLoss-- === 0 ) { extension.loseContext(); }
					return nativeCheck();
				};
				draw(); gl.isContextLost = nativeCheck;
				const stopped = data.contextLost && data.batchInfo.drawOrder.length === 0;
				const count = batch.count;
				await lost; await new Promise( resolve => setTimeout( resolve, 50 ) );
				const restored = contextEvent( gl, "webglcontextrestored" );
				extension.restoreContext(); await restored;
				const blank = pixel( screen );
				screen.setColor( "blue" ); screen.pset( 0, 0 );
				return [ stopped, count, blank, pixel( screen ), gl.getError() ];
			}, operation ), [ true, 6, [ 0, 0, 0, 0 ], [ 0, 0, 255, 255 ], 0 ] );
		} );
	}

	test( `SYS-008 ${bundle}: geometry, text, and blend modes match after recovery`, async () => {
		assert.equal( await probe( bundle, async () => {
			const screen = $.screen( "32x32" );
			const data = inspect( screen );
			const scene = () => {
				screen.cls(); screen.setBlend( "replace" );
				screen.setColor( "red" ); screen.line( 0, 0, 10, 10 );
				screen.circle( 8, 8, 4, "blue" );
				screen.setBlend( "alpha" );
				screen.rect( 4, 4, 8, 8, [ 0, 255, 0, 128 ] );
				screen.setColor( "white" ); screen.setPos( 0, 2 ); screen.print( "A", true );
				screen.put( [ [ 4, 0 ] ], 20, 20, true );
				const pixels = recoveryTest.renderer.readPixelsRaw( data, 0, 0, 32, 32 );
				if( data.gl.getError() !== 0 ) { throw new Error( "WebGL scene error" ); }
				return Array.from( pixels );
			};
			const before = scene();
			const restore = await lose( data.gl ); await restore();
			const after = scene();
			return before.some( channel => channel !== 0 ) &&
				before.every( ( channel, i ) => channel === after[ i ] );
		} ), true );
	} );

	test( `SYS-008 ${bundle}: sampler copies recover and removed sources clear display shaders`,
		async () => {
			assert.deepEqual( await probe( bundle, async () => {
				const parent = $.screen( { "aspect": "4x4", "noCss": true } );
				const child = $.screen( { "aspect": "4x4", "isOffscreen": true, "parent": parent } );
				const independent = $.screen( "4x4" );
				const data = inspect( parent ); const childData = inspect( child );
				child.setColor( "red" ); child.rect( 0, 0, 4, 4, "red" );
				childData.canvas.isDirty = false;
				independent.drawImage( child, 0, 0 ); pixel( independent );
				const shader = $.createShader( `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform sampler2D u_map;
in vec2 v_texCoord;
out vec4 fragColor;
void main(){fragColor=texture(u_texture,v_texCoord)+texture(u_map,v_texCoord);}` );
				parent.setDisplayShader( shader, { "u_map": child } );
				const oldCopy = data.textureCopyFBO;
				const restore = await lose( data.gl ); await restore();
				const invalidated = !inspect( independent ).imageContextMap.has( childData.canvas );
				child.setColor( "blue" );
				child.rect( 0, 0, 4, 4, "blue" );
				independent.cls(); independent.drawImage( child, 0, 0 );
				childData.canvas.isDirty = true;
				recoveryTest.renderer.displayToCanvas( data );
				const displayed = new Uint8Array( 4 );
				data.gl.readPixels( 0, 0, 1, 1, data.gl.RGBA, data.gl.UNSIGNED_BYTE, displayed );
				const result = [ pixel( independent ), Array.from( displayed ),
					invalidated && !!data.textureCopyFBO && data.textureCopyFBO !== oldCopy ];
				const restoreAgain = await lose( data.gl ); child.removeScreen();
				await restoreAgain();
				result.push( data.displayShaderHandle === null, data.contextLost, data.gl.getError() );
				return result;
			} ), [ [ 0, 0, 255, 255 ], [ 0, 0, 255, 255 ], true, true, false, 0 ] );
		} );

	test( `SYS-008 ${bundle}: shared members recover together across repeated losses`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const parent = $.screen( "8x8" );
			const child = $.screen( { "aspect": "4x4", "isOffscreen": true, "parent": parent } );
			const nested = $.screen( { "aspect": "2x2", "isOffscreen": true, "parent": child } );
			const independent = $.screen( "4x4" );
			independent.setColor( "red" ); independent.pset( 0, 0 ); pixel( independent );
			const independentFbo = inspect( independent ).FBO;
			const gl = inspect( parent ).gl;
			const results = [];
			for( let cycle = 0; cycle < 2; cycle++ ) {
				const previous = [ parent, child, nested ].map( screen => inspect( screen ).FBO );
				const restore = await lose( gl );
				results.push( [ parent, child, nested ].every( screen => inspect( screen ).contextLost ) );
				await restore();
				results.push( [ parent, child, nested ].every( ( screen, i ) => {
					const data = inspect( screen );
					return !data.contextLost && data.FBO !== previous[ i ] && gl.isFramebuffer( data.FBO );
				} ) );
				nested.setColor( "blue" ); nested.pset( 0, 0 );
				child.drawImage( nested, 0, 0 ); parent.drawImage( child, 0, 0 );
				results.push( pixel( parent ), gl.getError() );
			}
			return [ results, pixel( independent ), inspect( independent ).FBO === independentFbo ];
		} ), [ [ true, true, [ 0, 0, 255, 255 ], 0, true, true, [ 0, 0, 255, 255 ], 0 ],
			[ 255, 0, 0, 255 ], true ] );
	} );

	test( `SYS-008 ${bundle}: joining, resizing and removing members while lost`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const parent = $.screen( "4x4" );
			const child = $.screen( { "aspect": "4x4", "isOffscreen": true, "parent": parent } );
			const gl = inspect( parent ).gl;
			const state = inspect( parent ).contextState;
			const restore = await lose( gl );
			const joined = $.screen( { "aspect": "2x2", "isOffscreen": true, "parent": child } );
			const deferred = inspect( joined ).FBO === null;
			recoveryTest.manager.resizeOffscreenScreen( inspect( child ), 6, 3 );
			parent.removeScreen();
			await restore();
			child.setColor( "blue" ); child.pset( 5, 2 );
			joined.drawImage( child, -5, -2 );
			const result = [ deferred, state.screens.size, pixel( joined ), gl.getError() ];
			child.removeScreen(); joined.removeScreen();
			result.push( state.screens.size );
			return result;
		} ), [ true, 2, [ 0, 0, 255, 255 ], 0, 0 ] );
	} );

	test( `SYS-008 ${bundle}: standalone offscreen screens share recovery`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const a = $.screen( { "aspect": "4x4", "isOffscreen": true } );
			const b = $.screen( { "aspect": "2x2", "isOffscreen": true } );
			const gl = inspect( a ).gl;
			const restore = await lose( gl );
			a.removeScreen();
			await restore();
			b.setColor( "blue" ); b.pset( 0, 0 );
			return [ pixel( b ), inspect( b ).contextLost, gl.getError() ];
		} ), [ [ 0, 0, 255, 255 ], false, 0 ] );
	} );

	test( `SYS-008 ${bundle}: discards suspended work and returns transparent reads`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const screen = $.screen( "16x16" );
			const data = inspect( screen );
			const gl = data.gl;
			screen.setColor( "red" ); screen.pset( 0, 0 );
			const read = screen.getPixelAsync( 0, 0 );
			let filtered = 0;
			screen.filterImg( () => { filtered++; return true; } );
			const restore = await lose( gl );
			const early = await read;
			const image = document.createElement( "canvas" ); image.width = 2; image.height = 2;
			const shader = $.createShader( "#version 300 es\nprecision highp float;" +
				"out vec4 fragColor;void main(){fragColor=vec4(1.0);}" );
			for( let i = 0; i < 10000; i++ ) {
				screen.pset( 1, 1 ); screen.drawImage( image, 0, 0 );
			}
			screen.circle( 4, 4, 2 ); screen.rect( 0, 0, 3, 3, "red" );
			screen.put( [ [ 4 ] ], 0, 0 ); screen.cls(); screen.print( "A", true );
			screen.applyShader( shader );
			screen.filterImg( () => { filtered++; return true; } );
			const reads = await Promise.all( [ screen.getPixelAsync( 0, 0 ),
				screen.getAsync( 0, 0, 2, 2, 1, false ) ] );
			const queued = data.batchInfo.drawOrder.length;
			screen.setColor( "blue" ); screen.setBlend( "replace" );
			screen.pushView( 2, 2, 4, 4 );
			await restore();
			const blank = pixel( screen ); screen.pset( 0, 0 );
			const blue = pixel( screen ); screen.resetView();
			return [ early.a, reads[ 0 ].a, reads[ 1 ].map( row => row.map( p => p.a ) ),
				filtered, queued, blank, blue, pixel( screen ), gl.getError() ];
		} ), [ 0, 0, [ [ 0, 0 ], [ 0, 0 ] ], 0, 0, [ 0, 0, 0, 0 ],
			[ 0, 0, 255, 255 ], [ 0, 0, 0, 0 ], 0 ] );
	} );

	test( `SYS-008 ${bundle}: reuploads assets and rebuilds persistent uniform bindings`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const screen = $.screen( { "aspect": "32x32", "noCss": true } );
			const data = inspect( screen ); const gl = data.gl;
			const source = document.createElement( "canvas" ); source.width = 2; source.height = 2;
			source.getContext( "2d" ).fillStyle = "red";
			source.getContext( "2d" ).fillRect( 0, 0, 2, 2 );
			const image = new Image(); image.src = source.toDataURL(); await image.decode();
			const shader = $.createShader( `#version 300 es
precision highp float;
uniform sampler2D u_texture;
uniform sampler2D u_map;
uniform float u_mix;
in vec2 v_texCoord;
out vec4 fragColor;
void main(){fragColor=mix(texture(u_texture,v_texCoord),texture(u_map,v_texCoord),u_mix);}`,
				{ "u_mix": 0.5, "u_map": image } );
			screen.drawImage( image, 0, 0 ); screen.print( "A", true );
			screen.applyShader( shader ); pixel( screen );
			screen.setDisplayShader( shader );
			const oldProgram = data.customShaders[ shader ].program;
			const restore = await lose( gl );
			screen.setDisplayShaderUniforms( { "u_mix": 0.25 } );
			await restore();
			screen.setColor( "blue" ); screen.cls();
			screen.drawImage( image, 0, 0 );
			const red = pixel( screen );
			screen.setPos( 0, 1 ); screen.print( "A", true );
			const hasFont = data.imageContextMap.has( data.font.image );
			screen.setColor( "blue" ); screen.cls();
			screen.rect( 0, 0, 32, 32, "blue" );
			screen.applyShader( shader );
			const mixed = pixel( screen );
			recoveryTest.renderer.displayToCanvas( data );
			const displayed = new Uint8Array( 4 );
			gl.readPixels( 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, displayed );
			return [ red, hasFont, mixed, Array.from( displayed ),
				oldProgram !== data.customShaders[ shader ].program, gl.getError() ];
		} ), [ [ 255, 0, 0, 255 ], true, [ 128, 0, 128, 255 ], [ 160, 0, 96, 255 ], true, 0 ] );
	} );

	for( const failure of [ [ "createFramebuffer", 3 ], [ "createTexture", 3 ],
		[ "createBuffer", 13 ], [ "createVertexArray", 6 ], [ "createProgram", 6 ],
		[ "createShader", 12 ] ] ) {
		test( `SYS-008 ${bundle}: recovery failure at ${failure[ 0 ]}`, async () => {
			assert.deepEqual( await probe( bundle, async failure => {
				const screen = $.screen( "4x4" );
				const child = $.screen( { "aspect": "4x4", "isOffscreen": true, "parent": screen } );
				const gl = inspect( screen ).gl;
				const restore = await lose( gl );
				const allocated = []; const originals = {}; let count = 0;
				for( const kind of [ "Framebuffer", "Texture", "Buffer", "VertexArray", "Program",
					"Shader" ] ) {
					const method = "create" + kind;
					const create = gl[ method ].bind( gl ); originals[ method ] = create;
					gl[ method ] = ( ...args ) => {
						if( method === failure[ 0 ] && ++count === failure[ 1 ] ) { return null; }
						const resource = create( ...args ); allocated.push( [ kind, resource ] );
						return resource;
					};
				}
				await restore(); Object.assign( gl, originals );
				screen.pset( 0, 0 ); child.pset( 0, 0 );
				const state = inspect( screen ).contextState;
				return [ state.status, state.error.code, inspect( child ).contextLost,
					allocated.every( ( [ kind, resource ] ) => !gl[ "is" + kind ]( resource ) ),
					pixel( screen ), gl.getError() ];
			}, failure ), [ "failed", "WEBGL_CONTEXT_RESTORE_FAILED", true, true, [ 0, 0, 0, 0 ], 0 ] );
		} );
	}
	test( `SYS-008 ${bundle}: restores framebuffer and presentation resources`, async () => {
		const result = await probe( bundle, async () => {
			const screen = $.screen( "4x4" );
			const data = inspect( screen );
			const gl = data.gl;
			screen.setColor( "red" );
			screen.pset( 0, 0 );
			const before = pixel( screen );
			const restore = await lose( gl );
			await restore();
			screen.setColor( "blue" );
			screen.pset( 0, 0 );
			const after = pixel( screen );
			recoveryTest.renderer.displayToCanvas( data );
			const displayed = new Uint8Array( 4 );
			gl.readPixels( 0, gl.canvas.height - 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, displayed );
			return [ before, after, Array.from( displayed ), gl.getError() ];
		} );
		assert.deepEqual( result, [ [ 255, 0, 0, 255 ], [ 0, 0, 255, 255 ],
			[ 0, 0, 255, 255 ], 0 ] );
	} );
}
