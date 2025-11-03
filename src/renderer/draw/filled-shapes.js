/**
 * Pi.js - Filled Shapes Drawing Module
 * 
 * High-level shape drawing operations: rectangles, circles, ellipses.
 * 
 * drawFilledRect, drawFilledCircle, drawFilledEllipse
 * 
 * @module renderer/draw/filled-shapes
 */

"use strict";

import * as g_batches from "../batches.js";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize shapes module
 * 
 * @returns {void}
 */
export function init() {

	// Nothing to initialize yet
}

/**
 * Draw filled rectangle (unsafe - no bounds checking, GPU clipping)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawFilledRect( screenData, x, y, width, height, color ) {

	// Get geometry batch
	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];

	// Prepare batch for 6 vertices (2 triangles)
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, 6 );

	// Helper function to add a vertex
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

	// First triangle: (x,y), (x+width,y), (x,y+height)
	addVertex( x, y );
	addVertex( x + width, y );
	addVertex( x, y + height );

	// Second triangle: (x+width,y), (x+width,y+height), (x,y+height)
	addVertex( x + width, y );
	addVertex( x + width, y + height );
	addVertex( x, y + height );
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
	radius -= 1;
	cy -= 1;

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

	// Helper to add a quad efficiently
	const addQuad = ( x1, y1, x2, y2, quadColor ) => {

		const vx1 = x1 | 0;
		const vy1 = y1 | 0;
		const vx2 = x2 | 0;
		const vy2 = y2 | 0;

		let idx, cidx;

		// Triangle 1: (x1,y1), (x2,y1), (x1,y2)
		idx = batch.count * batch.vertexComps;
		cidx = batch.count * batch.colorComps;
		batch.vertices[ idx     ] = vx1;
		batch.vertices[ idx + 1 ] = vy1;
		batch.colors[ cidx     ] = quadColor.r;
		batch.colors[ cidx + 1 ] = quadColor.g;
		batch.colors[ cidx + 2 ] = quadColor.b;
		batch.colors[ cidx + 3 ] = quadColor.a;
		batch.count++;

		idx = batch.count * batch.vertexComps;
		cidx = batch.count * batch.colorComps;
		batch.vertices[ idx     ] = vx2;
		batch.vertices[ idx + 1 ] = vy1;
		batch.colors[ cidx     ] = quadColor.r;
		batch.colors[ cidx + 1 ] = quadColor.g;
		batch.colors[ cidx + 2 ] = quadColor.b;
		batch.colors[ cidx + 3 ] = quadColor.a;
		batch.count++;

		idx = batch.count * batch.vertexComps;
		cidx = batch.count * batch.colorComps;
		batch.vertices[ idx     ] = vx1;
		batch.vertices[ idx + 1 ] = vy2;
		batch.colors[ cidx     ] = quadColor.r;
		batch.colors[ cidx + 1 ] = quadColor.g;
		batch.colors[ cidx + 2 ] = quadColor.b;
		batch.colors[ cidx + 3 ] = quadColor.a;
		batch.count++;

		// Triangle 2: (x2,y1), (x2,y2), (x1,y2)
		idx = batch.count * batch.vertexComps;
		cidx = batch.count * batch.colorComps;
		batch.vertices[ idx     ] = vx2;
		batch.vertices[ idx + 1 ] = vy1;
		batch.colors[ cidx     ] = quadColor.r;
		batch.colors[ cidx + 1 ] = quadColor.g;
		batch.colors[ cidx + 2 ] = quadColor.b;
		batch.colors[ cidx + 3 ] = quadColor.a;
		batch.count++;

		idx = batch.count * batch.vertexComps;
		cidx = batch.count * batch.colorComps;
		batch.vertices[ idx     ] = vx2;
		batch.vertices[ idx + 1 ] = vy2;
		batch.colors[ cidx     ] = quadColor.r;
		batch.colors[ cidx + 1 ] = quadColor.g;
		batch.colors[ cidx + 2 ] = quadColor.b;
		batch.colors[ cidx + 3 ] = quadColor.a;
		batch.count++;

		idx = batch.count * batch.vertexComps;
		cidx = batch.count * batch.colorComps;
		batch.vertices[ idx     ] = vx1;
		batch.vertices[ idx + 1 ] = vy2;
		batch.colors[ cidx     ] = quadColor.r;
		batch.colors[ cidx + 1 ] = quadColor.g;
		batch.colors[ cidx + 2 ] = quadColor.b;
		batch.colors[ cidx + 3 ] = quadColor.a;
		batch.count++;
	};

	// Add quads for all valid scanlines
	for( const currentY of sortedYCoords ) {

		const mm = scanlineMinMax.get( currentY );
		const xStart = Math.max( mm.min, 0 );
		const xEnd = Math.min( mm.max, maxX - 1 );

		addQuad( xStart, currentY, xEnd + 1, currentY + 1, color );
	}
}
