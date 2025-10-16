/**
 * Pi.js - Paint Module
 * 
 * Flood fill algorithm with tolerance support
 * 
 * @module modules/paint
 */

"use strict";

import * as screenManager from "../core/screen-manager";
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
screenManager.addCommand( "paint", paint, [ "x", "y", "fillColor", "tolerance" ] );
function paint( screenData, options ) {
	const x = Math.round( options.x );
	const y = Math.round( options.y );
	let fillColor = options.fillColor;
	let tolerance = options.tolerance;

	if( !utils.isInteger( x ) || !utils.isInteger( y ) ) {
		const error = new TypeError( "paint: Parameters x and y must be integers" );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	// Set the default tolerance to 1 for maximum fill tolerance
	// Note: Even with tolerance=1, the algorithm still respects color boundaries
	if( tolerance == null || tolerance === false ) {
		tolerance = 1;
	}

	if( isNaN( tolerance ) || tolerance < 0 || tolerance > 1 ) {
		const error = new RangeError(
			"paint: Parameter tolerance must be a number between 0 and 1."
		);
		error.code = "INVALID_TOLERANCE";
		throw error;
	}

	// Get fill color
	if( utils.isInteger( fillColor ) ) {
		if( fillColor >= screenData.pal.length ) {
			const error = new RangeError(
				"paint: Argument fillColor is not a color in the palette."
			);
			error.code = "COLOR_OUT_OF_RANGE";
			throw error;
		}
		fillColor = screenData.pal[ fillColor ];
	} else {
		fillColor = utils.convertToColor( fillColor );
		if( fillColor === null ) {
			const error = new TypeError( "paint: Argument fillColor is not a valid color format." );
			error.code = "INVALID_COLOR";
			throw error;
		}
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
	const maxDifference = ( 255 * 255 ) * 3.25;
	const toleranceThreshold = tolerance * ( 2 - tolerance ) * maxDifference;

	// Use Uint8Array for efficient visited pixel tracking
	const visited = new Uint8Array( width * height );

	// BFS queue for flood fill - using head pointer for O(1) dequeue
	const queue = [];
	queue.push( { "x": x, "y": y } );

	// Mark starting pixel as visited
	visited[ y * width + x ] = 1;

	let head = 0;
	while( head < queue.length ) {

		// Dequeue using head pointer (O(1) instead of O(n) with shift)
		const pixel = queue[ head++ ];
		const px = pixel.x;
		const py = pixel.y;

		const i = ( py * width + px ) * 4;
		const pixelR = data[ i ];
		const pixelG = data[ i + 1 ];
		const pixelB = data[ i + 2 ];
		const pixelA = data[ i + 3 ];

		// Calculate color difference
		const dr = pixelR - startR;
		const dg = pixelG - startG;
		const db = pixelB - startB;
		const da = pixelA - startA;
		const difference = ( dr * dr + dg * dg + db * db + da * da * 0.25 );
		const similarity = maxDifference - difference;

		// Skip if color doesn't match within tolerance
		if( similarity < toleranceThreshold ) {
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

