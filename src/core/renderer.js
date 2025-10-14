/**
 * Pi.js - Render Module
 * 
 * Manages the screens image data including rendering the screen and getting the image data
 * Also handles clearing the screen and filtering the image on the screen
 * 
 * @module core/renderer
 */

"use strict";

import * as screenManager from "./screen-manager";
import * as commands from "./commands";
import * as utils from "./utils";

screenManager.addScreenDataItem( "imageData", null );
screenManager.addScreenDataItem( "isDirty", false );
screenManager.addCommand( "render", render );

function render( screenData ) {
	if( screenData.imageData && screenData.isDirty ) {
		screenData.context.putImageData( screenData.imageData, 0, 0 );
	}
	screenData.isDirty = false;
}
