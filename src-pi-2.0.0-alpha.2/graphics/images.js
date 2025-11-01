/**
 * Pi.js - Images Module
 * 
 * Image loading, storage, and management for both WebGL2 and Canvas2D renderers.
 * Uses WeakMaps for efficient image-to-texture mapping.
 * 
 * @module graphics/images
 */

"use strict";

// Import modules directly
import * as g_utils from "../core/utils.js";
import * as g_state from "../core/state-settings.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_webgl2Renderer from "./renderer-webgl2.js";

// Image storage by name
const m_images = {};
let m_imageCount = 0;

// WeakMap for Canvas2D image storage (for compatibility)
// Maps Image/Canvas elements to themselves - allows unified access pattern
// even though Canvas2D can use images directly
const m_canvas2dImages = new WeakMap();


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init( api ) {
	registerCommands();
}

function registerCommands() {

	// Register non-screen commands
	g_state.addCommand(
		"loadImage", loadImage, false, [ "src", "name", "onLoad", "onError" ]
	);

	// Register screen commands
	g_state.addCommand(
		"drawImage", drawImage, true,
		[ "name", "x", "y", "angle", "anchorX", "anchorY", "alpha", "scaleX", "scaleY" ]
	);
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


/**
 * Load an image from URL or use provided Image/Canvas element
 * 
 * @param {Object} options - Load options
 * @param {string|HTMLImageElement|HTMLCanvasElement} options.src - Image source
 * @param {string} [options.name] - Optional name for the image
 * @param {Function} [options.onLoad] - Callback when image loads
 * @param {Function} [options.onError] - Callback when image fails to load
 * @returns {string} Image name
 */
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
	if( onLoadCallback != null && !g_utils.isFunction( onLoadCallback ) ) {
		const error = new TypeError( "loadImage: Parameter onLoad must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	if( onErrorCallback != null && !g_utils.isFunction( onErrorCallback ) ) {
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
			"type": "image",
			"image": img,
			"width": img.width,
			"height": img.height
		};

		// Register in WeakMaps (renderers will create textures when needed)
		registerImageForRenderers( img );

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
	g_state.wait();

	img.onload = function() {

		// Store the loaded image
		m_images[ name ] = {
			"status": "ready",
			"type": "image",
			"image": img,
			"width": img.width,
			"height": img.height
		};

		// Register in WeakMaps (renderers will create textures when needed)
		registerImageForRenderers( img );

		// Call user callback if provided
		if( onLoadCallback ) {
			onLoadCallback( img );
		}

		// Decrement wait count
		g_state.done();
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
		g_state.done();
	};

	// Set source - may trigger onload synchronously if cached
	img.src = src;

	return name;
}

/**
 * Draw an image on the screen
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Draw options
 * @param {string|Object} options.name - Image name, screen object, or Image/Canvas element
 * @param {number} options.x - X coordinate
 * @param {number} options.y - Y coordinate
 * @param {number} [options.angle] - Rotation angle in degrees
 * @param {number} [options.anchorX] - Anchor point X (0-1)
 * @param {number} [options.anchorY] - Anchor point Y (0-1)
 * @param {number} [options.alpha] - Alpha value (0-255)
 * @param {number} [options.scaleX] - Scale X
 * @param {number} [options.scaleY] - Scale Y
 */
function drawImage( screenData, options ) {
	const name = options.name;
	let x = options.x || 0;
	let y = options.y || 0;
	let angle = options.angle;
	let anchorX = options.anchorX;
	let anchorY = options.anchorY;
	let alpha = options.alpha;
	let scaleX = options.scaleX;
	let scaleY = options.scaleY;

	let img;

	// Resolve image from name parameter
	if( typeof name === "string" ) {

		// Handle string image name
		const imageData = getStoredImage( name );
		if( !imageData ) {
			const error = new Error( `drawImage: Image "${name}" not found.` );
			error.code = "IMAGE_NOT_FOUND";
			throw error;
		}

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

		img = imageData.image;
	} else if( name && typeof name === "object" ) {

		// Handle screen API object
		if( name.screen === true ) {
			if( typeof name.canvas === "function" ) {
				img = name.canvas();
			} else {
				img = name.canvas;
			}
			if( !img ) {
				const error = new Error( "drawImage: Screen has no canvas." );
				error.code = "INVALID_SCREEN";
				throw error;
			}
		} else if( name.tagName === "CANVAS" || name.tagName === "IMG" ) {

			// Handle Canvas or Image element
			img = name;
		} else {
			const error = new TypeError(
				"drawImage: Parameter name must be a string, screen object, Canvas element, " +
				"or Image element."
			);
			error.code = "INVALID_NAME";
			throw error;
		}
	} else {
		const error = new TypeError(
			"drawImage: Parameter name must be a string, screen object, Canvas element, " +
			"or Image element."
		);
		error.code = "INVALID_NAME";
		throw error;
	}

	// Validate coordinates
	if( isNaN( x ) || isNaN( y ) ) {
		const error = new TypeError( "drawImage: Parameters x and y must be numbers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	// Default values
	if( scaleX == null || isNaN( Number( scaleX ) ) ) {
		scaleX = 1;
	}
	if( scaleY == null || isNaN( Number( scaleY ) ) ) {
		scaleY = 1;
	}
	if( angle == null ) {
		angle = 0;
	}
	if( anchorX == null ) {
		anchorX = 0;
	}
	if( anchorY == null ) {
		anchorY = 0;
	}
	if( alpha == null && alpha !== 0 ) {
		alpha = 255;
	}

	// Convert angle from degrees to radians
	const angleRad = g_utils.degreesToRadian( angle );

	// Draw using renderer-specific implementation
	screenData.renderer.drawImage(
		screenData, img, x, y, angleRad, anchorX, anchorY, alpha, scaleX, scaleY
	);
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


/**
 * Register an image in WeakMap for Canvas2D renderer access
 * 
 * @param {HTMLImageElement|HTMLCanvasElement} img - Image or Canvas element
 */
function registerImageForRenderers( img ) {

	// For Canvas2D, just store reference to image itself
	// Canvas2D can use Image/Canvas elements directly
	m_canvas2dImages.set( img, img );

	// For WebGL2, texture will be created on-demand by renderer-webgl2.getWebGL2Texture()
	// No need to create it here to avoid creating textures for images that may never be used
}

/**
 * Get Canvas2D image reference
 * 
 * @param {HTMLImageElement|HTMLCanvasElement} img - Image or Canvas element
 * @returns {HTMLImageElement|HTMLCanvasElement|null} Image or Canvas element or null
 */
export function getCanvas2DImage( img ) {
	return m_canvas2dImages.get( img ) || img;
}

/**
 * Get stored image by name
 * 
 * @param {string} name - Image name
 * @returns {Object|null} Image data object or null if not found
 */
export function getStoredImage( name ) {
	if( typeof name !== "string" ) {
		return null;
	}
	return m_images[ name ] || null;
}

/**
 * Remove an image from storage
 * 
 * @param {string} name - Image name
 */
export function removeImage( name ) {
	if( typeof name !== "string" ) {
		return;
	}

	const imageData = m_images[ name ];
	if( imageData && imageData.image ) {

		const img = imageData.image;

		// Explicitly delete WebGL2 textures to free GPU memory
		// WebGLTextures hold GPU memory that is NOT automatically freed by JS garbage collection
		// Must call gl.deleteTexture() explicitly to prevent memory leaks
		g_webgl2Renderer.deleteWebGL2Texture( img );

		// Canvas2D doesn't need explicit cleanup - it just references the image element

		delete m_images[ name ];
	}
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/

