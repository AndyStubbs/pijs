/**
 * Pi.js - Graphics Module
 * 
 * Basic graphics commands for Alpha 2.
 * Simplified version focused on WebGL2 rendering.
 * 
 * @module modules/graphics
 */

"use strict";

import * as g_screenManager from "../core/screen-manager";
import * as g_utils from "../core/utils";
import { getColorValueByRawInput } from "./colors";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize graphics module
export function init() {

	// Add external API commands
	g_screenManager.addCommand( "pset", pset, [ "x", "y", "color" ] );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// Set pixel command
function pset( screenData, options ) {
	const x = Math.round( options.x );
	const y = Math.round( options.y );
	let color = options.color;

	// Use current color if no color specified
	if( color === null || color === undefined ) {
		color = screenData.color;
	} else {
		
		// Convert color if provided using colors module
		const colorValue = getColorValueByRawInput( screenData, color );
		if( colorValue === null ) {
			const error = new TypeError( "pset: Parameter color is not a valid color format." );
			error.code = "INVALID_COLOR";
			throw error;
		}
		color = colorValue;
	}

	// Use the renderer's drawPixelDirect function
	screenData.renderer.drawPixelDirect( screenData, x, y, color );
}
