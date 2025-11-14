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
			"pset", "line", "circle", "circle-filled", "rect", "rect-filled", "rect2",
			"rect2-filled", "ellipse", "ellipse-filled", "arc", "bezier"
		];
	} else {
		m_operationTypes = config.operationTypes;
	}

	// Set up random seed for consistent test results
	m_seededRandom = new Math.seedrandom( "graphics", true );
	
	m_pal = $.getPal();
	generateOperationList();
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
		case "line":
			const lineX1 = Math.floor( m_seededRandom() * width );
			const lineY1 = Math.floor( m_seededRandom() * height );
			const lineX2 = Math.floor( m_seededRandom() * width );
			const lineY2 = Math.floor( m_seededRandom() * height );
			return {
				"func": $.line,
				"params": [ lineX1, lineY1, lineX2, lineY2 ],
				"getParams": () => [
					lineX1 + Math.floor( Math.random() * 3 ) - 1,
					lineY1 + Math.floor( Math.random() * 3 ) - 1,
					lineX2 + Math.floor( Math.random() * 3 ) - 1,
					lineY2 + Math.floor( Math.random() * 3 ) - 1
				]
			};
			
		case "circle":
			const circleX = Math.floor( m_seededRandom() * width );
			const circleY = Math.floor( m_seededRandom() * height );
			const circleRadius = Math.floor( m_seededRandom() * 50 ) + 5;
			return {
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
			
		case "rect":
			const rectX = Math.floor( m_seededRandom() * width );
			const rectY = Math.floor( m_seededRandom() * height );
			const rectWidth = Math.floor( m_seededRandom() * 100 ) + 10;
			const rectHeight = Math.floor( m_seededRandom() * 80 ) + 10;
			return {
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
			
		case "rect2":
			const rect2X = Math.floor( m_seededRandom() * width );
			const rect2Y = Math.floor( m_seededRandom() * height );
			const rect2Width = Math.floor( m_seededRandom() * 100 ) + 10;
			const rect2Height = Math.floor( m_seededRandom() * 80 ) + 10;
			return {
				"func": $.rect2,
				"params": [ { "x": rect2X, "y": rect2Y, "width": rect2Width, "height": rect2Height } ],
				"getParams": () => [
					rect2X + Math.floor( Math.random() * 3 ) - 1,
					rect2Y + Math.floor( Math.random() * 3 ) - 1,
					rect2Width + Math.floor( Math.random() * 3 ) - 1,
					rect2Height + Math.floor( Math.random() * 3 ) - 1
				]
			};
			
		case "rect2-filled":
			const rect2FillX = Math.floor( m_seededRandom() * width );
			const rect2FillY = Math.floor( m_seededRandom() * height );
			const rect2FillWidth = Math.floor( m_seededRandom() * 100 ) + 10;
			const rect2FillHeight = Math.floor( m_seededRandom() * 80 ) + 10;
			const rect2FillColor = Math.floor( m_seededRandom() * colorCount );
			return {
				"func": $.rect2,
				"params": [ {
					"x": rect2FillX, "y": rect2FillY, "width": rect2FillWidth,
					"height": rect2FillHeight, "fillColor": rect2FillColor
				} ],
				"getParams": () => [
					rect2FillX + Math.floor( Math.random() * 3 ) - 1,
					rect2FillY + Math.floor( Math.random() * 3 ) - 1,
					rect2FillWidth + Math.floor( Math.random() * 3 ) - 1,
					rect2FillHeight + Math.floor( Math.random() * 3 ) - 1,
					rect2FillColor
				]
			};
			
		case "pset":
			const psetX = Math.floor( m_seededRandom() * width );
			const psetY = Math.floor( m_seededRandom() * height );
			return {
				"func": $.pset,
				"params": [ psetX, psetY ],
				"getParams": () => [
					psetX + Math.floor( Math.random() * 3 ) - 1,
					psetY + Math.floor( Math.random() * 3 ) - 1
				]
			};
			
		case "arc":
			const arcX = Math.floor( m_seededRandom() * width );
			const arcY = Math.floor( m_seededRandom() * height );
			const arcRadius = Math.floor( m_seededRandom() * 40 ) + 10;
			const arcAngle1 = Math.floor( m_seededRandom() * 360 );
			const arcAngle2 = Math.floor( m_seededRandom() * 360 );
			return {
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
			
		default:
			const defaultX = Math.floor( m_seededRandom() * width );
			const defaultY = Math.floor( m_seededRandom() * height );
			return {
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
		operation.func( params[ 0 ], params[ 1 ], params[ 2 ], params[ 3 ], params[ 4 ] );
		
	}
}
