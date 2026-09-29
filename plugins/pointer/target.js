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
 * Throw a validation error with an error code.
 * @param {Function} ErrorType - `TypeError` or `RangeError`
 * @param {string} message - Error message, starting with the command name
 * @param {string} code - Error code
 * @returns {never}
 */
export function throwCode( ErrorType, message, code ) {
	const error = new ErrorType( message );
	error.code = code;
	throw error;
}

/**
 * Read the `isEnabled` of a setting: a boolean, or false when omitted.
 * @param {string} command - Command name for the error message
 * @param {*} isEnabled - Requested value
 * @returns {boolean} The setting
 */
export function readIsEnabled( command, isEnabled ) {
	if( isEnabled == null ) {
		return false;
	}
	if( typeof isEnabled !== "boolean" ) {
		throwCode( TypeError, `${command}: isEnabled must be a boolean.`, "INVALID_IS_ENABLED" );
	}
	return isEnabled;
}

/**
 * Pointer data in the one shape that mouse, touch, press, and click data share. Press data adds
 * `touches`. Data is created once per event and frozen, so reads and handlers share it.
 * @param {Object} record - `x`, `y`, `lastX`, `lastY`, `buttons`, `action`, `type`, `id`, and
 *   `cancelled`
 * @returns {Object} A new frozen data object with exactly those fields, in that order
 */
export function createPointerData( record ) {
	return Object.freeze( {
		"x": record.x,
		"y": record.y,
		"lastX": record.lastX,
		"lastY": record.lastY,
		"buttons": record.buttons,
		"action": record.action,
		"type": record.type,
		"id": record.id,
		"cancelled": record.cancelled
	} );
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
