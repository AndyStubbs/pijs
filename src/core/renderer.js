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
	"pens": {},
	"blends": {}
};

// Add default pen
addPen( "pixel", penSetPixel, "square" );

// Add default blend
addBlend( "normal", blendNormal );

// Add Render Screen Data
screenManager.addScreenDataItem( "render", {
	"imageData": null,
	"isDirty": false,
	"pen": m.pens[ "pixel" ],
	"blend": m.blends[ "normal" ]
} );


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/

export function addPen( name, fn, cap ) {
	m.pens[ name ] = {
		"cmd": fn,
		"cap": cap,
		"size": 1,
		"noise": false
	};
}

export function addBlend( name, fn ) {
	m.blends[ name ] = fn;
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

// Set Pen Command
screenManager.addCommand( "setPen", setPen, [ "pen", "size", "noise" ] );
function setPen( screenData, options ) {
	const pen = options.pen;
	let size = Math.round( options.size );
	let noise = options.noise;

	if( !m.pens[ pen ] ) {
		const error = new TypeError(
			`setPen: parameter pen is not a valid pen.`
		);
		error.code = "INVALID_PEN";
		throw error;
	}

	if( !utils.isInteger( size ) ) {
		const error = new TypeError( "setPen: parameter size must be an integer" );
		error.code = "INVALID_SIZE";
		throw error;
	}

	if( noise && ( !utils.isArray( noise ) && isNaN( noise ) ) ) {
		const error = new TypeError( "setPen: parameter noise is not an array or number" );
		error.code = "INVALID_NOISE";
		throw error;
	}

	if( utils.isArray( noise ) ) {
		noise = noise.slice();
		for( let i = 0; i < noise.length; i++ ) {
			if( isNaN( noise[ i ] ) ) {
				const error = new TypeError(
					"setPen: parameter noise array contains an invalid value"
				);
				error.code = "INVALID_NOISE_VALUE";
				throw error;
			}
		}
	}

	if( pen === "pixel" ) {
		size = 1;
	}

	// Set the minimum pen size to 1
	if( size < 1 ) {
		size = 1;
	}

	// Handle special case of size of one
	if( size === 1 ) {

		// Size is one so only draw one pixel
		screenData.pen = m.pens[ "pixel" ];

		// Set the line width for context draw
		screenData.context.lineWidth = 1;
	} else {

		// Set the draw mode for pixel draw
		screenData.pen = m.pens[ pen ];

		// Set the line width for context draw
		screenData.context.lineWidth = size * 2 - 1;
	}

	screenData.pen.noise = noise;
	screenData.pen.size = size;
	screenData.context.lineCap = m.pens[ pen ].cap;
}

/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Default Set Pixel Pen
function penSetPixel( screenData, x, y, c ) {
	if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
		return;
	}

	getImageData( screenData );
	screenData.render.blend( screenData, x, y, c );
	setImageDirty( screenData );
}

// Default Blend Mode
function blendNormal( screenData, x, y, c ) {

	// Get the image data
	const data = screenData.imageData.data

	// Calculate the index
	const i = ( ( screenData.width * y ) + x ) * 4;

	data[ i ] = c.r;
	data[ i + 1 ] = c.g;
	data[ i + 2 ] = c.b;
	data[ i + 3 ] = c.a;
}
