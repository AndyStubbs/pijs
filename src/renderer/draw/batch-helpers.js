/**
 * Pi.js - Batch Drawing Helpers Module
 * 
 * Shared helper functions for adding geometry to batches.
 * Provides common operations like adding vertices, quads, and triangles.
 * 
 * @module renderer/draw/batch-helpers
 */

"use strict";


/***************************************************************************************************
 * Vertex Helpers
 ***************************************************************************************************/


/**
 * Add a single vertex to a geometry or points batch
 * 
 * @param {Object} batch - Batch object (GEOMETRY_BATCH or POINTS_BATCH)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function addVertexToBatch( batch, x, y, color ) {

	const idx = batch.count * batch.vertexComps;
	const cidx = batch.count * batch.colorComps;

	batch.vertices[ idx     ] = x;
	batch.vertices[ idx + 1 ] = y;
	batch.colors[ cidx     ] = color.r;
	batch.colors[ cidx + 1 ] = color.g;
	batch.colors[ cidx + 2 ] = color.b;
	batch.colors[ cidx + 3 ] = color.a;

	batch.count++;
}

/**
 * Add a triangle (3 vertices) to a geometry batch
 * 
 * @param {Object} batch - Geometry batch object
 * @param {number} x1 - First vertex X coordinate
 * @param {number} y1 - First vertex Y coordinate
 * @param {number} x2 - Second vertex X coordinate
 * @param {number} y2 - Second vertex Y coordinate
 * @param {number} x3 - Third vertex X coordinate
 * @param {number} y3 - Third vertex Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function addTriangleToBatch( batch, x1, y1, x2, y2, x3, y3, color ) {

	addVertexToBatch( batch, x1, y1, color );
	addVertexToBatch( batch, x2, y2, color );
	addVertexToBatch( batch, x3, y3, color );
}

/**
 * Add a quad (rectangle as two triangles) to a geometry batch
 * The quad is defined by two corner points (x1,y1) and (x2,y2) forming a rectangle
 * 
 * @param {Object} batch - Geometry batch object
 * @param {number} x1 - Left/bottom-left X coordinate
 * @param {number} y1 - Left/bottom-left Y coordinate
 * @param {number} x2 - Right/top-right X coordinate
 * @param {number} y2 - Right/top-right Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function addQuadToBatch( batch, x1, y1, x2, y2, color ) {

	// Truncate coordinates for pixel-perfect rendering
	const vx1 = x1 | 0;
	const vy1 = y1 | 0;
	const vx2 = x2 | 0;
	const vy2 = y2 | 0;

	// First triangle: (x1,y1), (x2,y1), (x1,y2)
	addVertexToBatch( batch, vx1, vy1, color );
	addVertexToBatch( batch, vx2, vy1, color );
	addVertexToBatch( batch, vx1, vy2, color );

	// Second triangle: (x2,y1), (x2,y2), (x1,y2)
	addVertexToBatch( batch, vx2, vy1, color );
	addVertexToBatch( batch, vx2, vy2, color );
	addVertexToBatch( batch, vx1, vy2, color );
}

/**
 * Add two vertices for a line segment to a lines batch
 * 
 * @param {Object} batch - Lines batch object
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function addLineToBatch( batch, x1, y1, x2, y2, color ) {

	const baseIdx = batch.count;
	const vertexBase = baseIdx * batch.vertexComps;
	const colorBase = baseIdx * batch.colorComps;

	// Vertex 0 (start point)
	batch.vertices[ vertexBase     ] = x1;
	batch.vertices[ vertexBase + 1 ] = y1;
	batch.colors[ colorBase     ] = color.r;
	batch.colors[ colorBase + 1 ] = color.g;
	batch.colors[ colorBase + 2 ] = color.b;
	batch.colors[ colorBase + 3 ] = color.a;

	// Vertex 1 (end point)
	batch.vertices[ vertexBase + 2 ] = x2;
	batch.vertices[ vertexBase + 3 ] = y2;
	batch.colors[ colorBase + 4 ] = color.r;
	batch.colors[ colorBase + 5 ] = color.g;
	batch.colors[ colorBase + 6 ] = color.b;
	batch.colors[ colorBase + 7 ] = color.a;

	batch.count += 2;
}

