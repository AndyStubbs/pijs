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
 * Shift a rectangular region of the screen image up by yOffset pixels.
 *
 * Coordinates are physical/FBO top-left. Defaults to the full framebuffer.
 *
 * @param {Object} screenData - Screen data object
 * @param {number} yOffset - Number of pixels to shift up
 * @param {number} [x] - Region left
 * @param {number} [y] - Region top
 * @param {number} [width] - Region width
 * @param {number} [height] - Region height
 * @returns {void}
 */
export function shiftImageUp( screenData, yOffset, x, y, width, height ) {

	if( yOffset <= 0 ) {
		return;
	}

	const screenWidth = screenData.width;
	const screenHeight = screenData.height;
	let regionX = 0;
	let regionY = 0;
	let regionW = screenWidth;
	let regionH = screenHeight;

	if( x !== undefined && x !== null ) {
		regionX = x;
		regionY = y;
		regionW = width;
		regionH = height;
	}

	if( regionW <= 0 || regionH <= 0 ) {
		return;
	}

	const gl = screenData.gl;

	// Ensure the latest content is in screenData.fboTexture
	g_batches.flushBatches( screenData );

	const remainH = regionH - yOffset;

	// GL clip rectangle (bottom-left origin)
	const glX0 = regionX;
	const glY0 = screenHeight - ( regionY + regionH );
	const glX1 = regionX + regionW;
	const glY1 = screenHeight - regionY;

	if( remainH <= 0 ) {
		gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
		gl.enable( gl.SCISSOR_TEST );
		gl.scissor( glX0, glY0, regionW, regionH );
		gl.clearColor( 0, 0, 0, 0 );
		gl.clear( gl.COLOR_BUFFER_BIT );
		gl.disable( gl.SCISSOR_TEST );
		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
		return;
	}

	// NOTE ABOUT COORDINATES:
	// WebGL framebuffer coordinates are bottom-left origin. When we say
	// "shift image up" in the on-screen sense, we mean the visible content moves
	// toward the top of the window, leaving a newly blank area at the bottom.

	const srcY0 = screenHeight - ( regionY + regionH );
	const srcY1 = screenHeight - ( regionY + yOffset );
	const dstY0 = screenHeight - ( regionY + remainH );
	const dstY1 = screenHeight - regionY;

	// Pass 1: Copy the remaining strip into the shifted destination
	gl.bindFramebuffer( gl.READ_FRAMEBUFFER, screenData.FBO );
	gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, screenData.bufferFBO );
	gl.clearColor( 0, 0, 0, 0 );
	gl.clear( gl.COLOR_BUFFER_BIT );
	gl.blitFramebuffer(
		glX0, srcY0, glX1, srcY1,
		glX0, dstY0, glX1, dstY1,
		gl.COLOR_BUFFER_BIT, gl.NEAREST
	);

	// Pass 2: Copy only the region back so pixels outside the clip stay
	gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, screenData.FBO );
	gl.bindFramebuffer( gl.READ_FRAMEBUFFER, screenData.bufferFBO );
	gl.blitFramebuffer(
		glX0, glY0, glX1, glY1,
		glX0, glY0, glX1, glY1,
		gl.COLOR_BUFFER_BIT, gl.NEAREST
	);

	// Unbind framebuffers
	gl.bindFramebuffer( gl.READ_FRAMEBUFFER, null );
	gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, null );
}


/**
 * Clear a region of the screen framebuffer
 *
 * Coordinates are physical/FBO top-left.
 *
 * @param {Object} screenData - Screen data object
 * @param {number} x - Left coordinate
 * @param {number} y - Top coordinate
 * @param {number} width - Region width
 * @param {number} height - Region height
 * @returns {void}
 */
export function cls( screenData, x, y, width, height ) {

	if( width <= 0 || height <= 0 ) {
		return;
	}

	// If clearing entire screen remove all batches, if not flush before clearing area
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
