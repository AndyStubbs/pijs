/**
 * Pset Test Module
 * 
 * Performance test for drawing pixels on the screen.
 * 
 * @module pset
 */

"use strict";

let m_pal = null;
let m_seededRandom = null;
let m_operations = [];

/**
 * Gets the pset test configuration object
 * 
 * @returns {Object} Test configuration
 */
export function getConfig() {
	return {
		"name": "Pset Test",
		"run": run,
		"init": init,
		"cleanUp": cleanUp,
		"itemCountStart": 30000
	};
}

/**
 * Initializes the pset test
 * 
 * @returns {void}
 */
function init() {

	// Set up random seed for consistent test results
	m_seededRandom = new Math.seedrandom( "pset", true );
	
	m_pal = $.getPal();
	generateOperationList();
}

/**
 * Generates a pre-seeded list of 5000 pset operations with parameters
 * 
 * @returns {void}
 */
function generateOperationList() {
	m_operations = [];
	
	for( let i = 0; i < 35000; i++ ) {
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
 * Generates a random paset operation with parameters
 * 
 * @returns {Object} Operation object with function and parameters
 */
function generateRandomOperation() {
	const width = $.width();
	const height = $.height();
	
	const x = Math.floor( m_seededRandom() * width );
	const y = Math.floor( m_seededRandom() * height );
	
	return {
		"func": $.pset,
		"params": [ x, y ],
		"getParams": () => [
			x + Math.floor( Math.random() * 3 ) - 1,
			y + Math.floor( Math.random() * 3 ) - 1
		]
	};
}

/**
 * Runs the pset test with specified item count
 * 
 * @param {number} itemCount - Number of pixels to set
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
