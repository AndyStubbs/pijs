/**
 * Pi.js - Graphics Pixels Module
 * 
 * Commands to read and write pixels from the screen.
 * 
 * @module api/pixels
 */

"use strict";

// Imports
import * as g_utils from "../core/utils.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_colors from "./colors.js";
import * as g_commands from "../core/commands.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_textures from "../renderer/textures.js";
import * as g_view from "./view.js";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init( api ) {
	registerCommands();

	// Stable API - do not route through addCommand for hot path put
	api.put = ( data, x, y, include0 ) => {
		return putWrapper( g_screenManager.getActiveScreen( "put" ), data, x, y, include0 );
	};

	// Also add to each screen's api when screen is created
	g_screenManager.addScreenInitFunction( ( screenData ) => {
		screenData.api.put = ( data, x, y, include0 ) => {
			return putWrapper( screenData, data, x, y, include0 );
		};
	} );
}


function registerCommands() {
	
	// Register screen commands
	g_commands.addCommand( "getPixel", getPixel, true, [ "x", "y", "asIndex" ] );
	g_commands.addCommand( "getPixelAsync", getPixelAsync, true, [ "x", "y", "asIndex" ] );
	g_commands.addCommand(
		"get", get, true, [ "x", "y", "width", "height", "tolerance", "asIndex" ]
	);
	g_commands.addCommand(
		"getAsync", getAsync, true, [ "x", "y", "width", "height", "tolerance", "asIndex" ]
	);
	g_commands.addCommand(
		"filterImg", filterImg, true, [ "filter", "x1", "y1", "x2", "y2" ]
	);
}


/***************************************************************************************************
 * Get Pixel and Get Pixel Async
 **************************************************************************************************/


// getPixel: Returns RGBA8 color object by default; if asIndex===true, returns palette index
function getPixel( screenData, options ) {
	const px = g_utils.getInt( options.x, null );
	const py = g_utils.getInt( options.y, null );
	if( px === null || py === null ) {
		const error = new TypeError( "getPixel: Parameters x and y must be integers." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}
	const asIndex = options.asIndex ?? false;
	const colorValue = readViewPixel( screenData, px, py );
	if( asIndex ) {
		return g_colors.findColorIndexByColorValue( screenData, colorValue );
	}
	return colorValue;
}

function getPixelAsync( screenData, options ) {
	const px = g_utils.getInt( options.x, null );
	const py = g_utils.getInt( options.y, null );
	if( px === null || py === null ) {
		const error = new TypeError( "getPixelAsync: Parameters x and y must be integers." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}
	const asIndex = options.asIndex ?? false;
	const resolved = resolveViewPixel( screenData, px, py );
	if( resolved === null ) {
		const empty = g_utils.rgbToColor( 0, 0, 0, 0 );
		if( asIndex ) {
			return Promise.resolve(
				g_colors.findColorIndexByColorValue( screenData, empty )
			);
		}
		return Promise.resolve( empty );
	}
	return g_renderer.readPixelAsync( screenData, resolved.x, resolved.y ).then( ( colorValue ) => {
		if( asIndex ) {
			return g_colors.findColorIndexByColorValue( screenData, colorValue );
		}
		return colorValue;
	} );
}


/***************************************************************************************************
 * Get and Get Async
 **************************************************************************************************/


// get: Returns a 2D array [height][width] of palette indices by default.
// Set asIndex=false to return colorValue objects instead.
// Optional tolerance passed to findColorIndexByColorValue.
function get( screenData, options ) {
	const pX = g_utils.getInt( options.x, null );
	const pY = g_utils.getInt( options.y, null );
	const pWidth = g_utils.getInt( options.width, null );
	const pHeight = g_utils.getInt( options.height, null );
	const tolerance = g_utils.getFloat( options.tolerance, 1 );
	const asIndex = options.asIndex ?? true;

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

	const region = resolveViewReadRect( screenData, pX, pY, pWidth, pHeight );
	if( region === null ) {
		return [];
	}
	const colors = g_renderer.readPixels(
		screenData, region.x, region.y, region.width, region.height
	);
	return convertColorsToIndices( screenData, colors, region.width, asIndex, tolerance );
}

function getAsync( screenData, options ) {
	const pX = g_utils.getInt( options.x, null );
	const pY = g_utils.getInt( options.y, null );
	const pWidth = g_utils.getInt( options.width, null );
	const pHeight = g_utils.getInt( options.height, null );
	const tolerance = g_utils.getFloat( options.tolerance, 1 );
	const asIndex = options.asIndex ?? true;

	if( pX === null || pY === null || pWidth === null || pHeight === null ) {
		const error = new TypeError(
			"getAsync: Parameters x, y, width and height must be integers."
		);
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( pWidth <= 0 || pHeight <= 0 ) {
		return Promise.resolve( [] );
	}

	const region = resolveViewReadRect( screenData, pX, pY, pWidth, pHeight );
	if( region === null ) {
		return Promise.resolve( [] );
	}

	return g_renderer.readPixelsAsync(
		screenData, region.x, region.y, region.width, region.height
	).then( ( colors ) => {
		return convertColorsToIndices( screenData, colors, region.width, asIndex, tolerance );
	} );
}

/**
 * Convert colors array to indices array if needed
 * 
 * @param {Object} screenData - Screen data object
 * @param {Array} colors - 2D array of color values [height][width]
 * @param {number} width - Width of the region
 * @param {boolean} asIndex - Whether to convert to indices
 * @param {number|undefined} tolerance - Tolerance for color matching
 * @returns {Array} 2D array of colors or indices
 */
function convertColorsToIndices( screenData, colors, width, asIndex, tolerance ) {
	if( !asIndex ) {
		return colors;
	}

	const results = new Array( colors.length );
	for( let row = 0; row < colors.length; row++ ) {
		const resultsRow = new Array( width );
		const rowLength = colors[ row ] ? colors[ row ].length : 0;
		
		for( let col = 0; col < width; col++ ) {
			if( col < rowLength ) {
				const colorValue = colors[ row ][ col ];
				const idx = g_colors.findColorIndexByColorValue(
					screenData, colorValue, tolerance
				);
				resultsRow[ col ] = ( idx === null ? 0 : idx );
			} else {
				resultsRow[ col ] = 0;
			}
		}
		results[ row ] = resultsRow;
	}
	return results;
}


/***************************************************************************************************
 * Filter Image
 **************************************************************************************************/


/**
 * Apply a filter function to a region of the screen
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options object with filter, x1, y1, x2, y2
 * @returns {void}
 */
function filterImg( screenData, options ) {
	const filter = options.filter;

	const viewSnap = g_view.snapshotView( screenData );
	let x1 = g_utils.getInt( options.x1, 0 );
	let y1 = g_utils.getInt( options.y1, 0 );
	let x2 = g_utils.getInt( options.x2, viewSnap.width - 1 );
	let y2 = g_utils.getInt( options.y2, viewSnap.height - 1 );

	if( !g_utils.isFunction( filter ) ) {
		const error = new TypeError( "filterImg: Argument filter must be a callback function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	// Inclusive local corners → half-open, then intersect the captured clip
	const left = Math.min( x1, x2 );
	const top = Math.min( y1, y2 );
	const right = Math.max( x1, x2 ) + 1;
	const bottom = Math.max( y1, y2 ) + 1;
	const phys = g_view.intersectRects(
		left + viewSnap.originX, top + viewSnap.originY,
		right - left, bottom - top,
		viewSnap.clipX, viewSnap.clipY, viewSnap.clipWidth, viewSnap.clipHeight
	);

	if( phys.width <= 0 || phys.height <= 0 ) {
		return;
	}

	// Queue filter operation to run at end of frame
	g_utils.queueMicrotask( () => {
		g_utils.queueMicrotask( () => {
			applyFilter( screenData, filter, phys.x, phys.y, phys.width, phys.height, viewSnap );
		} );
	} );
}

/**
 * Apply filter to pixel region (called at end of frame)
 * 
 * @param {Object} screenData - Screen data object
 * @param {Function} filter - Filter callback function (pixelData, x, y) => boolean
 * 							  pixelData is a Uint8ClampedArray with [r, g, b, a] at indices 0-3
 * @param {number} x1 - Left coordinate
 * @param {number} y1 - Top coordinate
 * @param {number} width - Region width
 * @param {number} height - Region height
 * @returns {void}
 */
function applyFilter( screenData, filter, x1, y1, width, height, viewSnap ) {

	// Ensure batches are flushed before reading
	g_renderer.flushBatches( screenData );

	// Read pixels as raw Uint8Array (bottom-left origin from WebGL)
	const imageData = g_renderer.readPixelsRaw( screenData, x1, y1, width, height );

	if( !imageData ) {
		return;
	}

	const screenHeight = screenData.height;

	// Build filtered pixel data in bottom-left origin format (for WebGL texSubImage2D)
	// The input pixelData is in bottom-left origin, so we need to flip Y when accessing
	// for the filter callback (which expects top-left coordinates), then flip back for output
	const filteredData = new Uint8Array( width * height * 4 );
	const pixelData = new Uint8ClampedArray( 4 );

	for( let y = 0; y < height; y++ ) {
		for( let x = 0; x < width; x++ ) {

			// Convert top-left y to bottom-left y for reading from pixelData
			// pixelData is ordered from bottom row to top row
			const srcRow = ( height - 1 ) - y;
			const srcIndex = ( srcRow * width + x ) * 4;

			// Populate the temporary buffer with current pixel's RGBA8
			pixelData[ 0 ] = imageData[ srcIndex ];
			pixelData[ 1 ] = imageData[ srcIndex + 1 ];
			pixelData[ 2 ] = imageData[ srcIndex + 2 ];
			pixelData[ 3 ] = imageData[ srcIndex + 3 ];

			// Output index is in bottom-left origin format (same as pixelData)
			const dstIndex = ( srcRow * width + x ) * 4;

			// Call filter with pixelData array
			// x and y are in top-left coordinate system for the filter callback
			const localX = ( x1 + x ) - viewSnap.originX;
			const localY = ( y1 + y ) - viewSnap.originY;
			if( filter( pixelData, localX, localY ) ) {

				// Update the pixeldata 
				filteredData[ dstIndex     ] = pixelData[ 0 ];
				filteredData[ dstIndex + 1 ] = pixelData[ 1 ];
				filteredData[ dstIndex + 2 ] = pixelData[ 2 ];
				filteredData[ dstIndex + 3 ] = pixelData[ 3 ];
			} else {

				// Invalid color format, keep original pixel
				filteredData[ dstIndex     ] = 0;
				filteredData[ dstIndex + 1 ] = 0;
				filteredData[ dstIndex + 2 ] = 0;
				filteredData[ dstIndex + 3 ] = 0;
			}
		}
	}

	// Calculate destination Y in WebGL texture coordinates (bottom-left origin)
	// The texture Y coordinate is the bottom edge of the region
	const dstY = screenHeight - ( y1 + height );

	// Update FBO texture directly using texSubImage2D
	// Pass null as imgKey to use screenData.fboTexture directly
	g_textures.updateWebGL2TextureSubImage(
		screenData, null, filteredData, width, height, x1, dstY
	);

	// Mark image as dirty to trigger render
	g_renderer.setImageDirty( screenData );
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

	// Clip dest against the effective view clip in local coordinates
	const view = screenData.view;
	const clipLocalX = view.clipX - view.originX;
	const clipLocalY = view.clipY - view.originY;
	const dest = g_view.intersectRects(
		pX, pY,
		pData[ 0 ] ? pData[ 0 ].length : 0, pData.length,
		clipLocalX, clipLocalY, view.clipWidth, view.clipHeight
	);

	let startX = dest.x - pX;
	let startY = dest.y - pY;
	let width = dest.width;
	let height = dest.height;

	// If nothing to draw after clipping, exit
	if( width <= 0 || height <= 0 ) {
		return null;
	}

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

	g_renderer.prepareBatch( screenData, g_renderer.POINTS_REPLACE_BATCH, pixelCount );

	put( screenData, pData, pX, pY, pInclude0, startY, startX, width, height );

	// Mark image as dirty
	g_renderer.setImageDirty( screenData );
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

			g_renderer.drawPixelUnsafe(
				screenData, sx, sy, colorValue, g_renderer.POINTS_REPLACE_BATCH
			);
		}
	}
}


/**
 * Read one view-local pixel, or transparent black if outside the effective clip.
 *
 * @param {Object} screenData - Screen data object
 * @param {number} x - Local x
 * @param {number} y - Local y
 * @returns {Object} Color value
 */
function readViewPixel( screenData, x, y ) {
	const resolved = resolveViewPixel( screenData, x, y );
	if( resolved === null ) {
		return g_utils.rgbToColor( 0, 0, 0, 0 );
	}
	return g_renderer.readPixel( screenData, resolved.x, resolved.y );
}

/**
 * Convert a local point to a physical FBO point if it is inside the clip.
 *
 * @param {Object} screenData - Screen data object
 * @param {number} x - Local x
 * @param {number} y - Local y
 * @returns {{ x: number, y: number }|null}
 */
function resolveViewPixel( screenData, x, y ) {
	const phys = g_view.toScreen( screenData, x, y );
	if( !g_view.isInsideClip( screenData.view, phys.x, phys.y ) ) {
		return null;
	}
	return phys;
}

/**
 * Convert a local read rectangle to the visible physical intersection.
 *
 * @param {Object} screenData - Screen data object
 * @param {number} x - Local x
 * @param {number} y - Local y
 * @param {number} width - Requested width
 * @param {number} height - Requested height
 * @returns {{ x: number, y: number, width: number, height: number }|null}
 */
function resolveViewReadRect( screenData, x, y, width, height ) {
	const view = screenData.view;
	const phys = g_view.toScreen( screenData, x, y );
	const clip = g_view.intersectRects(
		phys.x, phys.y, width, height,
		view.clipX, view.clipY, view.clipWidth, view.clipHeight
	);
	if( clip.width <= 0 || clip.height <= 0 ) {
		return null;
	}
	return clip;
}

