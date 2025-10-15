/**
 * Pi.js - Images Module
 * 
 * Image loading, sprites, and spritesheet management
 * 
 * @module modules/images
 */

"use strict";

import * as commands from "../core/commands";
import * as screenManager from "../core/screen-manager";
import * as utils from "../core/utils";

const m_images = {};
let m_imageCount = 0;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize images module
export function init() {

	// No initialization needed
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// loadImage command
commands.addCommand( "loadImage", loadImage, [ "src", "name", "onLoad", "onError" ] );
function loadImage( options ) {
	const src = options.src;
	let name = options.name;
	const onLoadCallback = options.onLoad;
	const onErrorCallback = options.onError;
	const srcErrMsg = "loadImage: Parameter src must be a string URL, Image element, or Canvas " +
		"element.";

	// Validate src parameter - can be string URL, Image element, or Canvas element
	if( typeof src === "string" ) {
		if( src === "" ) {
			const error = new TypeError( srcErrMsg );
			error.code = "INVALID_SRC";
			throw error;
		}
	} else if( src && typeof src === "object" ) {
		if( src.tagName !== "IMG" && src.tagName !== "CANVAS" ) {
			const error = new TypeError( srcErrMsg );
			error.code = "INVALID_SRC";
			throw error;
		}
	} else {
		const error = new TypeError( srcErrMsg );
		error.code = "INVALID_SRC";
		throw error;
	}

	if( name && typeof name !== "string" ) {
		const error = new TypeError( "loadImage: Parameter name must be a string." );
		error.code = "INVALID_NAME";
		throw error;
	}

	// Generate a name if none is provided
	if( !name || name === "" ) {
		m_imageCount += 1;
		name = "" + m_imageCount;
	}

	if( m_images[ name ] ) {
		const error = new TypeError( "loadImage: Parameter name must be unique." );
		error.code = "INVALID_NAME";
		throw error;
	}

	// Validate callbacks if provided
	if( onLoadCallback != null && !utils.isFunction( onLoadCallback ) ) {
		const error = new TypeError( "loadImage: Parameter onLoad must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	if( onErrorCallback != null && !utils.isFunction( onErrorCallback ) ) {
		const error = new TypeError( "loadImage: Parameter onError must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	let img;

	// Handle Image or Canvas element passed directly
	if( typeof src !== "string" ) {

		// Use the element directly
		img = src;

		// Store immediately since element is already loaded
		m_images[ name ] = {
			"status": "ready",
			"image": img,
			"width": img.width,
			"height": img.height
		};

		// Call user callback if provided
		if( onLoadCallback ) {
			onLoadCallback( img );
		}

		return name;
	}

	// Handle string URL - requires async loading
	m_images[ name ] = { "status": "loading" };

	img = new Image();

	// Set up handlers before setting src
	// Increment wait count for ready() - will be decremented in onload/onerror
	commands.wait();

	img.onload = function() {

		// Store the loaded image
		m_images[ name ] = {
			"status": "ready",
			"image": img,
			"width": img.width,
			"height": img.height
		};

		// Call user callback if provided
		if( onLoadCallback ) {
			onLoadCallback( img );
		}

		// Decrement wait count
		commands.done();
	};

	img.onerror = function( error ) {

		// Mark image as failed
		m_images[ name ] = {
			"status": "error",
			"error": error
		};

		// Call user error callback if provided
		if( onErrorCallback ) {
			onErrorCallback( error );
		}

		// Decrement wait count even on error
		commands.done();
	};

	// Set source - may trigger onload synchronously if cached
	img.src = src;

	return name;
}

// drawImage command (stub for now)
screenManager.addCommand( "drawImage", drawImage, [ "name", "x", "y", "rotation", "anchorX", "anchorY" ] );
function drawImage( screenData, options ) {
	const name = options.name;
	const x = options.x || 0;
	const y = options.y || 0;

	if( !m_images[ name ] ) {
		const error = new Error( `drawImage: Image "${name}" not found. Did you forget to load it?` );
		error.code = "IMAGE_NOT_FOUND";
		throw error;
	}

	const imageData = m_images[ name ];

	if( imageData.status === "loading" ) {
		const error = new Error(
			`drawImage: Image "${name}" is still loading. Use $.ready() to wait for it.`
		);
		error.code = "IMAGE_NOT_READY";
		throw error;
	}

	if( imageData.status === "error" ) {
		const error = new Error( `drawImage: Image "${name}" failed to load.` );
		error.code = "IMAGE_LOAD_FAILED";
		throw error;
	}

	// TODO: Implement full drawImage with rotation and anchors
	screenData.api.render();
	screenData.context.drawImage( imageData.image, x, y );
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/

