/**
 * Images Test Module
 * 
 * Performance test for drawing sprites and images on the screen.
 * 
 * @module images
 */

"use strict";

import { images as g_images, sprites as g_sprites } from "../image-loader.js";

let m_useColor = false;
let m_useSprite = false;
let m_useBlit = false;
let m_seededRandom;
let m_operations;
let m_pal;

/**
 * Gets the images test configuration object
 * 
 * @returns {Object} Test configuration
 */
export function getConfig( useBlit, useSprite, useAlpha ) {
	let exludeVersions =  [ "2.0.0-alpha.1", "2.0.0-alpha.0", "1.2.4" ];
	let opName = "Draw";
	let name = "";
	let testVariantName = "Images";

	if( useBlit ) {
		opName = "Blit";
	}
	if( useSprite ) {
		testVariantName = "Sprites";
	}
	if( useAlpha ) {
		name = `${opName} ${testVariantName} Colors Test`;
		exludeVersions = [ "2.0.0-alpha.1", "2.0.0-alpha.0", "1.2.4" ];
	} else {
		name = `${opName} ${testVariantName} Test`;
	}

	return {
		"name": name,
		"run": run,
		"init": init,
		"cleanUp": cleanUp,
		"itemCountStart": 200,
		"itemFactor": 10,
		"exludeVersions": exludeVersions,
		"useAlpha": useAlpha,
		"useSprite": useSprite,
		"useBlit": useBlit
	};
}

/**
 * Initializes the images test and loads images from media folder
 * 
 * @returns {Promise<void>}
 */
async function init( config ) {
	
	m_useColor = config.useAlpha;
	m_useSprite = config.useSprite;
	m_useBlit = config.useBlit;

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

function generateRandomOperation() {
	const screen = $.getScreen( 0 );
	const width = screen.width();
	const height = screen.height();
	let drawFn;
	if( m_useSprite ) {
		if( m_useBlit ) {
			drawFn = screen.blitSprite;
		} else {
			drawFn = screen.drawSprite;
		}
	} else {
		if( m_useBlit ) {
			drawFn = screen.blitImage;
		} else {
			drawFn = screen.drawImage;
		}
	}

	// Randomly decide which optional parameters to include
	const includeAnchor = m_seededRandom() > 0.4;
	const includeScale = m_seededRandom() > 0.7;

	// Generate random position
	const x = Math.floor( m_seededRandom() * width );
	const y = Math.floor( m_seededRandom() * height );

	// Set random movement
	let dx = m_seededRandom() * 0.25 + 0.05;
	let dy = m_seededRandom() * 0.25 + 0.05;
	if( m_seededRandom() > 0.5 ) {
		dx *= -1;
	}
	if( m_seededRandom() > 0.5 ) {
		dy *= -1;
	}
	
	// Random angle (0-360 degrees)
	let angle = Math.floor( m_seededRandom() * 360 );
	if( m_useBlit ) {
		angle = Math.floor( m_seededRandom() * Math.PI * 2 );
	}

	// Set random rotation
	let maxRotationSpeed = 0.25;
	if( m_useBlit ) {
		maxRotationSpeed = 0.005;
	}
	let da = m_seededRandom() * maxRotationSpeed;
	if( m_seededRandom() > 0.5 ) {
		da *= -1;
	}
	
	// Random anchor points (0-1)
	let anchorX = undefined;
	let anchorY = undefined;
	if( includeAnchor ) {
		anchorX = m_seededRandom();
		anchorY = m_seededRandom();
	}
	
	// Random color (0-1)
	let color = undefined;
	if( m_useColor ) {
		const colorIndex = Math.floor( m_seededRandom() * m_pal.length + 1 );
		color = $.getPalColor( colorIndex );
	}

	// Random scale factors (0.1-2.0)
	let scaleX = undefined;
	let scaleY = undefined;
	if( includeScale ) {
		scaleX = 0.1 + ( m_seededRandom() * 1.9 );
		scaleY = 0.1 + ( m_seededRandom() * 1.9 );
	}

	let params;
	let moveFn;

	if( m_useSprite ) {

		// Draw a sprite
		const imageName = g_sprites[ Math.floor( m_seededRandom() * g_sprites.length ) ];
		const spriteData = screen.getSpritesheetData( imageName );
		const frame = Math.floor(
			m_seededRandom() * spriteData.frameCount
		);
		params = [ imageName, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle ];
		moveFn = ( params ) => {
			params[ 1 ] = ( params[ 1 ] + 1 ) % spriteData.frameCount
			params[ 2 ] += dx;
			params[ 3 ] += dy;
			params[ 2 ] = Math.max( 0, Math.min( params[ 2 ], width ) );
			params[ 3 ] = Math.max( 0, Math.min( params[ 3 ], height ) );
			if( params[ 2 ] === 0 || params[ 2 ] === width ) {
				dx *= -1;
			}
			if( params[ 3 ] === 0 || params[ 3 ] === height ) {
				dy *= -1;
			}
			params[ 9 ] += da;
		};
	} else {

		// Draw an image
		const imageName = g_images[ Math.floor( m_seededRandom() * g_images.length ) ];
		const image = $.getImage( imageName );
		params = [ image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle ];
		moveFn = ( params ) => {
			params[ 1 ] += dx;
			params[ 2 ] += dy;
			params[ 1 ] = Math.max( 0, Math.min( params[ 1 ], width ) );
			params[ 2 ] = Math.max( 0, Math.min( params[ 2 ], height ) );
			if( params[ 1 ] === 0 || params[ 1 ] === width ) {
				dx *= -1;
			}
			if( params[ 2 ] === 0 || params[ 2 ] === height ) {
				dy *= -1;
			}
			params[ 8 ] += da;
		};
	}

	return {
		"func": drawFn,
		"params": params,
		"moveFn": moveFn
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
		const params = operation.params;
		operation.func(
			params[ 0 ], params[ 1 ], params[ 2 ], params[ 3 ], params[ 4 ], params[ 5 ],
			params[ 6 ], params[ 7 ], params[ 8 ], params[ 9 ]
		);
		operation.moveFn( params );
	}
}

function run3( itemCount ) {
	const screen = $.getScreen( 0 );
	const width = screen.width();
	const height = screen.height();
	let drawFn;
	if( m_useSprite ) {
		drawFn = screen.blitSprite;
	} else {
		drawFn = screen.blitImage;
	}

	for( let i = 0; i < itemCount; i++ ) {

		// Randomly decide which optional parameters to include
		const includeAngle = m_seededRandom() > 0.3;
		const includeAnchor = m_seededRandom() > 0.4;
		const includeScale = m_seededRandom() > 0.7;

		// Generate random position
		const x = Math.floor( m_seededRandom() * width );
		const y = Math.floor( m_seededRandom() * height );
		
		// Random angle (0-360 degrees)
		let angle = undefined;
		if( includeAngle ) {
			angle = Math.floor( m_seededRandom() * Math.PI * 2 );
		}
		
		// Random anchor points (0-1)
		let anchorX = undefined;
		let anchorY = undefined;
		if( includeAnchor ) {
			anchorX = m_seededRandom();
			anchorY = m_seededRandom();
		}
		
		// Random color (0-1)
		let color = undefined;
		if( m_useColor ) {
			const colorIndex = Math.floor( m_seededRandom() * m_pal.length + 1 );
			color = $.getPalColor( colorIndex );
		}

		// Random scale factors (0.1-2.0)
		let scaleX = undefined;
		let scaleY = undefined;
		if( includeScale ) {
			scaleX = 0.1 + ( m_seededRandom() * 1.9 );
			scaleY = 0.1 + ( m_seededRandom() * 1.9 );
		}

		if( m_useSprite ) {

			// Draw a sprite
			const imageName = g_sprites[ Math.floor( m_seededRandom() * g_sprites.length ) ];
			const frame = Math.floor(
				m_seededRandom() * screen.getSpritesheetData( imageName ).frameCount
			);
			drawFn( imageName, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle );
		} else {

			// Draw an image
			const imageName = g_images[ Math.floor( m_seededRandom() * g_images.length ) ];
			const image = $.getImage( imageName );
			drawFn( image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle );
		}
	}
}
