/**
 * Images Test Module
 * 
 * Performance test for drawing sprites and images on the screen.
 * 
 * @module images
 */

"use strict";

import { images as g_images, sprites as g_sprites } from "../image-loader.js";

let m_pal = null;
let m_operations = [];
let m_seededRandom = null;
let m_useSprites = false;
let m_useAlpha = false;

/**
 * Gets the images test configuration object
 * 
 * @returns {Object} Test configuration
 */
export function getConfig( useSprites, useAlpha ) {
	const exludeVersions = [];
	let name = "";
	if( useSprites ) {
		if( useAlpha ) {
			name = "Sprites1 Alpha Test";
		} else {
			name = "Sprites1 Test";
		}
		exludeVersions.push( "1.2.4" );
	} else {
		if( useAlpha ) {
			name = "Images1 Alpha Test";
		} else {
			name = "Images1 Test";
		}
	}
	return {
		"name": name,
		"run": run,
		"init": init,
		"cleanUp": cleanUp,
		"itemCountStart": 200,
		"itemFactor": 10,
		"exludeVersions": exludeVersions,
		"useSprites": useSprites,
		"useAlpha": useAlpha
	};
}


/**
 * Initializes the images test and loads images from media folder
 * 
 * @returns {Promise<void>}
 */
async function init( config ) {
	
	m_useSprites = config.useSprites;
	m_useAlpha = config.useAlpha;

	// Set up random seed for consistent test results
	m_seededRandom = new Math.seedrandom( "images", true );
	m_pal = $.getPal();
	
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
	const parameterNames = getParameterNames();
	const transformData = createTransformData( parameterNames, width, height, m_useSprites );

	if( m_useSprites ) {
		return createSpriteOperation( parameterNames, transformData, width, height );
	}

	return createImageOperation( parameterNames, transformData, width, height );
}

function getParameterNames() {
	const parameterNames = {
		"name": "name",
		"x": "x",
		"y": "y",
		"alpha": "alpha",
		"anchorX": "anchorX",
		"anchorY": "anchorY",
		"angle": "angle",
		"frame": "frame",
		"spriteName": "name",
		"scaleX": "scaleX",
		"scaleY": "scaleY"
	};

	if( $.version === "2.0.0-alpha.3" ) {
		parameterNames.name = "image";
		parameterNames.alpha = "color";
	}

	return parameterNames;
}

function createTransformData( parameterNames, width, height, useSprite ) {
	const transform = {
		"x": Math.floor( m_seededRandom() * width ),
		"y": Math.floor( m_seededRandom() * height ),
		"angle": Math.floor( m_seededRandom() * 360 ),
		"anchorX": m_seededRandom(),
		"anchorY": m_seededRandom()
	};

	if( useSprite ) {
		const scaleSprite = 0.1 + ( m_seededRandom() * 4.9 );
		transform.scaleX = scaleSprite;
		transform.scaleY = scaleSprite;
	} else {
		const scaleImage = 0.1 + ( m_seededRandom() * 1.9 );
		transform.scaleX = scaleImage;
		transform.scaleY = scaleImage;
	}

	if( m_useAlpha ) {
		let alphaValue = m_seededRandom() * 255;
		if( parameterNames.alpha === "color" ) {
			const alphaRed = m_seededRandom() * 255;
			const alphaGreen = m_seededRandom() * 255;
			const alphaBlue = m_seededRandom() * 255;
			alphaValue = [ alphaRed, alphaGreen, alphaBlue, alphaValue ];
		}
		transform.alpha = alphaValue;
	}

	return {
		"transform": transform,
		"flags": {
			"includeAngle": m_seededRandom() > 0.3,
			"includeAnchor": m_seededRandom() > 0.4,
			"includeScale": m_seededRandom() > 0.2
		}
	};
}

function createSpriteOperation( parameterNames, transformData, width, height ) {
	const spriteName = g_sprites[ Math.floor( m_seededRandom() * g_sprites.length ) ];
	const spriteInfo = $.getSpritesheetData( spriteName );
	const frame = Math.floor( m_seededRandom() * spriteInfo.frameCount );

	const targetEntries = [
		{
			"key": parameterNames.spriteName,
			"value": spriteName
		},
		{
			"key": parameterNames.frame,
			"value": frame
		}
	];

	const screen = $.getScreen( 0 );
	return createOperation(
		screen.drawSprite,
		parameterNames,
		transformData,
		targetEntries,
		width,
		height
	);
}

function createImageOperation( parameterNames, transformData, width, height ) {
	const imageName = g_images[ Math.floor( m_seededRandom() * g_images.length ) ];

	const targetEntries = [
		{
			"key": parameterNames.name,
			"value": imageName
		}
	];

	const screen = $.getScreen( 0 );
	return createOperation(
		screen.drawImage,
		parameterNames,
		transformData,
		targetEntries,
		width,
		height
	);
}

function createOperation(
	func,
	parameterNames,
	transformData,
	targetEntries,
	width,
	height
) {
	const initialParams = buildParams(
		parameterNames,
		transformData.transform,
		transformData.flags,
		targetEntries
	);

	return {
		"func": func,
		"params": initialParams,
		"getParams": () => {
			const updatedTransform = createTransformVariation(
				transformData.transform,
				width,
				height
			);

			return buildParams(
				parameterNames,
				updatedTransform,
				transformData.flags,
				targetEntries
			);
		}
	};
}

function createTransformVariation( baseTransform, width, height ) {
	const updatedTransform = {
		"x": Math.max(
			0,
			Math.min(
				baseTransform.x + Math.floor( Math.random() * 6 ) - 3,
				width
			)
		),
		"y": Math.max(
			0,
			Math.min(
				baseTransform.y + Math.floor( Math.random() * 6 ) - 3,
				height
			)
		),
		"angle": baseTransform.angle + Math.floor( Math.random() * 6 ) - 3,
		"anchorX": Math.max(
			0,
			Math.min(
				baseTransform.anchorX + ( Math.random() * 0.2 ) - 0.1,
				1
			)
		),
		"anchorY": Math.max(
			0,
			Math.min(
				baseTransform.anchorY + ( Math.random() * 0.2 ) - 0.1,
				1
			)
		),
		"scaleX": Math.max(
			0.1,
			Math.min(
				baseTransform.scaleX + ( Math.random() * 0.4 ) - 0.2,
				3.0
			)
		),
		"scaleY": Math.max(
			0.1,
			Math.min(
				baseTransform.scaleY + ( Math.random() * 0.4 ) - 0.2,
				3.0
			)
		)
	};

	if( m_useAlpha ) {
		updatedTransform.alpha = baseTransform.alpha;
	}

	return updatedTransform;
}

function buildParams(
	parameterNames,
	transform,
	flags,
	targetEntries
) {
	const params = {};

	for( const entry of targetEntries ) {
		params[ entry.key ] = entry.value;
	}

	params[ parameterNames.x ] = transform.x;
	params[ parameterNames.y ] = transform.y;

	if( flags.includeAngle ) {
		params[ parameterNames.angle ] = transform.angle;
	}

	if( flags.includeAnchor ) {
		params[ parameterNames.anchorX ] = transform.anchorX;
		params[ parameterNames.anchorY ] = transform.anchorY;
	}

	if( m_useAlpha && transform.alpha != null ) {
		params[ parameterNames.alpha ] = transform.alpha;
	}

	if( flags.includeScale ) {
		params[ parameterNames.scaleX ] = transform.scaleX;
		params[ parameterNames.scaleY ] = transform.scaleY;
	}

	return params;
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