/**
 * Pi.js - Canvas2D Renderer Core Module
 * 
 * 2D Canvas rendering with ImageData manipulation for pixel-perfect rendering.
 * Fallback renderer when WebGL2 is not available.
 * 
 * @module graphics/renderer-canvas2d
 */

"use strict";

import * as g_utils from "../core/utils.js";

// Auto-render state
let m_autoRenderScheduled = false;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init( api ) {
	
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


export function getImageData( screenData ) {

	// TODO: getImageData but only if image has been drawn to by context command such
	// as drawImage.  Otherwise we shouldn't need to getImageData as it should be up to
	// date
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
	const i = ( ( screenData.width * y ) + x ) * 4;

	// Normalize alpha to [ 0, 1 ]
	const srcA = color.a / 255;
	const dstA = data[ i + 3 ] / 255;

	// Apply the blend to the data
	data[ i ]     = Math.round( color.r * srcA + data[ i ] * ( 1 - srcA ) );
	data[ i + 1 ] = Math.round( color.g * srcA + data[ i + 1 ] * ( 1 - srcA ) );
	data[ i + 2 ] = Math.round( color.b * srcA + data[ i + 2 ] * ( 1 - srcA ) );
	data[ i + 3 ] = Math.round( ( srcA + dstA * ( 1 - srcA ) ) * 255 );
}


/***************************************************************************************************
 * Readback Operations
 **************************************************************************************************/


export function readPixel( screenData, x, y ) {

	// Bounds check
	if( x < 0 || y < 0 || x >= screenData.width || y >= screenData.height ) {
		return null;
	}

	// For Canvas2D path, screenData.imageData is the source of truth.
	const data = screenData.imageData.data;
	const i = ( ( screenData.width * y ) + x ) * 4;
	return g_utils.rgbToColor( data[ i ], data[ i + 1 ], data[ i + 2 ], data[ i + 3 ] );
}

export function readPixelAsync( screenData, x, y ) {
	return Promise.resolve( readPixel( screenData, x, y ) );
}


export function readPixels( screenData, x, y, width, height ) {

	// Ensure imageData reflects latest CPU buffer (we render from imageData)
	getImageData( screenData );

	const screenWidth = screenData.width;
	const screenHeight = screenData.height;
	const data = screenData.imageData.data;

	// Build a 2D array [height][width], null for out-of-bounds
	const results = new Array( height );
	for( let row = 0; row < height; row++ ) {
		const screenY = y + row;
		const isRowOnScreen = ( screenY >= 0 && screenY < screenHeight );
		const resultRow = new Array( width );
		for( let col = 0; col < width; col++ ) {
			const screenX = x + col;
			if( isRowOnScreen && screenX >= 0 && screenX < screenWidth ) {
				const i = ( ( screenWidth * screenY ) + screenX ) * 4;
				resultRow[ col ] = g_utils.rgbToColor(
					data[ i ], data[ i + 1 ], data[ i + 2 ], data[ i + 3 ]
				);
			} else {
				resultRow[ col ] = null;
			}
		}
		results[ row ] = resultRow;
	}

	return results;
}

export function readPixelsAsync( screenData, x, y, width, height ) {
	return Promise.resolve( readPixels( screenData, x, y, width, height ) );
}


/***************************************************************************************************
 * Image Drawing Operations
 **************************************************************************************************/


/**
 * Draw an image on the screen
 * 
 * @param {Object} screenData - Screen data object
 * @param {HTMLImageElement|HTMLCanvasElement} img - Image or Canvas element
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} angleRad - Rotation angle in radians
 * @param {number} anchorX - Anchor point X (0-1)
 * @param {number} anchorY - Anchor point Y (0-1)
 * @param {number} alpha - Alpha value (0-255)
 * @param {number} scaleX - Scale X
 * @param {number} scaleY - Scale Y
 */
export function drawImage(
	screenData, img, x, y, angleRad, anchorX, anchorY, alpha, scaleX, scaleY
) {

	const context = screenData.context;

	// Calculate anchor position in pixels
	const anchorXPx = Math.round( img.width * anchorX );
	const anchorYPx = Math.round( img.height * anchorY );

	// Save current context state
	context.save();

	// Set alpha
	context.globalAlpha = alpha / 255;

	// Apply transformations
	context.translate( x, y );
	context.rotate( angleRad );
	context.scale( scaleX, scaleY );

	// Draw image
	context.drawImage( img, -anchorXPx, -anchorYPx );

	// Restore context state
	context.restore();

	// Mark screen as dirty
	setImageDirty( screenData );
}
