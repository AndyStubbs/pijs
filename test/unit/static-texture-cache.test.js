/**
 * Static texture lookup regressions against the production resolver and context-loss probe.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_vm from "node:vm";

function createHarness( hasImageConstructor = true ) {
	const calls = [];
	const state = new Map( [
		[ "ACTIVE_TEXTURE", "unit3" ], [ "TEXTURE_BINDING_2D", {} ],
		[ "READ_FRAMEBUFFER_BINDING", {} ], [ "DRAW_FRAMEBUFFER_BINDING", {} ],
		[ "UNPACK_PREMULTIPLY_ALPHA_WEBGL", false ], [ "SCISSOR_TEST", true ]
	] );
	const originalState = new Map( state );
	let lost = false;
	let uploadError = false;
	const methods = {
		"isContextLost": () => lost,
		"getParameter": key => state.get( key ),
		"isEnabled": key => state.get( key ),
		"activeTexture": value => state.set( "ACTIVE_TEXTURE", value ),
		"bindTexture": ( target, value ) => state.set( "TEXTURE_BINDING_2D", value ),
		"bindFramebuffer": ( target, value ) => state.set( target + "_BINDING", value ),
		"pixelStorei": ( key, value ) => state.set( key, value ),
		"enable": key => state.set( key, true ),
		"disable": key => state.set( key, false ),
		"createTexture": () => ( {} ),
		"deleteTexture": () => {},
		"texParameteri": () => {},
		"texImage2D": () => {
			if( uploadError ) {
				throw new Error( "upload failed" );
			}
		}
	};
	const gl = new Proxy( {}, {
		"get": ( target, key ) => {
			if( methods[ key ] ) {
				return ( ...args ) => {
					calls.push( key );
					return methods[ key ]( ...args );
				};
			}
			return key;
		}
	} );
	const screen = {
		"gl": gl, "imageContextMap": new Map(), "samplerContextMap": new Map(),
		"batchInfo": { "textureBatchSet": new Set() },
		"contextState": { "suspend": () => {
			calls.push( "suspend" );
			screen.imageContextMap.clear();
		} }
	};
	class ImageSource { width = 2; height = 2; }
	class CanvasSource { width = 2; height = 2; }
	class OffscreenSource { width = 2; height = 2; }
	class VideoSource { readyState = 2; videoWidth = 2; videoHeight = 2; }
	const screenCanvasMap = new Map();
	const globals = {
		"HTMLCanvasElement": CanvasSource, "OffscreenCanvas": OffscreenSource,
		"HTMLVideoElement": VideoSource,
		"g_screenManager": { "screenCanvasMap": screenCanvasMap },
		"g_batches": {
			"flushBatches": () => calls.push( "flushBatches" ),
			"displayToCanvas": () => calls.push( "displayToCanvas" )
		}
	};
	if( hasImageConstructor ) {
		globals.HTMLImageElement = ImageSource;
	}
	const context = g_vm.createContext( globals );
	for( const file of [ "context-state", "textures" ] ) {
		const source = g_fs.readFileSync(
			new URL( `../../src/renderer/${file}.js`, import.meta.url ), "utf8"
		).replace( /^import .*;\r?\n/gm, "" ).replace( /export /g, "" );
		g_vm.runInContext( source, context );
		if( file === "context-state" ) {
			context.g_contextState = {
				"isContextUnavailable": context.isContextUnavailable,
				"probeContextLoss": context.probeContextLoss
			};
		}
	}
	return {
		"screen": screen, "calls": calls, "textures": context,
		"image": new ImageSource(), "canvas": new CanvasSource(),
		"offscreen": new OffscreenSource(), "video": new VideoSource(),
		"screenCanvasMap": screenCanvasMap,
		"setLost": value => { lost = value; },
		"setUploadError": value => { uploadError = value; },
		"assertState": () => g_assert.deepEqual( state, originalState )
	};
}

g_test.test( "static hits only probe loss; cold uploads preserve GL state", () => {
	const h = createHarness();
	const texture = h.textures.getWebGL2Texture( h.screen, h.image );
	g_assert.equal( h.calls.filter( name => name === "texImage2D" ).length, 1 );
	h.assertState();
	h.calls.length = 0;
	g_assert.equal( h.textures.getWebGL2Texture( h.screen, h.image ), texture );
	g_assert.deepEqual( h.calls, [ "isContextLost" ] );
	h.assertState();
} );

g_test.test( "static lookup respects context keys, removal, and invalidation", () => {
	const h = createHarness();
	const otherContext = {};
	const otherTexture = {};
	h.screen.imageContextMap.set( h.image, new Map( [ [ otherContext, otherTexture ] ] ) );
	const first = h.textures.getWebGL2Texture( h.screen, h.image );
	g_assert.notEqual( first, otherTexture );
	h.screen.batchInfo.textureBatchSet.add( first );
	h.calls.length = 0;
	h.textures.deleteWebGL2Texture( h.screen, h.image );
	g_assert.deepEqual( h.calls, [ "flushBatches", "deleteTexture" ] );
	g_assert.equal( h.screen.imageContextMap.get( h.image ).get( otherContext ), otherTexture );
	const second = h.textures.getWebGL2Texture( h.screen, h.image );
	g_assert.notEqual( second, first );
	h.screen.imageContextMap.clear();
	g_assert.notEqual( h.textures.getWebGL2Texture( h.screen, h.image ), second );
	h.assertState();
} );

g_test.test( "warm lookup detects pending loss before returning a stale texture", () => {
	const h = createHarness();
	const first = h.textures.getWebGL2Texture( h.screen, h.image );
	h.calls.length = 0;
	h.setLost( true );
	g_assert.equal( h.textures.getWebGL2Texture( h.screen, h.image ), null );
	g_assert.deepEqual( h.calls, [ "isContextLost", "suspend" ] );
	h.calls.length = 0;
	g_assert.equal( h.textures.getWebGL2Texture( h.screen, h.image ), null );
	g_assert.deepEqual( h.calls, [] );
	h.setLost( false );
	h.screen.contextLost = false;
	g_assert.notEqual( h.textures.getWebGL2Texture( h.screen, h.image ), first );
	h.assertState();
} );

for( const kind of [ "canvas", "offscreen", "video", "mockImage", "screen" ] ) {
	g_test.test( `${kind} stays mutable and preserves queued pixels and GL state`, () => {
		const h = createHarness();
		let source = h[ kind ];
		if( kind === "mockImage" ) {
			source = h.image;
			source.isMock = true;
		} else if( kind === "screen" ) {
			source = h.canvas;
			h.screenCanvasMap.set( source, {} );
		}
		const texture = h.textures.getWebGL2Texture( h.screen, source );
		h.screen.batchInfo.textureBatchSet.add( texture );
		h.calls.length = 0;
		g_assert.equal( h.textures.getWebGL2Texture( h.screen, source ), texture );
		g_assert.ok( h.calls.includes( "flushBatches" ) );
		g_assert.ok( h.calls.indexOf( "flushBatches" ) < h.calls.indexOf( "texImage2D" ) );
		g_assert.equal( h.calls.filter( name => name === "texImage2D" ).length, 1 );
		if( kind === "screen" ) {
			g_assert.ok( h.calls.includes( "displayToCanvas" ) );
		}
		h.assertState();
		source.isDirty = false;
		h.calls.length = 0;
		h.textures.getWebGL2Texture( h.screen, source );
		g_assert.equal( h.calls.includes( "texImage2D" ), kind === "video" );
		g_assert.ok( h.calls.includes( "getParameter" ) );
		h.assertState();
	} );
}

g_test.test( "missing browser image constructor retains the resolver", () => {
	const h = createHarness( false );
	const texture = h.textures.getWebGL2Texture( h.screen, h.image );
	h.calls.length = 0;
	g_assert.equal( h.textures.getWebGL2Texture( h.screen, h.image ), texture );
	g_assert.ok( h.calls.includes( "getParameter" ) );
	h.assertState();
} );

g_test.test( "failed cold upload restores state and does not publish a cache entry", () => {
	const h = createHarness();
	h.setUploadError( true );
	g_assert.throws( () => h.textures.getWebGL2Texture( h.screen, h.image ), /upload failed/ );
	g_assert.equal( h.screen.imageContextMap.has( h.image ), false );
	g_assert.ok( h.calls.includes( "deleteTexture" ) );
	h.assertState();
	h.setUploadError( false );
	g_assert.ok( h.textures.getWebGL2Texture( h.screen, h.image ) );
} );
