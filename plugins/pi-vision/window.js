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
	g_pluginApi.addScreenInitFunction( setupInteractionScreen );
	for( const screenData of g_pluginApi.getAllScreensData() ) {
		setupInteractionScreen( screenData );
	}
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
 * @param {Function} [options.beforeClose] - Return false to cancel a close request
 * @param {Function} [options.onRender] - Rebuilds client content before descendants render
 * @returns {Object} Offscreen Pi.js screen API
 */
function createWindow( options ) {
	g_Util.validateOptionsObject( options, "vis.createWindow" );

	const normalized = normalizeOptions( options );
	const parentData = g_pluginApi.getActiveScreen( "vis.window" );
	ensureRootInteraction( parentData );
	const api = g_pluginApi.getApi();
	let windowScreen = null;

	try {
		windowScreen = api.screen( {
			"aspect": `${normalized.width}x${normalized.height}`,
			"isOffscreen": true,
			"parent": parentData.api
		} );

		const windowData = g_pluginApi.getScreenData( "vis.window", windowScreen.id );
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
			"beforeClose": normalized.beforeClose,
			"onRender": normalized.onRender,
			"client": null,
			"chromeColor": windowScreen.getColor(),
			"chrome": null,
			"render": null
		};

		record.render = ( recursive = true ) => renderWindow( record, recursive );
		record.move = ( x, y ) => moveWindow( record, x, y );
		record.resize = ( width, height ) => resizeWindow( record, width, height );
		record.close = () => closeWindow( record );
		parentData.vis.elements.push( record );
		windowData.vis.element = record;
		windowScreen.render = record.render;
		windowScreen.move = record.move;
		windowScreen.resize = record.resize;
		windowScreen.close = record.close;

		fitWindowToParent( record, true );
		drawChrome( record );
		windowScreen.setPosPx( 0, 0 );
		windowScreen.pushView( record.client );
	} catch( error ) {
		if( windowScreen ) {
			windowScreen.removeScreen();
		}
		throw error;
	} finally {
		api.setScreen( parentData.id );
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

	let beforeClose = null;
	if( options.beforeClose != null ) {
		if( typeof options.beforeClose !== "function" ) {
			const error = new TypeError( "vis.window: Parameter beforeClose must be a function." );
			error.code = "INVALID_WINDOW_CALLBACK";
			throw error;
		}
		beforeClose = options.beforeClose;
	}

	let onRender = null;
	if( options.onRender != null ) {
		if( typeof options.onRender !== "function" ) {
			const error = new TypeError( "vis.window: Parameter onRender must be a function." );
			error.code = "INVALID_VIS_RENDER_CALLBACK";
			throw error;
		}
		onRender = options.onRender;
	}

	const normalized = {
		"x": options.x,
		"y": options.y,
		"width": options.width,
		"height": options.height,
		"title": title,
		"border": border,
		"shadow": shadow,
		"beforeClose": beforeClose,
		"onRender": onRender
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
	const layout = calculateWindowLayout(
		screenData, options.border, options.width, options.height, "nearest"
	);
	const client = layout.client;

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
 * Calculate normalized window, client, chrome, and resize-grip geometry.
 *
 * @param {Object} screenData - Window screen data
 * @param {string} border - Border style
 * @param {number} width - Requested outer width
 * @param {number} height - Requested outer height
 * @param {string} roundMode - "nearest", "floor", or "ceil"
 * @returns {Object} Normalized layout
 */
function calculateWindowLayout( screenData, border, width, height, roundMode ) {
	const fontWidth = screenData.font.width;
	const fontHeight = screenData.font.height;
	if( border === "none" ) {
		return {
			"width": width,
			"height": height,
			"columns": Math.floor( width / fontWidth ),
			"rows": Math.floor( height / fontHeight ),
			"client": { "x": 0, "y": fontHeight, "width": width,
				"height": height - fontHeight },
			"grip": { "x": Math.max( width - fontWidth, 0 ),
				"y": Math.max( height - fontHeight, 0 ),
				"width": fontWidth, "height": fontHeight }
		};
	}

	const normalizedWidth = snapDimension( width, fontWidth, roundMode, fontWidth * 3 );
	const normalizedHeight = snapDimension( height, fontHeight, roundMode, fontHeight * 3 );
	return {
		"width": normalizedWidth,
		"height": normalizedHeight,
		"columns": normalizedWidth / fontWidth,
		"rows": normalizedHeight / fontHeight,
		"client": {
			"x": fontWidth,
			"y": fontHeight,
			"width": normalizedWidth - fontWidth * 2,
			"height": normalizedHeight - fontHeight * 2
		},
		"grip": {
			"x": normalizedWidth - fontWidth,
			"y": normalizedHeight - fontHeight,
			"width": fontWidth,
			"height": fontHeight
		}
	};
}

function snapDimension( value, cellSize, roundMode, minimum ) {
	let cells;
	if( roundMode === "floor" ) {
		cells = Math.floor( value / cellSize );
	} else if( roundMode === "ceil" ) {
		cells = Math.ceil( value / cellSize );
	} else {
		cells = Math.round( value / cellSize );
	}
	return Math.max( cells * cellSize, minimum );
}

/**
 * Attach the shared pointer dispatcher to an onscreen parent.
 *
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
function setupInteractionScreen( screenData ) {
	if( screenData.isOffscreen || !screenData.vis || screenData.vis.interaction ) {
		return;
	}

	const state = {
		"capture": null,
		"renderRequestId": null,
		"down": ( data ) => interactionDown( screenData, state, data ),
		"move": ( data ) => interactionMove( state, data ),
		"up": ( data ) => interactionUp( state, data )
	};
	screenData.vis.interaction = state;
	screenData.api.onpress( "down", state.down );
	screenData.api.onpress( "move", state.move );
	screenData.api.onpress( "up", state.up );
}

function ensureRootInteraction( screenData ) {
	let rootData = screenData;
	while( rootData.isOffscreen && rootData.vis.element ) {
		rootData = getScreenDataById( rootData.vis.element.parentScreenId );
	}
	if( rootData ) {
		setupInteractionScreen( rootData );
	}
}

function interactionDown( rootData, state, data ) {
	const hit = hitTestWindows( rootData, data.x, data.y, 0, 0 );
	state.capture = null;
	if( !hit ) {
		return;
	}

	const mode = getInteractionMode( hit.record, hit.x, hit.y );
	if( mode !== null ) {
		state.capture = {
			"record": hit.record,
			"mode": mode,
			"startX": data.x,
			"startY": data.y,
			"x": hit.record.x,
			"y": hit.record.y,
			"width": hit.record.width,
			"height": hit.record.height
		};
	}
	raiseWindow( hit.record );
	renderRootForRecord( hit.record );
}

function interactionMove( state, data ) {
	const capture = state.capture;
	if( !capture || data.buttons === 0 ) {
		return;
	}
	if( !getScreenDataById( capture.record.screenData.id ) ) {
		state.capture = null;
		return;
	}
	const deltaX = data.x - capture.startX;
	const deltaY = data.y - capture.startY;
	if( capture.mode === "move" ) {
		moveWindow( capture.record, capture.x + deltaX, capture.y + deltaY, false );
	} else if( capture.mode === "resize" ) {
		resizeWindow( capture.record, capture.width + deltaX, capture.height + deltaY, false );
	}
	scheduleInteractionRender( capture.record, state );
}

function interactionUp( state, data ) {
	const capture = state.capture;
	state.capture = null;
	if( !capture || capture.mode !== "close" ) {
		return;
	}
	if( !getScreenDataById( capture.record.screenData.id ) ) {
		return;
	}
	const origin = getWindowRootOrigin( capture.record );
	const localX = data.x - origin.x;
	const localY = data.y - origin.y;
	if( getInteractionMode( capture.record, localX, localY ) === "close" ) {
		closeWindow( capture.record );
	}
}

/**
 * Hit-test nested windows from front to back.
 *
 * @param {Object} parentData - Parent screen data
 * @param {number} x - Root-space x
 * @param {number} y - Root-space y
 * @param {number} parentX - Parent client root-space x
 * @param {number} parentY - Parent client root-space y
 * @returns {Object|null} Hit result
 */
function hitTestWindows( parentData, x, y, parentX, parentY ) {
	for( let i = parentData.vis.elements.length - 1; i >= 0; i -= 1 ) {
		const record = parentData.vis.elements[ i ];
		if( record.type !== "window" ) {
			continue;
		}
		const left = parentX + record.x;
		const top = parentY + record.y;
		if( x < left || y < top || x >= left + record.width || y >= top + record.height ) {
			continue;
		}

		const childHit = hitTestWindows(
			record.screenData, x, y,
			left + record.client.x, top + record.client.y
		);
		if( childHit ) {
			return childHit;
		}
		return { "record": record, "x": x - left, "y": y - top };
	}
	return null;
}

function getInteractionMode( record, x, y ) {
	const fontHeight = record.screenData.font.height;
	const layout = calculateWindowLayout(
		record.screenData, record.border, record.width, record.height, "nearest"
	);
	if(
		x >= layout.grip.x && x < layout.grip.x + layout.grip.width &&
		y >= layout.grip.y && y < layout.grip.y + layout.grip.height
	) {
		return "resize";
	}
	if( y >= 0 && y < fontHeight ) {
		const close = getCloseRect( record );
		if( x >= close.x && x < close.x + close.width ) {
			return "close";
		}
		return "move";
	}
	return null;
}

function getCloseRect( record ) {
	const fontWidth = record.screenData.font.width;
	const layout = calculateWindowLayout(
		record.screenData, record.border, record.width, record.height, "nearest"
	);
	const columns = layout.columns;
	const inset = record.border === "none" ? 0 : 1;
	const available = Math.max( columns - inset * 2, 0 );
	const length = Math.min( CLOSE_BUTTON.length, available );
	const column = Math.max( inset, columns - inset - length );
	return { "x": column * fontWidth, "width": length * fontWidth };
}

function getWindowRootOrigin( record ) {
	let x = record.x;
	let y = record.y;
	let parentData = getScreenDataById( record.parentScreenId );
	while( parentData && parentData.vis.element ) {
		const parent = parentData.vis.element;
		x += parent.x + parent.client.x;
		y += parent.y + parent.client.y;
		parentData = getScreenDataById( parent.parentScreenId );
	}
	return { "x": x, "y": y };
}

function raiseWindow( record ) {
	const parentData = getScreenDataById( record.parentScreenId );
	if( !parentData ) {
		return;
	}
	const index = parentData.vis.elements.indexOf( record );
	if( index >= 0 && index !== parentData.vis.elements.length - 1 ) {
		parentData.vis.elements.splice( index, 1 );
		parentData.vis.elements.push( record );
	}
	if( parentData.vis.element ) {
		raiseWindow( parentData.vis.element );
	}
}

/**
 * Queue one root render for pointer-driven changes in the current display frame.
 *
 * @param {Object} record - Window element record
 * @param {Object} state - Root interaction state
 * @returns {void}
 */
function scheduleInteractionRender( record, state ) {
	if( state.renderRequestId !== null ) {
		return;
	}
	const parentData = getScreenDataById( record.parentScreenId );
	const rootData = getRootData( parentData );
	if( !rootData ) {
		return;
	}
	state.renderRequestId = requestAnimationFrame( () => {
		state.renderRequestId = null;
		if( getScreenDataById( rootData.id ) ) {
			renderRootData( rootData );
		}
	} );
}

function moveWindow( record, x, y, render = true ) {
	validateGeometryValue( "window.move", "x", x );
	validateGeometryValue( "window.move", "y", y );
	record.x = x;
	record.y = y;
	fitWindowToParent( record, false );
	if( render ) {
		renderRootForRecord( record );
	}
	return record.screen;
}

function resizeWindow( record, width, height, render = true ) {
	validateGeometryValue( "window.resize", "width", width );
	validateGeometryValue( "window.resize", "height", height );
	const bounds = getWindowBounds( record );
	const minimum = getMinimumSize( record );
	const maximum = getMaximumSize(
		record, bounds.width - record.x - getShadowExtent( record ),
		bounds.height - record.y - getShadowExtent( record )
	);
	const requested = calculateWindowLayout(
		record.screenData, record.border, width, height, "nearest"
	);
	const nextWidth = Math.max( minimum.width, Math.min( requested.width, maximum.width ) );
	const nextHeight = Math.max( minimum.height, Math.min( requested.height, maximum.height ) );
	if( applyWindowSize( record, nextWidth, nextHeight ) ) {
		fitDescendants( record );
		if( render ) {
			renderRootForRecord( record );
		}
	}
	return record.screen;
}

function closeWindow( record ) {
	if( record.beforeClose && record.beforeClose( record.screen ) === false ) {
		return false;
	}
	const activeData = g_pluginApi.getActiveScreen( "window.close" );
	const parentData = getScreenDataById( record.parentScreenId );
	const rootData = getRootData( parentData );
	closeDescendants( record );
	record.screen.removeScreen();
	if( rootData && getScreenDataById( rootData.id ) ) {
		renderRootData( rootData );
	}
	if( activeData && getScreenDataById( activeData.id ) ) {
		g_pluginApi.getApi().setScreen( activeData.id );
	} else if( parentData && getScreenDataById( parentData.id ) ) {
		g_pluginApi.getApi().setScreen( parentData.id );
	}
	return true;
}

function closeDescendants( record ) {
	for( const element of [ ...record.screenData.vis.elements ].reverse() ) {
		if( element.type === "window" ) {
			closeDescendants( element );
			element.beforeClose = null;
			element.screen.removeScreen();
		}
	}
}

function fitWindowToParent( record, resizeToFit ) {
	const bounds = getWindowBounds( record );
	const minimum = getMinimumSize( record );
	const shadow = getShadowExtent( record );
	const maximum = getMaximumSize( record, bounds.width - shadow, bounds.height - shadow );
	const maximumWidth = maximum.width;
	const maximumHeight = maximum.height;
	if( maximumWidth < minimum.width || maximumHeight < minimum.height ) {
		const error = new RangeError( "vis.window: Parent cannot contain the minimum window size." );
		error.code = "WINDOW_DOES_NOT_FIT";
		throw error;
	}
	if( resizeToFit ) {
		const requested = calculateWindowLayout(
			record.screenData, record.border, record.width, record.height, "nearest"
		);
		applyWindowSize(
			record,
			Math.max( minimum.width, Math.min( requested.width, maximumWidth ) ),
			Math.max( minimum.height, Math.min( requested.height, maximumHeight ) )
		);
	}
	record.x = Math.max( 0, Math.min( record.x, bounds.width - record.width - shadow ) );
	record.y = Math.max( 0, Math.min( record.y, bounds.height - record.height - shadow ) );
}

function fitDescendants( record ) {
	for( const element of record.screenData.vis.elements ) {
		if( element.type === "window" ) {
			fitWindowToParent( element, true );
			fitDescendants( element );
		}
	}
}

function applyWindowSize( record, width, height ) {
	if( record.client !== null && record.width === width && record.height === height ) {
		return false;
	}
	const options = { "width": width, "height": height, "border": record.border };
	const client = calculateClientRect( record.screenData, options );
	const hadClientView = record.screenData.view.stack.length > 0;
	const savedViews = record.screenData.view.stack.slice( 1 ).map( ( view ) => ( {
		"x": view.localX,
		"y": view.localY,
		"width": view.width,
		"height": view.height
	} ) );
	record.width = width;
	record.height = height;
	record.client = client;
	record.chrome = null;
	g_pluginApi.resizeOffscreenScreen( record.screenData, width, height );
	if( hadClientView ) {
		record.screen.resetView();
		record.screen.pushView( client );
		for( const view of savedViews ) {
			record.screen.pushView( view );
		}
	}
	return true;
}

function getMaximumSize( record, width, height ) {
	if( record.border === "none" ) {
		return { "width": width, "height": height };
	}
	return {
		"width": Math.floor( width / record.screenData.font.width ) *
			record.screenData.font.width,
		"height": Math.floor( height / record.screenData.font.height ) *
			record.screenData.font.height
	};
}

function getWindowBounds( record ) {
	const parentData = getScreenDataById( record.parentScreenId );
	return { "width": parentData.view.width, "height": parentData.view.height };
}

function getMinimumSize( record ) {
	const fontWidth = record.screenData.font.width;
	const fontHeight = record.screenData.font.height;
	let width;
	let height;
	if( record.border === "none" ) {
		width = 1;
		height = fontHeight + 1;
	} else {
		width = fontWidth * 3;
		height = fontHeight * 3;
	}

	for( const element of record.screenData.vis.elements ) {
		if( element.type !== "window" ) {
			continue;
		}
		const childMinimum = getMinimumSize( element );
		const requiredClientWidth = childMinimum.width + getShadowExtent( element );
		const requiredClientHeight = childMinimum.height + getShadowExtent( element );
		const horizontalInset = record.border === "none" ? 0 : fontWidth * 2;
		const verticalInset = record.border === "none" ? fontHeight : fontHeight * 2;
		width = Math.max( width, horizontalInset + requiredClientWidth );
		height = Math.max( height, verticalInset + requiredClientHeight );
	}
	if( record.border !== "none" ) {
		width = snapDimension( width, fontWidth, "ceil", fontWidth * 3 );
		height = snapDimension( height, fontHeight, "ceil", fontHeight * 3 );
	}
	return { "width": width, "height": height };
}

function getShadowExtent( record ) {
	return record.shadow ? SHADOW_SIZE : 0;
}

function getScreenDataById( id ) {
	return g_pluginApi.getAllScreensData().find( ( screenData ) => screenData.id === id ) || null;
}

function getRootData( screenData ) {
	let rootData = screenData;
	while( rootData && rootData.isOffscreen && rootData.vis.element ) {
		rootData = getScreenDataById( rootData.vis.element.parentScreenId );
	}
	return rootData;
}

function renderRootForRecord( record ) {
	const parentData = getScreenDataById( record.parentScreenId );
	const rootData = getRootData( parentData );
	if( rootData ) {
		renderRootData( rootData );
	}
}

function renderRootData( rootData ) {
	const activeData = g_pluginApi.getActiveScreen( "window.render" );
	const api = g_pluginApi.getApi();
	try {
		api.setScreen( rootData.id );
		api.vis.render();
	} finally {
		if( activeData && getScreenDataById( activeData.id ) ) {
			api.setScreen( activeData.id );
		}
	}
}

function validateGeometryValue( command, name, value ) {
	if( !Number.isInteger( value ) ) {
		const error = new TypeError( `${command}: Parameter ${name} must be an integer.` );
		error.code = "INVALID_WINDOW_GEOMETRY";
		throw error;
	}
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

	const activeData = g_pluginApi.getActiveScreen( "window.render" );
	try {
		record.screen.cls();
		drawChrome( record );
		if( record.onRender ) {
			record.onRender( record.screen );
		}
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
	} finally {
		if( activeData && getScreenDataById( activeData.id ) ) {
			g_pluginApi.getApi().setScreen( activeData.id );
		}
	}
}

/**
 * Build and draw window chrome without emitting transparent interior glyphs
 *
 * @param {Object} record - Window element record
 * @returns {void}
 */
function drawChrome( record ) {
	const screen = record.screen;
	const screenData = record.screenData;
	const fontWidth = screenData.font.width;
	const fontHeight = screenData.font.height;
	const layout = calculateWindowLayout(
		screenData, record.border, record.width, record.height, "nearest"
	);
	const columns = layout.columns;
	const rows = layout.rows;
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

		const chrome = {
			"top": top.join( "" ),
			"vertical": null,
			"bottom": null
		};
		if( glyphs ) {
			chrome.vertical = String.fromCharCode( glyphs[ 3 ] );
			chrome.bottom =
				String.fromCharCode( glyphs[ 4 ] ) +
					horizontal.repeat( Math.max( columns - 2, 0 ) ) +
					String.fromCharCode( glyphs[ 5 ] );
		}
		record.chrome = chrome;
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
	screen.print( record.chrome.top, true );
	if( glyphs ) {
		for( let row = 1; row < rows - 1; row += 1 ) {
			screen.setPosPx( 0, row * fontHeight );
			screen.print( record.chrome.vertical, true );
			screen.setPosPx( ( columns - 1 ) * fontWidth, row * fontHeight );
			screen.print( record.chrome.vertical, true );
		}
		screen.setPosPx( 0, ( rows - 1 ) * fontHeight );
		screen.print( record.chrome.bottom, true );
	}
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
