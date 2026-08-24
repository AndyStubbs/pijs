/**
 * Pi Vision Window Command for Pi.js
 * 
 * Provides window functionality for the pi-vision plugin.
 * 
 * @module plugins/pi-vision/window
 */

"use strict";

import g_Util from "./util.js";

const BORDER_GLYPHS = {
	"single": [ 218, 196, 191, 179, 192, 217 ],
	"double": [ 201, 205, 187, 186, 200, 188 ],
	"thick": [ 219, 223, 219, 219, 219, 219 ]
};

const CLOSE_BUTTON = "[X]";
const SHADOW_SIZE = 2;

let g_pluginApi = null;

export default { init, createWindow };

/**
 * Initialize the window command
 * 
 * @param {Object} pluginApi - Plugin API
 * @returns {void}
 */
function init( pluginApi ) {
	g_pluginApi = pluginApi;
}

/**
 * Create an offscreen Pi Vision window
 * 
 * @param {Object} options - Window options
 * @param {number} options.x - Horizontal position on the parent screen
 * @param {number} options.y - Vertical position on the parent screen
 * @param {number} options.width - Total window width in pixels
 * @param {number} options.height - Total window height in pixels
 * @param {string} [options.title=""] - Window title
 * @param {string} [options.border="double"] - Border style
 * @param {boolean} [options.shadow=true] - Whether to composite a two-pixel drop shadow
 * @returns {Object} Offscreen Pi.js screen API
 */
function createWindow( options ) {
	g_Util.validateOptionsObject( options, "vis.createWindow" );

	const normalized = normalizeOptions( options );
	const parentData = g_pluginApi.getActiveScreen( "vis.window" );
	const api = g_pluginApi.getApi();
	let windowScreen = null;

	try {
		windowScreen = api.screen( {
			"aspect": `${normalized.width}x${normalized.height}`,
			"isOffscreen": true
		} );

		const windowData = g_pluginApi.getScreenData( "vis.window", windowScreen.id );
		const client = calculateClientRect( windowData, normalized );
		const record = {
			"type": "window",
			"parentScreenId": parentData.id,
			"screen": windowScreen,
			"screenData": windowData,
			"x": normalized.x,
			"y": normalized.y,
			"width": normalized.width,
			"height": normalized.height,
			"title": normalized.title,
			"border": normalized.border,
			"shadow": normalized.shadow,
			"client": client,
			"chromeColor": windowScreen.getColor(),
			"chrome": null,
			"render": null
		};

		record.render = ( recursive = true ) => renderWindow( record, recursive );
		parentData.vis.elements.push( record );
		windowData.vis.element = record;
		windowScreen.render = record.render;

		drawChrome( record );
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

	let border = "double";
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
	let left = 0;
	let top = fontHeight;
	let right = 0;
	let bottom = 0;

	if( hasBorder ) {
		left = fontWidth;
		right = fontWidth;
		bottom = fontHeight;
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
 * Render a window element and optionally its descendants
 *
 * @param {Object} record - Window element record
 * @param {boolean} [recursive=true] - Whether to render descendant elements
 * @returns {void}
 */
function renderWindow( record, recursive = true ) {
	if( typeof recursive !== "boolean" ) {
		const error = new TypeError( "window.render: Parameter recursive must be a boolean." );
		error.code = "INVALID_VIS_RECURSIVE";
		throw error;
	}

	drawChrome( record );
	if( recursive ) {
		for( const element of [ ...record.screenData.vis.elements ] ) {
			if( typeof element.render === "function" ) {
				element.render( true );
			}
		}
	}

	const parentData = g_pluginApi.getScreenData( "window.render", record.parentScreenId );
	if( record.shadow ) {
		const savedColor = parentData.api.getColor();
		parentData.api.setColor( 0 );
		parentData.api.rect(
			record.x + SHADOW_SIZE, record.y + record.height,
			record.width, SHADOW_SIZE, 0
		);
		parentData.api.rect(
			record.x + record.width, record.y + SHADOW_SIZE,
			SHADOW_SIZE, record.height, 0
		);
		parentData.api.setColor( savedColor );
	}
	parentData.api.drawImage( record.screen, record.x, record.y, undefined, 0, 0, 1, 1, 0 );
}

/**
 * Build and draw all window chrome with one print call
 *
 * @param {Object} record - Window element record
 * @returns {void}
 */
function drawChrome( record ) {
	const screen = record.screen;
	const screenData = record.screenData;
	const fontWidth = screenData.font.width;
	const fontHeight = screenData.font.height;
	const columns = Math.floor( record.width / fontWidth );
	const rows = Math.floor( record.height / fontHeight );
	const savedColor = screen.getColor();
	const savedCursor = {
		"x": screenData.printCursor.x,
		"y": screenData.printCursor.y
	};
	const savedViews = screenData.view.stack.map( ( view ) => ( {
		"x": view.localX,
		"y": view.localY,
		"width": view.width,
		"height": view.height,
		"savedCursorX": view.savedCursorX,
		"savedCursorY": view.savedCursorY
	} ) );

	screen.resetView();
	screen.setColor( record.chromeColor );
	screen.cls( 0, 0, record.width, fontHeight );

	const glyphs = BORDER_GLYPHS[ record.border ];
	if( record.chrome === null ) {
		const inset = glyphs ? 1 : 0;
		const horizontal = glyphs ? String.fromCharCode( glyphs[ 1 ] ) : " ";
		const top = Array( columns ).fill( horizontal );
		if( glyphs ) {
			top[ 0 ] = String.fromCharCode( glyphs[ 0 ] );
			top[ columns - 1 ] = String.fromCharCode( glyphs[ 2 ] );
		}

		const available = Math.max( columns - inset * 2, 0 );
		const closeText = CLOSE_BUTTON.slice( -Math.min( CLOSE_BUTTON.length, available ) );
		const closeColumn = Math.max( inset, columns - inset - closeText.length );
		const titleWidth = Math.max( closeColumn - inset - 1, 0 );
		let title = "";
		if( record.title.length > 0 && titleWidth >= 3 ) {
			title = " " + record.title.slice( 0, titleWidth - 2 ) + " ";
		}
		const titleColumn = inset + Math.floor( ( titleWidth - title.length ) / 2 );

		for( let i = 0; i < title.length; i += 1 ) {
			top[ titleColumn + i ] = title[ i ];
		}
		for( let i = 0; i < closeText.length; i += 1 ) {
			top[ closeColumn + i ] = closeText[ i ];
		}

		const frame = [ top.join( "" ) ];
		if( glyphs ) {
			const vertical = String.fromCharCode( glyphs[ 3 ] );
			const middle = vertical + " ".repeat( Math.max( columns - 2, 0 ) ) + vertical;
			for( let row = 1; row < rows - 1; row += 1 ) {
				frame.push( middle );
			}
			frame.push(
				String.fromCharCode( glyphs[ 4 ] ) +
				horizontal.repeat( Math.max( columns - 2, 0 ) ) +
				String.fromCharCode( glyphs[ 5 ] )
			);
		}
		record.chrome = frame.join( "\n" );
	}

	if( glyphs ) {
		screen.cls( 0, fontHeight, fontWidth, record.height - fontHeight );
		screen.cls(
			record.width - fontWidth, fontHeight,
			fontWidth, record.height - fontHeight
		);
		screen.cls( 0, record.height - fontHeight, record.width, fontHeight );
	}

	screen.setPosPx( 0, 0 );
	screen.print( record.chrome, true );
	screen.resetView();
	for( const view of savedViews ) {
		screen.pushView( view );
		const restoredView = screenData.view.stack[ screenData.view.stack.length - 1 ];
		restoredView.savedCursorX = view.savedCursorX;
		restoredView.savedCursorY = view.savedCursorY;
	}
	screen.setColor( savedColor );
	screenData.printCursor.x = savedCursor.x;
	screenData.printCursor.y = savedCursor.y;
}
