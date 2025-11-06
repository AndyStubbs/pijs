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
export { shiftImageUp } from "./effects.js";

// Re-export batch management
export { prepareBatch } from "./batches.js";

// Re-export rendering functions
export { flushBatches } from "./batches.js";
export { displayToCanvas } from "./batches.js";

// Re-export texture management
export {
	getWebGL2Texture, deleteWebGL2Texture, updateWebGL2TextureImage, updateWebGL2TextureSubImage
} from "./textures.js";

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

	// Cleanup batches
	g_batches.cleanup( screenData );

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
