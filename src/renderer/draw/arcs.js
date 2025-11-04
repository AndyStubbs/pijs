/**
 * Pi.js - Arcs Drawing Module
 * 
 * Low-level drawing operations: arcs drawing.
 * 
 * drawArcPixel, drawArcSquare, drawArcCircle
 * 
 * @module renderer/draw/arcs
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_utils from "../../core/utils.js";
import * as g_batchHelpers from "./batch-helpers.js";


/**
 * Draw arc outline using midpoint circle algorithm
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Arc radius
 * @param {number} angle1 - Start angle in radians
 * @param {number} angle2 - End angle in radians
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawArcPixel( screenData, cx, cy, radius, angle1, angle2, color ) {

	// Convert angles from radians to degrees and normalize to 0-360
	let a1 = g_utils.radiansToDegrees( angle1 );
	let a2 = g_utils.radiansToDegrees( angle2 );
	a1 = ( a1 + 360 ) % 360;
	a2 = ( a2 + 360 ) % 360;

	// Check for winding (when angle1 > angle2, arc wraps around 360 degrees)
	const winding = a1 > a2;

	// Adjust radius (consistent with filled circle implementation)
	const adjustedRadius = radius - 1;
	let finalRadius = adjustedRadius;
	if( finalRadius < 0 ) {
		finalRadius = 0;
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
		let angle = Math.atan2( py - cy, px - cx ) * ( 180 / Math.PI );
		angle = ( angle + 360 ) % 360;

		// Check if angle is within arc range
		let shouldDraw = false;
		if( winding ) {

			// Arc wraps around 360 degrees
			shouldDraw = angle >= a1 || angle <= a2;
		} else {

			// Normal arc
			shouldDraw = angle >= a1 && angle <= a2;
		}

		if( shouldDraw ) {

			// De-duplicate exact pixel coordinates
			const keyX = px | 0;
			const keyY = py | 0;
			const key = keyX + "," + keyY;
			if( !plotted.has( key ) ) {
				plotted.add( key );
				g_batchHelpers.addVertexToBatch( batch, keyX, keyY, color );
			}
		}
	};

	// Handle special cases
	if( finalRadius === 0 ) {

		// Single point
		setPixel( cx, cy );
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
