/**
 * Pi.js - Print Module
 * 
 * Text printing, cursor positioning, and word wrapping
 * 
 * @module modules/print
 */

"use strict";

import * as screenManager from "../core/screen-manager";
import * as renderer from "../core/renderer";
import * as fontModule from "./font";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize print module
export function init() {
	screenManager.addScreenDataItem( "printCursor", {
		"x": 0,
		"y": 0,
		"cols": 0,
		"rows": 0,
		"breakWord": true
	} );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// TODO: add printf command that has format printing that allows for colors, spacing, variable 
// injection and maybe more formating stuff. Research other languages like c/c++ and others.


// print command
screenManager.addCommand( "print", print, [ "msg", "isInline", "isCentered" ] );
function print( screenData, options ) {
	let msg = options.msg;
	const isInline = !!options.isInline;
	const isCentered = !!options.isCentered;

	// Bail if not possible to print an entire line on screen
	if( screenData.font.height > screenData.height ) {
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

// setPos command - Set cursor position by row/column
screenManager.addCommand( "setPos", setPos, [ "col", "row" ] );
function setPos( screenData, options ) {
	const col = options.col;
	const row = options.row;

	// Set the x value
	if( col != null ) {
		if( isNaN( col ) ) {
			const error = new TypeError( "setPos: parameter col must be a number" );
			error.code = "INVALID_COL";
			throw error;
		}
		let x = Math.floor( col * screenData.font.width );
		if( x > screenData.width ) {
			x = screenData.width - screenData.font.width;
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
		let y = Math.floor( row * screenData.font.height );
		if( y > screenData.height ) {
			y = screenData.height - screenData.font.height;
		}
		screenData.printCursor.y = y;
	}
}

// setPosPx command - Set cursor position by pixels
screenManager.addCommand( "setPosPx", setPosPx, [ "x", "y" ] );
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

// getPos command - Get cursor position as row/column
screenManager.addCommand( "getPos", getPos, [] );
function getPos( screenData ) {
	return {
		"col": Math.floor(
			screenData.printCursor.x / screenData.font.width
		),
		"row": Math.floor(
			screenData.printCursor.y / screenData.font.height
		)
	};
}

// getPosPx command - Get cursor position in pixels
screenManager.addCommand( "getPosPx", getPosPx, [] );
function getPosPx( screenData ) {
	return {
		"x": screenData.printCursor.x,
		"y": screenData.printCursor.y
	};
}

// getCols command - Get number of columns
screenManager.addCommand( "getCols", getCols, [] );
function getCols( screenData ) {
	return screenData.printCursor.cols;
}

// getRows command - Get number of rows
screenManager.addCommand( "getRows", getRows, [] );
function getRows( screenData ) {
	return screenData.printCursor.rows;
}

// setWordBreak command - Enable/disable word breaking
screenManager.addCommand( "setWordBreak", setWordBreak, [ "isEnabled" ] );
function setWordBreak( screenData, options ) {
	screenData.printCursor.breakWord = !!options.isEnabled;
}

// piCalcWidth command - Calculate text width for pixel fonts
screenManager.addCommand( "piCalcWidth", piCalcWidth, [ "msg" ] );
function piCalcWidth( screenData, options ) {
	const msg = options.msg || "";
	return screenData.font.width * msg.length;
}

// canvasCalcWidth command - Calculate text width for canvas fonts
screenManager.addCommand( "canvasCalcWidth", canvasCalcWidth, [ "msg" ] );
function canvasCalcWidth( screenData, options ) {
	const msg = options.msg || "";
	return screenData.context.measureText( msg ).width;
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Start printing text
function startPrint( screenData, msg, isInline, isCentered ) {
	const printCursor = screenData.printCursor;
	const font = screenData.font;

	// Calculate text width
	const width = calcWidth( screenData, msg );

	// Handle centering
	if( isCentered ) {
		printCursor.x = Math.floor( ( printCursor.cols - msg.length ) / 2 ) * font.width;
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
	if( printCursor.y + font.height > screenData.height ) {

		// Render canvas fonts before scrolling
		if( font.mode === "canvas" ) {
			screenData.api.render();
		}

		// Shift image up by font height
		shiftImageUp( screenData, font.height );

		// Move cursor up
		printCursor.y -= font.height;
	}

	// Call the appropriate print function based on font mode
	if( font.mode === "pixel" ) {
		piPrint( screenData, msg, printCursor.x, printCursor.y );
	} else if( font.mode === "bitmap" ) {
		bitmapPrint( screenData, msg, printCursor.x, printCursor.y );
	} else if( font.mode === "canvas" ) {
		canvasPrint( screenData, msg, printCursor.x, printCursor.y );
	}

	// Advance cursor position
	if( !isInline ) {
		printCursor.y += font.height;
		printCursor.x = 0;
	} else {
		printCursor.x += font.width * msg.length;
		if( printCursor.x > screenData.width - font.width ) {
			printCursor.x = 0;
			printCursor.y += font.height;
		}
	}
}

// Shift screen image up by yOffset pixels
function shiftImageUp( screenData, yOffset ) {
	if( yOffset <= 0 ) {
		return;
	}

	// Get the image data
	renderer.getImageData( screenData );

	// Loop through all pixels after the yOffset
	for( let y = yOffset; y < screenData.height; y++ ) {
		for( let x = 0; x < screenData.width; x++ ) {

			// Get the index of the source and destination pixels
			const iDest = ( ( screenData.width * y ) + x ) * 4;
			const iSrc = ( ( screenData.width * ( y - yOffset ) ) + x ) * 4;

			// Move the pixel up
			const data = screenData.imageData.data;
			data[ iSrc ] = data[ iDest ];
			data[ iSrc + 1 ] = data[ iDest + 1 ];
			data[ iSrc + 2 ] = data[ iDest + 2 ];
			data[ iSrc + 3 ] = data[ iDest + 3 ];
		}
	}

	// Clear the bottom pixels
	for( let y = screenData.height - yOffset; y < screenData.height; y++ ) {
		for( let x = 0; x < screenData.width; x++ ) {
			const i = ( ( screenData.width * y ) + x ) * 4;
			screenData.imageData.data[ i ] = 0;
			screenData.imageData.data[ i + 1 ] = 0;
			screenData.imageData.data[ i + 2 ] = 0;
			screenData.imageData.data[ i + 3 ] = 0;
		}
	}

	renderer.setImageDirty( screenData );
}

// Calculate text width based on font mode
function calcWidth( screenData, msg ) {
	const font = screenData.font;
	if( font.mode === "canvas" ) {
		return screenData.context.measureText( msg ).width;
	}
	return font.width * msg.length;
}

// Print using pixel font data (base32-encoded fonts)
function piPrint( screenData, msg, x, y ) {
	const font = screenData.font;

	// Setup a temporary palette with the fore color and transparent
	const defaultPal = screenData.pal;
	screenData.pal = [ screenData.pal[ 0 ], screenData.color ];

	// Loop through each character in the message
	for( let i = 0; i < msg.length; i++ ) {

		// Get the character index for the character data
		const charIndex = font.chars[ msg.charCodeAt( i ) ];

		// Draw the character on the screen using put
		if( charIndex !== undefined ) {
			screenData.api.put( font.data[ charIndex ], x + font.width * i, y );
		}
	}

	// Reset the palette to the default
	screenData.pal = defaultPal;
}

// Print using canvas text rendering
function canvasPrint( screenData, msg, x, y ) {
	screenData.api.render();
	screenData.context.fillText( msg, x, y );

	// Invalidate cached image data since we drew directly to canvas
	screenData.imageData = null;
}

// Print using bitmap font image
function bitmapPrint( screenData, msg, x, y ) {
	screenData.api.render();

	const font = screenData.font;
	const bitmap = fontModule.getFontBitmap( font.bitmapId );
	if( !bitmap ) {
		const error = new TypeError( "print: font bitmap not found" );
		error.code = "FONT_BITMAP_NOT_FOUND";
		throw error;
	}

	const bitmapWidth = bitmap.image.width;
	
	// Get the source width & height of bitmap characters
	const sw = bitmap.width;
	const sh = bitmap.height;
	const columns = Math.floor( bitmapWidth / sw );

	// Loop through each character in the message
	for( let i = 0; i < msg.length; i++ ) {

		// Get the character index for the character data
		const charIndex = font.chars[ msg.charCodeAt( i ) ];

		if( charIndex !== undefined ) {

			// Get the source x & y coordinates
			const sx = ( charIndex % columns ) * sw;
			const sy = Math.floor( charIndex / columns ) * sh;

			// Get the destination x coordinate
			const dx = x + font.width * i;

			// Draw the character on the screen
			screenData.context.drawImage(
				bitmap.image,
				sx, sy, sw, sh,
				dx, y, font.width, font.height
			);
		}
	}

	// Invalidate cached image data since we drew directly to canvas
	screenData.imageData = null;
}

