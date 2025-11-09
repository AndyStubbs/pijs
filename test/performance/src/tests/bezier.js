/**
 * Bezier Test Module
 * 
 * Performance test for drawing bezier curves on the screen.
 * 
 * @module bezier
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
		"name": "Bezier Test",
		"run": run,
		"init": init,
		"cleanUp": cleanUp,
		"itemCountStart": 50,
		"itemFactor": 1,
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
	m_seededRandom = new Math.seedrandom( "bezier", true );
	
	m_pal = $.getPal();
	generateOperationList();
}

/**
 * Generates a pre-seeded list of 1000 bezier operations with parameters
 * 
 * @returns {void}
 */
function generateOperationList() {
	m_operations = [];
	
	for( let i = 0; i < 1000; i++ ) {
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
	
	const bezierX1 = Math.floor( m_seededRandom() * width );
	const bezierY1 = Math.floor( m_seededRandom() * height );
	const bezierX2 = Math.floor( m_seededRandom() * width );
	const bezierY2 = Math.floor( m_seededRandom() * height );
	const bezierX3 = Math.floor( m_seededRandom() * width );
	const bezierY3 = Math.floor( m_seededRandom() * height );
	const bezierX4 = Math.floor( m_seededRandom() * width );
	const bezierY4 = Math.floor( m_seededRandom() * height );
	return {
		"func": $.bezier,
		"params": [ bezierX1, bezierY1, bezierX2, bezierY2, bezierX3, bezierY3, bezierX4, bezierY4 ],
		"getParams": () => [
			bezierX1 + Math.floor( Math.random() * 3 ) - 1,
			bezierY1 + Math.floor( Math.random() * 3 ) - 1,
			bezierX2 + Math.floor( Math.random() * 3 ) - 1,
			bezierY2 + Math.floor( Math.random() * 3 ) - 1,
			bezierX3 + Math.floor( Math.random() * 3 ) - 1,
			bezierY3 + Math.floor( Math.random() * 3 ) - 1,
			bezierX4 + Math.floor( Math.random() * 3 ) - 1,
			bezierY4 + Math.floor( Math.random() * 3 ) - 1
		]
	};
}

/**
 * Runs the bezier test with specified item count
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
