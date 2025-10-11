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
}

