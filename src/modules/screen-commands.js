/**
 * Pi.js - Screen Commands Module
 * 
 * Basic screen commands like remove, render, width/height getters, etc.
 * 
 * @module modules/screen-commands
 */

export function init( pi ) {
	const piData = pi._.data;

	// ONEVENT - Helper for adding event listeners (internal)
	pi._.addCommand( "onevent", onevent, true, true, [] );

	function onevent( mode, fn, once, hitBox, modes, name, listenerArr, extraId,
		extraData, customData
	) {
		// Make sure mode is valid
		let modeFound = false;

		for( let i = 0; i < modes.length; i++ ) {
			if( mode === modes[ i ] ) {
				modeFound = true;
				break;
			}
		}

		if( !modeFound ) {
			const error = new TypeError(
				`${name}: mode needs to be one of the following ${modes.join( ", " )}`
			);
			error.code = "INVALID_MODE";
			throw error;
		}

		// Make sure once is a boolean
		once = !!once;

		// Make sure function is valid
		if( !pi.util.isFunction( fn ) ) {
			const error = new TypeError( `${name}: fn is not a valid function` );
			error.code = "INVALID_CALLBACK";
			throw error;
		}

		// Validate hitbox
		if( hitBox ) {
			if(
				!pi.util.isInteger( hitBox.x ) ||
				!pi.util.isInteger( hitBox.y ) ||
				!pi.util.isInteger( hitBox.width ) ||
				!pi.util.isInteger( hitBox.height )
			) {
				const error = new TypeError(
					`${name}: hitbox must have properties x, y, width, and height whose values are integers`
				);
				error.code = "INVALID_HITBOX";
				throw error;
			}
		}

		// Prevent event from being triggered in case event is called in an event
		setTimeout( function() {
			const originalFn = fn;
			let newMode;

			// Add extraId to mode
			if( typeof extraId === "string" ) {
				newMode = mode + extraId;
			} else {
				newMode = mode;
			}

			// If it's a one time function
			if( once ) {
				fn = function( data, customData ) {
					offevent( mode, originalFn, modes, name, listenerArr, extraId );
					originalFn( data, customData );
				};
			}

			if( !listenerArr[ newMode ] ) {
				listenerArr[ newMode ] = [];
			}

			listenerArr[ newMode ].push( {
				"fn": fn,
				"hitBox": hitBox,
				"extraData": extraData,
				"clickDown": false,
				"originalFn": originalFn,
				"customData": customData
			} );
		}, 1 );

		return true;
	}

	// OFFEVENT - Helper for removing event listeners (internal)
	pi._.addCommand( "offevent", offevent, true, true, [] );

	function offevent( mode, fn, modes, name, listenerArr, extraId ) {
		// Make sure mode is valid
		let modeFound = false;

		for( let i = 0; i < modes.length; i++ ) {
			if( mode === modes[ i ] ) {
				modeFound = true;
				break;
			}
		}

		if( !modeFound ) {
			const error = new TypeError(
				`${name}: mode needs to be one of the following ${modes.join( ", " )}`
			);
			error.code = "INVALID_MODE";
			throw error;
		}

		// Add extraId to mode
		if( typeof extraId === "string" ) {
			mode += extraId;
		}

		// Validate fn
		const isClear = fn == null;
		if( !isClear && !pi.util.isFunction( fn ) ) {
			const error = new TypeError( `${name}: fn is not a valid function` );
			error.code = "INVALID_CALLBACK";
			throw error;
		}

		if( listenerArr[ mode ] ) {
			if( isClear ) {
				delete listenerArr[ mode ];
			} else {
				for( let i = listenerArr[ mode ].length - 1; i >= 0; i-- ) {
					if( listenerArr[ mode ][ i ].originalFn === fn ) {
						listenerArr[ mode ].splice( i, 1 );
					}

					if( listenerArr[ mode ].length === 0 ) {
						delete listenerArr[ mode ];
					}
				}
			}
			return true;
		}

		return false;
	}

	// CLEAREVENTS - Clear all event listeners
	pi._.addCommand( "clearEvents", clearEvents, false, true, [] );

	function clearEvents( screenData ) {
		// Reset all event listeners
		screenData.onMouseEventListeners = {};
		screenData.onTouchEventListeners = {};
		screenData.onPressEventListeners = {};
		screenData.onClickEventListeners = {};
		screenData.mouseEventListenersActive = 0;
		screenData.touchEventListenersActive = 0;
		screenData.pressEventListenersActive = 0;
		screenData.clickEventListenersActive = 0;
		screenData.lastEvent = null;
	}

	// SETAUTORENDER - Enable/disable automatic rendering
	pi._.addCommand( "setAutoRender", setAutoRender, false, true, [ "isAutoRender" ] );
	pi._.addSetting( "autoRender", setAutoRender, true, [ "isAutoRender" ] );

	function setAutoRender( screenData, args ) {
		screenData.isAutoRender = !!args[ 0 ];

		if( screenData.isAutoRender ) {
			screenData.screenObj.render();
		}
	}

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

	// GETPAL - Get screen's palette
	pi._.addCommand( "getPal", getPal, false, true, [] );

	function getPal( screenData ) {
		const colors = [];
		for( let i = 0; i < screenData.pal.length; i++ ) {
			const color = {
				"r": screenData.pal[ i ].r,
				"g": screenData.pal[ i ].g,
				"b": screenData.pal[ i ].b,
				"a": screenData.pal[ i ].a,
				"s": screenData.pal[ i ].s
			};
			colors.push( color );
		}
		return colors;
	}

	// SETPALCOLOR - Set a specific color in the palette
	pi._.addCommand( "setPalColor", setPalColor, false, true, [ "index", "color" ] );
	pi._.addSetting( "palColor", setPalColor, true, [ "index", "color" ] );

	function setPalColor( screenData, args ) {
		const index = args[ 0 ];
		const color = args[ 1 ];

		if( !pi.util.isInteger( index ) || index < 0 || index > screenData.pal.length ) {
			const error = new RangeError( "setPalColor: index is not a valid integer value" );
			error.code = "INVALID_INDEX";
			throw error;
		}

		const colorValue = pi.util.convertToColor( color );
		if( colorValue === null ) {
			const error = new TypeError(
				"setPalColor: parameter color is not a valid color format"
			);
			error.code = "INVALID_COLOR";
			throw error;
		}

		// Check if we are changing the current selected fore color
		if( screenData.fColor.s === screenData.pal[ index ].s ) {
			screenData.fColor = colorValue;
		}

		// Update the color cache
		if( screenData.cache.findColor[ color.s ] ) {
			screenData.cache.findColor[ color.s ] = index;
		}

		screenData.pal[ index ] = colorValue;
	}

	// SWAPCOLOR - Swap one color for another in the palette and screen
	pi._.addCommand( "swapColor", swapColor, false, true, [ "oldColor", "newColor" ] );

	function swapColor( screenData, args ) {
		let oldColor = args[ 0 ];
		let newColor = args[ 1 ];

		// Validate oldColor
		if( !pi.util.isInteger( oldColor ) ) {
			const error = new TypeError( "swapColor: parameter oldColor must be an integer" );
			error.code = "INVALID_OLD_COLOR";
			throw error;
		}

		if( oldColor < 0 || oldColor >= screenData.pal.length ) {
			const error = new RangeError( "swapColor: parameter oldColor is an invalid integer" );
			error.code = "INVALID_OLD_COLOR_INDEX";
			throw error;
		}

		if( screenData.pal[ oldColor ] === undefined ) {
			const error = new Error(
				"swapColor: parameter oldColor is not in the screen color palette"
			);
			error.code = "COLOR_NOT_IN_PALETTE";
			throw error;
		}

		const index = oldColor;
		oldColor = screenData.pal[ index ];

		// Validate newColor
		newColor = pi.util.convertToColor( newColor );
		if( newColor === null ) {
			const error = new TypeError(
				"swapColor: parameter newColor is not a valid color format"
			);
			error.code = "INVALID_NEW_COLOR";
			throw error;
		}

		piData.commands.getImageData( screenData );
		const data = screenData.imageData.data;

		// Swap all colors on screen
		for( let y = 0; y < screenData.height; y++ ) {
			for( let x = 0; x < screenData.width; x++ ) {
				const i = ( ( screenData.width * y ) + x ) * 4;
				if(
					data[ i ] === oldColor.r &&
					data[ i + 1 ] === oldColor.g &&
					data[ i + 2 ] === oldColor.b &&
					data[ i + 3 ] === oldColor.a
				) {
					data[ i ] = newColor.r;
					data[ i + 1 ] = newColor.g;
					data[ i + 2 ] = newColor.b;
					data[ i + 3 ] = newColor.a;
				}
			}
		}

		piData.commands.setImageDirty( screenData );

		// Update the pal data
		screenData.pal[ index ] = newColor;
	}

	// SETPIXELMODE - Toggle pixel mode on/off
	pi._.addCommand( "setPixelMode", setPixelMode, false, true, [ "isEnabled" ] );
	pi._.addSetting( "pixelMode", setPixelMode, true, [ "isEnabled" ] );

	function setPixelMode( screenData, args ) {
		const isEnabled = args[ 0 ];

		if( isEnabled ) {
			screenData.context.imageSmoothingEnabled = false;
			screenData.pixelMode = true;
		} else {
			screenData.context.imageSmoothingEnabled = true;
			screenData.pixelMode = false;
		}
	}

	// SETPEN - Set pen style, size, and noise
	pi._.addCommand( "setPen", setPen, false, true, [ "pen", "size", "noise" ] );
	pi._.addSetting( "pen", setPen, true, [ "pen", "size", "noise" ] );

	function setPen( screenData, args ) {
		let pen = args[ 0 ];
		let size = Math.round( args[ 1 ] );
		let noise = args[ 2 ];

		if( !piData.pens[ pen ] ) {
			const error = new TypeError(
				`setPen: parameter pen is not a valid pen. Valid pens: ${piData.penList.join( ", " )}`
			);
			error.code = "INVALID_PEN";
			throw error;
		}

		if( !pi.util.isInteger( size ) ) {
			const error = new TypeError( "setPen: parameter size must be an integer" );
			error.code = "INVALID_SIZE";
			throw error;
		}

		if( noise && ( !pi.util.isArray( noise ) && isNaN( noise ) ) ) {
			const error = new TypeError( "setPen: parameter noise is not an array or number" );
			error.code = "INVALID_NOISE";
			throw error;
		}

		if( pi.util.isArray( noise ) ) {
			noise = noise.slice();
			for( let i = 0; i < noise.length; i++ ) {
				if( isNaN( noise[ i ] ) ) {
					const error = new TypeError(
						"setPen: parameter noise array contains an invalid value"
					);
					error.code = "INVALID_NOISE_VALUE";
					throw error;
				}
			}
		}

		if( pen === "pixel" ) {
			size = 1;
		}

		// Set the minimum pen size to 1
		if( size < 1 ) {
			size = 1;
		}

		// Handle special case of size of one
		if( size === 1 ) {

			// Size is one so only draw one pixel
			screenData.pen.draw = piData.pens.pixel.cmd;

			// Set the line width for context draw
			screenData.context.lineWidth = 1;
		} else {

			// Set the draw mode for pixel draw
			screenData.pen.draw = piData.pens[ pen ].cmd;

			// Set the line width for context draw
			screenData.context.lineWidth = size * 2 - 1;
		}

		screenData.pen.noise = noise;
		screenData.pen.size = size;
		screenData.context.lineCap = piData.pens[ pen ].cap;
	}

	// SETBLENDMODE - Set blend mode for pixel operations
	pi._.addCommand( "setBlendMode", setBlendMode, false, true, [ "mode" ] );
	pi._.addSetting( "blendMode", setBlendMode, true, [ "mode" ] );

	function setBlendMode( screenData, args ) {
		const mode = args[ 0 ];

		if( !piData.blendCommands[ mode ] ) {
			const error = new TypeError(
				`setBlendMode: Argument blend is not a valid blend mode. Valid modes: ${piData.blendCommandsList.join( ", " )}`
			);
			error.code = "INVALID_BLEND_MODE";
			throw error;
		}

		screenData.blendPixelCmd = piData.blendCommands[ mode ];
	}

	// GETPIXEL - Get color of a single pixel
	pi._.addCommand( "getPixel", getPixel, false, true, [ "x", "y" ] );

	function getPixel( screenData, args ) {
		const x = Math.round( args[ 0 ] );
		const y = Math.round( args[ 1 ] );

		// Make sure x and y are integers
		if( !pi.util.isInteger( x ) || !pi.util.isInteger( y ) ) {
			const error = new TypeError( "getPixel: x and y must be integers" );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		piData.commands.getImageData( screenData );
		const data = screenData.imageData.data;

		// Calculate the index
		const i = ( ( screenData.width * y ) + x ) * 4;
		return pi.util.convertToColor( {
			"r": data[ i ],
			"g": data[ i + 1 ],
			"b": data[ i + 2 ],
			"a": data[ i + 3 ]
		} );
	}

	// FILTERIMG - Apply a filter function to all pixels
	pi._.addCommand( "filterImg", filterImg, false, true, [ "filter" ] );

	function filterImg( screenData, args ) {
		const filter = args[ 0 ];

		if( !pi.util.isFunction( filter ) ) {
			const error = new TypeError( "filterImg: filter must be a callback function" );
			error.code = "INVALID_FILTER";
			throw error;
		}

		piData.commands.getImageData( screenData );
		const data = screenData.imageData.data;

		// Apply filter to all pixels
		for( let y = 0; y < screenData.height; y++ ) {
			for( let x = 0; x < screenData.width; x++ ) {
				const i = ( ( screenData.width * y ) + x ) * 4;
				const color = filter( {
					"r": data[ i ],
					"g": data[ i + 1 ],
					"b": data[ i + 2 ],
					"a": data[ i + 3 ]
				}, x, y );

				if( color &&
					pi.util.isInteger( color.r ) &&
					pi.util.isInteger( color.g ) &&
					pi.util.isInteger( color.b ) &&
					pi.util.isInteger( color.a )
				) {
					data[ i ] = pi.util.clamp( color.r, 0, 255 );
					data[ i + 1 ] = pi.util.clamp( color.g, 0, 255 );
					data[ i + 2 ] = pi.util.clamp( color.b, 0, 255 );
					data[ i + 3 ] = pi.util.clamp( color.a, 0, 255 );
				}
			}
		}

		piData.commands.setImageDirty( screenData );
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

