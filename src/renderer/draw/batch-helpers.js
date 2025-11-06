/**
 * Pi.js - Batch Drawing Helpers Module
 * 
 * Shared helper functions for adding geometry to batches.
 * Provides common operations like adding vertices, quads, and triangles.
 * 
 * @module renderer/draw/batch-helpers
 */

"use strict";

import * as g_batches from "../batches.js";


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


/***************************************************************************************************
 * Caps and Curves Helpers
 ***************************************************************************************************/

/**
 * Draw a half-circle cap at a point, oriented by a tangent direction.
 * Emits a triangle fan approximating a semicircle. Prepares the geometry batch capacity.
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} radius - Cap radius
 * @param {Object} color - RGBA color
 * @param {number} tanX - Tangent X
 * @param {number} tanY - Tangent Y
 * @param {boolean} isEnd - True for end cap (forward), false for start (backward)
 * @returns {void}
 */
export function drawHalfCircleCap( screenData, cx, cy, radius, color, tanX, tanY, isEnd ) {

	// Normalize tangent
	const len = Math.sqrt( tanX * tanX + tanY * tanY );
	let dirX = tanX;
	let dirY = tanY;
	if( len > 0.0001 ) {
		dirX /= len;
		dirY /= len;
	} else {
		dirX = 1;
		dirY = 0;
	}

	// Base angle; flip for start to face outward from arc
	let base = Math.atan2( dirY, dirX );
	if( !isEnd ) {
		base += Math.PI;
	}
	const start = base - Math.PI / 2;
	const end = base + Math.PI / 2;

	// Tessellation
	const segments = Math.max( 6, Math.min( Math.round( radius * 3 ), 90 ) );
	const step = ( end - start ) / segments;

	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, segments * 3 );

	for( let i = 0; i < segments; i++ ) {
		const a = start + i * step;
		const b = a + step;
		const ax = cx + radius * Math.cos( a );
		const ay = cy + radius * Math.sin( a );
		const bx = cx + radius * Math.cos( b );
		const by = cy + radius * Math.sin( b );
		addTriangleToBatch( batch, cx, cy, ax, ay, bx, by, color );
	}
}

/**
 * Draw a square cap (two triangles) at an endpoint, oriented by tangent.
 * Prepares batch for 6 vertices.
 * 
 * @param {Object} screenData
 * @param {number} x
 * @param {number} y
 * @param {number} dirX
 * @param {number} dirY
 * @param {number} halfWidth
 * @param {Object} color
 * @returns {void}
 */
export function drawSquareCap( screenData, x, y, dirX, dirY, halfWidth, color ) {

	// Normalize tangent
	const len = Math.sqrt( dirX * dirX + dirY * dirY );
	let tx = dirX;
	let ty = dirY;
	if( len > 0.0001 ) {
		tx /= len;
		ty /= len;
	} else {
		tx = 1;
		ty = 0;
	}

	const perpX = -ty;
	const perpY = tx;
	const cap = halfWidth;

	const p1x = x + tx * cap + perpX * cap;
	const p1y = y + ty * cap + perpY * cap;
	const p2x = x + tx * cap - perpX * cap;
	const p2y = y + ty * cap - perpY * cap;
	const p3x = x - tx * cap - perpX * cap;
	const p3y = y - ty * cap - perpY * cap;
	const p4x = x - tx * cap + perpX * cap;
	const p4y = y - ty * cap + perpY * cap;

	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, 6 );
	addTriangleToBatch( batch, p1x, p1y, p4x, p4y, p2x, p2y, color );
	addTriangleToBatch( batch, p4x, p4y, p3x, p3y, p2x, p2y, color );
}

/**
 * Tessellate a cubic Bezier curve into a polyline using an adaptive flatness criterion.
 * Returns an array of points [x0, y0, x1, y1, ..., xn, yn] including endpoints.
 * 
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @param {number} maxError - Max perpendicular error in pixels
 * @returns {number[]}
 */
export function tessellateCubicBezier( x0, y0, x1, y1, x2, y2, x3, y3, maxError ) {

	const out = [];

	// Distance from point to line segment (squared)
	function pointLineDistanceSq( px, py, ax, ay, bx, by ) {
		const abx = bx - ax;
		const aby = by - ay;
		const apx = px - ax;
		const apy = py - ay;
		const abLenSq = abx * abx + aby * aby;
		if( abLenSq === 0 ) return apx * apx + apy * apy;
		let t = ( apx * abx + apy * aby ) / abLenSq;
		if( t < 0 ) t = 0; else if( t > 1 ) t = 1;
		const cx = ax + t * abx;
		const cy = ay + t * aby;
		const dx = px - cx;
		const dy = py - cy;
		return dx * dx + dy * dy;
	}

	const maxErrorSq = maxError * maxError;
	const maxDepth = 12;

	function subdivide( ax, ay, bx, by, cx, cy, dx, dy, depth ) {

		// Flatness test: max distance of control points to chord (a-d)
		const d1 = pointLineDistanceSq( bx, by, ax, ay, dx, dy );
		const d2 = pointLineDistanceSq( cx, cy, ax, ay, dx, dy );
		if( depth >= maxDepth || ( d1 <= maxErrorSq && d2 <= maxErrorSq ) ) {
			// Accept segment
			if( out.length === 0 ) {
				out.push( ax, ay );
			}
			out.push( dx, dy );
			return;
		}

		// De Casteljau subdivision at t=0.5
		const abx = ( ax + bx ) * 0.5; const aby = ( ay + by ) * 0.5;
		const bcx = ( bx + cx ) * 0.5; const bcy = ( by + cy ) * 0.5;
		const cdx = ( cx + dx ) * 0.5; const cdy = ( cy + dy ) * 0.5;

		const abbcx = ( abx + bcx ) * 0.5; const abbcy = ( aby + bcy ) * 0.5;
		const bccdx = ( bcx + cdx ) * 0.5; const bccdy = ( bcy + cdy ) * 0.5;

		const midx = ( abbcx + bccdx ) * 0.5; const midy = ( abbcy + bccdy ) * 0.5;

		subdivide( ax, ay, abx, aby, abbcx, abbcy, midx, midy, depth + 1 );
		subdivide( midx, midy, bccdx, bccdy, cdx, cdy, dx, dy, depth + 1 );
	}

	subdivide( x0, y0, x1, y1, x2, y2, x3, y3, 0 );
	return out;
}

