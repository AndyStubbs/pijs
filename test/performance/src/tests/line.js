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
let m_operations = [];

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
		"cleanUp": cleanUp,
		"itemCountStart": 500,
		"itemFactor": 20,
		"exludeVersions": []
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
	generateOperationList();
}

/**
 * Generates a pre-seeded list of 5000 line operations with parameters
 * 
 * @returns {void}
 */
function generateOperationList() {
	m_operations = [];
	
	for( let i = 0; i < 5000; i++ ) {
		const operation = generateRandomOperation();
		m_operations.push( operation );
	}
}

/**
 * Deletes the operations data
 * 
 * @returns {void}
 */
function cleanUp() {
	m_pal = null;
	m_operations = [];
}

/**
 * Generates a random line operation with parameters
 * 
 * @returns {Object} Operation object with function and parameters
 */
function generateRandomOperation() {
	const width = $.width();
	const height = $.height();
	
	const x1 = Math.floor( m_seededRandom() * width );
	const y1 = Math.floor( m_seededRandom() * height );
	const x2 = Math.floor( m_seededRandom() * width );
	const y2 = Math.floor( m_seededRandom() * height );
	
	return {
		"func": $.line,
		"params": [ x1, y1, x2, y2 ],
		"getParams": () => [
			x1 + Math.floor( Math.random() * 3 ) - 1,
			y1 + Math.floor( Math.random() * 3 ) - 1,
			x2 + Math.floor( Math.random() * 3 ) - 1,
			y2 + Math.floor( Math.random() * 3 ) - 1
		]
	};
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

	for( let i = 0; i < itemCount; i++ ) {
		
		// Cycle through the pre-generated operations
		const operationIndex = i % m_operations.length;
		const operation = m_operations[ operationIndex ];
		
		// Set random color
		$.setColor( Math.floor( Math.random() * m_pal.length ) );
		
		// Execute the operation with variable parameters to prevent JIT optimization
		const params = operation.getParams ? operation.getParams() : operation.params;
		operation.func( ...params );
	}
}
