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


// Add Graphics Screen Data
screenManager.addScreenDataItem( "fColor", null );
screenManager.addScreenDataItem( "cursor", { "x": 0, "y": 0 } );


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// pset command
screenManager.addCommand( "pset", pset, [ "x", "y" ] );
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
	const color = screenData.fColor;

	renderer.getImageData( screenData );
	renderer.draw( screenData, x, y, color );
	renderer.setImageDirty( screenData );

	// Set the cursor after drawing
	screenData.cursor.x = x;
	screenData.cursor.y = y;
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/

