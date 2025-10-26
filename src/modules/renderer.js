/**
 * Pi.js - Renderer Module
 * 
 * Manages the screens image data including rendering the screen and getting the image data
 * Also handles clearing the screen and setting the image pixel data
 * 
 * @module core/renderer
 */

"use strict";

import * as g_screenManager from "../core/screen-manager";
import * as g_utils from "../core/utils";


// Pens
export const PEN_PIXEL = "pixel";
export const PEN_SQUARE = "square";
export const PEN_CIRCLE = "circle";
export const PENS = new Set( [ PEN_PIXEL, PEN_SQUARE, PEN_CIRCLE ] );

// Blends
export const BLEND_REPLACE = "replace";
export const BLEND_ALPHA = "alpha";
export const BLENDS = new Set( [ BLEND_REPLACE, BLEND_ALPHA ] );


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize the renderer
export function init() {

	// Add Render Screen Data
	g_screenManager.addScreenDataItem( "isDirty", false );
	g_screenManager.addScreenDataItem( "blendData", {
		"blend": BLEND_REPLACE, "isAlpha": false, "noise": null, "hasNoise": false
	} );
	g_screenManager.addScreenDataItem( "penData", { "pen": PEN_PIXEL, "size": 1, "isFast": true } );
	g_screenManager.addScreenDataItem( "isRenderScheduled", false );

	// Add renderer cleanup
	g_screenManager.addScreenCleanupFunction( cleanup );

	// Add external API commands
	g_screenManager.addCommand( "cls", cls, [ "x", "y", "width", "height" ] );
	g_screenManager.addCommand( "setPen", setPen, [ "pen", "size" ] );
	g_screenManager.addCommand( "setBlend", setBlend, [ "mode", "noise" ] );
}

function cleanup( screenData ) {

	// Call specific renderer cleanup function
	screenData.renderer.cleanup( screenData );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// cls (clear screen) command
function cls( screenData, options ) {
	const x = g_utils.getInt( options.x, 0 );
	const y = g_utils.getInt( options.y, 0 );
	const width = g_utils.getInt( options.width, screenData.width );
	const height = g_utils.getInt( options.height, screenData.height );

	screenData.renderer.cls( x, y, width, height );
}

// Set Pen Command
function setPen( screenData, options ) {
	let pen = options.pen;
	let size = g_utils.getFloat( options.size, 1 );

	if( !PENS.has( pen ) ) {
		const error = new TypeError(
			`setPen: parameter pen is not a valid pen. Valid pens are (` +
			`${Array.from( PENS ).join( ", " )}).`
		);
		error.code = "INVALID_PEN";
		throw error;
	}

	if( pen === PEN_PIXEL ) {
		size = 1;
	}

	// Set the minimum pen size to 1
	if( size < 1 ) {
		size = 1;
	}

	// Handle special case of size of one
	if( size === 1 ) {
		pen = PEN_PIXEL;
		screenData.penData.isFast = true;
	} else {
		screenData.penData.isFast = false;
	}

	// Set the pen on screen data
	screenData.penData.pen = pen;
	screenData.penData.size = size;
}

// Set blend mode
function setBlend( screenData, options ) {
	const mode = options.mode;
	let noise = options.noise;

	// Validate the blend mode option
	if( !BLENDS.has( mode ) ) {
		const error = new TypeError(
			`setBlend: Argument blend is not a valid blend mode. Valid blends are(` +
			`${Array.from( BLENDS ).join( ", " )}).`
		);
		error.code = "INVALID_BLEND_MODE";
		throw error;
	}

	// Validate the noise option
	if( Array.isArray( noise ) ) {
		for( let i = 0; i < noise.length; i++ ) {
			if( isNaN( noise[ i ] ) ) {
				const error = new TypeError(
					"setBlend: Parameter noise array contains an invalid value."
				);
				error.code = "INVALID_NOISE_VALUE";
				throw error;
			}
		}
		screenData.blendData.hasNoise = true;
		screenData.blendData.noise = noise;
	} else {
		noise = g_utils.getInt( noise, null );
		if( noise !== null ) {
			noise = g_utils.clamp( noise, 0, 255 );
		}
	}

	// Set blendData on screen
	screenData.blendData.plend = mode;
	screenData.blendData.hasNoise = noise !== null;
	screenData.blendData.noise = noise;
}


/***************************************************************************************************
 * Internal Functions
 **************************************************************************************************/

