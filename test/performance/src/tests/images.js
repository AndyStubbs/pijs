/**
 * Images Test Module
 * 
 * Performance test for drawing sprites and images on the screen.
 * 
 * @module images
 */

"use strict";

let m_pal = null;
let m_operations = [];
let m_seededRandom = null;
let m_loadedImages = [];
let m_imageNames = [];
let m_loadedSprites = [];
let m_spriteNames = [];
let m_imagesLoaded = false;

/**
 * Gets the images test configuration object
 * 
 * @returns {Object} Test configuration
 */
export function getConfig() {
	return {
		"name": "Images Test",
		"run": run,
		"init": init,
		"cleanUp": cleanUp,
		"itemCountStart": 200
	};
}

/**
 * Initializes the images test and loads images from media folder
 * 
 * @returns {Promise<void>}
 */
async function init() {
	
	// Set up random seed for consistent test results
	m_seededRandom = new Math.seedrandom( "images", true );
	
	m_pal = $.getPal();
	
	// Only load images once
	if( !m_imagesLoaded ) {
		await loadImages();
		m_imagesLoaded = true;
	}
	
	generateOperationList();
}

/**
 * Loads images and sprites from the media folder
 * 
 * 
 * @returns {Promise<void>}
 */
async function loadImages() {
	m_loadedImages = [];
	m_imageNames = [];
	m_loadedSprites = [];
	m_spriteNames = [];
	
	// List of image files from the media folder
	const imageFiles = [
		"spaceship_0.png",
		//"squares.png",
		//"circle_01.png",
		//"draw_02.png",
		//"arc_02.png",
	];
	
	// Load each image
	for( let i = 0; i < imageFiles.length; i++ ) {
		const imageName = `img_${i}`;
		const imagePath = `/test/media/${imageFiles[i]}`;
		
		try {
			$.loadImage( imagePath, imageName );
			m_imageNames.push( imageName );
			m_loadedImages.push( {
				"name": imageName,
				"path": imagePath
			} );
			console.log( `Loaded image: ${imageName} from ${imagePath}` );
		} catch( error ) {
			console.warn( `Failed to load image: ${imagePath}`, error );
		}
	}
	
	// Load spritesheets
	const spritesheetFiles = [
		{ "file": "8x8 fantasytiles.png", "width": 8, "height": 8, "margin": 0 },
		{ "file": "font-8x14.png", "width": 8, "height": 14, "margin": 0 },
		{ "file": "gnsh-bitmapfont-colour2.png", "width": 5, "height": 12, "margin": 0 },
		{ "file": "thief.png" },
		{ "file": "Fruits.png" },
	];
	
	for( let i = 0; i < spritesheetFiles.length; i++ ) {
		const spriteName = `sprite_${i}`;
		const spritePath = `/test/media/${spritesheetFiles[i].file}`;
		const { width, height, margin } = spritesheetFiles[i];
		
		try {
			$.loadSpritesheet( spritePath, spriteName, width, height, margin );
			m_spriteNames.push( spriteName );
			m_loadedSprites.push( {
				"name": spriteName,
				"path": spritePath,
				"width": width,
				"height": height,
				"margin": margin
			} );
			console.log( `Loaded spritesheet: ${spriteName} from ${spritePath} (${width}x${height})` );
		} catch( error ) {
			console.warn( `Failed to load spritesheet: ${spritePath}`, error );
		}
	}
	
	console.log( `Total images loaded: ${m_imageNames.length}` );
	console.log( `Total sprites loaded: ${m_spriteNames.length}` );
	
	// Wait for all images and sprites to load
	await $.ready();
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
	
	// Choose between image and sprite operation
	const useSprite = m_spriteNames.length > 0 && m_seededRandom() > 0.5;
	
	if( useSprite ) {

		// Sprite operation
		const spriteName = m_spriteNames[ Math.floor( m_seededRandom() * m_spriteNames.length ) ];
		
		const spriteInfo = $.getSpritesheetData( spriteName );

		// Try a very small frame range to avoid errors
		// Start with just frame 0 and 1
		const frame = Math.floor( m_seededRandom() * spriteInfo.frameCount );
		
		// Generate random position
		const x = Math.floor( m_seededRandom() * width );
		const y = Math.floor( m_seededRandom() * height );
		
		// Random angle (0-360 degrees)
		const angle = Math.floor( m_seededRandom() * 360 );
		
		// Random anchor points (0-1)
		const anchorX = m_seededRandom();
		const anchorY = m_seededRandom();
		
		// Random alpha (0-1)
		const alpha = m_seededRandom();
		
		// Random scale factors (0.1-5.0)
		const scale = 0.1 + ( m_seededRandom() * 4.9 );
		const scaleX = scale;
		const scaleY = scale;
		
		// Randomly decide which optional parameters to include
		const includeAngle = m_seededRandom() > 0.3;
		const includeAnchor = m_seededRandom() > 0.4;
		const includeAlpha = m_seededRandom() > 0.5;
		const includeScale = m_seededRandom() > 0.2;
		
		// Build parameters object for drawSprite
		const params = {
			"name": spriteName,
			"frame": frame,
			"x": x,
			"y": y
		};
		if( includeAngle ) params.angle = angle;
		if( includeAnchor ) {
			params.anchorX = anchorX;
			params.anchorY = anchorY;
		}
		if( includeAlpha ) params.alpha = alpha;
		if( includeScale ) {
			params.scaleX = scaleX;
			params.scaleY = scaleY;
		}
		
		return {
			"func": $.drawSprite,
			"params": params,
			"getParams": () => {
				
				// Use small frame range for variation
				//const newFrame = Math.max( 0, Math.min( frame + Math.floor( Math.random() * 3 ) - 1, 1 ) );
				const newX = Math.max( 0, Math.min( x + Math.floor( Math.random() * 6 ) - 3, width ) );
				const newY = Math.max( 0, Math.min( y + Math.floor( Math.random() * 6 ) - 3, height ) );
				const newAngle = angle + Math.floor( Math.random() * 6 ) - 3;
				const newAnchorX = Math.max( 0, Math.min( anchorX + ( Math.random() * 0.2 ) - 0.1, 1 ) );
				const newAnchorY = Math.max( 0, Math.min( anchorY + ( Math.random() * 0.2 ) - 0.1, 1 ) );
				const newAlpha = Math.max( 0, Math.min( alpha + ( Math.random() * 0.2 ) - 0.1, 1 ) );
				const newScaleX = Math.max( 0.1, Math.min( scaleX + ( Math.random() * 0.4 ) - 0.2, 3.0 ) );
				const newScaleY = Math.max( 0.1, Math.min( scaleY + ( Math.random() * 0.4 ) - 0.2, 3.0 ) );
				
				// Rebuild parameters object with variations
				const newParams = {
					"name": spriteName,
					"frame": frame,
					"x": newX,
					"y": newY
				};
				if( includeAngle ) newParams.angle = newAngle;
				if( includeAnchor ) {
					newParams.anchorX = newAnchorX;
					newParams.anchorY = newAnchorY;
				}
				if( includeAlpha ) newParams.alpha = newAlpha;
				if( includeScale ) {
					newParams.scaleX = newScaleX;
					newParams.scaleY = newScaleY;
				}
				
				return newParams;
			}
		};
	} else {

		// Image operation
		const imageName = m_imageNames[ Math.floor( m_seededRandom() * m_imageNames.length ) ];
		
		// Generate random position
		const x = Math.floor( m_seededRandom() * width );
		const y = Math.floor( m_seededRandom() * height );
		
		// Random angle (0-360 degrees)
		const angle = Math.floor( m_seededRandom() * 360 );
		
		// Random anchor points (0-1)
		const anchorX = m_seededRandom();
		const anchorY = m_seededRandom();
		
		// Random alpha (0-1)
		const alpha = m_seededRandom();
		
		// Random scale factors (0.1-2.0)
		const scale = 0.1 + ( m_seededRandom() * 1.9 );
		
		// Randomly decide which optional parameters to include
		const includeAngle = m_seededRandom() > 0.3;
		const includeAnchor = m_seededRandom() > 0.4;
		const includeAlpha = m_seededRandom() > 0.5;
		const includeScale = m_seededRandom() > 0.2;
		
		// Build parameters object for drawImage
		const params = {
			"name": imageName,
			"x": x,
			"y": y
		};
		if( includeAngle ) params.angle = angle;
		if( includeAnchor ) {
			params.anchorX = anchorX;
			params.anchorY = anchorY;
		}
		if( includeAlpha ) params.alpha = alpha;
		if( includeScale ) {
			params.scaleX = scale;
			params.scaleY = scale;
		}
		
		return {
			"func": $.drawImage,
			"params": params,
			"getParams": () => {
				const newX = Math.max( 0, Math.min( x + Math.floor( Math.random() * 6 ) - 3, width ) );
				const newY = Math.max( 0, Math.min( y + Math.floor( Math.random() * 6 ) - 3, height ) );
				const newAngle = angle + Math.floor( Math.random() * 6 ) - 3;
				const newAnchorX = Math.max( 0, Math.min( anchorX + ( Math.random() * 0.2 ) - 0.1, 1 ) );
				const newAnchorY = Math.max( 0, Math.min( anchorY + ( Math.random() * 0.2 ) - 0.1, 1 ) );
				const newAlpha = Math.max( 0, Math.min( alpha + ( Math.random() * 0.2 ) - 0.1, 1 ) );
				const newScaleX = Math.max( 0.1, Math.min( scale + ( Math.random() * 0.4 ) - 0.2, 3.0 ) );
				const newScaleY = Math.max( 0.1, Math.min( scale + ( Math.random() * 0.4 ) - 0.2, 3.0 ) );
				
				// Rebuild parameters object with variations
				const newParams = {
					"name": imageName,
					"x": newX,
					"y": newY
				};
				if( includeAngle ) newParams.angle = newAngle;
				if( includeAnchor ) {
					newParams.anchorX = newAnchorX;
					newParams.anchorY = newAnchorY;
				}
				if( includeAlpha ) newParams.alpha = newAlpha;
				if( includeScale ) {
					newParams.scaleX = newScaleX;
					newParams.scaleY = newScaleY;
				}
				
				return newParams;
			}
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
	// Don't reset loaded images - they can be reused
}

/**
 * Runs the images test with specified item count
 * 
 * @param {number} itemCount - Number of operations to execute
 * @returns {void}
 */
function run( itemCount ) {
	$.cls();
	
	for( let i = 0; i < itemCount; i++ ) {
		// Cycle through the pre-generated operations
		const operationIndex = i % m_operations.length;
		const operation = m_operations[ operationIndex ];
		
		// Execute the operation with variable parameters to prevent JIT optimization
		const params = operation.getParams();
		operation.func( params );
	}
}