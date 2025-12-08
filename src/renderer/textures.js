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
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize textures module
 * 
 * @returns {void}
 */
export function init() {

	// Nested Map for WebGL2 texture storage
	// Outer Map: Image element -> Inner Map: GL context -> WebGL texture
	// This allows efficient lookup by image and cleanup when image is removed
	g_screenManager.addScreenDataItem( "imageContextMap", new Map() );
}


/***************************************************************************************************
 * Texture Cache Management
 ***************************************************************************************************/


/**
 * Get or create WebGL2 texture for image
 * Creates and caches texture if it doesn't exist for this GL context.
 * 
 * @param {Object} screenData - Screen data object
 * @param {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas} img - Image or Canvas element
 * @returns {WebGLTexture|null} WebGL texture or null on error
 */
export function getWebGL2Texture( screenData, img ) {

	// imageContextMap is a map (image -> context) containing a map (context -> texture)
	// Get or create inner Map for this image
	let contextTextureMap = screenData.imageContextMap.get( img );
	if( !contextTextureMap ) {
		contextTextureMap = new Map();
		screenData.imageContextMap.set( img, contextTextureMap );
	}

	// Check if texture is another screen
	const otherScreenData = g_screenManager.screenCanvasMap.get( img );
	if( otherScreenData ) {

		// Make sure the other screen is up to date
		g_batches.flushBatches( otherScreenData );
		g_batches.displayToCanvas( otherScreenData );
	}

	// Check if texture already exists for this screen's context
	const gl = screenData.gl;
	let texture = contextTextureMap.get( gl );
	if( texture ) {

		// If image is a canvas, update the texture so that it has the latest data
		if(
			img instanceof HTMLCanvasElement ||
			( typeof OffscreenCanvas !== "undefined" && img instanceof OffscreenCanvas )
		) {

			// If the img.isDirty is not defined then assume it's dirty, otherwise only if it's
			// explicitly set to false then we don't perform the copy, this makes it so that the 
			// default behavior is to copy the texture.
			if( img.isDirty !== undefined && img.isDirty === false ) {
				return texture;
			}

			// If a texture is currently scheduled to be drawn we need to flush the batch so that
			// the texture will appear as it was when the draw command was issued
			if( screenData.batchInfo.textureBatchSet.has( texture ) ) {
				g_batches.flushBatches( screenData );
			}

			// Copy the content of the source canvas to the texture
			gl.bindTexture( gl.TEXTURE_2D, texture );
			gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img );
			gl.bindTexture( gl.TEXTURE_2D, null );
		}
		return texture;
	}

	// Create the texture
	texture = gl.createTexture();
	if( !texture ) {
		const error = new Error( "Failed to create WebGL2 texture for image." );
		error.code = "WEBGL2_ERROR";
		throw error;
	}

	// Upload image data to texture
	gl.bindTexture( gl.TEXTURE_2D, texture );
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img );

	// Set texture parameters for pixel-perfect rendering
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

	// Unbind the texture
	gl.bindTexture( gl.TEXTURE_2D, null );

	// Store texture in nested Map
	contextTextureMap.set( gl, texture );

	return texture;
}

/**
 * Delete WebGL2 texture for an image on all screens
 * Must be called explicitly to free GPU memory - textures are not automatically
 * garbage collected by the browser.
 * 
 * @param {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas} img - Image or Canvas element
 * @returns {void}
 */
export function deleteWebGL2Texture( screenData, img ) {

	// Get the context Map for this image
	const contextMap = screenData.imageContextMap.get( img );
	if( !contextMap ) {
		return;
	}

	// Remove the context Map if empty
	if( contextMap.size === 0 ) {
		screenData.imageContextMap.delete( img );
	}
}

/**
 * Update a sub-rectangle of an existing WebGL2 texture using pixel data.
 * Creates the texture on-demand if it doesn't yet exist for this context.
 * If imgKey is null, uses screenData.fboTexture directly (for FBO updates).
 * 
 * @param {Object} screenData - Screen data object
 * @param {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas|null} imgKey - Image cache key
 * @param {Uint8ClampedArray|Uint8Array} pixelData - RGBA pixel data array
 * @param {number} width - Width of the pixel data
 * @param {number} height - Height of the pixel data
 * @param {number} dstX - Destination X in the texture
 * @param {number} dstY - Destination Y in the texture
 * @returns {WebGLTexture|null} Updated WebGL texture or null on error
 */
export function updateWebGL2TextureSubImage(
	screenData, imgKey, pixelData, width, height, dstX, dstY
) {

	if( !screenData.gl ) {
		return null;
	}

	const gl = screenData.gl;
	let texture;

	// If imgKey is null, use FBO texture directly
	if( imgKey === null ) {
		texture = screenData.fboTexture;
		if( !texture ) {
			return null;
		}
	} else {
		
		// Ensure texture exists for the image key
		texture = getWebGL2Texture( screenData, imgKey );
	}

	// If a texture is currently scheduled to be drawn we need to flush the batch so that
	// the texture will appear as it was when the draw command was issued
	if( screenData.batchInfo.textureBatchSet.has( texture ) ) {
		g_batches.flushBatches( screenData );
	}

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

/**
 * Update an entire WebGL2 texture using pixel data.
 * Creates the texture on-demand if it doesn't yet exist for this context.
 * 
 * @param {Object} screenData - Screen data object
 * @param {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas} imgKey - Image cache key
 * @param {Uint8ClampedArray} pixelData - RGBA pixel data array
 * @param {number} width - Width of the pixel data
 * @param {number} height - Height of the pixel data
 * @returns {WebGLTexture|null} Updated WebGL texture or null on error
 */
export function updateWebGL2TextureImage( screenData, imgKey, pixelData, width, height ) {

	// Get the texture
	let texture = getWebGL2Texture( screenData, imgKey );

	// If a texture is currently scheduled to be drawn we need to flush the batch so that
	// the texture will appear as it was when the draw command was issued
	if( screenData.batchInfo.textureBatchSets.has( texture ) ) {
		g_batches.flushBatches( screenData );
	}
	
	const gl = screenData.gl;
	gl.bindTexture( gl.TEXTURE_2D, texture );

	// Upload the entire texture using pixel data
	gl.texImage2D( 
		gl.TEXTURE_2D, 0, gl.RGBA,
		width, height, 0,
		gl.RGBA, gl.UNSIGNED_BYTE, pixelData 
	);

	// Keep texture parameters consistent
	// gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	// gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	// gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	// gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

	gl.bindTexture( gl.TEXTURE_2D, null );

	return texture;
}
