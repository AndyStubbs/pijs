/**
 * Pi.js - Command System Module
 * 
 * Command registration and processing.
 * 
 * @module core/commands
 */

"use strict";

const m = {
	"commandList": []
};

/**
 * Add a command to the system
 * 
 * @param {string} name - Command name
 * @param {Function} fn - Command function
 */
export function addCommand( name, fn ) {
	m.commandList.push( {
		"name": name,
		"fn": fn
	} );
}

/**
 * Get commands
 * @param {Object} api - An object which will recieve all the commands that have been added
 */
export function processApi( api ) {
	m.commandList.sort( ( a, b ) => a.name.localeCompare( b.name ) );

	for( const command of m.commandList ) {
		api[ command.name ] = command.fn;
	}
}
