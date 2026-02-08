/**
 * Graphics Pixels Test Module
 * 
 * Performance test for all pixel based graphics drawing operations including:
 * line, circle, ellipse, rect, pset, getPixel, getPixelColor, arc, bezier
 * 
 * @module graphicsPixel
 */

"use strict";

let m_pal = null;
let m_operations = [];
let m_operationTypes = [];
let m_seededRandom = null;

/**
 * Gets the graphics pixel test configuration object
 * 
 * @returns {Object} Test configuration
 */
export function getConfig( operationTypes ) {
	let name = "Graphics Test";
	if( operationTypes && operationTypes.length === 1 ) {
		name = `Graphics ${operationTypes[ 0 ]} Test`;
	}
	return {
		"name": name,
		"run": run,
		"init": init,
		"cleanUp": cleanUp,
		"itemCountStart": 500,
		"itemFactor": 10,
		"exludeVersions": [],
		"operationTypes": operationTypes
	};
}

/**
 * Initializes the graphics pixel test and generates operation list
 * 
 * @returns {void}
 */
function init( config ) {

	if( !config.operationTypes ) {
		m_operationTypes = [
			"arc", "bezier", "circle", "circle-filled",  "ellipse", "ellipse-filled", "line",
			"put", "pset", "rect", "rect-filled"
		];
	} else {
		m_operationTypes = config.operationTypes;
	}

	// Set up random seed for consistent test results
	m_seededRandom = new Math.seedrandom( "graphics", true );
	
	m_pal = $.getPal();
	generateOperationList();

	for( const operation of m_operations ) {
		if( !$[ operation.name ] ) {
			throw new Error( `Function ${operation.name} not found` );
		}
	}
}

/**
 * Generates a pre-seeded list of 1000 graphics operations with parameters
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
 * Generates a random graphics operation with parameters
 * 
 * @returns {Object} Operation object with function and parameters
 */
function generateRandomOperation() {
	const width = $.width();
	const height = $.height();
	const colorCount = m_pal.length;
	
	// Even distribution of operations
	const rnd = Math.floor( m_seededRandom() * m_operationTypes.length );
	const operationType = m_operationTypes[ rnd ];
	
	switch( operationType ) {
		case "arc":
			const arcX = Math.floor( m_seededRandom() * width );
			const arcY = Math.floor( m_seededRandom() * height );
			const arcRadius = Math.floor( m_seededRandom() * 40 ) + 10;
			const arcAngle1 = Math.floor( m_seededRandom() * 360 );
			const arcAngle2 = Math.floor( m_seededRandom() * 360 );
			return {
				"name": "arc",
				"func": $.arc,
				"params": [ arcX, arcY, arcRadius, arcAngle1, arcAngle2 ],
				"getParams": () => [
					arcX + Math.floor( Math.random() * 3 ) - 1,
					arcY + Math.floor( Math.random() * 3 ) - 1,
					arcRadius + Math.floor( Math.random() * 3 ) - 1,
					arcAngle1 + Math.floor( Math.random() * 3 ) - 1,
					arcAngle2 + Math.floor( Math.random() * 3 ) - 1
				]
			};
			
		case "bezier":
			const bezierX1 = Math.floor( m_seededRandom() * width );
			const bezierY1 = Math.floor( m_seededRandom() * height );
			const bezierX2 = Math.floor( m_seededRandom() * width );
			const bezierY2 = Math.floor( m_seededRandom() * height );
			const bezierX3 = Math.floor( m_seededRandom() * width );
			const bezierY3 = Math.floor( m_seededRandom() * height );
			const bezierX4 = Math.floor( m_seededRandom() * width );
			const bezierY4 = Math.floor( m_seededRandom() * height );
			return {
				"name": "bezier",
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
			
		case "circle":
			const circleX = Math.floor( m_seededRandom() * width );
			const circleY = Math.floor( m_seededRandom() * height );
			const circleRadius = Math.floor( m_seededRandom() * 50 ) + 5;
			return {
				"name": "circle",
				"func": $.circle,
				"params": [ circleX, circleY, circleRadius ],
				"getParams": () => [
					circleX + Math.floor( Math.random() * 3 ) - 1,
					circleY + Math.floor( Math.random() * 3 ) - 1,
					circleRadius + Math.floor( Math.random() * 3 ) - 1
				]
			};
			
		case "circle-filled":
			const circleFillX = Math.floor( m_seededRandom() * width );
			const circleFillY = Math.floor( m_seededRandom() * height );
			const circleFillRadius = Math.floor( m_seededRandom() * 50 ) + 5;
			const circleFillColor = Math.floor( m_seededRandom() * colorCount );
			return {
				"name": "circle",
				"func": $.circle,
				"params": [ circleFillX, circleFillY, circleFillRadius, circleFillColor ],
				"getParams": () => [
					circleFillX + Math.floor( Math.random() * 3 ) - 1,
					circleFillY + Math.floor( Math.random() * 3 ) - 1,
					circleFillRadius + Math.floor( Math.random() * 3 ) - 1,
					circleFillColor
				]
			};
			
		case "ellipse":
			const ellipseX = Math.floor( m_seededRandom() * width );
			const ellipseY = Math.floor( m_seededRandom() * height );
			const ellipseRadiusX = Math.floor( m_seededRandom() * 60 ) + 5;
			const ellipseRadiusY = Math.floor( m_seededRandom() * 40 ) + 5;
			return {
				"name": "ellipse",
				"func": $.ellipse,
				"params": [ ellipseX, ellipseY, ellipseRadiusX, ellipseRadiusY ],
				"getParams": () => [
					ellipseX + Math.floor( Math.random() * 3 ) - 1,
					ellipseY + Math.floor( Math.random() * 3 ) - 1,
					ellipseRadiusX + Math.floor( Math.random() * 3 ) - 1,
					ellipseRadiusY + Math.floor( Math.random() * 3 ) - 1
				]
			};
			
		case "ellipse-filled":
			const ellipseFillX = Math.floor( m_seededRandom() * width );
			const ellipseFillY = Math.floor( m_seededRandom() * height );
			const ellipseFillRadiusX = Math.floor( m_seededRandom() * 60 ) + 5;
			const ellipseFillRadiusY = Math.floor( m_seededRandom() * 40 ) + 5;
			const ellipseFillColor = Math.floor( m_seededRandom() * colorCount );
			return {
				"name": "ellipse",
				"func": $.ellipse,
				"params": [ ellipseFillX, ellipseFillY, ellipseFillRadiusX, ellipseFillRadiusY, ellipseFillColor ],
				"getParams": () => [
					ellipseFillX + Math.floor( Math.random() * 3 ) - 1,
					ellipseFillY + Math.floor( Math.random() * 3 ) - 1,
					ellipseFillRadiusX + Math.floor( Math.random() * 3 ) - 1,
					ellipseFillRadiusY + Math.floor( Math.random() * 3 ) - 1,
					ellipseFillColor
				]
			};
			
		case "line":
			const lineX1 = Math.floor( m_seededRandom() * width );
			const lineY1 = Math.floor( m_seededRandom() * height );
			const lineX2 = Math.floor( m_seededRandom() * width );
			const lineY2 = Math.floor( m_seededRandom() * height );
			return {
				"name": "line",
				"func": $.line,
				"params": [ lineX1, lineY1, lineX2, lineY2 ],
				"getParams": () => [
					lineX1 + Math.floor( Math.random() * 3 ) - 1,
					lineY1 + Math.floor( Math.random() * 3 ) - 1,
					lineX2 + Math.floor( Math.random() * 3 ) - 1,
					lineY2 + Math.floor( Math.random() * 3 ) - 1
				]
			};
			
		case "pset":
			const psetX = Math.floor( m_seededRandom() * width );
			const psetY = Math.floor( m_seededRandom() * height );
			return {
				"name": "pset",
				"func": $.pset,
				"params": [ psetX, psetY ],
				"getParams": () => [
					psetX + Math.floor( Math.random() * 3 ) - 1,
					psetY + Math.floor( Math.random() * 3 ) - 1
				]
			};

		case "put":
			const putX = Math.floor( m_seededRandom() * width );
			const putY = Math.floor( m_seededRandom() * height );
			const putWidth = Math.floor( m_seededRandom() * 5 ) + 35;
			const putHalfWidth = Math.floor( putWidth / 2 );
			const putHeight = Math.floor( m_seededRandom() * 5 ) + 35;
			const putHalfHeight = Math.floor( putHeight / 2 );
			const putData = [];
			for( let y = 0; y < putHeight; y += 1 ) {
				putData.push( [] );
				for( let x = 0; x < putWidth; x += 1 ) {
					putData[ y ].push( Math.floor( m_seededRandom() * m_pal.length ) );
				}
			}
			return {
				"name": "put",
				"func": $.put,
				"params": [ putData, putX, putY ],
				"getParams": () => [
					putData,
					putX + Math.floor( Math.random() * putWidth ) - putHalfWidth,
					putY + Math.floor( Math.random() * putHeight ) - putHalfHeight
				]
			};
		
		case "rect":
			const rectX = Math.floor( m_seededRandom() * width );
			const rectY = Math.floor( m_seededRandom() * height );
			const rectWidth = Math.floor( m_seededRandom() * 100 ) + 10;
			const rectHeight = Math.floor( m_seededRandom() * 80 ) + 10;
			return {
				"name": "rect",
				"func": $.rect,
				"params": [ rectX, rectY, rectWidth, rectHeight ],
				"getParams": () => [
					rectX + Math.floor( Math.random() * 3 ) - 1,
					rectY + Math.floor( Math.random() * 3 ) - 1,
					rectWidth + Math.floor( Math.random() * 3 ) - 1,
					rectHeight + Math.floor( Math.random() * 3 ) - 1
				]
			};
			
		case "rect-filled":
			const rectFillX = Math.floor( m_seededRandom() * width );
			const rectFillY = Math.floor( m_seededRandom() * height );
			const rectFillWidth = Math.floor( m_seededRandom() * 100 ) + 10;
			const rectFillHeight = Math.floor( m_seededRandom() * 80 ) + 10;
			const rectFillColor = Math.floor( m_seededRandom() * colorCount );
			return {
				"name": "rect",
				"func": $.rect,
				"params": [ rectFillX, rectFillY, rectFillWidth, rectFillHeight, rectFillColor ],
				"getParams": () => [
					rectFillX + Math.floor( Math.random() * 3 ) - 1,
					rectFillY + Math.floor( Math.random() * 3 ) - 1,
					rectFillWidth + Math.floor( Math.random() * 3 ) - 1,
					rectFillHeight + Math.floor( Math.random() * 3 ) - 1,
					rectFillColor
				]
			};
			
		default:
			const defaultX = Math.floor( m_seededRandom() * width );
			const defaultY = Math.floor( m_seededRandom() * height );
			return {
				"name": "pset",
				"func": $.pset,
				"params": [ defaultX, defaultY ],
				"getParams": () => [
					defaultX + Math.floor( Math.random() * 3 ) - 1,
					defaultY + Math.floor( Math.random() * 3 ) - 1
				]
			};
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
 * Runs the graphics pixel test with specified item count
 * 
 * @param {number} itemCount - Number of operations to execute
 * @returns {void}
 */
function run( itemCount ) {
	$.cls();
	
	for( let i = 0; i < itemCount - 1; i++ ) {

		// Cycle through the pre-generated operations
		const operationIndex = i % m_operations.length;
		const operation = m_operations[ operationIndex ];
		
		// Set random color
		$.setColor( Math.floor( Math.random() * m_pal.length ) );
		
		// Execute the operation with variable parameters to prevent JIT optimization
		const params = operation.getParams();
		operation.func( ...params );
		
	}
}
