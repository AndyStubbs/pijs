/**
 * Pi Vision Utility Functions for Pi.js
 * 
 * Provides text input functionality with cursor blinking and validation.
 * 
 * @module plugins/pi-vision/util
 */

"use strict";

export default { validateOptionsObject };

/**
 * Ensure the caller supplied an options object
 * 
 * @param {Object} options - Raw options
 * @returns {void}
 */
function validateOptionsObject( options, title ) {
	if( !options || typeof options !== "object" || Array.isArray( options ) ) {
		const error = new TypeError( `${title}: Options must be an object.` );
		error.code = "INVALID_PI_VISION_OPTIONS";
		throw error;
	}
}

