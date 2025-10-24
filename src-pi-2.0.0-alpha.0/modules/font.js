/**
 * Pi.js - Font Module
 * 
 * Font loading and management, including base32-encoded pixel fonts.
 * 
 * @module modules/font
 */

"use strict";

export function init( pi ) {
	const piData = pi._.data;
	const m_piWait = pi._.wait;
	const m_piResume = pi._.resume;

	// LOADFONT - Load font from image or encoded data
	pi._.addCommand( "loadFont", loadFont, false, false,
		[ "fontSrc", "width", "height", "charSet", "isEncoded" ]
	);

	function loadFont( args ) {
		const fontSrc = args[ 0 ];
		const width = Math.round( args[ 1 ] );
		const height = Math.round( args[ 2 ] );
		let charSet = args[ 3 ];
		const isEncoded = !!args[ 4 ];

		if( isNaN( width ) || isNaN( height ) ) {
			const error = new TypeError( "loadFont: width and height must be integers." );
			error.code = "INVALID_FONT_SIZE";
			throw error;
		}

		// Default charset to 0 to 255
		if( !charSet ) {
			charSet = [];
			for( let i = 0; i < 256; i += 1 ) {
				charSet.push( i );
			}
		}

		if( !( pi.util.isArray( charSet ) || typeof charSet === "string" ) ) {
			const error = new TypeError( "loadFont: charSet must be an array or a string." );
			error.code = "INVALID_CHARSET";
			throw error;
		}

		// Convert charSet to array of integers
		if( typeof charSet === "string" ) {
			const temp = [];
			for( let i = 0; i < charSet.length; i += 1 ) {
				temp.push( charSet.charCodeAt( i ) );
			}
			charSet = temp;
		}

		// Load the chars
		const chars = {};
		for( let i = 0; i < charSet.length; i += 1 ) {
			chars[ charSet[ i ] ] = i;
		}

		// Set the font data
		const font = {
			"id": piData.nextFontId,
			"width": width,
			"height": height,
			"data": [],
			"chars": chars,
			"charSet": charSet,
			"colorCount": 2,
			"mode": "pixel",
			"printFunction": piData.commands.piPrint,
			"calcWidth": piData.commands.piCalcWidth,
			"image": null,
			"sWidth": width,
			"sHeight": height
		};

		if( !isEncoded ) {
			font.mode = "bitmap";
			font.printFunction = piData.commands.bitmapPrint;
		}

		// Add this to the font data
		piData.fonts[ font.id ] = font;

		// Increment the next font id
		piData.nextFontId += 1;

		if( isEncoded ) {
			loadFontFromBase32Encoded( fontSrc, width, height, font );
		} else {
			loadFontFromImg( fontSrc, font );
		}

		return font.id;
	}

	function loadFontFromBase32Encoded( fontSrc, width, height, font ) {
		font.data = decompressFont( fontSrc, width, height );
	}

	function decompressFont( numStr, width, height ) {
		const size = 32;
		const base = 32;
		let bin = "";
		const data = [];

		numStr = "" + numStr;
		const nums = numStr.split( "," );

		// Loop through all the nums
		for( let i = 0; i < nums.length; i++ ) {

			// Convert the string to base number then to binary string
			let num = parseInt( nums[ i ], base ).toString( 2 );

			// Pad the front with 0's so that num has length of size
			for( let j = num.length; j < size; j++ ) {
				num = "0" + num;
			}

			// Add to the bin
			bin += num;
		}

		// Loop through all the bits
		let i = 0;
		if( bin.length % size > 0 ) {
			console.warn( "loadFont: Invalid font data." );
			return data;
		}

		while( i < bin.length ) {

			// Push a new character onto data
			data.push( [] );

			// Store the index of the font character
			const index = data.length - 1;

			// Loop through all the rows
			for( let y = 0; y < height; y += 1 ) {

				// Push a new row onto the character data
				data[ index ].push( [] );

				// Loop through a row
				for( let x = 0; x < width; x += 1 ) {

					let num;
					if( i >= bin.length ) {
						num = 0;
					} else {
						num = parseInt( bin[ i ] );
						if( isNaN( num ) ) {
							num = 0;
						}
					}

					// Push the bit onto the character
					data[ index ][ y ].push( num );

					// Increment the bit
					i += 1;
				}
			}
		}

		return data;
	}

	function loadFontFromImg( fontSrc, font ) {
		let img;

		if( typeof fontSrc === "string" ) {
			// Create a new image
			img = new Image();

			// Set the source
			img.src = fontSrc;
		} else if( fontSrc instanceof HTMLImageElement ) {
			img = fontSrc;
		} else {
			const error = new TypeError(
				"loadFont: fontSrc must be a string, image or canvas."
			);
			error.code = "INVALID_FONT_SOURCE";
			throw error;
		}

		if( !img.complete ) {
			// Signal pijs to wait
			m_piWait();

			// Need to wait until the image is loaded
			img.onload = function() {
				font.image = img;
				m_piResume();
			};
			img.onerror = function( err ) {
				console.warn( "loadFont: unable to load image for font." );
				m_piResume();
			};
		} else {
			font.image = img;
		}
	}

	// SETDEFAULTFONT - Set default font for new screens
	pi._.addCommand( "setDefaultFont", setDefaultFont, false, false, [ "fontId" ] );
	pi._.addSetting( "defaultFont", setDefaultFont, false, [ "fontId" ] );

	function setDefaultFont( args ) {
		const fontId = parseInt( args[ 0 ] );

		if( isNaN( fontId ) || fontId < 0 || !piData.fonts[ fontId ] ) {
			const error = new Error( "setDefaultFont: invalid fontId" );
			error.code = "INVALID_FONT_ID";
			throw error;
		}

		piData.defaultFont = piData.fonts[ fontId ];
	}

	// SETFONT - Set font for current screen
	pi._.addCommand( "setFont", setFont, false, true, [ "fontId" ] );
	pi._.addSetting( "font", setFont, true, [ "fontId" ] );

	function setFont( screenData, args ) {
		const fontId = args[ 0 ];

		// Check if this is a valid font
		if( piData.fonts[ fontId ] ) {

			// Set the font data for the current print cursor
			const font = piData.fonts[ fontId ];
			screenData.printCursor.font = font;

			// Set the rows and cols
			screenData.printCursor.cols = Math.floor( screenData.width / font.width );
			screenData.printCursor.rows = Math.floor( screenData.height / font.height );
		} else if( typeof fontId === "string" ) {

			// Set the context font
			screenData.context.font = fontId;
			screenData.context.textBaseline = "top";

			// Set the font dimensions
			const size = calcFontSize( screenData.context );

			// Set the font data
			screenData.printCursor.font = {
				"name": screenData.context.font,
				"width": size.width,
				"height": size.height,
				"mode": "canvas",
				"printFunction": piData.commands.canvasPrint,
				"calcWidth": piData.commands.canvasCalcWidth
			};

			// Set the rows and cols
			screenData.printCursor.cols = Math.floor( screenData.width / size.width );
			screenData.printCursor.rows = Math.floor( screenData.height / size.height );
		}
	}

	function calcFontSize( context ) {
		let px = context.measureText( "M" ).width;

		// Add some padding to px just in case
		px = Math.round( px * 1.5 );

		// Create a temporary canvas the size of the font px
		const tCanvas = document.createElement( "canvas" );
		tCanvas.width = px;
		tCanvas.height = px;

		// Create a temporary canvas
		const tContext = tCanvas.getContext( "2d", { "willReadFrequently": true } );
		tContext.font = context.font;
		tContext.textBaseline = "top";
		tContext.fillStyle = "#FF0000";

		// Set a blank size object
		const size = {
			"height": 0,
			"width": 0
		};

		// Fill the M character to get the font size
		tContext.fillText( "M", 0, 0 );

		// Get the pixel data
		const data = tContext.getImageData( 0, 0, px, px ).data;

		// Loop through all the pixels to find the width and height
		for( let y = 0; y < px; y++ ) {
			for( let x = 0; x < px; x++ ) {
				const i = ( y * px + x ) * 4;

				if( data[ i + 3 ] > 0 ) {
					if( x > size.width ) {
						size.width = x;
					}
					if( y > size.height ) {
						size.height = y;
					}
				}
			}
		}

		size.width += 1;
		size.height += 1;

		return size;
	}

	// CANVASPRINT - Print using canvas font
	pi._.addCommand( "canvasPrint", canvasPrint, true, false );

	function canvasPrint( screenData, msg, x, y ) {
		screenData.context.fillStyle = screenData.fColor.s;
		screenData.context.fillText( msg, x, y );
	}

	// BITMAPPRINT - Print using bitmap font
	pi._.addCommand( "bitmapPrint", bitmapPrint, true, false );

	function bitmapPrint( screenData, msg, x, y ) {
		screenData.screenObj.render();
		const font = screenData.printCursor.font;
		const width = font.image.width;
		const columns = Math.floor( width / font.sWidth );

		for( let i = 0; i < msg.length; i++ ) {
			const charIndex = font.chars[ msg.charCodeAt( i ) ];
			
			// Get the source x & y coordinates
			const sx = ( charIndex % columns ) * font.sWidth;
			const sy = Math.floor( charIndex / columns ) * font.sHeight;

			// Draw the character on the screen
			screenData.context.drawImage(
				font.image, sx, sy, font.sWidth, font.sHeight,
				x + font.width * i, y, font.width, font.height
			);
		}
	}

	// GETAVAILABLEFONTS - Get list of loaded fonts
	pi._.addCommand( "getAvailableFonts", getAvailableFonts, false, false, [] );

	function getAvailableFonts() {
		const data = [];
		for( const i in piData.fonts ) {
			data.push( {
				"id": piData.fonts[ i ].id,
				"width": piData.fonts[ i ].width,
				"height": piData.fonts[ i ].height
			} );
		}
		return data;
	}

	// SETFONTSIZE - Set canvas font size
	pi._.addCommand( "setFontSize", setFontSize, false, true, [ "width", "height" ] );
	pi._.addSetting( "fontSize", setFontSize, true, [ "width", "height" ] );

	function setFontSize( screenData, args ) {
		const width = args[ 0 ];
		const height = args[ 1 ];

		if( isNaN( width ) ) {
			const error = new TypeError( "setFontSize: width must be a number" );
			error.code = "INVALID_WIDTH";
			throw error;
		}

		if( isNaN( height ) ) {
			const error = new TypeError( "setFontSize: height must be a number" );
			error.code = "INVALID_HEIGHT";
			throw error;
		}

		if( screenData.printCursor.font.mode !== "bitmap" ) {
			console.warn( "setFontSize: only bitmap fonts can change sizes" );
			return;
		}

		screenData.printCursor.font.width = width;
		screenData.printCursor.font.height = height;

		// Update rows and cols
		screenData.printCursor.cols = Math.floor( screenData.width / width );
		screenData.printCursor.rows = Math.floor( screenData.height / height );
	}

	// SETCHAR - Set custom character data for pixel font
	pi._.addCommand( "setChar", setChar, false, true, [ "code", "data" ] );
	pi._.addSetting( "char", setChar, true, [ "code", "data" ] );

	function setChar( screenData, args ) {
		let code = args[ 0 ];
		let data = args[ 1 ];

		if( screenData.printCursor.font.mode !== "pixel" ) {
			console.warn( "setChar: only pixel fonts can change characters" );
			return;
		}

		if( typeof code === "string" ) {
			code = code.charCodeAt( 0 );
		} else {
			code = Math.round( code );
		}

		if( isNaN( code ) ) {
			const error = new TypeError( "setChar: code must be an integer or a string" );
			error.code = "INVALID_CODE";
			throw error;
		}

		// Validate data
		if( typeof data === "string" ) {
			data = pi.util.hexToData(
				data,
				screenData.printCursor.font.width,
				screenData.printCursor.font.height
			);
		} else if( pi.util.isArray( data ) ) {
			if( data.length !== screenData.printCursor.font.height ) {
				const error = new RangeError( "setChar: data array is the wrong length" );
				error.code = "INVALID_DATA_LENGTH";
				throw error;
			}

			for( let i = 0; i < data.length; i++ ) {
				if( data[ i ].length !== screenData.printCursor.font.width ) {
					const error = new RangeError( "setChar: data array row is the wrong length" );
					error.code = "INVALID_DATA_WIDTH";
					throw error;
				}

				for( let j = 0; j < data[ i ].length; j++ ) {
					if( !pi.util.isInteger( data[ i ][ j ] ) ) {
						const error = new TypeError( "setChar: data array contains invalid data" );
						error.code = "INVALID_DATA_VALUE";
						throw error;
					}
				}
			}
		} else {
			const error = new TypeError( "setChar: data must be a string or an array" );
			error.code = "INVALID_DATA_TYPE";
			throw error;
		}

		// Set font data
		screenData.printCursor.font.data[ code ] = data;
	}
}

