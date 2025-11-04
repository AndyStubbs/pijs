/**
 * Pi.js - Circles Drawing Module
 * 
 * Low-level drawing operations: circle drawing.
 * 
 * drawCirclePixel, drawCirclePenSquare, drawCircleCircle
 * 
 * @module renderer/draw/circles
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_textures from "../textures.js";
import * as g_utils from "../../core/utils.js";
import * as g_geometry from "./geometry.js";
import * as g_batchHelpers from "./batch-helpers.js";
import { drawPixel } from "./primitives.js";






/**
 * Draw circle outline using pixel drawing (no bounds checking, GPU clipping)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Circle radius
 * @param {Object} color - Outline color object with r/g/b/a components (0-255)
 * @param {Object|null} fillColor - Optional fill color object (if provided, draws filled circle first)
 * @returns {void}
 */
export function drawCirclePixel( screenData, cx, cy, radius, color ) {

	// Nothing to draw
	if( radius < 0 ) {
		return;
	}

	// Single point
	if( radius <= 1 ) {
		g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, 4 );
		drawPixel( screenData, cx + 1, cy, color, g_batches.POINTS_BATCH );
		drawPixel( screenData, cx - 1, cy, color, g_batches.POINTS_BATCH );
		drawPixel( screenData, cx, cy + 1, color, g_batches.POINTS_BATCH );
		drawPixel( screenData, cx, cy - 1, color, g_batches.POINTS_BATCH );
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
			drawPixel( screenData, pixelX, pixelY, color, g_batches.POINTS_BATCH );
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
export function drawFilledCircle( screenData, cx, cy, radius, color ) {

	// TODO: Attempt to fix the drawFilledCircle so it's the same as pre alpha 3 version which I 
	// prefer. Right now we are using a cached results, I might want to keep the caching but we
	// should use the same algorithm and try to reuse code.
	
	// Apply input adjustments for MCA consistency
	//radius -= 1;
	cy -= 1;
	
	const cacheKey = `circle:${radius}`;
	if( g_geometry.geometryCache.has( cacheKey ) ) {
		return g_geometry.drawCachedGeometry( screenData, cacheKey, cx, cy, color );
	}

	// Radius of 0 is nothing
	if( radius < 1 ) {
		return;
	}

	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];

	const maxX = screenData.width;
	const maxY = screenData.height;

	// Store min/max X for each Y scanline as we discover them during MCA
	const scanlineMinMax = new Map(); // Map<y, {min: x, max: x}>

	// --- Midpoint Circle Algorithm to find outline pixels ---
	let x = radius;
	let y = 0;
	let err = 1 - x;

	// Helper to update min/max X for a specific Y scanline
	const updateScanline = ( px, py ) => {

		const pixelY = py | 0; // Fast Math.floor
		const pixelX = px | 0;

		if( !scanlineMinMax.has( pixelY ) ) {
			scanlineMinMax.set( pixelY, { "min": pixelX, "max": pixelX } );
		} else {
			const mm = scanlineMinMax.get( pixelY );
			if( pixelX < mm.min ) mm.min = pixelX;
			if( pixelX > mm.max ) mm.max = pixelX;
		}
	};

	while( x >= y ) {

		// Apply 8-way symmetry to update scanlines
		updateScanline( cx + x, cy + y ); // Quadrant 1
		updateScanline( cx + y, cy + x ); // Quadrant 2
		updateScanline( cx - y, cy + x ); // Quadrant 3
		updateScanline( cx - x, cy + y ); // Quadrant 4
		updateScanline( cx - x, cy - y ); // Quadrant 5
		updateScanline( cx - y, cy - x ); // Quadrant 6
		updateScanline( cx + y, cy - x ); // Quadrant 7
		updateScanline( cx + x, cy - y ); // Quadrant 8

		y++;
		if( err < 0 ) {
			err += 2 * y + 1;
		} else {
			x--;
			err += 2 * ( y - x ) + 1;
		}
	}

	// Count valid scanlines for batch preparation
	let estimatedVertexCount = 0;
	const sortedYCoords = [];
	for( const [ currentY, mm ] of scanlineMinMax.entries() ) {

		// Screen clipping
		if( currentY < 0 || currentY >= maxY ) {
			continue;
		}

		const xStart = Math.max( mm.min, 0 );
		const xEnd = Math.min( mm.max, maxX - 1 );

		if( xStart <= xEnd ) {
			estimatedVertexCount += 6;
			sortedYCoords.push( currentY );
		}
	}

	sortedYCoords.sort( ( a, b ) => a - b );
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, estimatedVertexCount );

	// Add quads for all valid scanlines
	for( const currentY of sortedYCoords ) {

		const mm = scanlineMinMax.get( currentY );
		const xStart = Math.max( mm.min, 0 );
		const xEnd = Math.min( mm.max, maxX - 1 );

		g_batchHelpers.addQuadToBatch( batch, xStart, currentY, xEnd + 1, currentY + 1, color );
	}
}
