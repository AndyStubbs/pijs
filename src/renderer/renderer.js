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
import * as g_postfx from "../api/postfx.js";
import { isContextUnavailable, getContextGeneration, probeContextLoss } from "./context-state.js";

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
export {
	POINTS_BATCH, IMAGE_BATCH, GEOMETRY_BATCH, POINTS_REPLACE_BATCH, IMAGE_REPLACE_BATCH, SHADER_BATCH
} from "./batches.js";

// Re-export drawing functions
export { drawImage, drawSprite } from "./draw/sprites.js";
export { drawPixel, drawPixelUnsafe } from "./draw/primitives.js";
export { createPointWriter } from "./draw/batch-helpers.js";
export { drawArc } from "./draw/arcs.js";
export { drawBezier } from "./draw/bezier.js";
export { drawLine } from "./draw/lines.js";
export { drawCachedGeometry } from "./draw/geometry.js";
export { drawRect, drawRectFilled } from "./draw/rects.js";
export { drawCircle, drawCircleFilled } from "./draw/circles.js";
export { drawEllipse } from "./draw/ellipses.js";
export { shiftImageUp, cls } from "./effects.js";

// Re-export batch management
export {
	prepareBatch, flushBatches, displayToCanvas, prepareShaderBatch, countQueuedShaderPasses
} from "./batches.js";

// Re-export custom shader validation and uniform normalization
export {
	validateCustomShaderProgram, normalizeCustomUniforms, getCustomShaderDiagnostics,
	deleteCustomShaderProgram
} from "./shaders.js";

// Re-export texture management
export {
	getWebGL2Texture, getSamplerTexture, deleteWebGL2Texture, updateWebGL2TextureSubImage
} from "./textures.js";

// Re-export readback functions
export {
	readPixel, readPixelAsync, readPixels, readPixelsAsync, readPixelsRaw
} from "./readback.js";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/

const m_isDebug = window.location.search.includes( "webgl-debug" );
let m_offscreenContext = null;
const m_contexts = new WeakMap();

/**
 * Initialize all renderer modules
 * 
 * @param {Object} api - The main Pi.js API object
 * @returns {void}
 */
export function init( api ) {

	// Add screenData items
	g_screenManager.addScreenDataItem( "contextLost", false );
	g_screenManager.addScreenDataItem( "contextGeneration", 0 );
	g_screenManager.addScreenDataItem( "isRenderScheduled", false );
	g_screenManager.addScreenDataItem( "isFirstRender", true );
	g_screenManager.addScreenDataItem( "gl", null );
	g_screenManager.addScreenDataItem( "fboTexture", null );
	g_screenManager.addScreenDataItem( "FBO", null );
	g_screenManager.addScreenDataItem( "bufferFboTexture", null );
	g_screenManager.addScreenDataItem( "bufferFBO", null );
	g_screenManager.addScreenDataItem( "customShaders", {} );
	g_screenManager.addScreenDataItem( "frameCount", 0 );

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

	let canvas = screenData.canvas;
	
	if( screenData.parentRenderContext ) {
		canvas = screenData.canvas.canvas;
		screenData.gl = screenData.parentRenderContext;
	} else if( screenData.isOffscreen ) {
		canvas = screenData.canvas.canvas;
		if( !m_offscreenContext ) {
			m_offscreenContext = canvas.getContext( "webgl2", { 
				"alpha": true, 
				"premultipliedAlpha": true,
				"antialias": false,
				"preserveDrawingBuffer": true,
				"desynchronized": false,
				"colorType": "unorm8"
			} );
		}
		screenData.gl = m_offscreenContext;
	} else {
		screenData.gl = canvas.getContext( "webgl2", { 
			"alpha": true, 
			"premultipliedAlpha": true,
			"antialias": false,
			"preserveDrawingBuffer": true,
			"desynchronized": false,
			"colorType": "unorm8"
		} );
	}
	
	// WebGL2 not available
	if( !screenData.gl ) {
		const error = new Error( "screen: Failed to create WebGL2 context. WebGL2 is required." );
		error.code = "WEBGL_ERROR";
		throw error;
	}

	const gl = screenData.gl;
	let state = m_contexts.get( gl );
	if( !state ) {
		state = {
			"gl": gl, "canvas": gl.canvas, "generation": 0, "status": "ready",
			"screens": new Set(), "error": null
		};
		state.suspend = () => suspendContext( state );
		state.lostHandler = event => {
			event.preventDefault();
			state.suspend();
		};
		state.restoredHandler = () => restoreContext( state );
		state.canvas.addEventListener( "webglcontextlost", state.lostHandler );
		state.canvas.addEventListener( "webglcontextrestored", state.restoredHandler );
		m_contexts.set( gl, state );
	}
	state.screens.add( screenData );
	screenData.contextState = state;
	screenData.contextGeneration = state.generation;
	screenData.contextLost = state.status !== "ready";
	if( probeContextLoss( screenData ) ) {
		return;
	}
	createResources( screenData );
	if( m_isDebug ) {
		const debugExt = gl.getExtension( "WEBGL_debug_renderer_info" );
		if( debugExt ) {
			console.log( "GPU:", gl.getParameter( debugExt.UNMASKED_RENDERER_WEBGL ) );
		}
	}
}

/** Create a screen's GPU resources without rerunning its logical initialization. */
function createResources( screenData ) {
	const gl = screenData.gl;
	gl.viewport( 0, 0, screenData.width, screenData.height );
	const primary = createTextureAndFBO( screenData );
	screenData.FBO = primary.FBO;
	screenData.fboTexture = primary.fboTexture;
	const buffer = createTextureAndFBO( screenData );
	screenData.bufferFBO = buffer.FBO;
	screenData.bufferFboTexture = buffer.fboTexture;
	g_batches.createBatches( screenData );
	g_shaders.setupDisplayShader( screenData );
}

/** Forget objects whose storage was destroyed by the browser; never delete stale handles. */
function discardResources( screenData ) {
	screenData.isRenderScheduled = false;
	screenData.isFirstRender = true;
	screenData.batches = {};
	screenData.batchInfo = {
		"currentBatch": null, "drawOrder": [], "textureBatchSet": new Set()
	};
	screenData.customShaders = {};
	screenData.displayShaderUniformBindings = {};
	screenData.imageContextMap = new Map();
	screenData.samplerContextMap = new Map();
	for( const key of [ "FBO", "fboTexture", "bufferFBO", "bufferFboTexture",
		"displayProgram", "displayPositionBuffer", "displayQuadVao", "displayLocations",
		"textureCopyFBO" ] ) {
		screenData[ key ] = null;
	}
}

/** Suspend all members exactly once for a browser loss, including loss observed before its event. */
function suspendContext( state ) {
	if( state.status === "lost" ) {
		return;
	}
	state.status = "lost";
	state.generation++;
	state.error = null;
	for( const screen of state.screens ) {
		screen.contextLost = true;
		screen.contextGeneration = state.generation;
		discardResources( screen );
	}
}

/** Rebuild the whole generation before allowing any member to render. */
function restoreContext( state ) {
	if( state.status !== "lost" || state.gl.isContextLost() ) {
		return;
	}
	state.status = "restoring";
	try {
		for( const screen of state.screens ) {
			createResources( screen );
		}
		for( const screen of state.screens ) {
			g_postfx.restoreDisplayShaderBindings( screen );
			for( const other of g_screenManager.getAllScreensData() ) {
				if( other.gl !== state.gl ) {
					g_textures.deleteWebGL2Texture( other, screen.canvas );
				}
			}
		}
		state.status = "ready";
		for( const screen of state.screens ) {
			screen.contextLost = false;
		}
		for( const screen of state.screens ) {
			setImageDirty( screen );
		}
	} catch( cause ) {
		for( const screen of state.screens ) {
			releaseResources( screen );
			discardResources( screen );
			screen.contextLost = true;
		}
		state.status = "failed";
		const error = new Error( "WebGL context resource recovery failed.", { "cause": cause } );
		error.code = "WEBGL_CONTEXT_RESTORE_FAILED";
		state.error = error;
		console.error( error.code, error );
	}
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
	
	let FBO = null;
	// Create texture
	const fboTexture = gl.createTexture();
	if( !fboTexture ) {
		const error = new Error( "screen: Failed to create WebGL2 texture." );
		error.code = "WEBGL_ERROR";
		throw error;
	}

	try {
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
		FBO = gl.createFramebuffer();
		if( !FBO ) {
			const error = new Error( "screen: Failed to create WebGL2 framebuffer." );
			error.code = "WEBGL_ERROR";
			throw error;
		}
		gl.bindFramebuffer( gl.FRAMEBUFFER, FBO );
		
		// Attach texture to FBO
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
			gl.TEXTURE_2D, fboTexture, 0 
		);

		// Make sure that framebuffer is complete
		const status = gl.checkFramebufferStatus( gl.FRAMEBUFFER );
		if( status !== gl.FRAMEBUFFER_COMPLETE ) {
			const error = new Error( `screen: WebGL2 Framebuffer incomplete. ${status}` );
			error.code = "WEBGL_ERROR";
			throw error;
		}

		// Unbind
		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		gl.bindTexture( gl.TEXTURE_2D, null );

		return { "fboTexture": fboTexture, "FBO": FBO };
	} catch( error ) {
		gl.deleteTexture( fboTexture );
		gl.deleteFramebuffer( FBO );
		throw error;
	}
}

/**
 * Cleanup renderer resources for screen
 * 
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function cleanup( screenData ) {
	const state = screenData.contextState;
	if( state ) {
		state.screens.delete( screenData );
		if( state.screens.size === 0 ) {
			state.canvas.removeEventListener( "webglcontextlost", state.lostHandler );
			state.canvas.removeEventListener( "webglcontextrestored", state.restoredHandler );
			m_contexts.delete( state.gl );
		}
		screenData.contextState = null;
	}
	releaseResources( screenData );
}

/** Release only currently owned GPU objects, including partially constructed resources. */
function releaseResources( screenData ) {
	const gl = screenData.gl;
	if( !gl ) {
		return;
	}

	// Make sure no render gets executed in the microtask
	screenData.isRenderScheduled = false;
	
	// Cleanup batches
	g_batches.cleanup( screenData );

	// Cleanup display shader
	if( screenData.displayProgram ) {
		gl.deleteProgram( screenData.displayProgram );
		gl.deleteBuffer( screenData.displayPositionBuffer );
		gl.deleteVertexArray( screenData.displayQuadVao );
	}

	// Cleanup custom shader programs (FBO / display)
	if( screenData.customShaders ) {
		for( const id of Object.keys( screenData.customShaders ) ) {
			const cache = screenData.customShaders[ id ];
			if( cache && cache.program ) {
				gl.deleteProgram( cache.program );
			}
		}
	}
	
	// Cleanup textures
	g_textures.cleanup( screenData );

	// Cleanup FBO
	if( screenData.FBO ) {
		gl.deleteFramebuffer( screenData.FBO );
		gl.deleteTexture( screenData.fboTexture );
	}

	// Cleanup buffer FBO
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
	if( isContextUnavailable( screenData ) ) {
		return;
	}
	// Parent-affiliated offscreen screens never present to a canvas. Their FBO is flushed lazily
	// when another screen composites it or a readback operation needs its pixels.
	if( screenData.isOffscreen && screenData.parentRenderContext ) {
		return;
	}

	if( !screenData.isRenderScheduled ) {
		const generation = getContextGeneration( screenData );
		screenData.isRenderScheduled = true;
		g_utils.queueMicrotask( () => {
			
			// Make sure render hasn't been cancelled
			if( !screenData.isRenderScheduled || screenData.isRemoved ||
				generation !== getContextGeneration( screenData ) ||
				isContextUnavailable( screenData )
			) {
				return;
			}
			try {
				g_batches.flushBatches( screenData );
				g_batches.displayToCanvas( screenData );
			} finally {
				screenData.isRenderScheduled = false;
			}
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
	if( probeContextLoss( screenData ) ) {
		return;
	}

	// Finish rendering to the FBO before resizing
	g_batches.flushBatches( screenData );
	if( isContextUnavailable( screenData ) ) {
		return;
	}

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

	// WebGL blits use a bottom-left origin. Offset both rectangles so the logical top-left region
	// remains anchored when growing as well as when shrinking.
	const srcY = oldHeight - copyHeight;
	const destinationY = newHeight - copyHeight;
	gl.blitFramebuffer(
		0, srcY, copyWidth, srcY + copyHeight,
		0, destinationY, copyWidth, destinationY + copyHeight,
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
