/**
 * Pi.js - Lines Drawing Module
 * 
 * High-level primitive drawing operations: lines
 * 
 * drawLinePixel, drawLineSquare, drawLineCircle
 * 
 * @module renderer/draw/lines
 */

"use strict";

// Import required modules
import * as g_batches from "../batches.js";
import * as g_batchHelpers from "./batch-helpers.js";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/

/**
 * Draw line using WebGL2 LINES or geometry based on pen size
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {Object} color - Color object with r, g, b, a
 * @returns {void}
 */
export function drawLinePixel( screenData, x1, y1, x2, y2, color ) {

	// Prepare batch for 2 vertices (line segment)
	const batch = screenData.batches[ g_batches.LINES_BATCH ];
	g_batches.prepareBatch( screenData, g_batches.LINES_BATCH, 2, null, null );

	// Add the line to the batch
	g_batchHelpers.addLineToBatch( batch, x1, y1, x2, y2, color );
}
