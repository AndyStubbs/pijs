/**
 * Pi.js - Textures Module
 * 
 * Texture cache management and WebGL2 texture operations.
 * 
 * @module renderer/textures
 */

"use strict";

import * as g_screenManager from "../core/screen-manager.js";
import * as g_batches from "./batches.js";

/***************************************************************************************************
 * Module Data
 ***************************************************************************************************/


// Nested Map for WebGL2 texture storage
// Outer Map: Image element -> Inner Map: GL context -> WebGL texture
// This allows efficient lookup by image and cleanup when image is removed
const m_webgl2Textures = new Map();


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize textures module
 * 
 * @returns {void}
 */
export function init() {

	// Texture cache is already initialized as an empty Map
}


/***************************************************************************************************
 * Texture Cache Management
 ***************************************************************************************************/


/**
 * Get or create WebGL2 texture for image
 * Creates and caches texture if it doesn't exist for this GL context.
 * 
 * @param {Object} screenData - Screen data object
 * @param {HTMLImageElement|HTMLCanvasElement} img - Image or Canvas element
 * @returns {WebGLTexture|null} WebGL texture or null on error
 */
export function getWebGL2Texture( screenData, img ) {

	if( !screenData.gl ) {
		return null;
	}

	// Ensure the latest content is in screenData.fboTexture - if a texture is scheduled to be drawn
	// before the change it should drawn with the old texture.
	g_batches.flushBatches( screenData );

	// Get or create inner Map for this image
	let contextMap = m_webgl2Textures.get( img );
	if( !contextMap ) {
		contextMap = new Map();
		m_webgl2Textures.set( img, contextMap );
	}

	// Check if texture already exists for this screen's context
	const gl = screenData.gl;
	let texture = contextMap.get( gl );
	if( texture ) {
		return texture;
	}

	// Create new texture
	texture = gl.createTexture();
	if( !texture ) {
		console.error( "Failed to create WebGL2 texture for image." );
		return null;
	}

	gl.bindTexture( gl.TEXTURE_2D, texture );

	// Upload image data to texture
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img );

	// Set texture parameters for pixel-perfect rendering
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

	gl.bindTexture( gl.TEXTURE_2D, null );

	// Store texture in nested Map
	contextMap.set( gl, texture );

	return texture;
}

/**
 * Delete WebGL2 texture for an image on all screens
 * Must be called explicitly to free GPU memory - textures are not automatically
 * garbage collected by the browser.
 * 
 * @param {HTMLImageElement|HTMLCanvasElement} img - Image or Canvas element
 * @returns {void}
 */
export function deleteWebGL2Texture( img ) {

	// Get the context Map for this image
	const contextMap = m_webgl2Textures.get( img );
	if( !contextMap ) {
		return;
	}

	// Get all active screens
	const allScreens = g_screenManager.getAllScreens();

	// Iterate through all screens and delete textures for this image
	for( const screenData of allScreens ) {
		if( !screenData.gl ) {
			continue;
		}

		const texture = contextMap.get( screenData.gl );
		if( texture ) {
			screenData.gl.deleteTexture( texture );
			contextMap.delete( screenData.gl );
		}
	}

	// Remove the context Map if empty
	if( contextMap.size === 0 ) {
		m_webgl2Textures.delete( img );
	}
}

/**
 * Update a sub-rectangle of an existing WebGL2 texture using pixel data.
 * Creates the texture on-demand if it doesn't yet exist for this context.
 * 
 * @param {Object} screenData - Screen data object
 * @param {HTMLImageElement|HTMLCanvasElement} imgKey - Image element used as cache key
 * @param {Uint8ClampedArray} pixelData - RGBA pixel data array
 * @param {number} width - Width of the pixel data
 * @param {number} height - Height of the pixel data
 * @param {number} dstX - Destination X in the texture
 * @param {number} dstY - Destination Y in the texture
 * @returns {WebGLTexture|null} Updated WebGL texture or null on error
 */
export function updateWebGL2TextureSubImage( screenData, imgKey, pixelData, width, height, dstX, dstY ) {

	if( !screenData.gl ) {
		return null;
	}

	// Ensure texture exists
	let texture = getWebGL2Texture( screenData, imgKey );
	if( !texture ) {
		return null;
	}

	const gl = screenData.gl;
	gl.bindTexture( gl.TEXTURE_2D, texture );

	// Upload only the updated region using pixel data
	gl.texSubImage2D( 
		gl.TEXTURE_2D, 0, dstX, dstY,
		width, height,
		gl.RGBA, gl.UNSIGNED_BYTE, pixelData 
	);

	// Keep texture parameters consistent
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

	gl.bindTexture( gl.TEXTURE_2D, null );

	return texture;
}

