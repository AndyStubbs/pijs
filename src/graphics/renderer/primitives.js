/**
 * Pi.js - Primitives Drawing Module
 * 
 * High-level primitive drawing operations: lines, arcs, bezier curves.
 * 
 * @module graphics/renderer/primitives
 */

"use strict";

// Import required modules
import * as g_batches from "./batches.js";
import * as g_shapes from "./shapes.js";


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

	const baseIdx = batch.count;
	const vertexBase = baseIdx * batch.vertexComps;
	const colorBase = baseIdx * batch.colorComps;

	// Vertex 0
	batch.vertices[ vertexBase ] = x1;
	batch.vertices[ vertexBase + 1 ] = y1;
	batch.colors[ colorBase ] = color.r;
	batch.colors[ colorBase + 1 ] = color.g;
	batch.colors[ colorBase + 2 ] = color.b;
	batch.colors[ colorBase + 3 ] = color.a;

	// Vertex 1
	batch.vertices[ vertexBase + 2 ] = x2;
	batch.vertices[ vertexBase + 3 ] = y2;
	batch.colors[ colorBase + 4 ] = color.r;
	batch.colors[ colorBase + 5 ] = color.g;
	batch.colors[ colorBase + 6 ] = color.b;
	batch.colors[ colorBase + 7 ] = color.a;

	batch.count += 2;
}

/**
 * Helper function to add a rectangle (quad) to the geometry batch
 * 
 * @param {Object} batch - Geometry batch object
 * @param {number} x1 - Left X coordinate
 * @param {number} y1 - Top Y coordinate
 * @param {number} x2 - Right X coordinate
 * @param {number} y2 - Bottom Y coordinate
 * @param {Object} color - Color object with r, g, b, a
 * @returns {void}
 */
function addRectToBatch( batch, x1, y1, x2, y2, color ) {

	// Helper to add a vertex
	const addVertex = ( vx, vy ) => {
		const idx = batch.count * batch.vertexComps;
		const cidx = batch.count * batch.colorComps;

		batch.vertices[ idx     ] = vx;
		batch.vertices[ idx + 1 ] = vy;
		batch.colors[ cidx     ] = color.r;
		batch.colors[ cidx + 1 ] = color.g;
		batch.colors[ cidx + 2 ] = color.b;
		batch.colors[ cidx + 3 ] = color.a;
		batch.count++;
	};

	// First triangle: (x1,y1), (x2,y1), (x1,y2)
	addVertex( x1, y1 );
	addVertex( x2, y1 );
	addVertex( x1, y2 );

	// Second triangle: (x2,y1), (x2,y2), (x1,y2)
	addVertex( x2, y1 );
	addVertex( x2, y2 );
	addVertex( x1, y2 );
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
	const addVertex = ( vx, vy ) => {
		const idx = batch.count * batch.vertexComps;
		const cidx = batch.count * batch.colorComps;

		batch.vertices[ idx     ] = vx;
		batch.vertices[ idx + 1 ] = vy;
		batch.colors[ cidx     ] = color.r;
		batch.colors[ cidx + 1 ] = color.g;
		batch.colors[ cidx + 2 ] = color.b;
		batch.colors[ cidx + 3 ] = color.a;
		batch.count++;
	};

	addVertex( p1x, p1y );
	addVertex( p4x, p4y );
	addVertex( p2x, p2y );

	// Second triangle: p4, p3, p2
	addVertex( p4x, p4y );
	addVertex( p3x, p3y );
	addVertex( p2x, p2y );
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
export function drawLinePenSquare( screenData, x1, y1, x2, y2, color, penSize, penType ) {

	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];
	const halfWidth = penSize / 2;
	const extension = halfWidth; // Extend by half penSize for square caps

	// Estimate vertex count: 6 for line body (with extended endpoints)
	const vertexCount = 6;
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, vertexCount );

	// Draw line body (rectangle with extended endpoints for square caps)
	drawLineBody( batch, x1, y1, x2, y2, halfWidth, extension, color );
}

export function drawLinePenCircle( screenData, x1, y1, x2, y2, color, penSize, penType ) {

	// TODO: Implement geometry generation for lines with pen size >= 2
	// This will generate quads/geometry based on pen type and size

	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];
}

/**
 * Draw arc outline using midpoint circle algorithm
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Arc radius
 * @param {number} angle1 - Start angle in radians
 * @param {number} angle2 - End angle in radians
 * @param {number} color - Color value
 * @param {Function} penFn - Pen function for drawing pixels
 * @returns {void}
 */
export function drawArc( screenData, cx, cy, radius, angle1, angle2, color, penFn ) {

	// TODO: Implement drawArc using midpoint circle algorithm
}

/**
 * Draw bezier curve with adaptive tessellation
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} p0x - Control point 0 X
 * @param {number} p0y - Control point 0 Y
 * @param {number} p1x - Control point 1 X
 * @param {number} p1y - Control point 1 Y
 * @param {number} p2x - Control point 2 X
 * @param {number} p2y - Control point 2 Y
 * @param {number} p3x - Control point 3 X
 * @param {number} p3y - Control point 3 Y
 * @param {number} color - Color value
 * @param {Function} penFn - Pen function for drawing pixels
 * @returns {void}
 */
export function drawBezier( 
	screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color, penFn 
) {

	// TODO: Implement drawBezier with adaptive tessellation
}

