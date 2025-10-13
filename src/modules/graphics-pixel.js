/**
 * Pi.js - Pixel-Mode Graphics Module
 * 
 * Pixel-perfect drawing implementations using manual pixel manipulation.
 * Implements Bresenham line, midpoint circle, and other algorithms.
 * 
 * @module modules/graphics-pixel
 */

"use strict";

export function init( pi ) {
	const piData = pi._.data;

	// CLS - Clear screen
	pi._.addCommand( "cls", cls, false, true, [ "x", "y", "width", "height" ] );

	function cls( screenData, args ) {
		const x = pi.util.getInt( Math.round( args[ 0 ] ), 0 );
		const y = pi.util.getInt( Math.round( args[ 1 ] ), 0 );
		const width = pi.util.getInt( Math.round( args[ 2 ] ), screenData.width );
		const height = pi.util.getInt( Math.round( args[ 3 ] ), screenData.height );

		if( x !== 0 || y !== 0 || width !== screenData.width || height !== screenData.height ) {
			screenData.screenObj.render();
			screenData.context.clearRect( x, y, width, height );
		} else {
			screenData.context.clearRect( x, y, width, height );
			screenData.imageData = null;
			screenData.printCursor.x = 0;
			screenData.printCursor.y = 0;
			screenData.x = 0;
			screenData.y = 0;
			screenData.dirty = false;
		}

		piData.commands.resetImageData( screenData );
	}

	// PSET - Set pixel (pixel mode and anti-aliased mode)
	pi._.addCommands( "pset", pset, aaPset, [ "x", "y" ] );

	function pset( screenData, args ) {
		let x = Math.round( args[ 0 ] );
		let y = Math.round( args[ 1 ] );

		// Make sure x and y are integers
		if( !pi.util.isInteger( x ) || !pi.util.isInteger( y ) ) {
			const error = new TypeError( "pset: Arguments x and y must be integers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Set the cursor
		screenData.x = x;
		screenData.y = y;

		// Make sure x and y are on the screen
		if( !pi.util.inRange2( x, y, 0, 0, screenData.width, screenData.height ) ) {
			return;
		}

		// Get the fore color
		const color = screenData.fColor;

		piData.commands.getImageData( screenData );
		screenData.pen.draw( screenData, x, y, color );
		piData.commands.setImageDirty( screenData );
	}

	function aaPset( screenData, args ) {
		const x = args[ 0 ];
		const y = args[ 1 ];

		if( isNaN( x ) || isNaN( y ) ) {
			const error = new TypeError( "pset: Arguments x and y must be numbers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		screenData.context.fillRect( x, y, 1, 1 );
	}

	// LINE - Draw line (Bresenham algorithm for pixel mode)
	pi._.addCommands( "line", pxLine, aaLine, [ "x1", "y1", "x2", "y2" ] );

	function pxLine( screenData, args ) {
		let x1 = Math.round( args[ 0 ] );
		let y1 = Math.round( args[ 1 ] );
		let x2 = Math.round( args[ 2 ] );
		let y2 = Math.round( args[ 3 ] );

		// Make sure coordinates are integers
		if(
			!pi.util.isInteger( x1 ) || !pi.util.isInteger( y1 ) ||
			!pi.util.isInteger( x2 ) || !pi.util.isInteger( y2 )
		) {
			const error = new TypeError(
				"line: Arguments x1, y1, x2, and y2 must be integers."
			);
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Initialize the color for the line
		const color = screenData.fColor;

		const dx = Math.abs( x2 - x1 );
		const dy = Math.abs( y2 - y1 );

		// Set the x slope
		const sx = x1 < x2 ? 1 : -1;

		// Set the y slope
		const sy = y1 < y2 ? 1 : -1;

		// Set the error
		let err = dx - dy;

		// Get the image data
		piData.commands.getImageData( screenData );

		// Set the first pixel
		screenData.pen.draw( screenData, x1, y1, color );

		// Bresenham's line algorithm
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
			screenData.pen.draw( screenData, x1, y1, color );
		}

		piData.commands.setImageDirty( screenData );
	}

	function aaLine( screenData, args ) {
		const x1 = args[ 0 ];
		const y1 = args[ 1 ];
		const x2 = args[ 2 ];
		const y2 = args[ 3 ];

		if( isNaN( x1 ) || isNaN( y1 ) || isNaN( x2 ) || isNaN( y2 ) ) {
			const error = new TypeError(
				"line: parameters x1, y1, x2, y2 must be numbers."
			);
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		screenData.screenObj.render();

		const ctx = screenData.context;
		ctx.beginPath();
		ctx.moveTo( x1, y1 );
		ctx.lineTo( x2, y2 );
		ctx.stroke();
	}

	// CIRCLE - Draw circle (Midpoint circle algorithm for pixel mode)
	pi._.addCommands( "circle", pxCircle, aaCircle, [ "x", "y", "radius", "fillColor" ] );

	function pxCircle( screenData, args ) {
		let x = Math.round( args[ 0 ] );
		let y = Math.round( args[ 1 ] );
		let radius = Math.round( args[ 2 ] );
		let fillColor = args[ 3 ];
		let isFill = false;

		if(
			!pi.util.isInteger( x ) ||
			!pi.util.isInteger( y ) ||
			!pi.util.isInteger( radius )
		) {
			const error = new TypeError( "circle: x, y, radius must be integers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Check for fill color
		if( fillColor != null ) {
			fillColor = piData.commands.findColorValue( screenData, fillColor, "circle" );
			if( fillColor === undefined ) {
				return;
			}
			isFill = true;
		}

		piData.commands.getImageData( screenData );

		// Initialize the color for the circle outline
		const color = screenData.fColor;

		// Fill the circle first if needed (draw horizontal lines)
		if( isFill ) {
			const r = radius - 1; // Use same radius as outline
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
					piData.commands.setPixelSafe( screenData, px, py, fillColor );
				}
			}
		}

		// Draw the outline after fill (outline will overwrite fill pixels on border)
		const outlineRadius = radius - 1;
		let x2 = outlineRadius;
		let y2 = 0;

		// Midpoint circle algorithm - Only print initial points if r > 0
		if( outlineRadius > 1 ) {
			screenData.pen.draw( screenData, x2 + x, y2 + y, color );
			screenData.pen.draw( screenData, -x2 + x, y2 + y, color );
			screenData.pen.draw( screenData, x, x2 + y, color );
			screenData.pen.draw( screenData, x, -x2 + y, color );
		} else if( outlineRadius === 1 ) {
			screenData.pen.draw( screenData, x + 1, y, color );
			screenData.pen.draw( screenData, x - 1, y, color );
			screenData.pen.draw( screenData, x, y + 1, color );
			screenData.pen.draw( screenData, x, y - 1, color );
			y2 = x2 + 1;
		} else if( outlineRadius === 0 ) {
			screenData.pen.draw( screenData, x, y, color );
			y2 = x2 + 1;
		}

		// Initialize decision parameter
		let midPoint = 1 - outlineRadius;

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
			screenData.pen.draw( screenData, x2 + x, y2 + y, color );
			screenData.pen.draw( screenData, -x2 + x, y2 + y, color );
			screenData.pen.draw( screenData, x2 + x, -y2 + y, color );
			screenData.pen.draw( screenData, -x2 + x, -y2 + y, color );

			// Set pixels on the perimeter points if not on x = y
			if( x2 !== y2 ) {
				screenData.pen.draw( screenData, y2 + x, x2 + y, color );
				screenData.pen.draw( screenData, -y2 + x, x2 + y, color );
				screenData.pen.draw( screenData, y2 + x, -x2 + y, color );
				screenData.pen.draw( screenData, -y2 + x, -x2 + y, color );
			}
		}

		piData.commands.setImageDirty( screenData );
	}

	function aaCircle( screenData, args ) {
		let x = args[ 0 ] + 0.5;
		let y = args[ 1 ] + 0.5;
		let r = args[ 2 ] - 0.9;
		let fillColor = args[ 3 ];

		if( isNaN( x ) || isNaN( y ) || isNaN( r ) ) {
			const error = new TypeError( "circle: parameters x, y, r must be numbers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Ensure radius is not negative
		if( r < 0 ) {
			r = 0;
		}

		// Check for fill
		let isFill = false;
		if( fillColor != null ) {
			fillColor = piData.commands.findColorValue( screenData, fillColor, "circle" );
			if( fillColor === undefined ) {
				return;
			}
			isFill = true;
		}

		screenData.screenObj.render();

		const ctx = screenData.context;
		const strokeColor = screenData.fColor.s;

		// Create single path for both fill and stroke
		ctx.beginPath();
		ctx.arc( x, y, r, 0, Math.PI * 2 );

		// Draw fill first if needed
		if( isFill ) {
			ctx.fillStyle = fillColor.s;
			ctx.fill();
		}

		// Always draw the outline stroke
		ctx.strokeStyle = strokeColor;
		ctx.stroke();
	}

	// RECT - Draw rectangle
	pi._.addCommands( "rect", pxRect, aaRect, [ "x", "y", "width", "height", "fillColor" ] );

	function pxRect( screenData, args ) {
		let x = Math.round( args[ 0 ] );
		let y = Math.round( args[ 1 ] );
		let width = Math.round( args[ 2 ] );
		let height = Math.round( args[ 3 ] );
		let fillColor = args[ 4 ];

		if(
			!pi.util.isInteger( x ) || !pi.util.isInteger( y ) ||
			!pi.util.isInteger( width ) || !pi.util.isInteger( height )
		) {
			const error = new TypeError( "rect: x, y, width, height must be integers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		const color = screenData.fColor;
		const isFill = fillColor != null;

		if( isFill ) {
			fillColor = piData.commands.findColorValue( screenData, fillColor, "rect" );
			if( fillColor === undefined ) {
				return;
			}
		}

		piData.commands.getImageData( screenData );

		// Draw outline
		for( let i = 0; i < width; i++ ) {
			screenData.pen.draw( screenData, x + i, y, color );
			screenData.pen.draw( screenData, x + i, y + height - 1, color );
		}

		for( let i = 1; i < height - 1; i++ ) {
			screenData.pen.draw( screenData, x, y + i, color );
			screenData.pen.draw( screenData, x + width - 1, y + i, color );
		}

		// Fill if needed
		if( isFill ) {
			for( let j = 1; j < height - 1; j++ ) {
				for( let i = 1; i < width - 1; i++ ) {
					piData.commands.setPixel( screenData, x + i, y + j, fillColor );
				}
			}
		}

		piData.commands.setImageDirty( screenData );
	}

	function aaRect( screenData, args ) {
		const x = args[ 0 ];
		const y = args[ 1 ];
		const width = args[ 2 ];
		const height = args[ 3 ];
		let fillColor = args[ 4 ];

		if( isNaN( x ) || isNaN( y ) || isNaN( width ) || isNaN( height ) ) {
			const error = new TypeError( "rect: parameters must be numbers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		const isFill = fillColor != null;

		if( isFill ) {
			fillColor = piData.commands.findColorValue( screenData, fillColor, "rect" );
			if( fillColor === undefined ) {
				return;
			}
		}

		screenData.screenObj.render();

		const ctx = screenData.context;

		if( isFill ) {
			ctx.fillStyle = fillColor.s;
			ctx.fillRect( x, y, width, height );
		} else {
			ctx.strokeRect( x, y, width, height );
		}
	}

	// ELLIPSE - Draw ellipse (Midpoint ellipse algorithm for pixel mode)
	pi._.addCommands( "ellipse", pxEllipse, aaEllipse,
		[ "x", "y", "radiusX", "radiusY", "fillColor" ]
	);

	function pxEllipse( screenData, args ) {
		let x = Math.round( args[ 0 ] );
		let y = Math.round( args[ 1 ] );
		let radiusX = Math.round( args[ 2 ] );
		let radiusY = Math.round( args[ 3 ] );
		let fillColor = args[ 4 ];

		if( isNaN( x ) || isNaN( y ) || isNaN( radiusX ) || isNaN( radiusY ) ) {
			const error = new TypeError(
				"ellipse: parameters x, y, radiusX, radiusY must be integers."
			);
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		let isFill = false;
		if( fillColor != null ) {
			fillColor = piData.commands.findColorValue( screenData, fillColor, "ellipse" );
			if( fillColor === undefined ) {
				return;
			}
			isFill = true;
		}

		piData.commands.getImageData( screenData );

		// Initialize the color for the outline
		const color = screenData.fColor;

		// Handle degenerate case
		if( radiusX === 0 && radiusY === 0 ) {
			screenData.pen.draw( screenData, Math.floor( x ), Math.floor( y ), color );
			piData.commands.setImageDirty( screenData );
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
				// Using ellipse equation: (x/rx)^2 + (y/ry)^2 = 1
				// Solving for x: x = rx * sqrt(1 - (y/ry)^2)
				const dx = Math.floor( radiusX * Math.sqrt( 1 - ( dy * dy ) / rySquared ) );

				// Draw horizontal line from -dx to +dx
				for( let px = x - dx; px <= x + dx; px++ ) {
					// Skip if pixel is out of bounds
					if( px < 0 || px >= screenData.width ) {
						continue;
					}

					// Set individual pixel for scanline fill (like pxCircle)
					piData.commands.setPixelSafe( screenData, px, py, fillColor );
				}
			}
		}

		// Now draw the outline using Midpoint ellipse algorithm
		// Starting points
		let x2 = 0;
		let y2 = radiusY;

		// Decision parameter of region 1
		let d1 = ( radiusY * radiusY ) - ( radiusX * radiusX * radiusY ) +
			( 0.25 * radiusX * radiusX );

		let dx = 2 * radiusY * radiusY * x2;
		let dy = 2 * radiusX * radiusX * y2;

		// For region 1
		while( dx < dy ) {
			// 4-way symmetry
			screenData.pen.draw( screenData, Math.floor( x2 + x ), Math.floor( y2 + y ), color );
			screenData.pen.draw( screenData, Math.floor( -x2 + x ), Math.floor( y2 + y ), color );
			screenData.pen.draw( screenData, Math.floor( x2 + x ), Math.floor( -y2 + y ), color );
			screenData.pen.draw( screenData, Math.floor( -x2 + x ), Math.floor( -y2 + y ), color );

			// Update decision parameter
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
			screenData.pen.draw( screenData, Math.floor( x2 + x ), Math.floor( y2 + y ), color );
			screenData.pen.draw( screenData, Math.floor( -x2 + x ), Math.floor( y2 + y ), color );
			screenData.pen.draw( screenData, Math.floor( x2 + x ), Math.floor( -y2 + y ), color );
			screenData.pen.draw( screenData, Math.floor( -x2 + x ), Math.floor( -y2 + y ), color );

			// Update parameter
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

		piData.commands.setImageDirty( screenData );
	}

	function aaEllipse( screenData, args ) {
		const cx = args[ 0 ];
		const cy = args[ 1 ];
		const rx = args[ 2 ];
		const ry = args[ 3 ];
		let fillColor = args[ 4 ];

		if( isNaN( cx ) || isNaN( cy ) || isNaN( rx ) || isNaN( ry ) ) {
			const error = new TypeError(
				"ellipse: parameters x, y, radiusX, radiusY must be numbers."
			);
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		let isFill = false;
		if( fillColor != null ) {
			fillColor = piData.commands.findColorValue( screenData, fillColor, "ellipse" );
			if( fillColor === undefined ) {
				return;
			}
			isFill = true;
		}

		screenData.screenObj.render();

		const ctx = screenData.context;

		ctx.beginPath();
		ctx.strokeStyle = screenData.fColor.s;
		ctx.moveTo( cx + rx, cy );
		ctx.ellipse( cx, cy, rx, ry, 0, pi.util.math.deg360, false );

		if( isFill ) {
			ctx.fillStyle = fillColor.s;
			ctx.fill();
		}
		ctx.stroke();

		piData.commands.resetImageData( screenData );
	}

	// ARC - Draw arc (partial circle)
	pi._.addCommands( "arc", pxArc, aaArc, [ "x", "y", "radius", "angle1", "angle2" ] );

	function pxArc( screenData, args ) {
		let x = Math.round( args[ 0 ] );
		let y = Math.round( args[ 1 ] );
		let radius = Math.round( args[ 2 ] );
		let angle1 = args[ 3 ];
		let angle2 = args[ 4 ];

		// Normalize angles to 0-360
		angle1 = ( angle1 + 360 ) % 360;
		angle2 = ( angle2 + 360 ) % 360;

		const winding = angle1 > angle2;

		if( isNaN( x ) || isNaN( y ) || isNaN( radius ) ) {
			const error = new TypeError( "arc: x, y, radius must be integers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		piData.commands.getImageData( screenData );

		const color = screenData.fColor;

		// Helper function to check if angle is within arc range
		function shouldDrawPixel( px, py ) {
			let a = pi.util.radiansToDegrees( Math.atan2( py - y, px - x ) );
			a = ( a + 360 ) % 360;

			if( winding ) {
				return a >= angle1 || a <= angle2;
			}
			return a >= angle1 && a <= angle2;
		}

		radius -= 1;
		if( radius < 0 ) {
			radius = 0;
		}

		let x2 = radius;
		let y2 = 0;

		// Handle special cases
		if( radius > 1 ) {
			if( shouldDrawPixel( x2 + x, y2 + y ) ) {
				screenData.pen.draw( screenData, x2 + x, y2 + y, color );
			}
			if( shouldDrawPixel( -x2 + x, y2 + y ) ) {
				screenData.pen.draw( screenData, -x2 + x, y2 + y, color );
			}
			if( shouldDrawPixel( x, x2 + y ) ) {
				screenData.pen.draw( screenData, x, x2 + y, color );
			}
			if( shouldDrawPixel( x, -x2 + y ) ) {
				screenData.pen.draw( screenData, x, -x2 + y, color );
			}
		} else if( radius === 1 ) {
			if( shouldDrawPixel( x + 1, y ) ) screenData.pen.draw( screenData, x + 1, y, color );
			if( shouldDrawPixel( x - 1, y ) ) screenData.pen.draw( screenData, x - 1, y, color );
			if( shouldDrawPixel( x, y + 1 ) ) screenData.pen.draw( screenData, x, y + 1, color );
			if( shouldDrawPixel( x, y - 1 ) ) screenData.pen.draw( screenData, x, y - 1, color );
			piData.commands.setImageDirty( screenData );
			return;
		} else if( radius === 0 ) {
			screenData.pen.draw( screenData, x, y, color );
			piData.commands.setImageDirty( screenData );
			return;
		}

		// Midpoint circle algorithm with angle checking
		let midPoint = 1 - radius;

		while( x2 > y2 ) {
			y2 += 1;

			if( midPoint <= 0 ) {
				midPoint = midPoint + 2 * y2 + 1;
			} else {
				x2 -= 1;
				midPoint = midPoint + 2 * y2 - 2 * x2 + 1;
			}

			// Draw pixels in arc range (8-way symmetry)
			if( shouldDrawPixel( x2 + x, y2 + y ) ) {
				screenData.pen.draw( screenData, x2 + x, y2 + y, color );
			}
			if( shouldDrawPixel( -x2 + x, y2 + y ) ) {
				screenData.pen.draw( screenData, -x2 + x, y2 + y, color );
			}
			if( shouldDrawPixel( x2 + x, -y2 + y ) ) {
				screenData.pen.draw( screenData, x2 + x, -y2 + y, color );
			}
			if( shouldDrawPixel( -x2 + x, -y2 + y ) ) {
				screenData.pen.draw( screenData, -x2 + x, -y2 + y, color );
			}

			if( x2 !== y2 ) {
				if( shouldDrawPixel( y2 + x, x2 + y ) ) {
					screenData.pen.draw( screenData, y2 + x, x2 + y, color );
				}
				if( shouldDrawPixel( -y2 + x, x2 + y ) ) {
					screenData.pen.draw( screenData, -y2 + x, x2 + y, color );
				}
				if( shouldDrawPixel( y2 + x, -x2 + y ) ) {
					screenData.pen.draw( screenData, y2 + x, -x2 + y, color );
				}
				if( shouldDrawPixel( -y2 + x, -x2 + y ) ) {
					screenData.pen.draw( screenData, -y2 + x, -x2 + y, color );
				}
			}
		}

		piData.commands.setImageDirty( screenData );
	}

	function aaArc( screenData, args ) {
		let x = args[ 0 ];
		let y = args[ 1 ];
		let radius = args[ 2 ];
		let angle1 = args[ 3 ];
		let angle2 = args[ 4 ];

		if( isNaN( x ) || isNaN( y ) || isNaN( radius ) || isNaN( angle1 ) || isNaN( angle2 ) ) {
			const error = new TypeError( "arc: parameters must be numbers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		x = x + 0.5;
		y = y + 0.5;
		radius = radius - 0.9;
		if( radius < 0 ) {
			radius = 0;
		}

		screenData.screenObj.render();

		angle1 = pi.util.degreesToRadian( angle1 );
		angle2 = pi.util.degreesToRadian( angle2 );

		const ctx = screenData.context;
		ctx.beginPath();
		ctx.strokeStyle = screenData.fColor.s;
		ctx.moveTo( x + Math.cos( angle1 ) * radius, y + Math.sin( angle1 ) * radius );
		ctx.arc( x, y, radius, angle1, angle2 );
		ctx.stroke();

		piData.commands.resetImageData( screenData );
	}
}

