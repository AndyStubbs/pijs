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

const m_pens = {};
const m_blends = {};


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize the renderer
export function init() {

	// Add default pen
	addPen( "pixel", penSetPixel, "square" );

	// Add default blend
	addBlend( "normal", blendNormal );

	// Add Render Screen Data
	screenManager.addScreenDataItem( "imageData", null );
	screenManager.addScreenDataItem( "isDirty", false );
	screenManager.addScreenDataItem( "penData", { "cap": "square", "size": 1 } );
	screenManager.addScreenDataItem( "blendData", { "noise": null } );
	screenManager.addScreenDataItem( "isAutoRender", true );
	screenManager.addScreenDataItem( "autoRenderMicrotaskScheduled", false );

	// Add Screen Internal Commands
	screenManager.addScreenInternalCommands( "pen", m_pens[ "pixel" ].fn );
	screenManager.addScreenInternalCommands( "blend", m_blends[ "normal" ].fn );
	screenManager.addScreenInternalCommands( "blendColor", blendGetColorNoNoise );
}

export function addPen( name, fn, cap ) {
	m_pens[ name ] = { fn, cap, "size": 1 };
}

export function addBlend( name, fn ) {
	m_blends[ name ] = { fn };
}

export function getImageData( screenData ) {
	if( screenData.isDirty === false || screenData.imageData === null ) {
		screenData.imageData = screenData.context.getImageData(
			0, 0, screenData.width, screenData.height
		);
	}
}

export function setImageDirty( screenData ) {
	if( screenData.isDirty === false ) {
		screenData.isDirty = true;
		if(
			screenData.isAutoRender && 
			! screenData.autoRenderMicrotaskScheduled 
		) {
			screenData.autoRenderMicrotaskScheduled = true;
			utils.queueMicrotask( function () {
				if( screenData.isAutoRender ) {
					screenData.api.render();
				}
				screenData.autoRenderMicrotaskScheduled = false;
			} );
		}
	}
}

export function draw( screenData, x, y, c ) {
	screenData.pen( screenData, x, y, c );
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
screenManager.addCommand( "setPen", setPen, [ "pen", "size" ] );
function setPen( screenData, options ) {
	const pen = options.pen;
	let size = Math.round( options.size );

	if( !m_pens[ pen ] ) {
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
		screenData.pen = m_pens[ "pixel" ].fn;

		// Set the line width for context draw
		screenData.context.lineWidth = 1;
	} else {

		// Set the draw mode for pixel draw
		screenData.pen = m_pens[ pen ].fn;

		// Set the line width for context draw
		screenData.context.lineWidth = size * 2 - 1;
	}

	screenData.penData.size = size;
	screenData.penData.cap = m_pens[ pen ].cap;
	screenData.context.lineCap = m_pens[ pen ].cap;
}

// Set blend mode
screenManager.addCommand( "setBlendMode", setBlendMode, [ "mode", "noise" ] );
function setBlendMode( screenData, options ) {
	const mode = options.mode;
	let noise = options.noise;

	if( !m_blends[ mode ] ) {
		const error = new TypeError(
			`setBlendMode: Argument blend is not a valid blend mode.`
		);
		error.code = "INVALID_BLEND_MODE";
		throw error;
	}

	if( utils.isArray( noise ) ) {
		for( let i = 0; i < noise.length; i++ ) {
			if( isNaN( noise[ i ] ) ) {
				const error = new TypeError(
					"setBlendMode: parameter noise array contains an invalid value"
				);
				error.code = "INVALID_NOISE_VALUE";
				throw error;
			}
		}
		screenData.blendColor = blendGetColorNoise;
		screenData.blendData.noise = noise;
	} else {
		screenData.blendColor = blendGetColorNoNoise;
		screenData.blendData.noise = null;
	}

	screenData.blend = m_blends[ mode ].fn;
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Default Set Pixel Pen
function penSetPixel( screenData, x, y, c ) {
	if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
		return;
	}
	screenData.blend( screenData, x, y, c );
}

// Default Blend Mode
function blendNormal( screenData, x, y, c ) {

	c = screenData.blendColor( screenData, c );

	// Get the image data
	const data = screenData.imageData.data

	// Calculate the index
	const i = ( ( screenData.width * y ) + x ) * 4;

	data[ i ] = c.r;
	data[ i + 1 ] = c.g;
	data[ i + 2 ] = c.b;
	data[ i + 3 ] = c.a;
}

// Default Blend Color Picker
function blendGetColorNoNoise( screenData, c ) {
	return c;
}

// Default Noise Blend Color Picker
function blendGetColorNoise( screenData, c ) {
	const noise = screenData.blend.noise;
	const c2 = { "r": c.r, "g": c.g, "b": c.b, "a": c.a };
	const half = noise / 2;

	if( utils.isArray( noise ) ) {
		c2.r = utils.clamp(
			Math.round( c2.r + utils.rndRange( -noise[ 0 ], noise[ 0 ] ) ),	0, 255
		);
		c2.g = utils.clamp(
			Math.round( c2.g + utils.rndRange( -noise[ 1 ], noise[ 1 ] ) ), 0, 255
		);
		c2.b = utils.clamp(
			Math.round( c2.b + utils.rndRange( -noise[ 2 ], noise[ 2 ] ) ), 0, 255
		);
		c2.a = utils.clamp(
			c2.a + utils.rndRange( -noise[ 3 ], noise[ 3 ] ), 0, 255
		);
	} else {
		const change = Math.round( Math.random() * noise - half );
		c2.r = utils.clamp( c2.r + change, 0, 255 );
		c2.g = utils.clamp( c2.g + change, 0, 255 );
		c2.b = utils.clamp( c2.b + change, 0, 255 );
	}

	return c2;
}
