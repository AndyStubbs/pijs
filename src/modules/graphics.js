/**
 * Pi.js - Graphics Module
 * 
 * Basic Graphics Commands
 * 
 * @module modules/graphics
 */

"use strict";

import * as screenManager from "../core/screen-manager";
import * as utils from "../core/utils";
import * as renderer from "../core/renderer";



/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize graphics module
export function init() {
	screenManager.addScreenDataItem( "cursor", { "x": 0, "y": 0 } );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// pset command
screenManager.addPixelCommand( "pset", pset, [ "x", "y" ] );
function pset( screenData, options ) {
	
	const x = Math.round( options.x );
	const y = Math.round( options.y );

	// Make sure x and y are integers
	if( !utils.isInteger( x ) || !utils.isInteger( y ) ) {
		const error = new TypeError( "pset: Arguments x and y must be integers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	// Make sure x and y are on the screen
	if( ! utils.inRange2( x, y, 0, 0, screenData.width, screenData.height ) ) {
		return;
	}

	// Get the fore color
	const color = screenData.color;

	renderer.getImageData( screenData );
	renderer.draw( screenData, x, y, color );
	renderer.setImageDirty( screenData );

	// Set the cursor after drawing
	screenData.cursor.x = x;
	screenData.cursor.y = y;
}

screenManager.addAACommand( "pset", aaPset, [ "x", "y" ] );
function aaPset( screenData, options ) {
	const x = options.x;
	const y = options.y;

	if( isNaN( x ) || isNaN( y ) ) {
		const error = new TypeError( "pset: Arguments x and y must be numbers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	screenData.api.render();
	screenData.context.fillRect( x, y, 1, 1 );

	// Set the cursor after drawing
	screenData.cursor.x = x;
	screenData.cursor.y = y;
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/

