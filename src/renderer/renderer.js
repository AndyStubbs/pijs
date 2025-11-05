/**
 * Pi.js - Renderer Module
 * 
 * WebGL2 context creation, module orchestration, and public API exports.
 * Main orchestrator for all renderer modules.
 * 
 * @module renderer/renderer
 */

"use strict";

import * as g_screenManager from "../core/screen-manager.js";
import * as g_utils from "../core/utils.js";

// Import renderer modules
import * as g_fbo from "./fbo.js";
import * as g_shaders from "./shaders.js";
import * as g_batches from "./batches.js";

// Import shapes module for geometry drawing
import * as g_geometry from "./draw/geometry.js";
import * as g_textures from "./textures.js";
import * as g_readback from "./readback.js";


/***************************************************************************************************
 * Public API Exports
 ***************************************************************************************************/


// Re-export batch constants
export {
	POINTS_BATCH, IMAGE_BATCH, GEOMETRY_BATCH, POINTS_REPLACE_BATCH, LINES_BATCH
} from "./batches.js";

// Re-export drawing functions
export { drawImage } from "./draw/sprites.js";
export { drawPixel } from "./draw/primitives.js";
export { drawArc } from "./draw/arcs.js";
export { drawBezier } from "./draw/bezier.js";
export { drawLine } from "./draw/lines.js";
export { drawCachedGeometry } from "./draw/geometry.js";
export { drawRect, drawRectFilled } from "./draw/rects.js";
export { drawCircle, drawCircleFilled } from "./draw/circles.js";
export { drawEllipse } from "./draw/ellipses.js";

// Re-export batch management
export { prepareBatch } from "./batches.js";

// Re-export rendering functions
export { flushBatches } from "./batches.js";
export { displayToCanvas } from "./batches.js";

// Re-export texture management
export { getWebGL2Texture, deleteWebGL2Texture } from "./textures.js";

// Re-export readback functions
export { readPixel, readPixelAsync, readPixels, readPixelsAsync } from "./readback.js";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize all renderer modules
 * 
 * @param {Object} api - The main Pi.js API object
 * @returns {void}
 */
export function init( api ) {

	// Add screenData items
	g_screenManager.addScreenDataItem( "contextLost", false );
	g_screenManager.addScreenDataItem( "isRenderScheduled", false );
	g_screenManager.addScreenDataItem( "isFirstRender", true );
	g_screenManager.addScreenDataItem( "batches", {} );
	g_screenManager.addScreenDataItem( "batchInfo", {
		"currentBatch": null,
		"drawOrder": []
	} );
	g_screenManager.addScreenDataItem( "gl", null );

	// Register renderer cleanup function
	g_screenManager.addScreenCleanupFunction( cleanup );

	// Initialize renderer modules in order
	g_fbo.init();
	g_shaders.init();
	g_batches.init();
	g_textures.init();
	g_readback.init();
	g_geometry.init();
}

/**
 * Create WebGL2 context for screen
 * 
 * @param {Object} screenData - Screen data object
 * @returns {boolean} True if context created successfully
 */
export function createContext( screenData ) {

	const canvas = screenData.canvas;
	const width = screenData.width;
	const height = screenData.height;
	
	// Try WebGL2
	screenData.gl = canvas.getContext( "webgl2", { 
		"alpha": true, 
		"premultipliedAlpha": false,
		"antialias": false,
		"preserveDrawingBuffer": true,
		"desynchronized": false,
		"colorType": "unorm8"
	} );
	
	if( !screenData.gl ) {

		// WebGL2 not available
		return false;
	}

	// Setup viewport
	screenData.gl.viewport( 0, 0, width, height );
	
	// Create texture and FBO
	const fboAndTexture = g_fbo.createFBO( screenData );
	if( !fboAndTexture ) {
		screenData.gl = null;
		return false;
	}
	screenData.fboTexture = fboAndTexture.fboTexture;
	screenData.FBO = fboAndTexture.FBO;
	
	// Create a buffer texture and FBO
	const bufferFboAndTexture = g_fbo.createFBO( screenData );
	if( !bufferFboAndTexture ) {
		cleanup( screenData );
		return false;
	}
	screenData.bufferFboTexture = bufferFboAndTexture.fboTexture;
	screenData.bufferFBO = bufferFboAndTexture.FBO;

	// Create all the batches
	g_batches.createBatches( screenData );

	// Setup display shader
	g_shaders.setupDisplayShader( screenData );

	// Enable WebGL debugging extensions
	if( typeof window !== "undefined" && window.location.search.includes( "webgl-debug" ) ) {
		const debugExt = screenData.gl.getExtension( "WEBGL_debug_renderer_info" );
		if( debugExt ) {
			console.log( "GPU:", screenData.gl.getParameter( debugExt.UNMASKED_RENDERER_WEBGL ) );
		}
	}
	
	// Track if webglcontext gets lost
	screenData.canvas.addEventListener( "webglcontextlost", ( e ) => {
		e.preventDefault();
		console.warn( "WebGL context lost" );
		screenData.contextLost = true;
	} );
	
	// Reinit canvas when webglcontext gets restored
	screenData.canvas.addEventListener( "webglcontextrestored", () => {
		console.log( "WebGL context restored" );

		// TODO: Reinitialize WebGL resources
		// initWebGL( screenData );
		screenData.contextLost = false;

		// TODO: Reset blend mode
		// blendModeChanged( screenData );
	} );

	// Return successful
	return true;
}

/**
 * Cleanup renderer resources for screen
 * 
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function cleanup( screenData ) {

	// TODO: Check if WebGL context exists
	if( !screenData.gl ) {
		return;
	}

	const gl = screenData.gl;

	// TODO: Cleanup batches (will be in batches.js)
	// for( const batchType in screenData.batches ) {
	// 	const batch = screenData.batches[ batchType ];
	// 	if( batch.texCoordVBO ) {
	// 		gl.deleteBuffer( batch.texCoordVBO );
	// 	}
	// 	gl.deleteBuffer( batch.vertexVBO );
	// 	gl.deleteBuffer( batch.colorVBO );
	// 	gl.deleteVertexArray( batch.vao );
	// 	gl.deleteProgram( batch.program );
	// 	if( batch.texture ) {
	// 		gl.deleteTexture( batch.texture );
	// 	}
	// }

	// Clear batches array
	screenData.batches = {};
	screenData.batchInfo = {};
	
	// Cleanup display shader
	if( screenData.displayProgram ) {
		gl.deleteProgram( screenData.displayProgram );
		gl.deleteBuffer( screenData.displayPositionBuffer );
	}
	
	// Cleanup FBO
	if( screenData.FBO ) {
		gl.deleteFramebuffer( screenData.FBO );
		gl.deleteTexture( screenData.fboTexture );
	}

	// Cleanup Buffe FBO
	if( screenData.bufferFBO ) {
		gl.deleteFramebuffer( screenData.bufferFBO );
		gl.deleteTexture( screenData.bufferFboTexture );
	}
}

/**
 * Sets the image dirty / Queue automatic render
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function setImageDirty( screenData ) {

	if( !screenData.isRenderScheduled ) {
		screenData.isRenderScheduled = true;
		g_utils.queueMicrotask( () => {
			g_batches.flushBatches( screenData );
			g_batches.displayToCanvas( screenData );
			screenData.isRenderScheduled = false;
		} );
	}
}

/**
 * Called when blend mode changes, flush current batch with old blend mode
 * @param {Object} screenData - Screen data object
 * @param {string} previousBlend - Previous blend mode
 * @returns {void}
 */
export function blendModeChanged( screenData, previousBlend ) {

	// Flush existing batch with old blend mode
	g_batches.flushBatches( screenData, previousBlend );
	g_batches.displayToCanvas( screenData );
}

/**
 * Shift screen image up by yOffset pixels using ping-pong FBO blit
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} yOffset - Number of pixels to shift up
 * @returns {void}
 */
export function shiftImageUp( screenData, yOffset ) {

	if( yOffset <= 0 ) {
		return;
	}

	const gl = screenData.gl;
	const width = screenData.width;
	const height = screenData.height;

	// Ensure the latest content is in screenData.fboTexture
	g_batches.flushBatches( screenData );

	// Use the IMAGE batch shader/program and VAO for a direct blit
	const imageBatch = screenData.batches[ g_batches.IMAGE_BATCH ];
	gl.useProgram( imageBatch.program );
	gl.uniform2f( imageBatch.locations.resolution, width, height );
	gl.bindVertexArray( imageBatch.vao );

	// Disable blending (replace)
	gl.disable( gl.BLEND );

	// Compute geometry for first pass: copy src [0..w, yOffset..h] -> dst [0..w, 0..h-yOffset]
	const dstBottom = 0;
	const dstTop = Math.max( 0, height - yOffset );
	const srcBottomT = ( yOffset ) / height;
	const srcTopT = 1.0;

	// Triangles (two) covering destination sub-rect in pixel space
	const verts1 = new Float32Array( [
		0, dstBottom,
		width, dstBottom,
		0, dstTop,
		0, dstTop,
		width, dstBottom,
		width, dstTop
	] );

	// White (no tint)
	const colors1 = new Uint8Array( [
		255, 255, 255, 255,
		255, 255, 255, 255,
		255, 255, 255, 255,
		255, 255, 255, 255,
		255, 255, 255, 255,
		255, 255, 255, 255
	] );

	// Texcoords mapping src sub-rect [0..1 in X, srcBottomT..srcTopT in Y]
	const tex1 = new Float32Array( [
		0.0, srcBottomT,
		1.0, srcBottomT,
		0.0, srcTopT,
		0.0, srcTopT,
		1.0, srcBottomT,
		1.0, srcTopT
	] );

	// Bind destination buffer FBO
	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.bufferFBO );
	gl.viewport( 0, 0, width, height );
	gl.clearColor( 0, 0, 0, 0 );
	gl.clear( gl.COLOR_BUFFER_BIT );

	// Upload vertex data into batch buffers
	gl.bindBuffer( gl.ARRAY_BUFFER, imageBatch.vertexVBO );
	gl.bufferData( gl.ARRAY_BUFFER, verts1, gl.STREAM_DRAW );
	gl.bindBuffer( gl.ARRAY_BUFFER, imageBatch.colorVBO );
	gl.bufferData( gl.ARRAY_BUFFER, colors1, gl.STREAM_DRAW );
	gl.bindBuffer( gl.ARRAY_BUFFER, imageBatch.texCoordVBO );
	gl.bufferData( gl.ARRAY_BUFFER, tex1, gl.STREAM_DRAW );

	// Bind source texture (current screen content)
	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, screenData.fboTexture );
	gl.uniform1i( imageBatch.locations.texture, 0 );

	// Draw
	gl.drawArrays( gl.TRIANGLES, 0, 6 );

	// Second pass: copy from buffer to main FBO at y = yOffset..height
	const dst2Bottom = Math.min( height, yOffset );
	const dst2Top = height;
	const src2BottomT = 0.0;
	const src2TopT = ( height - yOffset ) / height;

	const verts2 = new Float32Array( [
		0, dst2Bottom,
		width, dst2Bottom,
		0, dst2Top,
		0, dst2Top,
		width, dst2Bottom,
		width, dst2Top
	] );

	const tex2 = new Float32Array( [
		0.0, src2BottomT,
		1.0, src2BottomT,
		0.0, src2TopT,
		0.0, src2TopT,
		1.0, src2BottomT,
		1.0, src2TopT
	] );

	// Bind destination main FBO and clear to transparent
	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
	gl.viewport( 0, 0, width, height );
	gl.clearColor( 0, 0, 0, 0 );
	gl.clear( gl.COLOR_BUFFER_BIT );

	// Upload second pass buffers
	gl.bindBuffer( gl.ARRAY_BUFFER, imageBatch.vertexVBO );
	gl.bufferData( gl.ARRAY_BUFFER, verts2, gl.STREAM_DRAW );
	gl.bindBuffer( gl.ARRAY_BUFFER, imageBatch.colorVBO );
	gl.bufferData( gl.ARRAY_BUFFER, colors1, gl.STREAM_DRAW );
	gl.bindBuffer( gl.ARRAY_BUFFER, imageBatch.texCoordVBO );
	gl.bufferData( gl.ARRAY_BUFFER, tex2, gl.STREAM_DRAW );

	// Bind buffer texture as source
	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, screenData.bufferFboTexture );
	gl.uniform1i( imageBatch.locations.texture, 0 );

	gl.drawArrays( gl.TRIANGLES, 0, 6 );

	// Unbind
	gl.bindVertexArray( null );
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );

	// Present to canvas
	g_batches.displayToCanvas( screenData );
}
