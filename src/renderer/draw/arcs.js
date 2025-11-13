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

	// Normalize angles to 0-2π range
	let a1 = normalizeAngle( angle1 );
	let a2 = normalizeAngle( angle2 );

	// Check for winding (when angle1 > angle2, arc wraps around 2π)
	const winding = a1 > a2;

	let isAngleInArc;
	if( winding ) {
		isAngleInArc = ( angle ) => angle >= a1 || angle <= a2;
	} else {
		isAngleInArc = ( angle ) => angle >= a1 && angle <= a2;
	}

	// Estimate pixel count: approximately 2 * PI * radius pixels
	const estimatedPixels = Math.max( 4, Math.ceil( 2 * Math.PI * radius ) );

	// Get the points batch and prepare it
	const batch = screenData.batches[ g_batches.POINTS_BATCH ];
	g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, estimatedPixels );

	// Track plotted pixels to avoid duplicates from 8-way symmetry
	const plotted = new Set();

	// Helper function to check if angle is within arc range and draw pixel uniquely
	const setPixel = ( px, py ) => {

		// Calculate angle of this point relative to center
		let angle = Math.atan2( py - cy, px - cx );
		if( angle < 0 ) {
			angle += TWO_PI;
		}
		//angle = normalizeAngle( angle );
		//const angle = ( Math.atan2( py - cy, px - cx ) + TWO_PI ) % TWO_PI;

		if( isAngleInArc( angle ) ) {
			const key = ( px << 16 ) | ( py & 0xFFFF );
			if( plotted.has( key ) ) {
				return;
			}
			plotted.add( key );
			g_batchHelpers.addVertexToBatch( batch, px, py, color );
		}
	};

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

	// Draw initial symmetrical points
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

		// Apply 8-way symmetry to draw all octants
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

function normalizeAngle( angle ) {
	let normalized = angle % TWO_PI;
	if( normalized < 0 ) {
		normalized += TWO_PI;
	}
	return normalized;
}
