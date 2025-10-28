/**
 * Pi.js - Graphics Module
 * 
 * Basic Graphics Commands: pset, line, and more to come
 * 
 * @module modules/graphics
 */

"use strict";

import * as g_screenManager from "../core/screen-manager";
import * as g_utils from "../core/utils";


let m_api = null;

/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize graphics module - only gets called on page load
export function init( api, internalApi ) {
	m_api = api;
	internalApi.buildGraphicsApi = buildGraphicsApi;
	buildGraphicsApi();
}

// Function to dynamically build the external API drawing commands (e.g., pset, line, etc...)
// for the current active screen, pen, and blend functions. This creates specialized API wrappers
// that handle input parsing/validation, then call optimized internal drawing routines. By closing
// over specific, already-optimized functions (like penFn), it provides highly performant, 
// monomorphic call sites in hot loops. Note that this gets from buildPenFn when a pen or blend
// changes or when screen the screen resizes. Also gets called when inits but just to setup errors.
function buildGraphicsApi() {
	const s_screenData = g_screenManager.activeScreenData;

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
	const s_setImageDirty = s_screenData.renderer.setImageDirty;
	const s_pointBatch = s_screenData.pointBatch;
	const s_pixelsPerPen = s_screenData.pens.pixelsPerPen;
	const s_ensureBatchCapacity = s_screenData.renderer.ensureBatchCapacity;
	const s_isObjectLiteral = g_utils.isObjectLiteral;
	const s_getInt = g_utils.getInt;
	const s_color = s_screenData.color;
	
	/**********************************************************
	 * PSET
	 **********************************************************/

	// Set the preprocess method
	let preprocessPset;
	if( s_screenData.renderer.mode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		preprocessPset = s_screenData.renderer.getImageData;
	} else {
		preprocessPset = () => s_ensureBatchCapacity( s_screenData, s_pointBatch, s_pixelsPerPen );
	}

	const psetFn = ( a1, a2 ) => {
		let x, y;

		// Parse object if needed
		if( s_isObjectLiteral( a1 ) ) {
			x = s_getInt( a1.x1, null );
			y = s_getInt( a1.y1, null );
		} else {
			x = s_getInt( a1, null );
			y = s_getInt( a2, null );
		}

		// Make sure x and y are integers
		if( x === null || y === null ) {
			const error = new TypeError( "pset: Parameters x and y must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}
		preprocessPset( s_screenData );
		s_penFn( s_screenData, x, y, s_color );
		s_setImageDirty( s_screenData );
	};
	m_api.pset = psetFn
	s_screenData.api.pset = psetFn;

	/**********************************************************
	 * LINE
	 **********************************************************/
	
	let preprocessLine;
	if( s_screenData.renderer.mode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		preprocessLine = s_screenData.renderer.getImageData;
	} else {
		preprocessLine = ( screenData, x1, y1, x2, y2 ) => {
			const dx = x2 - x1;
			const dy = y2 - y1;
			const lineLen = Math.sqrt( dx * dx + dy * dy );
			s_ensureBatchCapacity(
				screenData, s_pointBatch, lineLen * s_pixelsPerPen
			);
		};
	}
	
	const lineFn = ( a1, a2, a3, a4 ) => {
		let x1, y1, x2, y2;

		if( s_isObjectLiteral( a1 ) ) {
			x1 = s_getInt( a1.x1, null );
			y1 = s_getInt( a1.y1, null );
			x2 = s_getInt( a1.x2, null );
			y2 = s_getInt( a1.y2, null );
		} else {
			x1 = s_getInt( a1, null );
			y1 = s_getInt( a2, null );
			x2 = s_getInt( a3, null );
			y2 = s_getInt( a4, null );
		}

		// Make sure x and y are integers
		if( x1 === null || y1 === null || x2 === null || y2 === null ) {
			const error = new TypeError( "line: Parameters x1, y1, x2, and y2 must be integers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		preprocessLine( s_screenData, x1, y1, x2, y2 );
		line( s_screenData, x1, y1, x2, y2, s_color, s_penFn );
		s_setImageDirty( s_screenData );
	};
	m_api.line = lineFn;
	s_screenData.api.line = lineFn;

}


/***************************************************************************************************
 * External API Commands
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
