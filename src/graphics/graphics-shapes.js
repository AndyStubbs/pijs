/**
 * Pi.js - Shapes Graphics Module
 * 
 * Shapes Graphics Commands: rect, circle, ellipse.
 * 
 * @important NO INIT REQUIRED, DO NOT INCLUDE IN index.js.
 * @module graphics/shapes
 */

"use strict";

// Module Imports
import * as g_screenManager from "../core/screen-manager.js";
export const commandNames = [ "rect", "circle", "ellipse" ];

// Build the Shapes API
export function buildApi(
	s_api, s_screenData, s_penFn, s_blendFn, s_isObjectLiteral, s_getInt, s_getImageData, s_color,
	s_setImageDirty, s_prepareBatch, s_pointBatch, s_pixelsPerPen, s_screenWidth, s_screenHeight,
	s_penSize, s_penHalfSize, s_getColorValueByRawInput
) {


	/**********************************************************
	 * RECT
	 **********************************************************/


	let s_preprocessRectOutline;
	let s_preprocessRectFilled;
	if( s_screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		s_preprocessRectOutline = s_getImageData;
		s_preprocessRectFilled = s_getImageData;
	} else {

		// screenData passed in for consistency
		s_preprocessRectOutline = ( screenData, width, height ) => {
			let perimeterPixels = width * 2 + height * 2;
			s_prepareBatch( screenData, s_pointBatch, perimeterPixels * s_pixelsPerPen );
		};

		// screenData passed in for consistency
		s_preprocessRectFilled = ( screenData, width, height ) => {
			const areaPixels = width * height;
			s_prepareBatch( screenData, s_pointBatch, areaPixels * s_pixelsPerPen );
		};
	}

	const rectFn = ( x, y, width, height, fillColor ) => {
		let pX, pY, pFillColor, pWidth, pHeight;

		if( s_isObjectLiteral( x ) ) {
			pX = s_getInt( x.x1, null );
			pY = s_getInt( x.y1, null );
			pWidth = s_getInt( x.width, null );
			pHeight = s_getInt( x.height, null );
			pFillColor = x.pFillColor;
		} else {
			pX = s_getInt( x, null );
			pY = s_getInt( y, null );
			pWidth = s_getInt( width, null );
			pHeight = s_getInt( height, null );
			pFillColor = fillColor;
		}

		if( pX === null || pY === null || pWidth === null || pHeight === null ) {
			const error = new TypeError(
				"rect: Parameters x1, y1, width, and height must be integers."
			);
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Return if nothing to draw
		if( pWidth < 1 || pHeight < 1 ) {
			return;
		}

		const x2 = pX + pWidth;
		const y2 = pY + pHeight;
		const fillColorValue = s_getColorValueByRawInput( s_screenData, pFillColor );

		if( fillColorValue !== null && pWidth > s_penSize && pHeight > s_penSize ) {
			s_preprocessRectFilled( s_screenData, pWidth, pHeight );
			m_rectFilled(
				s_screenData,
				Math.max( pX + s_penHalfSize, 0 ),
				Math.max( pY + s_penHalfSize, 0 ),
				Math.min( x2 - s_penHalfSize, s_screenWidth - 1 ),
				Math.min( y2 - s_penHalfSize, s_screenHeight - 1 ),
				fillColorValue,
				s_blendFn
			);
		}
		s_preprocessRectOutline( s_screenData, pWidth, pHeight );
		m_rectOutline( s_screenData, pX, pY, x2, y2, s_color, s_penFn );
		s_setImageDirty( s_screenData );
	};
	s_api.rect = rectFn;
	s_screenData.api.rect = rectFn;


	/**********************************************************
	 * CIRCLE
	 **********************************************************/


	let s_preprocessCircleOutline;
	let s_preprocessCircleFilled;
	if( s_screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		s_preprocessCircleOutline = s_getImageData;
		s_preprocessCircleFilled = s_getImageData;
	} else {

		// Keep signature parity with canvas2d path
		s_preprocessCircleOutline = ( screenData, radius ) => {
			const perimeterPixels = Math.round( 2 * Math.PI * radius );
			s_prepareBatch(
				screenData, s_pointBatch, perimeterPixels * s_pixelsPerPen
			);
		};
		s_preprocessCircleFilled = ( screenData, radius ) => {
			const areaPixels = Math.round( Math.PI * radius * radius );
			s_prepareBatch(
				screenData, s_pointBatch, areaPixels * s_pixelsPerPen
			);
		};
	}

	const circleFn = ( x, y, radius, fillColor ) => {
		let pX, pY, pRadius, pFillColor;

		if( s_isObjectLiteral( x ) ) {
			pX = s_getInt( x.x1, null );
			pY = s_getInt( x.y1, null );
			pRadius = s_getInt( x.radius, null );
			pFillColor = x.pFillColor;
		} else {
			pX = s_getInt( x, null );
			pY = s_getInt( y, null );
			pRadius = s_getInt( radius, null );
			pFillColor = fillColor;
		}

		if( pX === null || pY === null || pRadius === null ) {
			const error = new TypeError(
				"circle: Parameters x1, y1, and radius must be integers."
			);
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Nothing to draw
		if( pRadius < 0 ) {
			return;
		}

		// Single point
		if( pRadius === 0 ) {
			preprocessPset( s_screenData );
			s_penFn( s_screenData, pX, pY, s_color );
			s_setImageDirty( s_screenData );
			return;
		}

		const fillColorValue = s_getColorValueByRawInput( s_screenData, pFillColor );

		if( fillColorValue !== null && pRadius > s_penSize ) {
			s_preprocessCircleFilled( s_screenData, pRadius );
			m_circleFilled(
				s_screenData, pX, pY, pRadius, fillColorValue,
				s_blendFn, s_screenWidth - 1, s_screenHeight - 1
			);
		}

		s_preprocessCircleOutline( s_screenData, pRadius );
		m_circleOutline( s_screenData, pX, pY, pRadius, s_color, s_penFn );
		s_setImageDirty( s_screenData );
	};
	s_api.circle = circleFn;
	s_screenData.api.circle = circleFn;


	/**********************************************************
	 * ELLIPSE
	 **********************************************************/


	let s_preprocessEllipseOutline;
	let s_preprocessEllipseFilled;
	if( s_screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		s_preprocessEllipseOutline = s_getImageData;
		s_preprocessEllipseFilled = s_getImageData;
	} else {

		// Keep signature parity with canvas2d path
		s_preprocessEllipseOutline = ( screenData, rx, ry ) => {

			// Ramanujan perimeter approximation P ≈ 2π * sqrt( (rx^2 + ry^2) / 2 )
			const perimeterPixels = Math.round(
				2 * Math.PI * Math.sqrt( ( rx * rx + ry * ry ) / 2 )
			);
			s_prepareBatch( screenData, s_pointBatch, perimeterPixels * s_pixelsPerPen );
		};
		s_preprocessEllipseFilled = ( screenData, rx, ry ) => {
			const areaPixels = Math.round( Math.PI * rx * ry );
			s_prepareBatch( screenData, s_pointBatch, areaPixels * s_pixelsPerPen );
		};
	}

	const ellipseFn = ( x, y, rx, ry, fillColor ) => {
		let pX, pY, pRx, pRy, pFillColor;

		if( s_isObjectLiteral( x ) ) {
			pX = s_getInt( x.x1, null );
			pY = s_getInt( x.y1, null );
			pRx = s_getInt( x.rx, null );
			pRy = s_getInt( x.ry, null );
			pFillColor = x.pFillColor;
		} else {
			pX = s_getInt( x, null );
			pY = s_getInt( y, null );
			pRx = s_getInt( rx, null );
			pRy = s_getInt( ry, null );
			pFillColor = fillColor;
		}

		if( pX === null || pY === null || pRx === null || pRy === null ) {
			const error = new TypeError(
				"ellipse: Parameters x1, y1, rx, and ry must be integers."
			);
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Nothing to draw
		if( pRx < 0 || pRy < 0 ) {
			return;
		}

		// Single point
		if( pRx === 0 && pRy === 0 ) {
			s_preprocessEllipseOutline( s_screenData, 1, 1 );
			s_penFn( s_screenData, pX, pY, s_color );
			s_setImageDirty( s_screenData );
			return;
		}

		// Degenerate into line when one radius is 0
		if( pRx === 0 ) {
			s_preprocessEllipseOutline( s_screenData, 1, pRy );
			let y1 = pY - pRy;
			const y2 = pY + pRy;
			while( y1 <= y2 ) {
				s_penFn( s_screenData, pX, y1, s_color );
				y1++;
			}
			s_setImageDirty( s_screenData );
			return;
		}

		if( pRy === 0 ) {
			s_preprocessEllipseOutline( s_screenData, pRx, 1 );
			let x1 = pX - pRx;
			const x2 = pX + pRx;
			while( x1 <= x2 ) {
				s_penFn( s_screenData, x1, pY, s_color );
				x1++;
			}
			s_setImageDirty( s_screenData );
			return;
		}

		const fillColorValue = s_getColorValueByRawInput( s_screenData, pFillColor );

		if( fillColorValue !== null && pRx > s_penSize && pRy > s_penSize ) {
			s_preprocessEllipseFilled( s_screenData, pRx, pRy );
			m_ellipseFilled(
				s_screenData, pX, pY, pRx, pRy, fillColorValue, s_blendFn,
				s_screenWidth - 1, s_screenHeight - 1
			);
		}

		s_preprocessEllipseOutline( s_screenData, pRx, pRy );
		m_ellipseOutline( s_screenData, pX, pY, pRx, pRy, s_color, s_penFn );
		s_setImageDirty( s_screenData );
	};
	s_api.ellipse = ellipseFn;
	s_screenData.api.ellipse = ellipseFn;

}


/***************************************************************************************************
 * Hot Paths
 **************************************************************************************************/


/**********************************************************
 * RECT
 **********************************************************/


function m_rectOutline( screenData, x1, y1, x2, y2, color, penFn ) {

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

function m_rectFilled( screenData, x1, y1, x2, y2, color, blendFn ) {
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


/**********************************************************
 * CIRCLE
 **********************************************************/


function m_circleOutline( screenData, cx, cy, radius, color, penFn ) {

	// Midpoint circle algorithm (8-way symmetry)
	let x = radius;
	let y = 0;
	let err = 1 - x;

	while( x >= y ) {
		penFn( screenData, cx + x, cy + y, color );
		penFn( screenData, cx + y, cy + x, color );
		penFn( screenData, cx - y, cy + x, color );
		penFn( screenData, cx - x, cy + y, color );
		penFn( screenData, cx - x, cy - y, color );
		penFn( screenData, cx - y, cy - x, color );
		penFn( screenData, cx + y, cy - x, color );
		penFn( screenData, cx + x, cy - y, color );

		y++;
		if( err < 0 ) {
			err += 2 * y + 1;
		} else {
			x--;
			err += 2 * ( y - x ) + 1;
		}
	}
}

function m_circleFilled( screenData, cx, cy, radius, color, blendFn, maxX, maxY ) {
	for( let dy = -radius; dy <= radius; dy++ ) {
		const y = cy + dy;
		if( y < 0 || y > maxY ) {
			continue;
		}
		const dxMax = Math.floor( Math.sqrt( radius * radius - dy * dy ) );
		let x = Math.max( cx - dxMax, 0 );
		const xEnd = Math.min( cx + dxMax, maxX );
		while( x <= xEnd ) {
			blendFn( screenData, x, y, color );
			x++;
		}
	}
}


/**
 * ELLIPSE
 */


function m_ellipseOutline( screenData, cx, cy, rx, ry, color, penFn ) {

	// Midpoint ellipse algorithm
	let x = 0;
	let y = ry;

	const rx2 = rx * rx;
	const ry2 = ry * ry;
	let dx = 2 * ry2 * x;
	let dy = 2 * rx2 * y;

	// Region 1
	let p1 = ry2 - rx2 * ry + 0.25 * rx2;
	while( dx < dy ) {

		// 4-way symmetry
		penFn( screenData, cx + x, cy + y, color );
		penFn( screenData, cx - x, cy + y, color );
		penFn( screenData, cx - x, cy - y, color );
		penFn( screenData, cx + x, cy - y, color );

		x++;
		dx += 2 * ry2;
		if( p1 < 0 ) {
			p1 += ry2 + dx;
		} else {
			y--;
			dy -= 2 * rx2;
			p1 += ry2 + dx - dy;
		}
	}

	// Region 2
	let p2 = ry2 * ( x + 0.5 ) * ( x + 0.5 ) + rx2 * ( y - 1 ) * ( y - 1 ) - rx2 * ry2;
	while( y >= 0 ) {

		// 4-way symmetry
		penFn( screenData, cx + x, cy + y, color );
		penFn( screenData, cx - x, cy + y, color );
		penFn( screenData, cx - x, cy - y, color );
		penFn( screenData, cx + x, cy - y, color );

		y--;
		dy -= 2 * rx2;
		if( p2 > 0 ) {
			p2 += rx2 - dy;
		} else {
			x++;
			dx += 2 * ry2;
			p2 += rx2 - dy + dx;
		}
	}
}

function m_ellipseFilled( screenData, cx, cy, rx, ry, color, blendFn, maxX, maxY ) {
	for( let dy = -ry; dy <= ry; dy++ ) {
		const y = cy + dy;
		if( y < 0 || y > maxY ) {
			continue;
		}
		
		// Compute x extent for this scanline
		const t = 1 - ( dy * dy ) / ( ry * ry );
		const dxMax = t <= 0 ? 0 : Math.floor( rx * Math.sqrt( t ) );
		let x = Math.max( cx - dxMax, 0 );
		const xEnd = Math.min( cx + dxMax, maxX );
		while( x <= xEnd ) {
			blendFn( screenData, x, y, color );
			x++;
		}
	}
}
