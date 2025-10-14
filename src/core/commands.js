/**
 * Pi.js - Command System Module
 * 
 * Command registration and processing.
 * 
 * @module core/commands
 */

"use strict";

import * as utils from "./utils";

const m_commandList = [];
const m_settings = {};

/**
 * Add a command to the system
 * 
 * @param {string} name - Command name
 * @param {Function} fn - Command function
 */
export function addCommand( name, fn, parameterNames, isScreen = false ) {
	const cmd = {
		"name": name,
		"fn": fn,
		"parameterNames": parameterNames,
		"isScreen": isScreen
	};
	m_commandList.push( cmd );

	// Add to settings item if starts with set
	if( name.startsWith( "set" ) && name !== "set" ) {

		const settingName = cmd.name.substring( 3, 4 ).toLowerCase() + cmd.name.substring( 4 );
		m_settings[ settingName ] = cmd;
	}
}

/**
 * Sorts then sets commands on the api
 * @param {Object} api - An object which will recieve all the commands that have been added
 */
export function processApi( api, screenManager ) {

	// Get the settings list
	const setList = []
	for( const cmd of m_commandList ) {
		if( cmd.name.startsWith( "set" ) ) {
			const settingName = cmd.name.substring( 3, 4 ).toLowerCase() + cmd.name.substring( 4 );
			setList.push( settingName );
		}
	}
	
	// Add the set commands -- not all set commands are screen commands but some are so use
	// screenManager to add command
	screenManager.addCommand( "set", set, setList );

	// Sort global command list
	m_commandList.sort( ( a, b ) => a.name.localeCompare( b.name ) );

	// Sort screen commands
	screenManager.sortScreenCommands();

	// Add all commands to API
	for( const command of m_commandList ) {
		if( command.isScreen ) {
			api[ command.name ] = ( ...args ) => {
				const options = utils.parseOptions( args, command.parameterNames );
				const screenData = screenManager.getActiveScreen();
				return command.fn( screenData, options );
			};
		} else {
			api[ command.name ] = ( ...args ) => {
				const options = utils.parseOptions( args, command.parameterNames );
				return command.fn( options );
			};
		}
	}
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// Global settings command
// -- added in processApi after all settings have been added as commands
// -- needs to handle null values for screenData
function set( screenData, options ) {

	// Loop through all the options
	for( const optionName in options ) {

		// Skip blanks
		if( !options[ optionName ] ) {
			continue;
		}

		// If the option is a valid setting
		if( m_settings[ optionName ] ) {

			// Get the setting data
			const setting = m_settings[ optionName ];
			const optionValues = options[ optionName ];

			// TODO: Make sure this works with nested objects:
			// 		 EX: set( { "pos": { "row": 1, "col": 1 } } );
			// Parse the options from the setting
			// Wrap optionValues in array if not already an array
			const argsArray = Array.isArray( optionValues ) ? optionValues : [ optionValues ];
			const parsedOptions = utils.parseOptions( argsArray, setting.parameterNames );

			// Call the setting function
			if( setting.isScreen ) {
				setting.fn( screenData, parsedOptions );
			} else {
				setting.fn( parsedOptions );
			}
		}
	}
}
