/**
 * Pi.js - Graphics API Module
 * 
 * Thin wrapper layer for graphics commands.
 * Handles input parsing, validation, and builds optimized drawing functions.
 * 
 * @module graphics/graphics-api
 */

"use strict";

// Import modules
import * as g_utils from "../core/utils.js";
import * as g_colors from "./colors.js";
import * as g_renderer from "./renderer/renderer.js";
import * as g_pens from "./pens.js";
import * as g_screenManager from "../core/screen-manager.js";

let m_api = null;


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


// Initialize graphics module - only gets called on page load
export function init( api ) {
	m_api = api;

	// Build the null graphics commands - basically will throw an error since no screen is available
	rebuildApi( null );

	// Register screen init function to rebuild API when screen is created
	g_screenManager.addScreenInitFunction( rebuildApiOnScreenInit );
}

// Function to dynamically build the external API drawing commands (e.g., pset, line, etc...)
// for the current active screen, pen, and blend functions. This creates specialized API wrappers
// that handle input parsing/validation, then call optimized internal drawing routines. By closing
// over specific, already-optimized functions and configuration, it provides highly performant, 
// monomorphic call sites in hot loops.
export function rebuildApi( s_screenData ) {

	if( s_screenData === null ) {

		// Set error functions for when no screen is available
		m_api.pset = () => g_utils.errFn( "pset" );
		return;
	}

	const s_drawPixelUnsafe = g_renderer.drawPixelUnsafe;

	// TODO: implement other draw commands on the webgl2 renderer
	const s_drawFilledRectUnsafe = () => {};
	const s_drawFilledCircleUnsafe = () => {};

	const s_setImageDirty = g_renderer.setImageDirty;
	const s_prepareBatch = g_renderer.prepareBatch;
	const s_getInt = g_utils.getInt;
	const s_color = s_screenData.color;

	// Get pen configuration
	const s_penConfig = s_screenData.pens;
	const s_penType = s_penConfig.pen;
	const s_penSize = s_penConfig.size;
	const s_pixelsPerPen = s_penConfig.pixelsPerPen;

	// Build drawing function based on pen type
	let s_psetDrawFn;
	if( s_penType === g_pens.PEN_PIXEL ) {

		// Pixel pen - draw single pixel
		s_psetDrawFn = ( x, y, color ) => s_drawPixelUnsafe( s_screenData, x, y, color );
	} else if( s_penType === g_pens.PEN_SQUARE ) {

		// Square pen
		s_psetDrawFn = ( x, y, color ) => {
			s_drawFilledRectUnsafe( s_screenData, x, y, s_penSize, s_penSize, color );
		};
	} else if( s_penType === g_pens.PEN_CIRCLE ) {

		// Circle pen
		if( s_penSize === 2 ) {

			// Special case: size 2 draws a cross
			s_psetDrawFn = ( x, y, color ) => {
				s_drawPixelUnsafe( s_screenData, x, y, color );
				s_drawPixelUnsafe( s_screenData, x + 1, y, color );
				s_drawPixelUnsafe( s_screenData, x - 1, y, color );
				s_drawPixelUnsafe( s_screenData, x, y + 1, color );
				s_drawPixelUnsafe( s_screenData, x, y - 1, color );
			};
		} else {
			s_psetDrawFn = ( x, y, color ) => {
				s_drawFilledCircleUnsafe( s_screenData, x, y, s_penSize, color );
			};
		}
	}

	/**********************************************************************************************
	 * PSET Command
	 **********************************************************************************************/

	// Preprocess prepares the batch for drawing
	const s_preprocessPset = ( screenData ) => s_prepareBatch(
		screenData, g_renderer.POINTS_BATCH, s_pixelsPerPen
	);

	const psetFn = ( x, y ) => {
		const pX = s_getInt( x, null );
		const pY = s_getInt( y, null );

		// Make sure x and y are integers
		if( pX === null || pY === null ) {
			const error = new TypeError( "pset: Parameters x and y must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Prepare batch and draw
		s_preprocessPset( s_screenData );
		s_psetDrawFn( pX, pY, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.pset = psetFn;
	s_screenData.api.pset = psetFn;
}


/**************************************************************************************************
 * Screen Initialization
 **************************************************************************************************/


// Rebuild API when screen is created
function rebuildApiOnScreenInit( screenData ) {

	// Rebuild API with screen data
	rebuildApi( screenData );
}

