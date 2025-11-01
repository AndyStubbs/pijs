/**
 * Pi.js - Pens Module
 * 
 * Manages pens and blends for WebGL2 rendering.
 * 
 * @module graphics/pens
 */

"use strict";

// Import modules directly
import * as g_screenManager from "../core/screen-manager.js";
import * as g_commands from "../core/commands.js";
import * as g_utils from "../core/utils.js";

// Pens
export const PEN_PIXEL = "pixel";
export const PEN_SQUARE = "square";
export const PEN_CIRCLE = "circle";
export const PENS = new Set( [ PEN_PIXEL, PEN_SQUARE, PEN_CIRCLE ] );

// Blends
export const BLEND_REPLACE = "replace";
export const BLEND_ALPHA = "alpha";
export const BLENDS = new Set( [ BLEND_REPLACE, BLEND_ALPHA ] );

const m_noiseColor = { "r": 0, "g": 0, "b": 0, "a": 0 };


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


// Initialize the pens
export function init( api ) {
	addScreenDataItems();
	registerCommands();
}

function addScreenDataItems() {

	// Add Render Screen Data
	g_screenManager.addScreenDataItem( "blends", {
		"blend": BLEND_REPLACE, "blendFn": null, "noise": null, "noiseData": []
	} );
	g_screenManager.addScreenDataItem( "pens", {
		"pen": PEN_PIXEL, "penFn": null, "size": 1, "pixelsPerPen": 1
	} );

	// Need to rebuild Pen Fn on screen resize
	g_screenManager.addScreenResizeFunction( ( screenData ) => {
		buildPenFn( screenData );
	} );
}

function registerCommands() {

	g_commands.addCommand( "setPen", setPen, true, [ "pen", "size", "blend", "noise" ] );
}

// Function to dynamically build the optimal penFn and blendFn for the current screen, renderer,
// pen type, and blend mode. This eliminates all runtime 'if' statements and dynamic lookups in the
// pixel-drawing hot path by pre-specializing the functions at configuration change time, 
// maximizing V8 JIT compiler's inlining opportunities.
// Note that this gets called anytime a blend or pen get changed on the active screen.
// Also this gets called when the screen resizes in order to reset the s_width and s_height 
// variables.
function buildPenFn( s_screenData ) {

	const s_drawPixelunsafe = s_screenData.renderer.drawPixelUnsafe;
	const s_width = s_screenData.width;
	const s_height = s_screenData.height;
	const s_noise = s_screenData.blends.noise;
	const s_clamp = g_utils.clamp;

	// WebGL2 can handle blending in the GPU so we can just use drawPixelUnsafe for most cases
	let s_blendFn;
	if( s_screenData.blends.noise === null ) {
		s_blendFn = s_drawPixelunsafe;
	} else if( s_screenData.blends.blend === BLEND_REPLACE ) {
		// BLEND_REPLACE with noise
		s_blendFn = ( screenData, x, y, color ) => {
			s_drawPixelunsafe( screenData, x, y, getColorNoise( s_noise, color, s_clamp ) );
		};
	} else {
		// BLEND_ALPHA with noise
		s_blendFn = ( screenData, x, y, color ) => {
			s_drawPixelunsafe( screenData, x, y, getColorNoise( s_noise, color, s_clamp ) );
		};
	}

	// PEN_PIXEL
	if( s_screenData.pens.pen === PEN_PIXEL ) {

		// For a single pixel check the bounds and call blendFn
		s_screenData.pens.penFn = ( screenData, x, y, color ) => {
			if( x < 0 || x >= s_width || y < 0 || y >= s_height ) {
				return;
			}
			s_blendFn( screenData, x, y, color );
		};
	
	// PEN_SQUARE
	} else if( s_screenData.pens.pen === PEN_SQUARE ) {

		// Size must always be an odd integer
		const squareSize = s_screenData.pens.size | 1;

		// Compute the center offset of the square
		const offset = Math.round( squareSize / 2 ) - 1;

		s_screenData.pens.penFn = ( screenData, x, y, color ) => {

			// Calculate bounds and clip to screen
			const x1 = s_clamp( x - offset, 0, s_width );
			const x2 = s_clamp( x - offset + squareSize, 0, s_width );
			const y1 = s_clamp( y - offset, 0, s_height );
			const y2 = s_clamp( y - offset + squareSize, 0, s_height );

			drawPenSquare( screenData, x1, y1, x2, y2, color, s_blendFn );
		};
	
	// PEN_CIRCLE
	} else if( s_screenData.pens.pen === PEN_CIRCLE ) {

		// Special case for size two draw a 5 pixel cross
		if( s_screenData.pens.size === 2 ) {
			s_screenData.pens.penFn = ( screenData, x, y, color ) => {
				drawPenCross( screenData, x, y, color, s_width, s_height, s_blendFn );
			};
		} else {

			// Double size to get the size of the outer box
			const diameter = s_screenData.pens.size * 2;

			// Half is size of radius
			const half = s_screenData.pens.size;

			// Calculate the center of circle
			const offset = half - 1;

			// Pre-calculate squared radius threshold
			// We compare squared distance to (half - 0.5)^2
			const radiusThresholdSq = ( half - 0.5 ) * ( half - 0.5 );

			s_screenData.pens.penFn = ( screenData, x, y, color ) => {
			
				// Calculate bounds and clip to screen
				const x1 = s_clamp( x - offset, 0, s_width );
				const x2 = s_clamp( x - offset + diameter, 0, s_width );
				const y1 = s_clamp( y - offset, 0, s_height );
				const y2 = s_clamp( y - offset + diameter, 0, s_height );
	
				// Draw circle pen
				drawPenCircle(
					screenData, x, y, x1, y1, x2, y2, radiusThresholdSq, color, s_blendFn
				);
			};
		}
	}
	
	// Set the blendFn - used in filled shapes and paint
	s_screenData.blends.blendFn = s_blendFn;

	// TODO: Rebuild graphics api to get the new pen functions
	// g_graphicsApi.buildGraphicsApi( s_screenData );
}


/***************************************************************************************************
 * External API Commands
 ***************************************************************************************************/


// Set Pen Command
function setPen( screenData, options ) {
	let pen = options.pen;
	let size = g_utils.getInt( options.size, 1 );
	let blend = options.blend;
	let noise = options.noise;

	// Validate pen option
	if( !pen ) {
		pen = screenData.pens.pen;
	}
	if( !PENS.has( pen ) ) {
		const error = new TypeError(
			"setPen: Parameter pen is not a valid pen. Valid pens are (" +
			`${Array.from( PENS ).join( ", " )}).`
		);
		error.code = "INVALID_PEN";
		throw error;
	}
	if( pen === PEN_PIXEL ) {
		size = 1;
	}

	// Set the minimum pen size to 1
	if( size < 1 ) {
		size = 1;
	}

	// Size one is always just a pixel
	if( size === 1 ) {
		pen = PEN_PIXEL;
	}

	// Validate the blend option
	if( !blend ) {
		blend = screenData.blends.blend;
	}
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

	// Set the pen on screen data
	screenData.pens.pen = pen;
	screenData.pens.size = size;

	// Set the amount of points that will be drawn by the pen
	if( pen === PEN_SQUARE ) {
		screenData.pens.pixelsPerPen = size * size;
	} else if( pen === PEN_CIRCLE ) {
		if( size === 2 ) {
			screenData.pens.pixelsPerPen = 5;
		} else {
			screenData.pens.pixelsPerPen = Math.round( Math.PI * ( size + 1 ) * ( size + 1 ) ) + 1;
		}
	} else {
		screenData.pens.pixelsPerPen = 1;
	}

	// Set blend data on screen
	const previousBlend = screenData.blends.blend;
	screenData.blends.blend = blend;
	screenData.blends.noise = noise;

	buildPenFn( screenData );

	// Notify renderer that blend mode has changed
	if( previousBlend !== blend && screenData.renderer ) {
		screenData.renderer.blendModeChanged( screenData, previousBlend );
	}
}


/***************************************************************************************************
 * Pen Functions
 ***************************************************************************************************/


function drawPenSquare( screenData, x1, y1, x2, y2, color, blendFn ) {
	for( let py = y1; py < y2; py++ ) {
		for( let px = x1; px < x2; px++ ) {
			blendFn( screenData, px, py, color );
		}
	}
}

function drawPenCross( screenData, x, y, color, width, height, blendFn ) {
	if( x >= 0 && x < width && y >= 0 && y < height ) {
		blendFn( screenData, x, y, color );
	}
	if( x + 1 >= 0 && x + 1 < width && y >= 0 && y < height ) {
		blendFn( screenData, x + 1, y, color );
	}
	if( x - 1 >= 0 && x - 1 < width && y >= 0 && y < height ) {
		blendFn( screenData, x - 1, y, color );
	}
	if( x >= 0 && x < width && y + 1 >= 0 && y + 1 < height ) {
		blendFn( screenData, x, y + 1, color );
	}
	if( x >= 0 && x < width && y - 1 >= 0 && y - 1 < height ) {
		blendFn( screenData, x, y - 1, color );
	}
}

function drawPenCircle( screenData, x, y, x1, y1, x2, y2, radiusThresholdSq, color, blendFn ) {

	// Loop through the clipped square boundary
	for( let py = y1; py < y2; py++ ) {
		const dy = py - y;

		for( let px = x1; px < x2; px++ ) {
			const dx = px - x;

			// Compute the squared distance from the center
			const distSq = dx * dx + dy * dy;

			// Only draw the pixel if its squared distance is less than the threshold
			if( distSq < radiusThresholdSq ) {
				blendFn( screenData, px, py, color );
			}
		}
	}
}


/***************************************************************************************************
 * Noise Functions
 ***************************************************************************************************/


function getColorNoise( noise, color, clamp ) {
	const c2 = m_noiseColor;
	c2.r = color.r;
	c2.g = color.g;
	c2.b = color.b;
	c2.a = color.a;

	// Generate random noise
	c2.r = clamp( Math.round( c2.r + g_utils.rndRange( -noise[ 0 ], noise[ 0 ] ) ), 0, 255 );
	c2.g = clamp( Math.round( c2.g + g_utils.rndRange( -noise[ 1 ], noise[ 1 ] ) ), 0, 255 );
	c2.b = clamp( Math.round( c2.b + g_utils.rndRange( -noise[ 2 ], noise[ 2 ] ) ), 0, 255 );
	c2.a = clamp( Math.round( c2.a + g_utils.rndRange( -noise[ 3 ], noise[ 3 ] ) ), 0, 255 );

	return c2;
}

