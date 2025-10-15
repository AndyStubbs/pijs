/**
 * Pi.js - Screen Manager Module
 * 
 * Screen creation and management for Pi.js.
 * Creates canvas elements, manages multiple screens, handles aspect ratios.
 * 
 * @module core/screen-manager
 */

"use strict";

import * as commands from "./commands";
import * as utils from "./utils";

const m_screens = {};
const m_commandList = [];
const m_pixelCommands = {};
const m_aaCommands = {};
const m_screenDataItems = {};
const m_screenDataItemGetters = [];
const m_screenInternalCommands = [];

let m_nextScreenId = 0;
let m_activeScreen = null;
let m_defaultInputFocus = window;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {
	
	// Add event listener to resize all the screens
	window.addEventListener( "resize", resizeScreens );
}

/**
 * Add a command to the screen
 * 
 * @param {string} name - Command name
 * @param {Function} fn - Command function
 * @param {Array} parameterNames - List of parameter names.
 */
export function addCommand( name, fn, parameterNames ) {

	// Add the command to the command list
	m_commandList.push( {
		"name": name,
		"fn": fn,
		"parameterNames": parameterNames
	} );

	// Add the command to the global command list
	commands.addCommand( name, fn, parameterNames, true );
}

/**
 * Add a pixel command to the commands
 * 
 * @param {string} name - Command name
 * @param {Function} fn - Command function
 * @param {Array} parameterNames - List of parameter names.
 */
export function addPixelCommand( name, fn, parameterNames ) {

	const cmd = {
		"name": name,
		"fn": fn,
		"parameterNames": parameterNames,
		"isScreen": true
	};

	// Add the command to the command list
	m_commandList.push( cmd );

	// Add the command to the global command list
	commands.addCommand( name, fn, parameterNames, true );
	
	// Add the command to the pixel command list
	m_pixelCommands[ name ] = cmd;

}

/**
 * Add an AA command to the screen
 * 
 * @param {string} name - Command name
 * @param {Function} fn - Command function
 * @param {Array} parameterNames - List of parameter names.
 */
export function addAACommand( name, fn, parameterNames ) {

	const cmd = {
		"name": name,
		"fn": fn,
		"parameterNames": parameterNames,
		"isScreen": true
	};

	// Add the command to the pixel command list
	m_aaCommands[ name ] = cmd;
}

/**
 * Sort the screen commands by name
 */
export function sortScreenCommands() {
	m_commandList.sort( ( a, b ) => a.name.localeCompare( b.name ) );
}

/**
 * @param {string} name - Name of data item
 * @param {*} val - Default value of the data item
 */
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


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// screen command
commands.addCommand( "screen", screen, [
	"aspect", "container", "isOffscreen", "willReadFrequently", "noStyles", "resizeCallback"
] );
function screen( options ) {

	// Validate resize callback
	if( options.resizeCallback != null && !utils.isFunction( options.resizeCallback ) ) {
		const error = new TypeError( "screen: resizeCallback must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	// Parse aspect ratio
	if( typeof options.aspect === "string" && options.aspect !== "" ) {
		options.aspectData = parseAspect( options.aspect.toLowerCase() );
		if( !options.aspectData ) {
			const error = new Error( "screen: invalid value for aspect." );
			error.code = "INVALID_ASPECT";
			throw error;
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

	return screenData.api;
}

// Remove the screen from the page and memory
commands.addCommand( "removeScreen", removeScreen, [] );
function removeScreen( screenData ) {
	const screenId = screenData.id;

	// TODO: uncomment out cancelInput once input is created
	//screenData.api.cancelInput();

	// Store the screen ID before we start nullifying properties
	const errorMessage = `Cannot call {METHOD}() on removed screen (id: ${screenId}). ` +
		`The screen has been removed from the page.`;

	// Replace all commands from screen object - prevents outside reference to screen from calling
	// screen functions on screen that doesn't exist
	for( const key in screenData.api ) {
		if( typeof screenData.api[ key ] === "function" ) {

			// Use string replacement to avoid capturing screenData in closure
			screenData.api[ key ] = () => {
				throw new Error( errorMessage.replace( "{METHOD}", key ) );
			};
		}
	}

	// Remove the canvas from the page
	if( screenData.canvas && screenData.canvas.parentElement ) {
		screenData.canvas.parentElement.removeChild( screenData.canvas );
	}

	// Clean up all references to prevent memory leaks
	screenData.canvas = null;
	screenData.bufferCanvas = null;
	screenData.context = null;
	screenData.bufferContext = null;
	screenData.commands = null;
	screenData.resizeCallback = null;
	screenData.container = null;
	screenData.aspectData = null;
	screenData.clientRect = null;

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

	// Delete the screen from the screens container
	delete m_screens[ screenId ];
}

// TODO: Maybe just set the input focus on either the container or canvas and have input confined
// to the screen. Worth considering.
// setDefaultInputFocus
commands.addCommand( "setDefaultInputFocus", setDefaultInputFocus, [ "element" ] );
function setDefaultInputFocus( options ) {
	let element = options.element;

	if( element === m_defaultInputFocus ) {
		return;
	}

	if( typeof element === "string" ) {
		element = document.getElementById( element );
	}

	if( !element || !utils.canAddEventListeners( element ) ) {
		const error = new TypeError(
			"setDefaultInputFocus: Invalid argument element. " +
			"Element must be a DOM element or string id of a DOM element."
		);
		error.code = "INVALID_ELEMENT";
		throw error;
	}

	if( !( element.tabIndex >= 0 ) ) {
		element.tabIndex = 0;
	}

	// Update input focus
	m_defaultInputFocus = element;

	// TODO: Add this keyboard reinit once keyboard is implemented
	// Reinitialize keyboard if command exists
	//if( piData.commands[ "reinitKeyboard" ] ) {
	//	piData.commands[ "reinitKeyboard" ]();
	//}
}

// Set the active screen on pi
commands.addCommand( "setScreen", setScreen, [ "screen" ] );
function setScreen( options ) {
	const screenObj = options.screen;
	let screenId;

	if( utils.isInteger( screenObj ) ) {
		screenId = screenObj;
	} else if( screenObj && utils.isInteger( screenObj.id ) ) {
		screenId = screenObj.id;
	}
	if( ! m_screens[ screenId ] ) {
		const error = new Error( "screen: Invalid screen." );
		error.code = "INVALID_SCREEN";
		throw error;
	}
	m_activeScreen = m_screens[ screenId ];
}

// width command
addCommand( "width", width, [] );
function width( screenData ) {
	return screenData.width;
}

// Height Command
addCommand( "height", height, [] );
function height( screenData ) {
	return screenData.height;
}

// Canvas Command
addCommand( "canvas", canvas, [] );
function canvas( screenData ) {
	return screenData.canvas;
}

// Set pixel mode command
addCommand( "setPixelMode", setPixelMode, [ "isEnabled" ] );
function setPixelMode( screenData, options ) {
	const isEnabled = options.isEnabled;

	if( isEnabled ) {
		screenData.context.imageSmoothingEnabled = false;
		for( const name in m_pixelCommands ) {
			processApiCommand( screenData, m_pixelCommands[ name ] );
			commands.processApiCommand( m_pixelCommands[ name ] );
		}
	} else {
		screenData.context.imageSmoothingEnabled = true;
		for( const name in m_aaCommands ) {
			processApiCommand( screenData, m_aaCommands[ name ] );
			commands.processApiCommand( m_aaCommands[ name ] );
		}
	}
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Process api command
function processApiCommand( screenData, command ) {
	screenData.api[ command.name ] = ( ...args ) => {
		const options = utils.parseOptions( args, command.parameterNames );
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
	const match = aspect.match( /^(\d+)(:|x|e|m)(\d+)$/ );

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
		"isMultiple": splitter === "m",
	};
}

// Determines the type of screen to create and returns the created screen
function createScreen( options ) {
	if( options.isOffscreen ) {
		if( !aspectData ) {
			const error = new Error(
				"screen: You must supply an aspect ratio with exact dimensions " +
				"for offscreen screens."
			);
			error.code = "NO_ASPECT_OFFSCREEN";
			throw error;
		}
		if( aspectData.splitter !== "x" ) {
			const error = new Error(
				"screen: You must use aspect ratio with e(x)act pixel dimensions for offscreen" +
				"screens. For example: 320x200 for width of 320 and height of 200 pixels."
			);
			error.code = "INVALID_OFFSCREEN_ASPECT";
			throw error;
		}
		screenData = createOffscreenScreen( options );
	}

	// Get the container element from the dom if it's available
	if( typeof options.container === "string" ) {
		options.container = document.getElementById( options.container );
	} else if( !options.container ) {
		options.container = document.body;
	} else if( !utils.isDomElement( options.container ) ) {
		const error = new TypeError(
			"screen: Invalid argument container. Container must be a DOM element " +
			"or a string id of a DOM element."
		);
		error.code = "INVALID_CONTAINER";
		throw error;
	}

	// Return a no style screen
	if( options.noStyles ) {
		return createNoStyleScreen( options );
	}

	// Return the default screen
	return createDefaultScreen( options );
}

// Create offscreen canvas
function createOffscreenScreen( options ) {

	// Add the canvas
	options.canvas = document.createElement( "canvas" );
	options.canvas.width = options.aspectData.width;
	options.canvas.height = options.aspectData.height;

	// Add the buffer canvas
	options.bufferCanvas = document.createElement( "canvas" );
	options.bufferCanvas.width = options.aspectData.width;
	options.bufferCanvas.height = options.aspectData.height;

	// Set additional options
	options.container = null;
	options.isOffscreen = true;
	options.isNoStyles = false;
	options.resizeCallback = null;

	return createScreenData( options );
}

// Create screen with default styling
function createDefaultScreen( options ) {

	// Create the canvases
	options.canvas = document.createElement( "canvas" );
	options.bufferCanvas = document.createElement( "canvas" );

	// Style the canvas
	options.canvas.style.backgroundColor = "black";
	options.canvas.style.position = "absolute";
	options.canvas.style.imageRendering = "pixelated";
	options.canvas.style.imageRendering = "crisp-edges";

	// Check if the container is document.body
	let isContainerBody = true;
	if( options.container === document.body ) {
		isContainerBody = false;
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

		// Set the buffer size
		options.bufferCanvas.width = options.canvas.width;
		options.bufferCanvas.height = options.canvas.height;
	} else {

		// If canvas is inside an element, use static position
		if( isContainerBody ) {
			options.canvas.style.position = "static";
		}

		// Set canvas to fullscreen
		options.canvas.style.width = "100%";
		options.canvas.style.height = "100%";
		const size = getSize( options.canvas );
		options.canvas.width = size.width;
		options.canvas.height = size.height;
		options.bufferCanvas.width = size.width;
		options.bufferCanvas.height = size.height;
	}

	return createScreenData( options );
}

// Create screen without styles
function createNoStyleScreen( options ) {
	options.canvas = document.createElement( "canvas" );
	options.bufferCanvas = document.createElement( "canvas" );

	// Append canvas to container
	options.container.appendChild( options.canvas );

	if( options.aspectData && options.aspectData.splitter === "x" ) {

		// Set the canvases size to the exact sizes specified
		options.canvas.width = options.aspectData.width;
		options.canvas.height = options.aspectData.height;
		options.bufferCanvas.width = options.canvas.width;
		options.bufferCanvas.height = options.canvas.height;
	} else {
		const size = getSize( options.canvas );
		options.bufferCanvas.width = size.width;
		options.bufferCanvas.height = size.height;
	}

	return createScreenData( options );
}

// Create the screen data object
function createScreenData( options ) {
	
	// Set the will read frequently attribute to improve speed of primative graphics
	const contextAttributes = { "willReadFrequently": !!options.willReadFrequently };

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
		"context": options.canvas.getContext( "2d", contextAttributes ),
		"bufferCanvas": options.bufferCanvas,
		"bufferContext": options.bufferCanvas.getContext( "2d", contextAttributes ),
		"clientRect": options.canvas.getBoundingClientRect(),
		"resizeCallback": options.resizeCallback,
		"api": {
			"id": m_nextScreenId,
			"screen": true
		}
	};

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
	screenData.context.imageSmoothingEnabled = false;

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
	if( splitter === "x" || splitter === "e" ) {
		canvas.width = width;
		canvas.height = height;
	} else {

		// For ratio mode, set to container size
		canvas.width = Math.floor( newWidth );
		canvas.height = Math.floor( newHeight );
	}
}

// Get size of container
function getSize( element ) {
	return {
		"width": element.offsetWidth || element.clientWidth || element.width,
		"height": element.offsetHeight || element.clientHeight || element.height
	};
}

// Resizes all screens
function resizeScreens() {
	for( const i in m_screens ) {
		const screenData = m_screens[ i ];

		// Skip if screen is not visible
		if(
			screenData.isOffscreen ||
			screenData.isNoStyles ||
			screenData.canvas.offsetParent === null
		) {
			continue;
		}

		// Store the previous size
		const fromSize = {
			"width": screenData.canvas.offsetWidth,
			"height": screenData.canvas.offsetHeight
		};

		// Draw the canvas to the buffer
		screenData.bufferContext.clearRect( 0, 0, screenData.width, screenData.height );
		screenData.bufferContext.drawImage( screenData.canvas, 0, 0 );

		let size;

		if( screenData.aspectData ) {

			// Update the canvas to the new size
			size = getSize( screenData.container );
			setCanvasSize( screenData.aspectData, screenData.canvas, size.width, size.height );

		} else {

			// Update canvas to fullscreen absolute pixels
			size = getSize( screenData.canvas );
			screenData.canvas.width = size.width;
			screenData.canvas.height = size.height;

		}

		// Resize the client rectangle
		screenData.clientRect = screenData.canvas.getBoundingClientRect();

		// Draw the buffer back onto the canvas
		screenData.context.drawImage(
			screenData.bufferCanvas, 0, 0, screenData.width, screenData.height
		);

		// Set the new buffer size
		screenData.bufferCanvas.width = screenData.canvas.width;
		screenData.bufferCanvas.height = screenData.canvas.height;

		// Set the new screen size
		screenData.width = screenData.canvas.width;
		screenData.height = screenData.canvas.height;

		// Send the resize data to the client
		if( screenData.resizeCallback ) {
			const toSize = {
				"width": screenData.canvas.offsetWidth,
				"height": screenData.canvas.offsetHeight
			};
			if(
				fromSize.width !== toSize.width ||
				fromSize.height !== toSize.height
			) {
				screenData.resizeCallback( fromSize, toSize );
			}
		}
	}
}