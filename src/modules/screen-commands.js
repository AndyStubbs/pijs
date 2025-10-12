/**
 * Pi.js - Screen Commands Module
 * 
 * Basic screen commands like remove, render, width/height getters, etc.
 * 
 * @module modules/screen-commands
 */

export function init( pi ) {
	const piData = pi._.data;

	// Remove the screen from the page and memory
	pi._.addCommand( "removeScreen", removeScreen, false, true, [] );

	function removeScreen( screenData ) {
		const screenId = screenData.id;

		// If removing active screen, find another
		if( screenData === piData.activeScreen ) {
			for( const i in piData.screens ) {
				if( piData.screens[ i ] !== screenData ) {
					piData.activeScreen = piData.screens[ i ];
					break;
				}
			}
		}

		// Cancel input if method exists
		if( screenData.screenObj.cancelInput ) {
			screenData.screenObj.cancelInput();
		}

		// Remove all commands from screen object
		for( const i in screenData.screenObj ) {
			delete screenData.screenObj[ i ];
		}

		// Remove the canvas from the page
		if( screenData.canvas.parentElement ) {
			screenData.canvas.parentElement.removeChild( screenData.canvas );
		}

		// Set values to null
		screenData.canvas = null;
		screenData.bufferCanvas = null;
		screenData.pal = null;
		screenData.commands = null;
		screenData.context = null;
		screenData.imageData = null;
		screenData.screenObj = null;

		// Delete the screen from screens container
		delete piData.screens[ screenId ];
	}

	// Render screen (puts buffer to main canvas)
	pi._.addCommand( "render", render, false, true, [] );

	function render( screenData ) {
		if( screenData.dirty === true ) {
			screenData.context.putImageData(
				screenData.imageData, 0, 0
			);
			screenData.dirty = false;
		}
	}

	// Get screen width
	pi._.addCommand( "width", getWidth, false, true, [] );

	function getWidth( screenData ) {
		return screenData.width;
	}

	// Get screen height
	pi._.addCommand( "height", getHeight, false, true, [] );

	function getHeight( screenData ) {
		return screenData.height;
	}

	// Get canvas element
	pi._.addCommand( "canvas", getCanvas, false, true, [] );

	function getCanvas( screenData ) {
		return screenData.canvas;
	}

	// Set background color
	pi._.addCommand( "setBgColor", setBgColor, false, true, [ "color" ] );
	pi._.addSetting( "bgColor", setBgColor, true, [ "color" ] );

	function setBgColor( screenData, args ) {
		let color = args[ 0 ];
		let bc;

		if( pi.util.isInteger( color ) ) {
			bc = screenData.pal[ color ];
		} else {
			bc = pi.util.convertToColor( color );
		}

		if( bc && typeof bc.s === "string" ) {
			screenData.canvas.style.backgroundColor = bc.s;
		} else {
			const error = new TypeError( "bgColor: invalid color value for parameter c." );
			error.code = "INVALID_COLOR";
			throw error;
		}
	}

	// Set container background color
	pi._.addCommand( "setContainerBgColor", setContainerBgColor, false, true, [ "color" ] );
	pi._.addSetting( "containerBgColor", setContainerBgColor, true, [ "color" ] );

	function setContainerBgColor( screenData, args ) {
		const color = args[ 0 ];
		let bc;

		if( screenData.container ) {
			if( pi.util.isInteger( color ) ) {
				bc = screenData.pal[ color ];
			} else {
				bc = pi.util.convertToColor( color );
			}

			if( bc && typeof bc.s === "string" ) {
				screenData.container.style.backgroundColor = bc.s;
			} else {
				const error = new TypeError(
					"containerBgColor: invalid color value for parameter c."
				);
				error.code = "INVALID_COLOR";
				throw error;
			}
		}
	}

	// FINDCOLOR - Find or add color to palette
	pi._.addCommand( "findColor", findColor, false, true,
		[ "color", "tolerance", "isAddToPalette" ]
	);

	function findColor( screenData, args ) {
		let color = args[ 0 ];
		let tolerance = args[ 1 ];
		const isAddToPalette = !!args[ 2 ];

		// Max color difference constant
		const m_maxDifference = ( 255 * 255 ) * 3.25;

		if( tolerance == null ) {
			tolerance = 1;
		} else if( isNaN( tolerance ) || tolerance < 0 || tolerance > 1 ) {
			const error = new RangeError(
				"findColor: parameter tolerance must be a number between 0 and 1"
			);
			error.code = "INVALID_TOLERANCE";
			throw error;
		}

		tolerance = tolerance * ( 2 - tolerance ) * m_maxDifference;
		const pal = screenData.pal;

		// Check cache first
		if( color && color.s && screenData.cache.findColor[ color.s ] !== undefined ) {
			return screenData.cache.findColor[ color.s ];
		}

		// Convert color to color object
		color = piData.commands.findColorValue( screenData, color, "findColor" );

		// Find exact match or closest color in palette
		for( let i = 0; i < pal.length; i++ ) {
			if( pal[ i ].s === color.s ) {
				screenData.cache.findColor[ color.s ] = i;
				return i;
			} else {
				const dr = pal[ i ].r - color.r;
				const dg = pal[ i ].g - color.g;
				const db = pal[ i ].b - color.b;
				const da = pal[ i ].a - color.a;

				const difference = ( dr * dr + dg * dg + db * db + da * da * 0.25 );
				const similarity = m_maxDifference - difference;

				if( similarity >= tolerance ) {
					screenData.cache.findColor[ color.s ] = i;
					return i;
				}
			}
		}

		// Add to palette if allowed
		if( isAddToPalette ) {
			pal.push( color );
			screenData.cache.findColor[ color.s ] = pal.length - 1;
			return pal.length - 1;
		}

		return 0;
	}

	// SET COLOR - Set drawing color for current screen
	pi._.addCommand( "setColor", setColor, false, true, [ "color", "isAddToPalette" ] );
	pi._.addSetting( "color", setColor, true, [ "color", "isAddToPalette" ] );

	function setColor( screenData, args ) {
		const colorInput = args[ 0 ];
		const isAddToPalette = !!args[ 1 ];

		const colorValue = piData.commands.findColorValue(
			screenData, colorInput, "setColor"
		);

		if( colorValue === undefined ) {
			return;
		}

		if( isAddToPalette ) {
			// Find or add color to palette
			const colorIndex = piData.commands.findColor( screenData,
				[ colorValue, 1, isAddToPalette ]
			);
			screenData.fColor = screenData.pal[ colorIndex ];
		} else {
			screenData.fColor = colorValue;
		}

		// Update canvas context styles for AA mode
		screenData.context.fillStyle = screenData.fColor.s;
		screenData.context.strokeStyle = screenData.fColor.s;
	}

	// SET PEN SIZE - Set pen size for drawing
	pi._.addCommand( "setPenSize", setPenSize, false, true, [ "size" ] );
	pi._.addSetting( "penSize", setPenSize, true, [ "size" ] );

	function setPenSize( screenData, args ) {
		let size = args[ 0 ];

		if( size === undefined ) {
			size = 1;
		}

		if( !pi.util.isInteger( size ) || size < 1 ) {
			const error = new TypeError( "setPenSize: size must be an integer >= 1." );
			error.code = "INVALID_PEN_SIZE";
			throw error;
		}

		screenData.pen.size = size;

		// Update canvas line width for AA mode
		screenData.context.lineWidth = size;
	}

	// GET - Capture screen region as 2D array of palette indices
	pi._.addCommand( "get", get, false, true,
		[ "x1", "y1", "x2", "y2", "tolerance", "isAddToPalette" ]
	);

	function get( screenData, args ) {
		let x1 = Math.round( args[ 0 ] );
		let y1 = Math.round( args[ 1 ] );
		let x2 = Math.round( args[ 2 ] );
		let y2 = Math.round( args[ 3 ] );
		const tolerance = args[ 4 ] != null ? args[ 4 ] : 1;
		const isAddToPalette = !!args[ 5 ];

		if( isNaN( x1 ) || isNaN( y1 ) || isNaN( x2 ) || isNaN( y2 ) ) {
			const error = new TypeError( "get: parameters x1, x2, y1, y2 must be integers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		if( isNaN( tolerance ) ) {
			const error = new TypeError( "get: parameter tolerance must be a number." );
			error.code = "INVALID_TOLERANCE";
			throw error;
		}

		// Clamp coordinates
		x1 = pi.util.clamp( x1, 0, screenData.width - 1 );
		x2 = pi.util.clamp( x2, 0, screenData.width - 1 );
		y1 = pi.util.clamp( y1, 0, screenData.height - 1 );
		y2 = pi.util.clamp( y2, 0, screenData.height - 1 );

		// Swap if needed
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

		// Get image data
		piData.commands.getImageData( screenData );

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

				const color = pi.util.rgbToColor( r, g, b, a );
				const colorIndex = piData.commands.findColor( screenData,
					[ color, tolerance, isAddToPalette ]
				);

				data[ row ].push( colorIndex );
			}
			row += 1;
		}

		return data;
	}
}

