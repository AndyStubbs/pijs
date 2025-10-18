/**
 * Pi.js - Plugin System
 * 
 * Plugin registration and management for extending Pi.js functionality.
 * 
 * @module core/plugins
 */

"use strict";

import * as commands from "./commands.js";
import * as screenManager from "./screen-manager.js";
import * as utils from "./utils.js";

const m_plugins = [];
let m_api = null;
let m_isInitialized = false;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {
	m_api = commands.getApi();
	m_isInitialized = true;

	// Process any plugins that were registered before init
	processEarlyRegistrations();
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


/**
 * Register a plugin with Pi.js
 * 
 * @param {Object} pluginConfig - Plugin configuration object
 * @param {string} pluginConfig.name - Unique name for the plugin
 * @param {Function} pluginConfig.init - Initialization function that receives pluginApi
 * @param {string} [pluginConfig.version] - Optional version string
 * @param {string} [pluginConfig.description] - Optional description
 * @returns {void}
 * 
 * @example
 * pi.registerPlugin( {
 *   "name": "my-plugin",
 *   "version": "1.0.0",
 *   "description": "My custom plugin",
 *   "init": ( pluginApi ) => {
 *     pluginApi.addCommand( "myCommand", myFn, [ "param1" ] );
 *   }
 * } );
 */
commands.addCommand( "registerPlugin", registerPlugin, [ "pluginConfig" ] );
function registerPlugin( options ) {
	const pluginConfig = options.pluginConfig;

	// Validate plugin config
	if( !pluginConfig || typeof pluginConfig !== "object" ) {
		const error = new TypeError( "registerPlugin: Plugin config must be an object." );
		error.code = "INVALID_PLUGIN_CONFIG";
		throw error;
	}

	if( !pluginConfig.name || typeof pluginConfig.name !== "string" ) {
		const error = new TypeError( "registerPlugin: Plugin must have a 'name' property." );
		error.code = "INVALID_PLUGIN_NAME";
		throw error;
	}

	if( !pluginConfig.init || typeof pluginConfig.init !== "function" ) {
		const error = new TypeError(
			`registerPlugin: Plugin '${pluginConfig.name}' must have an 'init' function.`
		);
		error.code = "INVALID_PLUGIN_INIT";
		throw error;
	}

	// Check for duplicate
	if( m_plugins.find( p => p.name === pluginConfig.name ) ) {
		const error = new Error(
			`registerPlugin: Plugin '${pluginConfig.name}' is already registered.`
		);
		error.code = "DUPLICATE_PLUGIN";
		throw error;
	}

	// Store plugin info
	const pluginInfo = {
		"name": pluginConfig.name,
		"version": pluginConfig.version || "unknown",
		"description": pluginConfig.description || "",
		"config": pluginConfig,
		"initialized": false
	};

	m_plugins.push( pluginInfo );

	// If system is initialized, process immediately
	if( m_isInitialized ) {
		initializePlugin( pluginInfo );
	}
}

/**
 * Get list of registered plugins
 * 
 * @returns {Array<Object>} Array of plugin info objects with name, version, description
 * 
 * @example
 * const plugins = pi.getPlugins();
 * console.log( plugins ); // [{ name: "my-plugin", version: "1.0.0", ... }]
 */
commands.addCommand( "getPlugins", getPlugins, [] );
function getPlugins() {
	return m_plugins.map( p => ( {
		"name": p.name,
		"version": p.version,
		"description": p.description,
		"initialized": p.initialized
	} ) );
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Initialize a plugin
function initializePlugin( pluginInfo ) {
	if( pluginInfo.initialized ) {
		return;
	}

	// Create plugin API
	const pluginApi = {
		"addCommand": commands.addCommand,
		"addScreenCommand": screenManager.addCommand,
		"addPixelCommand": screenManager.addPixelCommand,
		"addAACommand": screenManager.addAACommand,
		"addScreenDataItem": screenManager.addScreenDataItem,
		"addScreenDataItemGetter": screenManager.addScreenDataItemGetter,
		"addScreenInternalCommands": screenManager.addScreenInternalCommands,
		"addScreenInitFunction": screenManager.addScreenInitFunction,
		"addScreenCleanupFunction": screenManager.addScreenCleanupFunction,
		"getApi": () => m_api,
		"utils": utils
	};

	// Initialize plugin
	try {
		pluginInfo.config.init( pluginApi );
		pluginInfo.initialized = true;
	} catch( error ) {
		const pluginError = new Error(
			`registerPlugin: Failed to initialize plugin '${pluginInfo.name}': ${error.message}`
		);
		pluginError.code = "PLUGIN_INIT_FAILED";
		pluginError.originalError = error;
		throw pluginError;
	}

	// Reprocess API to include new commands
	commands.processApi();
}

// Process plugins that were registered before system was initialized
function processEarlyRegistrations() {
	for( const pluginInfo of m_plugins ) {
		if( !pluginInfo.initialized ) {
			initializePlugin( pluginInfo );
		}
	}
}

