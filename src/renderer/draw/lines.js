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

import * as g_contextState from "../context-state.js";
import * as g_batches from "../batches.js";
import * as g_batchHelpers from "./batch-helpers.js";


/*************************************************************************************************
 * Module Initialization
 ************************************************************************************************/

/**
 * Draw line using geometry for higher precision and consistency and not WebGL LINES
 *
 * @param {Object} screenData - Screen data object
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @returns {void}
 */
export function drawLine( screenData, x1, y1, x2, y2 ) {
	if( g_contextState.isContextUnavailable( screenData ) ) {
		return;
	}

	const color = screenData.color;

	// Distances used by Bresenham's algorithm
	const dx = Math.abs( x2 - x1 );
	const dy = Math.abs( y2 - y1 );
	const writePoint = g_batchHelpers.createPointWriter( screenData, g_batches.POINTS_BATCH );

	// Add a line using Bresenham's algorithm (as individual points)
	let sx;
	if( x1 < x2 ) {
		sx = 1;
	} else {
		sx = -1;
	}
	let sy;
	if( y1 < y2 ) {
		sy = 1;
	} else {
		sy = -1;
	}
	let err = dx - dy;

	let x = x1;
	let y = y1;

	while( true ) {

		// Add current point
		writePoint( x, y, color );

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
