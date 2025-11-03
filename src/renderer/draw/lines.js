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
import * as g_shapes from "./filled-shapes.js";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize primitives module
 * 
 * @returns {void}
 */
export function init() {
	// No initialization needed
}

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

	g_batchHelpers.addLineToBatch( batch, x1, y1, x2, y2, color );
}

/**
 * Draw line with square pen (geometry-based, for pen size >= 2)
 *
 * @param {Object} screenData - Screen data object
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {Object} color - Color object with r, g, b, a
 * @param {number} penSize - Pen size
 * @returns {void}
 */
export function drawLineSquare( screenData, x1, y1, x2, y2, color, penSize ) {
	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];

	// Handle degenerate line (single point)
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lengthSq = dx * dx + dy * dy;
	if ( lengthSq < 0.001 * 0.001 ) {

		// Draw a filled square for a degenerate line
		// The `penSize` will be the side length of the square
		const halfPen = Math.floor( penSize / 2 );
		g_shapes.drawFilledRect(
			screenData,
			x1 - halfPen,
			y1 - halfPen,
			penSize,
			penSize,
			color
		);
		return;
	}

	// For square caps, the line body extends by (penSize / 2)
	// We pass this as `halfWidth` to `drawLineBody` which will handle
	// the extension logic.
	const halfWidth = penSize / 2;

	// Estimate vertex count: 6 for line body (2 triangles)
	const vertexCount = 6;
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, vertexCount );

	// Draw line body as a rectangle
	// We'll calculate the extension inside drawLineBody now.
	drawLineBody( batch, x1, y1, x2, y2, penSize, halfWidth, color );
}

/**
 * Draw line with circle pen (geometry-based, for pen size >= 2)
 * Draws a line body and adds circular caps at both endpoints
 *
 * @param {Object} screenData - Screen data object
 * @param {number} x1 - Start X coordinate (center of cap)
 * @param {number} y1 - Start Y coordinate (center of cap)
 * @param {number} x2 - End X coordinate (center of cap)
 * @param {number} y2 - End Y coordinate (center of cap)
 * @param {Object} color - Color object with r, g, b, a
 * @param {number} penSize - Pen size
 * @returns {void}
 */
export function drawLineCircle( screenData, x1, y1, x2, y2, color, penSize ) {
	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];

	const radius = penSize / 2; // Half penSize is the radius of the caps

	const dx = x2 - x1;
	const dy = y2 - y1;
	const lengthSq = dx * dx + dy * dy;

	// Handle degenerate line (essentially a point)
	if ( lengthSq < 0.001 * 0.001 ) {
		g_shapes.drawFilledCircle( screenData, x1, y1, radius, color );
		return;
	}

	const length = Math.sqrt( lengthSq );
	const dirX = dx / length;
	const dirY = dy / length;

	// The line body should extend from x1,y1 to x2,y2 without extra extension.
	// The `halfExtension` parameter for `drawLineBody` should be 0.
	const halfExtensionForBody = 0;
	const vertexCount = 6;
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, vertexCount );

	// Draw the main rectangular body of the line
	drawLineBody( batch, x1, y1, x2, y2, penSize, halfExtensionForBody, color );

	// Now for the caps. The previous fix for inversion was:
	// g_batchHelpers.drawHalfCircleCap( screenData, x1, y1, radius, color, dirX, dirY );
	// g_batchHelpers.drawHalfCircleCap( screenData, x2, y2, radius, color, -dirX, -dirY );
	// This was based on the assumption that `dirX, dirY` points FROM the flat edge TO the curved part.
	// If the caps are overlapping, it might be that `drawHalfCircleCap` is drawing a slightly
	// larger segment than a perfect half-circle, or its internal positioning needs adjustment.

	// Let's ensure the caps are drawn *at* x1,y1 and x2,y2, and they seamlessly
	// join the line body. The directions for the caps are such that their curved
	// part points *outward* from the line segment.

	// Cap at (x1, y1): Curved part should point away from (x2, y2)
	// The vector pointing from (x1, y1) to (x2, y2) is (dirX, dirY).
	// So the cap at (x1, y1) should be oriented by (-dirX, -dirY) for its curve to face away.
	g_batchHelpers.drawHalfCircleCap( screenData, x1, y1, radius, color, dirX, dirY );

	// Cap at (x2, y2): Curved part should point away from (x1, y1)
	// The vector pointing from (x1, y1) to (x2, y2) is (dirX, dirY).
	// So the cap at (x2, y2) should be oriented by (dirX, dirY) for its curve to face away.
	g_batchHelpers.drawHalfCircleCap( screenData, x2, y2, radius, color, -dirX, -dirY );	
}

/**
 * Helper function to draw a line segment body (rectangle) for thick lines
 *
 * @param {Object} batch - Geometry batch object
 * @param {number} x1 - Start X coordinate (center of cap)
 * @param {number} y1 - Start Y coordinate (center of cap)
 * @param {number} x2 - End X coordinate (center of cap)
 * @param {number} y2 - End Y coordinate (center of cap)
 * @param {number} penSize - Pen size (full width)
 * @param {number} halfExtension - How much to extend the line body past x1,y1 and x2,y2.
 *                                 (e.g., penSize / 2 for square caps, 0 for round caps)
 * @param {Object} color - Color object with r, g, b, a
 * @returns {void}
 */
function drawLineBody( batch, x1, y1, x2, y2, penSize, halfExtension, color ) {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const length = Math.sqrt( dx * dx + dy * dy );

	if ( length < 0.001 ) {
		return;
	}

	const dirX = dx / length;
	const dirY = dy / length;

	// This is the actual start/end point of the *rectangle body*
	// It's offset from the given x1,y1 by the halfExtension.
	const bodyStartX = x1 - dirX * halfExtension;
	const bodyStartY = y1 - dirY * halfExtension;
	const bodyEndX = x2 + dirX * halfExtension;
	const bodyEndY = y2 + dirY * halfExtension;

	// Half-width of the line (distance from center line to edge)
	const halfPenWidth = penSize / 2;

	// Calculate perpendicular vector (normalized)
	const perpX = -dirY;
	const perpY = dirX;

	// Calculate the four corners of the line rectangle using the `bodyStart/End` points
	const p1x = bodyStartX + perpX * halfPenWidth;
	const p1y = bodyStartY + perpY * halfPenWidth;
	const p2x = bodyStartX - perpX * halfPenWidth;
	const p2y = bodyStartY - perpY * halfPenWidth;

	const p3x = bodyEndX - perpX * halfPenWidth;
	const p3y = bodyEndY - perpY * halfPenWidth;
	const p4x = bodyEndX + perpX * halfPenWidth;
	const p4y = bodyEndY + perpY * halfPenWidth;

	// Add the rectangle as two triangles
	g_batchHelpers.addTriangleToBatch( batch, p1x, p1y, p4x, p4y, p2x, p2y, color );
	g_batchHelpers.addTriangleToBatch( batch, p4x, p4y, p3x, p3y, p2x, p2y, color );
}