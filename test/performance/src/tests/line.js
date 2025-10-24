/**
 * Line Test Module
 * 
 * Performance test for drawing lines on the screen.
 * 
 * @module line
 */

"use strict";

let m_pal = null;
let m_seededRandom = null;

/**
 * Gets the line test configuration object
 * 
 * @returns {Object} Test configuration
 */
export function getConfig() {
	return {
		"name": "Line Test",
		"run": run,
		"init": init,
		"itemCountStart": 500
	};
}

/**
 * Initializes the line test
 * 
 * @returns {void}
 */
function init() {

	// Set up random seed for consistent test results
	m_seededRandom = new Math.seedrandom( "line", true );
	
	m_pal = $.getPal();
}

/**
 * Runs the line test with specified item count
 * 
 * @param {number} itemCount - Number of lines to draw
 * @param {Object} data - Test data object
 * @returns {void}
 */
function run( itemCount ) {
	$.cls();
	for( let i = 0; i < itemCount; i += 1 ) {
		$.setColor( Math.floor( Math.random() * m_pal.length ) );
		$.line(
			Math.floor( m_seededRandom() * $.width() ) + Math.floor( Math.random() * 3 ) - 1,
			Math.floor( m_seededRandom() * $.height() ) + Math.floor( Math.random() * 3 ) - 1,
			Math.floor( m_seededRandom() * $.width() ) + Math.floor( Math.random() * 3 ) - 1,
			Math.floor( m_seededRandom() * $.height() ) + Math.floor( Math.random() * 3 ) - 1
		);
	}
}
