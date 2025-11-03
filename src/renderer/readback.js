/**
 * Pi.js - Pixel Readback Module
 * 
 * Pixel readback operations: single pixel and rectangular regions.
 * 
 * @module renderer/readback
 */

"use strict";

// Import required modules
import * as g_batches from "./batches.js";
import * as g_utils from "../core/utils.js";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize readback module
 * 
 * @returns {void}
 */
export function init() {
	// No initialization needed
}

/**
 * Read single pixel (synchronous)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object|null} Color object with r, g, b, a or null on error
 */
export function readPixel( screenData, x, y ) {

	// Ensure latest contents are in the FBO
	g_batches.flushBatches( screenData );

	const gl = screenData.gl;
	const screenHeight = screenData.height;

	// WebGL uses bottom-left origin; flip Y
	const glY = ( screenHeight - 1 ) - y;
	const buf = new Uint8Array( 4 );

	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
	gl.readPixels( x, glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf );
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );

	return g_utils.rgbToColor( buf[ 0 ], buf[ 1 ], buf[ 2 ], buf[ 3 ] );
}

/**
 * Read single pixel (asynchronous)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Promise<Object|null>} Promise resolving to color object or null
 */
export function readPixelAsync( screenData, x, y ) {
	return new Promise( ( resolve ) => {
		g_utils.queueMicrotask( () => {
			resolve( readPixel( screenData, x, y ) );
		} );
	} );
}

/**
 * Read pixel rectangle (synchronous)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @returns {Array<Array<Object>>} 2D array of color objects [height][width]
 */
export function readPixels( screenData, x, y, width, height ) {
	const gl = screenData.gl;
	const screenWidth = screenData.width;
	const screenHeight = screenData.height;

	// Clamp to screen bounds for robustness if not fully clipped by pixels.js
	const clampedX = Math.max( 0, x );
	const clampedY = Math.max( 0, y );
	const clampedWidth = Math.min( width, screenWidth - clampedX );
	const clampedHeight = Math.min( height, screenHeight - clampedY );

	// If after clamping, nothing left to read
	if( clampedWidth <= 0 || clampedHeight <= 0 ) {
		return [];
	}

	// Flush batches before reading
	g_batches.flushBatches( screenData );

	// Allocate buffer for the exact rectangle to read
	const buf = new Uint8Array( clampedWidth * clampedHeight * 4 );

	// WebGL origin is bottom-left; convert to top-left for `gl.readPixels`
	// The Y coordinate for `gl.readPixels` is the bottom edge of the rectangle.
	// Bottom-left corner Y of the rectangle
	const glReadY = ( screenHeight - ( clampedY + clampedHeight ) );

	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
	gl.readPixels( clampedX, glReadY, clampedWidth, clampedHeight, gl.RGBA, gl.UNSIGNED_BYTE, buf );
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );

	// Map back to output structure expected by api/pixels.js
	// This function will return a flat array of color objects
	const resultColors = new Array( clampedHeight );
	for( let row = 0; row < clampedHeight; row++ ) {

		const resultsRow = new Array( clampedWidth );
		for( let col = 0; col < clampedWidth; col++ ) {

			// Convert gl.readPixels' bottom-origin Y to top-origin Y for the buffer index
			// `buf` itself is ordered from glReadY up to glReadY + clampedHeight - 1
			// Flip row index
			const bufRow = ( clampedHeight - 1 ) - row;
			const i = ( ( clampedWidth * bufRow ) + col ) * 4;
			resultsRow[ col ] = g_utils.rgbToColor(
				buf[ i ], buf[ i + 1 ], buf[ i + 2 ], buf[ i + 3 ]
			);
		}
		resultColors[ row ] = resultsRow;
	}

	return resultColors;
}

/**
 * Read pixel rectangle (asynchronous)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @returns {Promise<Array<Array<Object>>>} Promise resolving to 2D array of color objects
 */
export function readPixelsAsync( screenData, x, y, width, height ) {
	return new Promise( ( resolve ) => {
		g_utils.queueMicrotask( () => {
			resolve( readPixels( screenData, x, y, width, height ) );
		} );
	} );
}

