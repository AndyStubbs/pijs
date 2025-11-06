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
 * @returns {void}
 */
export function drawEllipse( screenData, cx, cy, rx, ry, color, fillColor ) {

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

	// Prepare outline batch
	const pointsBatch = screenData.batches[ g_batches.POINTS_BATCH ];
	g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, estimatedPixels );

	// Track plotted pixels to avoid duplicates
	const plotted = new Set();
	const plotPoint = ( px, py ) => {
		const ix = px | 0;
		const iy = py | 0;
		const key = ix + "," + iy;
		if( !plotted.has( key ) ) {
			plotted.add( key );
			g_batchHelpers.addVertexToBatch( pointsBatch, ix, iy, color );
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

	// Optional: collect scanlines for fill (no caching)
	const doFill = fillColor != null && rx >= 1 && ry >= 1;
	let scanlineMinMax = null;
	if( doFill ) {
		scanlineMinMax = new Map(); // Map<y, {left: x, right: x}>
		const updateScanline = ( px, py ) => {
			const pixelY = py | 0;
			const pixelX = px | 0;
			if( !scanlineMinMax.has( pixelY ) ) {
				if( pixelX < 0 ) {
					scanlineMinMax.set( pixelY, { "left": pixelX, "right": Infinity } );
				} else if( pixelX > 0 ) {
					scanlineMinMax.set( pixelY, { "left": -Infinity, "right": pixelX } );
				} else {
					scanlineMinMax.set( pixelY, { "left": pixelX, "right": pixelX } );
				}
			} else {
				const limits = scanlineMinMax.get( pixelY );

				// Find innermost border pixels (closest to center) to handle multiple border pixels
				if( pixelX < 0 && pixelX > limits.left ) {
					limits.left = pixelX;
				}
				if( pixelX > 0 && pixelX < limits.right ) {
					limits.right = pixelX;
				}
			}
		};

		// Seed
		updateScanline(  x,  y );
		updateScanline( -x,  y );
		updateScanline( -x, -y );
		updateScanline(  x, -y );

		// Wrap symmetric updater for reuse
		var updateScanlineSym = ( sx, sy ) => {
			updateScanline(  sx,  sy );
			updateScanline( -sx,  sy );
			updateScanline( -sx, -sy );
			updateScanline(  sx, -sy );
		};
	}

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

		// Update fill scanlines
		if( doFill ) {
			updateScanlineSym( x, y );
		}
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

		// Update fill scanlines
		if( doFill ) {
			updateScanlineSym( x, y );
		}
	}

	// Emit fill geometry if requested
	if( doFill ) {
		const sortedYCoords = [];
		for( const [ currentY ] of scanlineMinMax.entries() ) {
			sortedYCoords.push( currentY );
		}
		sortedYCoords.sort( ( a, b ) => a - b );

		if( sortedYCoords.length >= 3 ) {
			const interiorRowCount = sortedYCoords.length - 2;
			const vertexCount = interiorRowCount * 6;
			g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, vertexCount );
			const geoBatch = screenData.batches[ g_batches.GEOMETRY_BATCH ];

			for( let row = 1; row < sortedYCoords.length - 1; row++ ) {
				const currentY = sortedYCoords[ row ];
				const limits = scanlineMinMax.get( currentY );

				// Skip if we don't have valid limits (shouldn't happen, but be safe)
				if( limits.left === -Infinity || limits.right === Infinity ) {
					continue;
				}

				// Get the interior span by moving 1 pixel inward from innermost border pixels
				const xStart = limits.left + 1;
				const xEnd = limits.right - 1;
				if( xEnd < xStart ) {
					continue;
				}

				// Adjust Y to align fill with outline
				const yWorld = cy + currentY;
				const x1 = cx + xStart;
				const x2 = cx + xEnd + 1;

				g_batchHelpers.addVertexToBatch( geoBatch, x1, yWorld, fillColor );
				g_batchHelpers.addVertexToBatch( geoBatch, x2, yWorld, fillColor );
				g_batchHelpers.addVertexToBatch( geoBatch, x1, yWorld + 1, fillColor );
				g_batchHelpers.addVertexToBatch( geoBatch, x2, yWorld, fillColor );
				g_batchHelpers.addVertexToBatch( geoBatch, x2, yWorld + 1, fillColor );
				g_batchHelpers.addVertexToBatch( geoBatch, x1, yWorld + 1, fillColor );
			}
		}
	}
}
