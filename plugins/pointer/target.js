/**
 * Pointer target validation and current viewport-to-screen conversion.
 * @module plugins/pointer/target
 */
import * as g_canvasLayout from "../../src/core/canvas-layout.js";

/**
 * Validate before changing device or subscription state.
 * @param {Object} screenData - Input target
 * @param {string} command - Invoked public command
 * @returns {void}
 */
export function validatePointerTarget( screenData, command ) {
	if( screenData.isOffscreen ) {
		const error = new TypeError(
			`${command}: Screen ${screenData.id} is offscreen and cannot receive pointer input. ` +
			`Call ${command}() on an onscreen screen, or select an onscreen screen with ` +
			"setScreen() first."
		);
		error.code = "OFFSCREEN_INPUT_UNSUPPORTED";
		throw error;
	}
}

/**
 * Convert client coordinates using fresh content bounds, including scrolling and CSS layout.
 * @param {Object} screenData - Input target
 * @param {MouseEvent|Touch} event - Client coordinates
 * @returns {{x: number, y: number}|null} Logical position, or null for an empty content box
 */
export function pointerPosition( screenData, event ) {
	const rect = g_canvasLayout.getCanvasContentRect( screenData.canvas );
	screenData.clientRect = rect;
	if( rect.width <= 0 || rect.height <= 0 ) {
		return null;
	}
	return {
		"x": Math.floor( ( event.clientX - rect.left ) / rect.width * screenData.width ),
		"y": Math.floor( ( event.clientY - rect.top ) / rect.height * screenData.height )
	};
}
