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
export function drawLineSquare( screenData, x1, y1, x2, y2, color, penSize, penType ) {

	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];
	const halfWidth = penSize / 2;
	const extension = halfWidth; // Extend by half penSize for square caps

	// Estimate vertex count: 6 for line body (with extended endpoints)
	const vertexCount = 6;
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, vertexCount );

	// Draw line body (rectangle with extended endpoints for square caps)
	drawLineBody( batch, x1, y1, x2, y2, halfWidth, extension, color );
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
export function drawLineCircle( screenData, x1, y1, x2, y2, color, penSize, penType ) {

	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];
	const halfWidth = Math.floor( penSize / 2 );
	const radius = halfWidth;

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

	drawLineBody( batch, x1, y1, x2, y2, halfWidth, extension, color );

	// Draw circular caps at both endpoints
	g_shapes.drawFilledCircle( screenData, x1, y1, radius, color );
	g_shapes.drawFilledCircle( screenData, x2, y2, radius, color );
}


/**
 * Helper function to draw a line segment body (rectangle) for thick lines
 * 
 * @param {Object} batch - Geometry batch object
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {number} halfWidth - Half the line width (penSize / 2)
 * @param {number} extension - Amount to extend the line in both directions (for caps)
 * @param {Object} color - Color object with r, g, b, a
 * @returns {void}
 */
function drawLineBody( batch, x1, y1, x2, y2, halfWidth, extension, color ) {

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
	const extX1 = x1 - dirX * extension;
	const extY1 = y1 - dirY * extension;
	const extX2 = x2 + dirX * extension;
	const extY2 = y2 + dirY * extension;

	// Calculate perpendicular vector (normalized)
	const perpX = -dirY;
	const perpY = dirX;

	// Calculate the four corners of the line rectangle
	const halfW = halfWidth;
	const p1x = extX1 + perpX * halfW;
	const p1y = extY1 + perpY * halfW;
	const p2x = extX1 - perpX * halfW;
	const p2y = extY1 - perpY * halfW;
	const p3x = extX2 - perpX * halfW;
	const p3y = extY2 - perpY * halfW;
	const p4x = extX2 + perpX * halfW;
	const p4y = extY2 + perpY * halfW;

	// Add the rectangle as two triangles
	// First triangle: p1, p4, p2
	g_batchHelpers.addTriangleToBatch( batch, p1x, p1y, p4x, p4y, p2x, p2y, color );

	// Second triangle: p4, p3, p2
	g_batchHelpers.addTriangleToBatch( batch, p4x, p4y, p3x, p3y, p2x, p2y, color );
}
