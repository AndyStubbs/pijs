/**
 * Pi.js - Renderer Module
 * 
 * WebGL2 context creation, module orchestration, and public API exports.
 * Main orchestrator for all renderer modules.
 * 
 * @module graphics/renderer/renderer
 */

"use strict";

import * as g_screenManager from "../../core/screen-manager.js";
import * as g_utils from "../../core/utils.js";

// Import renderer modules
import * as g_fbo from "./fbo.js";
import * as g_shaders from "./shaders.js";
import * as g_batches from "./batches.js";
import * as g_draw from "./draw.js";

// Import shapes module for geometry drawing
import * as g_shapes from "./shapes.js";
import * as g_geometry from "./geometry.js";
import * as g_textures from "./textures.js";
import * as g_readback from "./readback.js";

// TODO: Import renderer modules when implemented
// import * as primitives from "./primitives.js";


/***************************************************************************************************
 * Public API Exports
 ***************************************************************************************************/


// Re-export batch constants
export { POINTS_BATCH, IMAGE_BATCH, GEOMETRY_BATCH, POINTS_REPLACE_BATCH } from "./batches.js";

// Re-export drawing functions
export { drawPixelUnsafe, drawImage, drawPixelUnsafeReplace } from "./draw.js";
export { drawFilledRectUnsafe, drawFilledCircleUnsafe } from "./shapes.js";
export { drawCachedGeometry } from "./geometry.js";

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
	g_draw.init();
	g_shapes.init();
	g_geometry.init();
	g_textures.init();
	g_readback.init();
	// TODO: 6. primitives.init()
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
	if( !g_fbo.createFBO( screenData ) ) {
		screenData.gl = null;
		return false;
	}
	
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
	g_fbo.cleanup( screenData );
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

