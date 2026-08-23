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
import * as g_view from "./view.js";


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
			"paint: Parameter tolerance must be a number between 0 and 1 " +
			"(0 = exact match, 1 = any color)."
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

	const view = screenData.view;
	const clipX = view.clipX;
	const clipY = view.clipY;
	const clipW = view.clipWidth;
	const clipH = view.clipHeight;
	const originX = view.originX;
	const originY = view.originY;
	const startPhys = g_view.toScreen( screenData, x, y );

	if( !g_view.isInsideClip( view, startPhys.x, startPhys.y ) ) {
		return;
	}

	// Optimization: if tolerance is 1 (any color), fill the requested view
	if( tolerance === 1 ) {
		g_renderer.drawRectFilled( screenData, 0, 0, view.width, view.height, fillColor );
		g_renderer.setImageDirty( screenData );
		return;
	}

	const pixels2D = g_renderer.readPixels( screenData, clipX, clipY, clipW, clipH );
	const startColor = pixels2D[ startPhys.y - clipY ][ startPhys.x - clipX ];

	// Don't fill if the color is the same
	if( startColor.key === fillColor.key ) {
		return;
	}

	// Calculate tolerance threshold for color comparison
	// Using perceptual weights: [0.2, 0.68, 0.07, 0.05] for R, G, B, A
	// Tolerance: 0 = exact match only, 1 = any color
	const weights = [ 0.2, 0.68, 0.07, 0.05 ];
	const maxDifference = ( 255 * 255 ) * weights.reduce( ( a, b ) => a + b );
	const toleranceThreshold = ( 1 - tolerance * tolerance ) * maxDifference;

	// Use Uint8Array for efficient visited pixel tracking
	const visited = new Uint8Array( clipW * clipH );

	// BFS queue for flood fill - using head pointer for O(1) dequeue
	const queue = [];
	queue.push( { "x": startPhys.x, "y": startPhys.y } );

	// Mark starting pixel as visited
	visited[ ( startPhys.y - clipY ) * clipW + ( startPhys.x - clipX ) ] = 1;

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
		shouldSkipPixel = ( pixelColor ) => {
			const difference = g_utils.calcColorDifference( boundaryColor, pixelColor, weights );
			const similarity = maxDifference - difference;
			return similarity >= toleranceThreshold;
		};

	} else {

		// Flood fill mode: skip pixels that don't match start color
		shouldSkipPixel = ( pixelColor ) => {
			const difference = g_utils.calcColorDifference( startColor, pixelColor, weights );
			const similarity = maxDifference - difference;
			return similarity < toleranceThreshold;
		};
	}

	// Prepare batch for drawing pixels
	const pixelCount = clipW * clipH;
	g_renderer.prepareBatch( screenData, g_renderer.POINTS_BATCH, pixelCount );

	let head = 0;
	while( head < queue.length ) {

		// Dequeue using head pointer (O(1) instead of O(n) with shift)
		const pixel = queue[ head++ ];
		const px = pixel.x;
		const py = pixel.y;

		// Get pixel color
		const pixelColor = pixels2D[ py - clipY ][ px - clipX ];

		// Skip if color comparison fails
		if( shouldSkipPixel( pixelColor ) ) {
			continue;
		}

		// Fill using local coords so the view origin is applied once
		g_renderer.drawPixelUnsafe(
			screenData, px - originX, py - originY, fillColor, g_renderer.POINTS_BATCH
		);

		addToQueue( queue, visited, px + 1, py, clipX, clipY, clipW, clipH );
		addToQueue( queue, visited, px - 1, py, clipX, clipY, clipW, clipH );
		addToQueue( queue, visited, px, py + 1, clipX, clipY, clipW, clipH );
		addToQueue( queue, visited, px, py - 1, clipX, clipY, clipW, clipH );
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
function addToQueue( queue, visited, x, y, clipX, clipY, clipW, clipH ) {
	if( x < clipX || x >= clipX + clipW || y < clipY || y >= clipY + clipH ) {
		return;
	}

	const index = ( y - clipY ) * clipW + ( x - clipX );
	if( visited[ index ] === 0 ) {
		visited[ index ] = 1;
		queue.push( { "x": x, "y": y } );
	}
}

