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

	// Add pens
	addPen( "pixel", penSetPixel, "square" );
	addPen( "square", penSquare, "square" );
	addPen( "circle", penCircle, "round" );

	// Add blends blend
	addBlend( "replace", blendReplace );
	addBlend( "alpha", blendAlpha );

	// Add Render Screen Data
	screenManager.addScreenDataItem( "imageData", null );
	screenManager.addScreenDataItem( "isDirty", false );
	screenManager.addScreenDataItem( "penData", { "cap": "square", "size": 1 } );
	screenManager.addScreenDataItem( "blendData", { "noise": null } );
	screenManager.addScreenDataItem( "isAutoRender", true );
	screenManager.addScreenDataItem( "autoRenderMicrotaskScheduled", false );

	// Add Screen Internal Commands
	screenManager.addScreenInternalCommands( "pen", m_pens[ "pixel" ].fn );
	screenManager.addScreenInternalCommands( "blend", m_blends[ "replace" ].fn );
	screenManager.addScreenInternalCommands( "blendColor", blendGetColorNoNoise );
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

// cls (clear screen) command
screenManager.addCommand( "cls", cls, [ "x", "y", "width", "height" ] );
function cls( screenData, options ) {
	const x = utils.getInt( options.x, 0 );
	const y = utils.getInt( options.y, 0 );
	const width = utils.getInt( options.width, screenData.width );
	const height = utils.getInt( options.height, screenData.height );

	// If clearing a partial region, render first to preserve other content
	if( x !== 0 || y !== 0 || width !== screenData.width || height !== screenData.height ) {
		screenData.api.render();
		screenData.context.clearRect( x, y, width, height );
	} else {

		// Full screen clear - reset everything
		screenData.context.clearRect( x, y, width, height );
		screenData.imageData = null;
		screenData.isDirty = false;
		screenData.printCursor.x = 0;
		screenData.printCursor.y = 0;
		screenData.cursor.x = 0;
		screenData.cursor.y = 0;
	}
}

// setAutoRender command
screenManager.addCommand( "setAutoRender", setAutoRender, [ "isAutoRender" ] );
function setAutoRender( screenData, options ) {
	const isAutoRender = !!options.isAutoRender;

	screenData.isAutoRender = isAutoRender;

	// If enabling auto-render, render any pending changes immediately
	if( isAutoRender ) {
		screenData.api.render();
	}
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


function addPen( name, fn, cap ) {
	m_pens[ name ] = { fn, cap, "size": 1 };
}

function addBlend( name, fn ) {
	m_blends[ name ] = { fn };
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

/***************************************************************************************************
 * Blends
 **************************************************************************************************/


function blendReplace( screenData, x, y, c ) {

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

function blendAlpha( screenData, x, y, c ) {

	// Get the image data
	const data = screenData.imageData.data

	// Calculate the index
	const i = ( ( screenData.width * y ) + x ) * 4;

	// displayColor = sourceColor × alpha / 255 + backgroundColor × (255 – alpha) / 255
	// blend = ( source * source_alpha) + desitination * ( 1 - source_alpha)
	const pct = c.a / 255;
	const pct2 = ( 255 - c.a ) / 255;
	data[ i ] = ( c.r * pct ) + data[ i ] * pct2
	data[ i + 1 ] = ( c.g * pct ) + data[ i + 1 ] * pct2;
	data[ i + 2 ] = ( c.b * pct ) + data[ i + 2 ] * pct2;
}


/***************************************************************************************************
 * Pens
 **************************************************************************************************/


// Set pixel pen
function penSetPixel( screenData, x, y, c ) {
	if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
		return;
	}
	screenData.blend( screenData, x, y, c );
}

function penSquare( screenData, x, y, c ) {

	// Size must always be an odd number
	const size = screenData.penData.size * 2 - 1;

	// Compute the center offset of the square
	const offset = Math.round( size / 2 ) - 1;

	// Calculate bounds and clip to screen
	const startX = utils.clamp( x - offset, 0, screenData.width );
	const endX = utils.clamp( x - offset + size, 0, screenData.width );
	const startY = utils.clamp( y - offset, 0, screenData.height );
	const endY = utils.clamp( y - offset + size, 0, screenData.height );

	// Draw the clipped square
	for( let py = startY; py < endY; py++ ) {
		for( let px = startX; px < endX; px++ ) {
			screenData.blend( screenData, px, py, c );
		}
	}
}

function penCircle( screenData, x, y, c ) {

	// Special case for pen size 2
	if( screenData.penData.size === 2 ) {
		if( x >= 0 && x < screenData.width && y >= 0 && y < screenData.height ) {
			screenData.blend( screenData, x, y, c );
		}
		if( x + 1 >= 0 && x + 1 < screenData.width && y >= 0 && y < screenData.height ) {
			screenData.blend( screenData, x + 1, y, c );
		}
		if( x - 1 >= 0 && x - 1 < screenData.width && y >= 0 && y < screenData.height ) {
			screenData.blend( screenData, x - 1, y, c );
		}
		if( x >= 0 && x < screenData.width && y + 1 >= 0 && y + 1 < screenData.height ) {
			screenData.blend( screenData, x, y + 1, c );
		}
		if( x >= 0 && x < screenData.width && y - 1 >= 0 && y - 1 < screenData.height ) {
			screenData.blend( screenData, x, y - 1, c );
		}
		return;
	}

	// Double size to get the size of the outer box
	const size = screenData.penData.size * 2;

	// Half is size of radius
	const half = screenData.penData.size;

	// Calculate the center of circle
	const offset = half - 1;

	// Calculate bounds and clip to screen
	const startX = utils.clamp( x - offset, 0, screenData.width );
	const endX = utils.clamp( x - offset + size, 0, screenData.width );
	const startY = utils.clamp( y - offset, 0, screenData.height );
	const endY = utils.clamp( y - offset + size, 0, screenData.height );

	// Loop through the clipped square boundary
	for( let py = startY; py < endY; py++ ) {
		const y3 = py - y;

		for( let px = startX; px < endX; px++ ) {
			const x3 = px - x;

			// Compute the radius of point - round to make pixel perfect
			const r = Math.round( Math.sqrt( x3 * x3 + y3 * y3 ) );

			// Only draw the pixel if it is inside the circle
			if( r < half ) {
				screenData.blend( screenData, px, py, c );
			}
		}
	}
}
