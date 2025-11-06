/**
 * Pi.js - Rects Drawing Module
 * 
 * High-level primitive drawing operations: rects
 * 
 * drawRectPenPixel, drawRectSquare, drawRectCircle
 * 
 * @module renderer/draw/rects
 */

"use strict";

// Import required modules
import { drawLine } from "./lines.js";
import { GEOMETRY_BATCH  } from "../renderer.js";
import * as g_batches from "../batches.js";
import * as g_batchHelpers from "./batch-helpers.js";

/***************************************************************************************************
 * Public API
 ***************************************************************************************************/


/**
 * Draw a rectangle (outline and optional fill) using the pixel pen.
 *
 * @param {Object} screenData - Screen data object
 * @param {number} x - Left coordinate
 * @param {number} y - Top coordinate
 * @param {number} width - Rectangle width (pixels)
 * @param {number} height - Rectangle height (pixels)
 * @param {Object} color - Outline color { r,g,b,a }
 * @returns {void}
 */
export function drawRect( screenData, x, y, width, height, color ) {
	const x2 = x + width - 1;
	const y2 = y + height - 1;

	// Outline only for pixel pen rectangles

	// Top edge
	drawRectFilled( screenData, x, y, width, 1, color );

	// Bottom edge
	if( height > 1 ) {
		drawRectFilled( screenData, x, y + height - 1, width, 1, color );
	}

	// Left edge
	if( width > 1 && height > 2 ) {
		drawRectFilled( screenData, x + width - 1, y + 1, 1, height - 2, color );
	}
	
	// Right edge
	if( height > 2 ) {
		drawRectFilled( screenData, x, y + 1, 1, height - 2, color );
	}
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
export function drawRectFilled( screenData, x, y, width, height, color ) {

	// Get geometry batch
	const batch = screenData.batches[ GEOMETRY_BATCH ];

	// Prepare batch for 6 vertices (2 triangles)
	g_batches.prepareBatch( screenData, GEOMETRY_BATCH, 6 );

	const x1 = x;
	const y1 = y;
	const x2 = x + width;
	const y2 = y + height;

	// First triangle: (x,y), (x+width,y), (x,y+height)
	g_batchHelpers.addTriangleToBatch( batch, x1, y1, x2, y1, x1, y2, color );

	// Second triangle: (x+width,y), (x+width,y+height), (x,y+height)
	g_batchHelpers.addTriangleToBatch( batch, x2, y1, x2, y2, x1, y2, color );
}
