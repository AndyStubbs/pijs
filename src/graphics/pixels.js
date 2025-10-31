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
	api.getPixel = ( x, y, asIndex  ) => {
		return getPixel( g_screenManager.getActiveScreen( "getPixel" ), x, y, asIndex );
	};
	api.getPixelAsync = ( x, y, asIndex ) => {
		return getPixelAsync( g_screenManager.getActiveScreen( "getPixel" ), x, y, asIndex );
	};
	api.get = ( x, y, width, height, tolerance, asIndex ) => {
		return get(
			g_screenManager.getActiveScreen( "getPixel" ), x, y, width, height, tolerance, asIndex
		);
	};
	api.put = ( data, x, y, include0 ) => {
		return putWrapper( g_screenManager.getActiveScreen( "getPixel" ), data, x, y, include0 );
	};

	// Also add to each screen's api for convenience
	g_screenManager.addScreenInitFunction( ( screenData ) => {
		screenData.api.getPixel = ( x, y, asIndex ) => getPixel( screenData, x, y, asIndex );
		screenData.api.getPixelAsync = ( x, y, asIndex ) => {
			return getPixelAsync( screenData, x, y, asIndex );
		};
		screenData.api.get = ( x, y, width, height, tolerance, asIndex ) => {
			return get( screenData, x, y, width, height, tolerance, asIndex );
		};
		screenData.api.put = ( data, x, y, include0 ) => {
			return putWrapper( screenData, data, x, y, include0 );
		};
	} );
}


/***************************************************************************************************
 * External API
 **************************************************************************************************/


// getPixel: Returns RGBA color object by default; if asIndex===true, returns palette index
function getPixel( screenData, x, y, asIndex = false ) {
	const { x: px, y: py } = parseXY( "getPixel", x, y );
	const colorValue = screenData.renderer.readPixel( screenData, px, py );
	if( asIndex ) {
		return g_colors.findColorIndexByColorValue( screenData, colorValue );
	}
	return colorValue;
}

function getPixelAsync( screenData, x, y, asIndex = false ) {
	const { x: px, y: py } = parseXY( "getPixelAsync", x, y );
	return screenData.renderer.readPixelsAsync( screenData, x, y ).then( ( arr ) => {
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
function get( screenData, x, y, width, height, tolerance, asIndex = true ) {
	const pX = g_utils.getInt( x, null );
	const pY = g_utils.getInt( y, null );
	const pWidth = g_utils.getInt( width, null );
	const pHeight = g_utils.getInt( height, null );

	if( pX === null || pY === null || pWidth === null || pHeight === null ) {
		const error = new TypeError(
			"get: Parameters x, y, width and height must be integers."
		);
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( pWidth <= 0 || pHeight <= 0 ) {
		return [];
	}

	const colors = screenData.renderer.readPixels( screenData, pX, pY, pWidth, pHeight );
	if( !asIndex ) {
		return colors;
	}
	const results = new Array( colors.length );
	for( let row = 0; row < colors.length; row++ ) {
		const resultsRow = new Array( colors[ row ].length );
		for( let col = 0; col < pWidth; col++ ) {
			const colorValue = colors[ row ][ col ];
			if( asIndex ) {
				const idx = g_colors.findColorIndexByColorValue(
					screenData, colorValue, tolerance
				);
				resultsRow[ col ] = ( idx === null ? 0 : idx );
			} else {
				resultsRow[ col ] = colorValue;
			}
		}
		results[ row ] = resultsRow;
	}

	return results;
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


/***************************************************************************************************
 * Write API
 **************************************************************************************************/

// Wrapper for the put commands handles all parsing and data validation
function putWrapper( screenData, data, x, y, include0 = false ) {

	// Accept either object-literal or positional params without using parseOptions
	let pData, pX, pY, pInclude0;
	if( g_utils.isObjectLiteral( data ) ) {
		pData = data.data;
		pX = g_utils.getInt( data.x, null );
		pY = g_utils.getInt( data.y, null );
		pInclude0 = !!data.include0;
	} else {
		pData = data;
		pX = g_utils.getInt( x, null );
		pY = g_utils.getInt( y, null );
		pInclude0 = !!include0;
	}

	// Fast bail if no data
	if( !pData || pData.length < 1 ) {
		return null;
	}

	// Validate coordinates
	if( pX === null || pY === null ) {
		const error = new TypeError( "put: Parameters x and y must be integers." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	// Validate and clip data
	const screenW = screenData.width;
	const screenH = screenData.height;

	// Clip starting offsets when x/y are negative
	let startX = ( pX < 0 ? -pX : 0 );
	let startY = ( pY < 0 ? -pY : 0 );

	// Calculate width/height available from data starting at the clipped offsets
	let width = data[ 0 ] ? ( data[ 0 ].length - startX ) : 0;
	let height = data.length - startY;

	// Clamp to screen bounds
	if( pX + startX + width > screenW ) {
		width = screenW - pX - startX;
	}
	if( pY + startY + height > screenH ) {
		height = screenH - pY - startY;
	}

	// If nothing to draw after clipping, exit
	if( width <= 0 || height <= 0 ) {
		return;
	}

	if( screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {

		// Call context getImageData only if out of sync
		screenData.renderer.getImageData();
	} else {

		// Prepare the batch by making sure there are enough memory in the batch
		let pixelCount = 0;

		// Use the already calculated loop bounds
		for( let i = startY; i < startY + height; i++ ) {
			const row = pData[ i ];

			// Check if row exists
			if( row ) {

				// The actual number of pixels drawn from this row will be `width`
				pixelCount += width;
			}
		}

		screenData.renderer.prepareBatch( screenData, screenData.pointBatch, pixelCount );
	}

	put( screenData, data, pX, pY, pInclude0, startY, startX, width, height );

	// Mark image as dirty
	screenData.renderer.setImageDirty( screenData );
}

// put: Hot path inner function. Assumes x/y are integers and data is a 2D array.
function put( screenData, data, x, y, include0, startY, startX, width, height ) {
	
	const endY = startY + height;
	const endX = startX + width;

	// Draw
	for( let dataY = startY; dataY < endY; dataY++ ) {
		const row = data[ dataY ];
		if( !row ) {
			continue;
		}
		for( let dataX = startX; dataX < endX; dataX++ ) {

			// Double bitwise NOT - fast convert to int function
			const colorIndex = ~~row[ dataX ];

			// Skip transparent unless include0 is true
			if( colorIndex === 0 && include0 === false ) {
				continue;
			}

			const colorValue = g_colors.getColorValueByIndex( screenData, colorIndex );
			const sx = x + dataX;
			const sy = y + dataY;

			screenData.renderer.drawPixelUnsafe( screenData, sx, sy, colorValue );
		}
	}
}
