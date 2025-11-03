/**
 * Pi.js - Bezier Drawing Module
 * 
 * Low-level drawing operations: bezier drawing.
 * 
 * drawBezierPixel, drawBezierSquare, drawBezierCircle
 * 
 * @module renderer/draw/bezier
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_utils from "../../core/utils.js";
import * as g_batchHelpers from "./batch-helpers.js";
import * as g_lines from "./lines.js";

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
/**
 * Draw cubic Bezier with pixel pen by tessellating into short line segments.
 * Uses adaptive subdivision for smoothness and reuses drawLinePixel for rasterization.
 * 
 * @param {Object} screenData
 * @param {number} p0x
 * @param {number} p0y
 * @param {number} p1x
 * @param {number} p1y
 * @param {number} p2x
 * @param {number} p2y
 * @param {number} p3x
 * @param {number} p3y
 * @param {Object} color
 * @returns {void}
 */
export function drawBezierPixel( screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color ) {

	// Tessellate curve into points with ~0.75px max error
	const maxError = 0.75;
	const pts = g_batchHelpers.tessellateCubicBezier( p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, maxError );

	if( pts.length < 4 ) {
		
		// Degenerate: plot a single pixel
		const batch = screenData.batches[ g_batches.POINTS_BATCH ];
		g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, 1 );
		g_batchHelpers.addVertexToBatch( batch, p0x | 0, p0y | 0, color );
		return;
	}

	// Draw consecutive segments using pixel line
	for( let i = 0; i + 3 < pts.length; i += 2 ) {
		const x1 = pts[ i ] | 0;
		const y1 = pts[ i + 1 ] | 0;
		const x2 = pts[ i + 2 ] | 0;
		const y2 = pts[ i + 3 ] | 0;
		if( x1 === x2 && y1 === y2 ) continue;
		g_lines.drawLinePixel( screenData, x1, y1, x2, y2, color );
	}
}

/**
 * Draw cubic Bezier with square pen by tessellating and emitting thick rectangles per segment.
 * Adds square caps at the curve ends using batch-helpers.
 * 
 * @returns {void}
 */
export function drawBezierSquare( screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color, penSize, penType ) {

	const pts = g_batchHelpers.tessellateCubicBezier( p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, 0.75 );
	if( pts.length < 4 ) return;

	const halfWidth = Math.floor( penSize / 2 );
	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];

	// Estimate vertices: 6 per segment (no separate caps; we extend endpoints)
	const segments = ( pts.length >> 1 ) - 1;
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, segments * 6 );

	let firstDirX = 1, firstDirY = 0;
	for( let i = 0; i < segments; i++ ) {
		const i0 = i * 2;
		const i1 = i0 + 2;
		let x1 = pts[ i0 ];
		let y1 = pts[ i0 + 1 ];
		let x2 = pts[ i1 ];
		let y2 = pts[ i1 + 1 ];
		const dx = x2 - x1;
		const dy = y2 - y1;
		const len = Math.sqrt( dx * dx + dy * dy );
		if( len < 0.001 ) continue;
		const dirX = dx / len;
		const dirY = dy / len;
		if( i === 0 ) { firstDirX = dirX; firstDirY = dirY; }

		// Extend the first and last segment by halfWidth to create square ends without overlap
		if( i === 0 ) {
			x1 -= dirX * halfWidth;
			y1 -= dirY * halfWidth;
		}
		if( i === segments - 1 ) {
			x2 += dirX * halfWidth;
			y2 += dirY * halfWidth;
		}
		const perpX = -dirY;
		const perpY = dirX;
		const p1x = x1 + perpX * halfWidth;
		const p1y = y1 + perpY * halfWidth;
		const p2x = x1 - perpX * halfWidth;
		const p2y = y1 - perpY * halfWidth;
		const p3x = x2 - perpX * halfWidth;
		const p3y = y2 - perpY * halfWidth;
		const p4x = x2 + perpX * halfWidth;
		const p4y = y2 + perpY * halfWidth;
		g_batchHelpers.addTriangleToBatch( batch, p1x, p1y, p4x, p4y, p2x, p2y, color );
		g_batchHelpers.addTriangleToBatch( batch, p4x, p4y, p3x, p3y, p2x, p2y, color );

		// Bevel join to next segment to avoid gaps/overlaps
		if( i < segments - 1 ) {
			const nx1 = x2;
			const ny1 = y2;
			const nx2 = pts[ i1 + 2 ];
			const ny2 = pts[ i1 + 3 ];
			const ndx = nx2 - nx1;
			const ndy = ny2 - ny1;
			const nlen = Math.sqrt( ndx * ndx + ndy * ndy );
			if( nlen >= 0.001 ) {
				const ndirX = ndx / nlen;
				const ndirY = ndy / nlen;
				const nperpX = -ndirY;
				const nperpY = ndirX;
				const a1x = x2 + perpX * halfWidth;
				const a1y = y2 + perpY * halfWidth;
				const b1x = x2 - perpX * halfWidth;
				const b1y = y2 - perpY * halfWidth;
				const a2x = x2 + nperpX * halfWidth;
				const a2y = y2 + nperpY * halfWidth;
				const b2x = x2 - nperpX * halfWidth;
				const b2y = y2 - nperpY * halfWidth;
				g_batchHelpers.addTriangleToBatch( batch, a1x, a1y, a2x, a2y, b1x, b1y, color );
				g_batchHelpers.addTriangleToBatch( batch, a2x, a2y, b2x, b2y, b1x, b1y, color );
			}
		}
	}

	// No separate caps needed; endpoint extension produces square ends without overlap
}

/**
 * Draw cubic Bezier with circle pen: thick segments without caps, then semicircle caps at ends.
 * 
 * @returns {void}
 */
export function drawBezierCircle( screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color, penSize, penType ) {

	const pts = g_batchHelpers.tessellateCubicBezier( p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, 0.75 );
	if( pts.length < 4 ) return;

	const halfWidth = Math.floor( penSize / 2 );
	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];

	const segments = ( pts.length >> 1 ) - 1;
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, segments * 6 );

	let startDirX = 1, startDirY = 0;
	let startX = pts[ 0 ], startY = pts[ 1 ];
	let lastDirX = 1, lastDirY = 0;
	for( let i = 0; i < segments; i++ ) {
		const i0 = i * 2;
		const i1 = i0 + 2;
		const x1 = pts[ i0 ];
		const y1 = pts[ i0 + 1 ];
		const x2 = pts[ i1 ];
		const y2 = pts[ i1 + 1 ];
		const dx = x2 - x1;
		const dy = y2 - y1;
		const len = Math.sqrt( dx * dx + dy * dy );
		if( len < 0.001 ) continue;
		const dirX = dx / len;
		const dirY = dy / len;
		if( i === 0 ) { startDirX = dirX; startDirY = dirY; }
		lastDirX = dirX; lastDirY = dirY;
		const perpX = -dirY;
		const perpY = dirX;
		const p1x = x1 + perpX * halfWidth;
		const p1y = y1 + perpY * halfWidth;
		const p2x = x1 - perpX * halfWidth;
		const p2y = y1 - perpY * halfWidth;
		const p3x = x2 - perpX * halfWidth;
		const p3y = y2 - perpY * halfWidth;
		const p4x = x2 + perpX * halfWidth;
		const p4y = y2 + perpY * halfWidth;
		g_batchHelpers.addTriangleToBatch( batch, p1x, p1y, p4x, p4y, p2x, p2y, color );
		g_batchHelpers.addTriangleToBatch( batch, p4x, p4y, p3x, p3y, p2x, p2y, color );

		// Bevel join with next segment to remove gaps/overlaps
		if( i < segments - 1 ) {
			const nx1 = x2;
			const ny1 = y2;
			const nx2 = pts[ i1 + 2 ];
			const ny2 = pts[ i1 + 3 ];
			const ndx = nx2 - nx1;
			const ndy = ny2 - ny1;
			const nlen = Math.sqrt( ndx * ndx + ndy * ndy );
			if( nlen >= 0.001 ) {
				const ndirX = ndx / nlen;
				const ndirY = ndy / nlen;
				const nperpX = -ndirY;
				const nperpY = ndirX;
				const a1x = x2 + perpX * halfWidth;
				const a1y = y2 + perpY * halfWidth;
				const b1x = x2 - perpX * halfWidth;
				const b1y = y2 - perpY * halfWidth;
				const a2x = x2 + nperpX * halfWidth;
				const a2y = y2 + nperpY * halfWidth;
				const b2x = x2 - nperpX * halfWidth;
				const b2y = y2 - nperpY * halfWidth;
				g_batchHelpers.addTriangleToBatch( batch, a1x, a1y, a2x, a2y, b1x, b1y, color );
				g_batchHelpers.addTriangleToBatch( batch, a2x, a2y, b2x, b2y, b1x, b1y, color );
			}
		}
	}

	const endX = pts[ ( segments ) * 2 ];
	const endY = pts[ ( segments ) * 2 + 1 ];
	const radius = halfWidth;
	g_batchHelpers.drawHalfCircleCap( screenData, startX, startY, radius, color, startDirX, startDirY, false );
	g_batchHelpers.drawHalfCircleCap( screenData, endX, endY, radius, color, lastDirX, lastDirY, true );
}
