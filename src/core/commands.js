/**
 * Pi.js - Command System Module
 * 
 * Command registration and processing.
 * 
 * @module core/commands
 */

"use strict";

import * as utils from "./utils";

const m = {
	"commandList": [],
	"screenCommandList": []
};

/**
 * Add a command to the system
 * 
 * @param {string} name - Command name
 * @param {Function} fn - Command function
 */
export function addCommand( name, fn, parameterNames, isScreen = false) {
	m.commandList.push( {
		"name": name,
		"fn": fn,
		"parameterNames": parameterNames,
		"isScreen": isScreen
	} );
}

/**
 * Sorts then sets commands on the api
 * @param {Object} api - An object which will recieve all the commands that have been added
 */
export function processApi( api, screenManager ) {

	// Sort global command list
	m.commandList.sort( ( a, b ) => a.name.localeCompare( b.name ) );

	// Sort screen commands
	screenManager.sortScreenCommands();

	// Add all commands to API
	for( const command of m.commandList ) {
		if( command.isScreen ) {
			api[ command.name ] = ( ...args ) => {
				const options = utils.parseOptions( args, command.parameterNames );
				const screenData = screenManager.getActiveScreen();
				command.fn( screenData, options );
			};
		} else {
			api[ command.name ] = ( ...args ) => {
				const options = utils.parseOptions( args, command.parameterNames );
				command.fn( options );
			};
		}
	}
}
