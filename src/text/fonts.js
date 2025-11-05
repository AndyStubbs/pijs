/**
 * Pi.js - Font Module
 * 
 * Font loading, management, and character data for text rendering.
 * Supports bitmap fonts from images only (no base32-encoded data).
 * 
 * @module text/fonts
 */

// TODO: Add remove font command that removes the font and deletes any WebGL textures

"use strict";

import * as g_utils from "../core/utils.js";
import * as g_commands from "../core/commands.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_textures from "../renderer/textures.js";
import * as g_print from "./print.js";

import * as g_fnt6x8 from "./fonts/font-6x8.js";
import g_fnt8x8 from "./fonts/font-8x8.webp";

const m_fontMap = new Map();
let m_defaultFontId = null;
let m_nextFontId = 0;


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize font module
 * 
 * @param {Object} api - The main Pi.js API object
 * @returns {void}
 */
export function init( api ) {
	g_screenManager.addScreenDataItem( "font", null );
	
	// Set the font when a screen is initialized
	g_screenManager.addScreenInitFunction(
		( screenData ) => setFont( screenData, { "fontId": m_defaultFontId } )
	);

	registerCommands( api );
	loadDefaultFonts();
}


// Load the default fonts
function loadDefaultFonts() {

	// 6x8 font - default font
	m_defaultFontId = loadFont( {
		"src": g_fnt6x8.getFontImage(),
		"width": 6,
		"height": 8,
		"cellWidth": 8,
		"cellHeight": 10,
		"charset": null
	} );

	// 8x8 font
	loadFont( {
		"src": g_fnt8x8.data,
		"width": 8,
		"height": 8,
		"cellWidth": 10,
		"cellHeight": 10,
		"charset": null
	} );
	g_fnt8x8.data = ""; // Clear Base64 string from memory
}


/***************************************************************************************************
 * Command Registration
 ***************************************************************************************************/


/**
 * Register font commands
 * 
 * @param {Object} api - The main Pi.js API object
 * @returns {void}
 */
function registerCommands( api ) {

	// Register non-screen commands
	g_commands.addCommand(
		"loadFont", loadFont, false,
		[ "src", "width", "height", "cellWidth", "cellHeight", "charset" ]
	);
	g_commands.addCommand( "setDefaultFont", setDefaultFont, false, [ "fontId" ] );
	g_commands.addCommand( "getAvailableFonts", getAvailableFonts, false, [] );

	// Register screen commands
	g_commands.addCommand( "setFont", setFont, true, [ "fontId" ] );
	//g_commands.addCommand( "setChar", setChar, true, [ "charCode", "data" ] );
}


/**************************************************************************************************
 * Load Font Command
 **************************************************************************************************/


/**
 * Load font from image source
 * 
 * @param {Object} options - Load options
 * @param {string|HTMLImageElement} options.src - Font image source (URL or Image element)
 * @param {number} options.width - Character width in pixels
 * @param {number} options.height - Character height in pixels
 * @param {number} options.cellWidth - Individual character cell width in pixels
 * @param {number} options.cellHeight - Individual character cell height in pixels
 * @param {Array<number>|string} [options.charset] - Character set array or string
 * @returns {number} Font ID
 */
function loadFont( options ) {
	const fontSrc = options.src;
	const width = g_utils.getInt( options.width, null );
	const height = g_utils.getInt( options.height, null );
	const cellWidth = g_utils.getInt( options.cellWidth, width );
	const cellHeight = g_utils.getInt( options.cellHeight, height );
	let charset = options.charset;

	if( width === null || height === null ) {
		const error = new TypeError( "loadFont: width and height must be integers." );
		error.code = "INVALID_DIMENSIONS";
		throw error;
	}

	// Default charset to 0 to 255
	if( !charset ) {
		charset = [];
		for( let i = 0; i < 256; i += 1 ) {
			charset.push( i );
		}
	}

	if( !( Array.isArray( charset ) || typeof charset === "string" ) ) {
		const error = new TypeError( "loadFont: charset must be an array or a string." );
		error.code = "INVALID_CHARSET";
		throw error;
	}

	// Convert charset to array of integers (character codes)
	if( typeof charset === "string" ) {
		const temp = [];
		for( let i = 0; i < charset.length; i += 1 ) {
			temp.push( charset.charCodeAt( i ) );
		}
		charset = temp;
	}

	// Build chars lookup map
	const chars = {};
	for( let i = 0; i < charset.length; i += 1 ) {
		chars[ charset[ i ] ] = i;
	}

	// Create font object
	const font = {
		"id": m_nextFontId,
		"width": width,
		"height": height,
		"cellWidth": cellWidth,
		"cellHeight": cellHeight,
		"chars": chars,
		"charset": charset,
		"image": null,
		"atlasWidth": null,
		"atlasHeight": null
	};

	// Add to fonts array
	m_fontMap.set( font.id, font );
	m_nextFontId += 1;

	// Load from image source
	loadFontFromImage( fontSrc, font );

	return font.id;
}

/**
 * Load font from image source
 * 
 * @param {string|HTMLImageElement} fontSrc - Font image source
 * @param {Object} font - Font object to populate
 * @returns {void}
 */
function loadFontFromImage( fontSrc, font ) {
	let img;

	if( typeof fontSrc === "string" ) {

		// Create a new image
		img = new Image();

		// Increment wait count
		g_commands.wait();

		img.onload = function() {
			font.image = img;
			font.atlasWidth = img.width;
			font.atlasHeight = img.height;
			g_commands.done();
		};

		img.onerror = function( err ) {
			console.error( "loadFont: Unable to load image for font." );
			g_commands.done();
		};

		// Set source after handlers
		img.src = fontSrc;
	} else if( fontSrc instanceof HTMLImageElement || fontSrc instanceof HTMLCanvasElement ) {

		// Use image element directly
		font.image = fontSrc;
		font.atlasWidth = fontSrc.width;
		font.atlasHeight = fontSrc.height;
	} else {
		const error = new TypeError( "loadFont: fontSrc must be a string or Image element." );
		error.code = "INVALID_FONT_SRC";
		throw error;
	}
}


/**************************************************************************************************
 * Set Font Commands
 **************************************************************************************************/


/**
 * Set default font
 * 
 * @param {Object} options - Options
 * @param {number} options.fontId - Font ID
 * @returns {void}
 */
function setDefaultFont( options ) {
	const fontId = g_utils.getInt( options.fontId, null );

	if( fontId === null || !m_fontMap.has( fontId ) ) {
		const error = new RangeError( "setDefaultFont: invalid fontId" );
		error.code = "INVALID_FONT_ID";
		throw error;
	}

	m_defaultFontId = fontId;
}

/**
 * Set font for screen
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options
 * @param {number} options.fontId - Font ID or CSS font string
 * @returns {void}
 */
function setFont( screenData, options ) {
	const fontId = g_utils.getInt( options.fontId, null );

	if( fontId === null || !m_fontMap.has( fontId ) ) {
		const error = new RangeError(
			"setFont: Parameter fontId must be an integer and an index in the available fonts."
		);
		error.code = "INVALID_FONT_ID";
		throw error;
	}

	const font = m_fontMap.get( fontId );

	// Get or create texture for font image if it's loaded
	if( font.image ) {
		const texture = g_textures.getWebGL2Texture( screenData, font.image );
		if( !texture ) {
			console.warn( "setFont: Failed to get/create texture for font image." );
		}
	}

	// Set the screenData font
	screenData.font = font;

	// Update print cursor dimensions
	g_print.updatePrintCursorDimensions( screenData );
}


/**************************************************************************************************
 * Get Available Font Command
 **************************************************************************************************/


/**
 * Get available fonts
 * 
 * @returns {Array<Object>} Array of font info objects
 */
function getAvailableFonts() {
	const fonts = [];
	for( const [ fontId, font ] of m_fontMap ) {
		fonts.push( {
			"id": font.id,
			"width": font.width,
			"height": font.height
		} );
	}
	return fonts;
}


/**************************************************************************************************
 * Get Available Font Command
 **************************************************************************************************/


// TODO: Need to draw the new char to the font image and update the texture if it's loaded
// Simple solution is to use canvas2d to draw it.
// This as it's a "not safe for animation" function.
// /**
//  * Set custom character bitmap
//  * 
//  * @param {Object} screenData - Screen data object
//  * @param {Object} options - Options
//  * @param {number|string} options.charCode - Character code or string
//  * @param {Array<Array<number>>|string} options.data - Character bitmap data (2D array or hex string)
//  * @returns {void}
//  */
// function setChar( screenData, options ) {
// 	let charCode = options.charCode;
// 	let data = options.data;

// 	const font = screenData.font;

// 	// Convert string to char code
// 	if( typeof charCode === "string" ) {
// 		charCode = charCode.charCodeAt( 0 );
// 	} else {
// 		charCode = g_utils.getInt( charCode, null );
// 		if( charCode === null ) {
// 			const error = new TypeError( "setChar: charCode must be an integer or a string" );
// 			error.code = "INVALID_CHAR_CODE";
// 			throw error;
// 		}
// 	}

// 	if( !Array.isArray( data ) ) {
// 		if( typeof data === "string" ) {
// 			data = g_utils.hexToData( data, font.width, font.height );
// 		} else {
// 			const error = new TypeError( "setChar: data must be a 2D array or an encode string" );
// 			error.code = "INVALID_DATA";
// 			throw error;
// 		}
// 	}

// 	// Validate data dimensions match font
// 	if( data.length !== font.height ) {
// 		const error = new RangeError(
// 			`setChar: data height (${data.length}) must match font height (${font.height})`
// 		);
// 		error.code = "INVALID_DATA_HEIGHT";
// 		throw error;
// 	}

// 	// Validate data items
// 	for( let i = 0; i < data.length; i++ ) {
// 		if( !Array.isArray( data[ i ] ) || data[ i ].length !== font.width ) {
// 			const error = new RangeError(
// 				`setChar: data width at row ${i} must match font width (${font.width})`
// 			);
// 			error.code = "INVALID_DATA_WIDTH";
// 			throw error;
// 		}
// 	}

// 	// Get character index in font
// 	const charIndex = font.chars[ charCode ];
// 	if( charIndex === undefined ) {
// 		const error = new RangeError( "setChar: character not in font character set" );
// 		error.code = "CHAR_NOT_IN_FONT";
// 		throw error;
// 	}

// 	// Set the character data
// 	font.data[ charIndex ] = data;
// }


/***************************************************************************************************
 * Internal Functions
 ***************************************************************************************************/
