/**
 * Pi.js - Renderer Module
 * 
 * WebGL2 context creation, module orchestration, and public API exports.
 * Main orchestrator for all renderer modules.
 * 
 * @module graphics/renderer/renderer
 */

"use strict";

import * as g_screenManager from "../../core/screen-manager";

// Import renderer modules
import * as g_fbo from "./fbo.js";
import * as g_shaders from "./shaders.js";

// TODO: Import renderer modules when implemented
// import * as g_batches from "./batches.js";
// import * as textures from "./textures.js";
// import * as draw from "./draw.js";
// import * as primitives from "./primitives.js";
// import * as shapes from "./shapes.js";
// import * as readback from "./readback.js";


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
	// TODO: 3. g_batches.init();
	// TODO: 4. textures.init()
	// TODO: 5. draw.init()
	// TODO: 6. primitives.init()
	// TODO: 7. shapes.init()
	// TODO: 8. readback.init()
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
	
	// TODO: Create the point batch (will be in batches.js)
	// screenData.batches[ batches.POINTS_BATCH ] = batches.createBatchSystem( 
	// 	screenData, pointVertSrc, pointFragSrc, batches.POINTS_BATCH 
	// );

	// TODO: Create the images batch (will be in batches.js)
	// screenData.batches[ batches.IMAGE_BATCH ] = batches.createBatchSystem( 
	// 	screenData, imageVertSrc, imageFragSrc, batches.IMAGE_BATCH 
	// );
	
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

