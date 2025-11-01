/**
 * Pi.js - Low-Level Drawing Module
 * 
 * Low-level drawing operations: pixel writes and image drawing.
 * 
 * @module graphics/renderer/draw
 */

"use strict";

import * as g_batches from "./batches.js";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize draw module
 * 
 * @returns {void}
 */
export function init() {

	// Nothing to initialize yet
}

/**
 * Fast path for single pixel write (unsafe - no bounds checking)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawPixelUnsafe( screenData, x, y, color ) {

	// Add directly to point batch
	const batch = screenData.batches[ g_batches.POINTS_BATCH ];
	const idx = batch.count * batch.vertexComps;
	const cidx = batch.count * batch.colorComps;
	
	batch.vertices[ idx     ] = x;
	batch.vertices[ idx + 1 ] = y;
	batch.colors[ cidx     ] = color.r;
	batch.colors[ cidx + 1 ] = color.g;
	batch.colors[ cidx + 2 ] = color.b;
	batch.colors[ cidx + 3 ] = color.a;

	batch.count++;
}

/**
 * Fast path for single pixel write with batch preparation
 * Used when you need to ensure batch capacity before drawing
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawPixelUnsafeWithPrepare( screenData, x, y, color ) {

	// Prepare batch for 1 vertex
	g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, 1 );

	// Draw pixel
	drawPixelUnsafe( screenData, x, y, color );
}

/**
 * Draw image as textured quad with optional transform
 * 
 * @param {Object} screenData - Screen data object
 * @param {Image|Canvas|WebGLTexture} img - Image, Canvas, or Texture
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} angleRad - Rotation angle in radians
 * @param {number} anchorX - Anchor point X (0-1)
 * @param {number} anchorY - Anchor point Y (0-1)
 * @param {number} alpha - Alpha value (0-1)
 * @param {number} scaleX - Scale X factor
 * @param {number} scaleY - Scale Y factor
 * @returns {void}
 */
export function drawImage( 
	screenData, img, x, y, angleRad, anchorX, anchorY, alpha, scaleX, scaleY 
) {

	// TODO: Implement drawImage with textured quads
}

