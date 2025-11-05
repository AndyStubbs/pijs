/**
 * Pi.js - Framebuffer Object Module
 * 
 * Framebuffer Object creation and management for rendering off-screen.
 * 
 * @module renderer/fbo
 */

"use strict";

import * as g_screenManager from "../core/screen-manager.js";

/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize FBO module
 * 
 * @returns {void}
 */
export function init() {

	g_screenManager.addScreenDataItem( "FBO", null );
	g_screenManager.addScreenDataItem( "fboTexture", null );
}

/**
 * Create FBO and texture for screen
 * 
 * @param {Object} screenData - Screen data object
 * @returns {boolean} True if FBO created successfully
 */
export function createFBO( screenData ) {

	const gl = screenData.gl;
	const width = screenData.width;
	const height = screenData.height;
	
	// Create texture
	const fboTexture = gl.createTexture();
	if( !fboTexture ) {
		console.error( "Failed to create WebGL2 texture." );
		return false;
	}

	gl.bindTexture( gl.TEXTURE_2D, fboTexture );
	gl.texImage2D( 
		gl.TEXTURE_2D, 0, gl.RGBA8, 
		width, height, 0, 
		gl.RGBA, gl.UNSIGNED_BYTE, null 
	);
	
	// Set texture parameters for pixel-perfect rendering
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
	
	// Create FBO
	const FBO = gl.createFramebuffer();
	gl.bindFramebuffer( gl.FRAMEBUFFER, FBO );
	
	// Attach texture to FBO
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
		gl.TEXTURE_2D, fboTexture, 0 
	);

	// Make sure that framebuffer is complete
	const status = gl.checkFramebufferStatus( gl.FRAMEBUFFER );
	if( status !== gl.FRAMEBUFFER_COMPLETE ) {
		console.error( "WebGL2 Framebuffer incomplete:", status );
		return false;
	}

	// Unbind
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	gl.bindTexture( gl.TEXTURE_2D, null );

	return { fboTexture, FBO };
}

/**
 * Resize FBO when screen resizes
 * 
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function resizeFBO( screenData ) {

	// TODO: Implement FBO resize logic if needed
	// For now, FBO size matches screen size and doesn't need resizing
	// All rendering is to the FBO at native resolution
}
