/**
 * Pi.js - Graphics API Module
 * 
 * Thin wrapper layer for graphics commands.
 * Handles input parsing, validation, and builds optimized drawing functions.
 * 
 * @module api/graphics
 */

"use strict";

// Import modules
import * as g_screenManager from "../core/screen-manager.js";
import * as g_utils from "../core/utils.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_pens from "./pens.js";

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
		m_api.line = () => g_utils.errFn( "line" );
		m_api.arc = () => g_utils.errFn( "arc" );
		return;
	}

	const s_drawPixel = g_renderer.drawPixel;
	const s_drawFilledRect = g_renderer.drawFilledRect;
	const s_drawFilledCircle = g_renderer.drawFilledCircle;
	const s_drawCachedGeometry = g_renderer.drawCachedGeometry;

	// Lines
	const s_drawLinePixel = g_renderer.drawLinePixel;
	const s_drawLineSquare = g_renderer.drawLineSquare;
	const s_drawLineCircle = g_renderer.drawLineCircle;

	// Arcs
	const s_drawArcPixel = g_renderer.drawArcPixel;

	const s_setImageDirty = g_renderer.setImageDirty;
	const s_prepareBatch = g_renderer.prepareBatch;
	const s_getInt = g_utils.getInt;
	const s_color = s_screenData.color;
	const s_pointsBatch = g_renderer.POINTS_BATCH;

	// Get pen configuration
	const s_penConfig = s_screenData.pens;
	const s_penType = s_penConfig.pen;
	const s_penSize = s_penConfig.size;

	// TODO: Verify if we still need pixels per pen after completing all primitive draw commands
	const s_pixelsPerPen = s_penConfig.pixelsPerPen;

	// Build drawing functions based on pen type
	let s_psetDrawFn;
	let s_lineDrawFn;
	if( s_penType === g_pens.PEN_PIXEL ) {

		// Pixel pen
		s_psetDrawFn = ( x, y, color ) => {
			s_prepareBatch( s_screenData, s_pointsBatch, 1 );
			s_drawPixel( s_screenData, x, y, color, s_pointsBatch );
		};

		// Pixel line
		s_lineDrawFn = ( x1, y1, x2, y2, color ) => {
			s_prepareBatch( s_screenData, g_renderer.LINES_BATCH, 2 );
			s_drawLinePixel( s_screenData, x1, y1, x2, y2, color );
		};

		
	} else if( s_penType === g_pens.PEN_SQUARE ) {

		// Square pen - prefer top/left for even sizes, MCA consistency for odd
		let s_offsetX;
		let s_offsetY;
		if( s_penSize % 2 === 0 ) {
			s_offsetX = Math.floor( s_penSize / 2 ) - 1;
			s_offsetY = Math.floor( s_penSize / 2 );
		} else {
			s_offsetX = Math.floor( s_penSize / 2 );
			s_offsetY = Math.floor( s_penSize / 2 ) + 1;
		}

		// pset square pen
		s_psetDrawFn = ( x, y, color ) => {
			s_drawFilledRect(
				s_screenData, x - s_offsetX, y - s_offsetY, s_penSize, s_penSize, color
			);
		};

		// line square pen
		s_lineDrawFn = ( x1, y1, x2, y2, color ) => {
			s_drawLineSquare( s_screenData, x1, y1, x2, y2, color, s_penSize, s_penType );
		};

	} else if( s_penType === g_pens.PEN_CIRCLE ) {

		// Circle pen
		if( s_penSize === 2 ) {

			// Special case: size 2 draws a cross (5 pixels)
			s_psetDrawFn = ( x, y, color ) => {
				s_prepareBatch( s_screenData, s_pointsBatch, 5 );
				s_drawPixel( s_screenData, x, y, color, s_pointsBatch );
				s_drawPixel( s_screenData, x + 1, y, color, s_pointsBatch );
				s_drawPixel( s_screenData, x - 1, y, color, s_pointsBatch );
				s_drawPixel( s_screenData, x, y + 1, color, s_pointsBatch );
				s_drawPixel( s_screenData, x, y - 1, color, s_pointsBatch );
			};
		} else if( s_penSize >= 3 && s_penSize <= 30 ) {

			// TODO: Remove this here, yes it's faster but problably not too bad to just add
			// a cache check inside the s_drawFilledCircle

			// Use cached geometry for better appearance
			const cacheKey = `circle:${s_penSize}`;
			s_psetDrawFn = ( x, y, color ) => {
				
				// Apply MCA consistency adjustment
				s_drawCachedGeometry( s_screenData, cacheKey, x, y - 1, color );
			};
		} else {

			// Use drawFilledCircle for sizes > 30
			s_psetDrawFn = ( x, y, color ) => {
				s_drawFilledCircle( s_screenData, x, y, s_penSize, color );
			};
		}

		// line circle pen
		s_lineDrawFn = ( x1, y1, x2, y2, color ) => {
			s_drawLineCircle( s_screenData, x1, y1, x2, y2, color, s_penSize, s_penType );
		};
	}

	/**********************************************************************************************
	 * PSET Command
	 **********************************************************************************************/

	const psetFn = ( x, y ) => {
		const pX = s_getInt( x, null );
		const pY = s_getInt( y, null );

		// Make sure x and y are integers
		if( pX === null || pY === null ) {
			const error = new TypeError( "pset: Parameters x and y must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw (drawing functions handle their own batch preparation)
		s_psetDrawFn( pX, pY, s_color );
		s_setImageDirty( s_screenData );
	};

		m_api.pset = psetFn;
		s_screenData.api.pset = psetFn;

	/**********************************************************************************************
	 * LINE Command
	 **********************************************************************************************/

	const lineFn = ( x1, y1, x2, y2 ) => {
		const pX1 = s_getInt( x1, null );
		const pY1 = s_getInt( y1, null );
		const pX2 = s_getInt( x2, null );
		const pY2 = s_getInt( y2, null );

		// Make sure x1, y1, x2, y2 are integers
		if( pX1 === null || pY1 === null || pX2 === null || pY2 === null ) {
			const error = new TypeError( "line: Parameters x1, y1, x2, y2 must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw
		s_lineDrawFn( pX1, pY1, pX2, pY2, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.line = lineFn;
	s_screenData.api.line = lineFn;

	/**********************************************************************************************
	 * ARC Command
	 **********************************************************************************************/

	const arcFn = ( cx, cy, radius, angle1, angle2 ) => {
		const pCx = s_getInt( cx, null );
		const pCy = s_getInt( cy, null );
		const pRadius = s_getInt( radius, null );

		// Validate integer parameters
		if( pCx === null || pCy === null || pRadius === null ) {
			const error = new TypeError( "arc: Parameters cx, cy, and radius must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Validate angle parameters (numbers in radians)
		if(
			typeof angle1 !== "number" || isNaN( angle1 ) ||
			typeof angle2 !== "number" || isNaN( angle2 )
		) {
			const error = new TypeError( "arc: Parameters angle1 and angle2 must be numbers (in radians)." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Prepare batch for arc pixels (estimate: approximately 2 * PI * radius pixels)
		const estimatedPixels = Math.max( 4, Math.ceil( 2 * Math.PI * pRadius ) );
		s_prepareBatch( s_screenData, s_pointsBatch, estimatedPixels );

		// Draw
		s_drawArcPixel( s_screenData, pCx, pCy, pRadius, angle1, angle2, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.arc = arcFn;
	s_screenData.api.arc = arcFn;
}


/**************************************************************************************************
 * Screen Initialization
 **************************************************************************************************/


// Rebuild API when screen is created
function rebuildApiOnScreenInit( screenData ) {

	// Rebuild API with screen data
	rebuildApi( screenData );
}

