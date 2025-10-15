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
commands.addCommand( "loadImage", loadImage, [ "url", "name", "onLoad", "onError" ] );
function loadImage( options ) {
	const url = options.url;
	const name = options.name;
	const onLoad = options.onLoad;
	const onError = options.onError;

	if( typeof url !== "string" || url === "" ) {
		const error = new TypeError( "loadImage: Parameter url must be a non-empty string." );
		error.code = "INVALID_URL";
		throw error;
	}

	if( typeof name !== "string" || name === "" ) {
		const error = new TypeError( "loadImage: Parameter name must be a non-empty string." );
		error.code = "INVALID_NAME";
		throw error;
	}

	// Validate callbacks if provided
	if( onLoad != null && !utils.isFunction( onLoad ) ) {
		const error = new TypeError( "loadImage: Parameter onLoad must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	if( onError != null && !utils.isFunction( onError ) ) {
		const error = new TypeError( "loadImage: Parameter onError must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	// Increment wait count for ready()
	commands.wait();

	const img = new Image();

	img.onload = function() {

		// Store the loaded image
		m_images[ name ] = {
			"image": img,
			"width": img.width,
			"height": img.height
		};

		// Call user callback if provided
		if( onLoad ) {
			onLoad( img );
		}

		// Decrement wait count
		commands.done();
	};

	img.onerror = function( error ) {

		// Call user error callback if provided
		if( onError ) {
			onError( error );
		}

		// Decrement wait count even on error
		commands.done();
	};

	img.src = url;
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

	// TODO: Implement full drawImage with rotation and anchors
	screenData.api.render();
	screenData.context.drawImage( m_images[ name ].image, x, y );
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/

