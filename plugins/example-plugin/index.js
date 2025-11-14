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
 * @version 1.0.0
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

	// Add the commands to the pi.js API
	pluginApi.addCommand( "hello", hello, false, [ "name" ] );
	pluginApi.addCommand( "trackClick", trackClick, true, [ "x", "y" ] );
	pluginApi.addCommand( "showClicks", showClicks, true, [] );
	pluginApi.addCommand( "getLibraryInfo", getLibraryInfo, false, [] );
	pluginApi.addCommand( "drawRandomCircle", drawRandomCircle, true, [ "x", "y", "radius" ] );
	pluginApi.addCommand( "star", star, true, [ "x", "y", "radius", "points" ] );

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
		return message;
	}

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
		
		// Store old cursor position
		const cursorPx =  screenData.api.getPosPx();

		// Print the word click at the click position
		screenData.api.setPosPx( x, y );
		screenData.api.print( "click", true );

		// Restore cursor position
		screenData.api.setPosPx( cursorPx );
		return screenData.exampleData.clicks;
	}

	/**
	 * Get Pi.js library information
	 * @param {Object} screenData - Screen data
	 */
	function showClicks( screenData ) {
		screenData.api.print( `Total Clicks: ${screenData.exampleData.clicks}` );
	}

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

	/**
	 * Draw a circle with random color
	 * 
	 * @param {Object} screenData - Screen data
	 * @param {Object} options - Command options
	 * @param {number} options.x - Circle center X coordinate
	 * @param {number} options.y - Circle center Y coordinate
	 * @param {number} options.radius - Circle radius
	 */
	function drawRandomCircle( screenData, options ) {
		const x = options.x || 0;
		const y = options.y || 0;
		const radius = options.radius || 50;

		// Save current screen color
		const currentColor = screenData.api.getColor();

		// Use Pi.js utilities to generate random color
		const utils = pluginApi.utils;
		const r = Math.floor( utils.rndRange( 0, 256 ) );
		const g = Math.floor( utils.rndRange( 0, 256 ) );
		const b = Math.floor( utils.rndRange( 0, 256 ) );
		const color = utils.rgbToColor( r, g, b, 255 );
		screenData.api.setColor( color );

		// Draw circle
		screenData.api.circle( x, y, radius, color );

		// Restore current screen color
		screenData.api.setColor( currentColor );
	}

	/**
	 * Draw a star with shape
	 * 
	 * @param {Object} screenData - Screen data
	 * @param {Object} options - Command options
	 * @param {number} options.x - Star center X coordinate
	 * @param {number} options.y - Star center Y coordinate
	 * @param {number} options.radius - Star radius
	 * @param {number} options.radius - Star number of points
	 */
	function star( screenData, options ) {
		const x = options.x || 0;
		const y = options.y || 0;
		const radius = options.radius || 50;
		const points = options.points || 5;
		const innerRadius = radius * 0.5;
		
		let px0, py0, px1, py1;
		for( let i = 0; i < points * 2; i++ ) {
			const r = i % 2 === 0 ? radius : innerRadius;
			const angle = ( i * Math.PI ) / points;
			const px2 = x + r * Math.cos( angle - Math.PI / 2 );
			const py2 = y + r * Math.sin( angle - Math.PI / 2 );
			
			if( i === 0 ) {
				px0 = px2;
				py0 = py2;
			} else {
				screenData.api.line( px1, py1, px2, py2 );
			}
			if( i === points * 2 - 1 ) {
				screenData.api.line( px2, py2, px0, py0 );
			}
			px1 = px2;
			py1 = py2;
		}
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
