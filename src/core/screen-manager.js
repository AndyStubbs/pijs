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
let m_activeScreenData = null;
let m_resizeObserver = null;
const m_observedContainers = new Set();


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/

export { m_activeScreenData as activeScreenData };
export { WEBGL2_RENDER_MODE, CANVAS2D_RENDER_MODE };

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
		"aspect", "container", "isOffscreen", "isNoStyles", "resizeCallback", "useCanvas2d"
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

export function addScreenInitFunction( fn ) {
	m_screenDataInitFunctions.push( fn );
}

export function addScreenCleanupFunction( fn ) {
	m_screenDataCleanupFunctions.push( fn );
}


/***************************************************************************************************
 * Screen Command
 **************************************************************************************************/


function screen( options ) {

	// Validate resize callback
	if( options.resizeCallback != null && !g_utils.isFunction( options.resizeCallback ) ) {
		const error = new TypeError( "screen: Parameter resizeCallback must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	const screenData = {
		"id": m_nextScreenId,
		"useCanvas2d": !!options.useCanvas2d,
		"isOffscreen": !!options.isOffscreen,
		"isNoStyles": !!options.isNoStyles,
		"resizeCallback": options.resizeCallback,
		"api":  Object.create( SCREEN_API_PROTO ),
		"canvas": null,
		"width": null,
		"height": null,
		"container": null,
		"aspectData": null,
		"clientRect": null,
		"previousOffsetSize": null
	};

	// Force canvas2d use if not webgl2Capable
	if( !g_webgl2Renderer.isWebgl2Capable ) {
		screenData.useCanvas2d = true;
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

	// Force canvas2d if not capable of webgl2
	if( !g_webgl2Renderer.isWebgl2Capable ) {
		screenData.useCanvas2d = true;
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
		resizeScreen( screenData );
	}

	// Add all the screen commands to the screenData api
	for( const command of m_commandList ) {
		generateCommandWrapper( screenData, command );
	}

	// Assign screen to active screen
	m_activeScreenData = screenData;
	m_screens[ screenData.id ] = screenData;

	setupScreenRenderer( screenData );

	// Call init functions for all modules that need initialization
	for( const fn of m_screenDataInitFunctions ) {
		fn( screenData );
	}

	// Setup the initial font for the screen
	//screenData.api.setFont( screenData.font.id );

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

	// Apply image rendering value
	screenData.canvas.style.imageRendering = "pixelated";
	const imageRenderingValues = [ "pixelated", "crisp-edges", "-webkit-crisp-edges" ];
	for( let i = 1; i < imageRenderingValues; i += 1 ) {
		if( screenData.canvas.styles.imageRendering === imageRenderingValues[ i - 1 ] ) {
			break;
		}
		screenData.canvas.style.imageRendering = imageRenderingValues[ i ];
	}

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
}

function setupScreenRenderer( screenData ) {

	let webgl2Status = null;
	if( !screenData.useCanvas2d ) {
		webgl2Status = g_webgl2Renderer.initWebGL( screenData );
		
		// If webgl2 failed
		if( !webgl2Status ) {
			console.error( "Failed to create WebGL 2 canvas, falling back to canvas2d renderer" );
			
			screenData.useCanvas2d = true;
			
			// Need to resize screen because we webgl2canvas uses different canvas dimensions
			if( screenData.aspect !== ":" ) {
				resizeScreen( screenData );
			}
		}
	}

	// If webgl2 is not working or disabled then use canvas
	if( webgl2Status !== null ) {
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
 **************************************************************************************************/


// Remove the screen from the page and memory
function removeScreen( screenData ) {
	const screenId = screenData.id;

	// Cancel any inputs
	screenData.api.cancelInput();

	// Clear all events
	screenData.api.clearEvents();

	// Cleanup renderer
	screenData.renderer.cleanup( screenData );

	// Call cleanup functions for all modules that need cleanup
	for( const fn of m_screenDataCleanupFunctions ) {
		fn( screenData );
	}

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
	m_activeScreenData = m_screens[ screenId ];
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
function generateCommandWrapper( screenData, command ) {
	const paramCount = command.parameterNames.length;
	const params = command.parameterNames;

	if( paramCount === 0 ) {
		screenData.api[ command.name ] = () => {
			return command.fn( screenData, {} );
		};
	} else if( paramCount === 1 ) {
		const paramName = command.parameterNames[ 0 ];
		screenData.api[ command.name ] = ( a1 ) => {
			if( g_utils.isObjectLiteral( a1 ) ) {
				return command.fn( screenData, a1 );
			}
			return command.fn( screenData, { [ paramName ]: a1 } );
		};
	} else if( paramCount === 2 ) {
		screenData.api[ command.name ] = function( a1, a2 ) {
			const args = [ a1, a2 ].slice( 0, arguments.length );
			const options = g_utils.parseOptions( args, params );
			return command.fn( screenData, options );
		};
	} else if( paramCount === 3 ) {
		screenData.api[ command.name ] = function( a1, a2, a3 ) {
			const args = [ a1, a2, a3 ].slice( 0, arguments.length );
			const options = g_utils.parseOptions( args, params );
			return command.fn( screenData, options );
		};
	} else if( paramCount === 4 ) {
		screenData.api[ command.name ] = function( a1, a2, a3, a4 ) {
			const args = [ a1, a2, a3, a4 ].slice( 0, arguments.length );
			const options = g_utils.parseOptions( args, params );
			return command.fn( screenData, options );
		};
	} else {
		screenData.api[ command.name ] = function( a1, a2, a3, a4, a5, a6, a7, a8, a9, a10 ) {
			const args = [ a1, a2, a3, a4, a5, a6, a7, a8, a9, a10 ].slice( 0, arguments.length );
			const options = g_utils.parseOptions( args, params );
			return command.fn( screenData, options );
		};
	}
}


/***************************************************************************************************
 * Resize Screen
 **************************************************************************************************/


function resizeScreen( screenData ) {

	// Skip if screen is not visible or should not be resized
	if(
		screenData.isOffscreen ||
		screenData.isNoStyles ||
		screenData.canvas.offsetParent === null
	) {
		return;
	}

	// Get the previous size (if stored from last time)
	let fromSize = screenData.previousOffsetSize

	// Let the renderer adjust to the new size
	if( screenData.renderMode === CANVAS2D_RENDER_MODE && fromSize !== null ) {
		g_canvas2dRenderer.beforeResize( screenData, fromSize );
	}

	// If 100% canvas size mode
	if( screenData.aspectData.splitter !== "" ) {

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
	if( screenData.aspectData.isFixedSize ) {
		screenData.width = screenData.aspectData.width;
		screenData.height = screenData.aspectData.height;
	} else {

		// If using ratios or full 100% size then set screenData to css size
		if( screenData.splitter === "" || screenData.splitter === ":" ) {
			screenData.width = newCssWidth;
			screenData.height = newCssHeight;
		} else {

			// Extend mode -- only mode left is set setCanvasSize
		}
	}

	// Get the new size after resize
	const toSize = {
		"width": screenData.canvas.offsetWidth,
		"height": screenData.canvas.offsetHeight
	};

	// Let the renderer adjust to the new size
	if( screenData.renderMode === CANVAS2D_RENDER_MODE && fromSize !== null ) {
		g_canvas2dRenderer.afterResize( screenData, fromSize, toSize );
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

// Set canvas size based on aspect ratio
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
	if( screenData.useCanvas2d && splitter !== ":" ) {
		canvas.width = Math.min( width, MAX_CANVAS_DIMENSION );
		canvas.height = Math.min( height, MAX_CANVAS_DIMENSION );
	} else {

		// For ratio mode, set to CSS size
		canvas.width = Math.min( Math.floor( newCssWidth ), MAX_CANVAS_DIMENSION );
		canvas.height = Math.min( Math.floor( newCssHeight ), MAX_CANVAS_DIMENSION );
	}
}

// Get size of container
function getSize( element ) {
	return {
		"width": element.offsetWidth || element.clientWidth || element.width,
		"height": element.offsetHeight || element.clientHeight || element.height
	};
}
