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
			"type": "image",
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
			"type": "image",
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

// loadSpritesheet command
commands.addCommand(
	"loadSpritesheet", loadSpritesheet, [ "src", "name", "width", "height", "margin" ]
);
function loadSpritesheet( options ) {
	const src = options.src;
	let name = options.name;
	let spriteWidth = options.width;
	let spriteHeight = options.height;
	let margin = options.margin;
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
	if( !isAuto && ( !utils.isInteger( spriteWidth ) || !utils.isInteger( spriteHeight ) ) ) {
		const error = new TypeError( "loadSpriteSheet: width and height must be integers." );
		error.code = "INVALID_DIMENSIONS";
		throw error;
	}

	// Size cannot be less than 1
	if( !isAuto && ( spriteWidth < 1 || spriteHeight < 1 ) ) {
		const error = new RangeError(
			"loadSpriteSheet: width and height must be greater than 0."
		);
		error.code = "INVALID_DIMENSIONS";
		throw error;
	}

	// Validate margin
	if( !utils.isInteger( margin ) ) {
		const error = new TypeError( "loadSpriteSheet: margin must be an integer." );
		error.code = "INVALID_MARGIN";
		throw error;
	}

	// Generate a name if none is provided
	if( !name || name === "" ) {
		m_imageCount += 1;
		name = "" + m_imageCount;
	}

	// Load the image first, then process frames in callback
	loadImage( {
		"src": src,
		"name": name,
		"onLoad": function() {

			// Update the image data to spritesheet type
			const imageData = m_images[ name ];
			imageData.type = "spritesheet";
			imageData.spriteWidth = spriteWidth;
			imageData.spriteHeight = spriteHeight;
			imageData.margin = margin;
			imageData.frames = [];
			imageData.isAuto = isAuto;

			const width = imageData.image.width;
			const height = imageData.image.height;

			if( isAuto ) {

				// Auto-detect sprites using connected component analysis
				processSpriteSheetAuto( imageData, width, height );
			} else {

				// Fixed grid of sprites
				processSpriteSheetFixed( imageData, width, height );
			}
		}
	} );

	return name;
}


// removeImage command
commands.addCommand( "removeImage", removeImage, [ "name" ] );
function removeImage( options ) {
	const name = options.name;

	if( typeof name !== "string" ) {
		const error = new TypeError( "removeImage: name must be a string." );
		error.code = "INVALID_NAME";
		throw error;
	}

	delete m_images[ name ];
}

// getImage command - captures region of screen as an image
screenManager.addCommand( "getImage", getImage, [ "name", "x1", "y1", "x2", "y2" ] );
function getImage( screenData, options ) {
	let name = options.name;
	const x1 = Math.round( options.x1 );
	const y1 = Math.round( options.y1 );
	const x2 = Math.round( options.x2 );
	const y2 = Math.round( options.y2 );

	if( isNaN( x1 ) || isNaN( y1 ) || isNaN( x2 ) || isNaN( y2 ) ) {
		const error = new TypeError( "getImage: parameters x1, x2, y1, y2 must be integers." );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	// Generate a name if none is provided
	if( !name || name === "" ) {
		m_imageCount += 1;
		name = "" + m_imageCount;
	} else if( typeof name !== "string" ) {
		const error = new TypeError( "getImage: name must be a string." );
		error.code = "INVALID_NAME";
		throw error;
	} else if( m_images[ name ] ) {
		const error = new Error( `getImage: name "${name}" is already used; name must be unique.` );
		error.code = "DUPLICATE_NAME";
		throw error;
	}

	const canvas = document.createElement( "canvas" );
	const context = canvas.getContext( "2d" );
	const width = Math.abs( x1 - x2 );
	const height = Math.abs( y1 - y2 );
	canvas.width = width;
	canvas.height = height;
	screenData.api.render();
	context.drawImage( screenData.canvas, x1, y1, width, height, 0, 0, width, height );

	m_images[ name ] = {
		"status": "ready",
		"image": canvas,
		"type": "image",
		"width": width,
		"height": height
	};

	return name;
}

// getSpritesheetData command
screenManager.addCommand( "getSpritesheetData", getSpritesheetData, [ "name" ] );
function getSpritesheetData( screenData, options ) {
	const name = options.name;

	// Validate name
	if( !m_images[ name ] ) {
		const error = new Error( "getSpritesheetData: invalid sprite name" );
		error.code = "INVALID_NAME";
		throw error;
	}

	const sprite = m_images[ name ];

	if( sprite.type !== "spritesheet" ) {
		const error = new Error( "getSpritesheetData: image is not a spritesheet" );
		error.code = "NOT_A_SPRITESHEET";
		throw error;
	}

	const spriteData = {
		"frameCount": sprite.frames.length,
		"frames": []
	};

	for( let i = 0; i < sprite.frames.length; i++ ) {
		spriteData.frames.push( {
			"index": i,
			"x": sprite.frames[ i ].x,
			"y": sprite.frames[ i ].y,
			"width": sprite.frames[ i ].width,
			"height": sprite.frames[ i ].height,
			"left": sprite.frames[ i ].x,
			"top": sprite.frames[ i ].y,
			"right": sprite.frames[ i ].right,
			"bottom": sprite.frames[ i ].bottom
		} );
	}

	return spriteData;
}

// drawImage command
screenManager.addCommand(
	"drawImage",
	drawImage,
	[ "name", "x", "y", "rotation", "anchorX", "anchorY", "alpha", "scaleX", "scaleY" ]
);
function drawImage( screenData, options ) {
	const name = options.name;
	const x = options.x || 0;
	const y = options.y || 0;
	const rotation = options.rotation;
	const anchorX = options.anchorX;
	const anchorY = options.anchorY;
	const alpha = options.alpha;
	const scaleX = options.scaleX;
	const scaleY = options.scaleY;

	if( !m_images[ name ] ) {
		const error = new Error(
			`drawImage: Image "${name}" not found. Did you forget to load it?`
		);
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

	if( isNaN( x ) || isNaN( y ) ) {
		const error = new TypeError( "drawImage: parameters x and y must be numbers" );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	drawItem(
		screenData, imageData.image, x, y, rotation, anchorX, anchorY, alpha, null, scaleX, scaleY
	);
}

// drawSprite command
screenManager.addCommand(
	"drawSprite", drawSprite,
	[ "name", "frame", "x", "y", "rotation", "anchorX", "anchorY", "alpha", "scaleX", "scaleY" ]
);
function drawSprite( screenData, options ) {
	const name = options.name;
	const frame = options.frame || 0;
	const x = options.x || 0;
	const y = options.y || 0;
	const rotation = options.rotation;
	const anchorX = options.anchorX;
	const anchorY = options.anchorY;
	const alpha = options.alpha;
	const scaleX = options.scaleX;
	const scaleY = options.scaleY;

	// Validate name
	if( !m_images[ name ] ) {
		const error = new Error( "drawSprite: invalid sprite name" );
		error.code = "INVALID_NAME";
		throw error;
	}

	const spriteData = m_images[ name ];

	// Validate it's a spritesheet
	if( spriteData.type !== "spritesheet" ) {
		const error = new Error( "drawSprite: image is not a spritesheet" );
		error.code = "NOT_A_SPRITESHEET";
		throw error;
	}

	// Validate frame
	if( !utils.isInteger( frame ) || frame >= spriteData.frames.length || frame < 0 ) {
		const error = new RangeError( "drawSprite: frame number is not valid" );
		error.code = "INVALID_FRAME";
		throw error;
	}

	if( isNaN( x ) || isNaN( y ) ) {
		const error = new TypeError( "drawSprite: parameters x and y must be numbers" );
		error.code = "INVALID_COORDINATES";
		throw error;
	}

	const img = spriteData.image;
	const frameData = spriteData.frames[ frame ];

	drawItem( screenData, img, x, y, rotation, anchorX, anchorY, alpha, frameData, scaleX, scaleY );
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Shared function to draw images and sprites with transformations
function drawItem(
	screenData, img, x, y, rotation, anchorX, anchorY, alpha, frameData, scaleX, scaleY
) {

	// Default values for scale
	if( scaleX == null || isNaN( Number( scaleX ) ) ) {
		scaleX = 1;
	}

	if( scaleY == null || isNaN( Number( scaleY ) ) ) {
		scaleY = 1;
	}

	// Default value for rotation
	if( rotation == null ) {
		rotation = 0;
	}

	// Convert rotation from degrees to radians
	rotation = utils.degreesToRadian( rotation );

	// Default values for anchor
	if( !anchorX ) {
		anchorX = 0;
	}
	if( !anchorY ) {
		anchorY = 0;
	}

	// Default value for alpha
	if( !alpha && alpha !== 0 ) {
		alpha = 255;
	}

	// Calculate anchor position in pixels
	if( frameData ) {
		anchorX = Math.round( frameData.width * anchorX );
		anchorY = Math.round( frameData.height * anchorY );
	} else {
		anchorX = Math.round( img.width * anchorX );
		anchorY = Math.round( img.height * anchorY );
	}

	const context = screenData.context;

	// Save current alpha
	const oldAlpha = context.globalAlpha;
	context.globalAlpha = ( alpha / 255 );

	// Render any pending changes
	screenData.api.render();

	// Apply transformations
	context.translate( x, y );
	context.rotate( rotation );
	context.scale( scaleX, scaleY );

	// Draw image or sprite frame
	if( frameData == null ) {

		// Draw full image
		context.drawImage( img, -anchorX, -anchorY );
	} else {

		// Draw sprite frame
		context.drawImage(
			img,
			frameData.x,
			frameData.y,
			frameData.width,
			frameData.height,
			-anchorX,
			-anchorY,
			frameData.width,
			frameData.height
		);
	}

	// Restore transformations
	context.scale( 1 / scaleX, 1 / scaleY );
	context.rotate( -rotation );
	context.translate( -x, -y );

	// Restore alpha
	context.globalAlpha = oldAlpha;
}

// Process spritesheet with fixed grid dimensions
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

// Process spritesheet with auto-detection (finds connected pixel clusters)
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
