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
	
	const context = screenData.canvas.getContext( "2d", { "willReadFrequently": true } );
	
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


export function cls( screenData, x, y, width, height ) {
	
	// TODO: Implement clear screen command
}


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
	const data = screenData.imageData.data;
	const i = ( ( screenData.width * y ) + x ) * 4;
	
	data[ i ] = color.r;
	data[ i + 1 ] = color.g;
	data[ i + 2 ] = color.b;
	data[ i + 3 ] = color.a;
}


export function blendPixelUnsafe( screenData, x, y, color ) {
	const data = screenData.imageData.data;

	// Calculate the index
	const i = ( ( width * y ) + x ) * 4;

	// Normalize alpha to [ 0, 1 ]
	const srcA = color.a / 255;
	const dstA = data[ i + 3 ] / 255;
	const outA = srcA + dstA * ( 1 - srcA );

	// Blend the RGB channels
	data[ i ] = Math.round( ( color.r * srcA + data[ i ] * dstA * ( 1 - srcA ) ) / outA );
	data[ i + 1 ] = Math.round( ( color.g * srcA + data[ i + 1 ] * dstA * ( 1 - srcA ) ) / outA );
	data[ i + 2 ] = Math.round( ( color.b * srcA + data[ i + 2 ] * dstA * ( 1 - srcA ) ) / outA );

	// Update alpha channel
	data[ i + 3 ] = Math.round( outA * 255 );
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
