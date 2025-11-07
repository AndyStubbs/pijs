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
	g_commands.addCommand(
		"loadSpritesheet", loadSpritesheet, false,
		[ "src", "name", "width", "height", "margin", "usePalette", "paletteKeys", "onLoad", "onError" ]
	);
	g_commands.addCommand( "getImage", getImage, false, [ "name" ] );
	g_commands.addCommand( "getSpritesheetData", getSpritesheetData, true, [ "name" ], true );
	g_commands.addCommand( "removeImage", removeImage, false, [ "name" ] );
	g_commands.addCommand(
		"createImageFromScreen", createImageFromScreen, true,
		[ "name", "x1", "y1", "x2", "y2" ]
	);

	// Register screen commands
	g_commands.addCommand(
		"drawImage", drawImage, true,
		[ "image", "x", "y", "color", "anchorX", "anchorY", "scaleX", "scaleY", "angle" ]
	);
	g_commands.addCommand(
		"drawSprite", drawSprite, true,
		[ "name", "frame", "x", "y", "color", "anchorX", "anchorY", "scaleX", "scaleY", "angle" ]
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
		const screenData = g_screenManager.getActiveScreen( "blitImage" );
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

	// Special handling for blit sprite because it doesn't support object literal parsing
	api.blitSprite = (
		name,
		frame = 0,
		x = 0,
		y = 0,
		color = DEFAULT_BLIT_COLOR,
		anchorX,
		anchorY,
		scaleX = 1,
		scaleY = 1,
		angleRad = 0
	) => {
		const screenData = g_screenManager.getActiveScreen( "blitSprite" );
		const finalAnchorX = anchorX ?? screenData.defaultAnchorX;
		const finalAnchorY = anchorY ?? screenData.defaultAnchorY;
		const spriteData = getStoredImage( name );
		const frameData = spriteData.frames[ frame ];
		const img = spriteData.image;

		// Draw using renderer-specific implementation
		g_renderer.drawSprite(
			screenData, img,
			frameData.x, frameData.y, frameData.width, frameData.height,
			x, y, frameData.width, frameData.height,
			color, finalAnchorX, finalAnchorY, scaleX, scaleY, angleRad
		);
		g_renderer.setImageDirty( screenData );
	};

	// Add blitSprite to screens when they get created
	g_screenManager.addScreenInitFunction( ( screenData ) => {
		screenData.api.blitSprite = (
			name,
			frame = 0,
			x = 0,
			y = 0,
			color = DEFAULT_BLIT_COLOR,
			anchorX = screenData.defaultAnchorX,
			anchorY = screenData.defaultAnchorY,
			scaleX = 1,
			scaleY = 1,
			angleRad = 0
		) => {
			const spriteData = getStoredImage( name );
			const frameData = spriteData.frames[ frame ];
			const img = spriteData.image;

			// Draw using renderer-specific implementation
			g_renderer.drawSprite(
				screenData, img,
				frameData.x, frameData.y, frameData.width, frameData.height,
				x, y, frameData.width, frameData.height,
				color, anchorX, anchorY, scaleX, scaleY, angleRad
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
		palColorMap.set( palColors[ 0 ].key, 0 );

		for( let i = 0; i < paletteKeys.length; i += 1 ) {
			const palColorRaw = paletteKeys[ i ];
			const palColor = g_utils.convertToColor( palColorRaw );
			palColors.push( palColor );
			palColorMap.set( palColor.key, i + 1 );
		}
	}

	// Create blank image object
	m_images[ name ] = {
		"status": "loading",
		"image": null,
		"width": null,
		"height": null,
		"usePalette": usePalette,
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


/**
 * Remove an image from storage
 * 
 * @param {Object} options - Load options
 * @param {string} [options.name] - Name of the image to remove
 */
function removeImage( options ) {
	const name = options.name;
	if( typeof name !== "string" ) {
		const error = new TypeError( "removeImage: Parameter name must be a string." );
		error.code = "INVALID_NAME";
		throw error;
	}

	const imageObj = m_images[ name ];
	if( imageObj && imageObj.image ) {

		const img = imageObj.image;

		// Explicitly delete WebGL2 textures to free GPU memory
		// WebGLTextures hold GPU memory that is NOT automatically freed by JS garbage collection
		// Must call gl.deleteTexture() explicitly to prevent memory leaks
		for( const screenData of g_screenManager.getAllScreens() ) {
			g_renderer.deleteWebGL2Texture( screenData, img );
		}

		// Remove from paletteImages
		if( imageObj.usePalette ) {
			m_paletteImages.splice( m_paletteImages.indexOf( name ), 1 );
		}

		// Delete the image object
		delete m_images[ name ];
	}
}

/**
 * Load a spritesheet from URL or use provided Image/Canvas element
 * 
 * @param {Object} options - Load options
 * @param {string|HTMLImageElement|HTMLCanvasElement} options.src - Image source
 * @param {string} [options.name] - Optional name for the spritesheet
 * @param {number} [options.width] - Sprite width (required for fixed grid mode)
 * @param {number} [options.height] - Sprite height (required for fixed grid mode)
 * @param {number} [options.margin] - Margin between sprites (default: 0)
 * @param {boolean} [options.usePalette] - Set image colors to be linked to screen canvas
 * @param {Array} [options.paletteKeys] - An array of colors used as key colors from the image to
 * 										  use as indices to look up palette colors
 * @param {Function} [options.onLoad] - Callback when spritesheet loads
 * @param {Function} [options.onError] - Callback when spritesheet fails to load
 * @returns {string} Spritesheet name
 */
function loadSpritesheet( options ) {
	const src = options.src;
	let name = options.name;
	let spriteWidth = options.width;
	let spriteHeight = options.height;
	let margin = options.margin;
	const usePalette = !!options.usePalette;
	const paletteKeys = options.paletteKeys;
	const onLoadCallback = options.onLoad;
	const onErrorCallback = options.onError;
	let isAuto = false;

	if( margin == null ) {
		margin = 0;
	}

	if( spriteWidth == null && spriteHeight == null ) {
		isAuto = true;
		spriteWidth = 0;
		spriteHeight = 0;
		margin = 0;
	} else {
		spriteWidth = Math.round( spriteWidth );
		spriteHeight = Math.round( spriteHeight );
		margin = Math.round( margin );
	}

	// Validate spriteWidth and spriteHeight for fixed mode
	if( !isAuto && ( !Number.isInteger( spriteWidth ) || !Number.isInteger( spriteHeight ) ) ) {
		const error = new TypeError( "loadSpritesheet: width and height must be integers." );
		error.code = "INVALID_DIMENSIONS";
		throw error;
	}

	// Size cannot be less than 1
	if( !isAuto && ( spriteWidth < 1 || spriteHeight < 1 ) ) {
		const error = new RangeError(
			"loadSpritesheet: width and height must be greater than 0."
		);
		error.code = "INVALID_DIMENSIONS";
		throw error;
	}

	// Validate margin
	if( !Number.isInteger( margin ) ) {
		const error = new TypeError( "loadSpritesheet: margin must be an integer." );
		error.code = "INVALID_MARGIN";
		throw error;
	}

	// Generate a name if none is provided
	if( !name || name === "" ) {
		m_imageCount += 1;
		name = "" + m_imageCount;
	}

	// Validate name
	if( typeof name !== "string" ) {
		const error = new TypeError( "loadSpritesheet: Parameter name must be a string." );
		error.code = "INVALID_NAME";
		throw error;
	}
	if( m_images[ name ] ) {
		const error = new TypeError( "loadSpritesheet: Parameter name must be unique." );
		error.code = "INVALID_NAME";
		throw error;
	}

	// Validate callbacks if provided
	if( onLoadCallback != null && !g_utils.isFunction( onLoadCallback ) ) {
		const error = new TypeError( "loadSpritesheet: Parameter onLoad must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}
	if( onErrorCallback != null && !g_utils.isFunction( onErrorCallback ) ) {
		const error = new TypeError( "loadSpritesheet: Parameter onError must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	// Validate paletteKeys
	let palColors = null;
	let palColorMap = null;
	if( usePalette ) {
		if( !Array.isArray( paletteKeys ) || paletteKeys.length === 0 ) {
			const error = new TypeError(
				"loadSpritesheet: Parameter paletteKeys must be non empty Array when usePalette " +
				"is set."
			);
			error.code = "INVALID_PALETTE";
			throw error;
		}

		// Create a color map
		palColorMap = new Map();

		// Initialize palColors with 0 for transparent black
		palColors = [ g_utils.convertToColor( "rgba(0, 0, 0, 0)" ) ];
		palColorMap.set( palColors[ 0 ].key, 0 );

		for( let i = 0; i < paletteKeys.length; i += 1 ) {
			const palColorRaw = paletteKeys[ i ];
			const palColor = g_utils.convertToColor( palColorRaw );
			palColors.push( palColor );
			palColorMap.set( palColor.key, i + 1 );
		}
	}

	// Load the image first, then process frames in callback
	loadImage( {
		"src": src,
		"name": name,
		"usePalette": usePalette,
		"paletteKeys": paletteKeys,
		"onLoad": function( imageName ) {

			// Update the image data to spritesheet type
			const imageData = m_images[ imageName ];
			imageData.type = "spritesheet";
			imageData.spriteWidth = spriteWidth;
			imageData.spriteHeight = spriteHeight;
			imageData.margin = margin;
			imageData.frames = [];
			imageData.isAuto = isAuto;

			const width = imageData.width;
			const height = imageData.height;

			if( isAuto ) {

				// Auto-detect sprites using connected component analysis
				processSpriteSheetAuto( imageData, width, height );
			} else {

				// Fixed grid of sprites
				processSpriteSheetFixed( imageData, width, height );
			}

			// Call user callback if provided
			if( onLoadCallback ) {
				onLoadCallback( imageName );
			}
		},
		"onError": onErrorCallback
	} );

	return name;
}

/**
 * Create an image from a region of the screen (FBO)
 * Defaults to fullscreen if no coordinates are provided
 * 
 * @param {Object} options - Options
 * @param {string} [options.name] - Optional name for the image
 * @returns {Object} Actual image
 */
function getImage( options ) {
	return getImageFromRawInput( options.name, "getImage" );
}

/**
 * Create an image from a region of the screen (FBO)
 * Defaults to fullscreen if no coordinates are provided
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options
 * @param {string} [options.name] - Optional name for the image
 * @param {number} [options.x1] - Left coordinate (defaults to 0)
 * @param {number} [options.y1] - Top coordinate (defaults to 0)
 * @param {number} [options.x2] - Right coordinate (defaults to screen width)
 * @param {number} [options.y2] - Bottom coordinate (defaults to screen height)
 * @returns {string} Image name
 */
function createImageFromScreen( screenData, options ) {
	let name = options.name;
	let x1 = g_utils.getInt( options.x1, 0 );
	let y1 = g_utils.getInt( options.y1, 0 );
	let x2 = g_utils.getInt( options.x2, screenData.width - 1 );
	let y2 = g_utils.getInt( options.y2, screenData.height - 1 );

	// Validate and clamp bounds to screen dimensions
	x1 = g_utils.clamp( x1, 0, screenData.width - 1 );
	y1 = g_utils.clamp( y1, 0, screenData.height - 1 );
	x2 = g_utils.clamp( x2, 0, screenData.width - 1 );
	y2 = g_utils.clamp( y2, 0, screenData.height - 1 );

	// Calculate dimensions
	const width = Math.abs( x2 - x1 );
	const height = Math.abs( y2 - y1 );

	if( width === 0 || height === 0 ) {
		const error = new RangeError(
			"createImageFromScreen: Region width and height must be greater than 0."
		);
		error.code = "INVALID_DIMENSIONS";
		throw error;
	}

	// Calculate actual coordinates (top-left corner)
	const actualX = Math.min( x1, x2 );
	const actualY = Math.min( y1, y2 );

	// Generate a name if none is provided
	if( !name || name === "" ) {
		m_imageCount += 1;
		name = "" + m_imageCount;
	} else if( typeof name !== "string" ) {
		const error = new TypeError( "createImageFromScreen: Parameter name must be a string." );
		error.code = "INVALID_NAME";
		throw error;
	} else if( m_images[ name ] ) {
		const error = new Error(
			`createImageFromScreen: name "${name}" is already used; name must be unique.`
		);
		error.code = "DUPLICATE_NAME";
		throw error;
	}

	// Create canvas copy using helper function
	const canvas = createCanvasFromScreenRegion( screenData, actualX, actualY, width, height );

	// Store in m_images
	m_images[ name ] = {
		"status": "ready",
		"image": canvas,
		"width": width,
		"height": height,
		"usePalette": false,
		"palColors": null,
		"palColorMap": null
	};

	return name;
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

	const img = getImageFromRawInput( imageRaw, "drawImage" );

	// Validate coordinates
	if( x === null || y === null ) {
		const error = new TypeError( "drawImage: Parameters x and y must be numbers." );
		error.code = "INVALID_COORDINATES";
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

/**
 * Draw a sprite (frame) from a spritesheet on the screen
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Draw options
 * @param {string} options.name - Spritesheet name
 * @param {number} options.frame - Frame index to draw
 * @param {number} options.x - X coordinate
 * @param {number} options.y - Y coordinate
 * @param {number} [options.color] - Raw color input
 * @param {number} [options.anchorX] - Anchor point X (0-1)
 * @param {number} [options.anchorY] - Anchor point Y (0-1)
 * @param {number} [options.scaleX] - Scale X
 * @param {number} [options.scaleY] - Scale Y
 * @param {number} [options.angle] - Rotation angle in degrees
 */
function drawSprite( screenData, options ) {
	const name = options.name;
	const frame = options.frame ?? 0;
	const x = g_utils.getInt( options.x, null );
	const y = g_utils.getInt( options.y, null );
	const colorRaw = options.color ?? DEFAULT_BLIT_COLOR;
	const anchorX = g_utils.getFloat( options.anchorX, screenData.defaultAnchorX );
	const anchorY = g_utils.getFloat( options.anchorY, screenData.defaultAnchorY );
	const angle = g_utils.getFloat( options.angle, 0 );
	const scaleX = g_utils.getFloat( options.scaleX, 1 );
	const scaleY = g_utils.getFloat( options.scaleY, 1 );

	// Validate name
	if( typeof name !== "string" ) {
		const error = new TypeError( "drawSprite: Parameter name must be a string." );
		error.code = "INVALID_NAME";
		throw error;
	}

	const spriteData = getStoredImage( name );
	if( !spriteData ) {
		const error = new Error( `drawSprite: Spritesheet "${name}" not found.` );
		error.code = "IMAGE_NOT_FOUND";
		throw error;
	}

	// Validate it's a spritesheet
	if( spriteData.type !== "spritesheet" ) {
		const error = new Error( `drawSprite: Image "${name}" is not a spritesheet.` );
		error.code = "NOT_A_SPRITESHEET";
		throw error;
	}

	if( spriteData.status !== "ready" ) {
		const imgName = `Spritesheet "${name}"`;
		if( spriteData.status === "loading" ) {
			const error = new Error(
				`drawSprite: ${imgName} is still loading. Use $.ready() to wait for it.`
			);
			error.code = "IMAGE_NOT_READY";
			throw error;
		}

		if( spriteData.status === "error" ) {
			const error = new Error( `drawSprite: ${imgName} failed to load.` );
			error.code = "IMAGE_LOAD_FAILED";
			throw error;
		}
	}

	// Validate frame
	if( !Number.isInteger( frame ) || frame >= spriteData.frames.length || frame < 0 ) {
		const error = new RangeError(
			`drawSprite: Frame ${frame} is not valid. Spritesheet has ${spriteData.frames.length} frames.`
		);
		error.code = "INVALID_FRAME";
		throw error;
	}

	// Validate coordinates
	if( x === null || y === null ) {
		const error = new TypeError( "drawSprite: Parameters x and y must be numbers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	// Parses the color and makes sure it's in a valid format
	const color = g_colors.getColorValueByRawInput( screenData, colorRaw );

	// Convert angle from degrees to radians
	const angleRad = g_utils.degreesToRadian( angle );

	// Get frame data
	const frameData = spriteData.frames[ frame ];
	const img = spriteData.image;

	// Draw using renderer-specific implementation
	g_renderer.drawSprite(
		screenData, img,
		frameData.x, frameData.y, frameData.width, frameData.height,
		x, y, frameData.width, frameData.height,
		color, anchorX, anchorY, scaleX, scaleY, angleRad
	);

	// Mark screen as dirty
	g_renderer.setImageDirty( screenData );
}

/**
 * Get spritesheet data including frame information
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options
 * @param {string} options.name - Spritesheet name
 * @returns {Object} Spritesheet data with frameCount and frames array
 */
function getSpritesheetData( screenData, options ) {
	const name = options.name;

	// Validate name
	if( typeof name !== "string" ) {
		const error = new TypeError( "getSpritesheetData: Parameter name must be a string." );
		error.code = "INVALID_NAME";
		throw error;
	}

	const spriteData = getStoredImage( name );
	if( !spriteData ) {
		const error = new Error( `getSpritesheetData: Spritesheet "${name}" not found.` );
		error.code = "IMAGE_NOT_FOUND";
		throw error;
	}

	if( spriteData.type !== "spritesheet" ) {
		const error = new Error( `getSpritesheetData: Image "${name}" is not a spritesheet.` );
		error.code = "NOT_A_SPRITESHEET";
		throw error;
	}

	const spriteDataResult = {
		"frameCount": spriteData.frames.length,
		"frames": []
	};

	for( let i = 0; i < spriteData.frames.length; i++ ) {
		spriteDataResult.frames.push( {
			"index": i,
			"x": spriteData.frames[ i ].x,
			"y": spriteData.frames[ i ].y,
			"width": spriteData.frames[ i ].width,
			"height": spriteData.frames[ i ].height,
			"left": spriteData.frames[ i ].x,
			"top": spriteData.frames[ i ].y,
			"right": spriteData.frames[ i ].right,
			"bottom": spriteData.frames[ i ].bottom
		} );
	}

	return spriteDataResult;
}


/***************************************************************************************************
 * Internal Helper Functions
 ***************************************************************************************************/


/**
 * Create a canvas copy from a region of the screen (FBO)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate of region
 * @param {number} y - Y coordinate of region
 * @param {number} width - Width of region
 * @param {number} height - Height of region
 * @returns {HTMLCanvasElement} Canvas element with copy of screen region
 */
function createCanvasFromScreenRegion( screenData, x, y, width, height ) {

	// Read pixel data from FBO using readPixelsRaw
	const pixelData = g_renderer.readPixelsRaw( screenData, x, y, width, height );

	if( !pixelData ) {
		const error = new Error(
			"createCanvasFromScreenRegion: Failed to read pixel data from screen."
		);
		error.code = "READ_FAILED";
		throw error;
	}

	// Create canvas
	const canvas = document.createElement( "canvas" );
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext( "2d" );

	// Create ImageData for canvas (top-left origin)
	const imageData = context.createImageData( width, height );
	const canvasData = imageData.data;

	// Convert from bottom-left origin (WebGL) to top-left origin (Canvas)
	// pixelData is ordered from bottom row to top row
	// canvasData needs to be ordered from top row to bottom row
	for( let row = 0; row < height; row++ ) {
		for( let col = 0; col < width; col++ ) {

			// Source row in bottom-left origin (pixelData)
			const srcRow = ( height - 1 ) - row;
			const srcIndex = ( srcRow * width + col ) * 4;

			// Destination row in top-left origin (canvasData)
			const dstIndex = ( row * width + col ) * 4;

			// Copy RGBA values
			canvasData[ dstIndex     ] = pixelData[ srcIndex     ];
			canvasData[ dstIndex + 1 ] = pixelData[ srcIndex + 1 ];
			canvasData[ dstIndex + 2 ] = pixelData[ srcIndex + 2 ];
			canvasData[ dstIndex + 3 ] = pixelData[ srcIndex + 3 ];
		}
	}

	// Put image data into canvas
	context.putImageData( imageData, 0, 0 );

	return canvas;
}

function getImageFromRawInput( imageOrName, fnName ) {
	let img = null;

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
		
		if( imageOrName.tagName === "CANVAS" || imageOrName.tagName === "IMG" ) {
			img = imageOrName;
		}
	}

	if( img === null ) {
		const error = new TypeError(
			`${fnName}: Parameter name must be a string, canvas element, or image element.`
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
		const index = g_colors.findColorIndexByColorValue( fakeScreenData, color, 1 );
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

	// Make sure there are enough colors in the screen palette for this image
	if( imageObj.palColors.length > screenData.pal.length ) {
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

/**
 * Process spritesheet with fixed grid dimensions
 * 
 * @param {Object} imageData - Image data object
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {void}
 */
function processSpriteSheetFixed( imageData, width, height ) {
	let x1 = imageData.margin;
	let y1 = imageData.margin;
	let x2 = x1 + imageData.spriteWidth;
	let y2 = y1 + imageData.spriteHeight;

	// Loop through all the frames in a grid pattern
	while( y2 <= height - imageData.margin ) {
		while( x2 <= width - imageData.margin ) {
			imageData.frames.push( {
				"x": x1,
				"y": y1,
				"width": imageData.spriteWidth,
				"height": imageData.spriteHeight,
				"right": x1 + imageData.spriteWidth - 1,
				"bottom": y1 + imageData.spriteHeight - 1
			} );
			x1 += imageData.spriteWidth + imageData.margin;
			x2 = x1 + imageData.spriteWidth;
		}
		x1 = imageData.margin;
		x2 = x1 + imageData.spriteWidth;
		y1 += imageData.spriteHeight + imageData.margin;
		y2 = y1 + imageData.spriteHeight;
	}
}

/**
 * Process spritesheet with auto-detection (finds connected pixel clusters)
 * 
 * @param {Object} imageData - Image data object
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {void}
 */
function processSpriteSheetAuto( imageData, width, height ) {

	// Create canvas to read pixel data
	const canvas = document.createElement( "canvas" );
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext( "2d", { "willReadFrequently": true } );
	context.drawImage( imageData.image, 0, 0 );

	const data = context.getImageData( 0, 0, width, height ).data;
	const searched = new Uint8Array( width * height );

	// 8-directional neighbors
	const dirs = [
		[ -1, -1 ], [ 0, -1 ], [ 1, -1 ],
		[ -1,  0 ],            [ 1,  0 ],
		[ -1,  1 ], [ 0,  1 ], [ 1,  1 ]
	];

	// Find clusters of non-transparent pixels
	for( let i = 3; i < data.length; i += 4 ) {
		if( data[ i ] > 0 ) {
			const index = ( i - 3 ) / 4;
			const x1 = index % width;
			const y1 = Math.floor( index / width );
			const pixelIndex = y1 * width + x1;

			// Skip if already searched
			if( searched[ pixelIndex ] ) {
				continue;
			}

			// Find bounding box of this cluster
			const frameData = {
				"x": width,
				"y": height,
				"width": 0,
				"height": 0,
				"right": 0,
				"bottom": 0
			};

			// BFS to find all connected pixels
			const queue = [];
			queue.push( { "x": x1, "y": y1 } );
			searched[ pixelIndex ] = 1;

			let head = 0;
			while( head < queue.length ) {
				const pixel = queue[ head++ ];
				const px = pixel.x;
				const py = pixel.y;

				// Update bounding box
				frameData.x = Math.min( frameData.x, px );
				frameData.y = Math.min( frameData.y, py );
				frameData.right = Math.max( frameData.right, px );
				frameData.bottom = Math.max( frameData.bottom, py );

				// Check all 8 neighbors
				for( const dir of dirs ) {
					const nx = px + dir[ 0 ];
					const ny = py + dir[ 1 ];

					// Skip if out of bounds
					if( nx < 0 || nx >= width || ny < 0 || ny >= height ) {
						continue;
					}

					const nIndex = ny * width + nx;

					// Skip if already searched
					if( searched[ nIndex ] ) {
						continue;
					}

					// Check if pixel is non-transparent
					const dataIndex = nIndex * 4;
					if( data[ dataIndex + 3 ] > 0 ) {
						searched[ nIndex ] = 1;
						queue.push( { "x": nx, "y": ny } );
					}
				}
			}

			// Calculate final dimensions
			frameData.width = frameData.right - frameData.x + 1;
			frameData.height = frameData.bottom - frameData.y + 1;

			// Only add frames larger than 4 pixels (filters out noise)
			if( ( frameData.width + frameData.height ) > 4 ) {
				imageData.frames.push( frameData );
			}
		}
	}
}
