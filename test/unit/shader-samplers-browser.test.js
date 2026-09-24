/**
 * Shader sampler regressions against fresh in-memory full and lite bundles: decoded video
 * frames, sampler cache invalidation and allocation failure, and queued dynamic content.
 * Run with node --test test/unit/shader-samplers-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./browser-source-harness.js";
const { test } = g_test;
const assert = g_assert;

const { probe } = g_harness.useBrowserBundles();

for( const bundle of g_harness.BUNDLES ) {
	test( `${bundle}: video drawing refreshes decoded frames`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const source = document.createElement( "canvas" );
			source.width = source.height = 8;
			const context = source.getContext( "2d" );
			const video = document.createElement( "video" );
			video.width = video.height = 8;
			video.muted = true;
			video.srcObject = source.captureStream( 0 );
			const track = video.srcObject.getVideoTracks()[ 0 ];
			async function frame( color ) {
				context.fillStyle = color; context.fillRect( 0, 0, 8, 8 );
				const decoded = new Promise( resolve => video.requestVideoFrameCallback( resolve ) );
				track.requestFrame();
				await decoded;
			}
			const playing = video.play();
			await frame( "red" );
			await playing;
			const screen = $.screen( "8x8" );
			const undecoded = document.createElement( "video" );
			undecoded.width = undecoded.height = 8;
			let notReady;
			try { screen.drawImage( undecoded, 0, 0 ); } catch( error ) { notReady = error.code; }
			if( notReady !== "IMAGE_NOT_READY" ) { throw new Error( "video readiness" ); }
			screen.drawImage( video, 0, 0 );
			screen.getPixel( 1, 1 );
			const shader = $.createShader( `#version 300 es
	precision mediump float;
	in vec2 v_texCoord;
	uniform sampler2D u_texture;
	uniform sampler2D u_map;
	out vec4 fragColor;
	void main() { fragColor = 0.5 * (texture(u_texture,v_texCoord) + texture(u_map,v_texCoord)); }` );
			screen.applyShader( shader, { "u_map": video } );
			if( screen.getPixel( 1, 1 ).r !== 255 ) { throw new Error( "first video sampler" ); }
			await frame( "lime" );
			screen.drawImage( video, 0, 0 );
			screen.applyShader( shader, { "u_map": video } );
			screen.setDisplayShader( shader, { "u_map": video } );
			await new Promise( resolve => requestAnimationFrame( resolve ) );
			const copy = document.createElement( "canvas" );
			copy.width = copy.height = 8;
			copy.getContext( "2d" ).drawImage( screen.canvas(), 0, 0, 8, 8 );
			if( copy.getContext( "2d" ).getImageData( 1, 1, 1, 1 ).data[ 1 ] !== 255 ) {
				throw new Error( "display video sampler" );
			}
			video.pause();
			Object.defineProperty( video, "readyState", { "value": 0, "configurable": true } );
			screen.drawImage( video, 0, 0 );
			screen.applyShader( shader, { "u_map": video } );
			const { r, g, b, a } = screen.getPixel( 1, 1 );
			delete video.readyState;
			video.width = video.height = 0;
			if( video.videoWidth !== 8 ) { throw new Error( "natural video dimensions" ); }
			const natural = $.screen( { "aspect": "8x8", "isOffscreen": true } );
			natural.drawImage( video, 0, 0 );
			if( natural.getPixel( 1, 1 ).a !== 0 ) {
				throw new Error( "Review unspecified-size video behavior before changing this contract" );
			}
			track.stop();
			return { "r": r, "g": g, "b": b, "a": a };
		} ), { "r": 0, "g": 255, "b": 0, "a": 255 } );
	} );

	test( `${bundle}: sampler caches invalidate and failed allocations do not leak`, async () => {
		assert.equal( await probe( bundle, () => {
			let getData, resize;
			$.registerPlugin( { "name": "inspect", "init": api => {
				getData = id => api.getScreenData( "test", id );
				resize = api.resizeOffscreenScreen;
			} } );
			const dest = $.screen( "8x8" );
			const source = $.screen( { "aspect": "8x8", "isOffscreen": true, "parent": dest } );
			const shader = $.createShader( `#version 300 es
	precision mediump float;
	in vec2 v_texCoord;
	uniform sampler2D u_texture;
	uniform sampler2D u_map;
	out vec4 fragColor;
	void main() { fragColor = 0.5 * (texture(u_texture,v_texCoord) + texture(u_map,v_texCoord)); }` );
			dest.applyShader( shader, { "u_map": source } ); dest.getPixel( 1, 1 );
			const data = getData( dest.id );
			const gl = data.gl;
			const entry = data.samplerContextMap.get( getData( source.id ).canvas ).get( gl );
			if( entry.texture === data.imageContextMap.get( getData( source.id ).canvas ).get( gl ) ) {
				throw new Error( "cache ownership" );
			}
			resize( getData( source.id ), 16, 8 );
			if( gl.isTexture( entry.texture ) || gl.isFramebuffer( entry.readFbo ) ) {
				throw new Error( "resize leak" );
			}
			dest.applyShader( shader, { "u_map": source } ); dest.getPixel( 1, 1 );
			const entry2 = data.samplerContextMap.get( getData( source.id ).canvas ).get( gl );
			source.removeScreen();
			if( gl.isTexture( entry2.texture ) || data.samplerContextMap.size ) {
				throw new Error( "source removal leak" );
			}
			const image = document.createElement( "canvas" ); image.width = image.height = 8;
			const name = $.loadImage( image, "cache-test" );
			dest.drawImage( image, 0, 0 ); dest.getPixel( 1, 1 );
			const create = gl.createFramebuffer.bind( gl );
			const destroy = gl.deleteFramebuffer.bind( gl );
			const pending = new Set();
			let count = 0;
			gl.createFramebuffer = () => {
				if( ++count === 2 ) { return null; }
				const fbo = create(); pending.add( fbo ); return fbo;
			};
			gl.deleteFramebuffer = fbo => { pending.delete( fbo ); destroy( fbo ); };
			let failed = false;
			try { dest.applyShader( shader, { "u_map": name } ); }
			catch( error ) { failed = error.code === "WEBGL2_ERROR"; }
			gl.createFramebuffer = create; gl.deleteFramebuffer = destroy;
			if( !failed || pending.size || data.samplerContextMap.size ) {
				throw new Error( "partial sampler allocation" );
			}
			dest.applyShader( shader, { "u_map": name } ); dest.getPixel( 1, 1 );
			const entry3 = data.samplerContextMap.get( image ).get( gl );
			dest.setDisplayShader( shader, { "u_map": name } );
			gl.bindFramebuffer( gl.READ_FRAMEBUFFER, data.FBO );
			gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, data.bufferFBO );
			gl.activeTexture( gl.TEXTURE3 );
			gl.bindTexture( gl.TEXTURE_2D, data.fboTexture );
			gl.enable( gl.SCISSOR_TEST );
			gl.scissor( 0, 0, 1, 1 );
			data.displayShaderTextureResolver( image );
			if( gl.getParameter( gl.READ_FRAMEBUFFER_BINDING ) !== data.FBO ||
				gl.getParameter( gl.DRAW_FRAMEBUFFER_BINDING ) !== data.bufferFBO ||
				gl.getParameter( gl.ACTIVE_TEXTURE ) !== gl.TEXTURE3 ||
				gl.getParameter( gl.TEXTURE_BINDING_2D ) !== data.fboTexture ||
				!gl.isEnabled( gl.SCISSOR_TEST )
			) { throw new Error( "copy state restoration" ); }
			gl.disable( gl.SCISSOR_TEST );
			dest.setDisplayShader( null );
			$.removeImage( name );
			return !gl.isTexture( entry3.texture ) && !gl.isFramebuffer( entry3.drawFbo ) &&
				data.samplerContextMap.size === 0;
		} ), true );
	} );

	test( `${bundle}: queued image and sampler draws retain earlier dynamic content`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			const source = document.createElement( "canvas" );
			source.width = source.height = 8;
			const ctx = source.getContext( "2d" );
			const fill = color => { ctx.fillStyle = color; ctx.fillRect( 0, 0, 8, 8 ); };
			const screen = $.screen( "16x8" );
			fill( "red" ); screen.drawImage( source, 0, 0 );
			fill( "blue" ); screen.drawImage( source, 8, 0 );
			const earlier = screen.getPixel( 1, 1 );
			const later = screen.getPixel( 9, 1 );
			const shader = $.createShader( `#version 300 es
	precision mediump float;
	in vec2 v_texCoord;
	uniform sampler2D u_texture;
	uniform sampler2D u_map;
	out vec4 fragColor;
	void main() { fragColor = 0.5 * (texture(u_texture,v_texCoord) + texture(u_map,v_texCoord)); }` );
			fill( "red" ); screen.drawImage( source, 0, 0 );
			screen.applyShader( shader, { "u_map": source } );
			fill( "blue" ); screen.applyShader( shader, { "u_map": source } );
			const mixed = screen.getPixel( 1, 1 );
			return [ earlier.r, earlier.b, later.r, later.b, mixed.r, mixed.b ];
		} ), [ 255, 0, 0, 255, 128, 128 ] );
	} );
}
