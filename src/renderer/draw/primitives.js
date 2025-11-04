/**
 * Pi.js - Low-Level Drawing Module
 * 
 * Low-level drawing operations: pixel writes
 * 
 * @module renderer/draw/primitives
 */

"use strict";

import * as g_batchHelpers from "./batch-helpers.js";


/**
 * Fast path for single pixel write (unsafe - no bounds checking)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawPixel( screenData, x, y, color, batchType ) {

	// Add directly to point batch
	const batch = screenData.batches[ batchType ];
	g_batchHelpers.addVertexToBatch( batch, x, y, color );
}
