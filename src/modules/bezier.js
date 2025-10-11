/**
 * Pi.js - Bezier Curves Module
 * 
 * Implements cubic Bezier curves for smooth curved paths.
 * 
 * @module modules/bezier
 */

export function init( pi ) {
	const piData = pi._.data;

	// BEZIER - Draw cubic Bezier curve
	pi._.addCommands( "bezier", pxBezier, aaBezier,
		[ "xStart", "yStart", "x1", "y1", "x2", "y2", "xEnd", "yEnd" ]
	);

	function pxBezier( screenData, args ) {
		let xStart = Math.round( args[ 0 ] );
		let yStart = Math.round( args[ 1 ] );
		let x1 = Math.round( args[ 2 ] );
		let y1 = Math.round( args[ 3 ] );
		let x2 = Math.round( args[ 4 ] );
		let y2 = Math.round( args[ 5 ] );
		let xEnd = Math.round( args[ 6 ] );
		let yEnd = Math.round( args[ 7 ] );

		// Validate parameters
		if(
			isNaN( xStart ) || isNaN( yStart ) ||
			isNaN( x1 ) || isNaN( y1 ) ||
			isNaN( x2 ) || isNaN( y2 ) ||
			isNaN( xEnd ) || isNaN( yEnd )
		) {
			const error = new TypeError(
				"bezier: parameters xStart, yStart, x1, y1, x2, y2, xEnd, and yEnd " +
				"must be numbers."
			);
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Initialize the color for the line
		const color = screenData.fColor;

		piData.commands.getImageData( screenData );

		const minDistance = screenData.pen.size;
		const points = [
			{ "x": xStart, "y": yStart },
			{ "x": x1, "y": y1 },
			{ "x": x2, "y": y2 },
			{ "x": xEnd, "y": yEnd }
		];

		let lastPoint = calcStep( 0, points );

		// Set the first pixel
		screenData.pen.draw( screenData, lastPoint.x, lastPoint.y, color );

		let t = 0.1;
		let dt = 0.1;

		while( t < 1 ) {
			const point = calcStep( t, points );
			const distance = calcDistance( point, lastPoint );

			// Adjust the step size if it's too big
			if( distance > minDistance && dt > 0.00001 ) {
				t -= dt;
				dt = dt * 0.75;
			} else {
				screenData.pen.draw( screenData, point.x, point.y, color );
				lastPoint = point;
			}
			t += dt;
		}

		// Draw the last step
		const point = calcStep( 1, points );
		screenData.pen.draw( screenData, point.x, point.y, color );

		piData.commands.setImageDirty( screenData );
	}

	function aaBezier( screenData, args ) {
		let xStart = args[ 0 ] + 0.5;
		let yStart = args[ 1 ] + 0.5;
		let x1 = args[ 2 ] + 0.5;
		let y1 = args[ 3 ] + 0.5;
		let x2 = args[ 4 ] + 0.5;
		let y2 = args[ 5 ] + 0.5;
		let xEnd = args[ 6 ] + 0.5;
		let yEnd = args[ 7 ] + 0.5;

		if(
			isNaN( xStart ) || isNaN( yStart ) || isNaN( x1 ) || isNaN( y1 ) ||
			isNaN( x2 ) || isNaN( y2 ) || isNaN( xEnd ) || isNaN( yEnd )
		) {
			const error = new TypeError(
				"bezier: parameters xStart, yStart, x1, y1, x2, y2, xEnd, and yEnd " +
				"must be numbers."
			);
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		screenData.screenObj.render();

		const ctx = screenData.context;
		ctx.strokeStyle = screenData.fColor.s;
		ctx.beginPath();
		ctx.moveTo( xStart, yStart );
		ctx.bezierCurveTo( x1, y1, x2, y2, xEnd, yEnd );
		ctx.stroke();

		piData.commands.resetImageData( screenData );
	}

	// Helper: Calculate distance squared between two points
	function calcDistance( p1, p2 ) {
		const dx = p1.x - p2.x;
		const dy = p1.y - p2.y;
		return dx * dx + dy * dy;
	}

	// Helper: Calculate point on cubic Bezier curve at parameter t (0-1)
	function calcStep( t, points ) {
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
}

