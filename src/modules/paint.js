/**
 * Pi.js - Paint Module
 * 
 * Flood fill algorithm with tolerance support
 * 
 * @module modules/paint
 */

"use strict";

import * as screenManager from "../core/screen-manager";
import * as colors from "../core/colors";
import * as utils from "../core/utils";
import * as renderer from "../core/renderer";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize paint module
export function init() {
	// No initialization needed
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// paint command
screenManager.addCommand( "paint", paint, [ "x", "y", "fillColor", "tolerance", "boundaryColor" ] );
function paint( screenData, options ) {
	const x = utils.getInt( options.x, null );
	const y = utils.getInt( options.y, null );
	let fillColor = options.fillColor;
	let tolerance = utils.getFloat( options.tolerance, 1 );
	let boundaryColor = options.boundaryColor;

	if( x === null || y === null ) {
		const error = new TypeError( "paint: Parameters x and y must be integers" );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( tolerance < 0 || tolerance > 1 ) {
		const error = new RangeError(
			"paint: Parameter tolerance must be a number between 0 and 1."
		);
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	// Get fill color
	fillColor = colors.getColorValueByRawInput( screenData, fillColor );
	if( fillColor === null ) {
		const error = new RangeError( "paint: Parameter fillColor is not a valid color format." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}
	renderer.getImageData( screenData );
	const data = screenData.imageData.data;
	const width = screenData.width;
	const height = screenData.height;

	// Check if starting point is in bounds
	if( x < 0 || x >= width || y < 0 || y >= height ) {
		return;
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
	const weights = [ 0.2, 0.68, 0.07, 0.05 ];
	const maxDifference = ( 255 * 255 ) * weights.reduce( ( a, b ) => a + b );
	const toleranceThreshold = tolerance * ( 2 - tolerance ) * maxDifference;

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
		boundaryColor = colors.getColorValueByRawInput( screenData, boundaryColor );
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
			const difference = utils.calcColorDifference( refColor, pixelColor, weights );
			const similarity = maxDifference - difference;
			return similarity >= toleranceThreshold;
		};

	} else {

		// Flood fill mode: skip pixels that don't match start color
		const startColor = { "r": startR, "g": startG, "b": startB, "a": startA };
		shouldSkipPixel = ( pixelColor ) => {
			const difference = utils.calcColorDifference( startColor, pixelColor, weights );
			const similarity = maxDifference - difference;
			return similarity < toleranceThreshold;
		};
	}

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

		// Fill this pixel using the current blend mode
		screenData.blend( screenData, pixel.x, pixel.y, fillColor );

		// Add adjacent pixels to queue if not visited and in bounds
		addToQueue( queue, visited, px + 1, py, width, height );
		addToQueue( queue, visited, px - 1, py, width, height );
		addToQueue( queue, visited, px, py + 1, width, height );
		addToQueue( queue, visited, px, py - 1, width, height );
	}

	renderer.setImageDirty( screenData );
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Add pixel to queue if valid and not visited
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
