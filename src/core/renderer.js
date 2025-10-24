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
	screenManager.addScreenDataItem( "imageData2", null );
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
		screenData.imageData2 = screenData.imageData.data;
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
	let size = utils.getFloat( options.size, null );

	if( !m_pens[ pen ] ) {
		const error = new TypeError(
			`setPen: parameter pen is not a valid pen.`
		);
		error.code = "INVALID_PEN";
		throw error;
	}

	if( size === null ) {
		const error = new TypeError( "setPen: parameter size must be a number" );
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
		screenData.context.lineWidth = size;
	}

	screenData.penData.size = size;
	screenData.penData.cap = m_pens[ pen ].cap;
	screenData.context.lineCap = m_pens[ pen ].cap;
}

// Set blend mode
screenManager.addCommand( "setBlend", setBlend, [ "mode", "noise" ] );
function setBlend( screenData, options ) {
	const mode = options.mode;
	let noise = options.noise;

	if( !m_blends[ mode ] ) {
		const error = new TypeError(
			`setBlend: Argument blend is not a valid blend mode.`
		);
		error.code = "INVALID_BLEND_MODE";
		throw error;
	}

	if( Array.isArray( noise ) ) {
		for( let i = 0; i < noise.length; i++ ) {
			if( isNaN( noise[ i ] ) ) {
				const error = new TypeError(
					"setBlend: parameter noise array contains an invalid value"
				);
				error.code = "INVALID_NOISE_VALUE";
				throw error;
			}
		}
		screenData.blendColor = blendGetColorNoise;
		screenData.blendData.noise = noise;
	} else {
		noise = utils.getInt( noise, null );
		if( noise === null ) {
			screenData.blendColor = blendGetColorNoNoise;
			screenData.blendData.noise = null;
		} else {
			screenData.blendColor = blendGetColorNoise;
			screenData.blendData.noise = utils.clamp( noise, 0, 255 );
		}
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
	const noise = screenData.blendData.noise;
	const c2 = { "r": c.r, "g": c.g, "b": c.b, "a": c.a };
	const half = noise / 2;

	if( Array.isArray( noise ) ) {
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
	const data = screenData.imageData2;

	// Calculate the index
	const i = ( ( screenData.width * y ) + x ) * 4;

	data[ i ] = c.r;
	data[ i + 1 ] = c.g;
	data[ i + 2 ] = c.b;
	data[ i + 3 ] = c.a;
}

function blendAlpha( screenData, x, y, c ) {

	c = screenData.blendColor( screenData, c );
	
	// Get the image data
	const data = screenData.imageData2

	// Calculate the index
	const i = ( ( screenData.width * y ) + x ) * 4;

	// Normalize alpha to [ 0, 1 ]
	const srcA = c.a / 255;
	const dstA = data[ i + 3 ] / 255;
	const outA = srcA + dstA * ( 1 - srcA );

	// Blend the RGB channels
	data[ i ] = Math.round( ( c.r * srcA + data[ i ] * dstA * ( 1 - srcA ) ) / outA );
	data[ i + 1 ] = Math.round( ( c.g * srcA + data[ i + 1 ] * dstA * ( 1 - srcA ) ) / outA );
	data[ i + 2 ] = Math.round( ( c.b * srcA + data[ i + 2 ] * dstA * ( 1 - srcA ) ) / outA );

	// Update alpha channel
	data[ i + 3 ] = Math.round( outA * 255 );
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

	// Size must always be an odd integer
	const size = Math.round( screenData.penData.size ) | 1;

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

	// Pen circle size must be an integer
	const baseSize = Math.round( screenData.penData.size );

	// Special case for pen size 2
	if( baseSize === 2 ) {
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
	const diameter = baseSize * 2;

	// Half is size of radius
	const half = baseSize;

	// Calculate the center of circle
	const offset = half - 1;

	// Pre-calculate squared radius threshold
	// We compare squared distance to (half - 0.5)^2
	const radiusThresholdSq = ( half - 0.5 ) * ( half - 0.5 );

	// Calculate bounds and clip to screen
	const startX = utils.clamp( x - offset, 0, screenData.width );
	const endX = utils.clamp( x - offset + diameter, 0, screenData.width );
	const startY = utils.clamp( y - offset, 0, screenData.height );
	const endY = utils.clamp( y - offset + diameter, 0, screenData.height );

	// Loop through the clipped square boundary
	for( let py = startY; py < endY; py++ ) {
		const dy = py - y;

		for( let px = startX; px < endX; px++ ) {
			const dx = px - x;

			// Compute the squared distance from the center
			const distSq = dx * dx + dy * dy;

			// Only draw the pixel if its squared distance is less than the threshold
			if( distSq < radiusThresholdSq ) {
				screenData.blend( screenData, px, py, c );
			}
		}
	}
}
