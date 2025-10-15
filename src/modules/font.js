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
let m_defaultFont = null;
let m_nextFontId = 0;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize font module
export function init() {
	screenManager.addScreenDataItemGetter( "font", () => m_defaultFont );
	screenManager.addScreenDataItemGetter( "fontSize", () => 10 );
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
		"bitmap": {
			"image": null,
			"sWidth": width,
			"sHeight": height
		}
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
screenManager.addCommand( "setFont", setFont, [ "fontId" ] );
function setFont( screenData, options ) {
	const fontId = options.fontId;

	// Check if this is a valid font
	if( !m_fonts[ fontId ] ) {
		const error = new RangeError( "setFont: invalid fontId" );
		error.code = "INVALID_FONT_ID";
		throw error;
	}

	// Set the font data
	const font = m_fonts[ fontId ];
	screenData.font = font;

	// TODO: Update when print module is implemented
	// Set the rows and cols based on font size
	// screenData.printCursor.cols = Math.floor( screenData.width / font.width );
	// screenData.printCursor.rows = Math.floor( screenData.height / font.height );
}

// setFontSize command
screenManager.addCommand( "setFontSize", setFontSize, [ "size" ] );
function setFontSize( screenData, options ) {
	const size = Math.round( options.size );

	if( !utils.isInteger( size ) || size < 1 ) {
		const error = new RangeError( "setFontSize: size must be an integer greater than 0" );
		error.code = "INVALID_SIZE";
		throw error;
	}

	screenData.fontSize = size;

	// TODO: Update when print module is implemented
	// Update rows and cols
	// const font = screenData.font;
	// screenData.printCursor.cols = Math.floor(
	//     screenData.width / ( font.width * size )
	// );
	// screenData.printCursor.rows = Math.floor(
	//     screenData.height / ( font.height * size )
	// );
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
	const data = options.data;

	// Convert string to char code
	if( typeof charCode === "string" ) {
		charCode = charCode.charCodeAt( 0 );
	}

	if( !utils.isInteger( charCode ) ) {
		const error = new TypeError( "setChar: charCode must be an integer" );
		error.code = "INVALID_CHAR_CODE";
		throw error;
	}

	if( !utils.isArray( data ) ) {
		const error = new TypeError( "setChar: data must be a 2D array" );
		error.code = "INVALID_DATA";
		throw error;
	}

	const font = screenData.font;

	// Validate data dimensions match font
	if( data.length !== font.height ) {
		const error = new RangeError(
			`setChar: data height (${data.length}) must match font height (${font.height})`
		);
		error.code = "INVALID_DATA_HEIGHT";
		throw error;
	}

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

	if( typeof fontSrc === "string" ) {

		// Create a new image
		img = new Image();

		// Increment wait count
		commands.wait();

		img.onload = function() {
			font.image = img;
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
		font.image = fontSrc;
	} else {
		const error = new TypeError( "loadFont: fontSrc must be a string or Image element." );
		error.code = "INVALID_FONT_SRC";
		throw error;
	}
}

