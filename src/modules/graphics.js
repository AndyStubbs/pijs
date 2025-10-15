/**
 * Pi.js - Graphics Module
 * 
 * Basic Graphics Commands
 * 
 * @module modules/graphics
 */

"use strict";

import * as screenManager from "../core/screen-manager";
import * as utils from "../core/utils";
import * as renderer from "../core/renderer";
import * as colors from "../core/colors";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize graphics module
export function init() {
	screenManager.addScreenDataItem( "cursor", { "x": 0, "y": 0 } );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// pset command
screenManager.addPixelCommand( "pset", pset, [ "x", "y" ] );
function pset( screenData, options ) {
	const x = Math.round( options.x );
	const y = Math.round( options.y );

	// Make sure x and y are integers
	if( !utils.isInteger( x ) || !utils.isInteger( y ) ) {
		const error = new TypeError( "pset: Arguments x and y must be integers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	// Make sure x and y are on the screen
	if( ! utils.inRange2( x, y, 0, 0, screenData.width, screenData.height ) ) {
		return;
	}

	// Get the fore color
	const color = screenData.color;

	renderer.getImageData( screenData );
	renderer.draw( screenData, x, y, color );
	renderer.setImageDirty( screenData );

	// Set the cursor after drawing
	screenData.cursor.x = x;
	screenData.cursor.y = y;
}

screenManager.addAACommand( "pset", aaPset, [ "x", "y" ] );
function aaPset( screenData, options ) {
	const x = options.x;
	const y = options.y;

	if( isNaN( x ) || isNaN( y ) ) {
		const error = new TypeError( "pset: Arguments x and y must be numbers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	screenData.api.render();
	screenData.context.fillRect( x, y, 1, 1 );

	// Set the cursor after drawing
	screenData.cursor.x = x;
	screenData.cursor.y = y;
}


// line command
screenManager.addPixelCommand( "line", line, [ "x1", "y1", "x2", "y2" ] );
function line( screenData, options ) {
	let x1 = Math.round( options.x1 );
	let y1 = Math.round( options.y1 );
	const x2 = Math.round( options.x2 );
	const y2 = Math.round( options.y2 );

	// Make sure x and y are integers
	if(
		!utils.isInteger( x1 ) || !utils.isInteger( y1 ) ||
		!utils.isInteger( x2 ) || !utils.isInteger( y2 )
	) {
		const error = new TypeError( "line: Arguments x1, y1, x2, and y2 must be integers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	// Initialize the color for the line
	const color = screenData.color;

	const dx = Math.abs( x2 - x1 );
	const dy = Math.abs( y2 - y1 );

	// Set the x slope
	let sx;
	if( x1 < x2 ) {
		sx = 1;
	} else {
		sx = -1;
	}

	// Set the y slope
	let sy;
	if( y1 < y2 ) {
		sy = 1;
	} else {
		sy = -1;
	}

	// Set the err
	let err = dx - dy;

	// Get the image data
	renderer.getImageData( screenData );

	// Set the first pixel
	renderer.draw( screenData, x1, y1, color );

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
		renderer.draw( screenData, x1, y1, color );
	}

	renderer.setImageDirty( screenData );
}

screenManager.addAACommand( "line", aaLine, [ "x1", "y1", "x2", "y2" ] );
function aaLine( screenData, options ) {
	const x1 = options.x1;
	const y1 = options.y1;
	const x2 = options.x2;
	const y2 = options.y2;

	if( isNaN( x1 ) || isNaN( y1 ) || isNaN( x2 ) || isNaN( y2 ) ) {
		const error = new TypeError( "line: Parameters x1, y1, x2, y2 must be numbers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	screenData.api.render();
	screenData.context.strokeStyle = screenData.color.s;
	screenData.context.beginPath();
	screenData.context.moveTo( x1, y1 );
	screenData.context.lineTo( x2, y2 );
	screenData.context.stroke();
}


// rect command
screenManager.addPixelCommand( "rect", rect, [ "x", "y", "width", "height", "fillColor" ] );
function rect( screenData, options ) {
	let x = Math.round( options.x );
	let y = Math.round( options.y );
	const width = Math.round( options.width );
	const height = Math.round( options.height );
	let fillColor = options.fillColor;

	if(
		!utils.isInteger( x ) || !utils.isInteger( y ) ||
		!utils.isInteger( width ) || !utils.isInteger( height )
	) {
		const error = new TypeError( "rect: x, y, width, and height must be integers." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	let isFill = false;
	if( fillColor != null ) {
		fillColor = colors.findColorValue( screenData, fillColor, "rect" );
		if( fillColor === undefined ) {
			return;
		}
		isFill = true;
	}

	const x2 = x + width - 1;
	const y2 = y + height - 1;

	// Draw the four lines of the rectangle
	screenData.api.line( x, y, x2, y );
	screenData.api.line( x2, y, x2, y2 );
	screenData.api.line( x2, y2, x, y2 );
	screenData.api.line( x, y2, x, y );

	if(
		isFill && width > screenData.penData.size && height > screenData.penData.size &&
		width > 2 && height > 2
	) {

		const tempColor = screenData.color;
		screenData.color = fillColor;

		renderer.getImageData( screenData );

		y = y + screenData.penData.size;
		let y2Adjusted = y2 - screenData.penData.size + 1;
		x = x + screenData.penData.size;
		let x2Adjusted = x2 - screenData.penData.size + 1;

		if( x < 0 ) {
			x = 0;
		}
		if( x2Adjusted > screenData.width ) {
			x2Adjusted = screenData.width;
		}

		if( y < 0 ) {
			y = 0;
		}
		if( y2Adjusted > screenData.height ) {
			y2Adjusted = screenData.height;
		}

		// Draw line by line
		for( ; y < y2Adjusted; y += 1 ) {
			for( let x3 = x; x3 < x2Adjusted; x3 += 1 ) {
				renderer.draw( screenData, x3, y, fillColor );
			}
		}

		renderer.setImageDirty( screenData );
		screenData.color = tempColor;
	}
}

screenManager.addAACommand( "rect", aaRect, [ "x", "y", "width", "height", "fillColor" ] );
function aaRect( screenData, options ) {
	const x = options.x;
	const y = options.y;
	const width = options.width;
	const height = options.height;
	let fillColor = options.fillColor;
	let isFill = false;

	if( isNaN( x ) || isNaN( y ) || isNaN( width ) || isNaN( height ) ) {
		const error = new TypeError( "rect: Parameters x, y, width, height must be numbers." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( fillColor != null ) {
		fillColor = colors.findColorValue( screenData, fillColor, "rect" );
		if( fillColor === undefined ) {
			return;
		}
		isFill = true;
	}

	screenData.api.render();
	screenData.context.beginPath();
	screenData.context.strokeStyle = screenData.color.s;
	screenData.context.rect( x, y, width, height );
	if( isFill ) {
		screenData.context.fillStyle = fillColor.s;
		screenData.context.fill();
	}
	screenData.context.stroke();
}


// circle command
screenManager.addPixelCommand( "circle", circle, [ "x", "y", "radius", "fillColor" ] );
function circle( screenData, options ) {
	const x = Math.round( options.x );
	const y = Math.round( options.y );
	let radius = Math.round( options.radius );
	let fillColor = options.fillColor;
	let isFill = false;

	if( !utils.isInteger( x ) || !utils.isInteger( y ) || !utils.isInteger( radius ) ) {
		const error = new TypeError( "circle: x, y, radius must be integers." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( fillColor != null ) {
		fillColor = colors.findColorValue( screenData, fillColor, "circle" );
		if( fillColor === undefined ) {
			return;
		}
		isFill = true;
	}

	renderer.getImageData( screenData );

	// Initialize the color for the circle
	const color = screenData.color;

	// Fill the circle first if needed (draw horizontal lines)
	if( isFill ) {
		const r = radius - 1;
		const rSquared = r * r;

		// Draw horizontal lines for each row of the circle
		for( let dy = -r; dy <= r; dy++ ) {
			const py = y + dy;

			// Skip if row is out of bounds
			if( py < 0 || py >= screenData.height ) {
				continue;
			}

			// Calculate half-width of circle at this y coordinate
			const dx = Math.floor( Math.sqrt( rSquared - dy * dy ) );

			// Draw horizontal line from -dx to +dx
			for( let px = x - dx; px <= x + dx; px++ ) {

				// Skip if pixel is out of bounds
				if( px < 0 || px >= screenData.width ) {
					continue;
				}

				// Set individual pixel for scanline fill
				const i = ( py * screenData.width + px ) * 4;
				const data = screenData.imageData.data;
				data[ i ] = fillColor.r;
				data[ i + 1 ] = fillColor.g;
				data[ i + 2 ] = fillColor.b;
				data[ i + 3 ] = fillColor.a;
			}
		}
	}

	// Draw the outline after fill (outline will overwrite fill pixels on border)
	radius -= 1;
	let x2 = radius;
	let y2 = 0;

	// Only print initial points if r > 0
	if( radius > 1 ) {
		renderer.draw( screenData, x2 + x, y2 + y, color );
		renderer.draw( screenData, -x2 + x, y2 + y, color );
		renderer.draw( screenData, x, x2 + y, color );
		renderer.draw( screenData, x, -x2 + y, color );
	} else if( radius === 1 ) {
		renderer.draw( screenData, x + 1, y, color );
		renderer.draw( screenData, x - 1, y, color );
		renderer.draw( screenData, x, y + 1, color );
		renderer.draw( screenData, x, y - 1, color );
		y2 = x2 + 1;
	} else if( radius === 0 ) {
		renderer.draw( screenData, x, y, color );
		y2 = x2 + 1;
	}

	// Initialize p
	let midPoint = 1 - radius;
	while( x2 > y2 ) {
		y2 += 1;

		if( midPoint <= 0 ) {

			// Mid-point is inside or on the perimeter
			midPoint = midPoint + 2 * y2 + 1;
		} else {

			// Mid point is outside the perimeter
			x2 -= 1;
			midPoint = midPoint + 2 * y2 - 2 * x2 + 1;
		}

		// Set pixels around point and reflection in other octants
		renderer.draw( screenData, x2 + x, y2 + y, color );
		renderer.draw( screenData, -x2 + x, y2 + y, color );
		renderer.draw( screenData, x2 + x, -y2 + y, color );
		renderer.draw( screenData, -x2 + x, -y2 + y, color );

		// Set pixels on the perimeter points if not on x = y
		if( x2 != y2 ) {
			renderer.draw( screenData, y2 + x, x2 + y, color );
			renderer.draw( screenData, -y2 + x, x2 + y, color );
			renderer.draw( screenData, y2 + x, -x2 + y, color );
			renderer.draw( screenData, -y2 + x, -x2 + y, color );
		}
	}

	renderer.setImageDirty( screenData );
}

screenManager.addAACommand( "circle", aaCircle, [ "x", "y", "radius", "fillColor" ] );
function aaCircle( screenData, options ) {
	const x = options.x + 0.5;
	const y = options.y + 0.5;
	const r = options.radius - 0.9;
	let fillColor = options.fillColor;

	if( isNaN( x ) || isNaN( y ) || isNaN( r ) ) {
		const error = new TypeError( "circle: Parameters cx, cy, r must be numbers." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	let isFill = false;
	if( fillColor != null ) {
		fillColor = colors.findColorValue( screenData, fillColor, "circle" );
		if( fillColor === undefined ) {
			return;
		}
		isFill = true;
	}

	screenData.api.render();
	const angle1 = utils.degreesToRadian( 0 );
	const angle2 = utils.degreesToRadian( 360 );
	screenData.context.beginPath();
	screenData.context.strokeStyle = screenData.color.s;
	screenData.context.moveTo( x + Math.cos( angle1 ) * r, y + Math.sin( angle1 ) * r );
	screenData.context.arc( x, y, r, angle1, angle2 );
	if( isFill ) {
		screenData.context.fillStyle = fillColor.s;
		screenData.context.fill();
	}
	screenData.context.stroke();
}


// put command
screenManager.addCommand( "put", put, [ "data", "x", "y", "includeZero" ] );
function put( screenData, options ) {
	const data = options.data;
	const x = Math.round( options.x );
	const y = Math.round( options.y );
	const includeZero = !!options.includeZero;

	// Exit if no data
	if( !data || data.length < 1 ) {
		return;
	}

	if( isNaN( x ) || isNaN( y ) ) {
		const error = new TypeError( "put: Parameters x and y must be integers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	// Clip x if offscreen
	let startX;
	if( x < 0 ) {
		startX = x * -1;
	} else {
		startX = 0;
	}

	// Clip y if offscreen
	let startY;
	if( y < 0 ) {
		startY = y * -1;
	} else {
		startY = 0;
	}

	// Calc width & height
	let width = data[ 0 ].length - startX;
	let height = data.length - startY;

	// Clamp width & height
	if( x + startX + width >= screenData.width ) {
		width = screenData.width - x + startX;
	}
	if( y + startY + height >= screenData.height ) {
		height = screenData.height - y + startY;
	}

	// Exit if there is no data that fits the screen
	if( width <= 0 || height <= 0 ) {
		return;
	}

	renderer.getImageData( screenData );

	// Loop through the data
	for( let dataY = startY; dataY < startY + height; dataY++ ) {
		for( let dataX = startX; dataX < startX + width; dataX++ ) {

			// Get the color
			const c = screenData.pal[ data[ dataY ][ dataX ] ];

			// Calculate the index of the image data
			const i = ( ( screenData.width * ( y + dataY ) ) + ( x + dataX ) ) * 4;

			// Put the color in the image data
			if( c.a > 0 || includeZero ) {
				screenData.imageData.data[ i ] = c.r;
				screenData.imageData.data[ i + 1 ] = c.g;
				screenData.imageData.data[ i + 2 ] = c.b;
				screenData.imageData.data[ i + 3 ] = c.a;
			}
		}
	}

	renderer.setImageDirty( screenData );
}


// get command
screenManager.addCommand( "get", get, [ "x1", "y1", "x2", "y2", "tolerance", "isAddToPalette" ] );
function get( screenData, options ) {
	let x1 = Math.round( options.x1 );
	let y1 = Math.round( options.y1 );
	let x2 = Math.round( options.x2 );
	let y2 = Math.round( options.y2 );
	let tolerance = options.tolerance;
	const isAddToPalette = !!options.isAddToPalette;

	if( isNaN( x1 ) || isNaN( y1 ) || isNaN( x2 ) || isNaN( y2 ) ) {
		const error = new TypeError( "get: Parameters x1, x2, y1, y2 must be integers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	if( tolerance == null ) {
		tolerance = 1;
	} else if( isNaN( tolerance ) ) {
		const error = new TypeError( "get: Parameter tolerance must be a number." );
		error.code = "INVALID_TOLERANCE";
		throw error;
	}

	x1 = utils.clamp( x1, 0, screenData.width - 1 );
	x2 = utils.clamp( x2, 0, screenData.width - 1 );
	y1 = utils.clamp( y1, 0, screenData.height - 1 );
	y2 = utils.clamp( y2, 0, screenData.height - 1 );
	if( x1 > x2 ) {
		const t = x1;
		x1 = x2;
		x2 = t;
	}
	if( y1 > y2 ) {
		const t = y1;
		y1 = y2;
		y2 = t;
	}

	renderer.getImageData( screenData );

	const imageData = screenData.imageData;

	const data = [];
	let row = 0;
	for( let y = y1; y <= y2; y++ ) {
		data.push( [] );
		for( let x = x1; x <= x2; x++ ) {

			// Calculate the index of the image data
			const i = ( ( screenData.width * y ) + x ) * 4;
			const r = imageData.data[ i ];
			const g = imageData.data[ i + 1 ];
			const b = imageData.data[ i + 2 ];
			const a = imageData.data[ i + 3 ];
			const c = screenData.api.findColor(
				utils.rgbToColor( r, g, b, a ),
				tolerance,
				isAddToPalette
			);
			data[ row ].push( c );
		}
		row += 1;
	}

	return data;
}



/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/

