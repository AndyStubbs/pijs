/**
 * Pi.js - Ellipses Drawing Module
 * 
 * Low-level drawing operations: ellipse drawing.
 * 
 * drawEllipse, drawEllipseSquare, drawEllipseCircle
 * 
 * @module renderer/draw/ellipses
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_textures from "../textures.js";
import * as g_utils from "../../core/utils.js";
import * as g_batchHelpers from "./batch-helpers.js";


/**
 * Draw ellipse outline or filled
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} rx - Radius X
 * @param {number} ry - Radius Y
 * @param {number} color - Outline color
 * @param {number} fillColor - Fill color (or null for outline only)
 * @param {Function} penFn - Pen function for outline pixels
 * @param {Function} blendFn - Blend function for fill pixels
 * @returns {void}
 */
export function drawEllipse( screenData, cx, cy, rx, ry, color, fillColor, penFn, blendFn ) {

	// Validate radii
	if( rx < 0 || ry < 0 ) {
		return;
	}

	// Handle trivial cases
	if( rx === 0 && ry === 0 ) {
		g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, 1 );
		const batch = screenData.batches[ g_batches.POINTS_BATCH ];
		g_batchHelpers.addVertexToBatch( batch, cx, cy, color );
		return;
	}

	// Estimate pixel count using Ramanujan perimeter approximation
	// P ≈ π[ 3(a+b) − sqrt{ (3a+b)(a+3b) } ] where a=rx, b=ry
	const a = rx;
	const b = ry;
	const perimeter = Math.PI * ( 3 * ( a + b ) - Math.sqrt( ( 3 * a + b ) * ( a + 3 * b ) ) );
	const estimatedPixels = Math.max( 8, Math.ceil( perimeter ) );

	// Prepare batch
	const batch = screenData.batches[ g_batches.POINTS_BATCH ];
	g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, estimatedPixels );

	// Track plotted pixels to avoid duplicates
	const plotted = new Set();
	const plotPoint = ( px, py ) => {
		const ix = px | 0;
		const iy = py | 0;
		const key = ix + "," + iy;
		if( !plotted.has( key ) ) {
			plotted.add( key );
			g_batchHelpers.addVertexToBatch( batch, ix, iy, color );
		}
	};

	// Symmetric plotting for the four quadrants
	const plotSymmetric = ( x, y ) => {
		plotPoint( cx + x, cy + y );
		plotPoint( cx - x, cy + y );
		plotPoint( cx - x, cy - y );
		plotPoint( cx + x, cy - y );
	};

	// Midpoint ellipse algorithm
	let x = 0;
	let y = ry;

	const rx2 = rx * rx;
	const ry2 = ry * ry;
	let dx = 2 * ry2 * x;
	let dy = 2 * rx2 * y;

	// Decision parameter for region 1
	let d1 = ry2 - rx2 * ry + 0.25 * rx2;
	plotSymmetric( x, y );

	// Region 1
	while( dx < dy ) {
		if( d1 < 0 ) {
			x += 1;
			dx = dx + 2 * ry2;
			d1 = d1 + dx + ry2;
		} else {
			x += 1;
			y -= 1;
			dx = dx + 2 * ry2;
			dy = dy - 2 * rx2;
			d1 = d1 + dx - dy + ry2;
		}

		plotSymmetric( x, y );
	}

	// Decision parameter for region 2
	let d2 = ry2 * ( x + 0.5 ) * ( x + 0.5 ) + rx2 * ( y - 1 ) * ( y - 1 ) - rx2 * ry2;

	// Region 2
	while( y >= 0 ) {
		if( d2 > 0 ) {
			y -= 1;
			dy = dy - 2 * rx2;
			d2 = d2 + rx2 - dy;
		} else {
			y -= 1;
			x += 1;
			dx = dx + 2 * ry2;
			dy = dy - 2 * rx2;
			d2 = d2 + dx - dy + rx2;
		}

		plotSymmetric( x, y );
	}
}

