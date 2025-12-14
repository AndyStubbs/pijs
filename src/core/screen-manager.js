/**
 * Pi.js - Screen Manager Core Module
 * 
 * Screen creation and management for Pi.js.
 * Creates canvas elements, manages multiple screens, handles aspect ratios.
 * WebGL2 only - no Canvas2D fallback.
 * 
 * @module core/screen-manager
 */

/**
 * IDEA:
 * 
 * Simplify "m" multiple mode to use this formula:
 * scaleX = floor(canvas.width / FBO_WIDTH)
 * scaleY = floor(canvas.height / FBO_HEIGHT)
 * finalScale = min(scaleX, scaleY)
 *  
 * Even when I use "m" mode I still see artifacts, maybe handle the upscaling manually by setting
 * the canvas.width and canvas.height to match the CSS width and height and then when I copy the
 * FBO to the canvas it will apply gl.NEAREST when display to canvas is run, this is already 
 * implemented I just need to set canvas.width and canvas.height to match.
 * 
 * I did a test 640m480 and even it still has pixels that are uneven in size some pixels are 2x2,
 * other pixels are 1x2. Even with a css resolution of 1280x960 still resulted in uneven pixel
 * sizes.
 * 
 * My main reason for letting CSS handle upscaling was I liked being able to copy and paste the
 * image and get the image with target resolution. But a work-around could be adding a copy
 * image that command that copies the canvas to clipboard.
 * 
 * IDEA:
 * 
 * Add a hardPalette flag to the screen command. When set it adds a hard requirement on palette
 * colors. This means that only colors from the palette can be used.
 * 
 * Need to find an optimal solution to enforce the hardPalette flag and to update FBO when palette
 * changes. I can try adding a 1D array or texture with color lookups and try to do it in the
 * shader. If I have to I can do a CPU filter on the colors when palette changes, but this is not
 * optimal. I can also enforce the colors in the color lookups but that would require more
 * complex code in multiple places.  Need to really think about a good strategy for this.
 */
"use strict";

import * as g_utils from "./utils.js";
import * as g_commands from "./commands.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_graphics from "../api/graphics.js";

const SCREEN_API_PROTO = { "screen": true, "id": 0 };
const m_screens = {};
const m_screenCanvasMap = new Map();
const m_screenDataItems = {};
const m_screenDataItemGetters = [];
const m_screenDataInitFunctions = [];
const m_screenDataCleanupFunctions = [];
const MAX_CANVAS_DIMENSION = 8192;
const m_observedContainers = new Set();

let m_nextScreenId = 0;
let m_activeScreenData = null;
let m_resizeObserver = null;
let m_offscreenCanvas = null;


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


export { m_activeScreenData as activeScreenData };
export { m_screenCanvasMap as screenCanvasMap };

export function init( api ) {

	// TODO-LATER: Add matchMedia to watch for DPR changes

	// Create a single ResizeObserver for all screen containers
	m_resizeObserver = new ResizeObserver( ( entries ) => {
		for( const entry of entries ) {
			const container = entry.target;
			
			// Find all canvas elements in this container
			const canvases = container.querySelectorAll( "canvas[data-screen-id]" );
			if( canvases.length === 0 ) {
				continue;
			}
			
			// Resize all screens in this container
			for( const canvas of canvases ) {
				const screenId = parseInt( canvas.dataset.screenId, 10 );
				const screenData = m_screens[ screenId ];
				
				if( screenData ) {
					resizeScreen( screenData, false );
				}
			}
		}
	} );

	registerCommands();

	// Special command removeScreen
	api.removeScreen = ( screenId ) => {
		if( Object.getPrototypeOf( screenId ) === SCREEN_API_PROTO ) {
			screenId = screenId.id;
		}
		if( m_screens[ screenId ] ) {
			return removeScreen( m_screens[ screenId ] );
		}
	};

	// Add screenObj remove screen command
	addScreenInitFunction( ( screenData ) => {
		screenData.api.removeScreen = () => removeScreen( screenData );
	} );
}

function registerCommands() {

	// Global commands
	g_commands.addCommand(
		"screen", screen, false, [ "aspect", "container", "isOffscreen", "resizeCallback" ]
	);
	g_commands.addCommand( "setScreen", setScreen, false, [ "screen" ] );
	g_commands.addCommand( "getScreen", getScreen, false, [ "screenId" ] );
	g_commands.addCommand( "getAllScreens", getAllScreens, false, [] );
	g_commands.addCommand( "removeAllScreens", removeAllScreens, false, [] );

	// Screen-scoped info commands
	g_commands.addCommand( "width", widthCmd, true, [] );
	g_commands.addCommand( "height", heightCmd, true, [] );
	g_commands.addCommand( "canvas", canvasCmd, true, [] );
}

export function addScreenDataItem( name, val ) {
	m_screenDataItems[ name ] = val;
}

export function addScreenDataItemGetter( name, fn ) {
	m_screenDataItemGetters.push( { name, fn } );
}

export function addScreenInitFunction( fn ) {
	m_screenDataInitFunctions.push( fn );
}

export function addScreenCleanupFunction( fn ) {
	m_screenDataCleanupFunctions.push( fn );
}

export function getActiveScreen( fnName, isScreenOptional ) {
	if( m_activeScreenData === null && !isScreenOptional ) {
		const error = new Error(
			fnName + ": You are attempting to call a method that requires a screen but there " +
			"there is currently no active screen. Call $.screen() before calling any graphics " +
			"commands."
		);
		error.code = "NO_ACTIVE_SCREEN";
		throw error;
	}
	return m_activeScreenData;
}

export function getScreenData( fnName, screenId ) {
	if( !m_screens[ screenId ] ) {
		const error = new Error( `${fnName}: Invalid screen id.` );
		error.code = "INVALID_SCREEN_ID";
		throw error;
	}
	return m_screens[ screenId ];
}

/**
 * Get all active screens
 * 
 * @returns {Array<Object>} Array of all screen data objects
 */
export function getAllScreensData() {
	const screens = [];
	for( const id in m_screens ) {
		screens.push( m_screens[ id ] );
	}
	return screens;
}


/***************************************************************************************************
 * Screen Command
 ***************************************************************************************************/


function screen( options ) {

	// Validate resize callback
	if( options.resizeCallback != null && !g_utils.isFunction( options.resizeCallback ) ) {
		const error = new TypeError( "screen: Parameter resizeCallback must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	// Validate aspect - "Now Required"
	if( typeof options.aspect !== "string" || options.aspect === "" ) {
		const error = new Error( "screen: Parameter aspect must be a non-empty string." );
		error.code = "INVALID_ASPECT";
		throw error;
	}

	const screenData = {
		"id": m_nextScreenId,
		"isOffscreen": !!options.isOffscreen,
		"resizeCallback": options.resizeCallback,
		"api": Object.create( SCREEN_API_PROTO ),
		"canvas": null,
		"width": null,
		"height": null,
		"container": null,
		"aspectData": null,
		"clientRect": null,
		"previousOffsetSize": null
	};

	screenData.api.id = screenData.id;

	// Append additional items onto the screendata
	Object.assign( screenData, structuredClone( m_screenDataItems ) );

	// Append dynamic screendata items (items with dynamic defaults)
	for( const itemGetter of m_screenDataItemGetters ) {
		screenData[ itemGetter.name ] = structuredClone( itemGetter.fn() );
	}

	// Increment to the next screen id
	m_nextScreenId += 1;

	// Parse aspect ratio
	screenData.aspectData = parseAspect( options.aspect.toLowerCase() );
	if( !screenData.aspectData ) {
		const error = new Error( "screen: Parameter aspect is not valid." );
		error.code = "INVALID_ASPECT";
		throw error;
	}

	// If it's not a ratio validate the dimensions
	validateDimensions( screenData.aspectData.width, screenData.aspectData.height );

	// Setup options for offscreen canvas
	if( screenData.isOffscreen ) {

		// Create a shared canvas for offscreen screens
		if( !m_offscreenCanvas ) {
			m_offscreenCanvas = document.createElement( "canvas" );
		}

		// Create a mock canvas for offscreen screen
		screenData.canvas = {
			"isMock": true,
			"canvas": m_offscreenCanvas,
			"dataset": { "screenId": screenData.id },
			"width": screenData.aspectData.width,
			"height": screenData.aspectData.height,
			"style": {}
		};

		if( screenData.aspectData.splitter !== "x" ) {
			const error = new Error(
				"screen: You must use aspect ratio with e(x)act pixel dimensions for offscreen " +
				"screens. For example: 320x200 for width of 320 and height of 200 pixels."
			);
			error.code = "INVALID_OFFSCREEN_ASPECT";
			throw error;
		}
		setupOffscreenCanvasOptions( screenData );
		screenData.width = screenData.aspectData.width;
		screenData.height = screenData.aspectData.height;
	} else {

		// Create the canvas
		screenData.canvas = document.createElement( "canvas" );
		screenData.canvas.dataset.screenId = screenData.id;

		// Setup options for onscreen canvas
		screenData.canvas.tabIndex = 0;

		// Get the container element from the dom if it's available
		if( typeof options.container === "string" ) {
			screenData.container = document.getElementById( options.container );
		} else if( !options.container ) {
			screenData.container = document.body;
		} else {
			screenData.container = options.container;
		}

		if( !g_utils.isDomElement( screenData.container ) ) {
			const error = new TypeError(
				"screen: Invalid argument container. Container must be a DOM element or a string " +
				"id of a DOM element."
			);
			error.code = "INVALID_CONTAINER";
			throw error;
		}

		// Create a default canvas
		setDefaultCanvasOptions( screenData );

		// Append the canvas to the container
		screenData.container.appendChild( screenData.canvas );

		// Add container to the global resize observer (only if not already observed)
		if(
			m_resizeObserver && screenData.container &&
			!m_observedContainers.has( screenData.container )
		) {
			m_resizeObserver.observe( screenData.container );
			m_observedContainers.add( screenData.container );
		}
	}

	// Map the canvas to the screenData
	m_screenCanvasMap.set( screenData.canvas, screenData );
	
	if( !screenData.isOffscreen ) {
		resizeScreen( screenData, true );
	}

	// Assign screen to active screen
	m_activeScreenData = screenData;
	m_screens[ screenData.id ] = screenData;

	// Setup WebGL2 renderer
	g_renderer.createContext( screenData )

	// Call init functions for all modules that need initialization
	for( const fn of m_screenDataInitFunctions ) {
		fn( screenData );
	}

	return screenData.api;
}

function parseAspect( aspect ) {
	const match = aspect.replaceAll( " ", "" ).match( /^(\d+)(x|e|m)(\d+)$/ );
	if( !match ) {
		return null;
	}

	const width = Number( match[ 1 ] );
	const splitter = match[ 2 ];
	const height = Number( match[ 3 ] );

	if( isNaN( width ) || width === 0 || isNaN( height ) || height === 0 ) {
		return null;
	}

	return {
		"width": width,
		"height": height,
		"splitter": splitter,
		"isFixedSize": splitter !== "e"
	};
}

function setupOffscreenCanvasOptions( screenData ) {
	screenData.canvas.width = screenData.aspectData.width;
	screenData.canvas.height = screenData.aspectData.height;
	screenData.container = null;
	screenData.isOffscreen = true;
	screenData.resizeCallback = null;
	screenData.previousOffsetSize = null;
}

function setDefaultCanvasOptions( screenData ) {
	screenData.canvas.style.outline = "none";
	screenData.canvas.style.backgroundColor = "black";
	screenData.canvas.style.position = "absolute";
	screenData.canvas.style.imageRendering = "pixelated";

	// Check if the container is document.body
	if( screenData.container === document.body ) {
		document.documentElement.style.height = "100%";
		document.documentElement.style.margin = "0";
		document.documentElement.style.padding = "0";
		document.body.style.height = "100%";
		document.body.style.margin = "0";
		document.body.style.padding = "0";
		screenData.canvas.style.left = "0";
		screenData.canvas.style.top = "0";
	}

	// No scrolling within a container as canvases fit to size of container and are meant to 
	// overlap. If scrolling is required use an outer container that scrolls.
	screenData.container.style.overflow = "hidden";

	// Make sure container is not blank
	if( screenData.container.offsetHeight === 0 ) {
		screenData.container.style.height = "200px";
	}
}

function validateDimensions( width, height ) {
	if( width <= 0 || height <= 0 ) {
		const error = new Error( "screen: Canvas dimensions must be positive." );
		error.code = "INVALID_DIMENSIONS";
		throw error;
	}
	if( width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION ) {
		const error = new Error(
			`screen: Canvas dimensions exceed maximum of ${MAX_CANVAS_DIMENSION}px.`
		);
		error.code = "DIMENSION_TOO_LARGE";
		throw error;
	}
}


/**************************************************************************************************
 * Other External API Commands
 **************************************************************************************************/


function removeAllScreens() {
	const allScreenDatas = getAllScreensData();
	for( const screenData of allScreenDatas ) {
		removeScreen( screenData );
	}
}

function removeScreen( screenData ) {

	// Get the id for reference
	const screenId = screenData.id;

	// Call cleanup functions for all modules that need cleanup
	for( const fn of m_screenDataCleanupFunctions ) {
		fn( screenData );
	}

	// Replace all commands from screen object
	for( const key in screenData.api ) {
		if( typeof screenData.api[ key ] === "function" ) {

			// Use string replacement to avoid capturing screenData in closure
			screenData.api[ key ] = () => {
				const error = new TypeError( 
					`Cannot call ${key}() on removed screen (id: ${screenId}). ` +
					`The screen has been removed from the page.`
				);
				error.code = "DELETED_METHOD";
				throw error;
			};
		}
	}

	// Remove from the screenCanvasMap
	m_screenCanvasMap.delete( screenData.canvas );

	// Remove the canvas from the page
	if( screenData.canvas && screenData.canvas.parentElement ) {
		screenData.canvas.parentElement.removeChild( screenData.canvas );
	}

	// Unobserve the container from the global resize observer
	if( screenData.container && m_observedContainers.has( screenData.container ) ) {
		
		// Check if any other screens are using this container
		let hasOtherScreens = false;
		for( const id in m_screens ) {
			const otherScreen = m_screens[ id ];
			if( otherScreen !== screenData && otherScreen.container === screenData.container ) {
				hasOtherScreens = true;
				break;
			}
		}
		
		// Only unobserve if no other screens are using this container
		if( !hasOtherScreens ) {
			m_resizeObserver.unobserve( screenData.container );
			m_observedContainers.delete( screenData.container );
		}
	}

	// Clean up all references to prevent memory leaks
	screenData.canvas = null;
	screenData.commands = null;
	screenData.resizeCallback = null;
	screenData.container = null;
	screenData.aspectData = null;
	screenData.clientRect = null;
	screenData.previousOffsetSize = null;

	// Remove additional screenData items
	for( const i in m_screenDataItems ) {
		screenData[ i ] = null;
	}
	for( const getter of m_screenDataItemGetters ) {
		screenData[ getter.name ] = null;
	}

	// If the current screen is the active screen then set to next screen available
	if( screenData === m_activeScreenData ) {
		m_activeScreenData = null;
		for( const i in m_screens ) {
			if( m_screens[ i ] !== screenData ) {
				m_activeScreenData = m_screens[ i ];
				break;
			}
		}
	}

	// Delete the screen from the screens container
	delete m_screens[ screenId ];
}

function setScreen( options ) {
	const screenObj = options.screen;
	let screenId;

	if( Number.isInteger( screenObj ) ) {
		screenId = screenObj;
	} else if( screenObj && Number.isInteger( screenObj.id ) ) {
		screenId = screenObj.id;
	}
	if( !m_screens[ screenId ] ) {
		const error = new Error( "screen: Invalid screen." );
		error.code = "INVALID_SCREEN";
		throw error;
	}

	// Note: there is no need to check if m_activeScreenData is null because it cannot be null
	// unless there are no screens in which case an error would already have been thrown.
	const previousScreenId = m_activeScreenData.id;
	m_activeScreenData = m_screens[ screenId ];

	if( previousScreenId !== m_activeScreenData.id  ) {
		g_graphics.buildApi( m_activeScreenData );
	}
}

function getScreen( options ) {
	const screenId = g_utils.getInt( options.screenId, null );
	if( screenId === null || screenId < 0 ) {
		const error = new Error( "screen: Invalid screen id." );
		error.code = "INVALID_SCREEN_ID";
		throw error;
	}
	const screen = m_screens[ screenId ];
	if( !screen ) {
		const error = new Error( `screen: Screen "${screenId}" not found.` );
		error.code = "SCREEN_NOT_FOUND";
		throw error;
	}
	return screen.api;
}

function getAllScreens() {
	const screens = [];
	for( const id in m_screens ) {
		screens.push( m_screens[ id ].api );
	}
	return screens;
}

function widthCmd( screenData ) {
	return screenData.width;
}

function heightCmd( screenData ) {
	return screenData.height;
}

function canvasCmd( screenData ) {
	if( screenData.isOffscreen ) {
		console.warn(
			"Offscreen screens use a shared canvas that draws to textures to simulate an " +
			"offscreen canvas. The canvas returned is that shared canvas. Proceed with caution " +
			"changes to this canvas could cause unexpected results." 
		);
		return screenData.canvas.canvas;
	}
	return screenData.canvas;
}


/***************************************************************************************************
 * Resize Screen
 ***************************************************************************************************/


function resizeScreen( screenData, isInit ) {

	// Skip if screen is not visible or should not be resized
	if( screenData.isOffscreen || screenData.canvas.offsetParent === null ) {
		return;
	}

	// Get the previous size (if stored from last time)
	let fromSize = screenData.previousOffsetSize;

	// Track previous screenData dimensions for "e"xtend mode
	const lastScreenWidth = screenData.width;
	const lastScreenHeight = screenData.height;

	// Update the canvas to the new size
	const size = getSize( screenData.container );
	setCanvasSize( screenData, size.width, size.height );

	// Resize the client rectangle
	screenData.clientRect = screenData.canvas.getBoundingClientRect();

	// Get the new size after resize
	const toSize = {
		"width": screenData.canvas.offsetWidth,
		"height": screenData.canvas.offsetHeight
	};

	if( !isInit ) {

		// Handle "e"xtend mode resize the renderer
		if( lastScreenWidth !== screenData.width || lastScreenHeight !== screenData.height ) {
			g_renderer.resizeScreen( screenData, lastScreenWidth, lastScreenHeight );
		}
	}
	
	// Send the resize data to the client
	if( screenData.resizeCallback ) {
		if(
			fromSize !== null &&
			( fromSize.width !== toSize.width || fromSize.height !== toSize.height )
		) {
			screenData.resizeCallback( screenData.api, fromSize, toSize );
		}
	}

	// Store the new size for next time
	screenData.previousOffsetSize = toSize;
}

function setCanvasSize( screenData, maxWidth, maxHeight ) {
	const aspectData = screenData.aspectData;
	const canvas = screenData.canvas;
	let width = aspectData.width;
	let height = aspectData.height;
	const splitter = aspectData.splitter;
	let newCssWidth, newCssHeight;

	// If set size to multiple or extend
	if( splitter === "m" || splitter === "e" ) {
		const factorX = Math.floor( maxWidth / width );
		const factorY = Math.floor( maxHeight / height );
		let factor = factorX > factorY ? factorY : factorX;
		if( factor < 1 ) {
			factor = 1;
		}
		newCssWidth = width * factor;
		newCssHeight = height * factor;

		// Extending the canvas to match container size
		if( splitter === "e" ) {
			width = Math.floor( maxWidth / factor );
			height = Math.floor( maxHeight / factor );
			newCssWidth = width * factor;
			newCssHeight = height * factor;
		}
	} else {

		// Calculate the screen ratios
		const ratio1 = height / width;
		const ratio2 = width / height;
		newCssWidth = maxHeight * ratio2;
		newCssHeight = maxWidth * ratio1;

		// Calculate the best fit
		if( newCssWidth > maxWidth ) {
			newCssWidth = maxWidth;
			newCssHeight = newCssWidth * ratio1;
		} else {
			newCssHeight = maxHeight;
		}
	}

	// Set screen data width/height
	screenData.width = width;
	screenData.height = height;

	// Set the size
	canvas.style.width = Math.floor( newCssWidth ) + "px";
	canvas.style.height = Math.floor( newCssHeight ) + "px";

	// Set the margins
	canvas.style.marginLeft = Math.floor( ( maxWidth - newCssWidth ) / 2 ) + "px";
	canvas.style.marginTop = Math.floor( ( maxHeight - newCssHeight ) / 2 ) + "px";

	// Set the actual canvas pixel dimensions
	// TODO-LATER: Change size to css size and use custom upscaling - needs testing
	// canvas.width = Math.min( Math.floor( newCssWidth ), MAX_CANVAS_DIMENSION );
	// canvas.height = Math.min( Math.floor( newCssHeight ), MAX_CANVAS_DIMENSION );
	canvas.width = Math.min( width, MAX_CANVAS_DIMENSION );
	canvas.height = Math.min( height, MAX_CANVAS_DIMENSION );
}

function getSize( element ) {
	return {
		"width": element.offsetWidth || element.clientWidth || element.width,
		"height": element.offsetHeight || element.clientHeight || element.height
	};
}

