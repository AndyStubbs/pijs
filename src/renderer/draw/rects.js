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
import * as g_shapes from "./filled-shapes.js";
import { drawLinePixel } from "./lines.js";


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
export function drawRectPixel( screenData, x, y, width, height, color ) {

	// Nothing to draw
	if( width <= 0 || height <= 0 ) {
		return;
	}

	const x2 = x + width - 1;
	const y2 = y + height - 1;

	// Outline only for pixel pen rectangles

	// Top edge
	drawLinePixel( screenData, x, y, x2, y, color );

	// Right edge
	if( height > 1 ) {
		drawLinePixel( screenData, x2, y, x2, y2, color );
	}

	// Bottom edge
	if( height > 1 ) {
		drawLinePixel( screenData, x2, y2, x, y2, color );
	}

	// Left edge
	if( width > 1 ) {
		drawLinePixel( screenData, x, y2, x, y, color );
	}
}
