/**
 * Pi.js - Utilities Module
 * 
 * Common utility functions for math, colors, types, and data manipulation.
 * 
 * @module modules/utils
 */

"use strict";


/***************************************************************************************************
 * General Utility Functions
 **************************************************************************************************/


/**
 * Parse options - normalizes input arguments into an object with named parameters.
 *
 * @param {Array<any>} args - Arguments passed to the command (from rest parameters like `...args`).
 * @param {Array<string>} parameterNames - Array of parameter names in expected order.
 * @returns {Object<string, any>} 	An object where keys are `parameterNames` and values are the 
 * 									parsed arguments. Missing values will be `null`.
 */
export function parseOptions( args, parameterNames ) {
	const resultOptions = {};

	// Initialize all named parameters to null
	for( const name of parameterNames ) {
		resultOptions[ name ] = null;
	}

	let isNamedParameterFound = false;

	// Case 1: First argument is an object literal
	if( args.length > 0 && isObjectLiteral( args[ 0 ] ) ) {
		const inputOptions = args[ 0 ];

		for( const name of parameterNames ) {
			if( name in inputOptions ) {
				isNamedParameterFound = true;
				resultOptions[ name ] = inputOptions[ name ];
			}
		}
	} 
	
	// If no named parameters found then treat as positional array
	if( !isNamedParameterFound ) {

		// Case 2: Arguments are passed positionally
		// Map the positional arguments to the named parameters
		// If args[ i ] is out of bounds, it remains null from initialization
		for( let i = 0; i < parameterNames.length; i++ ) {
			if( i < args.length ) {
				resultOptions[ parameterNames[ i ] ] = args[ i ];
			}
		}
	}

	return resultOptions;
}

// Type checking utilities
export const isFunction = ( fn ) => typeof fn === "function";
export const isDomElement = ( el ) => el instanceof Element;
export const isObjectLiteral = ( obj ) => {
	if( typeof obj !== "object" || obj === null || Array.isArray( obj ) ) {
		return false;
	}
	const proto = Object.getPrototypeOf( obj );
	return proto === null || proto === Object.prototype;
};

// Data conversion utilities

/**
 * Convert hex string to 2D data array
 * 
 * @param {string} hex - Hex string
 * @param {number} width - Width of data
 * @param {number} height - Height of data
 * @returns {Array<Array<number>>} 2D array of binary data
 */
export function hexToData( hex, width, height ) {
	hex = hex.toUpperCase();
	const data = [];
	let i = 0;
	let digits = "";
	let digitIndex = 0;

	for( let y = 0; y < height; y++ ) {
		data.push( [] );
		for( let x = 0; x < width; x++ ) {
			if( digitIndex >= digits.length ) {
				let hexPart = parseInt( hex[ i ], 16 );
				if( isNaN( hexPart ) ) {
					hexPart = 0;
				}
				digits = padL( hexPart.toString( 2 ), 4, "0" );
				i += 1;
				digitIndex = 0;
			}
			data[ y ].push( parseInt( digits[ digitIndex ] ) );
			digitIndex += 1;
		}
	}
	return data;
}

// Math utilities

/**
 * Clamp a number between min and max
 * 
 * @param {number} num - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp( num, min, max ) {
	return Math.min( Math.max( num, min ), max );
}

/**
 * Check if a point is in a rectangle
 * 
 * @param {Object} point - Point with x, y properties
 * @param {Object} hitBox - Rectangle with x, y, width, height properties
 * @returns {boolean} True if point is inside rectangle
 */
export function inRange( point, hitBox ) {
	return point.x >= hitBox.x && point.x < hitBox.x + hitBox.width &&
		point.y >= hitBox.y && point.y < hitBox.y + hitBox.height;
}

/**
 * Check if coordinates are in a rectangle
 * 
 * @param {number} x1 - Point x
 * @param {number} y1 - Point y
 * @param {number} x2 - Rectangle x
 * @param {number} y2 - Rectangle y
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @returns {boolean} True if point is inside rectangle
 */
export function inRange2( x1, y1, x2, y2, width, height ) {
	return x1 >= x2 && x1 < x2 + width &&
		y1 >= y2 && y1 < y2 + height;
}

/**
 * Generate random number in range
 * 
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number between min and max
 */
export function rndRange( min, max ) {
	return Math.random() * ( max - min ) + min;
}

/**
 * Convert degrees to radians
 * 
 * @param {number} deg - Degrees
 * @returns {number} Radians
 */
export function degreesToRadian( deg ) {
	return deg * ( Math.PI / 180 );
}

/**
 * Convert radians to degrees
 * 
 * @param {number} rad - Radians
 * @returns {number} Degrees
 */
export function radiansToDegrees( rad ) {
	return rad * ( 180 / Math.PI );
}

// String utilities

/**
 * Pad string on left
 * 
 * @param {string} str - String to pad
 * @param {number} len - Target length
 * @param {string} c - Padding character
 * @returns {string} Padded string
 */
export function padL( str, len, c ) {
	if( typeof c !== "string" ) {
		c = " ";
	}
	let pad = "";
	str = str + "";
	for( let i = str.length; i < len; i++ ) {
		pad += c;
	}
	return pad + str;
}

/**
 * Pad string on both sides
 * 
 * @param {string} str - String to pad
 * @param {number} len - Target length
 * @param {string} c - Padding character
 * @returns {string} Padded string
 */
export function pad( str, len, c ) {
	if( typeof c !== "string" || c.length === 0 ) {
		c = " ";
	}
	str = str + "";
	while( str.length < len ) {
		str = c + str + c;
	}
	if( str.length > len ) {
		str = str.substring( 0, len );
	}
	return str;
}

/**
 * Parse integer with default value
 * 
 * @param {*} val - Value to parse
 * @param {number} def - Default value if parsing fails
 * @returns {number} Parsed integer or default
 */
export function getInt( val, def ) {
	if( val === null || val === undefined ) {
		return def;
	}
	const parsed = Number( val );
	if( !Number.isFinite( parsed ) ) {
		return def;
	}

	return Math.round( parsed );
}

/**
 * Parse float with default value
 * 
 * @param {*} val - Value to parse
 * @param {number} def - Default value if parsing fails
 * @returns {number} Parsed float or default
 */
export function getFloat( val, def ) {
	if( val === null || val === undefined ) {
		return def;
	}
	const parsed = Number( val );
	if( !Number.isFinite( parsed ) ) {
		return def;
	}

	return parsed;
}

// Queue microtask (built-in in modern browsers)
// Wrap to preserve window context
export const queueMicrotask = ( callback ) => {
	if( window.queueMicrotask ) {
		window.queueMicrotask( callback );
	} else {
		setTimeout( callback, 0 );
	}
};


/***************************************************************************************************
 * Color Utility Functions
 **************************************************************************************************/


const COLOR_PROTO = {
	"key": 0,
	"r": 0,
	"g": 0,
	"b": 0,
	"a": 0,
	"rgba": "",
	"hex": ""
};
const m_colorCheckerContext = document.createElement( "canvas" ).getContext( "2d" );

/**
 * Generates a unique 32-bit integer key for an opaque RGB color.
 * Each color component (R, G, B) is assumed to be an 8-bit integer (0-255).
 * The components are packed in the order: Red | Green | Blue.
 *
 * @param {number} r - Red component (0-255).
 * @param {number} g - Green component (0-255).
 * @param {number} b - Blue component (0-255).
 * @param {number} a - Alpha component (0-255).
 * @returns {number} A 32-bit integer representing the color.
 */
export function generateColorKey( r, g, b, a ) {
	return ( r << 24 ) | ( g << 16 ) | ( b << 8 ) | a;
}

/**
 * Convert RGB to color object
 * 
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @param {number} a - Alpha component (0-255)
 * @returns {Object} Color object
 */
export function rgbToColor( r, g, b, a ) {
	const hex = rgbToHex( r, g, b, a );
	return createColor( r, g, b, a, hex );
}

/**
 * Convert various color formats to color object
 * 
 * @param {*} color - Color in various formats
 * @returns {Object|null} Color object or null if invalid
 */
export function convertToColor( color ) {
	if( color === undefined || color === null ) {
		return null;
	}

	// Check if color is already a color prototype object
	if( Object.getPrototypeOf( color ) === COLOR_PROTO ) {
		return color;
	} else if( Array.isArray( color ) ) {

		// Array format [r, g, b, a]
		if( color.length < 3 ) {
			return null;
		} else if( color.length === 3 ) {
			color.push( 255 );
		}
	} else if( color.r !== undefined ) {

		// Convert from object literal or color object
		color = [ color.r, color.g, color.b, color.a ];
	} else if( typeof color === "string" ) {

		// Check if is hex format
		const checkHexColor = /(^#[0-9A-F]{8}$)|(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
		if( checkHexColor.test( color ) ) {
			return hexToColor( color );
		}

		// RGB/RGBA format
		if( color.indexOf( "rgb" ) === 0 ) {
			color = splitRgb( color );
			if( color.length < 3 ) {
				return null;
			} else if( color.length === 3 ) {
				color.push( 255 );
			}
		} else {

			// Named color or other CSS color
			return colorStringToColor( color );
		}
	}

	// Parse rgb colors
	for( let i = 0; i < 3; i += 1 ) {
		color[ i ] = getInt( color[ i ], 0 );
	}

	// Parse alpha
	color[ 3 ] = getFloat( color[ 3 ], 0 );
	if( color[ 3 ] < 1 ) {
		color[ 3 ] = Math.round( color[ 3 ] * 255 );
	} else {
		color[ 3 ] = Math.round( color[ 3 ] );
	}
	
	return rgbToColor( color[ 0 ], color[ 1 ], color[ 2 ], color[ 3 ] );
}

export function calcColorDifference( c1, c2, w = [ 0.2, 0.68, 0.07, 0.05 ] ) {
	const dr = c1.r - c2.r;
	const dg = c1.g - c2.g;
	const db = c1.b - c2.b;
	const da = c1.a - c2.a;

	return ( dr * dr * w[ 0 ] + dg * dg * w[ 1 ] + db * db * w[ 2 ] + da * da * w[ 3 ] );
}

function createColor( r, g, b, a, hex ) {
	const color = Object.create( COLOR_PROTO );
	color.key = generateColorKey( r, g, b, a, hex );
	color.r = r;
	color.g = g;
	color.b = b;
	color.a = a;
	color.rgba = `rgba(${r},${g},${b},${Math.round( a / 255).toFixed( 3 )})`;
	color.hex = hex;

	return color;
}

/**
 * Convert hex color to color object
 * 
 * @param {string} hex - Hex color string (#RGB, #RRGGBB, or #RRGGBBAA)
 * @returns {Object} Color object with r, g, b, a, s, s2 properties
 */
function hexToColor( hex ) {
	let r, g, b, a;

	if( hex.length === 4 ) {
		r = parseInt( hex.slice( 1, 2 ), 16 ) * 16 - 1;
		g = parseInt( hex.slice( 2, 3 ), 16 ) * 16 - 1;
		b = parseInt( hex.slice( 3, 4 ), 16 ) * 16 - 1;
	} else {
		r = parseInt( hex.slice( 1, 3 ), 16 );
		g = parseInt( hex.slice( 3, 5 ), 16 );
		b = parseInt( hex.slice( 5, 7 ), 16 );
	}

	if( hex.length === 9 ) {
		a = parseInt( hex.slice( 7, 9 ), 16 );
	} else {
		a = 255;
	}

	return createColor( r, g, b, a, hex );
}

/**
 * Split RGB/RGBA string into components
 * 
 * @param {string} s - RGB or RGBA string
 * @returns {Array<number>} Array of color components
 */
function splitRgb( s ) {
	s = s.slice( s.indexOf( "(" ) + 1, s.indexOf( ")" ) );
	const parts = s.split( "," );
	const colors = [];
	for( let i = 0; i < parts.length; i++ ) {
		let val;
		if( i === 3 ) {
			val = parseFloat( parts[ i ].trim() ) * 255;
		} else {
			val = parseInt( parts[ i ].trim() );
		}
		colors.push( val );
	}
	return colors;
}

/**
 * Convert color component to hex
 * 
 * @param {number} c - Color component (0-255)
 * @returns {string} Hex string
 */
function cToHex( c ) {
	if( !Number.isInteger( c ) ) {
		c = Math.round( c );
	}
	c = clamp( c, 0, 255 );
	const hex = Number( c ).toString( 16 );
	return hex.length < 2 ? "0" + hex : hex.toUpperCase();
}

/**
 * Convert RGB to hex color
 * 
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @param {number} a - Alpha component (0-255), defaults to 255
 * @returns {string} Hex color string
 */
function rgbToHex( r, g, b, a ) {
	if( isNaN( a ) ) {
		a = 255;
	}
	return "#" + cToHex( r ) + cToHex( g ) + cToHex( b ) + cToHex( a );
}

/**
 * Convert color string to color object using canvas
 * 
 * @param {string} colorStr - CSS color string
 * @returns {Object} Color object
 */
function colorStringToColor( colorStr ) {
	m_colorCheckerContext.clearRect( 0, 0, 1, 1 );
	m_colorCheckerContext.fillStyle = colorStr;
	m_colorCheckerContext.fillRect( 0, 0, 1, 1 );
	const data = m_colorCheckerContext.getImageData( 0, 0, 1, 1 ).data;
	return rgbToColor( data[ 0 ], data[ 1 ], data[ 2 ], data[ 3 ] );
}
