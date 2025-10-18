/**
 * Example Plugin for Pi.js
 * 
 * Demonstrates basic plugin functionality including:
 * - Adding global commands
 * - Adding screen commands
 * - Using screen data
 * - Lifecycle hooks
 * 
 * @module plugins/example-plugin
 */

"use strict";

/**
 * Example plugin initialization
 * 
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 */
export default function examplePlugin( pluginApi ) {

	// Add custom data to each screen
	pluginApi.addScreenDataItem( "exampleData", {
		"clicks": 0,
		"timestamp": null
	} );

	// Initialize hook - called when each screen is created
	pluginApi.addScreenInitFunction( ( screenData ) => {
		screenData.exampleData.timestamp = Date.now();
	} );

	// Cleanup hook - called when screen is removed
	pluginApi.addScreenCleanupFunction( ( screenData ) => {
		screenData.exampleData = null;
	} );

	// Add a simple global command
	pluginApi.addCommand( "hello", hello, [ "name" ] );

	/**
	 * Say hello
	 * 
	 * @param {Object} options - Command options
	 * @param {string} options.name - Name to greet
	 * @returns {string} Greeting message
	 */
	function hello( options ) {
		const name = options.name || "World";
		const message = `Hello, ${name}!`;
		console.log( message );
		return message;
	}

	// Add a screen command that uses screen data
	pluginApi.addScreenCommand( "trackClick", trackClick, [ "x", "y" ] );

	/**
	 * Track a click on the screen
	 * 
	 * @param {Object} screenData - Screen data
	 * @param {Object} options - Command options
	 * @param {number} options.x - Click X coordinate
	 * @param {number} options.y - Click Y coordinate
	 * @returns {number} Total number of clicks
	 */
	function trackClick( screenData, options ) {
		screenData.exampleData.clicks++;
		const x = options.x || 0;
		const y = options.y || 0;
		console.log( `Click #${screenData.exampleData.clicks} at (${x}, ${y})` );
		return screenData.exampleData.clicks;
	}

	// Add a command that accesses the main API
	pluginApi.addCommand( "getLibraryInfo", getLibraryInfo, [] );

	/**
	 * Get Pi.js library information
	 * 
	 * @returns {Object} Library info
	 */
	function getLibraryInfo() {
		const api = pluginApi.getApi();
		return {
			"version": api.version,
			"pluginSystem": "enabled"
		};
	}

	// Add a drawing command that uses utilities
	pluginApi.addScreenCommand( "drawRandomCircle", drawRandomCircle, [ "x", "y", "radius" ] );

	/**
	 * Draw a circle with random color
	 * 
	 * @param {Object} screenData - Screen data
	 * @param {Object} options - Command options
	 */
	function drawRandomCircle( screenData, options ) {
		const x = options.x || 0;
		const y = options.y || 0;
		const radius = options.radius || 50;

		// Use Pi.js utilities to generate random color
		const utils = pluginApi.utils;
		const r = Math.floor( utils.rndRange( 0, 256 ) );
		const g = Math.floor( utils.rndRange( 0, 256 ) );
		const b = Math.floor( utils.rndRange( 0, 256 ) );
		const color = utils.rgbToColor( r, g, b, 255 );

		// Draw circle
		const ctx = screenData.context;
		ctx.beginPath();
		ctx.arc( x, y, radius, 0, Math.PI * 2 );
		ctx.fillStyle = color.s;
		ctx.fill();
	}
}

// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "example-plugin",
		"version": "1.0.0",
		"description": "Example plugin demonstrating Pi.js plugin capabilities",
		"init": examplePlugin
	} );
}

