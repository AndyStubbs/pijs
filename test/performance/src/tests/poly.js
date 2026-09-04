/**
 * Polygon Test Module
 * 
 * Performance test for polygon operations including:
 * polygon (unfilled), polygon-filled
 * 
 * @module poly
 */

"use strict";

let m_pal = null;
let m_operations = [];
let m_operationTypes = [];
let m_seededRandom = null;

/**
 * Gets the polygon test configuration object
 * 
 * @param {Array<string>} [operationTypes] - Optional array of operation types to test
 * @returns {Object} Test configuration
 */
export function getConfig( operationTypes ) {
	let name = "Polygon Test";
	if( operationTypes && operationTypes.length === 1 ) {
		name = `Polygon ${operationTypes[ 0 ]} Test`;
	}
	return {
		"name": name,
		"run": run,
		"init": init,
		"cleanUp": cleanUp,
		"itemCountStart": 200,
		"itemFactor": 10,
		"exludeVersions": [ "1.2.5" ],
		"operationTypes": operationTypes
	};
}

/**
 * Initializes the polygon test and generates operation list
 * 
 * @param {Object} config - Configuration object passed from runner
 * @returns {void}
 */
function init( config ) {
	if( !config.operationTypes ) {
		m_operationTypes = [ "polygon", "polygon-filled" ];
	} else {
		m_operationTypes = config.operationTypes;
	}

	// Set up random seed for consistent test results
	m_seededRandom = new Math.seedrandom( "poly", true );
	
	m_pal = $.getPal();
	generateOperationList();

	for( const operation of m_operations ) {
		if( !$[ operation.name ] ) {
			throw new Error( `Function ${operation.name} not found` );
		}
	}
}

/**
 * Generates a pre-seeded list of 1000 polygon operations with parameters
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
 * Generates a random polygon operation with parameters
 * 
 * @returns {Object} Operation object with function and parameters
 */
function generateRandomOperation() {
	const width = $.width();
	const height = $.height();
	const colorCount = m_pal.length;
	
	// Even distribution of operation types
	const rnd = Math.floor( m_seededRandom() * m_operationTypes.length );
	const operationType = m_operationTypes[ rnd ];

	// Generate between 3 and 7 vertices
	const vertexCount = 3 + Math.floor( m_seededRandom() * 5 );
	const cx = Math.floor( m_seededRandom() * ( width - 60 ) ) + 30;
	const cy = Math.floor( m_seededRandom() * ( height - 60 ) ) + 30;

	const maxRadius = Math.min(
		cx - 10,
		cy - 10,
		width - cx - 10,
		height - cy - 10,
		15 + Math.floor( m_seededRandom() * 35 )
	);
	const minRadius = Math.max( 6, Math.floor( maxRadius * 0.45 ) );

	// Generate points in sequential angular sectors to guarantee simple polygons
	const points = new Float64Array( vertexCount * 2 );
	const angleStep = ( Math.PI * 2 ) / vertexCount;

	for( let i = 0; i < vertexCount; i++ ) {
		const angle = ( i + 0.15 + m_seededRandom() * 0.7 ) * angleStep;
		const radius = minRadius + m_seededRandom() * ( maxRadius - minRadius );
		points[ i * 2 ] = Math.round( cx + Math.cos( angle ) * radius );
		points[ i * 2 + 1 ] = Math.round( cy + Math.sin( angle ) * radius );
	}

	switch( operationType ) {
		case "polygon":
			return {
				"name": "polygon",
				"func": $.polygon,
				"params": [ points ],
				"getParams": () => [ points ]
			};

		case "polygon-filled":
			const baseFillColor = Math.floor( m_seededRandom() * colorCount );
			return {
				"name": "polygon",
				"func": $.polygon,
				"params": [ points, baseFillColor ],
				"getParams": () => [
					points,
					( baseFillColor + ( ( Math.random() * 5 ) | 0 ) ) % colorCount
				]
			};

		default:
			return {
				"name": "polygon",
				"func": $.polygon,
				"params": [ points ],
				"getParams": () => [ points ]
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
	m_operationTypes = [];
}

/**
 * Runs the polygon test with specified item count
 * 
 * @param {number} itemCount - Number of operations to execute
 * @returns {void}
 */
function run( itemCount ) {
	$.cls();
	
	const palLength = m_pal.length;
	const opLength = m_operations.length;

	for( let i = 0; i < itemCount - 1; i++ ) {
		// Cycle through the pre-generated operations
		const operationIndex = i % opLength;
		const operation = m_operations[ operationIndex ];
		
		// Set random border color
		$.setColor( ( Math.random() * palLength ) | 0 );
		
		// Execute the operation with variable parameters to prevent JIT optimization
		const params = operation.getParams();
		operation.func( ...params );
	}
}