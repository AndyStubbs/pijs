/**
 * Pi.js - Error Handling Module
 * 
 * Custom error types and assertion utilities for Pi.js.
 * 
 * @module core/errors
 */

/**
 * Custom error class for Pi.js errors
 */
export class PiError extends Error {
	/**
	 * @param {string} code - Error code
	 * @param {string} msg - Error message
	 */
	constructor( code, msg ) {
		super( msg );
		this.name = "PiError";
		this.code = code;
	}
}

/**
 * Assert a condition, throw PiError if false
 * 
 * @param {boolean} cond - Condition to check
 * @param {string} code - Error code if assertion fails
 * @param {string} msg - Error message if assertion fails
 */
export const assert = ( cond, code, msg ) => {
	if( !cond ) {
		throw new PiError( code, msg );
	}
};

/**
 * Error modes for logging
 */
export const ErrorMode = Object.freeze( {
	"LOG": "log",
	"THROW": "throw",
	"NONE": "none"
} );

let currentErrorMode = ErrorMode.LOG;

/**
 * Set the error mode
 * 
 * @param {string} mode - One of "log", "throw", "none"
 */
export function setErrorMode( mode ) {
	if( Object.values( ErrorMode ).includes( mode ) ) {
		currentErrorMode = mode;
	}
}

/**
 * Log an error according to current error mode
 * 
 * @param {string} msg - Error message
 */
export function logError( msg ) {
	if( currentErrorMode === ErrorMode.LOG ) {
		console.error( msg );
	} else if( currentErrorMode === ErrorMode.THROW ) {
		throw new Error( msg );
	}
	// NONE mode does nothing
}

