/**
 * Pi.js - Print/Text Module
 * 
 * Text rendering with cursor management, word wrapping, and centering.
 * 
 * @module modules/print
 */

export function init( pi ) {
	const piData = pi._.data;

	// PRINT - Print text to screen
	pi._.addCommand( "print", print, false, true, [ "msg", "inLine", "isCentered" ] );

	function print( screenData, args ) {
		let msg = args[ 0 ];
		const inLine = args[ 1 ];
		const isCentered = args[ 2 ];

		// Bail if not possible to print an entire line on a screen
		if( screenData.printCursor.font.height > screenData.height ) {
			return;
		}

		if( msg === undefined ) {
			msg = "";
		} else if( typeof msg !== "string" ) {
			msg = "" + msg;
		}

		// Add tabs
		msg = msg.replace( /\t/g, "    " );

		// Split messages by \n
		const parts = msg.split( /\n/ );
		for( let i = 0; i < parts.length; i++ ) {
			startPrint( screenData, parts[ i ], inLine, isCentered );
		}
	}

	function startPrint( screenData, msg, inLine, isCentered ) {
		const printCursor = screenData.printCursor;

		// Adjust if the text is too wide for the screen
		let width = printCursor.font.calcWidth( screenData, msg );

		if( isCentered ) {
			printCursor.x = Math.floor(
				( printCursor.cols - msg.length ) / 2
			) * screenData.printCursor.font.width;
		}

		if(
			!inLine &&
			!isCentered &&
			width + printCursor.x > screenData.width &&
			msg.length > 1
		) {
			const overlap = ( width + printCursor.x ) - screenData.width;
			const onScreen = width - overlap;
			const onScreenPct = onScreen / width;
			let msgSplit = Math.floor( msg.length * onScreenPct );
			let msg1 = msg.substring( 0, msgSplit );
			let msg2 = msg.substring( msgSplit, msg.length );

			if( printCursor.breakWord ) {
				const index = msg1.lastIndexOf( " " );
				if( index > -1 ) {
					msg2 = msg1.substring( index ).trim() + msg2;
					msg1 = msg1.substring( 0, index );
				}
			}
			startPrint( screenData, msg1, inLine, isCentered );
			startPrint( screenData, msg2, inLine, isCentered );
			return;
		}

		// Adjust if the text is too tall for the screen
		if( printCursor.y + printCursor.font.height > screenData.height ) {

			if( printCursor.font.mode === "canvas" ) {
				screenData.screenObj.render();
			}

			// Shift image up by the vertical size of the font
			shiftImageUp( screenData, printCursor.font.height );

			// Backup the print_cursor
			printCursor.y -= printCursor.font.height;
		}

		printCursor.font.printFunction( screenData, msg, printCursor.x, printCursor.y );

		// If it's not in_line print the advance to next line
		if( !inLine ) {
			printCursor.y += printCursor.font.height;
			printCursor.x = 0;
		} else {
			printCursor.x += printCursor.font.width * msg.length;
			if( printCursor.x > screenData.width - printCursor.font.width ) {
				printCursor.x = 0;
				printCursor.y += printCursor.font.height;
			}
		}
	}

	function shiftImageUp( screenData, yOffset ) {
		if( yOffset <= 0 ) {
			return;
		}

		// Get the image data
		piData.commands.getImageData( screenData );

		let y = yOffset;

		// Loop through all the pixels after the yOffset
		for( ; y < screenData.height; y++ ) {
			for( let x = 0; x < screenData.width; x++ ) {

				// Get the index of the source pixel
				const iDest = ( ( screenData.width * y ) + x ) * 4;

				// Get the index of the destination pixel
				const iSrc = ( ( screenData.width * ( y - yOffset ) ) + x ) * 4;

				// Move the pixel up
				const data = screenData.imageData.data;
				screenData.imageData.data[ iSrc ] = data[ iDest ];
				screenData.imageData.data[ iSrc + 1 ] = data[ iDest + 1 ];
				screenData.imageData.data[ iSrc + 2 ] = data[ iDest + 2 ];
				screenData.imageData.data[ iSrc + 3 ] = data[ iDest + 3 ];
			}
		}

		// Clear the bottom pixels
		for( y = screenData.height - yOffset; y < screenData.height; y++ ) {
			for( let x = 0; x < screenData.width; x++ ) {
				const iSrc = ( ( screenData.width * y ) + x ) * 4;
				screenData.imageData.data[ iSrc ] = 0;
				screenData.imageData.data[ iSrc + 1 ] = 0;
				screenData.imageData.data[ iSrc + 2 ] = 0;
				screenData.imageData.data[ iSrc + 3 ] = 0;
			}
		}

		piData.commands.setImageDirty( screenData );
	}

	// PICALCWIDTH - Calculate pixel font width
	pi._.addCommand( "piCalcWidth", piCalcWidth, true, false );

	function piCalcWidth( screenData, msg ) {
		return screenData.printCursor.font.width * msg.length;
	}

	// CANVASCALCWIDTH - Calculate canvas font width
	pi._.addCommand( "canvasCalcWidth", canvasCalcWidth, true, false );

	function canvasCalcWidth( screenData, msg ) {
		return screenData.context.measureText( msg ).width;
	}

	// SETWORDBREAK - Enable/disable word wrapping
	pi._.addCommand( "setWordBreak", setWordBreak, false, true, [ "isEnabled" ] );
	pi._.addSetting( "wordBreak", setWordBreak, true, [ "isEnabled" ] );

	function setWordBreak( screenData, args ) {
		screenData.printCursor.breakWord = !!args[ 0 ];
	}

	// PIPRINT - Print using pixel font
	pi._.addCommand( "piPrint", piPrint, true, false );

	function piPrint( screenData, msg, x, y ) {
		const printCursor = screenData.printCursor;

		// Setup a temporary palette with the fore color and back color
		const defaultPal = screenData.pal;
		screenData.pal = [ screenData.pal[ 0 ], screenData.fColor ];

		// Loop through each character in the message and put it on the screen
		for( let i = 0; i < msg.length; i++ ) {

			// Get the character index for the character data
			const charIndex = printCursor.font.chars[ msg.charCodeAt( i ) ];

			// Draw the character on the screen
			if( charIndex !== undefined && printCursor.font.data[ charIndex ] ) {
				screenData.screenObj.put(
					printCursor.font.data[ charIndex ],
					x + ( i * printCursor.font.width ),
					y,
					true
				);
			}
		}

		// Reset the palette
		screenData.pal = defaultPal;
	}

	// LOCATE - Set print cursor position
	pi._.addCommand( "locate", locate, false, true, [ "row", "col" ] );

	function locate( screenData, args ) {
		let row = args[ 0 ];
		let col = args[ 1 ];

		if( row !== undefined ) {
			if( !pi.util.isInteger( row ) || row < 0 ) {
				const error = new TypeError( "locate: row must be a non-negative integer." );
				error.code = "INVALID_ROW";
				throw error;
			}
			screenData.printCursor.y = row * screenData.printCursor.font.height;
		}

		if( col !== undefined ) {
			if( !pi.util.isInteger( col ) || col < 0 ) {
				const error = new TypeError( "locate: col must be a non-negative integer." );
				error.code = "INVALID_COL";
				throw error;
			}
			screenData.printCursor.x = col * screenData.printCursor.font.width;
		}
	}

	// POS - Get cursor position
	pi._.addCommand( "pos", pos, false, true, [] );

	function pos( screenData ) {
		return {
			"x": screenData.printCursor.x,
			"y": screenData.printCursor.y,
			"row": Math.floor( screenData.printCursor.y / screenData.printCursor.font.height ),
			"col": Math.floor( screenData.printCursor.x / screenData.printCursor.font.width )
		};
	}

	// SETPOS - Set cursor position by column and row
	pi._.addCommand( "setPos", setPos, false, true, [ "col", "row" ] );
	pi._.addSetting( "pos", setPos, true, [ "col", "row" ] );

	function setPos( screenData, args ) {
		const col = args[ 0 ];
		const row = args[ 1 ];

		// Set the x value
		if( col != null ) {
			if( isNaN( col ) ) {
				const error = new TypeError( "setPos: parameter col must be a number" );
				error.code = "INVALID_COL";
				throw error;
			}
			let x = Math.floor( col * screenData.printCursor.font.width );
			if( x > screenData.width ) {
				x = screenData.width - screenData.printCursor.font.width;
			}
			screenData.printCursor.x = x;
		}

		// Set the y value
		if( row != null ) {
			if( isNaN( row ) ) {
				const error = new TypeError( "setPos: parameter row must be a number" );
				error.code = "INVALID_ROW";
				throw error;
			}
			let y = Math.floor( row * screenData.printCursor.font.height );
			if( y > screenData.height ) {
				y = screenData.height - screenData.printCursor.font.height;
			}
			screenData.printCursor.y = y;
		}
	}

	// SETPOSPX - Set cursor position by pixels
	pi._.addCommand( "setPosPx", setPosPx, false, true, [ "x", "y" ] );
	pi._.addSetting( "posPx", setPosPx, true, [ "x", "y" ] );

	function setPosPx( screenData, args ) {
		const x = args[ 0 ];
		const y = args[ 1 ];

		if( x != null ) {
			if( isNaN( x ) ) {
				const error = new TypeError( "setPosPx: parameter x must be an integer" );
				error.code = "INVALID_X";
				throw error;
			}
			screenData.printCursor.x = Math.round( x );
		}

		if( y != null ) {
			if( isNaN( y ) ) {
				const error = new TypeError( "setPosPx: parameter y must be an integer" );
				error.code = "INVALID_Y";
				throw error;
			}
			screenData.printCursor.y = Math.round( y );
		}
	}

	// GETPOS - Get cursor position in columns and rows
	pi._.addCommand( "getPos", getPos, false, true, [] );

	function getPos( screenData ) {
		return {
			"col": Math.floor(
				screenData.printCursor.x / screenData.printCursor.font.width
			),
			"row": Math.floor(
				screenData.printCursor.y / screenData.printCursor.font.height
			)
		};
	}

	// GETCOLS - Get screen width in columns
	pi._.addCommand( "getCols", getCols, false, true, [] );

	function getCols( screenData ) {
		return screenData.printCursor.cols;
	}

	// GETROWS - Get screen height in rows
	pi._.addCommand( "getRows", getRows, false, true, [] );

	function getRows( screenData ) {
		return screenData.printCursor.rows;
	}

	// GETPOSPX - Get cursor position in pixels
	pi._.addCommand( "getPosPx", getPosPx, false, true, [] );

	function getPosPx( screenData ) {
		return {
			"x": screenData.printCursor.x,
			"y": screenData.printCursor.y
		};
	}
}

