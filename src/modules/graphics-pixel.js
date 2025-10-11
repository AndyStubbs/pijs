/**
 * Pi.js - Pixel-Mode Graphics Module
 * 
 * Pixel-perfect drawing implementations using manual pixel manipulation.
 * Implements Bresenham line, midpoint circle, and other algorithms.
 * 
 * @module modules/graphics-pixel
 */

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

		// Handle filled circles with buffer swap
		let tempData;
		if( isFill ) {
			piData.commands.setImageDirty( screenData );
			tempData = screenData.imageData;

			screenData.bufferContext.clearRect( 0, 0, screenData.width, screenData.height );
			screenData.imageData = screenData.bufferContext.getImageData(
				0, 0, screenData.width, screenData.height
			);
		}

		// Initialize the color for the circle
		const color = screenData.fColor;

		radius -= 1;
		let x2 = radius;
		let y2 = 0;

		// Midpoint circle algorithm - Only print initial points if r > 0
		if( radius > 1 ) {
			screenData.pen.draw( screenData, x2 + x, y2 + y, color );
			screenData.pen.draw( screenData, -x2 + x, y2 + y, color );
			screenData.pen.draw( screenData, x, x2 + y, color );
			screenData.pen.draw( screenData, x, -x2 + y, color );
		} else if( radius === 1 ) {
			screenData.pen.draw( screenData, x + 1, y, color );
			screenData.pen.draw( screenData, x - 1, y, color );
			screenData.pen.draw( screenData, x, y + 1, color );
			screenData.pen.draw( screenData, x, y - 1, color );
			y2 = x2 + 1;
		} else if( radius === 0 ) {
			screenData.pen.draw( screenData, x, y, color );
			y2 = x2 + 1;
		}

		// Initialize decision parameter
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

		// Handle fill
		if( isFill ) {
			// Paint the center of the shape (requires paint command from Phase 6)
			if( piData.commands.paint ) {
				piData.commands.paint( screenData, [ x, y, fillColor ] );
			}

			// Copy the data back onto the main canvas
			radius += screenData.pen.size;
			for( y2 = -radius; y2 <= radius; y2 += 1 ) {
				for( x2 = -radius; x2 <= radius; x2 += 1 ) {
					const i = ( ( y2 + y ) * screenData.width + ( x2 + x ) ) * 4;
					if( screenData.imageData.data[ i + 3 ] > 0 ) {
						tempData.data[ i ] = screenData.imageData.data[ i ];
						tempData.data[ i + 1 ] = screenData.imageData.data[ i + 1 ];
						tempData.data[ i + 2 ] = screenData.imageData.data[ i + 2 ];
						tempData.data[ i + 3 ] = screenData.imageData.data[ i + 3 ];
					}
				}
			}
			screenData.imageData = tempData;
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

		if( isFill ) {
			ctx.fillStyle = fillColor.s;
			ctx.beginPath();
			ctx.arc( x, y, r, 0, Math.PI * 2 );
			ctx.fill();
		} else {
			ctx.beginPath();
			ctx.arc( x, y, r, 0, Math.PI * 2 );
			ctx.stroke();
		}
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
}

