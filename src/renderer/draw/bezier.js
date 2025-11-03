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
 * TODO: Add performance tests comparing variants for thick Bezier rendering:
 * - Bevel-only joins vs. miter joins (with/without miter limit)
 * - Different tessellation errors (e.g., 0.5, 0.75, 1.0) affecting point count
 * - Triangle strip vs. per-segment quads
 * - Impact of semicircle vs. square caps
 * Capture CPU time and vertex counts across representative curves to choose defaults.
 */

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

	const count = ( pts.length >> 1 );
	const left = new Array( count * 2 );
	const right = new Array( count * 2 );

	// Compute averaged tangent per point for stable normals
	for( let i = 0; i < count; i++ ) {
		const iPrev = Math.max( 0, i - 1 );
		const iNext = Math.min( count - 1, i + 1 );
		const xPrev = pts[ iPrev * 2 ];
		const yPrev = pts[ iPrev * 2 + 1 ];
		const xNext = pts[ iNext * 2 ];
		const yNext = pts[ iNext * 2 + 1 ];
		let dx = xNext - xPrev;
		let dy = yNext - yPrev;
		let len = Math.sqrt( dx * dx + dy * dy );
		if( len < 0.0001 ) { dx = 1; dy = 0; len = 1; }
		dx /= len; dy /= len;
		const nx = -dy;
		const ny = dx;
		const px = pts[ i * 2 ];
		const py = pts[ i * 2 + 1 ];
		left[ i * 2 ] = px + nx * halfWidth;
		left[ i * 2 + 1 ] = py + ny * halfWidth;
		right[ i * 2 ] = px - nx * halfWidth;
		right[ i * 2 + 1 ] = py - ny * halfWidth;
	}

	// Miter joins with limit to reduce overlaps at sharp angles
	(function applyMiterJoins(){
		const miterLimit = 2.0; // in multiples of halfWidth
		function intersect( x1, y1, dx1, dy1, x2, y2, dx2, dy2 ) {
			const det = dx1 * dy2 - dy1 * dx2;
			if( Math.abs( det ) < 1e-6 ) return null; // parallel
			const t = ( ( x2 - x1 ) * dy2 - ( y2 - y1 ) * dx2 ) / det;
			return { "x": x1 + dx1 * t, "y": y1 + dy1 * t };
		}
		for( let i = 1; i < count - 1; i++ ) {
			const xA = pts[ ( i - 1 ) * 2 ], yA = pts[ ( i - 1 ) * 2 + 1 ];
			const xB = pts[ i * 2 ], yB = pts[ i * 2 + 1 ];
			const xC = pts[ ( i + 1 ) * 2 ], yC = pts[ ( i + 1 ) * 2 + 1 ];

			// Directions for segments AB and BC
			let dx1 = xB - xA, dy1 = yB - yA; let len1 = Math.sqrt( dx1*dx1 + dy1*dy1 );
			if( len1 < 1e-6 ) { dx1 = 1; dy1 = 0; len1 = 1; }
			dx1 /= len1; dy1 /= len1;
			let dx2 = xC - xB, dy2 = yC - yB; let len2 = Math.sqrt( dx2*dx2 + dy2*dy2 );
			if( len2 < 1e-6 ) { dx2 = 1; dy2 = 0; len2 = 1; }
			dx2 /= len2; dy2 /= len2;

			// Offset lines (left side)
			const n1x = -dy1, n1y = dx1;
			const n2x = -dy2, n2y = dx2;
			const lAx = xA + n1x * halfWidth, lAy = yA + n1y * halfWidth;
			const lBx = xB + n1x * halfWidth, lBy = yB + n1y * halfWidth;
			const lCx = xB + n2x * halfWidth, lCy = yB + n2y * halfWidth;
			const lDx = xC + n2x * halfWidth, lDy = yC + n2y * halfWidth;
			const leftIntersect = intersect( lBx, lBy, dx1, dy1, lCx, lCy, dx2, dy2 );
			if( leftIntersect ) {
				const mx = leftIntersect.x, my = leftIntersect.y;
				const mLen = Math.hypot( mx - xB, my - yB );
				if( mLen <= miterLimit * halfWidth ) {
					left[ i * 2 ] = mx; left[ i * 2 + 1 ] = my;
				}
			}

			// Offset lines (right side)
			const rAx = xA - n1x * halfWidth, rAy = yA - n1y * halfWidth;
			const rBx = xB - n1x * halfWidth, rBy = yB - n1y * halfWidth;
			const rCx = xB - n2x * halfWidth, rCy = yB - n2y * halfWidth;
			const rDx = xC - n2x * halfWidth, rDy = yC - n2y * halfWidth;
			const rightIntersect = intersect( rBx, rBy, dx1, dy1, rCx, rCy, dx2, dy2 );
			if( rightIntersect ) {
				const mx = rightIntersect.x, my = rightIntersect.y;
				const mLen = Math.hypot( mx - xB, my - yB );
				if( mLen <= miterLimit * halfWidth ) {
					right[ i * 2 ] = mx; right[ i * 2 + 1 ] = my;
				}
			}
		}
	})();

	// Extend endpoints for square ends
	{
		const x0 = pts[ 0 ], y0 = pts[ 1 ];
		const x1 = pts[ 2 ], y1 = pts[ 3 ];
		let dx = x1 - x0, dy = y1 - y0; let len = Math.sqrt( dx*dx + dy*dy );
		if( len < 0.0001 ) { dx = 1; dy = 0; len = 1; }
		dx /= len; dy /= len;
		left[ 0 ] -= dx * halfWidth; left[ 1 ] -= dy * halfWidth;
		right[ 0 ] -= dx * halfWidth; right[ 1 ] -= dy * halfWidth;

		const xn = pts[ ( count - 1 ) * 2 ], yn = pts[ ( count - 1 ) * 2 + 1 ];
		const xp = pts[ ( count - 2 ) * 2 ], yp = pts[ ( count - 2 ) * 2 + 1 ];
		dx = xn - xp; dy = yn - yp; len = Math.sqrt( dx*dx + dy*dy );
		if( len < 0.0001 ) { dx = 1; dy = 0; len = 1; }
		dx /= len; dy /= len;
		left[ ( count - 1 ) * 2 ] += dx * halfWidth; left[ ( count - 1 ) * 2 + 1 ] += dy * halfWidth;
		right[ ( count - 1 ) * 2 ] += dx * halfWidth; right[ ( count - 1 ) * 2 + 1 ] += dy * halfWidth;
	}

	// Render continuous strip
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, ( count - 1 ) * 6 );
	for( let i = 0; i < count - 1; i++ ) {
		const l0x = left[ i * 2 ], l0y = left[ i * 2 + 1 ];
		const r0x = right[ i * 2 ], r0y = right[ i * 2 + 1 ];
		const l1x = left[ ( i + 1 ) * 2 ], l1y = left[ ( i + 1 ) * 2 + 1 ];
		const r1x = right[ ( i + 1 ) * 2 ], r1y = right[ ( i + 1 ) * 2 + 1 ];
		g_batchHelpers.addTriangleToBatch( batch, l0x, l0y, r0x, r0y, l1x, l1y, color );
		g_batchHelpers.addTriangleToBatch( batch, l1x, l1y, r0x, r0y, r1x, r1y, color );
	}
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

	const count = ( pts.length >> 1 );
	const left = new Array( count * 2 );
	const right = new Array( count * 2 );

	// Compute averaged tangent per point for stable normals
	for( let i = 0; i < count; i++ ) {
		const iPrev = Math.max( 0, i - 1 );
		const iNext = Math.min( count - 1, i + 1 );
		const xPrev = pts[ iPrev * 2 ];
		const yPrev = pts[ iPrev * 2 + 1 ];
		const xNext = pts[ iNext * 2 ];
		const yNext = pts[ iNext * 2 + 1 ];
		let dx = xNext - xPrev;
		let dy = yNext - yPrev;
		let len = Math.sqrt( dx * dx + dy * dy );
		if( len < 0.0001 ) { dx = 1; dy = 0; len = 1; }
		dx /= len; dy /= len;
		const nx = -dy;
		const ny = dx;
		const px = pts[ i * 2 ];
		const py = pts[ i * 2 + 1 ];
		left[ i * 2 ] = px + nx * halfWidth;
		left[ i * 2 + 1 ] = py + ny * halfWidth;
		right[ i * 2 ] = px - nx * halfWidth;
		right[ i * 2 + 1 ] = py - ny * halfWidth;
	}

	// Miter joins with limit to reduce overlaps at sharp angles
	(function applyMiterJoins(){
		const miterLimit = 2.0; // in multiples of halfWidth
		function intersect( x1, y1, dx1, dy1, x2, y2, dx2, dy2 ) {
			const det = dx1 * dy2 - dy1 * dx2;
			if( Math.abs( det ) < 1e-6 ) return null; // parallel
			const t = ( ( x2 - x1 ) * dy2 - ( y2 - y1 ) * dx2 ) / det;
			return { "x": x1 + dx1 * t, "y": y1 + dy1 * t };
		}
		for( let i = 1; i < count - 1; i++ ) {
			const xA = pts[ ( i - 1 ) * 2 ], yA = pts[ ( i - 1 ) * 2 + 1 ];
			const xB = pts[ i * 2 ], yB = pts[ i * 2 + 1 ];
			const xC = pts[ ( i + 1 ) * 2 ], yC = pts[ ( i + 1 ) * 2 + 1 ];
			let dx1 = xB - xA, dy1 = yB - yA; let len1 = Math.sqrt( dx1*dx1 + dy1*dy1 );
			if( len1 < 1e-6 ) { dx1 = 1; dy1 = 0; len1 = 1; }
			dx1 /= len1; dy1 /= len1;
			let dx2 = xC - xB, dy2 = yC - yB; let len2 = Math.sqrt( dx2*dx2 + dy2*dy2 );
			if( len2 < 1e-6 ) { dx2 = 1; dy2 = 0; len2 = 1; }
			dx2 /= len2; dy2 /= len2;
			const n1x = -dy1, n1y = dx1;
			const n2x = -dy2, n2y = dx2;
			const lBx = xB + n1x * halfWidth, lBy = yB + n1y * halfWidth;
			const lCx = xB + n2x * halfWidth, lCy = yB + n2y * halfWidth;
			const li = intersect( lBx, lBy, dx1, dy1, lCx, lCy, dx2, dy2 );
			if( li ) {
				const d = Math.hypot( li.x - xB, li.y - yB );
				if( d <= miterLimit * halfWidth ) { left[ i * 2 ] = li.x; left[ i * 2 + 1 ] = li.y; }
			}
			const rBx = xB - n1x * halfWidth, rBy = yB - n1y * halfWidth;
			const rCx = xB - n2x * halfWidth, rCy = yB - n2y * halfWidth;
			const ri = intersect( rBx, rBy, dx1, dy1, rCx, rCy, dx2, dy2 );
			if( ri ) {
				const d = Math.hypot( ri.x - xB, ri.y - yB );
				if( d <= miterLimit * halfWidth ) { right[ i * 2 ] = ri.x; right[ i * 2 + 1 ] = ri.y; }
			}
		}
	})();

	// Render continuous strip
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, ( count - 1 ) * 6 );
	for( let i = 0; i < count - 1; i++ ) {
		const l0x = left[ i * 2 ], l0y = left[ i * 2 + 1 ];
		const r0x = right[ i * 2 ], r0y = right[ i * 2 + 1 ];
		const l1x = left[ ( i + 1 ) * 2 ], l1y = left[ ( i + 1 ) * 2 + 1 ];
		const r1x = right[ ( i + 1 ) * 2 ], r1y = right[ ( i + 1 ) * 2 + 1 ];
		g_batchHelpers.addTriangleToBatch( batch, l0x, l0y, r0x, r0y, l1x, l1y, color );
		g_batchHelpers.addTriangleToBatch( batch, l1x, l1y, r0x, r0y, r1x, r1y, color );
	}

	// Caps
	const startX = pts[ 0 ], startY = pts[ 1 ];
	const endX = pts[ ( count - 1 ) * 2 ], endY = pts[ ( count - 1 ) * 2 + 1 ];
	let sdx = pts[ 2 ] - pts[ 0 ], sdy = pts[ 3 ] - pts[ 1 ];
	let sl = Math.sqrt( sdx*sdx + sdy*sdy ); if( sl < 0.0001 ) { sdx = 1; sdy = 0; sl = 1; }
	sdx /= sl; sdy /= sl;
	let edx = pts[ ( count - 1 ) * 2 ] - pts[ ( count - 2 ) * 2 ];
	let edy = pts[ ( count - 1 ) * 2 + 1 ] - pts[ ( count - 2 ) * 2 + 1 ];
	let el = Math.sqrt( edx*edx + edy*edy ); if( el < 0.0001 ) { edx = 1; edy = 0; el = 1; }
	edx /= el; edy /= el;

	g_batchHelpers.drawHalfCircleCap( screenData, startX, startY, halfWidth, color, sdx, sdy, false );
	g_batchHelpers.drawHalfCircleCap( screenData, endX, endY, halfWidth, color, edx, edy, true );
}
