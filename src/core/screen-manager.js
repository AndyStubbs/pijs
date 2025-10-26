/**
 * Pi.js - Screen Manager Core Module
 * 
 * Screen creation and management for Pi.js.
 * Creates canvas elements, manages multiple screens, handles aspect ratios.
 * 
 * @module core/screen-manager
 */

"use strict";

import * as g_commands from "./commands";
import * as g_utils from "./utils";
import * as g_webgl2Renderer from "./renderer-webgl2";
import * as g_canvas2dRenderer from "./renderer-canvas2d";

const WEBGL2_RENDER_MODE = "webgl2";
const CANVAS2D_RENDER_MODE = "canvas2d";
const MAX_CANVAS_DIMENSION = 16384;

const SCREEN_API_PROTO = { "screen": true };
const m_screens = {};
const m_commandList = [];
const m_screenDataItems = {};
const m_screenDataItemGetters = [];
const m_screenInternalCommands = [];
const m_screenDataInitFunctions = [];
const m_screenDataCleanupFunctions = [];


let m_nextScreenId = 0;
let m_activeScreen = null;
let m_resizeObserver = null;
const m_observedContainers = new Set();


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {

	// TODO: Add matchMedia to watch for DPR changes - if a user moves a browser to a new monitor
	// it could cause the canvas image to become blury, even if the actual CSS size of the canvas.
	// doesn't change.
	// matchMedia( `(resolution: ${dpr}dppx)` ).addEventListener( "change", resizeCanvases );

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
					resizeScreen( screenData );
				}
			}
		}
	} );

	// Add global external API Commands
	g_commands.addCommand( "screen", screen, [
		"aspect", "container", "isOffscreen", "noStyles", "resizeCallback"
	] );
	g_commands.addCommand( "setScreen", setScreen, [ "screen" ] );
	g_commands.addCommand( "getScreen", getScreen, [ "screenId" ] );

	// Add screen external API commands
	addCommand( "removeScreen", removeScreen, [] );
	addCommand( "width", width, [] );
	addCommand( "height", height, [] );
	addCommand( "canvas", canvas, [] );
}

export function addCommand( name, fn, parameterNames, screenOptional = false ) {

	// Add the command to the command list
	m_commandList.push( {
		"name": name,
		"fn": fn,
		"parameterNames": parameterNames,
		"screenOptional": screenOptional
	} );

	// Add the command to the global command list
	g_commands.addCommand( name, fn, parameterNames, true, screenOptional );
}

export function sortScreenCommands() {
	m_commandList.sort( ( a, b ) => a.name.localeCompare( b.name ) );
}

export function addScreenDataItem( name, val ) {
	m_screenDataItems[ name ] = val;
}

export function addScreenInternalCommands( name, fn ) {
	m_screenInternalCommands.push( { name, fn } );
}

export function addScreenDataItemGetter( name, fn ) {
	m_screenDataItemGetters.push( { name, fn } );
}

export function getActiveScreen() {
	return m_activeScreen;
}

export function addScreenInitFunction( fn ) {
	m_screenDataInitFunctions.push( fn );
}

export function addScreenCleanupFunction( fn ) {
	m_screenDataCleanupFunctions.push( fn );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// screen command
function screen( options ) {

	// Validate resize callback
	if( options.resizeCallback != null && !g_utils.isFunction( options.resizeCallback ) ) {
		const error = new TypeError( "screen: Parameter resizeCallback must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	// Parse aspect ratio
	if( typeof options.aspect === "string" && options.aspect !== "" ) {
		options.aspectData = parseAspect( options.aspect.toLowerCase() );
		if( !options.aspectData ) {
			const error = new Error( "screen: Parameter aspect is not valid." );
			error.code = "INVALID_ASPECT";
			throw error;
		}

		// If it's not a ratio validate the dimensions
		if( options.aspectData.splitter !== ":" ) {
			validateDimensions( options.aspectData.width, options.aspectData.height );
		}
	}

	// Create appropriate screen type
	let screenData = createScreen( options );

	// Add all the screen commands to the screenData api
	for( const command of m_commandList ) {
		processApiCommand( screenData, command );
	}

	// Assign screen to active screen
	m_activeScreen = screenData;
	m_screens[ screenData.id ] = screenData;

	// Setup the initial font for the screen
	//screenData.api.setFont( screenData.font.id );

	// Call init functions for all modules that need initialization
	for( const fn of m_screenDataInitFunctions ) {
		fn( screenData );
	}

	return screenData.api;
}

// Remove the screen from the page and memory
function removeScreen( screenData ) {
	const screenId = screenData.id;

	// Cancel any inputs
	screenData.api.cancelInput();

	// Clear all events
	screenData.api.clearEvents();

	// Store the screen ID before we start nullifying properties
	const createdDeletedMethodErrorFn = ( key, screenId ) => {
		screenData.api[ key ] = () => {
			const errorMessage = `Cannot call ${key}() on removed screen (id: ${screenId}). ` +
				`The screen has been removed from the page.`;
			const error = new TypeError( errorMessage );
			error.code = "DELETED_METHOD";
			throw error;
		};
	};

	// Replace all commands from screen object - prevents outside reference to screen from calling
	// screen functions on screen that doesn't exist
	for( const key in screenData.api ) {
		if( typeof screenData.api[ key ] === "function" ) {
			
			// Set the api method to a method that throws an error
			createdDeletedMethodErrorFn( key, screenId );
		}
	}

	// Remove the canvas from the page
	if( screenData.canvas && screenData.canvas.parentElement ) {
		screenData.canvas.parentElement.removeChild( screenData.canvas );
	}

	// Unobserve the container from the global resize observer if no other screens use it
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
	for( const internal of m_screenInternalCommands ) {
		screenData[ internal.name ] = null;
	}

	// If the current screen is the active screen then we should set the active screen to the next
	// screen available, or null if no screens remain.
	if( screenData === m_activeScreen ) {
		m_activeScreen = null;
		for( const i in m_screens ) {
			if( m_screens[ i ] !== screenData ) {
				m_activeScreen = m_screens[ i ];
				break;
			}
		}
	}

	// Call cleanup functions for all modules that need cleanup
	for( const fn of m_screenDataCleanupFunctions ) {
		fn( screenData );
	}

	// Delete the screen from the screens container
	delete m_screens[ screenId ];
}

// Set the active screen on pi
function setScreen( options ) {
	const screenObj = options.screen;
	let screenId;

	if( Number.isInteger( screenObj ) ) {
		screenId = screenObj;
	} else if( screenObj && Number.isInteger( screenObj.id ) ) {
		screenId = screenObj.id;
	}
	if( ! m_screens[ screenId ] ) {
		const error = new Error( "screen: Invalid screen." );
		error.code = "INVALID_SCREEN";
		throw error;
	}
	m_activeScreen = m_screens[ screenId ];
}

// Get screen
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

// width command
function width( screenData ) {
	return screenData.width;
}

// Height Command
function height( screenData ) {
	return screenData.height;
}

// Canvas Command
function canvas( screenData ) {
	return screenData.canvas;
}

// TODO: Consider simplifying api commands. This fancy processApiCommand is complex and it only
// saves 1 if statement per command call. It might be worth it to simplify it.


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Process api command
function processApiCommand( screenData, command ) {
	screenData.api[ command.name ] = ( ...args ) => {
		const options = g_utils.parseOptions( args, command.parameterNames );
		return command.fn( screenData, options );
	};
}

/**
 * Parses an aspect ratio string into an object containing width, height, and splitter information.
 * Supports "width:height", "widthxheight", "widtheheight", and "widthmheight" formats.
 *
 * @param {string} aspect The aspect ratio string to parse.
 * @returns {object|null} An object with width, height, splitter, and isMultiple properties, or 
 * 						  null if the input is invalid.
 */
function parseAspect( aspect ) {

	//const match = aspect.replaceAll( " ", "" ).match( /^(\d+)(:|x|e|m)(\d+)$/ );
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
		"isMultiple": splitter === "m" || splitter === "e",
	};
}

// Determines the type of screen to create and returns the created screen
function createScreen( options ) {
	if( options.isOffscreen ) {
		if( !options.aspectData ) {
			const error = new Error(
				"screen: You must supply an aspect ratio with exact dimensions " +
				"for offscreen screens."
			);
			error.code = "NO_ASPECT_OFFSCREEN";
			throw error;
		}
		if( options.aspectData.splitter !== "x" ) {
			const error = new Error(
				"screen: You must use aspect ratio with e(x)act pixel dimensions for offscreen" +
				"screens. For example: 320x200 for width of 320 and height of 200 pixels."
			);
			error.code = "INVALID_OFFSCREEN_ASPECT";
			throw error;
		}
		return createOffscreenCanvas( options );
	}

	// Get the container element from the dom if it's available
	if( typeof options.container === "string" ) {
		options.container = document.getElementById( options.container );
	} else if( !options.container ) {
		options.container = document.body;
	} else if( !g_utils.isDomElement( options.container ) ) {
		const error = new TypeError(
			"screen: Invalid argument container. Container must be a DOM element " +
			"or a string id of a DOM element."
		);
		error.code = "INVALID_CONTAINER";
		throw error;
	}

	// Return a no style screen
	if( options.noStyles ) {
		return createNoStyleCanvas( options );
	}

	// Return the default screen
	return createDefaultCanvas( options );
}

// Create offscreen canvas
function createOffscreenCanvas( options ) {

	// Add the canvas
	options.canvas = document.createElement( "canvas" );
	options.canvas.width = options.aspectData.width;
	options.canvas.height = options.aspectData.height;

	// Set additional options
	options.container = null;
	options.isOffscreen = true;
	options.isNoStyles = false;
	options.resizeCallback = null;
	options.previousOffsetSize = null;

	return createScreenData( options );
}

// Create screen with default styling
function createDefaultCanvas( options ) {

	// Create the canvases
	options.canvas = document.createElement( "canvas" );

	// Style the canvas
	options.canvas.tabIndex = 0;
	options.canvas.style.outline = "none";
	options.canvas.style.backgroundColor = "black";
	options.canvas.style.position = "absolute";

	// Apply image rendering value
	options.canvas.style.imageRendering = "pixelated";
	const imageRenderingValues = [ "pixelated", "crisp-edges", "-webkit-crisp-edges" ];
	for( let i = 1; i < imageRenderingValues; i += 1 ) {
		if( options.canvas.styles.imageRendering === imageRenderingValues[ i - 1 ] ) {
			break;
		}
		options.canvas.style.imageRendering = value;
	}

	// Check if the container is document.body
	let isContainerBody = false;
	if( options.container === document.body ) {
		isContainerBody = true;
		document.documentElement.style.height = "100%";
		document.documentElement.style.margin = "0";
		document.body.style.height = "100%";
		document.body.style.margin = "0";
		document.body.style.overflow = "hidden";
		options.canvas.style.left = "0";
		options.canvas.style.top = "0";
	}

	// Make sure container is not blank
	if( options.container.offsetHeight === 0 ) {
		options.container.style.height = "200px";
	}

	// Append canvas to container
	options.container.appendChild( options.canvas );

	if( options.aspectData ) {

		// Calculate container size
		const size = getSize( options.container );

		// Set the canvas size
		setCanvasSize( options.aspectData, options.canvas, size.width, size.height );

	} else {

		// If canvas is inside an element, use static position
		if( !isContainerBody ) {
			options.canvas.style.position = "static";
		}

		// Set canvas to fullscreen
		options.canvas.style.width = "100%";
		options.canvas.style.height = "100%";
		const size = getSize( options.canvas );
		options.canvas.width = Math.min( size.width, MAX_CANVAS_DIMENSION );
		options.canvas.height = Math.min( size.height, MAX_CANVAS_DIMENSION );
	}

	// Store initial offset size for resize callback
	options.previousOffsetSize = {
		"width": options.canvas.offsetWidth,
		"height": options.canvas.offsetHeight
	};

	// Create screen data first
	const screenData = createScreenData( options );

	// Add container to the global resize observer (only if not already observed)
	if( m_resizeObserver && options.container && !m_observedContainers.has( options.container ) ) {
		m_resizeObserver.observe( options.container );
		m_observedContainers.add( options.container );
	}

	return screenData;
}

// Create screen without styles
function createNoStyleCanvas( options ) {
	options.canvas = document.createElement( "canvas" );

	// Append canvas to container
	options.container.appendChild( options.canvas );

	// Add tabindex to canvas
	options.canvas.tabIndex = 0;

	if( options.aspectData && options.aspectData.splitter === "x" ) {

		// Set the canvases size to the exact sizes specified
		options.canvas.width = Math.min( options.aspectData.width, MAX_CANVAS_DIMENSION );
		options.canvas.height = Math.min( options.aspectData.height, MAX_CANVAS_DIMENSION );
	}

	// Store initial offset size for resize callback (not used for noStyles, but for consistency)
	options.previousOffsetSize = null;

	return createScreenData( options );
}

// Create the screen data object
function createScreenData( options ) {
	
	const screenApi = Object.create( SCREEN_API_PROTO );
	screenApi.id = m_nextScreenId;

	// Create the screen data object
	const screenData = {
		"id": m_nextScreenId,
		"canvas": options.canvas,
		"width": options.canvas.width,
		"height": options.canvas.height,
		"container": options.container,
		"aspectData": options.aspectData,
		"isOffscreen": options.isOffscreen,
		"isNoStyles": options.isNoStyles,
		"clientRect": options.canvas.getBoundingClientRect(),
		"resizeCallback": options.resizeCallback,
		"previousOffsetSize": options.previousOffsetSize || null,
		"api": screenApi
	};

	// Try WebGL2 first, fall back to Canvas2D
	const webgl2Status = g_webgl2Renderer.initWebGL( screenData );
	if( webgl2Status ) {
		screenData.renderMode = WEBGL2_RENDER_MODE;
		screenData.renderer = g_webgl2Renderer;
	} else {

		// Canvas2D renderer (fallback)
		const canvas2dStatus = g_canvas2dRenderer.initCanvas2D( screenData );
		if( !canvas2dStatus ) {
			const error = new Error( "screen: Failed to create rendering context." );
			error.code = "NO_RENDERING_CONTEXT";
			throw error;
		}

		screenData.renderMode = CANVAS2D_RENDER_MODE;
		screenData.renderer = g_canvas2dRenderer;
	}

	// Append additional items onto the screendata
	Object.assign( screenData, structuredClone( m_screenDataItems ) );

	// Append dynamic screendata items
	for( const itemGetter of m_screenDataItemGetters ) {
		screenData[ itemGetter.name ] = structuredClone( itemGetter.fn() );
	}

	// Append internal screen commands to screen data
	for( const cmd of m_screenInternalCommands ) {
		screenData[ cmd.name ] = cmd.fn;
	}

	// Additional setup for screen data
	m_nextScreenId += 1;
	options.canvas.dataset.screenId = screenData.id;
	
	return screenData;
}

// Set canvas size based on aspect ratio
function setCanvasSize( aspectData, canvas, maxWidth, maxHeight ) {
	let width = aspectData.width;
	let height = aspectData.height;
	const splitter = aspectData.splitter;
	let newWidth, newHeight;

	// If set size to exact multiple
	if( aspectData.isMultiple && splitter !== ":" ) {
		const factorX = Math.floor( maxWidth / width );
		const factorY = Math.floor( maxHeight / height );
		let factor = factorX > factorY ? factorY : factorX;
		if( factor < 1 ) {
			factor = 1;
		}
		newWidth = width * factor;
		newHeight = height * factor;

		// Extending the canvas to match container size
		if( splitter === "e" ) {
			width = Math.floor( maxWidth / factor );
			height = Math.floor( maxHeight / factor );
			newWidth = width * factor;
			newHeight = height * factor;
		}
	} else {

		// Calculate the screen ratios
		const ratio1 = height / width;
		const ratio2 = width / height;
		newWidth = maxHeight * ratio2;
		newHeight = maxWidth * ratio1;

		// Calculate the best fit
		if( newWidth > maxWidth ) {
			newWidth = maxWidth;
			newHeight = newWidth * ratio1;
		} else {
			newHeight = maxHeight;
		}

		// Extending canvas
		if( splitter === "e" ) {
			width += Math.round( ( maxWidth - newWidth ) * ( width / newWidth ) );
			height += Math.round( ( maxHeight - newHeight ) * ( height / newHeight ) );
			newWidth = maxWidth;
			newHeight = maxHeight;
		}
	}

	// Set the size
	canvas.style.width = Math.floor( newWidth ) + "px";
	canvas.style.height = Math.floor( newHeight ) + "px";

	// Set the margins
	canvas.style.marginLeft = Math.floor( ( maxWidth - newWidth ) / 2 ) + "px";
	canvas.style.marginTop = Math.floor( ( maxHeight - newHeight ) / 2 ) + "px";

	// Set the actual canvas dimensions
	if( splitter !== ":" ) {
		canvas.width = Math.min( width, MAX_CANVAS_DIMENSION );
		canvas.height = Math.min( height, MAX_CANVAS_DIMENSION );
	} else {

		// For ratio mode, set to container size
		canvas.width = Math.min( Math.floor( newWidth ), MAX_CANVAS_DIMENSION );
		canvas.height = Math.min( Math.floor( newHeight ), MAX_CANVAS_DIMENSION );
	}
}

// Get size of container
function getSize( element ) {
	return {
		"width": element.offsetWidth || element.clientWidth || element.width,
		"height": element.offsetHeight || element.clientHeight || element.height
	};
}

// Resizes a single screen
function resizeScreen( screenData ) {

	// Skip if screen is not visible or should not be resized
	if(
		screenData.isOffscreen ||
		screenData.isNoStyles ||
		screenData.canvas.offsetParent === null
	) {
		return;
	}

	// Get the previous size (stored from last time)
	const fromSize = screenData.previousOffsetSize || {
		"width": screenData.canvas.offsetWidth,
		"height": screenData.canvas.offsetHeight
	};

	// Let the renderer adjust to the new size
	if( screenData.renderMode === CANVAS2D_RENDER_MODE ) {
		g_canvas2dRenderer.beforeResize( screenData, fromSize );
	}

	let size;

	if( screenData.aspectData ) {

		// Update the canvas to the new size
		size = getSize( screenData.container );
		setCanvasSize( screenData.aspectData, screenData.canvas, size.width, size.height );

	} else {

		// Update canvas to fullscreen absolute pixels
		size = getSize( screenData.canvas );
		screenData.canvas.width = Math.min( size.width, MAX_CANVAS_DIMENSION );
		screenData.canvas.height = Math.min( size.height, MAX_CANVAS_DIMENSION );

	}

	// Resize the client rectangle
	screenData.clientRect = screenData.canvas.getBoundingClientRect();

	// Set the new screen size
	screenData.width = screenData.canvas.width;
	screenData.height = screenData.canvas.height;

	// Get the new size after resize
	const toSize = {
		"width": screenData.canvas.offsetWidth,
		"height": screenData.canvas.offsetHeight
	};

	// Let the renderer adjust to the new size
	if( screenData.renderMode === CANVAS2D_RENDER_MODE ) {
		g_canvas2dRenderer.afterResize( screenData, fromSize, toSize );
	}

	// Send the resize data to the client
	if( screenData.resizeCallback ) {
		if(
			fromSize.width !== toSize.width ||
			fromSize.height !== toSize.height
		) {
			screenData.resizeCallback( screenData.api, fromSize, toSize );
		}
	}

	// Store the new size for next time
	screenData.previousOffsetSize = toSize;
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
