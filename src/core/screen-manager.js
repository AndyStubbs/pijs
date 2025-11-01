/**
 * Pi.js - Screen Manager Core Module
 * 
 * Screen creation and management for Pi.js.
 * Creates canvas elements, manages multiple screens, handles aspect ratios.
 * WebGL2 only - no Canvas2D fallback.
 * 
 * @module core/screen-manager
 */

"use strict";

import * as g_utils from "./utils.js";
import * as g_commands from "./commands.js";
import * as g_renderer from "../graphics/renderer/renderer.js";

const SCREEN_API_PROTO = { "screen": true };
const m_screens = {};
const m_screenDataItems = {};
const m_screenDataItemGetters = [];
const m_screenDataInitFunctions = [];
const m_screenDataResizeFunctions = [];
const m_screenDataCleanupFunctions = [];
const MAX_CANVAS_DIMENSION = 8192;

let m_nextScreenId = 0;
let m_activeScreenData = null;
let m_resizeObserver = null;
const m_observedContainers = new Set();


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


export { m_activeScreenData as activeScreenData };

export function init( api ) {

	// TODO: Add matchMedia to watch for DPR changes

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
}

function registerCommands() {

	// Global commands
	g_commands.addCommand(
		"screen",
		screen,
		false,
		[ "aspect", "container", "isOffscreen", "isNoStyles", "resizeCallback" ]
	);
	g_commands.addCommand( "setScreen", setScreen, false, [ "screen" ] );
	g_commands.addCommand( "getScreen", getScreen, false, [ "screenId" ] );
	g_commands.addCommand( "removeScreen", removeScreen, false, [ "screenId" ] );

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

export function addScreenResizeFunction( fn ) {
	m_screenDataResizeFunctions.push( fn );
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

/**
 * Get all active screens
 * 
 * @returns {Array<Object>} Array of all screen data objects
 */
export function getAllScreens() {
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

	const screenData = {
		"id": m_nextScreenId,
		"isOffscreen": !!options.isOffscreen,
		"isNoStyles": !!options.isNoStyles,
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

	// Append additional items onto the screendata
	Object.assign( screenData, structuredClone( m_screenDataItems ) );

	// Append dynamic screendata items (items with dynamic defaults)
	for( const itemGetter of m_screenDataItemGetters ) {
		screenData[ itemGetter.name ] = structuredClone( itemGetter.fn() );
	}

	// Increment to the next screen id
	m_nextScreenId += 1;

	if( !options.aspect ) {
		screenData.aspectData = {
			"width": null,
			"height": null,
			"splitter": "",
			"isFixedSize": false
		};
	}

	// Parse aspect ratio
	if( typeof options.aspect === "string" && options.aspect !== "" ) {
		screenData.aspectData = parseAspect( options.aspect.toLowerCase() );
		if( !screenData.aspectData ) {
			const error = new Error( "screen: Parameter aspect is not valid." );
			error.code = "INVALID_ASPECT";
			throw error;
		}

		// If it's not a ratio validate the dimensions
		if( screenData.aspectData.splitter !== ":" ) {
			validateDimensions( screenData.aspectData.width, screenData.aspectData.height );
		}
	}

	// Create the canvas
	screenData.canvas = document.createElement( "canvas" );

	// Setup options for offscreen canvas
	if( screenData.isOffscreen ) {
		if( !screenData.aspectData ) {
			const error = new Error(
				"screen: You must supply an aspect ratio with exact dimensions " +
				"for offscreen screens."
			);
			error.code = "NO_ASPECT_OFFSCREEN";
			throw error;
		}
		if( screenData.aspectData.splitter !== "x" ) {
			const error = new Error(
				"screen: You must use aspect ratio with e(x)act pixel dimensions for offscreen " +
				"screens. For example: 320x200 for width of 320 and height of 200 pixels."
			);
			error.code = "INVALID_OFFSCREEN_ASPECT";
			throw error;
		}
		setupOffscreenCanvasOptions( screenData );
	} else {

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

		// Create a no style canvas or default canvas
		if( !screenData.isNoStyles ) {
			setDefaultCanvasOptions( screenData );
		}

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
	
	if( !screenData.isOffscreen ) {
		resizeScreen( screenData, true );
	}

	// Assign screen to active screen
	m_activeScreenData = screenData;
	m_screens[ screenData.id ] = screenData;

	// Setup WebGL2 renderer
	setupScreenRenderer( screenData );

	// Call init functions for all modules that need initialization
	for( const fn of m_screenDataInitFunctions ) {
		fn( screenData );
	}

	return screenData.api;
}

function parseAspect( aspect ) {

	const match = aspect.replaceAll( " ", "" ).match( /^(\d+(?:\.\d+)?)(:|x|e|m)(\d+(?:\.\d+)?)$/ );
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
		"isFixedSize": splitter === "m" || splitter === "x"
	};
}

function setupOffscreenCanvasOptions( screenData ) {
	screenData.canvas.width = screenData.aspectData.width;
	screenData.canvas.height = screenData.aspectData.height;
	screenData.container = null;
	screenData.isOffscreen = true;
	screenData.isNoStyles = false;
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
		document.body.style.height = "100%";
		document.body.style.margin = "0";
		document.body.style.overflow = "hidden";
		screenData.canvas.style.left = "0";
		screenData.canvas.style.top = "0";
	}

	// Make sure container is not blank
	if( screenData.container.offsetHeight === 0 ) {
		screenData.container.style.height = "200px";
	}
}

function setupScreenRenderer( screenData ) {

	// WebGL2 only - no fallback
	const webgl2Status = g_renderer.createContext( screenData );
	
	// If webgl2 failed, throw error
	if( !webgl2Status ) {
		const error = new Error( "screen: Failed to create WebGL2 context. WebGL2 is required." );
		error.code = "NO_RENDERING_CONTEXT";
		throw error;
	}

	// Store renderer reference
	screenData.renderer = g_renderer;
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


/***************************************************************************************************
 * Other External API Commands
 ***************************************************************************************************/


function removeScreen( options ) {

	let screenId = options.id;

	// Fail silently - user may want redundancy without try/catch block
	if( !m_screens[ screenId ] ) {
		return;
	}

	const screenData = m_screens[ screenId ];

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
	m_activeScreenData = m_screens[ screenId ];
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

function widthCmd( screenData ) {
	return screenData.width;
}

function heightCmd( screenData ) {
	return screenData.height;
}

function canvasCmd( screenData ) {
	return screenData.canvas;
}


/***************************************************************************************************
 * Resize Screen
 ***************************************************************************************************/


function resizeScreen( screenData, isInit ) {

	// Skip if screen is not visible or should not be resized
	if(
		screenData.isOffscreen ||
		screenData.isNoStyles ||
		screenData.canvas.offsetParent === null
	) {
		return;
	}

	// Get the previous size (if stored from last time)
	let fromSize = screenData.previousOffsetSize;

	// If Not 100% canvas size mode
	if( screenData.aspectData && screenData.aspectData.splitter !== "" ) {

		// Update the canvas to the new size
		const size = getSize( screenData.container );
		setCanvasSize( screenData, size.width, size.height );

	} else {

		if( screenData.container === document.body ) {
			screenData.canvas.style.position = "static";
		}

		// Update canvas to fullscreen absolute pixels
		screenData.canvas.style.width = "100%";
		screenData.canvas.style.height = "100%";
		const size = getSize( screenData.canvas );
		screenData.canvas.width = Math.min( size.width, MAX_CANVAS_DIMENSION );
		screenData.canvas.height = Math.min( size.height, MAX_CANVAS_DIMENSION );
	}

	// Resize the client rectangle
	screenData.clientRect = screenData.canvas.getBoundingClientRect();

	// Set the new screen data size
	if( screenData.aspectData && screenData.aspectData.isFixedSize ) {
		screenData.width = screenData.aspectData.width;
		screenData.height = screenData.aspectData.height;
	} else {

		// If using ratios or full 100% size then set screenData to css size
		if( !screenData.aspectData || screenData.aspectData.splitter === "" || screenData.aspectData.splitter === ":" ) {
			screenData.width = screenData.canvas.width;
			screenData.height = screenData.canvas.height;
		} else {

			// Extend mode
			// TODO: Figure out what to put here if anything
		}
	}

	// Get the new size after resize
	const toSize = {
		"width": screenData.canvas.offsetWidth,
		"height": screenData.canvas.offsetHeight
	};

	if( !isInit ) {

		// TODO: Let the renderer adjust to the new size
		// if( g_renderer ) {
		// 	g_renderer.handleResize( screenData, fromSize, toSize );
		// }

		// Call resize functions for all modules that need special handling on resize
		for( const fn of m_screenDataResizeFunctions ) {
			fn( screenData );
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

			// Set screen data width/height here
			screenData.width = width;
			screenData.height = height;
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

	// Set the size
	canvas.style.width = Math.floor( newCssWidth ) + "px";
	canvas.style.height = Math.floor( newCssHeight ) + "px";

	// Set the margins
	canvas.style.marginLeft = Math.floor( ( maxWidth - newCssWidth ) / 2 ) + "px";
	canvas.style.marginTop = Math.floor( ( maxHeight - newCssHeight ) / 2 ) + "px";

	// Set the actual canvas pixel dimensions
	if( splitter !== ":" ) {
		canvas.width = Math.min( width, MAX_CANVAS_DIMENSION );
		canvas.height = Math.min( height, MAX_CANVAS_DIMENSION );
	} else {

		// For ratio mode, set to CSS size
		canvas.width = Math.min( Math.floor( newCssWidth ), MAX_CANVAS_DIMENSION );
		canvas.height = Math.min( Math.floor( newCssHeight ), MAX_CANVAS_DIMENSION );
	}
}

function getSize( element ) {
	return {
		"width": element.offsetWidth || element.clientWidth || element.width,
		"height": element.offsetHeight || element.clientHeight || element.height
	};
}

