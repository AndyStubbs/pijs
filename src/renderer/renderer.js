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
export { POINTS_BATCH, IMAGE_BATCH, GEOMETRY_BATCH, POINTS_REPLACE_BATCH } from "./batches.js";

// Re-export drawing functions
export { drawImage, drawSprite } from "./draw/sprites.js";
export { drawPixel, drawPixelUnsafe } from "./draw/primitives.js";
export { drawArc } from "./draw/arcs.js";
export { drawBezier } from "./draw/bezier.js";
export { drawLine } from "./draw/lines.js";
export { drawCachedGeometry } from "./draw/geometry.js";
export { drawRect, drawRectFilled } from "./draw/rects.js";
export { drawCircle, drawCircleFilled } from "./draw/circles.js";
export { drawEllipse } from "./draw/ellipses.js";
export { shiftImageUp, cls } from "./effects.js";

// Re-export batch management
export { prepareBatch, flushBatches, displayToCanvas } from "./batches.js";

// Re-export texture management
export {
	getWebGL2Texture, deleteWebGL2Texture, updateWebGL2TextureImage, updateWebGL2TextureSubImage
} from "./textures.js";

// Re-export readback functions
export {
	readPixel, readPixelAsync, readPixels, readPixelsAsync, readPixelsRaw
} from "./readback.js";


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
	g_screenManager.addScreenDataItem( "fboTexture", null );
	g_screenManager.addScreenDataItem( "FBO", null );
	g_screenManager.addScreenDataItem( "bufferFboTexture", null );
	g_screenManager.addScreenDataItem( "bufferFBO", null );

	// Register renderer cleanup function
	g_screenManager.addScreenCleanupFunction( cleanup );

	// Initialize renderer modules in order
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
	const fboAndTexture = createTextureAndFBO( screenData );
	if( !fboAndTexture ) {
		screenData.gl = null;
		return false;
	}
	screenData.fboTexture = fboAndTexture.fboTexture;
	screenData.FBO = fboAndTexture.FBO;
	
	// Create a buffer texture and FBO
	const bufferFboAndTexture = createTextureAndFBO( screenData );
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
 * Create FBO and texture for screen
 * 
 * @param {Object} screenData - Screen data object
 * @returns {boolean} True if FBO created successfully
 */
function createTextureAndFBO( screenData ) {

	const gl = screenData.gl;
	const width = screenData.width;
	const height = screenData.height;
	
	// Create texture
	const fboTexture = gl.createTexture();
	if( !fboTexture ) {
		console.error( "Failed to create WebGL2 texture." );
		return false;
	}

	gl.bindTexture( gl.TEXTURE_2D, fboTexture );
	gl.texImage2D( 
		gl.TEXTURE_2D, 0, gl.RGBA8, 
		width, height, 0, 
		gl.RGBA, gl.UNSIGNED_BYTE, null 
	);
	
	// Set texture parameters for pixel-perfect rendering
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
	
	// Create FBO
	const FBO = gl.createFramebuffer();
	gl.bindFramebuffer( gl.FRAMEBUFFER, FBO );
	
	// Attach texture to FBO
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
		gl.TEXTURE_2D, fboTexture, 0 
	);

	// Make sure that framebuffer is complete
	const status = gl.checkFramebufferStatus( gl.FRAMEBUFFER );
	if( status !== gl.FRAMEBUFFER_COMPLETE ) {
		console.error( "WebGL2 Framebuffer incomplete:", status );
		return false;
	}

	// Unbind
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	gl.bindTexture( gl.TEXTURE_2D, null );

	return { fboTexture, FBO };
}

/**
 * Cleanup renderer resources for screen
 * 
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function cleanup( screenData ) {
	const gl = screenData.gl;

	// Make sure no render gets executed in the microtask
	screenData.isRenderScheduled = false;
	
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
			
			// Make sure render hasn't been cancelled
			if( !screenData.isRenderScheduled ) {
				return;
			}
			g_batches.flushBatches( screenData );
			g_batches.displayToCanvas( screenData );
			screenData.isRenderScheduled = false;
		} );
	}
}

/**
 * Called when blend mode changes, flush current batch with old blend mode
 * @param {Object} screenData - Screen data object
 * @param {Object} previousBlends - Blends data including blend mode, noise, seed or null default
 * @returns {void}
 */
export function blendModeChanged( screenData, previousBlends ) {

	// Flush existing batch with old blend mode
	g_batches.flushBatches( screenData, previousBlends );
	g_batches.displayToCanvas( screenData );
}

export function resizeScreen( screenData, oldWidth, oldHeight ) {

	// Finish rendering to the FBO before resizing
	g_batches.flushBatches( screenData );

	const gl = screenData.gl;
	const newWidth = screenData.width;
	const newHeight = screenData.height;

	// Preserve the current contents in the buffer FBO before reallocating
	gl.bindFramebuffer( gl.READ_FRAMEBUFFER, screenData.FBO );
	gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, screenData.bufferFBO );
	gl.clearColor( 0, 0, 0, 0 );
	gl.clear( gl.COLOR_BUFFER_BIT );
	gl.blitFramebuffer(
		0, 0, oldWidth, oldHeight,
		0, 0, oldWidth, oldHeight,
		gl.COLOR_BUFFER_BIT, gl.NEAREST
	);

	// Resize the primary FBO texture
	gl.bindTexture( gl.TEXTURE_2D, screenData.fboTexture );
	gl.texImage2D( 
		gl.TEXTURE_2D, 0, gl.RGBA8, 
		newWidth, newHeight, 0,
		gl.RGBA, gl.UNSIGNED_BYTE, null 
	);
	gl.bindTexture( gl.TEXTURE_2D, null );

	// Copy the preserved pixels back into the resized primary FBO
	const copyWidth = Math.min( oldWidth, newWidth );
	const copyHeight = Math.min( oldHeight, newHeight );
	gl.bindFramebuffer( gl.READ_FRAMEBUFFER, screenData.bufferFBO );
	gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, screenData.FBO );

	// Need to flip the y-index so the top-left of the screen is preserved if the screen is smaller
	const srcY = Math.max( 0, oldHeight - newHeight );
	gl.blitFramebuffer(
		0, srcY, copyWidth, srcY + copyHeight,
		0, 0, copyWidth, copyHeight,
		gl.COLOR_BUFFER_BIT, gl.NEAREST
	);

	// Resize the buffer FBO texture to match the new dimensions
	gl.bindTexture( gl.TEXTURE_2D, screenData.bufferFboTexture );
	gl.texImage2D( 
		gl.TEXTURE_2D, 0, gl.RGBA8, 
		newWidth, newHeight, 0,
		gl.RGBA, gl.UNSIGNED_BYTE, null 
	);
	gl.bindTexture( gl.TEXTURE_2D, null );

	gl.bindFramebuffer( gl.READ_FRAMEBUFFER, null );
	gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, null );
}
