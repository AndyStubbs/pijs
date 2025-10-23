/**
 * Line Test Module
 * 
 * Performance test for drawing lines on the screen.
 * 
 * @module line
 */

"use strict";

let m_pal = null;

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
			Math.floor( Math.random() * $.width() ),
			Math.floor( Math.random() * $.height() ),
			Math.floor( Math.random() * $.width() ),
			Math.floor( Math.random() * $.height() )
		);
	}
}
