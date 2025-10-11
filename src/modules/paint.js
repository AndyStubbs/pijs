/**
 * Pi.js - Paint/Flood Fill Module
 * 
 * Implements flood fill algorithm for filling enclosed areas.
 * 
 * @module modules/paint
 */

export function init( pi ) {
	const piData = pi._.data;
	const m_maxDifference = ( 255 * 255 ) * 3.25;
	let m_setPixel;
	let m_pixels;

	// PAINT - Flood fill algorithm
	pi._.addCommand( "paint", paint, false, true, [ "x", "y", "fillColor", "tolerance" ] );

	function paint( screenData, args ) {
		let x = Math.round( args[ 0 ] );
		let y = Math.round( args[ 1 ] );
		let fillColor = args[ 2 ];
		let tolerance = args[ 3 ];

		if( !pi.util.isInteger( x ) || !pi.util.isInteger( y ) ) {
			const error = new TypeError( "paint: parameters x and y must be integers" );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Set the default tolerance to 1 (exact match)
		if( tolerance == null || tolerance === false ) {
			tolerance = 1;
		}

		if( isNaN( tolerance ) || tolerance < 0 || tolerance > 1 ) {
			const error = new RangeError(
				"paint: parameter tolerance must be a number between 0 and 1."
			);
			error.code = "INVALID_TOLERANCE";
			throw error;
		}

		// Soften the tolerance so closer to one it changes less,
		// closer to 0 changes more
		tolerance = tolerance * ( 2 - tolerance ) * m_maxDifference;

		// Brave browser quirk workaround
		if( navigator.brave && tolerance === m_maxDifference ) {
			tolerance -= 1;
		}

		// Initialize fill queue with starting point
		const fills = [ {
			"x": x,
			"y": y
		} ];

		// Change the setPixel command if adding noise
		if( screenData.pen.noise ) {
			m_setPixel = setPixelNoise;
		} else {
			m_setPixel = piData.commands.setPixel;
		}

		// Resolve fill color
		if( pi.util.isInteger( fillColor ) ) {
			if( fillColor > screenData.pal.length ) {
				const error = new RangeError(
					"paint: Argument fillColor is not a color in the palette."
				);
				error.code = "COLOR_OUT_OF_RANGE";
				throw error;
			}
			fillColor = screenData.pal[ fillColor ];
		} else {
			fillColor = pi.util.convertToColor( fillColor );
			if( fillColor === null ) {
				const error = new TypeError(
					"paint: Argument fillColor is not a valid color format."
				);
				error.code = "INVALID_COLOR";
				throw error;
			}
		}

		// Initialize pixel tracking
		m_pixels = {};

		piData.commands.getImageData( screenData );

		// Get the background color at starting point
		const backgroundColor = piData.commands.getPixelInternal( screenData, x, y );

		// Flood fill algorithm - loop until no fills left
		while( fills.length > 0 ) {
			const pixel = fills.pop();

			// Set the current pixel
			m_setPixel( screenData, pixel.x, pixel.y, fillColor );

			// Add fills to 4-way neighbors
			addFill( screenData, pixel.x + 1, pixel.y, fills, fillColor,
				backgroundColor, tolerance );
			addFill( screenData, pixel.x - 1, pixel.y, fills, fillColor,
				backgroundColor, tolerance );
			addFill( screenData, pixel.x, pixel.y + 1, fills, fillColor,
				backgroundColor, tolerance );
			addFill( screenData, pixel.x, pixel.y - 1, fills, fillColor,
				backgroundColor, tolerance );
		}

		// Clean up pixel tracking for garbage collection
		m_pixels = null;

		piData.commands.setImageDirty( screenData );
	}

	// Helper: Set pixel with noise effect
	function setPixelNoise( screenData, x, y, fillColor ) {
		fillColor = piData.commands.getPixelColor( screenData, fillColor );
		piData.commands.setPixel( screenData, x, y, fillColor );
	}

	// Helper: Check if pixel has been processed
	function checkPixel( x, y ) {
		const key = x + " " + y;
		if( m_pixels[ key ] ) {
			return true;
		}
		m_pixels[ key ] = true;
		return false;
	}

	// Helper: Add fill to queue if it should be filled
	function addFill( screenData, x, y, fills, fillColor, backgroundColor, tolerance ) {
		if( floodCheck( screenData, x, y, fillColor, backgroundColor, tolerance ) ) {
			m_setPixel( screenData, x, y, fillColor );
			const fill = { "x": x, "y": y };
			fills.push( fill );
		}
	}

	// Helper: Check if pixel should be filled
	function floodCheck( screenData, x, y, fillColor, backgroundColor, tolerance ) {
		// Check bounds
		if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
			return false;
		}

		const pixelColor = piData.commands.getPixelInternal( screenData, x, y );

		// Make sure we haven't already filled this pixel
		if( !checkPixel( x, y ) ) {

			// Calculate the difference between the two colors
			const dr = ( pixelColor.r - backgroundColor.r );
			const dg = ( pixelColor.g - backgroundColor.g );
			const db = ( pixelColor.b - backgroundColor.b );
			const da = ( pixelColor.a - backgroundColor.a );
			const difference = ( dr * dr + dg * dg + db * db + da * da * 0.25 );
			const simularity = m_maxDifference - difference;

			return simularity >= tolerance;
		}

		return false;
	}
}

