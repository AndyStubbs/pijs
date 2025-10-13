/**
 * Pi.js - Screen Module
 * 
 * Screen creation and management for Pi.js.
 * Creates canvas elements, manages multiple screens, handles aspect ratios.
 * 
 * @module modules/screen
 */

"use strict";

import * as commands from "./commands";
import * as utils from "./utils";

const m = {
	"nextScreenId": 0,
	"screens": {},
	"activeScreen": null,
	"commandList": [],
	"commands": {},
	"screenDataItems": {}
};

commands.addCommand( "screen", screen );

/**
 * Add a command to the screen
 * 
 * @param {string} name - Command name
 * @param {Function} fn - Command function
 */
export function addScreenCommand( name, fn ) {
	m.commandList.push( {
		"name": name,
		"fn": fn
	} );
}

/**
 * Sort the screen commands by name
 */
export function sortScreenCommands() {
	m.commandList.sort( ( a, b ) => a.name.localeCompare( b.name ) );
}

/**
 * 
 * @param {string} name - Name of data item
 * @param {*} val - Default value of the data item
 */
export function addScreenDataItem( name, val ) {
	m.screenDataItems[ name ] = val;
}

function screen( ...args ) {
	const options = utils.parseOptions( args, [
		"aspect", "container", "isOffscreen", "willReadFrequently", "noStyles", "resizeCallback"
	] );
	
	// Validate resize callback
	if( options.resizeCallback != null && !utils.isFunction( options.resizeCallback ) ) {
		const error = new TypeError( "screen: resizeCallback must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	// Parse aspect ratio
	if( typeof options.aspect === "string" && options.aspect !== "" ) {
		options.aspectData = parseAspect( aspect.toLowerCase() );
		if( !options.aspectData ) {
			const error = new Error( "screen: invalid value for aspect." );
			error.code = "INVALID_ASPECT";
			throw error;
		}
	}

	// Create appropriate screen type
	let screenData;

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
	} else {

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

		if( options.noStyles ) {
			screenData = createNoStyleScreen( options );
		} else {
			screenData = createScreen( options );
		}
	}

	// Add all the screen commands to the screenData api
	for( const command of m.commandList ) {
		screenData.api[ command.name ] = command.name;
	}

	return screenData.api;
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
function createScreen( options ) {

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
		"id": m.nextScreenId,
		"canvas": options.canvas,
		"width": options.canvas.width,
		"height": options.canvas.height,
		"container": options.container,
		"aspectData": options.aspectData,
		"isOffscreen": options.isOffscreen,
		"isNoStyles": options.isNoStyles,
		"context": options.canvas.getContext( "2d", contextAttributes ),
		"bufferCanvas": options.bufferCanvas,
		"bufferContext": options.bufferContext,
		"clientRect": options.canvas.getBoundingClientRect(),
		"resizeCallback": options.resizeCallback,
		"api": {
			"id": m.nextScreenId,
			"screen": true
		}
	};

	// Append additional items onto the screendata
	Object.assign( screenData, structuredClone( m.screenDataItems ) );

	// Additional setup for screen data
	m.nextScreenId += 1;
	m.activeScreen = screenData;
	options.canvas.dataset.screenId = screenData.id;
	screenData.context.imageSmoothingEnabled = false;
	m.screens[ screenData.id ] = screenData;

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
