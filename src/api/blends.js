/**
 * Pi.js - Blends Module
 * 
 * Manages the api for blending in WebGL2.
 * 
 * @module api/blends
 */

"use strict";

// Import modules directly
import * as g_screenManager from "../core/screen-manager.js";
import * as g_commands from "../core/commands.js";
import * as g_utils from "../core/utils.js";
import * as g_graphicsApi from "./graphics.js";
import * as g_renderer from "../renderer/renderer.js";

// Blends
export const BLEND_REPLACE = "replace";
export const BLEND_ALPHA = "alpha";
export const BLENDS = new Set( [ BLEND_REPLACE, BLEND_ALPHA ] );


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


// Initialize the blends
export function init( api ) {
	
	// Add Render Screen Data - Store pen and blend configuration only
	g_screenManager.addScreenDataItem( "blends", {
		"blend": BLEND_REPLACE, "noise": null, "noiseData": []
	} );

	registerCommands();
}


function registerCommands() {
	g_commands.addCommand( "setBlend", setBlend, true, [ "blend", "noise" ] );
}


/***************************************************************************************************
 * External API Commands
 ***************************************************************************************************/


// Set Pen Command
function setBlend( screenData, options ) {
	let blend = options.blend ?? screenData.blends.blend;
	let noise = options.noise;

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

	// Set blend data on screen
	const previousBlend = screenData.blends.blend;
	screenData.blends.blend = blend;
	screenData.blends.noise = noise;

	// Notify renderer that blend mode has changed
	if( previousBlend !== blend ) {
		g_renderer.blendModeChanged( screenData, previousBlend );
	}
}
