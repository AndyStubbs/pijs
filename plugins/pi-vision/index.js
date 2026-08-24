/**
 * Pi Vision Plugin for Pi.js
 * 
 * Provides retro, character-cell-based windows under the $.vis namespace.
 * 
 * @module plugins/pi-vision
 * @version 1.0.0
 */

"use strict";

const BORDER_GLYPHS = {
	"single": [ 218, 196, 191, 179, 192, 217 ],
	"double": [ 201, 205, 187, 186, 200, 188 ],
	"thick": [ 219, 223, 219, 219, 219, 219 ]
};

/**
 * Initialize the Pi Vision plugin
 * 
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 * @returns {void}
 */
export default function piVisionPlugin( pluginApi ) {
	const api = pluginApi.getApi();

	if(
		api.vis != null &&
		( typeof api.vis !== "object" || typeof api.vis.window !== "undefined" )
	) {
		const error = new Error( "pi-vision: The $.vis namespace is already in use." );
		error.code = "VIS_NAMESPACE_CONFLICT";
		throw error;
	}

	pluginApi.addScreenDataItem( "vis", {
		"windows": [],
		"window": null
	} );
	for( const screenData of pluginApi.getAllScreensData() ) {
		if( !screenData.vis ) {
			screenData.vis = {
				"windows": [],
				"window": null
			};
		}
	}

	pluginApi.addScreenCleanupFunction( cleanupScreen );

	const vis = api.vis || {};
	vis.window = createWindow;
	api.vis = vis;

	/**
	 * Create an offscreen Pi Vision window
	 * 
	 * @param {Object} options - Window options
	 * @param {number} options.x - Horizontal position on the parent screen
	 * @param {number} options.y - Vertical position on the parent screen
	 * @param {number} options.width - Total window width in pixels
	 * @param {number} options.height - Total window height in pixels
	 * @param {string} [options.title=""] - Window title
	 * @param {string} [options.border="single"] - Border style
	 * @param {boolean} [options.shadow=true] - Whether to composite a shadow in a later phase
	 * @returns {Object} Offscreen Pi.js screen API
	 */
	function createWindow( options ) {
		validateOptionsObject( options );

		const normalized = normalizeOptions( options );
		const parentData = pluginApi.getActiveScreen( "vis.window" );
		let windowScreen = null;

		try {
			windowScreen = api.screen( {
				"aspect": `${normalized.width}x${normalized.height}`,
				"isOffscreen": true
			} );

			const windowData = pluginApi.getScreenData( "vis.window", windowScreen.id );
			const client = calculateClientRect( windowData, normalized );
			const record = {
				"parentScreenId": parentData.id,
				"screen": windowScreen,
				"x": normalized.x,
				"y": normalized.y,
				"width": normalized.width,
				"height": normalized.height,
				"title": normalized.title,
				"border": normalized.border,
				"shadow": normalized.shadow,
				"client": client
			};

			parentData.vis.windows.push( record );
			windowData.vis.window = record;

			drawFrame( windowScreen, windowData, normalized );
			windowScreen.setPosPx( 0, 0 );
			windowScreen.pushView( client );
		} catch( error ) {
			if( windowScreen ) {
				windowScreen.removeScreen();
			}
			throw error;
		} finally {
			api.setScreen( parentData.api );
		}

		return windowScreen;
	}

	/**
	 * Remove a deleted window from its parent's registry
	 * 
	 * @param {Object} screenData - Screen being removed
	 * @returns {void}
	 */
	function cleanupScreen( screenData ) {
		if( !screenData.vis ) {
			return;
		}

		const record = screenData.vis.window;
		if( !record ) {
			return;
		}

		const screens = pluginApi.getAllScreensData();
		const parentData = screens.find( ( item ) => item.id === record.parentScreenId );
		if( !parentData ) {
			return;
		}

		parentData.vis.windows = parentData.vis.windows.filter( ( item ) => item !== record );
	}
}

/**
 * Validate and normalize the public options object
 * 
 * @param {Object} options - Raw window options
 * @returns {Object} Normalized options
 */
function normalizeOptions( options ) {
	let title = "";
	if( options.title != null ) {
		title = options.title;
	}

	let border = "single";
	if( options.border != null ) {
		if( typeof options.border !== "string" ) {
			const error = new TypeError( "vis.window: Parameter border must be a string." );
			error.code = "INVALID_WINDOW_BORDER";
			throw error;
		}
		border = options.border.toLowerCase();
	}

	let shadow = true;
	if( options.shadow != null ) {
		shadow = options.shadow;
	}

	const normalized = {
		"x": options.x,
		"y": options.y,
		"width": options.width,
		"height": options.height,
		"title": title,
		"border": border,
		"shadow": shadow
	};

	for( const name of [ "x", "y", "width", "height" ] ) {
		if( !Number.isInteger( normalized[ name ] ) ) {
			const error = new TypeError( `vis.window: Parameter ${name} must be an integer.` );
			error.code = "INVALID_WINDOW_GEOMETRY";
			throw error;
		}
	}

	if( normalized.width <= 0 || normalized.height <= 0 ) {
		const error = new RangeError( "vis.window: Width and height must be greater than zero." );
		error.code = "INVALID_WINDOW_DIMENSIONS";
		throw error;
	}

	if( typeof normalized.title !== "string" ) {
		const error = new TypeError( "vis.window: Parameter title must be a string." );
		error.code = "INVALID_WINDOW_TITLE";
		throw error;
	}

	if(
		normalized.border !== "single" && normalized.border !== "double" &&
		normalized.border !== "thick" && normalized.border !== "none"
	) {
		const error = new RangeError( `vis.window: Unknown border style "${normalized.border}".` );
		error.code = "INVALID_WINDOW_BORDER";
		throw error;
	}

	if( typeof normalized.shadow !== "boolean" ) {
		const error = new TypeError( "vis.window: Parameter shadow must be a boolean." );
		error.code = "INVALID_WINDOW_SHADOW";
		throw error;
	}

	return normalized;
}

/**
 * Ensure the caller supplied an options object
 * 
 * @param {Object} options - Raw options
 * @returns {void}
 */
function validateOptionsObject( options ) {
	if( !options || typeof options !== "object" || Array.isArray( options ) ) {
		const error = new TypeError( "vis.window: Options must be an object." );
		error.code = "INVALID_WINDOW_OPTIONS";
		throw error;
	}
}

/**
 * Calculate the protected client rectangle
 * 
 * @param {Object} screenData - Window screen data
 * @param {Object} options - Normalized window options
 * @returns {Object} Client rectangle
 */
function calculateClientRect( screenData, options ) {
	const fontWidth = screenData.font.width;
	const fontHeight = screenData.font.height;
	const hasBorder = options.border !== "none";
	const hasTitleRow = hasBorder || options.title.length > 0;
	let left = 0;
	let top = 0;
	let right = 0;
	let bottom = 0;

	if( hasBorder ) {
		left = fontWidth;
		right = fontWidth;
		bottom = fontHeight;
	}
	if( hasTitleRow ) {
		top = fontHeight;
	}
	const client = {
		"x": left,
		"y": top,
		"width": options.width - left - right,
		"height": options.height - top - bottom
	};

	if( client.width <= 0 || client.height <= 0 ) {
		const error = new RangeError(
			"vis.window: Window dimensions do not leave a positive client area."
		);
		error.code = "INVALID_CLIENT_DIMENSIONS";
		throw error;
	}

	return client;
}

/**
 * Draw the initial CP437 frame and title
 * 
 * @param {Object} screen - Window screen API
 * @param {Object} screenData - Window screen data
 * @param {Object} options - Normalized window options
 * @returns {void}
 */
function drawFrame( screen, screenData, options ) {
	const fontWidth = screenData.font.width;
	const fontHeight = screenData.font.height;
	const columns = Math.floor( options.width / fontWidth );
	const rows = Math.floor( options.height / fontHeight );

	if( options.border !== "none" ) {
		drawBorder( screen, options, fontWidth, fontHeight, columns, rows );
	}

	if( options.title.length > 0 ) {
		drawTitle( screen, options, fontWidth, columns );
	}
}

/**
 * Draw a character-cell border
 * 
 * @param {Object} screen - Window screen API
 * @param {Object} options - Normalized window options
 * @param {number} fontWidth - Character width
 * @param {number} fontHeight - Character height
 * @param {number} columns - Complete character columns
 * @param {number} rows - Complete character rows
 * @returns {void}
 */
function drawBorder( screen, options, fontWidth, fontHeight, columns, rows ) {
	const glyphs = BORDER_GLYPHS[ options.border ];
	const rightX = options.width - fontWidth;
	const bottomY = options.height - fontHeight;

	printGlyph( screen, glyphs[ 0 ], 0, 0 );
	printGlyph( screen, glyphs[ 2 ], rightX, 0 );
	printGlyph( screen, glyphs[ 4 ], 0, bottomY );
	printGlyph( screen, glyphs[ 5 ], rightX, bottomY );

	for( let column = 1; column < columns - 1; column += 1 ) {
		const x = column * fontWidth;
		printGlyph( screen, glyphs[ 1 ], x, 0 );
		printGlyph( screen, glyphs[ 1 ], x, bottomY );
	}

	for( let row = 1; row < rows - 1; row += 1 ) {
		const y = row * fontHeight;
		printGlyph( screen, glyphs[ 3 ], 0, y );
		printGlyph( screen, glyphs[ 3 ], rightX, y );
	}
}

/**
 * Draw a centered, clipped title in the top row
 * 
 * @param {Object} screen - Window screen API
 * @param {Object} options - Normalized window options
 * @param {number} fontWidth - Character width
 * @param {number} columns - Complete character columns
 * @returns {void}
 */
function drawTitle( screen, options, fontWidth, columns ) {
	let borderColumns = 2;
	if( options.border === "none" ) {
		borderColumns = 0;
	}
	const availableColumns = Math.max( columns - borderColumns, 0 );
	const title = options.title.slice( 0, availableColumns );
	const titleWidth = title.length * fontWidth;
	let x = Math.floor( ( options.width - titleWidth ) / 2 );
	x = Math.floor( x / fontWidth ) * fontWidth;

	if( options.border !== "none" ) {
		x = Math.max( fontWidth, x );
	}

	screen.setPosPx( x, 0 );
	screen.print( title, true );
}

/**
 * Draw one CP437 glyph at a pixel position
 * 
 * @param {Object} screen - Window screen API
 * @param {number} code - CP437 character code
 * @param {number} x - Pixel x position
 * @param {number} y - Pixel y position
 * @returns {void}
 */
function printGlyph( screen, code, x, y ) {
	screen.setPosPx( x, y );
	screen.print( String.fromCharCode( code ), true );
}

// Auto-register in IIFE mode
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "pi-vision",
		"version": "1.0.0",
		"description": "Retro character-cell windowing and controls for Pi.js",
		"init": piVisionPlugin
	} );
}
