/**
 * Arc Test Module
 * 
 * Performance test for drawing arcs on the screen.
 * 
 * @module arc
 */

"use strict";

let m_pal = null;

/**
 * Gets the arc test configuration object
 * 
 * @returns {Object} Test configuration
 */
export function getConfig() {
	return {
		"name": "Arc Test",
		"run": run,
		"init": init,
		"itemCountStart": 250
	};
}


/**
 * Initializes the arc test
 * 
 * @returns {void}
 */
function init() {
	m_pal = $.getPal();
}

/**
 * Runs the arc test with specified item count
 * 
 * @param {number} itemCount - Number of arcs to draw
 * @returns {void}
 */
function run( itemCount ) {
	$.cls();
	for( let i = 0; i < itemCount; i += 1 ) {
		$.setColor( Math.floor( Math.random() * m_pal.length ) );
		$.arc(
			Math.floor( Math.random() * $.width() ),
			Math.floor( Math.random() * $.height() ),
			Math.floor( Math.random() * $.width() ),
			Math.floor( Math.random() * 360 ),
			Math.floor( Math.random() * 360 )
		);
	}
}

