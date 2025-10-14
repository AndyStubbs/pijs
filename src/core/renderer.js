/**
 * Pi.js - Renderer Module
 * 
 * Manages the screens image data including rendering the screen and getting the image data
 * Also handles clearing the screen and setting the image pixel data
 * 
 * @module core/renderer
 */

"use strict";

import * as screenManager from "./screen-manager";
import * as utils from "./utils";

const m = {
	"pens": [],
};

// Add default pen
addPen( "pixel", setPixelPen, "square" );

// Add Render Screen Data
screenManager.addScreenDataItem( "render", {
	"imageData": null,
	"isDirty": false,
	"pen": m.pens[ "pixel" ],
	"blend": setPixelBlend,
	"getImageData": getImageData,
	"setImageDirty": setImageDirty
} );


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/

export function addPen( name, fn, cap ) {
	m.pens[ name ] = {
		"cmd": fn,
		"cap": cap
	};
}

export function getImageData( screenData ) {
	if( screenData.dirty === false || screenData.imageData === null ) {
		screenData.imageData = screenData.context.getImageData(
			0, 0, screenData.width, screenData.height
		);
	}
}

export function setImageDirty( screenData ) {
	if( screenData.dirty === false ) {
		screenData.dirty = true;
		if(
			screenData.isAutoRender && 
			! screenData.autoRenderMicrotaskScheduled 
		) {
			screenData.autoRenderMicrotaskScheduled = true;
			utils.queueMicrotask( function () {
				if( screenData.screenObj && screenData.isAutoRender ) {
					screenData.screenObj.render();
				}
				screenData.autoRenderMicrotaskScheduled = false;
			} );
		}
	}
}

export function draw( screenData, x, y, c ) {
	screenData.render.pen.cmd( screenData, x, y, c );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/

// Render command
screenManager.addCommand( "render", render, [] );
function render( screenData ) {
	if( screenData.imageData && screenData.isDirty ) {
		screenData.context.putImageData( screenData.imageData, 0, 0 );
	}
	screenData.isDirty = false;
}

/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Default Set Pixel Pen
function setPixelPen( screenData, x, y, c ) {
	if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
		return;
	}

	getImageData( screenData );
	screenData.render.blend( screenData, x, y, c );
	setImageDirty( screenData );
}

// Default Blend Mode
function setPixelBlend( screenData, x, y, c ) {

	// Get the image data
	const data = screenData.imageData.data

	// Calculate the index
	const i = ( ( screenData.width * y ) + x ) * 4;

	data[ i ] = c.r;
	data[ i + 1 ] = c.g;
	data[ i + 2 ] = c.b;
	data[ i + 3 ] = c.a;
}
