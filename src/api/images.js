/**
 * Pi.js - Images Module
 * 
 * Image loading, storage, and management for WebGL2 renderer.
 * 
 * @module api/images
 */

"use strict";

import * as g_utils from "../core/utils.js";
import * as g_commands from "../core/commands.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_colors from "./colors.js";

const DEFAULT_BLIT_COLOR = Object.freeze( g_utils.rgbToColor( 255, 255, 255, 255 ) );

// Image storage by name
const m_images = {};
const m_paletteImages = [];
let m_imageCount = 0;


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize images module
 * 
 * @param {Object} api - The main Pi.js API object
 * @returns {void}
 */
export function init( api ) {
	registerCommands( api );

	g_screenManager.addScreenDataItem( "defaultAnchorX", 0 );
	g_screenManager.addScreenDataItem( "defaultAnchorY", 0 );
	g_screenManager.addScreenDataItem( "palImagesData", {} );

	// Palettize all images when screen is loaded
	g_screenManager.addScreenInitFunction( palettizeImages );
}

/**
 * Register image commands
 * 
 * @returns {void}
 */
function registerCommands( api ) {

	// Register non-screen commands
	g_commands.addCommand(
		"loadImage", loadImage, false,
		[ "src", "name", "usePalette", "paletteKeys", "onLoad", "onError" ]
	);
	g_commands.addCommand( "getImage", getImage,  true, [ "name" ], true );

	// Register screen commands
	g_commands.addCommand(
		"drawImage", drawImage, true,
		[ "image", "x", "y", "color", "anchorX", "anchorY", "scaleX", "scaleY", "angle" ]
	);

	// Special handling for blit image because it doesn't support object literal parsing
	api.blitImage = (
		img,
		x = 0,
		y = 0,
		color = DEFAULT_BLIT_COLOR,
		anchorX,
		anchorY,
		scaleX = 1,
		scaleY = 1,
		angleRad = 0
	) => {
		const screenData = g_screenManager.getActiveScreen( "setBlitImage" );
		const finalAnchorX = anchorX ?? screenData.defaultAnchorX;
		const finalAnchorY = anchorY ?? screenData.defaultAnchorY;
		g_renderer.drawImage(
			screenData, img, x, y, color, finalAnchorX, finalAnchorY, scaleX, scaleY, angleRad
		);
		g_renderer.setImageDirty( screenData );
	};

	// Add blitImage to screens when they get created
	g_screenManager.addScreenInitFunction( ( screenData ) => {
		screenData.api.blitImage = (
			img,
			x = 0,
			y = 0,
			color = DEFAULT_BLIT_COLOR,
			anchorX = screenData.defaultAnchorX,
			anchorY = screenData.defaultAnchorY,
			scaleX = 1,
			scaleY = 1,
			angleRad = 0
		) => {
			g_renderer.drawImage(
				screenData, img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad
			);
			g_renderer.setImageDirty( screenData );
		};
	} );
}


/***************************************************************************************************
 * External API Commands
 ***************************************************************************************************/


/**
 * Load an image from URL or use provided Image/Canvas element
 * 
 * @param {Object} options - Load options
 * @param {string|HTMLImageElement|HTMLCanvasElement} options.src - Image source
 * @param {string} [options.name] - Optional name for the image
 * @param {boolean} [options.usePalette] - Set image colors to be linked to screen canvas
 * @param {Array} [options.paletteKeys] - An array of colors used as key colors from the image to
 * 										  use as indices to look up palette colors
 * @param {Function} [options.onLoad] - Callback when image loads
 * @param {Function} [options.onError] - Callback when image fails to load
 * @returns {string} Image name
 */
function loadImage( options ) {
	const src = options.src;
	let name = options.name;
	const usePalette = !!options.usePalette;
	const paletteKeys = options.paletteKeys;
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

	// Validate name
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

	// Validate paletteKeys
	let palColors = null;
	let palColorMap = null;
	if( usePalette ) {
		if( !Array.isArray( paletteKeys ) || paletteKeys.length === 0 ) {
			const error = new TypeError(
				"loadImage: Parameter paletteKeys must be non empty Array when usePalette is set."
			);
			error.code = "INVALID_PALETTE";
			throw error;
		}

		// Create a color map
		palColorMap = new Map();

		// Initialize palColors with 0 for transparent black
		palColors = [ g_utils.convertToColor( "rgba(0, 0, 0, 0)" ) ];
		for( let i = 0; i < paletteKeys.length; i += 1 ) {
			const palColorRaw = paletteKeys[ i ];
			const palColor = g_utils.convertToColor( palColorRaw );
			palColors.push( palColor );
			palColorMap.set( palColor.key, i );
		}
	}

	// Create blank image object
	m_images[ name ] = {
		"status": "loading",
		"image": null,
		"width": null,
		"height": null,
		"usePal": usePalette,
		"palColors": palColors,
		"palColorMap": palColorMap
	};

	// Update function for when image is loaded to update the image object
	const updateImageFn = ( img ) => {

		// Use the element directly
		const imageObj = m_images[ name ];
		imageObj.image = img;
		imageObj.status = "ready";
		imageObj.width = img.width;
		imageObj.height = img.height;

		// If using palette then push the image to the use palette array
		if( imageObj.usePalette ) {
			addPaletteImage( name );
		}

		// Call user callback if provided
		if( onLoadCallback ) {
			onLoadCallback( name );
		}
	};

	// Handle Image or Canvas element passed directly
	if( typeof src !== "string" ) {

		// Use the element directly
		updateImageFn( src );
		return name;
	}

	// Create the new image
	const img = new Image();
	
	// Increment wait count for ready() - will be decremented in onload/onerror
	g_commands.wait();

	// Setup onload handler
	img.onload = function() {
		updateImageFn( img );

		// Decrement wait count
		g_commands.done();
	};

	// Setup onerror handler
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
		g_commands.done();
	};

	// Set source - may trigger onload synchronously if cached
	img.src = src;

	return name;
}

function getImage( screenData, options ) {
	return getImageFromRawInput( screenData, options.name, "getImage" );
}

/**
 * Draw an image on the screen
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Draw options
 * @param {string|Object} options.image - Image name, screen object, or Image/Canvas element
 * @param {number} options.x - X coordinate
 * @param {number} options.y - Y coordinate
 * @param {number} [options.color] - Raw color input
 * @param {number} [options.anchorX] - Anchor point X (0-1)
 * @param {number} [options.anchorY] - Anchor point Y (0-1)
 * @param {number} [options.scaleX] - Scale X
 * @param {number} [options.scaleY] - Scale Y
 * @param {number} [options.angle] - Rotation angle in degrees
 */
function drawImage( screenData, options ) {
	const imageRaw = options.image;
	const x = g_utils.getInt( options.x, null );
	const y = g_utils.getInt( options.y, null );
	const colorRaw = options.color ?? DEFAULT_BLIT_COLOR;
	const anchorX = g_utils.getFloat( options.anchorX, screenData.defaultAnchorX );
	const anchorY = g_utils.getFloat( options.anchorY, screenData.defaultAnchorY );
	const angle = g_utils.getFloat( options.angle, 0 );
	const scaleX = g_utils.getFloat( options.scaleX, 1 );
	const scaleY = g_utils.getFloat( options.scaleY, 1 );

	const img = getImageFromRawInput( screenData, imageRaw, "drawImage" );

	// Validate coordinates
	if( x === null || y === null ) {
		const error = new TypeError( "drawImage: Parameters x and y must be numbers." );
		error.code = "INVALID_PARAMETER_TYPE";
		throw error;
	}

	// Parses the color and makes sure it's in a valid format
	const color = g_colors.getColorValueByRawInput( screenData, colorRaw );

	// Convert angle from degrees to radians
	const angleRad = g_utils.degreesToRadian( angle );

	// Draw using renderer-specific implementation
	g_renderer.drawImage(
		screenData, img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad
	);

	// Mark screen as dirty
	g_renderer.setImageDirty( screenData );
}


/***************************************************************************************************
 * Internal Helper Functions
 ***************************************************************************************************/


function getImageFromRawInput( screenData, imageOrName, fnName ) {
	let img;

	// Resolve image from name parameter
	if( typeof imageOrName === "string" ) {

		// Handle string image name
		const imageData = getStoredImage( imageOrName );
		if( !imageData ) {
			const error = new Error( `${fnName}: Image "${imageOrName}" not found.` );
			error.code = "IMAGE_NOT_FOUND"
			throw error;
		}

		if( imageData.status !== "ready" ) {
			const imgName = `Image "${imageOrName}"`;
			if( imageData.status === "loading" ) {
				const error = new Error(
					`${fnName}: "${imgName}" is still loading. Use $.ready() to wait for it.`
				);
				error.code = "IMAGE_NOT_READY";
				throw error;
			}
	
			if( imageData.status === "error" ) {
				const error = new Error( `${fnName}: "${imgName}" failed to load.` );
				error.code = "IMAGE_LOAD_FAILED";
				throw error;
			}
		}

		img = imageData.image;
	} else if( imageOrName && typeof imageOrName === "object" ) {

		// Handle screen API object
		if( imageOrName.screen === true ) {
			if( typeof imageOrName.canvas === "function" ) {
				img = imageOrName.canvas();
			} else {
				img = imageOrName.canvas;
			}
			if( !img ) {
				const error = new Error( `${fnName}: Screen has no canvas.` );
				error.code = "INVALID_SCREEN";
				throw error;
			}
		} else if( imageOrName.tagName === "CANVAS" || imageOrName.tagName === "IMG" ) {

			// Handle Canvas or Image element
			img = imageOrName;
		} else {
			const error = new TypeError(
				`${fnName}: Parameter name must be a string, screen object, Canvas element, ` +
				"or Image element."
			);
			error.code = "INVALID_NAME";
			throw error;
		}
	} else {
		const error = new TypeError(
			`${fnName}: Parameter name must be a string, screen object, Canvas element, ` +
			"or Image element."
		);
		error.code = "INVALID_NAME";
		throw error;
	}

	return img;
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
 * @returns {void}
 */
export function removeImage( name ) {
	if( typeof name !== "string" ) {
		return;
	}

	const imageObj = m_images[ name ];
	if( imageObj && imageObj.image ) {

		const img = imageObj.image;

		// Explicitly delete WebGL2 textures to free GPU memory
		// WebGLTextures hold GPU memory that is NOT automatically freed by JS garbage collection
		// Must call gl.deleteTexture() explicitly to prevent memory leaks
		g_renderer.deleteWebGL2Texture( img );

		// Remove from paletteImages
		if( imageObj.usePalette ) {
			m_paletteImages.splice( m_paletteImages.indexOf( name ), 1 );
		}

		// Delete the image object
		delete m_images[ name ];
	}
}

function addPaletteImage( name ) {
	m_paletteImages.push( name );

	// Get the color object data
	const imageObj = m_images[ name ];

	let canvas;
	let context;

	// Create a canvas for manipulating color data of original image
	if( imageObj.image.tagName !== "CANVAS" ) {
		const canvas = document.createElement( "canvas" );
		canvas.width = imageObj.width;
		canvas.height = imageObj.height;
		context = canvas.getContext( "2d" );
		context.drawImage( imageObj.image, 0, 0 );
		imageObj.image = canvas;
	} else {
		canvas = imageObj.image;
		context = canvas.getContext( "2d" );
	}

	// Create a fake screen data object so we can use the findColorIndexByColorValue function
	const fakeScreenData = { "pal": imageObj.palColors, "palMap": imageObj.palColorMap };

	// Quantize image colors to color keys - Makes sure image only uses colors provided in key map
	const imageData = context.getImageData( 0, 0, imageObj.width, imageObj.height );
	const data = imageData.data;
	for( let i = 0; i < data.length; i += 4 ) {
		const color = g_utils.rgbToColor( data[ i ], data[ i + 1 ], data[ i + 2 ], data[ i + 3 ] );
		const index = g_colors.findColorIndexByColorValue( fakeScreenData, color, 0 );
		const newColor = fakeScreenData.pal[ index ];
		if( newColor.key !== color.key ) {
			data[ i ] = newColor.r;
			data[ i + 1 ] = newColor.g;
			data[ i + 2 ] = newColor.b;
			data[ i + 3 ] = newColor.a;
		}
	}
	context.putImageData( imageData, 0, 0 );

	// Store the imageData.data onto the object so we don't need to call getImageData when palette
	// swaps. The base canvas never changes after this so we can just store the image data here.
	imageObj.data = data;

	// Palettize image on all created screens
	for( const screenData of g_screenManager.getAllScreens() ) {
		palettizeImage( screenData, name );
	}
}

// Palettizes all images for a screen
export function palettizeImages( screenData ) {

	// Loop through all palette images
	for( const name of m_paletteImages ) {
		palettizeImage( screenData, name );
	}
}

function palettizeImage( screenData, name ) {

	// Get the global image object
	const imageObj = m_images[ name ];

	// Make sure there are not enough colors in the screen palette for this image
	if( imageObj.palColorMap.length > screenData.pal.length ) {
		console.warn(
			`There are too many palette colors in image: ${name}. Unable to swap colors for this ` +
			"palette."
		);
		return;
	}

	// Cache the array length
	const len = imageObj.width * imageObj.height * 4;

	// Create a 
	const palettizedImageData = new Uint8ClampedArray( len );
	const data = imageObj.data;
	
	// Swap canvas colors. Should have enough indices for screen palette.
	for( let i = 0; i < len; i += 4 ) {

		// Get the pal index from the original image data
		const key = g_utils.generateColorKey(
			data[ i ], data[ i + 1 ], data[ i + 2 ], data[i + 3 ]
		);
		const palIndex = imageObj.palColorMap.get( key );

		// Set the new color
		const newColor = screenData.pal[ palIndex ];
		palettizedImageData[ i ] = newColor.r;
		palettizedImageData[ i + 1 ] = newColor.g;
		palettizedImageData[ i + 2 ] = newColor.b;
		palettizedImageData[ i + 3 ] = newColor.a;
	}

	// Update the texture with the palettized imageData
	g_renderer.updateWebGL2TextureImage(
		screenData, imageObj.image, palettizedImageData, imageObj.width, imageObj.height
	);
}
