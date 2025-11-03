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
 * @param {number} penType - Pen type (unused for square pen)
 * @returns {void}
 */
export function drawLineSquare( screenData, x1, y1, x2, y2, color, penSize ) {

	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];
	
	// Calculate extension for square caps (half penSize, favoring top/left for even)
	let extension = Math.floor( penSize / 2 );

	// Estimate vertex count: 6 for line body (with extended endpoints)
	const vertexCount = 6;
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, vertexCount );

	// Draw line body (rectangle with extended endpoints for square caps)
	drawLineBody( batch, x1, y1, x2, y2, penSize, extension, color );
}

/**
 * Draw line with circle pen (geometry-based, for pen size >= 2)
 * Draws a line body and adds circular caps at both endpoints
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {Object} color - Color object with r, g, b, a
 * @param {number} penSize - Pen size
 * @param {number} penType - Pen type (unused for circle pen)
 * @returns {void}
 */
export function drawLineCircle( screenData, x1, y1, x2, y2, color, penSize ) {

	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];
	
	// Calculate radius for circle caps (half penSize, favoring top/left for even)
	const radius = Math.floor( ( penSize - 1 ) / 2 );

	// let radius;
	// if( penSize % 2 === 0 ) {
	// 	radius = penSize / 2;
	// } else {
	// 	radius = Math.floor( penSize / 2 );
	// }

	// Calculate line direction vector to check for degenerate lines
	const dx = x2 - x1;
	const dy = y2 - y1;
	const length = Math.sqrt( dx * dx + dy * dy );

	// For degenerate lines (essentially a point), just draw a single circle
	if( length < 0.001 ) {
		g_shapes.drawFilledCircle( screenData, x1, y1, radius, color );
		return;
	}

	// Draw line body without extension (caps will cover the ends)
	const extension = 0;
	const vertexCount = 6;
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, vertexCount );

	drawLineBody( batch, x1, y1, x2, y2, penSize, extension, color );

	// Draw semicircle caps oriented along the line direction
	const dirX = dx / length;
	const dirY = dy / length;
	g_batchHelpers.drawHalfCircleCap( screenData, x1, y1, radius, color, dirX, dirY, false );
	g_batchHelpers.drawHalfCircleCap( screenData, x2, y2, radius, color, dirX, dirY, true );
}


/**
 * Helper function to draw a line segment body (rectangle) for thick lines
 * 
 * @param {Object} batch - Geometry batch object
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {number} penSize - Pen size (full width)
 * @param {number} extension - Amount to extend the line in both directions (for caps)
 * @param {Object} color - Color object with r, g, b, a
 * @returns {void}
 */
function drawLineBody( batch, x1, y1, x2, y2, penSize, extension, color ) {

	// Calculate line direction vector
	const dx = x2 - x1;
	const dy = y2 - y1;
	const length = Math.sqrt( dx * dx + dy * dy );

	// Avoid division by zero for degenerate lines
	if( length < 0.001 ) {
		return;
	}

	// Normalize direction vector
	const dirX = dx / length;
	const dirY = dy / length;

	// Extend line endpoints by extension amount in both directions
	let extX1 = x1;
	let extX2 = x2;
	let extY1 = y1;
	let extY2 = y2;
	if( extension > 0 ) {
		extX1 = x1 - dirX * ( extension + 1 );
		extY1 = y1 - dirY * ( extension + 1 );
		extX2 = x2 + dirX * ( extension - 1 );
		extY2 = y2 + dirY * ( extension - 1 );
	}

	// Calculate perpendicular vector (normalized)
	const perpX = -dirY;
	const perpY = dirX;

	// Calculate offsets for line width (favor top/left for even penSize)
	let radius = Math.floor( penSize / 2 );
	let offsetLeft, offsetRight, offsetTop, offsetBottom;

	offsetTop = radius;
	offsetBottom = radius;

	if( penSize % 2 === 0 ) {

		// For even sizes, center the line with equal pixels on each side
		// The white reference line should be centered within the green line body
		// Total width = penSize, so radius pixels on each side
		offsetLeft = radius - 1;
		offsetRight = radius + 1;
	} else {

		// For odd sizes, center the line (left side gets the extra pixel)
		offsetLeft = radius;
		offsetRight = radius + 1;
	}

	// Calculate the four corners of the line rectangle
	const p1x = extX1 + perpX * offsetLeft;
	const p1y = extY1 + perpY * offsetTop;
	const p2x = extX1 - perpX * offsetRight;
	const p2y = extY1 - perpY * offsetTop;
	const p3x = extX2 - perpX * offsetRight;
	const p3y = extY2 - perpY * offsetBottom;
	const p4x = extX2 + perpX * offsetLeft;
	const p4y = extY2 + perpY * offsetBottom;

	// Add the rectangle as two triangles
	// First triangle: p1, p4, p2
	g_batchHelpers.addTriangleToBatch( batch, p1x, p1y, p4x, p4y, p2x, p2y, color );

	// Second triangle: p4, p3, p2
	g_batchHelpers.addTriangleToBatch( batch, p4x, p4y, p3x, p3y, p2x, p2y, color );
}
