/**
 * Pi.js - Plugin System Core Module
 * 
 * Plugin registration and management for extending Pi.js functionality.
 * 
 * @module core/plugins
 */

"use strict";

// Import modules directly
import * as g_commands from "./commands.js";
import * as g_screenManager from "./screen-manager.js";
import * as g_utils from "./utils.js";

const m_plugins = [];
let m_api = null;
let m_isInitialized = false;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init( api ) {
	m_api = api;
	m_isInitialized = true;

	// Register external API commands
	g_commands.addCommand(
		"registerPlugin", registerPlugin, false, [ "name", "version", "description", "init" ]
	);
	g_commands.addCommand(
		"getPlugins", getPlugins, false, []
	);
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


/**
 * Register a plugin with Pi.js
 * 
 * @param {Object} options - Plugin configuration
 * @param {string} options.name - Unique name for the plugin
 * @param {Function} options.init - Initialization function that receives pluginApi
 * @param {string} [options.version] - Optional version string
 * @param {string} [options.description] - Optional description
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
function registerPlugin( options ) {

	// Validate required parameters
	if( !options.name || typeof options.name !== "string" ) {
		const error = new TypeError( "registerPlugin: Plugin must have a 'name' property." );
		error.code = "INVALID_PLUGIN_NAME";
		throw error;
	}

	if( !options.init || typeof options.init !== "function" ) {
		const error = new TypeError(
			`registerPlugin: Plugin '${options.name}' must have an 'init' function.`
		);
		error.code = "INVALID_PLUGIN_INIT";
		throw error;
	}

	// Check for duplicate
	if( m_plugins.find( p => p.name === options.name ) ) {
		const error = new Error(
			`registerPlugin: Plugin '${options.name}' is already registered.`
		);
		error.code = "DUPLICATE_PLUGIN";
		throw error;
	}

	// Store plugin info
	const pluginInfo = {
		"name": options.name,
		"version": options.version || "unknown",
		"description": options.description || "",
		"config": options,
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
		"addCommand": g_commands.addCommand,
		"addScreenDataItem": g_screenManager.addScreenDataItem,
		"addScreenDataItemGetter": g_screenManager.addScreenDataItemGetter,
		"addScreenInitFunction": g_screenManager.addScreenInitFunction,
		"addScreenCleanupFunction": g_screenManager.addScreenCleanupFunction,
		"getScreenData": g_screenManager.getScreenData,
		"getAllScreensData": g_screenManager.getAllScreensData,
		"getApi": () => m_api,
		"utils": g_utils
	};

	// Initialize plugin
	try {
		pluginInfo.config.init( pluginApi );
		g_commands.processCommands( m_api );
		pluginInfo.initialized = true;
	} catch( error ) {
		const pluginError = new Error(
			`registerPlugin: Failed to initialize plugin '${pluginInfo.name}': ${error.message}`
		);
		pluginError.code = "PLUGIN_INIT_FAILED";
		pluginError.originalError = error;
		throw pluginError;
	}
}

