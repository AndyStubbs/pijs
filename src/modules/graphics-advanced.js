/**
 * Pi.js - Advanced Graphics Module
 * 
 * Advanced Graphics Commands: arc, ellipse, bezier, filterImg
 * 
 * @module modules/graphics-advanced
 */

"use strict";

import * as screenManager from "../core/screen-manager";
import * as utils from "../core/utils";
import * as renderer from "../core/renderer";
import * as colors from "../core/colors";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() { /* no-op */ }


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// arc command
screenManager.addPixelCommand( "arc", arc, [ "x", "y", "radius", "angle1", "angle2" ] );
function arc( screenData, options ) {
	const x = Math.round( options.x );
	const y = Math.round( options.y );
	let radius = Math.round( options.radius );
	let angle1 = options.angle1;
	let angle2 = options.angle2;

	// Make sure x and y are integers
	if( isNaN( x ) || isNaN( y ) || isNaN( radius ) ) {
		const error = new TypeError( "arc: Argument's x, y, radius must be integers." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	angle1 = ( angle1 + 360 ) % 360;
	angle2 = ( angle2 + 360 ) % 360;
	const winding = angle1 > angle2;

	renderer.getImageData( screenData );

	// Initialize the color for the circle
	const color = screenData.color;

	radius -= 1;
	if( radius < 0 ) {
		radius = 0;
	}
	let x2 = radius;
	let y2 = 0;

	// Helper function to check if angle is within arc range
	function set( x2, y2 ) {
		let a = utils.radiansToDegrees( Math.atan2( y2 - y, x2 - x ) );
		a = ( a + 360 ) % 360;
		if( winding ) {
			if( a >= angle1 || a <= angle2 ) {
				screenData.pen( screenData, x2, y2, color );
			}
		} else if( a >= angle1 && a <= angle2 ) {
			screenData.pen( screenData, x2, y2, color );
		}
	}

	// Only print initial points if r > 0
	if( radius > 1 ) {
		set( x2 + x, y2 + y, color );
		set( -x2 + x, y2 + y, color );
		set( x, x2 + y, color );
		set( x, -x2 + y, color );
	} else if( radius === 1 ) {
		set( x + 1, y, color );
		set( x - 1, y, color );
		set( x, y + 1, color );
		set( x, y - 1, color );
		renderer.setImageDirty( screenData );
		return;
	} else if( radius === 0 ) {
		screenData.pen( screenData, x, y, color );
		renderer.setImageDirty( screenData );
		return;
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
		set( x2 + x, y2 + y, color );
		set( -x2 + x, y2 + y, color );
		set( x2 + x, -y2 + y, color );
		set( -x2 + x, -y2 + y, color );

		// Set pixels on the perimeter points if not on x = y
		if( x2 != y2 ) {
			set( y2 + x, x2 + y, color );
			set( -y2 + x, x2 + y, color );
			set( y2 + x, -x2 + y, color );
			set( -y2 + x, -x2 + y, color );
		}
	}

	renderer.setImageDirty( screenData );
}

screenManager.addAACommand( "arc", aaArc, [ "x", "y", "radius", "angle1", "angle2" ] );
function aaArc( screenData, options ) {
	let x = options.x;
	let y = options.y;
	let radius = options.radius;
	const angle1 = options.angle1;
	const angle2 = options.angle2;

	if(
		isNaN( x ) || isNaN( y ) || isNaN( radius ) ||
		isNaN( angle1 ) || isNaN( angle2 )
	) {
		const error = new TypeError( "arc: Parameters cx, cy, r, a1, a2 must be numbers." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	x = x + 0.5;
	y = y + 0.5;
	radius = radius - 0.9;
	if( radius < 0 ) {
		radius = 0;
	}

	screenData.api.render();
	const angle1Rad = utils.degreesToRadian( angle1 );
	const angle2Rad = utils.degreesToRadian( angle2 );
	screenData.context.beginPath();
	screenData.context.strokeStyle = screenData.color.s;
	screenData.context.moveTo(
		x + Math.cos( angle1Rad ) * radius,
		y + Math.sin( angle1Rad ) * radius
	);
	screenData.context.arc( x, y, radius, angle1Rad, angle2Rad );
	screenData.context.stroke();
}


// ellipse command
screenManager.addPixelCommand( "ellipse", ellipse, [ "x", "y", "radiusX", "radiusY", "fillColor" ] );
function ellipse( screenData, options ) {
	const x = Math.round( options.x );
	const y = Math.round( options.y );
	const radiusX = Math.round( options.radiusX );
	const radiusY = Math.round( options.radiusY );
	let fillColor = options.fillColor;

	if( isNaN( x ) || isNaN( y ) || isNaN( radiusX ) || isNaN( radiusY ) ) {
		const error = new TypeError(
			"ellipse: Parameters x, y, radiusX, radiusY must be integers."
		);
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	let isFill = false;
	if( fillColor != null ) {
		fillColor = colors.getColorValue( screenData, fillColor, "ellipse" );
		isFill = true;
	}

	renderer.getImageData( screenData );

	// Initialize the color for the ellipse
	const color = screenData.color;

	if( radiusX === 0 && radiusY === 0 ) {
		screenData.pen( screenData, Math.floor( x ), Math.floor( y ), color );
		renderer.setImageDirty( screenData );
		return;
	}

	// Fill the ellipse first if needed (draw horizontal lines)
	if( isFill ) {
		const rxSquared = radiusX * radiusX;
		const rySquared = radiusY * radiusY;

		// Draw horizontal lines for each row of the ellipse
		for( let dy = -radiusY; dy <= radiusY; dy++ ) {
			const py = y + dy;

			// Skip if row is out of bounds
			if( py < 0 || py >= screenData.height ) {
				continue;
			}

			// Calculate half-width of ellipse at this y coordinate
			const dx = Math.floor( radiusX * Math.sqrt( 1 - ( dy * dy ) / rySquared ) );

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

	// Starting points
	let x2 = 0;
	let y2 = radiusY;

	// Decision parameter of region 1
	let d1 = ( radiusY * radiusY ) - ( radiusX * radiusX * radiusY ) + ( 0.25 * radiusX * radiusX );

	let dx = 2 * radiusY * radiusY * x2;
	let dy = 2 * radiusX * radiusX * y2;

	// For region 1
	while( dx < dy ) {

		// 4-way symmetry
		screenData.pen( screenData, Math.floor( x2 + x ), Math.floor( y2 + y ), color );
		screenData.pen( screenData, Math.floor( -x2 + x ), Math.floor( y2 + y ), color );
		screenData.pen( screenData, Math.floor( x2 + x ), Math.floor( -y2 + y ), color );
		screenData.pen( screenData, Math.floor( -x2 + x ), Math.floor( -y2 + y ), color );

		// Checking and updating value of decision parameter based on algorithm
		if( d1 < 0 ) {
			x2++;
			dx = dx + ( 2 * radiusY * radiusY );
			d1 = d1 + dx + ( radiusY * radiusY );
		} else {
			x2++;
			y2--;
			dx = dx + ( 2 * radiusY * radiusY );
			dy = dy - ( 2 * radiusX * radiusX );
			d1 = d1 + dx - dy + ( radiusY * radiusY );
		}
	}

	// Decision parameter of region 2
	let d2 = ( ( radiusY * radiusY ) * ( ( x2 + 0.5 ) * ( x2 + 0.5 ) ) ) +
		( ( radiusX * radiusX ) * ( ( y2 - 1 ) * ( y2 - 1 ) ) ) -
		( radiusX * radiusX * radiusY * radiusY );

	// Plotting points of region 2
	while( y2 >= 0 ) {

		// 4-way symmetry
		screenData.pen( screenData, Math.floor( x2 + x ), Math.floor( y2 + y ), color );
		screenData.pen( screenData, Math.floor( -x2 + x ), Math.floor( y2 + y ), color );
		screenData.pen( screenData, Math.floor( x2 + x ), Math.floor( -y2 + y ), color );
		screenData.pen( screenData, Math.floor( -x2 + x ), Math.floor( -y2 + y ), color );

		// Checking and updating parameter value based on algorithm
		if( d2 > 0 ) {
			y2--;
			dy = dy - ( 2 * radiusX * radiusX );
			d2 = d2 + ( radiusX * radiusX ) - dy;
		} else {
			y2--;
			x2++;
			dx = dx + ( 2 * radiusY * radiusY );
			dy = dy - ( 2 * radiusX * radiusX );
			d2 = d2 + dx - dy + ( radiusX * radiusX );
		}
	}

	renderer.setImageDirty( screenData );
}

screenManager.addAACommand( "ellipse", aaEllipse, [ "x", "y", "radiusX", "radiusY", "fillColor" ] );
function aaEllipse( screenData, options ) {
	const cx = options.x;
	const cy = options.y;
	const rx = options.radiusX;
	const ry = options.radiusY;
	let fillColor = options.fillColor;

	if( isNaN( cx ) || isNaN( cy ) || isNaN( rx ) || isNaN( ry ) ) {
		const error = new TypeError(
			"ellipse: Parameters x, y, radiusX, radiusY must be numbers."
		);
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	let isFill = false;
	if( fillColor != null ) {
		fillColor = colors.getColorValue( screenData, fillColor, "ellipse" );
		isFill = true;
	}

	if( screenData.isDirty ) {
		screenData.api.render();
	}

	screenData.context.beginPath();
	screenData.context.strokeStyle = screenData.color.s;
	screenData.context.moveTo( cx + rx, cy );
	screenData.context.ellipse( cx, cy, rx, ry, 0, utils.math.deg360, false );
	if( isFill ) {
		screenData.context.fillStyle = fillColor.s;
		screenData.context.fill();
	}
	screenData.context.stroke();
}


// filterImg command
screenManager.addCommand( "filterImg", filterImg, [ "filter" ] );
function filterImg( screenData, options ) {
	const filter = options.filter;

	if( !utils.isFunction( filter ) ) {
		const error = new TypeError( "filter: Argument filter must be a callback function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	renderer.getImageData( screenData );
	const data = screenData.imageData.data;

	// Apply filter to all colors
	for( let y = 0; y < screenData.height; y++ ) {
		for( let x = 0; x < screenData.width; x++ ) {
			const i = ( ( screenData.width * y ) + x ) * 4;
			const color = filter(
				{
					"r": data[ i ],
					"g": data[ i + 1 ],
					"b": data[ i + 2 ],
					"a": data[ i + 3 ]
				},
				x,
				y
			);
			if(
				color &&
				utils.isInteger( color.r ) &&
				utils.isInteger( color.g ) &&
				utils.isInteger( color.b ) &&
				utils.isInteger( color.a )
			) {
				data[ i ] = utils.clamp( color.r, 0, 255 );
				data[ i + 1 ] = utils.clamp( color.g, 0, 255 );
				data[ i + 2 ] = utils.clamp( color.b, 0, 255 );
				data[ i + 3 ] = utils.clamp( color.a, 0, 255 );
			}
		}
	}

	renderer.setImageDirty( screenData );
}


// bezier command
screenManager.addPixelCommand(
	"bezier",
	bezier,
	[ "xStart", "yStart", "x1", "y1", "x2", "y2", "xEnd", "yEnd" ]
);
function bezier( screenData, options ) {
	const xStart = Math.round( options.xStart );
	const yStart = Math.round( options.yStart );
	const x1 = Math.round( options.x1 );
	const y1 = Math.round( options.y1 );
	const x2 = Math.round( options.x2 );
	const y2 = Math.round( options.y2 );
	const xEnd = Math.round( options.xEnd );
	const yEnd = Math.round( options.yEnd );

	// Make sure all coordinates are numbers
	if(
		isNaN( xStart ) || isNaN( yStart ) ||
		isNaN( x1 ) || isNaN( y1 ) ||
		isNaN( x2 ) || isNaN( y2 ) ||
		isNaN( xEnd ) || isNaN( yEnd )
	) {
		const error = new TypeError(
			"bezier: Arguments xStart, yStart, x1, y1, x2, y2, xEnd, and yEnd must be numbers."
		);
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Initialize the color for the line
	const color = screenData.color;

	renderer.getImageData( screenData );
	const minDistance = screenData.penData.size;
	const points = [
		{ "x": xStart, "y": yStart },
		{ "x": x1, "y": y1 },
		{ "x": x2, "y": y2 },
		{ "x": xEnd, "y": yEnd }
	];

	let lastPoint = calcBezierStep( 0, points );

	// Set the first pixel
	screenData.pen( screenData, lastPoint.x, lastPoint.y, color );

	let t = 0.1;
	let dt = 0.1;
	while( t < 1 ) {
		const point = calcBezierStep( t, points );
		const distance = calcBezierDistance( point, lastPoint );

		// Adjust the step size if it's too big
		if( distance > minDistance && dt > 0.00001 ) {
			t -= dt;
			dt = dt * 0.75;
		} else {
			screenData.pen( screenData, point.x, point.y, color );
			lastPoint = point;
		}
		t += dt;
	}

	// Draw the last step
	const point = calcBezierStep( 1, points );
	screenData.pen( screenData, point.x, point.y, color );

	renderer.setImageDirty( screenData );
}

screenManager.addAACommand(
	"bezier",
	aaBezier,
	[ "xStart", "yStart", "x1", "y1", "x2", "y2", "xEnd", "yEnd" ]
);
function aaBezier( screenData, options ) {
	const xStart = options.xStart + 0.5;
	const yStart = options.yStart + 0.5;
	const x1 = options.x1 + 0.5;
	const y1 = options.y1 + 0.5;
	const x2 = options.x2 + 0.5;
	const y2 = options.y2 + 0.5;
	const xEnd = options.xEnd + 0.5;
	const yEnd = options.yEnd + 0.5;

	if(
		isNaN( xStart ) || isNaN( yStart ) || isNaN( x1 ) || isNaN( y1 ) ||
		isNaN( x2 ) || isNaN( y2 ) || isNaN( xEnd ) || isNaN( yEnd )
	) {
		const error = new TypeError(
			"bezier: Parameters xStart, yStart, x1, y1, x2, y2, xEnd, and yEnd must be numbers."
		);
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	screenData.api.render();

	screenData.context.strokeStyle = screenData.color.s;
	screenData.context.beginPath();
	screenData.context.moveTo( xStart, yStart );
	screenData.context.bezierCurveTo( x1, y1, x2, y2, xEnd, yEnd );
	screenData.context.stroke();
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Calculate distance between two points for bezier curve
function calcBezierDistance( p1, p2 ) {
	const dx = p1.x - p2.x;
	const dy = p1.y - p2.y;
	return dx * dx + dy * dy;
}

// Calculate a point on the bezier curve at parameter t
function calcBezierStep( t, points ) {
	const a = ( 1 - t );
	const a2 = a * a;
	const a3 = a * a * a;
	const t2 = t * t;
	const t3 = t * t * t;

	return {
		"x": Math.round(
			a3 * points[ 0 ].x +
			3 * a2 * t * points[ 1 ].x +
			3 * a * t2 * points[ 2 ].x +
			t3 * points[ 3 ].x
		),
		"y": Math.round(
			a3 * points[ 0 ].y +
			3 * a2 * t * points[ 1 ].y +
			3 * a * t2 * points[ 2 ].y +
			t3 * points[ 3 ].y
		)
	};
}

