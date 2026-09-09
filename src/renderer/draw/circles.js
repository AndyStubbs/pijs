/**
 * Pi.js - Circles Drawing Module
 * 
 * Low-level drawing operations: circle drawing.
 * 
 * drawCircle, drawCirclePenSquare, drawCircleCircle
 * 
 * @module renderer/draw/circles
 */

"use strict";

import { isContextUnavailable } from "../context-state.js";

import * as g_batches from "../batches.js";
import * as g_geometry from "./geometry.js";
import { createPointWriter } from "./batch-helpers.js";


/**
 * Draw circle outline using pixel drawing (no bounds checking, GPU clipping)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Circle radius
 * @returns {void}
 */
export function drawCircle( screenData, cx, cy, radius ) {
	if( isContextUnavailable( screenData ) ) {
		return;
	}

	const color = screenData.color;
	const writePoint = createPointWriter( screenData, g_batches.POINTS_BATCH );

	// Nothing to draw
	if( radius <= 0 ) {
		return;
	}

	if( radius === 1 ) {
		writePoint( cx + 1, cy, color );
		return;
	}

	// Radius adjustment
	radius -= 1;

	// Single point
	if( radius === 1 ) {
		writePoint( cx + 1, cy, color );
		writePoint( cx - 1, cy, color );
		writePoint( cx, cy + 1, color );
		writePoint( cx, cy - 1, color );
		return;
	}

	// Midpoint circle algorithm (8-way symmetry)
	let x = radius;
	let y = 0;
	let err = 1 - x;

	// Initial symmetrical points (no duplicates here)
	writePoint( cx + x, cy + y, color );
	writePoint( cx - x, cy + y, color );
	writePoint( cx + y, cy + x, color );
	writePoint( cx + y, cy - x, color );

	while( x >= y ) {
		y++;
		if( err < 0 ) {
			err += 2 * y + 1;
		} else {
			x--;
			err += 2 * ( y - x ) + 1;
		}

		// Stop before reflected points repeat or extend past the diagonal.
		if( x < y ) {
			break;
		}

		if( x === y ) {

			// On the diagonal, 8-way symmetry collapses to 4 distinct pixels.
			// Emit each unique coordinate only once so there are no overlaps.
			writePoint( cx + x, cy + y, color );
			writePoint( cx - x, cy + y, color );
			writePoint( cx - x, cy - y, color );
			writePoint( cx + x, cy - y, color );
		} else {

			// 8-way symmetry, all distinct when x !== y
			writePoint( cx + x, cy + y, color );
			writePoint( cx + y, cy + x, color );
			writePoint( cx - y, cy + x, color );
			writePoint( cx - x, cy + y, color );
			writePoint( cx - x, cy - y, color );
			writePoint( cx - y, cy - x, color );
			writePoint( cx + y, cy - x, color );
			writePoint( cx + x, cy - y, color );
		}
	}
}


/**
 * Draw filled circle (no bounds checking, GPU clipping)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Circle radius
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawCircleFilled( screenData, cx, cy, radius, color ) {
	if( isContextUnavailable( screenData ) ) {
		return;
	}

	// Apply input adjustments for MCA consistency
	return g_geometry.drawCachedGeometry(
		screenData, g_geometry.FILLED_CIRCLE, radius, cx, cy, color
	);
}
