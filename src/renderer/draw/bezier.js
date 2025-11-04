/**
 * Pi.js - Bezier Drawing Module
 * 
 * Low-level drawing operations: bezier drawing.
 * 
 * drawBezier, drawBezierSquare, drawBezierCircle
 * 
 * @module renderer/draw/bezier
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_batchHelpers from "./batch-helpers.js";
import * as g_lines from "./lines.js";

/**
 * Draw cubic Bezier with pixel pen by tessellating into short line segments.
 * Uses adaptive subdivision for smoothness and reuses drawLine for rasterization.
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
export function drawBezier( screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color ) {

	// Tessellate curve into points with ~0.75px max error
	const maxError = 0.75;
	const pts = g_batchHelpers.tessellateCubicBezier(
		p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, maxError
	);

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
		g_lines.drawLine( screenData, x1, y1, x2, y2, color );
	}
}
