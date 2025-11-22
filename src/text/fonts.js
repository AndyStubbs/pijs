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
import * as g_renderer from "../renderer/renderer.js";
import * as g_print from "./print.js";

import g_fnt6x6 from "./fonts/font-6x6.webp";
import * as g_fnt6x8 from "./fonts/font-6x8.js";
import g_fnt8x8 from "./fonts/font-8x8.webp";
import g_fnt8x14 from "./fonts/font-8x14.webp";
import g_fnt8x16 from "./fonts/font-8x16.webp";

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
	
	registerCommands( api );
	loadDefaultFonts();

	// Set the font when a screen is initialized
	g_screenManager.addScreenInitFunction(
		( screenData ) => setFont( screenData, { "fontId": m_defaultFontId } )
	);
}

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
		[ "src", "width", "height", "margin", "charset" ]
	);
	g_commands.addCommand( "setDefaultFont", setDefaultFont, false, [ "fontId" ] );
	g_commands.addCommand( "getAvailableFonts", getAvailableFonts, false, [] );

	// Register screen commands
	g_commands.addCommand( "setChar", setChar, true, [ "charCode", "data" ] );
	g_commands.addCommand( "setFont", setFont, true, [ "fontId", "padX", "padY" ] );
}



// Load the default fonts
function loadDefaultFonts() {

	// 6x6 font
	loadFont( {
		"src": g_fnt6x6.data,
		"width": 6,
		"height": 6,
		"margin": 0,
		"charset": null
	} );
	g_fnt6x6.data = "";

	// 6x8 font - default font
	m_defaultFontId = loadFont( {
		"src": g_fnt6x8.getFontImage(),
		"width": 6,
		"height": 8,
		"margin": 0,
		"charset": null
	} );

	// 8x8 font
	loadFont( {
		"src": g_fnt8x8.data,
		"width": 8,
		"height": 8,
		"margin": 0,
		"charset": null
	} );
	g_fnt8x8.data = "";

	// 8x14 font
	loadFont( {
		"src": g_fnt8x14.data,
		"width": 8,
		"height": 14,
		"margin": 0,
		"charset": null
	} );
	g_fnt8x14.data = "";

	// 8x16 font
	loadFont( {
		"src": g_fnt8x16.data,
		"width": 8,
		"height": 16,
		"margin": 0,
		"charset": null
	} );
	g_fnt8x16.data = "";
}


/**************************************************************************************************
 * Load Font Command
 **************************************************************************************************/


/**
 * Load font from image source
 * 
 * @param {Object} options - Load options
 * @param {string|HTMLImageElement|HTMLCanvasElement} options.src - Font image source
 * @param {number} options.width - Character width in pixels
 * @param {number} options.height - Character height in pixels
 * @param {number} options.margin - Individual character cell width in pixels
 * @param {Array<number>|string} [options.charset] - Character set array or string
 * @returns {number} Font ID
 */
function loadFont( options ) {
	const fontSrc = options.src;
	const width = g_utils.getInt( options.width, null );
	const height = g_utils.getInt( options.height, null );
	const margin = g_utils.getInt( options.margin, 0 );
	const cellWidth = width + margin * 2;
	const cellHeight = height + margin * 2;
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
		"margin": margin,
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
 * Set Defaault Font Commands
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
export function setFont( screenData, options ) {
	const fontId = g_utils.getInt( options.fontId, null );
	const padX = g_utils.getInt( options.padX, 0 );
	const padY = g_utils.getInt( options.padY, 0 );

	// TODO: setFont should also accept a font object returned by getAvailableFonts
	
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
		g_renderer.getWebGL2Texture( screenData, font.image );
	}

	// Set the screenData font
	screenData.font = font;

	// Update print cursor dimensions
	g_print.updatePrintCursorDimensions( screenData, padX, padY );
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


/**
 * Set custom character bitmap by drawing into a temporary Canvas2D copy of the
 * font atlas, then updating the existing WebGL texture.
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options
 * @param {number|string} options.charCode - Character code or single-character string
 * @param {Array<Array<number>>|string} options.data - Character bitmap (2D array or hex string)
 * @returns {void}
 */
function setChar( screenData, options ) {
	let charCode = options.charCode;
	let data = options.data;

	const font = screenData.font;
	if( !font || !font.image ) {
		const error = new Error( "setChar: No font image loaded on this screen." );
		error.code = "NO_FONT_IMAGE";
		throw error;
	}

	// Convert string to char code
	if( typeof charCode === "string" ) {
		charCode = charCode.charCodeAt( 0 );
	} else {
		charCode = g_utils.getInt( charCode, null );
		if( charCode === null ) {
			const error = new TypeError( "setChar: charCode must be an integer or a string" );
			error.code = "INVALID_CHAR_CODE";
			throw error;
		}
	}

	// Normalize data to 2D array
	if( !Array.isArray( data ) ) {
		if( typeof data === "string" ) {
			data = g_utils.hexToData( data, font.width, font.height );
		} else {
			const error = new TypeError( "setChar: data must be a 2D array or an encoded string" );
			error.code = "INVALID_DATA";
			throw error;
		}
	}

	// Validate dimensions
	if( data.length !== font.height ) {
		const error = new RangeError(
			`setChar: data height (${data.length}) must match font height (${font.height})`
		);
		error.code = "INVALID_DATA_HEIGHT";
		throw error;
	}

	for( let i = 0; i < data.length; i++ ) {
		if( !Array.isArray( data[ i ] ) || data[ i ].length !== font.width ) {
			const error = new RangeError(
				`setChar: data width at row ${i} must match font width (${font.width})`
			);
			error.code = "INVALID_DATA_WIDTH";
			throw error;
		}
	}

	// Locate character cell in atlas
	const charIndex = font.chars[ charCode ];
	if( charIndex === undefined ) {
		const error = new RangeError( "setChar: character not in font character set" );
		error.code = "CHAR_NOT_IN_FONT";
		throw error;
	}

	const columns = Math.floor( font.atlasWidth / font.cellWidth );
	const cellX = ( charIndex % columns ) * font.cellWidth;
	const cellY = Math.floor( charIndex / columns ) * font.cellHeight;

	// Inner glyph bounds
	const sx = cellX + font.margin;
	const sy = cellY + font.margin;
	const sw = font.width;
	const sh = font.height;

	// Create a Uint8ClampedArray for the glyph sub-image pixel data
	const buf = new Uint8ClampedArray( sw * sh * 4 );
	for( let y = 0; y < sh; y += 1 ) {
		for( let x = 0; x < sw; x += 1 ) {
			const on = data[ y ][ x ] ? 1 : 0;
			if( on ) {
				const i = ( y * sw + x ) * 4;
				buf[ i + 0 ] = 255;
				buf[ i + 1 ] = 255;
				buf[ i + 2 ] = 255;
				buf[ i + 3 ] = 255;
			}
		}
	}

	// Update only the glyph region in the GPU texture
	g_renderer.updateWebGL2TextureSubImage( screenData, font.image, buf, sw, sh, sx, sy );
}
