/**
 * Pi.js - Arcs Drawing Module
 * 
 * Low-level drawing operations: arcs drawing.
 * 
 * drawArc, drawArcSquare, drawArcCircle
 * 
 * @module renderer/draw/arcs
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_batchHelpers from "./batch-helpers.js";

const TWO_PI = 2 * Math.PI;
const FULL_CIRCLE_EPSILON = 0.0001;

/**
 * Draw arc outline using midpoint circle algorithm
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Arc radius
 * @param {number} angle1 - Start angle in radians
 * @param {number} angle2 - End angle in radians
 * @returns {void}
 */
export function drawArc( screenData, cx, cy, radius, angle1, angle2 ) {
	const color = screenData.color;

	// Normalize angles once into [0, 2π)
	let a1 = normalizeAngle( angle1 );
	let a2 = normalizeAngle( angle2 );

	// Compute angular span in [0, 2π)
	let span = a2 - a1;
	if( span < 0 ) {
		span += TWO_PI;
	}

	const isFullCircle = span >= TWO_PI - FULL_CIRCLE_EPSILON;
	const isWrapped = !isFullCircle && a2 < a1;

	// For wrapped arcs, treat a2 as an extended angle so [a1, a2] never wraps
	if( isWrapped ) {
		a2 += TWO_PI;
	}

	// Estimate number of pixels we will plot, based on span (not always full circle)
	const estimatedPixels = Math.max(
		4,
		Math.ceil( radius * ( isFullCircle ? TWO_PI : span ) )
	);

	// Prepare batch
	const batchIndex = g_batches.POINTS_BATCH;
	g_batches.prepareBatch( screenData, batchIndex, estimatedPixels );
	const batch = screenData.batches[ batchIndex ];

	let setPixel;
	if( isFullCircle ) {
		setPixel = function( px, py ) {
			g_batchHelpers.addVertexToBatch( batch, px, py, color );
		};
	} else {
		setPixel = function( px, py ) {
			const dx = px - cx;
			const dy = py - cy;

			let angle = Math.atan2( dy, dx ); // [-π, π]
			if( angle < 0 ) {
				angle += TWO_PI; // [0, 2π)
			}

			// For wrapped range, map angles below a1 into extended [2π, 4π)
			if( isWrapped && angle < a1 ) {
				angle += TWO_PI;
			}

			if( angle >= a1 && angle <= a2 ) {
				g_batchHelpers.addVertexToBatch( batch, px, py, color );
			}
		};
	}


	// Adjust radius (consistent with filled circle implementation)
	const finalRadius = radius - 1;

	// Handle special cases
	if( finalRadius < 1 ) {
		return;
	}

	if( finalRadius === 1 ) {

		// Draw 4 cardinal points
		setPixel( cx + 1, cy );
		setPixel( cx - 1, cy );
		setPixel( cx, cy + 1 );
		setPixel( cx, cy - 1 );
		return;
	}

	// Midpoint circle algorithm
	let x = finalRadius;
	let y = 0;
	let err = 1 - x;

	// Initial symmetrical points (no duplicates here)
	setPixel( cx + x, cy + y );
	setPixel( cx - x, cy + y );
	setPixel( cx + y, cy + x );
	setPixel( cx + y, cy - x );

	while( x >= y ) {
		y++;

		if( err < 0 ) {
			err += 2 * y + 1;
		} else {
			x--;
			err += 2 * ( y - x ) + 1;
		}

		if( x === y ) {

			// On the diagonal, 8-way symmetry collapses to 4 distinct pixels.
			// Emit each unique coordinate only once so there are no overlaps.
			setPixel( cx + x, cy + y );
			setPixel( cx - x, cy + y );
			setPixel( cx - x, cy - y );
			setPixel( cx + x, cy - y );
		} else {

			// 8-way symmetry, all distinct when x !== y
			setPixel( cx + x, cy + y );
			setPixel( cx + y, cy + x );
			setPixel( cx - y, cy + x );
			setPixel( cx - x, cy + y );
			setPixel( cx - x, cy - y );
			setPixel( cx - y, cy - x );
			setPixel( cx + y, cy - x );
			setPixel( cx + x, cy - y );
		}
	}
}

function normalizeAngle( angle ) {
	let normalized = angle % TWO_PI;
	if( normalized < 0 ) {
		normalized += TWO_PI;
	}
	return normalized;
}
