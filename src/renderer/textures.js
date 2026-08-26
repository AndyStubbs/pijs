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
	g_screenManager.addScreenDataItem( "textureCopyFBO", null );
}


/***************************************************************************************************
 * Texture Cache Management
 ***************************************************************************************************/


/**
 * Copy image data to currently bound texture, handling mock canvases by copying from FBO
 * Handles cross-context copying when mock canvas uses a different WebGL context
 * 
 * @param {Object} screenData - Destination screen data
 * @param {HTMLImageElement|HTMLCanvasElement|OffscreenCanvas} img - Image or Canvas element
 * @param {WebGLTexture} texture - Currently bound destination texture
 * @returns {void}
 */
function copyImageToTexture( screenData, img, texture ) {
	const gl = screenData.gl;
	
	// If img is a mock canvas, copy from the FBO instead of the mock canvas
	if( img.isMock ) {
		const imgScreenData = g_screenManager.screenCanvasMap.get( img );
		if( imgScreenData ) {

			// Make sure the other screen is up to date
			g_batches.flushBatches( imgScreenData );
			
			// Check if contexts are different (cross-context copy needed)
			if( imgScreenData.gl !== gl ) {
				
				// Cross-context copy: read pixels from source FBO, upload to destination texture
				const srcGl = imgScreenData.gl;
				const width = imgScreenData.width;
				const height = imgScreenData.height;
				
				// Allocate buffer for pixel data
				const pixelData = new Uint8Array( width * height * 4 );
				
				// Read pixels from source FBO in source context
				srcGl.bindFramebuffer( srcGl.FRAMEBUFFER, imgScreenData.FBO );
				srcGl.readPixels( 0, 0, width, height, srcGl.RGBA, srcGl.UNSIGNED_BYTE, pixelData );
				srcGl.bindFramebuffer( srcGl.FRAMEBUFFER, null );
				
				// Flip Y-axis (WebGL reads bottom-to-top, but texImage2D expects top-to-bottom)
				// Flip rows in place
				const rowSize = width * 4;
				const tempRow = new Uint8Array( rowSize );
				for( let y = 0; y < Math.floor( height / 2 ); y++ ) {
					const topRow = y * rowSize;
					const bottomRow = ( height - 1 - y ) * rowSize;
					
					// Swap rows
					tempRow.set( pixelData.subarray( topRow, topRow + rowSize ) );
					pixelData.set( pixelData.subarray( bottomRow, bottomRow + rowSize ), topRow );
					pixelData.set( tempRow, bottomRow );
				}
				
				// Upload pixel data to destination texture in destination context
				gl.texImage2D(
					gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE,
					pixelData
				);
			} else {

				// Allocate the destination texture before attaching it to the copy framebuffer
				gl.texImage2D(
					gl.TEXTURE_2D, 0, gl.RGBA8, imgScreenData.width, imgScreenData.height, 0,
					gl.RGBA, gl.UNSIGNED_BYTE, null
				);

				// Reuse a framebuffer to keep same-context copies entirely on the GPU
				if( !screenData.textureCopyFBO ) {
					screenData.textureCopyFBO = gl.createFramebuffer();
					if( !screenData.textureCopyFBO ) {
						const error = new Error( "Failed to create texture copy framebuffer." );
						error.code = "WEBGL2_ERROR";
						throw error;
					}
				}

				gl.bindFramebuffer( gl.READ_FRAMEBUFFER, imgScreenData.FBO );
				gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, screenData.textureCopyFBO );
				gl.framebufferTexture2D(
					gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0
				);

				// Reverse destination Y so the texture uses top-left image coordinates
				gl.blitFramebuffer(
					0, 0, imgScreenData.width, imgScreenData.height,
					0, imgScreenData.height, imgScreenData.width, 0,
					gl.COLOR_BUFFER_BIT, gl.NEAREST
				);
				gl.bindFramebuffer( gl.READ_FRAMEBUFFER, null );
				gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, null );
			}
		} else {

			// Fallback to regular canvas copy if screenData not found
			gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img );
		}
	} else {
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img );
	}
}

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
			( typeof OffscreenCanvas !== "undefined" && img instanceof OffscreenCanvas ) ||
			img.isMock
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
			copyImageToTexture( screenData, img, texture );
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
	copyImageToTexture( screenData, img, texture );

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
 * Resolve a texture and coordinate orientation for an image draw.
 *
 * @param {Object} screenData - Destination screen data
 * @param {Image|Canvas|WebGLTexture} img - Image source
 * @returns {{texture: WebGLTexture, invertedY: boolean}} Texture draw information
 */
export function getTextureDrawInfo( screenData, img ) {
	const sourceData = g_screenManager.screenCanvasMap.get( img );
	if( !sourceData || sourceData.gl !== screenData.gl ) {
		return { "texture": getWebGL2Texture( screenData, img ), "invertedY": false };
	}
	if( sourceData.FBO === screenData.FBO ) {
		const error = new Error( "drawImage: A screen cannot draw its own framebuffer." );
		error.code = "FRAMEBUFFER_FEEDBACK_LOOP";
		throw error;
	}

	// Preserve an earlier queued draw before the source framebuffer can be changed.
	if( screenData.batchInfo.textureBatchSet.has( sourceData.fboTexture ) ) {
		g_batches.flushBatches( screenData );
	}
	g_batches.flushBatches( sourceData );
	return { "texture": sourceData.fboTexture, "invertedY": true };
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

	// Delete the texture from gl
	const gl = screenData.gl;
	const texture = contextMap.get( gl );
	if( texture ) {
		gl.deleteTexture( texture );
		contextMap.delete( gl );
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
	if( screenData.batchInfo.textureBatchSet.has( texture ) ) {
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

export function cleanup( screenData ) {
	const gl = screenData.gl;

	if( screenData.textureCopyFBO ) {
		gl.deleteFramebuffer( screenData.textureCopyFBO );
		screenData.textureCopyFBO = null;
	}

	// Delete all textures in the imageContextMap for this screen but keep the image 
	for( const img of screenData.imageContextMap.keys() ) {
		const screenMap = screenData.imageContextMap.get( img );
		const texture = screenMap.get( gl );
		if( texture ) {
			gl.deleteTexture( texture );
		}
	}

	// Clear references for GC and signal uninitialized state
	screenData.imageContextMap = null;
}
