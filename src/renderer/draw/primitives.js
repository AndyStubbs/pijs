/**
 * Pi.js - Low-Level Drawing Module
 * 
 * Low-level drawing operations: pixel writes
 * 
 * @module renderer/draw/primitives
 */

"use strict";

import * as g_batchHelpers from "./batch-helpers.js";
import * as g_batches from "../batches.js";


/**
 * Fast path for single pixel write (safe - prepares batch)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {void}
 */
export function drawPixel( screenData, x, y, batchType ) {

	// Prep for 1 pixel
	g_batches.prepareBatch( screenData, batchType, 1, null, null );

	// Add directly to point batch
	const batch = screenData.batches[ batchType ];
	g_batchHelpers.addVertexToBatch( batch, x, y, screenData.color );
}

/**
 * Fast path for single pixel write (unsafe - does not prepare batch)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color color with [ r, g, b, a ] values (0-255)
 * @returns {void}
 */
export function drawPixelUnsafe( screenData, x, y, color, batchType ) {

	// Add directly to point batch
	const batch = screenData.batches[ batchType ];
	g_batchHelpers.addVertexToBatch( batch, x, y, color );
}
