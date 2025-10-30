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


	/**********************************************************
	 * ARC (outline only)
	 **********************************************************/

	let s_preprocessArcOutline;
	if( s_screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		s_preprocessArcOutline = s_getImageData;
	} else {

		// screenData passed in for consistency
		s_preprocessArcOutline = ( screenData, radius, spanDeg ) => {
			
			// Estimate number of pixels as portion of circumference
			const span = Math.max( 0, Math.min( 360, spanDeg ) );
			const perimeterPixels = Math.max(
				1,
				Math.round( 2 * Math.PI * radius * ( span / 360 ) )
			);
			s_prepareBatch( screenData, s_pointBatch, perimeterPixels * s_pixelsPerPen );
		};
	}

	const arcFn = ( x, y, radius, angle1, angle2 ) => {
		let pX, pY, pRadius, pAngle1, pAngle2;

		if( s_isObjectLiteral( x ) ) {
			pX = s_getInt( x.x1, null );
			pY = s_getInt( x.y1, null );
			pRadius = s_getInt( x.radius, null );
			pAngle1 = s_getInt( x.angle1, null );
			pAngle2 = s_getInt( x.angle2, null );
		} else {
			pX = s_getInt( x, null );
			pY = s_getInt( y, null );
			pRadius = s_getInt( radius, null );
			pAngle1 = s_getInt( angle1, null );
			pAngle2 = s_getInt( angle2, null );
		}

		if(
			pX === null || pY === null || pRadius === null ||
			pAngle1 === null || pAngle2 === null
		) {
			const error = new TypeError(
				"arc: Parameters x1, y1, radius, angle1, and angle2 must be integers."
			);
			error.code = "INVALID_PARAMETERS";
			throw error;
		}

		// Normalize angles to 0..360
		pAngle1 = ( pAngle1 + 360 ) % 360;
		pAngle2 = ( pAngle2 + 360 ) % 360;
		const winding = pAngle1 > pAngle2;

		// Nothing to draw
		if( pRadius < 0 ) {
			return;
		}

		// Single point
		if( pRadius === 0 ) {
			s_preprocessArcOutline( s_screenData, 1, 0 );
			s_penFn( s_screenData, pX, pY, s_color );
			s_setImageDirty( s_screenData );
			return;
		}

		// Compute angle span for batching (approximate)
		let spanDeg;
		if( winding ) {
			spanDeg = ( 360 - pAngle1 ) + pAngle2;
		} else {
			spanDeg = pAngle2 - pAngle1;
		}

		s_preprocessArcOutline( s_screenData, pRadius, spanDeg );
		m_arcOutline( s_screenData, pX, pY, pRadius, pAngle1, pAngle2, winding, s_color, s_penFn );
		s_setImageDirty( s_screenData );
	};
	s_api.arc = arcFn;
	s_screenData.api.arc = arcFn;


	/**********************************************************
	 * BEZIER (cubic, outline)
	 **********************************************************/

	let s_preprocessBezierOutline;
	if( s_screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		s_preprocessBezierOutline = s_getImageData;
	} else {

		// screenData passed in for consistency
		s_preprocessBezierOutline = ( screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y ) => {

			// Approximate curve length by control polygon length
			const d01 = Math.hypot( p1x - p0x, p1y - p0y );
			const d12 = Math.hypot( p2x - p1x, p2y - p1y );
			const d23 = Math.hypot( p3x - p2x, p3y - p2y );
			const approxLen = Math.max( 1, Math.round( d01 + d12 + d23 ) );
			s_prepareBatch( screenData, s_pointBatch, approxLen * s_pixelsPerPen );
		};
	}

	const bezierFn = ( xStart, yStart, x1, y1, x2, y2, xEnd, yEnd ) => {
		let p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y;

		if( s_isObjectLiteral( xStart ) ) {
			p0x = s_getInt( xStart.xStart, null );
			p0y = s_getInt( xStart.yStart, null );
			p1x = s_getInt( xStart.x1, null );
			p1y = s_getInt( xStart.y1, null );
			p2x = s_getInt( xStart.x2, null );
			p2y = s_getInt( xStart.y2, null );
			p3x = s_getInt( xStart.xEnd, null );
			p3y = s_getInt( xStart.yEnd, null );
		} else {
			p0x = s_getInt( xStart, null );
			p0y = s_getInt( yStart, null );
			p1x = s_getInt( x1, null );
			p1y = s_getInt( y1, null );
			p2x = s_getInt( x2, null );
			p2y = s_getInt( y2, null );
			p3x = s_getInt( xEnd, null );
			p3y = s_getInt( yEnd, null );
		}

		if(
			p0x === null || p0y === null || p1x === null || p1y === null ||
			p2x === null || p2y === null || p3x === null || p3y === null
		) {
			const error = new TypeError(
				"bezier: Parameters xStart, yStart, x1, y1, x2, y2, xEnd, and yEnd must be integers."
			);
			error.code = "INVALID_PARAMETERS";
			throw error;
		}

		s_preprocessBezierOutline(
			s_screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y
		);
		m_bezierOutline( s_screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, s_color, s_penFn );
		s_setImageDirty( s_screenData );
	};
	s_api.bezier = bezierFn;
	s_screenData.api.bezier = bezierFn;
}


/***************************************************************************************************
 * Hot Paths
 **************************************************************************************************/

/**********************************************************
 * LINE
 **********************************************************/

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

/**********************************************************
 * ARC
 **********************************************************/

function m_arcOutline(
	screenData, cx, cy, radius, angle1, angle2, winding, color, penFn
) {

	// Helper to test angle gate and set pixel
	function setPixel( px, py ) {
		let a = Math.atan2( py - cy, px - cx ) * ( 180 / Math.PI );
		a = ( a + 360 ) % 360;
		if( winding ) {
			if( a >= angle1 || a <= angle2 ) {
				penFn( screenData, px, py, color );
			}
		} else if( a >= angle1 && a <= angle2 ) {
			penFn( screenData, px, py, color );
		}
	}

	// Midpoint circle algorithm drawing only points within arc angles
	let x = radius;
	let y = 0;
	let err = 1 - x;

	// Draw initial symmetrical points
	setPixel( cx + x, cy + y );
	setPixel( cx - x, cy + y );
	setPixel( cx + y, cy + x );
	setPixel( cx + y, cy - x );

	while( x >= y ) {
		y++;
		if( err < 0 ) {
			err += 2 * y + 1;
		} else {
			x--;
			err += 2 * ( y - x ) + 1;
		}

		setPixel( cx + x, cy + y );
		setPixel( cx + y, cy + x );
		setPixel( cx - y, cy + x );
		setPixel( cx - x, cy + y );
		setPixel( cx - x, cy - y );
		setPixel( cx - y, cy - x );
		setPixel( cx + y, cy - x );
		setPixel( cx + x, cy - y );
	}
}

/**********************************************************
 * BEZIER (cubic, outline)
 **********************************************************/

function m_bezierOutline(
	screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color, penFn
) {

	function bezierPoint( t ) {
		const u = 1 - t;
		const uu = u * u;
		const uuu = uu * u;
		const tt = t * t;
		const ttt = tt * t;

		const x = Math.round(
			uuu * p0x + 3 * uu * t * p1x + 3 * u * tt * p2x + ttt * p3x
		);
		const y = Math.round(
			uuu * p0y + 3 * uu * t * p1y + 3 * u * tt * p2y + ttt * p3y
		);
		return { "x": x, "y": y };
	}

	function distance( a, b ) {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		return Math.sqrt( dx * dx + dy * dy );
	}

	let lastPoint = bezierPoint( 0 );
	penFn( screenData, lastPoint.x, lastPoint.y, color );

	let t = 0.1;
	let dt = 0.1;
	const minDistance = 1;

	while( t < 1 ) {
		const point = bezierPoint( t );
		const d = distance( point, lastPoint );

		if( d > minDistance && dt > 0.00001 ) {
			t -= dt;
			dt = dt * 0.75;
		} else {
			penFn( screenData, point.x, point.y, color );
			lastPoint = point;
		}
		t += dt;
	}

	const endPoint = bezierPoint( 1 );
	penFn( screenData, endPoint.x, endPoint.y, color );
}
