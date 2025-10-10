/**
 * Pi.js - Logging Module
 * 
 * Optional development logging hooks for debugging.
 * 
 * @module core/log
 */

let enabled = false;
let logFn = console.log;

/**
 * Enable or disable logging
 * 
 * @param {boolean} state - True to enable, false to disable
 */
export function setLogging( state ) {
	enabled = !!state;
}

/**
 * Set custom log function
 * 
 * @param {Function} fn - Custom logging function
 */
export function setLogFunction( fn ) {
	if( typeof fn === "function" ) {
		logFn = fn;
	}
}

/**
 * Log a message if logging is enabled
 * 
 * @param {...*} args - Arguments to log
 */
export function log( ...args ) {
	if( enabled ) {
		logFn( ...args );
	}
}

/**
 * Log debug information
 * 
 * @param {string} category - Debug category
 * @param {...*} args - Arguments to log
 */
export function debug( category, ...args ) {
	if( enabled ) {
		logFn( `[${category}]`, ...args );
	}
}

