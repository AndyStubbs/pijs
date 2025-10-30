/**
 * Pi.js - Graphics Module
 * 
 * Basic Graphics Commands: pset, line, and more to come
 * 
 * @module modules/basic
 */

"use strict";

// Import modules directly
import * as g_screenManager from "../core/screen-manager.js";
import * as g_utils from "../core/utils.js";
import * as g_colors from "./colors.js";

let m_api = null;

/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize graphics module - only gets called on page load
export function init( api ) {
	m_api = api;
	buildGraphicsApi( null );
}

// Function to dynamically build the external API drawing commands (e.g., pset, line, etc...)
// for the current active screen, pen, and blend functions. This creates specialized API wrappers
// that handle input parsing/validation, then call optimized internal drawing routines. By closing
// over specific, already-optimized functions (like penFn), it provides highly performant, 
// monomorphic call sites in hot loops. Note that this gets from buildPenFn when a pen or blend
// changes or when screen the screen resizes or there is a new screen. Also gets called when on
// init but just to setup pre-screen calls with error returns.
export function buildGraphicsApi( s_screenData ) {

	if( s_screenData === null ) {
		const errFn = ( commandName ) => {
			const error = new Error(
				`${commandName}: No screens available for command. You must first create a ` +
				`screen with $.screen command.`
			);
			error.code = "NO_SCREEN";
			throw error;
		};
		m_api.pset = () => errFn( "pset" );
		m_api.line = () => errFn( "line" );
		return;
	}

	const s_penFn = s_screenData.pens.penFn;
	const s_penSize = s_screenData.pens.size;
	const s_penHalfSize = Math.round( s_penSize / 2 );
	const s_blendFn = s_screenData.blends.blendFn;
	const s_setImageDirty = s_screenData.renderer.setImageDirty;
	const s_pointBatch = s_screenData.pointBatch;
	const s_pixelsPerPen = s_screenData.pens.pixelsPerPen;
	const s_ensureBatchCapacity = s_screenData.renderer.ensureBatchCapacity;
	const s_isObjectLiteral = g_utils.isObjectLiteral;
	const s_getInt = g_utils.getInt;
	const s_color = s_screenData.color;
	const s_getColorValueByRawInput = g_colors.getColorValueByRawInput;
	
	/**********************************************************
	 * PSET
	 **********************************************************/

	// Set the preprocess method
	let preprocessPset;
	if( s_screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		preprocessPset = s_screenData.renderer.getImageData;
	} else {
		preprocessPset = () => s_ensureBatchCapacity( s_screenData, s_pointBatch, s_pixelsPerPen );
	}

	const psetFn = ( x, y ) => {
		let px, py;

		// Parse object if needed
		if( s_isObjectLiteral( x ) ) {
			px = s_getInt( x.x1, null );
			py = s_getInt( x.y1, null );
		} else {
			px = s_getInt( x, null );
			py = s_getInt( y, null );
		}

		// Make sure x and y are integers
		if( px === null || py === null ) {
			const error = new TypeError( "pset: Parameters x and y must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}
		preprocessPset( s_screenData );
		s_penFn( s_screenData, px, py, s_color );
		s_setImageDirty( s_screenData );
	};
	m_api.pset = psetFn
	s_screenData.api.pset = psetFn;

	/**********************************************************
	 * LINE
	 **********************************************************/
	
	let preprocessLine;
	if( s_screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		preprocessLine = s_screenData.renderer.getImageData;
	} else {
		
		// Note that screenData is passed in even though there is closure here, but it needs to
		// stay consistant with the canvas2d render mode so therefore it needs to be passed in as
		// a parameter
		preprocessLine = ( screenData, x1, y1, x2, y2 ) => {
			const dx = x2 - x1;
			const dy = y2 - y1;
			const lineLen = Math.round( Math.sqrt( dx * dx + dy * dy ) ) + 1;
			s_ensureBatchCapacity(
				screenData, s_pointBatch, lineLen * s_pixelsPerPen
			);
		};
	}
	
	const lineFn = ( x1, y1, x2, y2 ) => {
		let px1, py1, px2, py2;

		if( s_isObjectLiteral( x1 ) ) {
			px1 = s_getInt( x1.x1, null );
			py1 = s_getInt( x1.y1, null );
			px2 = s_getInt( x1.x2, null );
			py2 = s_getInt( x1.y2, null );
		} else {
			px1 = s_getInt( x1, null );
			py1 = s_getInt( y1, null );
			px2 = s_getInt( x2, null );
			py2 = s_getInt( y2, null );
		}

		// Make sure x and y are integers
		if( px1 === null || py1 === null || px2 === null || py2 === null ) {
			const error = new TypeError( "line: Parameters x1, y1, x2, and y2 must be integers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		preprocessLine( s_screenData, px1, py1, px2, py2 );
		line( s_screenData, px1, py1, px2, py2, s_color, s_penFn );
		s_setImageDirty( s_screenData );
	};
	m_api.line = lineFn;
	s_screenData.api.line = lineFn;

	/**********************************************************
	 * RECT (outlined)
	 **********************************************************/

	let preprocessRectOutline;
	let preprocessRectFilled;
	if( s_screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		preprocessRectOutline = s_screenData.renderer.getImageData;
		preprocessRectFilled = s_screenData.renderer.getImageData;
	} else {

		// Note that screenData is passed in even though there is closure here, but it needs to
		// stay consistant with the canvas2d render mode so therefore it needs to be passed in as
		// a parameter
		preprocessRectOutline = ( screenData, width, height ) => {
			let perimeterPixels = width * 2 + height * 2;
			s_ensureBatchCapacity( screenData, s_pointBatch, perimeterPixels * s_pixelsPerPen );
		};
		preprocessRectFilled = ( screenData, width, height ) => {
			const areaPixels = width * height;
			s_ensureBatchCapacity( screenData, s_pointBatch, areaPixels * s_pixelsPerPen );
		};
	}

	const rectFn = ( x, y, width, height, fillColor ) => {
		let px, py, pfillColor, pwidth, pheight;

		if( s_isObjectLiteral( x ) ) {
			px = s_getInt( x.x1, null );
			py = s_getInt( x.y1, null );
			pwidth = s_getInt( x.width, null );
			pheight = s_getInt( x.height, null );
			pfillColor = x.pFillColor;
		} else {
			px = s_getInt( x, null );
			py = s_getInt( y, null );
			pwidth = s_getInt( width, null );
			pheight = s_getInt( height, null );
			pfillColor = fillColor;
		}

		if( px === null || py === null || pwidth === null || pheight === null ) {
			const error = new TypeError(
				"rect: Parameters x1, y1, width, and height must be integers."
			);
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Return if nothing to draw
		if( pwidth < 1 || pheight < 1 ) {
			return;
		}

		const x2 = px + pwidth;
		const y2 = py + pheight;
		const fillColorValue = s_getColorValueByRawInput( s_screenData, pfillColor );

		if( fillColorValue !== null && width > s_penSize && height > s_penSize ) {
			preprocessRectFilled( s_screenData, pwidth, pheight );
			rectFilled(
				s_screenData,
				px + s_penHalfSize, py + s_penHalfSize,
				x2 - s_penHalfSize, y2 - s_penHalfSize,
				fillColorValue, s_blendFn
			);
		}
		preprocessRectOutline( s_screenData, pwidth, pheight );
		rectOutline( s_screenData, px, py, x2, y2, s_color, s_penFn );
		s_setImageDirty( s_screenData );
	};
	m_api.rect = rectFn;
	s_screenData.api.rect = rectFn;
}


/***************************************************************************************************
 * External API Commands - Hot Paths
 **************************************************************************************************/


function line( screenData, x1, y1, x2, y2, color, penFn ) {
	
	const dx = Math.abs( x2 - x1 );
	const dy = Math.abs( y2 - y1 );

	// Set the slopes
	let sx = x1 < x2 ? 1 : -1;
	let sy = y1 < y2 ? 1 : -1;
	
	// Set the err
	let err = dx - dy;

	// Draw the first pixel
	penFn( screenData, x1, y1, color );

	// Loop until the end of the line
	while( !( ( x1 === x2 ) && ( y1 === y2 ) ) ) {
		const e2 = err << 1;

		if( e2 > -dy ) {
			err -= dy;
			x1 += sx;
		}

		if( e2 < dx ) {
			err += dx;
			y1 += sy;
		}

		// Set the next pixel
		penFn( screenData, x1, y1, color );
	}
}

function rectOutline( screenData, x1, y1, x2, y2, color, penFn ) {

	// Single point
	if( x1 === x2 && y1 === y2 ) {
		penFn( screenData, x1, y1, color );
		return;
	}

	// Horizontal line
	if( y1 === y2 ) {
		let x = x1;
		while( x <= x2 ) {
			penFn( screenData, x, y1, color );
			x++;
		}
		return;
	}

	// Verticle line
	if( x1 === x2 ) {
		let y = y1;
		while( y <= y2 ) {
			penFn( screenData, x1, y, color );
			y++;
		}
		return;
	}

	let x;
	let y;

	x = x1;
	while( x <= x2 ) {
		penFn( screenData, x, y1, color );
		x++;
	}

	x = x1;
	while( x <= x2 ) {
		penFn( screenData, x, y2, color );
		x++;
	}

	y = y1 + 1;
	while( y < y2 ) {
		penFn( screenData, x1, y, color );
		penFn( screenData, x2, y, color );
		y++;
	}
}

function rectFilled( screenData, x1, y1, x2, y2, color, blendFn ) {
	let y = y1;
	while( y <= y2 ) {
		let x = x1;
		while( x <= x2 ) {
			blendFn( screenData, x, y, color );
			x++;
		}
		y++;
	}
}

