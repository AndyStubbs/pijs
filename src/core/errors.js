/**
 * Pi.js - Errors Module
 *
 * Shared construction for coded errors thrown by core commands and internals.
 *
 * @module core/errors
 */

"use strict";

/**
 * Throw an error with a code
 *
 * @param {Function} ErrorType - Error constructor, such as Error, TypeError, or RangeError
 * @param {string} message - Error message
 * @param {string} code - Error code assigned to the error's code property
 * @returns {never}
 */
export function throwError( ErrorType, message, code ) {
	const error = new ErrorType( message );
	error.code = code;
	throw error;
}
