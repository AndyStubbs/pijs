/**
 * Pi.js - Paint Module
 * 
 * Flood fill algorithm with tolerance support
 * 
 * @module api/paint
 */

"use strict";

import * as g_colors from "./colors.js";
import * as g_utils from "../core/utils.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_commands from "../core/commands.js";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


/**
 * Initialize paint module
 * 
 * @param {Object} api - The main Pi.js API object
 * @returns {void}
 */
export function init( api ) {
	registerCommands();
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


function registerCommands() {
	g_commands.addCommand(
		"paint", paint, true, [ "x", "y", "fillColor", "tolerance", "boundaryColor" ]
	);
}


/**
 * Paint command - flood fill algorithm with tolerance support
 * 
 * @param {Object} screenData - The screen data object
 * @param {Object} options - Options object with x, y, fillColor, tolerance, boundaryColor
 * @param {number} options.tolerance - Color matching tolerance (0 = exact match, 1 = any color)
 * @returns {void}
 */
function paint( screenData, options ) {
	const x = g_utils.getInt( options.x, null );
	const y = g_utils.getInt( options.y, null );
	let fillColor = options.fillColor;
	let tolerance = g_utils.getFloat( options.tolerance, 0 );
	let boundaryColor = options.boundaryColor;

	if( x === null || y === null ) {
		const error = new TypeError( "paint: Parameters x and y must be integers" );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( tolerance < 0 || tolerance > 1 ) {
		const error = new RangeError(
			"paint: Parameter tolerance must be a number between 0 and 1 (0 = exact match, 1 = any color)."
		);
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	// Get fill color
	fillColor = g_colors.getColorValueByRawInput( screenData, fillColor );
	if( fillColor === null ) {
		const error = new RangeError( "paint: Parameter fillColor is not a valid color format." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	const width = screenData.width;
	const height = screenData.height;

	// Check if starting point is in bounds
	if( x < 0 || x >= width || y < 0 || y >= height ) {
		return;
	}

	// Optimization: if tolerance is 1 (any color), just fill the entire screen
	if( tolerance === 1 ) {
		g_renderer.drawRectFilled( screenData, 0, 0, width, height, fillColor );
		g_renderer.setImageDirty( screenData );
		return;
	}

	// Read all pixels from screen as 2D array
	const pixels2D = g_renderer.readPixels( screenData, 0, 0, width, height );
	
	// Convert to flat RGBA array for algorithm
	const data = new Uint8ClampedArray( width * height * 4 );
	for( let row = 0; row < height; row++ ) {
		for( let col = 0; col < width; col++ ) {
			const pixel = pixels2D[ row ][ col ];
			const index = ( row * width + col ) * 4;
			data[ index ] = pixel.r;
			data[ index + 1 ] = pixel.g;
			data[ index + 2 ] = pixel.b;
			data[ index + 3 ] = pixel.a;
		}
	}

	// Get the starting pixel color
	const startIndex = ( y * width + x ) * 4;
	const startR = data[ startIndex ];
	const startG = data[ startIndex + 1 ];
	const startB = data[ startIndex + 2 ];
	const startA = data[ startIndex + 3 ];

	// Don't fill if the color is the same
	if(
		startR === fillColor.r && startG === fillColor.g &&
		startB === fillColor.b && startA === fillColor.a
	) {
		return;
	}

	// Calculate tolerance threshold for color comparison
	// Using perceptual weights: [0.2, 0.68, 0.07, 0.05] for R, G, B, A
	// Tolerance: 0 = exact match only, 1 = any color
	const weights = [ 0.2, 0.68, 0.07, 0.05 ];
	const maxDifference = ( 255 * 255 ) * weights.reduce( ( a, b ) => a + b );
	const toleranceThreshold = ( 1 - tolerance * tolerance ) * maxDifference;

	// Use Uint8Array for efficient visited pixel tracking
	const visited = new Uint8Array( width * height );

	// BFS queue for flood fill - using head pointer for O(1) dequeue
	const queue = [];
	queue.push( { "x": x, "y": y } );

	// Mark starting pixel as visited
	visited[ y * width + x ] = 1;

	// Define color comparison function based on fill mode (no conditionals in hot loop)
	let shouldSkipPixel;
	if( boundaryColor !== null ) {

		// Boundary fill mode: skip pixels that match boundary color
		boundaryColor = g_colors.getColorValueByRawInput( screenData, boundaryColor );
		if( boundaryColor === null ) {
			const error = new RangeError(
				"paint: Parameter boundaryColor is not a valid color format."
			);
			error.code = "INVALID_PARAMETER";
			throw error;
		}
		const refColor = {
			"r": boundaryColor.r, "g": boundaryColor.g, "b": boundaryColor.b, "a": boundaryColor.a
		};
		shouldSkipPixel = ( pixelColor ) => {
			const difference = g_utils.calcColorDifference( refColor, pixelColor, weights );
			const similarity = maxDifference - difference;
			return similarity >= toleranceThreshold;
		};

	} else {

		// Flood fill mode: skip pixels that don't match start color
		const startColor = { "r": startR, "g": startG, "b": startB, "a": startA };
		shouldSkipPixel = ( pixelColor ) => {
			const difference = g_utils.calcColorDifference( startColor, pixelColor, weights );
			const similarity = maxDifference - difference;
			return similarity < toleranceThreshold;
		};
	}

	// Prepare batch for drawing pixels
	const pixelCount = width * height;
	g_renderer.prepareBatch( screenData, g_renderer.POINTS_BATCH, pixelCount );

	let head = 0;
	while( head < queue.length ) {

		// Dequeue using head pointer (O(1) instead of O(n) with shift)
		const pixel = queue[ head++ ];
		const px = pixel.x;
		const py = pixel.y;
		const i = ( py * width + px ) * 4;

		// Get pixel color
		const pixelColor = {
			"r": data[ i ], "g": data[ i + 1 ], "b": data[ i + 2 ], "a": data[ i + 3 ]
		};

		// Skip if color comparison fails
		if( shouldSkipPixel( pixelColor ) ) {
			continue;
		}

		// Fill this pixel using drawPixelUnsafe
		g_renderer.drawPixelUnsafe(
			screenData, pixel.x, pixel.y, fillColor, g_renderer.POINTS_BATCH
		);

		// Add adjacent pixels to queue if not visited and in bounds
		addToQueue( queue, visited, px + 1, py, width, height );
		addToQueue( queue, visited, px - 1, py, width, height );
		addToQueue( queue, visited, px, py + 1, width, height );
		addToQueue( queue, visited, px, py - 1, width, height );
	}

	// Mark image as dirty to trigger render
	g_renderer.setImageDirty( screenData );
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


/**
 * Add pixel to queue if valid and not visited
 * 
 * @param {Array} queue - BFS queue
 * @param {Uint8Array} visited - Visited pixel tracking array
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @returns {void}
 */
function addToQueue( queue, visited, x, y, width, height ) {
	if( x < 0 || x >= width || y < 0 || y >= height ) {
		return;
	}

	const index = y * width + x;
	if( visited[ index ] === 0 ) {
		visited[ index ] = 1;
		queue.push( { "x": x, "y": y } );
	}
}

