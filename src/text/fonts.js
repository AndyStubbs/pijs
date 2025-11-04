/**
 * Pi.js - Fonts Module
 * 
 * Font loading and management for text rendering.
 * 
 * @module text/font
 */

"use strict";

import g_font8x8 from "./fonts/font-8x8.webp";

let g_fonts = [
	{ "cell": [ 10, 10 ], "char": [ 8, 8 ], "charset": null, "data": g_font8x8.data }
];

// Clear out the memory for the base64 font data strings
g_font8x8.data = "";


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


// Initialize graphics module - only gets called on page load
export function init( api ) {
	
	console.log( g_fonts[ 0 ].data.length );
}
