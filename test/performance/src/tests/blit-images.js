/**
 * Images Test Module
 * 
 * Performance test for drawing sprites and images on the screen.
 * 
 * @module images
 */

"use strict";

import { images as g_images } from "../image-loader.js";

let m_useColor = false;
let m_seededRandom;
let m_operations;
let m_pal;

/**
 * Gets the images test configuration object
 * 
 * @returns {Object} Test configuration
 */
export function getConfig( useAlpha ) {
	const exludeVersions = [ "2.0.0-alpha.1", "2.0.0-alpha.0", "1.2.4" ];
	let name = "";
	if( useAlpha ) {
		name = "Blit Images Alpha Test";
	} else {
		name = "Blit Images Test";
	}

	return {
		"name": name,
		"run": run,
		"init": init,
		"cleanUp": cleanUp,
		"itemCountStart": 200,
		"itemFactor": 10,
		"exludeVersions": exludeVersions,
		"useAlpha": useAlpha
	};
}

/**
 * Initializes the images test and loads images from media folder
 * 
 * @returns {Promise<void>}
 */
async function init( config ) {
	
	m_useColor = config.useAlpha;

	m_pal = $.getPal();

	// Set up random seed for consistent test results
	m_seededRandom = new Math.seedrandom( "blit-images", true );
	generateOperationList();
}


/**
 * Generates a pre-seeded list of 1000 image operations with parameters
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
 * Generates a random image operation with parameters
 * 
 * @returns {Object} Operation object with function and parameters
 */
function generateRandomOperation() {
	const width = $.width();
	const height = $.height();
	
	// Image operation
	const imageName = g_images[ Math.floor( m_seededRandom() * g_images.length ) ];
	
	// Generate random position
	const x = Math.floor( m_seededRandom() * width );
	const y = Math.floor( m_seededRandom() * height );
	
	// Random angle (0-360 degrees)
	const angle = Math.floor( m_seededRandom() * Math.PI * 2 );
	
	// Random anchor points (0-1)
	const anchorX = m_seededRandom();
	const anchorY = m_seededRandom();
	
	// Random color (0-1)
	let color = $.getPalColor( m_seededRandom() * m_pal.length + 1 );

	// Random scale factors (0.1-2.0)
	const scale = 0.1 + ( m_seededRandom() * 1.9 );
	
	// Randomly decide which optional parameters to include
	const includeAngle = m_seededRandom() > 0.3;
	const includeAnchor = m_seededRandom() > 0.4;
	const includeScale = m_seededRandom() > 0.2;
	
	// Build parameters object for drawImage
	const params = [
		undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
		undefined
	];
	params[ 0 ] = $.getImage( imageName );
	params[ 1 ] = x;
	params[ 2 ] = y;
	if( m_useColor ) {
		params[ 3 ] = color;
	}
	if( includeAnchor ) {
		params[ 4 ] = anchorX;
		params[ 5 ] = anchorY;
	}
	if( includeScale ) {
		params[ 6 ] = scale;
		params[ 7 ] = scale;
	}
	if( includeAngle ) {
		params[ 8 ] = angle;
	}
	
	const screen = $.getScreen( 0 );
	return {
		"func": screen.blitImage,
		"params": params,
		"getParams": () => {
			const newX = Math.max( 0, Math.min( x + Math.floor( Math.random() * 6 ) - 3, width ) );
			const newY = Math.max( 0, Math.min( y + Math.floor( Math.random() * 6 ) - 3, height ) );
			const newAngle = angle + Math.floor( Math.random() * 0.04 ) - 0.02;
			const newAnchorX = Math.max( 0, Math.min( anchorX + ( Math.random() * 0.2 ) - 0.1, 1 ) );
			const newAnchorY = Math.max( 0, Math.min( anchorY + ( Math.random() * 0.2 ) - 0.1, 1 ) );
			const newScaleX = Math.max( 0.1, Math.min( scale + ( Math.random() * 0.4 ) - 0.2, 3.0 ) );
			const newScaleY = Math.max( 0.1, Math.min( scale + ( Math.random() * 0.4 ) - 0.2, 3.0 ) );
			
			// Rebuild parameters object with variations
			const newParams = [
				undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined
			];
			newParams[ 0 ] = params[ 0 ];
			newParams[ 1 ] = newX;
			newParams[ 2 ] = newY;
			if( m_useColor ) {
				newParams[ 3 ] = color;
			}
			if( includeAnchor ) {
				newParams[ 4 ] = newAnchorX;
				newParams[ 5 ] = newAnchorY;
			}
			if( includeScale ) {
				newParams[ 6 ] = newScaleX;
				newParams[ 7 ] = newScaleY;
			}
			if( includeAngle ) {
				newParams[ 8 ] = newAngle;
			}
			return newParams;
		}
	};
}


/**
 * Deletes the operations data
 * 
 * @returns {void}
 */
function cleanUp() {
	m_pal = [];
	m_operations = [];
}

/**
 * Runs the images test with specified item count
 * 
 * @param {number} itemCount - Number of operations to execute
 * @returns {void}
 */
function run( itemCount ) {
	$.cls();

	// Math.max( 0, Math.min( x + Math.floor( Math.random() * 6 ) - 3, width ) )
	for( let i = 0; i < itemCount; i++ ) {
		
		// Cycle through the pre-generated operations
		const operationIndex = i % m_operations.length;
		const operation = m_operations[ operationIndex ];
		const params = operation.getParams();
		operation.func(
			params[ 0 ],
			params[ 1 ],
			params[ 2 ],
			params[ 3 ], params[ 4 ], params[ 5 ], params[ 6 ], params[ 7 ], params[ 8 ]
		);
	}
}
