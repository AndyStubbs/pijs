/**
 * Pi.js - Primitives Graphics Module
 * 
 * Primitive Graphics Commands: pset, line, arc, bezier.
 * 
 * @important NO INIT REQUIRED, DO NOT INCLUDE IN index.js.
 * @module graphics/primitives
 */

"use strict";

// Module Imports
import * as g_screenManager from "../core/screen-manager.js";

// List of commands
export const commandNames = [ "pset", "lines", "arc", "bezier" ];

// Build the Primitives API
export function buildApi(
	s_api, s_screenData, s_penFn, s_isObjectLiteral, s_getInt, s_getImageData, s_color,
	s_setImageDirty, s_prepareBatch, s_pointBatch, s_pixelsPerPen
) {


	/**********************************************************
	 * PSET
	 **********************************************************/


	// Set the preprocess method
	let s_preprocessPset;
	if( s_screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		s_preprocessPset = s_getImageData;
	} else {

		// screenData passed in for consistency
		s_preprocessPset = ( screenData ) => s_prepareBatch(
			screenData, s_pointBatch, s_pixelsPerPen
		);
	}

	const psetFn = ( x, y ) => {
		let pX, pY;

		// Parse object if needed
		if( s_isObjectLiteral( x ) ) {
			pX = s_getInt( x.x1, null );
			pY = s_getInt( x.y1, null );
		} else {
			pX = s_getInt( x, null );
			pY = s_getInt( y, null );
		}

		// Make sure x and y are integers
		if( pX === null || pY === null ) {
			const error = new TypeError( "pset: Parameters x and y must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}
		s_preprocessPset( s_screenData );
		s_penFn( s_screenData, pX, pY, s_color );
		s_setImageDirty( s_screenData );
	};
	s_api.pset = psetFn
	s_screenData.api.pset = psetFn;


	/**********************************************************
	 * LINE
	 **********************************************************/
	
	let s_preprocessLine;
	if( s_screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		s_preprocessLine = s_getImageData;
	} else {

		// screenData passed in for consistency
		s_preprocessLine = ( screenData, x1, y1, x2, y2 ) => {
			const dx = x2 - x1;
			const dy = y2 - y1;
			const lineLen = Math.round( Math.sqrt( dx * dx + dy * dy ) ) + 1;
			s_prepareBatch( screenData, s_pointBatch, lineLen * s_pixelsPerPen );
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

		s_preprocessLine( s_screenData, px1, py1, px2, py2 );
		m_line( s_screenData, px1, py1, px2, py2, s_color, s_penFn );
		s_setImageDirty( s_screenData );
	};
	s_api.line = lineFn;
	s_screenData.api.line = lineFn;
}


/***************************************************************************************************
 * Hot Paths
 **************************************************************************************************/


function m_line( screenData, x1, y1, x2, y2, color, penFn ) {
	
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
