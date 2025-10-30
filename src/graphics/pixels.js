/**
 * Pi.js - Graphics Pixels Module
 * 
 * Commands to read and write pixels from the screen across renderers.
 * 
 * @module graphics/pixels
 */

"use strict";

// Imports
import * as g_utils from "../core/utils.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_colors from "./colors.js";

let m_api = null;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init( api ) {
	m_api = api;

	// Stable API - do not rebuild with graphics-api
	api.getPixel = ( x, y, asIndex = false ) => {
		return getPixel( g_screenManager.getActiveScreen( "getPixel" ), x, y, asIndex );
	};
	api.getPixelAsync = ( x, y, asIndex = false ) => {
		return getPixelAsync( g_screenManager.getActiveScreen( "getPixel" ), x, y, asIndex );
	};
	api.get = ( x, y, width, height, asIndex = true, tolerance = 1 ) => {
		return get(
			g_screenManager.getActiveScreen( "getPixel" ), x, y, width, height, asIndex, tolerance
		);
	}

	// Also add to each screen's api for convenience
	g_screenManager.addScreenInitFunction( ( screenData ) => {
		screenData.api.getPixel = ( x, y, asIndex ) => getPixel( screenData, x, y, asIndex );
		screenData.api.getPixelAsync = ( x, y, asIndex ) => {
			return getPixelAsync( screenData, x, y, asIndex );
		};
		screenData.api.get = ( x, y, width, height, asIndex, tolerance ) => {
			return get( screenData, x, y, width, height, asIndex, tolerance );
		};
	} );
}


/***************************************************************************************************
 * External API
 **************************************************************************************************/


// getPixel: Returns RGBA color object by default; if asIndex===true, returns palette index
function getPixel( screenData, x, y, asIndex ) {
	const { x: px, y: py } = parseXY( "getPixel", x, y );
	const colorValue = screenData.renderer.readPixels( screenData, [ [ px, py ] ] )[ 0 ];
	if( asIndex ) {
		return g_colors.findColorIndexByColorValue( screenData, colorValue );
	}
	return colorValue;
}

function getPixelAsync( screenData, x, y, asIndex ) {
	const { x: px, y: py } = parseXY( "getPixelAsync", x, y );
	return screenData.renderer.readPixelsAsync( screenData, [ [ px, py ] ] ).then( ( arr ) => {
		const colorValue = arr[ 0 ];
		if( asIndex ) {
			return g_colors.findColorIndexByColorValue( screenData, colorValue );
		}
		return colorValue;
	} );
}

// get: Returns a 2D array [height][width] of palette indices by default.
// Set asIndex=false to return colorValue objects instead.
// Optional tolerance passed to findColorIndexByColorValue.
function get( screenData, xIn, yIn, widthIn, heightIn, asIndex, tolerance ) {
	const x = g_utils.getInt( xIn, null );
	const y = g_utils.getInt( yIn, null );
	const w = g_utils.getInt( widthIn, null );
	const h = g_utils.getInt( heightIn, null );

	if( x === null || y === null || w === null || h === null ) {
		const error = new TypeError(
			"get: Parameters x, y, width and height must be integers."
		);
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( w <= 0 || h <= 0 ) {
		return [];
	}
	const result = new Array( h );
	const coords = [];
	for( let row = 0; row < h; row++ ) {
		for( let col = 0; col < w; col++ ) {
			coords.push( [ x + col, y + row ] );
		}
	}
	const colors = screenData.renderer.readPixels( screenData, coords );
	for( let row = 0; row < h; row++ ) {
		const arr = new Array( w );
		for( let col = 0; col < w; col++ ) {
			const colorValue = colors[ row * w + col ];
			if( asIndex ) {
				const idx = g_colors.findColorIndexByColorValue( screenData, colorValue, tolerance );
				arr[ col ] = ( idx === null ? 0 : idx );
			} else {
				arr[ col ] = colorValue;
			}
		}
		result[ row ] = arr;
	}

	return result;
}


/***************************************************************************************************
 * Internal Helper Functions
 **************************************************************************************************/


function parseXY( commandName, x, y ) {
	const px = g_utils.getInt( x, null );
	const py = g_utils.getInt( y, null );
	if( px === null || py === null ) {
		const error = new TypeError( `${commandName}: Parameters x and y must be integers.` );
		error.code = "INVALID_PARAMETER";
		throw error;
	}
	return { x: px, y: py };
}
