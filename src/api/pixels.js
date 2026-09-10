/**
 * Pi.js - Graphics Pixels Module
 *
 * Commands to read and write pixels from the screen.
 *
 * @module api/pixels
 */

"use strict";

import * as g_contextState from "../renderer/context-state.js";
import * as g_alpha from "../renderer/alpha.js";
import * as g_utils from "../core/utils.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_colors from "./colors.js";
import * as g_commands from "../core/commands.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_textures from "../renderer/textures.js";
import * as g_view from "./view.js";

const m_activeFilters = new WeakMap();


/*************************************************************************************************
 * Module Commands
 ************************************************************************************************/


/**
 * Initialize the module and register its commands and lifecycle hooks.
 *
 * @param {Object} api - Public Pi.js API.
 * @returns {void}
 */
export function init( api ) {
	registerCommands();
	g_screenManager.addScreenPreCleanupFunction( cancelFilter );

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


/*************************************************************************************************
 * Get Pixel and Get Pixel Async
 ************************************************************************************************/


/**
 * Read a pixel in the current view as a color object or palette index.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {Object|number|null}
 */
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

/**
 * Read a pixel in a captured view, rejecting deferred work if the screen is removed.
 *
 * @param {Object} screenData - Screen data
 * @param {Object} options - Coordinates and optional palette-index selection
 * @returns {Promise<Object|number>} Pixel result; rejects with SCREEN_REMOVED on disposal
 */
function getPixelAsync( screenData, options ) {
	const generation = g_contextState.getContextGeneration( screenData );
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
			return Promise.resolve( g_colors.findColorIndexByColorValue( screenData, empty ) );
		}
		return Promise.resolve( empty );
	}
	return g_renderer.readPixelAsync( screenData, resolved.x, resolved.y ).then( ( colorValue ) => {
		g_screenManager.assertScreenAvailable( screenData );
		if(
			g_contextState.probeContextLoss(
				screenData
			) || generation !== g_contextState.getContextGeneration(
				screenData
			)
		) {
			colorValue = g_utils.rgbToColor( 0, 0, 0, 0 );
		}
		if( asIndex ) {
			return g_colors.findColorIndexByColorValue( screenData, colorValue );
		}
		return colorValue;
	} );
}


/*************************************************************************************************
 * Get and Get Async
 ************************************************************************************************/


/**
 * Read a rectangle in the current view as rows of colors or palette indices.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {Array<Array<Object|number>>}
 */
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

/**
 * Read a captured view region, rejecting deferred work if the screen is removed.
 *
 * @param {Object} screenData - Screen data
 * @param {Object} options - Region, tolerance and palette-index selection
 * @returns {Promise<Array>} Pixel rows; rejects with SCREEN_REMOVED on disposal
 */
function getAsync( screenData, options ) {
	const generation = g_contextState.getContextGeneration( screenData );
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
		g_screenManager.assertScreenAvailable( screenData );
		if(
			g_contextState.probeContextLoss( screenData ) ||
			generation !== g_contextState.getContextGeneration( screenData )
		) {
			colors = colors.map( row => row.map( () => g_utils.rgbToColor( 0, 0, 0, 0 ) ) );
		}
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
		let rowLength;
		if( colors[ row ] ) {
			rowLength = colors[ row ].length;
		} else {
			rowLength = 0;
		}

		for( let col = 0; col < width; col++ ) {
			if( col < rowLength ) {
				const colorValue = colors[ row ][ col ];
				const idx = g_colors.findColorIndexByColorValue(
					screenData, colorValue, tolerance
				);
				if( idx === null ) {
					resultsRow[ col ] = 0;
				} else {
					resultsRow[ col ] = idx;
				}
			} else {
				resultsRow[ col ] = 0;
			}
		}
		results[ row ] = resultsRow;
	}
	return results;
}


/*************************************************************************************************
 * Filter Image
 ************************************************************************************************/

/**
 * Stop an active filter through its existing loop bounds before screen resources are released.
 *
 * @param {Object} screenData - Screen being removed
 * @returns {void}
 */
function cancelFilter( screenData ) {
	const cancel = m_activeFilters.get( screenData );
	if( cancel ) {
		cancel();
	}
}


/**
 * Apply a filter function to a region of the screen.
 * Disposal cancels queued work; disposal inside the callback stops further pixels and upload.
 *
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options object with filter, x1, y1, x2, y2
 * @returns {void}
 */
function filterImg( screenData, options ) {
	const filter = options.filter;

	const viewSnap = g_view.snapshotView( screenData );
	const x1 = g_utils.getInt( options.x1, 0 );
	const y1 = g_utils.getInt( options.y1, 0 );
	const x2 = g_utils.getInt( options.x2, viewSnap.width - 1 );
	const y2 = g_utils.getInt( options.y2, viewSnap.height - 1 );

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

	if( g_contextState.isContextUnavailable( screenData ) ) {
		return;
	}
	const generation = g_contextState.getContextGeneration( screenData );

	// Queue filter operation to run at end of frame
	g_utils.queueMicrotask( () => {
		if(
			screenData.isRemoved || g_contextState.isContextUnavailable( screenData ) ||
			generation !== g_contextState.getContextGeneration( screenData )
		) {
			return;
		}
		g_utils.queueMicrotask( () => {
			if( generation === g_contextState.getContextGeneration( screenData ) ) {
				applyFilter( screenData, filter, phys.x, phys.y, phys.width, phys.height, viewSnap );
			}
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
	if( screenData.isRemoved || g_contextState.isContextUnavailable( screenData ) ) {
		return;
	}

	// Ensure batches are flushed before reading
	g_renderer.flushBatches( screenData );

	// Read pixels as raw Uint8Array (bottom-left origin from WebGL)
	const imageData = g_renderer.readPixelsRaw( screenData, x1, y1, width, height );

	if( !imageData || g_contextState.isContextUnavailable( screenData ) ) {
		return;
	}

	g_alpha.unpremultiplyPixels( imageData );

	const screenHeight = screenData.height;

	// Build filtered pixel data in bottom-left origin format (for WebGL texSubImage2D)
	// The input pixelData is in bottom-left origin, so we need to flip Y when accessing
	// for the filter callback (which expects top-left coordinates), then flip back for output
	const filteredData = new Uint8Array( width * height * 4 );
	const pixelData = new Uint8ClampedArray( 4 );

	// Cleanup shortens the loops without adding a disposal check to every pixel.
	m_activeFilters.set( screenData, () => {
		width = 0;
		height = 0;
	} );
	try {
		for( let y = 0; y < height; y++ ) {
			for( let x = 0; x < width; x++ ) {

				// Convert top-left y to bottom-left y for reading from pixelData.
				const srcRow = ( height - 1 ) - y;
				const srcIndex = ( srcRow * width + x ) * 4;

				// Populate the temporary buffer with current pixel's RGBA8.
				pixelData[ 0 ] = imageData[ srcIndex ];
				pixelData[ 1 ] = imageData[ srcIndex + 1 ];
				pixelData[ 2 ] = imageData[ srcIndex + 2 ];
				pixelData[ 3 ] = imageData[ srcIndex + 3 ];

				// Output index is in bottom-left origin format (same as pixelData).
				const dstIndex = ( srcRow * width + x ) * 4;

				// Call filter using the captured view's top-left coordinates.
				const localX = ( x1 + x ) - viewSnap.originX;
				const localY = ( y1 + y ) - viewSnap.originY;
				const keep = filter( pixelData, localX, localY );
				if( screenData.isRemoved || g_contextState.isContextUnavailable( screenData ) ) {
					return;
				}
				if( keep ) {

					// These local buffers remain valid even if the callback removed the screen.
					filteredData[ dstIndex     ] = pixelData[ 0 ];
					filteredData[ dstIndex + 1 ] = pixelData[ 1 ];
					filteredData[ dstIndex + 2 ] = pixelData[ 2 ];
					filteredData[ dstIndex + 3 ] = pixelData[ 3 ];
				} else {

					// A rejected pixel becomes transparent.
					filteredData[ dstIndex     ] = 0;
					filteredData[ dstIndex + 1 ] = 0;
					filteredData[ dstIndex + 2 ] = 0;
					filteredData[ dstIndex + 3 ] = 0;
				}
			}
		}
	} finally {
		m_activeFilters.delete( screenData );
	}

	// A callback may have removed the screen; never upload to its disposed texture.
	if( screenData.isRemoved || g_contextState.isContextUnavailable( screenData ) ) {
		return;
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


/*************************************************************************************************
 * Write API
 ************************************************************************************************/


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
	let sourceWidth = 0;
	if( pData[ 0 ] ) {
		sourceWidth = pData[ 0 ].length;
	}
	const dest = g_view.intersectRects(
		pX, pY,
		sourceWidth, pData.length,
		clipLocalX, clipLocalY, view.clipWidth, view.clipHeight
	);

	const startX = dest.x - pX;
	const startY = dest.y - pY;
	const width = dest.width;
	const height = dest.height;

	// If nothing to draw after clipping, exit
	if( width <= 0 || height <= 0 ) {
		return null;
	}

	put( screenData, pData, pX, pY, pInclude0, startY, startX, width, height );

	// Mark image as dirty
	g_renderer.setImageDirty( screenData );
}

// put: Hot path inner function. Assumes x/y are integers and data is a 2D array.
function put( screenData, data, x, y, include0, startY, startX, width, height ) {
	if( g_contextState.isContextUnavailable( screenData ) ) {
		return;
	}

	const endY = startY + height;
	const endX = startX + width;
	const writePoint = g_renderer.createPointWriter( screenData, g_renderer.POINTS_REPLACE_BATCH );

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

			writePoint( sx, sy, colorValue );
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
