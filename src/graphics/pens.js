/**
 * Pi.js - Pens Module
 * 
 * Manages pens and blends for WebGL2 rendering.
 * 
 * @module graphics/pens
 */

"use strict";

// Import modules directly
import * as g_screenManager from "../core/screen-manager.js";
import * as g_commands from "../core/commands.js";
import * as g_utils from "../core/utils.js";

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
 ***************************************************************************************************/


// Initialize the pens
export function init( api ) {
	addScreenDataItems();
	registerCommands();
}

function addScreenDataItems() {

	// Add Render Screen Data - Store pen and blend configuration only
	g_screenManager.addScreenDataItem( "blends", {
		"blend": BLEND_REPLACE, "noise": null, "noiseData": []
	} );
	g_screenManager.addScreenDataItem( "pens", {
		"pen": PEN_PIXEL, "size": 1, "pixelsPerPen": 1
	} );
}

function registerCommands() {

	g_commands.addCommand( "setPen", setPen, true, [ "pen", "size", "blend", "noise" ] );
}


/***************************************************************************************************
 * External API Commands
 ***************************************************************************************************/


// Set Pen Command
function setPen( screenData, options ) {
	let pen = options.pen;
	let size = g_utils.getInt( options.size, 1 );
	let blend = options.blend;
	let noise = options.noise;

	// Validate pen option
	if( !pen ) {
		pen = screenData.pens.pen;
	}
	if( !PENS.has( pen ) ) {
		const error = new TypeError(
			"setPen: Parameter pen is not a valid pen. Valid pens are (" +
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

	// Size one is always just a pixel
	if( size === 1 ) {
		pen = PEN_PIXEL;
	}

	// Validate the blend option
	if( !blend ) {
		blend = screenData.blends.blend;
	}
	if( !BLENDS.has( blend ) ) {
		const error = new TypeError(
			`setBlend: Parameter blend is not a valid blend. Valid blends are (` +
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
	} else {
		noise = g_utils.getInt( noise, null );
		if( noise !== null ) {
			noise = [ noise, noise, noise, 0 ];
		}
	}

	// Set the pen on screen data
	screenData.pens.pen = pen;
	screenData.pens.size = size;

	// Set the amount of points that will be drawn by the pen
	if( pen === PEN_SQUARE ) {
		screenData.pens.pixelsPerPen = size * size;
	} else if( pen === PEN_CIRCLE ) {
		if( size === 2 ) {
			screenData.pens.pixelsPerPen = 5;
		} else {
			screenData.pens.pixelsPerPen = Math.round( Math.PI * ( size + 1 ) * ( size + 1 ) ) + 1;
		}
	} else {
		screenData.pens.pixelsPerPen = 1;
	}

	// Set blend data on screen
	const previousBlend = screenData.blends.blend;
	screenData.blends.blend = blend;
	screenData.blends.noise = noise;

	// TODO: Need to rebuild graphicsAPI after pen change because the drawing path will change for
	// primitive drawing functions. Which means that pset will no longer be setting a single pixel
	// but instead it will be creating the geometry for drawing the pen shape, either a square or
	// a circle. If we want to avoid branching in "hot paths" we will need to rebuild the api
	// with a fixed path that leads to the correct drawing function in the renderer.
	// This is only when pen changes, not when blend changes. Blend changes don't require
	// conditionals on the "hot paths" only when the batch flushes so it's not a "hot path"

	// Notify renderer that blend mode has changed
	if( previousBlend !== blend && screenData.renderer ) {
		screenData.renderer.blendModeChanged( screenData, previousBlend );
	}
}

