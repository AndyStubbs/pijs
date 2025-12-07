/**
 * Pi.js - Print Module
 * 
 * Text printing, cursor positioning, and word wrapping for bitmap fonts.
 * 
 * @module text/print
 */

// Maybe move setFont to print.js from fonts.js?

"use strict";

import * as g_utils from "../core/utils.js";
import * as g_commands from "../core/commands.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_textures from "../renderer/textures.js";
import * as g_sprites from "../renderer/draw/sprites.js";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize print module
 * 
 * @param {Object} api - The main Pi.js API object
 * @returns {void}
 */
export function init( api ) {
	g_screenManager.addScreenDataItem( "printCursor", {
		"x": 0,
		"y": 0,
		"cols": 0,
		"rows": 0,
		"scaleWidth": 1,
		"scaleHeight": 1,
		"width": 0,
		"height": 0,
		"breakWord": true,
		"padX": 0,
		"padY": 0
	} );

	registerCommands();
}


/***************************************************************************************************
 * Command Registration
 ***************************************************************************************************/


/**
 * Register print commands
 * 
 * @returns {void}
 */
function registerCommands() {

	// Register screen commands
	g_commands.addCommand( "print", print, true, [ "msg", "isInline", "isCentered" ] );
	g_commands.addCommand( "setPos", setPos, true, [ "col", "row" ] );
	g_commands.addCommand( "setPosPx", setPosPx, true, [ "x", "y" ] );
	g_commands.addCommand( "getPos", getPos, true, [] );
	g_commands.addCommand( "getPosPx", getPosPx, true, [] );
	g_commands.addCommand( "getCols", getCols, true, [] );
	g_commands.addCommand( "getRows", getRows, true, [] );
	g_commands.addCommand( "setWordBreak", setWordBreak, true, [ "isEnabled" ] );
	g_commands.addCommand( "setPrintSize", setPrintSize, true, [ "scaleWidth", "scaleHeight", "padX", "padY" ] );
	g_commands.addCommand( "calcWidth", calcWidth, true, [ "msg" ] );
}


/**************************************************************************************************
 * External API Commands
 **************************************************************************************************/


/**
 * Print text to screen
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Print options
 * @param {string} [options.msg] - Message to print
 * @param {boolean} [options.isInline] - If true, don't advance to next line
 * @param {boolean} [options.isCentered] - If true, center the text
 * @returns {void}
 */
function print( screenData, options ) {
	let msg = options.msg;
	const isInline = !!options.isInline;
	const isCentered = !!options.isCentered;

	// Check if font is set
	if( !screenData.font ) {
		const error = new Error( "print: No font set. Call setFont() first." );
		error.code = "NO_FONT_SET";
		throw error;
	}

	// Bail if not possible to print an entire line on screen
	if( screenData.printCursor.height > screenData.height ) {
		return;
	}

	if( msg === undefined || msg === null ) {
		msg = "";
	} else if( typeof msg !== "string" ) {
		msg = "" + msg;
	}

	// Replace tabs with spaces
	msg = msg.replace( /\t/g, "    " );

	// Split messages by newlines
	const parts = msg.split( /\n/ );
	for( let i = 0; i < parts.length; i++ ) {
		startPrint( screenData, parts[ i ], isInline, isCentered );
	}
}

/**
 * Set cursor position by row/column
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Position options
 * @param {number} [options.col] - Column position
 * @param {number} [options.row] - Row position
 * @returns {void}
 */
function setPos( screenData, options ) {
	const col = options.col;
	const row = options.row;

	const font = screenData.font;
	if( !font ) {
		const error = new Error( "setPos: No font set. Call setFont() first." );
		error.code = "NO_FONT_SET";
		throw error;
	}
	const printCursor = screenData.printCursor;

	// Set the x value
	if( col !== null ) {
		if( isNaN( col ) ) {
			const error = new TypeError( "setPos: parameter col must be a number" );
			error.code = "INVALID_COL";
			throw error;
		}
		let x = Math.floor( col * printCursor.width );
		if( x > screenData.width ) {
			x = screenData.width - printCursor.height;
		}
		screenData.printCursor.x = x;
	}

	// Set the y value
	if( row !== null ) {
		if( isNaN( row ) ) {
			const error = new TypeError( "setPos: parameter row must be a number" );
			error.code = "INVALID_ROW";
			throw error;
		}
		let y = Math.floor( row * screenData.printCursor.height );
		if( y > screenData.height ) {
			y = screenData.height - screenData.printCursor.height;
		}
		screenData.printCursor.y = y;
	}
}

/**
 * Set cursor position by pixels
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Position options
 * @param {number} [options.x] - X position in pixels
 * @param {number} [options.y] - Y position in pixels
 * @returns {void}
 */
function setPosPx( screenData, options ) {
	const x = options.x;
	const y = options.y;

	if( x != null ) {
		if( isNaN( x ) ) {
			const error = new TypeError( "setPosPx: parameter x must be a number" );
			error.code = "INVALID_X";
			throw error;
		}
		screenData.printCursor.x = Math.round( x );
	}

	if( y != null ) {
		if( isNaN( y ) ) {
			const error = new TypeError( "setPosPx: parameter y must be a number" );
			error.code = "INVALID_Y";
			throw error;
		}
		screenData.printCursor.y = Math.round( y );
	}
}

/**
 * Get cursor position as row/column
 * 
 * @param {Object} screenData - Screen data object
 * @returns {Object} Object with col and row properties
 */
function getPos( screenData ) {
	const font = screenData.font;
	if( !font ) {
		return { "col": 0, "row": 0 };
	}
	const printCursor = screenData.printCursor;

	return {
		"col": Math.floor( printCursor.x / printCursor.width ),
		"row": Math.floor( printCursor.y / printCursor.height )
	};
}

/**
 * Get cursor position in pixels
 * 
 * @param {Object} screenData - Screen data object
 * @returns {Object} Object with x and y properties
 */
function getPosPx( screenData ) {
	return {
		"x": screenData.printCursor.x,
		"y": screenData.printCursor.y
	};
}

/**
 * Get number of columns
 * 
 * @param {Object} screenData - Screen data object
 * @returns {number} Number of columns
 */
function getCols( screenData ) {
	return screenData.printCursor.cols;
}

/**
 * Get number of rows
 * 
 * @param {Object} screenData - Screen data object
 * @returns {number} Number of rows
 */
function getRows( screenData ) {
	return screenData.printCursor.rows;
}

/**
 * Enable/disable word breaking
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options
 * @param {boolean} options.isEnabled - Enable word breaking
 * @returns {void}
 */
function setWordBreak( screenData, options ) {
	screenData.printCursor.breakWord = !!options.isEnabled;
}

/**
 * Set font size for bitmap fonts
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options
 * @param {number} options.scaleWidth - Font scale width
 * @param {number} options.scaleHeight - Font scale height
 * @param {number} [options.padX] - Horizontal padding between characters
 * @param {number} [options.padY] - Vertical padding between lines
 * @returns {void}
 */
function setPrintSize( screenData, options ) {
	const scaleWidth = g_utils.getFloat( options.scaleWidth, null );
	const scaleHeight = g_utils.getFloat( options.scaleHeight, null );
	const padX = g_utils.getInt( options.padX, null );
	const padY = g_utils.getInt( options.padY, null );

	if(
		( scaleWidth !== null && scaleWidth <= 0 ) || ( scaleHeight !== null && scaleHeight <= 0 )
	) {
		const error = new RangeError(
			"setPrintSize: Parameters scaleWidth and scaleHeight must be a number greater than 0."
		);
		error.code = "INVALID_SIZE";
		throw error;
	}

	if( scaleWidth !== null ) {
		screenData.printCursor.scaleWidth = scaleWidth;
	}

	if( scaleHeight !== null ) {
		screenData.printCursor.scaleHeight = scaleHeight;
	}

	// Update padding if provided
	if( padX !== null ) {
		screenData.printCursor.padX = padX;
	}
	if( padY !== null ) {
		screenData.printCursor.padY = padY;
	}

	// Update print cursor dimensions
	updatePrintCursorDimensions( screenData );
}

/**
 * Calculate text width
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options
 * @param {string} [options.msg] - Message to calculate width for
 * @returns {number} Text width in pixels
 */
function calcWidth( screenData, options ) {
	const msg = options.msg || "";
	const printCursor = screenData.printCursor;
	
	return printCursor.width * msg.length;
}


/***************************************************************************************************
 * Internal Functions
 ***************************************************************************************************/


/**
 * Start printing text
 * 
 * @param {Object} screenData - Screen data object
 * @param {string} msg - Message to print
 * @param {boolean} isInline - If true, don't advance to next line
 * @param {boolean} isCentered - If true, center the text
 * @returns {void}
 */
function startPrint( screenData, msg, isInline, isCentered ) {
	const printCursor = screenData.printCursor;
	const font = screenData.font;

	// Calculate text width
	const width = calcWidth( screenData, { "msg": msg } );

	// Handle centering
	if( isCentered ) {
		printCursor.x = Math.floor( ( printCursor.cols - msg.length ) / 2 ) * printCursor.width;
	}

	// Handle text wrapping if text is too wide
	if(
		!isInline &&
		!isCentered &&
		width + printCursor.x > screenData.width &&
		msg.length > 1
	) {
		const overlap = ( width + printCursor.x ) - screenData.width;
		const onScreen = width - overlap;
		const onScreenPct = onScreen / width;
		let msgSplit = Math.floor( msg.length * onScreenPct );
		let msg1 = msg.substring( 0, msgSplit );
		let msg2 = msg.substring( msgSplit, msg.length );

		// Word breaking
		if( printCursor.breakWord ) {
			const index = msg1.lastIndexOf( " " );
			if( index > -1 ) {
				msg2 = msg1.substring( index ).trim() + msg2;
				msg1 = msg1.substring( 0, index );
			}
		}

		startPrint( screenData, msg1, isInline, isCentered );
		startPrint( screenData, msg2, isInline, isCentered );
		return;
	}

	// Handle auto-scroll if text is too tall
	if( printCursor.y + printCursor.height > screenData.height ) {

		// Shift image up by font height
		g_renderer.shiftImageUp( screenData, printCursor.height );

		// Move cursor up
		printCursor.y -= printCursor.height;
	}

	// Print the text using bitmap font
	bitmapPrint( screenData, msg, printCursor.x, printCursor.y );

	// Advance cursor position
	if( !isInline ) {
		printCursor.y += printCursor.height;
		printCursor.x = 0;
	} else {
		printCursor.x += printCursor.width * msg.length;
		if( printCursor.x > screenData.width - printCursor.width ) {
			printCursor.x = 0;
			printCursor.y += printCursor.height;
		}
	}
}

/**
 * Print using bitmap font image
 * 
 * @param {Object} screenData - Screen data object
 * @param {string} msg - Message to print
 * @param {number} x - X position
 * @param {number} y - Y position
 * @returns {void}
 */
function bitmapPrint( screenData, msg, x, y ) {
	const font = screenData.font;

	if( !font.image ) {
		console.warn( "bitmapPrint: Font image not loaded yet." );
		return;
	}

	// Get or create texture for font image
	g_textures.getWebGL2Texture( screenData, font.image );

	const atlasWidth = font.atlasWidth;
	const fontWidth = font.width;
	const fontHeight = font.height;
	const printWidth = screenData.printCursor.width;
	const scaleX = screenData.printCursor.scaleWidth;
	const scaleY = screenData.printCursor.scaleHeight;
	const margin = font.margin;
	const cellWidth = font.cellWidth;
	const cellHeight = font.cellHeight;
	const columns = Math.floor( atlasWidth / cellWidth );

	// Loop through each character in the message
	for( let i = 0; i < msg.length; i++ ) {

		// Get the character index for the character data
		const charIndex = font.chars[ msg.charCodeAt( i ) ];

		if( charIndex !== undefined ) {

			// Get the source x & y coordinates in the atlas
			const sx = ( charIndex % columns ) * cellWidth + margin;
			const sy = Math.floor( charIndex / columns ) * cellHeight + margin;

			// Get the destination x coordinate
			const dx = x + printWidth * i;

			// Draw the character using drawSprite
			const color = screenData.color;
			g_sprites.drawSprite(
				screenData, font.image,
				sx, sy, fontWidth, fontHeight,
				dx, y, fontWidth, fontHeight,
				color, 0, 0, scaleX, scaleY, 0
			);
		}
	}

	// Mark screen as dirty
	g_renderer.setImageDirty( screenData );
}

/**
 * Update print cursor rows and columns based on font and size
 * 
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function updatePrintCursorDimensions( screenData ) {
	const font = screenData.font;
	if( !font ) {
		return;
	}

	const printCursor = screenData.printCursor;

	printCursor.width = printCursor.scaleWidth * ( font.width + printCursor.padX );
	printCursor.height = printCursor.scaleHeight * ( font.height + printCursor.padY );
	printCursor.cols = Math.floor( screenData.width / printCursor.width );
	printCursor.rows = Math.floor( screenData.height / printCursor.height );
}
