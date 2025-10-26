/**
 * Pi.js - Canvas2D Renderer Core Module
 * 
 * 2D Canvas rendering with ImageData manipulation for pixel-perfect rendering.
 * Fallback renderer when WebGL2 is not available.
 * 
 * @module core/renderer-canvas2d
 */

"use strict";

import * as g_utils from "./utils";

// Auto-render state
let m_autoRenderScheduled = false;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {
	
	// Initialize will be called per screen
}

export function cleanup( screenData ) {
	screenData.context = null;
	screenData.canvas = null;
	screenData.imageData = null;
	screenData.bufferCanvas = null;
	screenData.bufferContext = null;
}


/***************************************************************************************************
 * Canvas2D Initialization
 **************************************************************************************************/


/**
 * Initialize 2D Canvas context
 * 
 * @param {Object} screenData - Screen data object
 */
export function initCanvas2D( screenData ) {
	
	const context = screenData.canvas.getContext( "2d", {
		"willReadFrequently": true,
		"desynchronized": true
	} );
	
	if( !context ) {
		return null;
	}
	
	// Setup canvas for pixel-perfect rendering
	context.imageSmoothingEnabled = false;
	
	// Create ImageData for pixel manipulation
	screenData.imageData = context.createImageData( screenData.width, screenData.height );
	screenData.context = context;
	screenData.bufferCanvas = null;
	screenData.bufferContext = null;

	return true;
}


/**
 * Queue automatic render
 * 
 * @param {Object} screenData - Screen data object
 */
export function setImageDirty( screenData ) {
	if( !m_autoRenderScheduled ) {
		m_autoRenderScheduled = true;
		g_utils.queueMicrotask( () => {
			screenData.context.putImageData( screenData.imageData, 0, 0 );
			m_autoRenderScheduled = false;
		} );
	}
}

/**
 * Before screen size has changed
 * 
 * @param {Object} screenData - Global screen data object container
 * @param {Object} fromSize - Original size width/height
 */
export function beforeResize( screenData, fromSize ) {
	
	if( screenData.bufferCanvas === null ) {
		screenData.bufferCanvas = new OffscreenCanvas( fromSize.width, fromSize.height );
		screenData.bufferContext = screenData.bufferCanvas.getContext( "2d" );

		// Set a timeout to remove the buffer from memory after 3 second -- saves memory usage
		setTimeout( () => {
			screenData.bufferCanvas = null;
			screenData.bufferContext = null;
		}, 3000 );
	}

	// Draw the canvas to the buffer
	screenData.bufferContext.clearRect( 0, 0, fromSize.width, fromSize.height );
	screenData.bufferContext.drawImage( screenData.canvas, 0, 0 );

}

/**
 * After screen size has changed - bufferCanvas is guaranteed because beforeResize is called first
 * in the same thread.
 * 
 * @param {Object} screenData - Global screen data object container
 * @param {Object} fromSize - Original size width/height
 * @param {Object} toSize - New size width/height
 */
export function afterResize( screenData, fromSize, toSize ) {

	// Draw the buffer back onto the canvas
	screenData.context.drawImage(
		screenData.bufferCanvas, 0, 0, fromSize.width, fromSize.height
	);

	// Clear up memory for buffer canvas
	screenData.bufferCanvas.width = toSize.width;
	screenData.bufferCanvas.height = toSize.height;
}


/***************************************************************************************************
 * Batch Operations
 **************************************************************************************************/


/**
 * Fast path for direct pixel writes (no bounds check, no blending)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @param {number} a - Alpha component (0-255)
 */
export function drawPixelUnsafe( screenData, x, y, color ) {
	const imageData = screenData.imageData;
	const data = imageData.data;
	const idx = ( ( screenData.width * y ) + x ) * 4;
	
	data[ idx ] = color.r;
	data[ idx + 1 ] = color.g;
	data[ idx + 2 ] = color.b;
	data[ idx + 3 ] = color.a;
	
	queueAutoRender( screenData );
}


/**
 * Fast path with bounds checking
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @param {number} a - Alpha component (0-255)
 */
export function drawPixelDirect( screenData, x, y, color ) {
	if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
		return;
	}
	drawPixelUnsafe( screenData, x, y, color );
}
