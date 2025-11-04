/**
 * Pi.js - Graphics API Module
 * 
 * Thin wrapper layer for graphics commands.
 * Handles input parsing, validation, and builds optimized drawing functions.
 * 
 * @module api/graphics
 * 
 * TODO: I removed objectLiteral parameter parsing for primitives to improve the speed, but there
 * is a problem with this especially when dealing with hitboxes, it was nice to be able to 
 * create a hit box object literal {x, y, width, height} and to share this with rects and events.
 * 
 * Create alternate primitive methods that accept an object literal as a first parameter. Test the
 * difference, if significant then keep the both methods if not then just always allow object
 * literals as first parameter.
 */

"use strict";

// Import modules
import * as g_screenManager from "../core/screen-manager.js";
import * as g_utils from "../core/utils.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_colors from "./colors.js";

let m_api = null;


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


// Initialize graphics module - only gets called on page load
export function init( api ) {
	m_api = api;

	// Build the null graphics commands - basically will throw an error since no screen is available
	buildApi( null );

	// Register screen init function to rebuild API when screen is created
	g_screenManager.addScreenInitFunction( ( screenData ) => buildApi( screenData ) );
}

// Function to build the external API drawing commands (e.g., pset, line, etc...) for the current
// active screen. This creates specialized API wrappers that handle input parsing/validation, then
// call optimized internal drawing routines. By closing over specific, already-optimized functions
// and screen configuration, it provides highly performant, monomorphic call sites in hot loops.
export function buildApi( s_screenData ) {

	// Set error functions for when no screen is available
	if( s_screenData === null ) {
		m_api.pset = () => g_utils.errFn( "pset" );
		m_api.line = () => g_utils.errFn( "line" );
		m_api.arc = () => g_utils.errFn( "arc" );
		m_api.rect = () => g_utils.errFn( "rect" );
		m_api.bezier = () => g_utils.errFn( "bezier" );
		return;
	}

	// Draw commands
	const s_drawPixel = g_renderer.drawPixel;
	const s_drawRectPixel = g_renderer.drawRectPixel;
	const s_drawFilledRect = g_renderer.drawFilledRect;
	const s_drawLinePixel = g_renderer.drawLinePixel;
	const s_drawArcPixel = g_renderer.drawArcPixel;
	const s_drawBezierPixel = g_renderer.drawBezierPixel;
	const s_drawCirclePixel = g_renderer.drawCirclePixel;
	const s_drawFilledCircle = g_renderer.drawFilledCircle;

	// Utility commands
	const s_setImageDirty = g_renderer.setImageDirty;
	const s_prepareBatch = g_renderer.prepareBatch;
	const s_getInt = g_utils.getInt;

	// Constants
	const s_color = s_screenData.color;
	const s_pointsBatch = g_renderer.POINTS_BATCH;

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

		// Draw the pixel
		s_prepareBatch( s_screenData, s_pointsBatch, 1 );
		s_drawPixel( s_screenData, pX, pY, s_color, s_pointsBatch );
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

		// Draw Line
		s_drawLinePixel( s_screenData, pX1, pY1, pX2, pY2, s_color );
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
			const error = new TypeError(
				"arc: Parameters angle1 and angle2 must be numbers (in radians)."
			);
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw Arc
		s_drawArcPixel(
			s_screenData, pCx, pCy, pRadius, g_utils.degreesToRadian( angle1 ),
			g_utils.degreesToRadian( angle2 ), s_color
		);
		s_setImageDirty( s_screenData );
	};

	m_api.arc = arcFn;
	s_screenData.api.arc = arcFn;

	/**********************************************************************************************
	 * BEZIER Command
	 **********************************************************************************************/

	const bezierFn = ( x1, y1, x2, y2, x3, y3, x4, y4 ) => {
		const pX1 = s_getInt( x1, null );
		const pY1 = s_getInt( y1, null );
		const pX2 = s_getInt( x2, null );
		const pY2 = s_getInt( y2, null );
		const pX3 = s_getInt( x3, null );
		const pY3 = s_getInt( y3, null );
		const pX4 = s_getInt( x4, null );
		const pY4 = s_getInt( y4, null );

		if(
			pX1 === null || pY1 === null || pX2 === null || pY2 === null ||
			pX3 === null || pY3 === null || pX4 === null || pY4 === null
		) {
			const error = new TypeError(
				"bezier: All control point coordinates must be integers."
			);
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw Bezier
		s_drawBezierPixel( s_screenData, pX1, pY1, pX2, pY2, pX3, pY3, pX4, pY4, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.bezier = bezierFn;
	s_screenData.api.bezier = bezierFn;

	/**********************************************************************************************
	 * RECT Command
	 **********************************************************************************************/

	const rectFn = ( x, y, width, height, fillColor ) => {
		const pX = s_getInt( x, null );
		const pY = s_getInt( y, null );
		const pWidth = s_getInt( width, null );
		const pHeight = s_getInt( height, null );

		if( pX === null || pY === null || pWidth === null || pHeight === null ) {
			const error = new TypeError( "rect: Parameters x, y, width, height must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		if( pWidth < 1 || pHeight < 1 ) {
			return;
		}

		// Parse and validate fillColor here (single source of truth)
		let fillColorValue = null;
		if( fillColor != null ) {
			fillColorValue = g_colors.getColorValueByRawInput( s_screenData, fillColor );
			if( fillColorValue === null ) {
				const error = new TypeError( "rect: Parameter 'fillColor' must be a valid color." );
				error.code = "INVALID_PARAMETER";
				throw error;
			}

			// Fill in the rectangle
			const fWidth = pWidth - 2;
			const fHeight = pHeight - 2;
			if( fWidth > 0 && fHeight > 0 ) {
				s_drawFilledRect( s_screenData, pX + 1, pY, fWidth, fHeight, fillColorValue );
			}
		}

		// Draw the rect border
		s_drawRectPixel( s_screenData, pX, pY, pWidth, pHeight, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.rect = rectFn;
	s_screenData.api.rect = rectFn;

	/**********************************************************************************************
	 * Circle Command
	 **********************************************************************************************/

	const circleFn = ( x, y, radius, fillColor ) => {
		const pX = s_getInt( x, null );
		const pY = s_getInt( y, null );
		const pRadius = s_getInt( radius, null );

		if( pX === null || pY === null || pRadius === null ) {
			const error = new TypeError( "rect: Parameters x, y, and radius must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Parse and validate fillColor here (single source of truth)
		let fillColorValue = null;
		if( fillColor != null ) {
			fillColorValue = g_colors.getColorValueByRawInput( s_screenData, fillColor );
			if( fillColorValue === null ) {
				const error = new TypeError( "rect: Parameter 'fillColor' must be a valid color." );
				error.code = "INVALID_PARAMETER";
				throw error;
			}

			// Fill in the circle
			if( pRadius > 0 ) {
				s_drawFilledCircle( s_screenData, pX, pY, pRadius, fillColorValue );
			}
		}

		// Draw the circle border
		s_drawCirclePixel( s_screenData, pX, pY, pRadius, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.circle = circleFn;
	s_screenData.api.rect = circleFn;
}
