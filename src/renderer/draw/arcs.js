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

	// Normalize angles to [0, 2π)
	let a1 = normalizeAngle( angle1 );
	let a2 = normalizeAngle( angle2 );

	// CCW span from a1 to a2 in [0, 2π)
	let span = a2 - a1;
	if( span < 0 ) {
		span += TWO_PI;
	}

	const isFullCircle = span >= TWO_PI - FULL_CIRCLE_EPSILON;
	const isLargeArc = !isFullCircle && span > Math.PI;

	// Estimate pixel count based on span
	const estimatedPixels = Math.max(
		4,
		Math.ceil( radius * ( isFullCircle ? TWO_PI : span ) )
	);

	// Prepare batch
	const batchIndex = g_batches.POINTS_BATCH;
	g_batches.prepareBatch( screenData, batchIndex, estimatedPixels );
	const batch = screenData.batches[ batchIndex ];

	// Precompute start/end direction vectors for angle tests
	let startX = 0;
	let startY = 0;
	let endX = 0;
	let endY = 0;

	if( !isFullCircle ) {
		startX = Math.cos( a1 );
		startY = Math.sin( a1 );
		endX = Math.cos( a2 );
		endY = Math.sin( a2 );
	}

	// Per-pixel plot helper with arc angle filtering (no atan2)
	let setPixel;

	if( isFullCircle ) {
		setPixel = function( px, py ) {
			g_batchHelpers.addVertexToBatch( batch, px, py, color );
		};
	} else if( !isLargeArc ) {

		// Small arc: span <= π
		// Inside if: cross( startDir, w ) >= 0 && cross( endDir, w ) <= 0
		setPixel = function( px, py ) {
			const dx = px - cx;
			const dy = py - cy;

			if( dx === 0 && dy === 0 ) {
				return;
			}

			const cuw = startX * dy - startY * dx;
			const cvw = endX * dy - endY * dx;

			if( cuw >= 0 && cvw <= 0 ) {
				g_batchHelpers.addVertexToBatch( batch, px, py, color );
			}
		};
	} else {

		// Large arc: span > π
		// The gap is the small arc from endDir to startDir.
		// w is inside arc if it is NOT in the gap:
		// gap if: cross( endDir, w ) >= 0 && cross( startDir, w ) <= 0
		setPixel = function( px, py ) {
			const dx = px - cx;
			const dy = py - cy;

			if( dx === 0 && dy === 0 ) {
				return;
			}

			const cuw = startX * dy - startY * dx;
			const cvw = endX * dy - endY * dx;

			if( !( cvw >= 0 && cuw <= 0 ) ) {
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

			// Diagonal: 8-way symmetry collapses to 4 unique pixels
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
