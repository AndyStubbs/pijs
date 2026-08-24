/**
 * Pi Vision Window Command for Pi.js
 * 
 * Provides window functionality for the pi-vision plugin.
 * 
 * @module plugins/pi-vision/window
 */

"use strict";

import { validateOptionsObject } from "./util.js";

const BORDER_GLYPHS = {
	"single": [ 218, 196, 191, 179, 192, 217 ],
	"double": [ 201, 205, 187, 186, 200, 188 ],
	"thick": [ 219, 223, 219, 219, 219, 219 ]
};

let g_pluginApi = null;

export default { init, createWindow };

/**
 * Initialize the window command
 * 
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
function init( pluginApi ) {
	g_pluginApi = pluginApi;
}

/**
 * Create an offscreen Pi Vision window
 * 
 * @param {Object} options - Window options
 * @param {number} options.x - Horizontal position on the parent screen
 * @param {number} options.y - Vertical position on the parent screen
 * @param {number} options.width - Total window width in pixels
 * @param {number} options.height - Total window height in pixels
 * @param {string} [options.title=""] - Window title
 * @param {string} [options.border="single"] - Border style
 * @param {boolean} [options.shadow=true] - Whether to composite a shadow in a later phase
 * @returns {Object} Offscreen Pi.js screen API
 */
function createWindow( options ) {
	validateOptionsObject( options, "vis.window" );

	const normalized = normalizeOptions( options );
	const parentData = g_pluginApi.getActiveScreen( "vis.window" );
	let windowScreen = null;

	try {
		windowScreen = api.screen( {
			"aspect": `${normalized.width}x${normalized.height}`,
			"isOffscreen": true
		} );

		const windowData = g_pluginApi.getScreenData( "vis.window", windowScreen.id );
		const client = calculateClientRect( windowData, normalized );
		const record = {
			"parentScreenId": parentData.id,
			"screen": windowScreen,
			"x": normalized.x,
			"y": normalized.y,
			"width": normalized.width,
			"height": normalized.height,
			"title": normalized.title,
			"border": normalized.border,
			"shadow": normalized.shadow,
			"client": client
		};

		parentData.vis.windows.push( record );
		windowData.vis.window = record;

		drawFrame( windowScreen, windowData, normalized );
		windowScreen.setPosPx( 0, 0 );
		windowScreen.pushView( client );
	} catch( error ) {
		if( windowScreen ) {
			windowScreen.removeScreen();
		}
		throw error;
	} finally {
		api.setScreen( parentData.api );
	}

	return windowScreen;
}


/**
 * Validate and normalize the public options object
 * 
 * @param {Object} options - Raw window options
 * @returns {Object} Normalized options
 */
function normalizeOptions( options ) {
	let title = "";
	if( options.title != null ) {
		title = options.title;
	}

	let border = "single";
	if( options.border != null ) {
		if( typeof options.border !== "string" ) {
			const error = new TypeError( "vis.window: Parameter border must be a string." );
			error.code = "INVALID_WINDOW_BORDER";
			throw error;
		}
		border = options.border.toLowerCase();
	}

	let shadow = true;
	if( options.shadow != null ) {
		shadow = options.shadow;
	}

	const normalized = {
		"x": options.x,
		"y": options.y,
		"width": options.width,
		"height": options.height,
		"title": title,
		"border": border,
		"shadow": shadow
	};

	for( const name of [ "x", "y", "width", "height" ] ) {
		if( !Number.isInteger( normalized[ name ] ) ) {
			const error = new TypeError( `vis.window: Parameter ${name} must be an integer.` );
			error.code = "INVALID_WINDOW_GEOMETRY";
			throw error;
		}
	}

	if( normalized.width <= 0 || normalized.height <= 0 ) {
		const error = new RangeError( "vis.window: Width and height must be greater than zero." );
		error.code = "INVALID_WINDOW_DIMENSIONS";
		throw error;
	}

	if( typeof normalized.title !== "string" ) {
		const error = new TypeError( "vis.window: Parameter title must be a string." );
		error.code = "INVALID_WINDOW_TITLE";
		throw error;
	}

	if(
		normalized.border !== "single" && normalized.border !== "double" &&
		normalized.border !== "thick" && normalized.border !== "none"
	) {
		const error = new RangeError( `vis.window: Unknown border style "${normalized.border}".` );
		error.code = "INVALID_WINDOW_BORDER";
		throw error;
	}

	if( typeof normalized.shadow !== "boolean" ) {
		const error = new TypeError( "vis.window: Parameter shadow must be a boolean." );
		error.code = "INVALID_WINDOW_SHADOW";
		throw error;
	}

	return normalized;
}

/**
 * Calculate the protected client rectangle
 * 
 * @param {Object} screenData - Window screen data
 * @param {Object} options - Normalized window options
 * @returns {Object} Client rectangle
 */
function calculateClientRect( screenData, options ) {
	const fontWidth = screenData.font.width;
	const fontHeight = screenData.font.height;
	const hasBorder = options.border !== "none";
	const hasTitleRow = hasBorder || options.title.length > 0;
	let left = 0;
	let top = 0;
	let right = 0;
	let bottom = 0;

	if( hasBorder ) {
		left = fontWidth;
		right = fontWidth;
		bottom = fontHeight;
	}
	if( hasTitleRow ) {
		top = fontHeight;
	}
	const client = {
		"x": left,
		"y": top,
		"width": options.width - left - right,
		"height": options.height - top - bottom
	};

	if( client.width <= 0 || client.height <= 0 ) {
		const error = new RangeError(
			"vis.window: Window dimensions do not leave a positive client area."
		);
		error.code = "INVALID_CLIENT_DIMENSIONS";
		throw error;
	}

	return client;
}

/**
 * Draw the initial CP437 frame and title
 * 
 * @param {Object} screen - Window screen API
 * @param {Object} screenData - Window screen data
 * @param {Object} options - Normalized window options
 * @returns {void}
 */
function drawFrame( screen, screenData, options ) {
	const fontWidth = screenData.font.width;
	const fontHeight = screenData.font.height;
	const columns = Math.floor( options.width / fontWidth );
	const rows = Math.floor( options.height / fontHeight );

	if( options.border !== "none" ) {
		drawBorder( screen, options, fontWidth, fontHeight, columns, rows );
	} else if( options.title.length > 0 ) {
		const x = Math.floor( ( options.width - fontWidth * options.title.length ) / 2 );
		screen.setPosPx( x, 0 );
		screen.print( options.title, true );
	}
}

/**
 * Draw a character-cell border
 * 
 * @param {Object} screen - Window screen API
 * @param {Object} options - Normalized window options
 * @param {number} fontWidth - Character width
 * @param {number} fontHeight - Character height
 * @param {number} columns - Complete character columns
 * @param {number} rows - Complete character rows
 * @returns {void}
 */
function drawBorder( screen, options, fontWidth, fontHeight, columns, rows ) {
	const glyphs = BORDER_GLYPHS[ options.border ];
	const rightX = options.width - fontWidth;
	const bottomY = options.height - fontHeight;

	// Get the title
	let title = "";
	if( options.title.length > 0 ) {
		let borderColumns = 2;
		title = " " + options.title + " ";
		const availableColumns = Math.max( columns - borderColumns, 0 );
		if( title.length > availableColumns ) {
			title = title.substring( 1, availableColumns + 1 );
		}
	}

	// Draw Top Border With Title
	const topBorderSpan = glyphs[ 1 ].repeat(
		Math.floor( ( columns - 1 - title.length ) / 2 ),
		glyphs[ 1 ]
	);
	const topBorder = glyphs[ 0 ] + topBorderSpan + title + topBorderSpan + glyphs[ 2 ];
	screen.setPosPx( 0, 0 );
	screen.print( topBorder, true );

	// Draw Bottom Border
	const bottomBorder = glyphs[ 4 ] + glyphs[ 1 ].repeat( columns - 2 ) + glyphs[ 5 ];
	screen.setPosPx( 0, bottomY );
	screen.print( bottomBorder, true );

	// Draw Vertical Border
	for( let row = 1; row < rows - 1; row += 1 ) {
		const y = row * fontHeight;
		screen.setPosPx( 0, y );
		screen.print( glyphs[ 3 ], true );
		screen.setPosPx( rightX, y );
		screen.print( glyphs[ 3 ], true );
	}
}
