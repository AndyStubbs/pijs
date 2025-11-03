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
	const s_drawArcSquare = g_renderer.drawArcSquare;
	const s_drawArcCircle = g_renderer.drawArcCircle;

	// Bezier
	const s_drawBezierPixel = g_renderer.drawBezierPixel;
	//const s_drawBezierSquare = g_renderer.drawArcSquare;
	//const s_drawBezierCircle = g_renderer.drawArcCircle;


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
	let s_arcDrawFn;
	let s_bezierDrawFn;
	if( s_penType === g_pens.PEN_PIXEL ) {

		// Pixel pen
		s_psetDrawFn = ( x, y, color ) => {
			s_prepareBatch( s_screenData, s_pointsBatch, 1 );
			s_drawPixel( s_screenData, x, y, color, s_pointsBatch );
		};

		// Pixel line
		s_lineDrawFn = ( x1, y1, x2, y2, color ) => {
			s_drawLinePixel( s_screenData, x1, y1, x2, y2, color );
		};

		// Pixel arc
		s_arcDrawFn = ( cx, cy, radius, angle1, angle2, color ) => {
			s_drawArcPixel( s_screenData, cx, cy, radius, angle1, angle2, color );
		};

		// Pixel bezier
		s_bezierDrawFn = ( p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color ) => {
			s_drawBezierPixel( s_screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color );
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

		// arc square pen
		s_arcDrawFn = ( cx, cy, radius, angle1, angle2, color ) => {
			s_drawArcSquare( s_screenData, cx, cy, radius, angle1, angle2, color, s_penSize, s_penType );
		};

		// bezier (fallback to pixel tessellation for now)
		s_bezierDrawFn = ( p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color ) => {
			s_drawBezierPixel( s_screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color );
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
		} else if( s_penSize >= 3 ) {

			// Delegate caching decisions to s_drawFilledCircle
			s_psetDrawFn = ( x, y, color ) => {
				s_drawFilledCircle( s_screenData, x, y, s_penSize, color );
			};
		}

		// line circle pen
		s_lineDrawFn = ( x1, y1, x2, y2, color ) => {
			s_drawLineCircle( s_screenData, x1, y1, x2, y2, color, s_penSize, s_penType );
		};

		// arc circle pen
		s_arcDrawFn = ( cx, cy, radius, angle1, angle2, color ) => {
			s_drawArcCircle( s_screenData, cx, cy, radius, angle1, angle2, color, s_penSize, s_penType );
		};

		// bezier (fallback to pixel tessellation for now)
		s_bezierDrawFn = ( p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color ) => {
			s_drawBezierPixel( s_screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color );
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

		// Draw (using pen-based drawing function)
		s_arcDrawFn(
			pCx, pCy, pRadius, g_utils.degreesToRadian( angle1 ), g_utils.degreesToRadian( angle2 ),
			s_color
		);
		s_setImageDirty( s_screenData );
	};

	m_api.arc = arcFn;
	s_screenData.api.arc = arcFn;

	/**********************************************************************************************
	 * BEZIER Command
	 **********************************************************************************************/

	const bezierFn = ( p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y ) => {
		const v0x = s_getInt( p0x, null );
		const v0y = s_getInt( p0y, null );
		const v1x = s_getInt( p1x, null );
		const v1y = s_getInt( p1y, null );
		const v2x = s_getInt( p2x, null );
		const v2y = s_getInt( p2y, null );
		const v3x = s_getInt( p3x, null );
		const v3y = s_getInt( p3y, null );

		if(
			v0x === null || v0y === null || v1x === null || v1y === null ||
			v2x === null || v2y === null || v3x === null || v3y === null
		) {
			const error = new TypeError(
				"bezier: All control point coordinates must be integers."
			);
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw
		s_bezierDrawFn( v0x, v0y, v1x, v1y, v2x, v2y, v3x, v3y, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.bezier = bezierFn;
	s_screenData.api.bezier = bezierFn;
}


/**************************************************************************************************
 * Screen Initialization
 **************************************************************************************************/


// Rebuild API when screen is created
function rebuildApiOnScreenInit( screenData ) {

	// Rebuild API with screen data
	rebuildApi( screenData );
}

