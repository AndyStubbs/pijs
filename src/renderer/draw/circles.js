/**
 * Pi.js - Circles Drawing Module
 * 
 * Low-level drawing operations: circle drawing.
 * 
 * drawCircle, drawCirclePenSquare, drawCircleCircle
 * 
 * @module renderer/draw/circles
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_geometry from "./geometry.js";
import { drawPixelUnsafe } from "./primitives.js";


/**
 * Draw circle outline using pixel drawing (no bounds checking, GPU clipping)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Circle radius
 * @returns {void}
 */
export function drawCircle( screenData, cx, cy, radius ) {
	const color = screenData.color;

	// Nothing to draw
	if( radius <= 0 ) {
		return;
	}

	if( radius === 1 ) {
		g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, 1 );
		drawPixelUnsafe( screenData, cx + 1, cy, color, g_batches.POINTS_BATCH );
		return;
	}

	// Radius adjustment
	radius -= 1;

	// Single point
	if( radius === 1 ) {
		g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, 4 );
		drawPixelUnsafe( screenData, cx + 1, cy, color, g_batches.POINTS_BATCH );
		drawPixelUnsafe( screenData, cx - 1, cy, color, g_batches.POINTS_BATCH );
		drawPixelUnsafe( screenData, cx, cy + 1, color, g_batches.POINTS_BATCH );
		drawPixelUnsafe( screenData, cx, cy - 1, color, g_batches.POINTS_BATCH );
		return;
	}

	// Estimate batch size based on circumference
	const perimeterPixels = Math.round( 2 * Math.PI * radius );
	g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, perimeterPixels );

	// Midpoint circle algorithm (8-way symmetry)
	let x = radius;
	let y = 0;
	let err = 1 - x;

	const plotted = new Set();
	const setPixel = ( pixelX, pixelY ) => {
		const key = pixelX + "," + pixelY;
		if( !plotted.has( key ) ) {
			drawPixelUnsafe( screenData, pixelX, pixelY, color, g_batches.POINTS_BATCH );
			plotted.add( key );
		}
	};

	while( x >= y ) {
		setPixel( cx + x, cy + y );
		setPixel( cx + y, cy + x );
		setPixel( cx - y, cy + x );
		setPixel( cx - x, cy + y );
		setPixel( cx - x, cy - y );
		setPixel( cx - y, cy - x );
		setPixel( cx + y, cy - x );
		setPixel( cx + x, cy - y );

		y++;
		if( err < 0 ) {
			err += 2 * y + 1;
		} else {
			x--;
			err += 2 * ( y - x ) + 1;
		}
	}
}


/**
 * Draw filled circle (no bounds checking, GPU clipping)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Circle radius
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawCircleFilled( screenData, cx, cy, radius, color ) {

	// Apply input adjustments for MCA consistency
	return g_geometry.drawCachedGeometry(
		screenData, g_geometry.FILLED_CIRCLE, radius, cx, cy, color
	);
}
