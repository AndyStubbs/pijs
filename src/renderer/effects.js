/**
 * Pi.js - Render Effects Module
 * 
 * Screen-space post operations that manipulate the off-screen render target (FBO),
 * such as scrolling and simple blits.
 * 
 * @module renderer/draw/effects
 */

"use strict";

import * as g_batches from "./batches.js";

/**
 * Shift screen image up by yOffset pixels using ping-pong FBO blit
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} yOffset - Number of pixels to shift up
 * @returns {void}
 */
export function shiftImageUp( screenData, yOffset ) {

	if( yOffset <= 0 ) {
		return;
	}

	const gl = screenData.gl;
	const width = screenData.width;
	const height = screenData.height;

	// Ensure the latest content is in screenData.fboTexture
	g_batches.flushBatches( screenData );

	// NOTE ABOUT COORDINATES:
	// WebGL framebuffer coordinates are bottom-left origin. When we say
	// "shift image up" in the on-screen sense, we mean the visible content moves
	// toward the top of the window, leaving a newly blank area at the bottom.
	// The blit rectangles below are chosen to achieve exactly that effect.

	// Pass 1: Copy the portion that will remain on screen after the shift
	// from main FBO source [0, 0, width, height - yOffset] (bottom part)
	// into buffer FBO destination [0, yOffset, width, height] (moved up).
	gl.bindFramebuffer( gl.READ_FRAMEBUFFER, screenData.FBO );
	gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, screenData.bufferFBO );
	gl.clearColor( 0, 0, 0, 0 );
	gl.clear( gl.COLOR_BUFFER_BIT );
	gl.blitFramebuffer(
		0, 0, width, Math.max( 0, height - yOffset ),
		0, yOffset, width, height,
		gl.COLOR_BUFFER_BIT, gl.NEAREST
	);

	// Pass 2: Copy the entire buffer back to the main FBO. This leaves the
	// bottom yOffset pixels blank (transparent), which is the desired outcome
	// when we say "shift up" (blank area appears at the bottom).
	gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, screenData.FBO );
	gl.bindFramebuffer( gl.READ_FRAMEBUFFER, screenData.bufferFBO );
	gl.blitFramebuffer(
		0, 0, width, height,
		0, 0, width, height,
		gl.COLOR_BUFFER_BIT, gl.NEAREST
	);

	// Unbind framebuffers
	gl.bindFramebuffer( gl.READ_FRAMEBUFFER, null );
	gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, null );

	// No need to call g_batches.displayToCanvas as caller should setImageDirty. 
}


/**
 * Clear a region of the screen framebuffer
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - Left coordinate
 * @param {number} y - Top coordinate
 * @param {number} width - Region width
 * @param {number} height - Region height
 * @returns {void}
 */
export function cls( screenData, x, y, width, height ) {

	// Ensure the FBO contains all pending draws before clearing
	if( x === 0 && y === 0 && width === screenData.width && height === screenData.height ) {
		g_batches.resetBatches( screenData );
	} else {
		g_batches.flushBatches( screenData );
	}

	const gl = screenData.gl;

	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
	gl.viewport( 0, 0, screenData.width, screenData.height );

	if(
		x === 0 &&
		y === 0 &&
		width === screenData.width &&
		height === screenData.height
	) {
		gl.clearColor( 0, 0, 0, 0 );
		gl.clear( gl.COLOR_BUFFER_BIT );
	} else {
		gl.enable( gl.SCISSOR_TEST );
		const scissorY = screenData.height - ( y + height );
		gl.scissor( x, scissorY, width, height );
		gl.clearColor( 0, 0, 0, 0 );
		gl.clear( gl.COLOR_BUFFER_BIT );
		gl.disable( gl.SCISSOR_TEST );
	}

	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
}