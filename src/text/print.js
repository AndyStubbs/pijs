/**
 * Pi.js - Print Module
 * 
 * Text printing, cursor positioning, and word wrapping for bitmap fonts.
 * 
 * @module text/print
 */

"use strict";

import * as g_utils from "../core/utils.js";
import * as g_commands from "../core/commands.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_textures from "../renderer/textures.js";


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
		"breakWord": true
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
	g_commands.addCommand( "setFontSize", setFontSize, true, [ "width", "height" ] );
	g_commands.addCommand( "calcWidth", calcWidth, true, [ "msg" ] );
}


/***************************************************************************************************
 * External API Commands
 ***************************************************************************************************/


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
	if( screenData.font.cellHeight > screenData.height ) {
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

	// Set the x value
	if( col != null ) {
		if( isNaN( col ) ) {
			const error = new TypeError( "setPos: parameter col must be a number" );
			error.code = "INVALID_COL";
			throw error;
		}
		let x = Math.floor( col * font.cellWidth );
		if( x > screenData.width ) {
			x = screenData.width - font.cellWidth;
		}
		screenData.printCursor.x = x;
	}

	// Set the y value
	if( row != null ) {
		if( isNaN( row ) ) {
			const error = new TypeError( "setPos: parameter row must be a number" );
			error.code = "INVALID_ROW";
			throw error;
		}
		let y = Math.floor( row * font.cellHeight );
		if( y > screenData.height ) {
			y = screenData.height - font.cellHeight;
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

	return {
		"col": Math.floor( screenData.printCursor.x / font.cellWidth ),
		"row": Math.floor( screenData.printCursor.y / font.cellHeight )
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
 * @param {number} options.width - Font width
 * @param {number} options.height - Font height
 * @returns {void}
 */
function setFontSize( screenData, options ) {
	const font = screenData.font;
	if( !font ) {
		const error = new Error( "setFontSize: No font set. Call setFont() first." );
		error.code = "NO_FONT_SET";
		throw error;
	}

	const width = g_utils.getInt( options.width, null );
	const height = g_utils.getInt( options.height, null );

	if( !width || width < 1 || !height || height < 1 ) {
		const error = new RangeError(
			"setFontSize: Parameters width and height must be an integer greater than 0."
		);
		error.code = "INVALID_SIZE";
		throw error;
	}

	font.cellWidth = width;
	font.cellHeight = height;

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
	const font = screenData.font;
	if( !font ) {
		return 0;
	}
	return font.cellWidth * msg.length;
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
		printCursor.x = Math.floor( ( printCursor.cols - msg.length ) / 2 ) * font.cellWidth;
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
	if( printCursor.y + font.cellHeight > screenData.height ) {

		// Shift image up by font height
		shiftImageUp( screenData, font.cellHeight );

		// Move cursor up
		printCursor.y -= font.cellHeight;
	}

	// Print the text using bitmap font
	bitmapPrint( screenData, msg, printCursor.x, printCursor.y );

	// Advance cursor position
	if( !isInline ) {
		printCursor.y += font.cellHeight;
		printCursor.x = 0;
	} else {
		printCursor.x += font.cellWidth * msg.length;
		if( printCursor.x > screenData.width - font.cellWidth ) {
			printCursor.x = 0;
			printCursor.y += font.cellHeight;
		}
	}
}

/**
 * Shift screen image up by yOffset pixels
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} yOffset - Number of pixels to shift up
 * @returns {void}
 */
function shiftImageUp( screenData, yOffset ) {
	if( yOffset <= 0 ) {
		return;
	}

	// TODO: Implement screen scrolling using WebGL2
	// For now, this is a placeholder - screen scrolling would need to be implemented
	// using the renderer's readback and drawing capabilities
	console.warn( "shiftImageUp: Screen scrolling not yet implemented in WebGL2 renderer." );
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
	const texture = g_textures.getWebGL2Texture( screenData, font.image );
	if( !texture ) {
		console.error( "bitmapPrint: Failed to get/create texture for font image." );
		return;
	}

	const atlasWidth = font.atlasWidth;
	const fontWidth = font.width;
	const fontHeight = font.height;
	const cellWidth = font.cellWidth;
	const cellHeight = font.cellHeight;
	const columns = Math.floor( atlasWidth / cellWidth );

	// Loop through each character in the message
	for( let i = 0; i < msg.length; i++ ) {

		// Get the character index for the character data
		const charIndex = font.chars[ msg.charCodeAt( i ) ];

		if( charIndex !== undefined ) {

			// Get the source x & y coordinates in the atlas
			const sx = ( charIndex % columns ) * cellWidth + 1;
			const sy = Math.floor( charIndex / columns ) * cellHeight + 1;

			// Get the destination x coordinate
			const dx = x + fontWidth * i;

			// Draw the character using drawImage with texture coordinates
			// We need to create a temporary canvas or use a custom draw function
			// For now, we'll use drawImage with a sub-image approach
			drawFontCharacter(
				screenData, font.image, texture,
				sx, sy, fontWidth, fontHeight,
				dx, y, fontWidth, fontHeight
			);
		}
	}

	// Mark screen as dirty
	g_renderer.setImageDirty( screenData );
}

/**
 * Draw a single font character from atlas
 * 
 * @param {Object} screenData - Screen data object
 * @param {HTMLImageElement} img - Font atlas image
 * @param {WebGLTexture} texture - Font texture
 * @param {number} sx - Source X in atlas
 * @param {number} sy - Source Y in atlas
 * @param {number} sw - Source width
 * @param {number} sh - Source height
 * @param {number} dx - Destination X
 * @param {number} dy - Destination Y
 * @param {number} dw - Destination width
 * @param {number} dh - Destination height
 * @returns {void}
 */
function drawFontCharacter(
	screenData, img, texture, sx, sy, sw, sh, dx, dy, dw, dh
) {

	// Get texture dimensions for coordinate conversion
	const texWidth = img.width;
	const texHeight = img.height;

	// Convert pixel coordinates to normalized texture coordinates (0-1)
	const u0 = sx / texWidth;
	const v0 = sy / texHeight;
	const u1 = ( sx + sw ) / texWidth;
	const v1 = ( sy + sh ) / texHeight;

	// Use the renderer's drawImage function but we need to modify it for sub-texture drawing
	// For now, we'll create a simplified version that draws a sub-region
	// TODO: This should use a specialized function for drawing sub-textures
	// For bitmap fonts, we'll need to extend drawImage to support texture sub-regions
	
	// Temporary solution: Use drawImage with a temporary canvas containing just this character
	// This is not optimal but will work until we add proper sub-texture support
	
	// Better solution: Extend the renderer to support drawing texture sub-regions
	// For now, we'll use a workaround by creating a temporary canvas
	const tempCanvas = document.createElement( "canvas" );
	tempCanvas.width = sw;
	tempCanvas.height = sh;
	const tempCtx = tempCanvas.getContext( "2d" );
	tempCtx.drawImage( img, sx, sy, sw, sh, 0, 0, sw, sh );

	// Draw using the temporary canvas
	// Use current drawing color for font rendering (fonts are typically white/monochrome and tinted)
	const color = screenData.color || { "r": 255, "g": 255, "b": 255, "a": 255 };
	g_renderer.drawImage(
		screenData, tempCanvas, dx, dy, color, 0, 0, dw / sw, dh / sh, 0
	);
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

	screenData.printCursor.cols = Math.floor( screenData.width / font.cellWidth );
	screenData.printCursor.rows = Math.floor( screenData.height / font.cellHeight );
}
