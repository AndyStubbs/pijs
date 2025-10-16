/**
 * Pi.js - Font Module
 * 
 * Font loading, management, and character data
 * 
 * @module modules/font
 */

"use strict";

import * as commands from "../core/commands";
import * as screenManager from "../core/screen-manager";
import * as utils from "../core/utils";

const m_fonts = [];
const m_fontBitmaps = {};
let m_defaultFont = null;
let m_nextFontId = 0;
let m_nextFontBitmapId = 0;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize font module
export function init() {
	screenManager.addScreenDataItemGetter( "font", () => m_defaultFont );
}

export function getFontBitmap( bitmapId ) {
	return m_fontBitmaps[ bitmapId ];
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// loadFont command
commands.addCommand(
	"loadFont", loadFont, [ "fontSrc", "width", "height", "charSet", "isEncoded" ]
);
function loadFont( options ) {
	const fontSrc = options.fontSrc;
	const width = Math.round( options.width );
	const height = Math.round( options.height );
	let charSet = options.charSet;
	const isEncoded = !!options.isEncoded;

	if( isNaN( width ) || isNaN( height ) ) {
		const error = new TypeError( "loadFont: width and height must be integers." );
		error.code = "INVALID_DIMENSIONS";
		throw error;
	}

	// Default charset to 0 to 255
	if( !charSet ) {
		charSet = [];
		for( let i = 0; i < 256; i += 1 ) {
			charSet.push( i );
		}
	}

	if( !( utils.isArray( charSet ) || typeof charSet === "string" ) ) {
		const error = new TypeError( "loadFont: charSet must be an array or a string." );
		error.code = "INVALID_CHARSET";
		throw error;
	}

	// Convert charSet to array of integers (character codes)
	if( typeof charSet === "string" ) {
		const temp = [];
		for( let i = 0; i < charSet.length; i += 1 ) {
			temp.push( charSet.charCodeAt( i ) );
		}
		charSet = temp;
	}

	// Build chars lookup map
	const chars = {};
	for( let i = 0; i < charSet.length; i += 1 ) {
		chars[ charSet[ i ] ] = i;
	}

	// Create font object
	const font = {
		"id": m_nextFontId,
		"width": width,
		"height": height,
		"data": [],
		"chars": chars,
		"charSet": charSet,
		"mode": isEncoded ? "pixel" : "bitmap",
		"bitmapId": null
	};

	// Add to fonts array
	m_fonts[ font.id ] = font;
	m_nextFontId += 1;

	if( isEncoded ) {

		// Decompress base32-encoded font data
		font.data = decompressFont( fontSrc, width, height );
	} else {

		// Load from image source
		loadFontFromImage( fontSrc, font );
	}

	return font.id;
}

// setDefaultFont command
commands.addCommand( "setDefaultFont", setDefaultFont, [ "fontId" ] );
function setDefaultFont( options ) {
	const fontId = parseInt( options.fontId );

	if( isNaN( fontId ) || fontId < 0 || !m_fonts[ fontId ] ) {
		const error = new RangeError( "setDefaultFont: invalid fontId" );
		error.code = "INVALID_FONT_ID";
		throw error;
	}

	m_defaultFont = m_fonts[ fontId ];
}

// setFont command
screenManager.addCommand( "setFont", setFont, [ "font" ] );
function setFont( screenData, options ) {
	const fontInput = options.font;

	let font;

	// Check if this is a valid font
	if( typeof fontInput === "string" ) {
		screenData.context.font = fontInput;
		screenData.context.textBaseline = "top";
		font = {
			"name": screenData.context.font,
			"width": 10,
			"height": 10,
			"mode": "canvas"
		};
	} else if( m_fonts[ fontInput ] ) {
		font = m_fonts[ fontInput ];
	} else {
		const error = new RangeError( "setFont: invalid fontId" );
		error.code = "INVALID_FONT_ID";
		throw error;
	}

	// Set the screenData font and print cursor
	screenData.font = font;
	updatePrintCursorDimensions( screenData );
}

// setFontSize command
screenManager.addCommand( "setFontSize", setFontSize, [ "width", "height" ] );
function setFontSize( screenData, options ) {
	if( screenData.font.mode !== "bitmap" ) {
		const error = new RangeError(
			"setFontSize: only bitmap fonts can change sizes. Load a bitmap font before setting " +
			"the font size."
		);
		error.code = "INVALID_SIZE";
		throw error;
	}

	const width = utils.getInt( options.width, null );
	const height = utils.getInt( options.height, null );

	if( !width || width < 1 || !height || height < 1 ) {
		const error = new RangeError(
			"setFontSize: width and height must be an integer greater than 0"
		);
		error.code = "INVALID_SIZE";
		throw error;
	}

	screenData.font.width = width;
	screenData.font.height = height;

	// Update print cursor dimensions
	updatePrintCursorDimensions( screenData );
}

// getAvailableFonts command
commands.addCommand( "getAvailableFonts", getAvailableFonts, [] );
function getAvailableFonts() {
	const fonts = [];
	for( let i = 0; i < m_fonts.length; i++ ) {
		if( m_fonts[ i ] ) {
			fonts.push( {
				"id": m_fonts[ i ].id,
				"width": m_fonts[ i ].width,
				"height": m_fonts[ i ].height,
				"mode": m_fonts[ i ].mode
			} );
		}
	}
	return fonts;
}

// setChar command - allows custom character bitmaps
screenManager.addCommand( "setChar", setChar, [ "charCode", "data" ] );
function setChar( screenData, options ) {
	let charCode = options.charCode;
	let data = options.data;

	// Convert string to char code
	if( typeof charCode === "string" ) {
		charCode = charCode.charCodeAt( 0 );
	} else {
		charCode = utils.getInt( charCode, null );
		if( charCode === null ) {
			const error = new TypeError( "setChar: charCode must be an integer or a string" );
			error.code = "INVALID_CHAR_CODE";
			throw error;
		}
	}

	const font = screenData.font;

	if( !utils.isArray( data ) ) {
		if( typeof data === "string" ) {
			data = utils.hexToData( data, font.width, font.height );
		} else {
			const error = new TypeError( "setChar: data must be a 2D array or an encode string" );
			error.code = "INVALID_DATA";
			throw error;
		}
	}

	// Validate data dimensions match font
	if( data.length !== font.height ) {
		const error = new RangeError(
			`setChar: data height (${data.length}) must match font height (${font.height})`
		);
		error.code = "INVALID_DATA_HEIGHT";
		throw error;
	}

	// Validate data items
	for( let i = 0; i < data.length; i++ ) {
		if( !utils.isArray( data[ i ] ) || data[ i ].length !== font.width ) {
			const error = new RangeError(
				`setChar: data width at row ${i} must match font width (${font.width})`
			);
			error.code = "INVALID_DATA_WIDTH";
			throw error;
		}
	}

	// Get character index in font
	const charIndex = font.chars[ charCode ];
	if( charIndex === undefined ) {
		const error = new RangeError( "setChar: character not in font character set" );
		error.code = "CHAR_NOT_IN_FONT";
		throw error;
	}

	// Set the character data
	font.data[ charIndex ] = data;
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Update print cursor rows and columns based on font and size
function updatePrintCursorDimensions( screenData ) {
	const font = screenData.font;

	if( font.mode === "canvas" ) {

		// Measure the actual size of the font by actually drawing the font on a temp canvas and
		// checking the color values
		const tempSize = Math.round( screenData.context.measureText( "M" ).width * 2 );
		const tempCanvas = document.createElement( "canvas" );
		tempCanvas.width = tempSize;
		tempCanvas.height = tempSize;
		const tempContext = tempCanvas.getContext( "2d", { "willReadFrequently": true } );
		tempContext.font = screenData.context.font;
		tempContext.textBaseline = "top";
		tempContext.fillStyle = "#FF0000";

		// Fill some text with characters at a fixed spot
		const tempMessage = "WHMGLIyzjpgl_|,.";
		for( const c of tempMessage ) {
			tempContext.fillText( c, 0, 0 );
		}

		// Loop through the tempCanvas pixel data
		let minX = Infinity;
		let maxX = 0;
		let minY = Infinity;
		let maxY = 0;
		const data = tempContext.getImageData( 0, 0, tempSize, tempSize ).data;
		for( let y = 0; y < tempSize; y++ ) {
			for( let x = 0; x < tempSize; x++ ) {
				const index = (y * tempSize + x) * 4;
				if( data[ index ] === 255 ) {
					minX = Math.min( x, minX );
					maxX = Math.max( x, maxX );
					minY = Math.min( y, minY );
					maxY = Math.max( y, maxY );
				}
			}
		}

		screenData.font.width = maxX - minX;
		screenData.font.height = maxY - minY;
	}

	screenData.printCursor.cols = Math.floor( screenData.width / screenData.font.width );
	screenData.printCursor.rows = Math.floor( screenData.height / screenData.font.height );
}

// Decompress base32-encoded font data
function decompressFont( numStr, width, height ) {
	const size = 32;
	const base = 32;
	let bin = "";
	const data = [];

	numStr = "" + numStr;
	const nums = numStr.split( "," );

	// Loop through all the base-32 numbers
	for( let i = 0; i < nums.length; i++ ) {

		// Convert base-32 string to binary string
		let num = parseInt( nums[ i ], base ).toString( 2 );

		// Pad the front with 0's so that num has length of 32
		while( num.length < size ) {
			num = "0" + num;
		}

		// Add to the binary string
		bin += num;
	}

	// Loop through all the bits and build character data
	let i = 0;
	if( bin.length % size > 0 ) {
		console.warn( "loadFont: Invalid font data." );
		return data;
	}

	while( i < bin.length ) {

		// Push a new character onto data
		data.push( [] );

		// Store the index of the font character
		const index = data.length - 1;

		// Loop through all rows
		for( let y = 0; y < height; y += 1 ) {

			// Push a new row onto the character data
			data[ index ].push( [] );

			// Loop through columns in this row
			for( let x = 0; x < width; x += 1 ) {

				let num;
				if( i >= bin.length ) {
					num = 0;
				} else {
					num = parseInt( bin[ i ] );
					if( isNaN( num ) ) {
						num = 0;
					}
				}

				// Push the bit onto the character
				data[ index ][ y ].push( num );

				// Increment the bit position
				i += 1;
			}
		}
	}

	return data;
}

// Load font from image source
function loadFontFromImage( fontSrc, font ) {
	let img;

	const bitmap = {
		"image": null,
		"width": font.width,
		"height": font.height
	};

	if( typeof fontSrc === "string" ) {

		// Create a new image
		img = new Image();

		// Increment wait count
		commands.wait();

		img.onload = function() {
			bitmap.image = img;
			commands.done();
		};

		img.onerror = function( err ) {
			console.warn( "loadFont: unable to load image for font." );
			commands.done();
		};

		// Set source after handlers
		img.src = fontSrc;
	} else if( fontSrc instanceof HTMLImageElement ) {

		// Use image element directly
		bitmap.image = fontSrc;
	} else {
		const error = new TypeError( "loadFont: fontSrc must be a string or Image element." );
		error.code = "INVALID_FONT_SRC";
		throw error;
	}
	
	// Set the bitmapId
	font.bitmapId = m_nextFontBitmapId;
	m_nextFontBitmapId += 1;

	// Set the bitmap object
	m_fontBitmaps[ font.bitmapId ] = bitmap;

}

