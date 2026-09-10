/**
 * Pi Vision Utility Functions for Pi.js
 *
 * Validates options objects accepted by Pi Vision commands.
 *
 * @module plugins/pi-vision/util
 */

"use strict";

export default { "validateOptionsObject": validateOptionsObject };

/**
 * Ensure the caller supplied an options object
 *
 * @param {Object} options - Raw options
 * @param {string} title - Command name used in validation errors.
 * @returns {void}
 */
function validateOptionsObject( options, title ) {
	if( !options || typeof options !== "object" || Array.isArray( options ) ) {
		const error = new TypeError( `${title}: Options must be an object.` );
		error.code = "INVALID_PI_VISION_OPTIONS";
		throw error;
	}
}
