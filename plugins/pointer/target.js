/**
 * Pointer target validation, current viewport-to-screen conversion, and the data shape that
 * mouse, touch, press, and click data share.
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

/**
 * Pointer data in the one shape that mouse, touch, press, and click data share. Press data adds
 * `touches`.
 * @param {Object} record - `x`, `y`, `lastX`, `lastY`, `buttons`, `action`, `type`, `id`, and
 *   `cancelled`
 * @returns {Object} A new data object with exactly those fields, in that order
 */
export function createPointerData( record ) {
	return {
		"x": record.x,
		"y": record.y,
		"lastX": record.lastX,
		"lastY": record.lastY,
		"buttons": record.buttons,
		"action": record.action,
		"type": record.type,
		"id": record.id,
		"cancelled": record.cancelled
	};
}

/**
 * Whether a position is on the screen. Points on the canvas border or padding map outside it.
 * @param {Object} screenData - Input target
 * @param {{x: number, y: number}|null} position - Logical position from `pointerPosition()`
 * @returns {boolean} True when the position is inside the screen
 */
export function isOnScreen( screenData, position ) {
	return position !== null && position.x >= 0 && position.y >= 0 &&
		position.x < screenData.width && position.y < screenData.height;
}
