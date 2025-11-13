/**
 * Pi.js - Lines Drawing Module
 * 
 * High-level primitive drawing operations: lines
 * 
 * drawLine, drawLineSquare, drawLineCircle
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
 * @returns {void}
 */
export function drawLine( screenData, x1, y1, x2, y2 ) {
	const color = screenData.color;

	// Estimate number of points needed (Manhattan distance)
	const dx = Math.abs( x2 - x1 );
	const dy = Math.abs( y2 - y1 );
	const pointCount = Math.max( dx, dy ) + 1;

	// Prepare batch for points
	const batch = screenData.batches[ g_batches.POINTS_BATCH ];
	g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, pointCount );

	// Add a line using Bresenham's algorithm (as individual points)
	const sx = x1 < x2 ? 1 : -1;
	const sy = y1 < y2 ? 1 : -1;
	let err = dx - dy;

	let x = x1;
	let y = y1;

	while( true ) {

		// Add current point
		g_batchHelpers.addVertexToBatch( batch, x, y, color );

		// Check if we've reached the end
		if( x === x2 && y === y2 ) {
			break;
		}

		// Bresenham error calculation
		const e2 = err * 2;
		if( e2 > -dy ) {
			err -= dy;
			x += sx;
		}
		if( e2 < dx ) {
			err += dx;
			y += sy;
		}
	}
}
