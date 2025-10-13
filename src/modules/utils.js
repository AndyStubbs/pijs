/**
 * Pi.js - Utilities Module
 * 
 * Common utility functions for math, colors, types, and data manipulation.
 * 
 * @module modules/utils
 */

"use strict";

// Type checking utilities
export const isFunction = ( fn ) => typeof fn === "function";
export const isDomElement = ( el ) => el instanceof Element;
export const isArray = Array.isArray;
export const isInteger = Number.isInteger;
export const canAddEventListeners = ( el ) => {
	return typeof el.addEventListener === "function" && 
		typeof el.removeEventListener === "function";
};

// Color conversion utilities

/**
 * Convert hex color to color object
 * 
 * @param {string} hex - Hex color string (#RGB, #RRGGBB, or #RRGGBBAA)
 * @returns {Object} Color object with r, g, b, a, s, s2 properties
 */
export function hexToColor( hex ) {
	let r, g, b, a, s2;
	s2 = hex;

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
		s2 = hex.slice( 0, 7 );
		a = parseInt( hex.slice( 7, 9 ), 16 );
	} else {
		a = 255;
	}

	return {
		"r": r,
		"g": g,
		"b": b,
		"a": a,
		"s": `rgba(${r},${g},${b},${Math.round( a / 255 * 1000 ) / 1000})`,
		"s2": s2
	};
}

/**
 * Convert color component to hex
 * 
 * @param {number} c - Color component (0-255)
 * @returns {string} Hex string
 */
export function cToHex( c ) {
	if( !isInteger( c ) ) {
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
export function rgbToHex( r, g, b, a ) {
	if( isNaN( a ) ) {
		a = 255;
	}
	return "#" + cToHex( r ) + cToHex( g ) + cToHex( b ) + cToHex( a );
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
	return hexToColor( rgbToHex( r, g, b, a ) );
}

/**
 * Convert color string to color object using canvas
 * 
 * @param {string} colorStr - CSS color string
 * @returns {Object} Color object
 */
export function colorStringToColor( colorStr ) {
	const canvas = document.createElement( "canvas" );
	const context = canvas.getContext( "2d", { "willReadFrequently": true } );
	context.fillStyle = colorStr;
	context.fillRect( 0, 0, 1, 1 );
	const data = context.getImageData( 0, 0, 1, 1 ).data;
	return rgbToColor( data[ 0 ], data[ 1 ], data[ 2 ], data[ 3 ] );
}

/**
 * Convert color string to hex
 * 
 * @param {string} colorStr - CSS color string
 * @returns {string} Hex color string
 */
export function colorStringToHex( colorStr ) {
	return colorStringToColor( colorStr ).s2;
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
 * Convert various color formats to color object
 * 
 * @param {*} color - Color in various formats
 * @returns {Object|null} Color object or null if invalid
 */
export function convertToColor( color ) {
	if( color === undefined ) {
		return null;
	}

	// Array format [r, g, b, a]
	if( isArray( color ) && color.length > 2 ) {
		return rgbToColor( color[ 0 ], color[ 1 ], color[ 2 ], color[ 3 ] );
	}

	// Object format {r, g, b, a}
	if(
		isInteger( color?.r ) &&
		isInteger( color?.g ) &&
		isInteger( color?.b )
	) {
		return rgbToColor( color.r, color.g, color.b, color.a );
	}

	if( typeof color !== "string" ) {
		return null;
	}

	// Hex format
	const checkHexColor = /(^#[0-9A-F]{8}$)|(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
	if( checkHexColor.test( color ) ) {
		return hexToColor( color );
	}

	// RGB/RGBA format
	if( color.indexOf( "rgb" ) === 0 ) {
		const rgbParts = splitRgb( color );
		if( rgbParts.length < 3 ) {
			return null;
		}
		return rgbToColor( rgbParts[ 0 ], rgbParts[ 1 ], rgbParts[ 2 ], rgbParts[ 3 ] );
	}

	// Named color or other CSS color
	return colorStringToColor( color );
}

/**
 * Check if a color string is valid
 * 
 * @param {string} strColor - Color string to check
 * @returns {boolean} True if valid
 */
export function checkColor( strColor ) {
	const s = new Option().style;
	s.color = strColor;
	return s.color !== "";
}

/**
 * Compare two color objects
 * 
 * @param {Object} color1 - First color
 * @param {Object} color2 - Second color
 * @returns {boolean} True if colors are equal
 */
export function compareColors( color1, color2 ) {
	return color1.r === color2.r &&
		color1.g === color2.g &&
		color1.b === color2.b &&
		color1.a === color2.a;
}

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

/**
 * Convert 2D data array to hex string
 * 
 * @param {Array<Array<number>>} data - 2D array of binary data
 * @returns {string} Hex string
 */
export function dataToHex( data ) {
	let hex = "";
	let digits = "";

	for( let y = 0; y < data.length; y++ ) {
		for( let x = 0; x < data[ y ].length; x++ ) {
			digits += data[ y ][ x ];
			if( digits.length === 4 ) {
				hex += parseInt( digits, 2 ).toString( 16 );
				digits = "";
			}
		}
	}
	return hex;
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
 * Pad string on right
 * 
 * @param {string} str - String to pad
 * @param {number} len - Target length
 * @param {string} c - Padding character
 * @returns {string} Padded string
 */
export function padR( str, len, c ) {
	if( typeof c !== "string" ) {
		c = " ";
	}
	str = str + "";
	for( let i = str.length; i < len; i++ ) {
		str += c;
	}
	return str;
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
		str = str.substr( 0, len );
	}
	return str;
}

// Object utilities

/**
 * Copy properties from source to destination
 * 
 * @param {Object} dest - Destination object
 * @param {Object} src - Source object
 */
export function copyProperties( dest, src ) {
	for( const prop in src ) {
		if( src.hasOwnProperty( prop ) ) {
			dest[ prop ] = src[ prop ];
		}
	}
}

/**
 * Convert object to array
 * 
 * @param {Object} src - Source object
 * @returns {Array} Array of values
 */
export function convertToArray( src ) {
	const arr = [];
	for( const prop in src ) {
		if( src.hasOwnProperty( prop ) ) {
			arr.push( src[ prop ] );
		}
	}
	return arr;
}

/**
 * Delete all properties from object
 * 
 * @param {Object} obj - Object to clear
 */
export function deleteProperties( obj ) {
	for( const prop in obj ) {
		if( obj.hasOwnProperty( prop ) ) {
			delete obj[ prop ];
		}
	}
}

// Window utilities

/**
 * Get window size
 * 
 * @returns {Object} Object with width and height
 */
export function getWindowSize() {
	const width = window.innerWidth || document.documentElement.clientWidth ||
		document.body.clientWidth;

	const height = window.innerHeight || document.documentElement.clientHeight ||
		document.body.clientHeight;

	return { "width": width, "height": height };
}

// Search utilities

/**
 * Binary search in sorted array
 * 
 * @param {Array} data - Sorted array
 * @param {*} search - Value to search for
 * @param {Function} compareFn - Comparison function
 * @returns {number} Index of found element or negative insertion point
 */
export function binarySearch( data, search, compareFn ) {
	let m = 0;
	let n = data.length - 1;

	while( m <= n ) {
		const k = ( n + m ) >> 1;
		const result = compareFn( search, data[ k ], k );
		if( result > 0 ) {
			m = k + 1;
		} else if( result < 0 ) {
			n = k - 1;
		} else {
			return k;
		}
	}
	return -m - 1;
}

/**
 * Parse integer with default value
 * 
 * @param {*} val - Value to parse
 * @param {number} def - Default value if parsing fails
 * @returns {number} Parsed integer or default
 */
export function getInt( val, def ) {
	val = parseInt( val );
	if( isNaN( val ) ) {
		val = def;
	}
	return val;
}

// Common math constants
export const math = Object.freeze( {
	"deg30": Math.PI / 6,
	"deg45": Math.PI / 4,
	"deg60": Math.PI / 3,
	"deg90": Math.PI / 2,
	"deg120": ( 2 * Math.PI ) / 3,
	"deg135": ( 3 * Math.PI ) / 4,
	"deg150": ( 5 * Math.PI ) / 6,
	"deg180": Math.PI,
	"deg210": ( 7 * Math.PI ) / 6,
	"deg225": ( 5 * Math.PI ) / 4,
	"deg240": ( 4 * Math.PI ) / 3,
	"deg270": ( 3 * Math.PI ) / 2,
	"deg300": ( 5 * Math.PI ) / 3,
	"deg315": ( 7 * Math.PI ) / 4,
	"deg330": ( 11 * Math.PI ) / 6,
	"deg360": Math.PI * 2
} );

// Queue microtask (built-in in modern browsers)
// Wrap to preserve window context
export const queueMicrotask = ( callback ) => {
	if( window.queueMicrotask ) {
		window.queueMicrotask( callback );
	} else {
		setTimeout( callback, 0 );
	}
};

