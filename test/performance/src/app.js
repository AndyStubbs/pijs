/**
 * Performance Test Application Module
 * 
 * Main application logic for the performance testing system.
 * 
 * @module app
 */

"use strict";

// Set up random seed for consistent test results
Math.seedrandom( "constant" );

import * as g_testManager from "./test-manager.js";

// App-level state for display positioning
let m_centerY = 0;
let m_centerPosY = 0;

// Initialize the application when the DOM is ready
$.ready( initApp );

/**
 * Initializes the application
 * 
 * @returns {void}
 */
async function initApp() {

	// Set up the screen
	$.screen( "800x600" );
	$.setFont( 4 );
	
	// Calculate display positioning
	m_centerY = Math.floor( $.height() / 2 ) - 20;
	m_centerPosY = Math.floor( $.getRows() / 2 ) - 1;

	// Set up display
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Performance Tests", true, true );
	$.setPos( 0, m_centerPosY );
	$.setColor( 15 );
	$.print( "Loading...", true, true );
	
	// Wait for test manager initialization to complete
	await g_testManager.init();

	waitForKeyLoop();
}

/**
 * Waits for user input to begin testing
 * 
 * @returns {void}
 */
function waitForKeyLoop() {
	let i = 0;
	let lastT = 0;
	const phrase = "Press any key to begin";
	const loop = ( t ) => {
		$.cls( 0, 100, $.width(), $.height() - 100 );
		$.setColor( 7 );
		$.setPos( 1, $.getRows() - 2 );
		$.print( "Target FPS: " + g_testManager.getTargetFps().toFixed( 2 ) );
		$.setColor( 2 );
		$.rect( 300, m_centerY - 16, 200, 32 );
		$.setPos( 0, m_centerPosY );
		$.print( phrase, true, true );
		$.setColor( 10 );
		$.setPos( 39 + i, m_centerPosY );
		if( i <= phrase.length - 1 ) {
			$.print( phrase.substring( i, i + 1 ), true );
		}
		if( t > lastT + 150 ) {
			i += 1;
			if( i > phrase.length ) {
				i = 0;
			}
			lastT = t;
		}

		if( $.inkey().length > 0 ) {
			g_testManager.startTests();
			return;
		}
		requestAnimationFrame( loop );
	};
	loop();
}
