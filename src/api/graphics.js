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
import * as g_commands from "../core/commands.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_utils from "../core/utils.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_colors from "./colors.js";

let m_api = null;


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


// Initialize graphics module - only gets called on script load
export function init( api ) {
	m_api = api;

	// Build the null graphics commands - basically will throw an error since no screen is available
	buildApi( null );

	g_commands.addCommand( "rect2", rect2, true, [ "x", "y", "width", "height", "fillColor" ] );
	g_commands.addCommand( "cls", cls, true, [ "x", "y", "width", "height" ] );

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
		m_api.arc = () => g_utils.errFn( "arc" );
		m_api.bezier = () => g_utils.errFn( "bezier" );
		m_api.circle = () => g_utils.errFn( "circle" );
		m_api.ellipse = () => g_utils.errFn( "ellipse" );
		m_api.line = () => g_utils.errFn( "line" );
		m_api.pset = () => g_utils.errFn( "pset" );
		m_api.rect = () => g_utils.errFn( "rect" );
		return;
	}

	// Draw commands
	const s_drawArc = g_renderer.drawArc;
	const s_drawBezier = g_renderer.drawBezier;
	const s_drawCircle = g_renderer.drawCircle;
	const s_drawCircleFilled = g_renderer.drawCircleFilled;
	const s_drawEllipse = g_renderer.drawEllipse;
	const s_drawLine = g_renderer.drawLine;
	const s_drawPixel = g_renderer.drawPixel;
	const s_drawRect = g_renderer.drawRect;
	const s_drawRectFilled = g_renderer.drawRectFilled;

	// Utility commands
	const s_setImageDirty = g_renderer.setImageDirty;
	const s_getInt = g_utils.getInt;
	const s_degreesToRadian = g_utils.degreesToRadian;
	const s_getColorValueByRawInput = g_colors.getColorValueByRawInput;

	// Constants
	const s_color = s_screenData.color;
	const s_pointsBatch = g_renderer.POINTS_BATCH;

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
		s_drawArc(
			s_screenData, pCx, pCy, pRadius, s_degreesToRadian( angle1 ),
			s_degreesToRadian( angle2 ), s_color
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
		s_drawBezier( s_screenData, pX1, pY1, pX2, pY2, pX3, pY3, pX4, pY4, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.bezier = bezierFn;
	s_screenData.api.bezier = bezierFn;

	
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
			fillColorValue = s_getColorValueByRawInput( s_screenData, fillColor );
			if( fillColorValue === null ) {
				const error = new TypeError( "rect: Parameter 'fillColor' must be a valid color." );
				error.code = "INVALID_PARAMETER";
				throw error;
			}

			// Fill in the circle
			if( pRadius > 0 ) {
				s_drawCircleFilled( s_screenData, pX, pY, pRadius, fillColorValue );
			}
		}

		// Draw the circle border
		s_drawCircle( s_screenData, pX, pY, pRadius, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.circle = circleFn;
	s_screenData.api.circle = circleFn;

	/**********************************************************************************************
	 * Ellipse Command
	 **********************************************************************************************/

	const ellipseFn = ( x, y, rx, ry, fillColor ) => {
		const pX = s_getInt( x, null );
		const pY = s_getInt( y, null );
		const pRx = s_getInt( rx, null );
		const pRy = s_getInt( ry, null );

		if( pX === null || pY === null || pRx === null || pRy === null ) {
			const error = new TypeError( "ellipse: Parameters x, y, rx, and ry must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Parse and validate fillColor here (single source of truth)
		let fillColorValue = null;
		if( fillColor != null ) {
			fillColorValue = s_getColorValueByRawInput( s_screenData, fillColor );
			if( fillColorValue === null ) {
				const error = new TypeError(
					"ellipse: Parameter 'fillColor' must be a valid color."
				);
				error.code = "INVALID_PARAMETER";
				throw error;
			}

			// Filled handled inside drawEllipse
		}

		// Draw the ellipse border
		s_drawEllipse( s_screenData, pX, pY, pRx, pRy, s_color, fillColorValue );
		s_setImageDirty( s_screenData );
	};

	m_api.ellipse = ellipseFn;
	s_screenData.api.ellipse = ellipseFn;

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
		s_drawLine( s_screenData, pX1, pY1, pX2, pY2, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.line = lineFn;
	s_screenData.api.line = lineFn;
	
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
		s_drawPixel( s_screenData, pX, pY, s_color, s_pointsBatch );
		s_setImageDirty( s_screenData );

		// Set the cursor after drawing
		s_screenData.cursor.x = x;
		s_screenData.cursor.y = y;
	};

	m_api.pset = psetFn;
	s_screenData.api.pset = psetFn;


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
			fillColorValue = s_getColorValueByRawInput( s_screenData, fillColor );
			if( fillColorValue === null ) {
				const error = new TypeError( "rect: Parameter 'fillColor' must be a valid color." );
				error.code = "INVALID_PARAMETER";
				throw error;
			}

			// Fill in the rectangle
			const fWidth = pWidth - 2;
			const fHeight = pHeight - 2;
			if( fWidth > 0 && fHeight > 0 ) {
				s_drawRectFilled( s_screenData, pX + 1, pY + 1, fWidth, fHeight, fillColorValue );
			}
		}

		// Draw the rect border
		s_drawRect( s_screenData, pX, pY, pWidth, pHeight, s_color );
		s_setImageDirty( s_screenData );
	};

	m_api.rect = rectFn;
	s_screenData.api.rect = rectFn;

}

// The rect2 command allows object literal as the first parameter, will probably be slower than
// rect but it will be usefull if you a region defined as an object literal you can pass it to
// other functions and to rect2.
function rect2( screenData, options ) {

	// x, y, width, height, fillColor
	const x = g_utils.getInt( options.x, null );
	const y = g_utils.getInt( options.y, null );
	const width = g_utils.getInt( options.width, null );
	const height = g_utils.getInt( options.height, null );
	const fillColor = options.fillColor;

	if( x === null || y === null || width === null || height === null ) {
		const error = new TypeError( "rect: Parameters x, y, width, height must be integers." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( width < 1 || height < 1 ) {
		return;
	}

	// Parse and validate fillColor here (single source of truth)
	let fillColorValue = null;
	if( fillColor != null ) {
		fillColorValue = g_colors.getColorValueByRawInput( screenData, fillColor );
		if( fillColorValue === null ) {
			const error = new TypeError( "rect: Parameter 'fillColor' must be a valid color." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Fill in the rectangle
		const fWidth = width - 2;
		const fHeight = height - 2;
		if( fWidth > 0 && fHeight > 0 ) {
			g_renderer.drawRectFilled( screenData, x + 1, y + 1, fWidth, fHeight, fillColorValue );
		}
	}

	// Draw the rect border
	g_renderer.drawRect( screenData, x, y, width, height, screenData.color );
	g_renderer.setImageDirty( screenData );
}

/**
 * Clear the screen or a rectangular region
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options containing x, y, width, height
 * @returns {void}
 */
function cls( screenData, options ) {
	const x = g_utils.clamp( g_utils.getInt( options.x, 0 ), 0, screenData.width );
	const y = g_utils.clamp( g_utils.getInt( options.y, 0 ), 0, screenData.height );
	const width = g_utils.clamp(
		g_utils.getInt( options.width, screenData.width - x ), 0, screenData.width
	);
	const height = g_utils.clamp(
		g_utils.getInt( options.height, screenData.height - y ), 0, screenData.height
	);

	if( width <= 0 || height <= 0 ) {
		return;
	}

	g_renderer.cls( screenData, x, y, width, height );
	g_renderer.setImageDirty( screenData );
}
