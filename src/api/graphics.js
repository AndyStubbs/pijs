/**
 * Pi.js - Graphics API Module
 * 
 * Thin wrapper layer for graphics commands.
 * Handles input parsing, validation, and builds optimized drawing functions.
 * 
 * @module api/graphics
 */

"use strict";

// Import modules
import * as g_commands from "../core/commands.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_utils from "../core/utils.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_colors from "./colors.js";
import * as g_images from "./images.js";

const DEFAULT_BLIT_COLOR = g_utils.rgbToColor( 255, 255, 255, 255 );
let m_api = null;


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


// Initialize graphics module - only gets called on script load
export function init( api ) {
	m_api = api;

	// Build the null graphics commands - basically will throw an error since no screen is available
	buildApi( null );

	// CLS doesn't need to be a hot-path item so just use addCommand
	g_commands.addCommand( "cls", cls, true, [ "x", "y", "width", "height" ] );

	// Register screen init function to rebuild API when screen is created
	g_screenManager.addScreenInitFunction( ( screenData ) => buildApi( screenData ) );
}

// Function to build the external API drawing commands (e.g., pset, line, etc...) for the current
// active screen. This creates specialized API wrappers that handle input parsing/validation, then
// call optimized internal drawing routines. By closing over specific, already-optimized functions
// and screen configuration, it provides highly performant, monomorphic call sites in hot loops.
export function buildApi( s_screenData ) {

	// Set error functions for when no screen is available
	if( s_screenData === null ) {
		m_api.arc = () => g_utils.errFn( "arc" );
		m_api.bezier = () => g_utils.errFn( "bezier" );
		m_api.circle = () => g_utils.errFn( "circle" );
		m_api.ellipse = () => g_utils.errFn( "ellipse" );
		m_api.line = () => g_utils.errFn( "line" );
		m_api.pset = () => g_utils.errFn( "pset" );
		m_api.rect = () => g_utils.errFn( "rect" );
		return;
	}

	// Draw commands
	const s_drawArc = g_renderer.drawArc;
	const s_drawBezier = g_renderer.drawBezier;
	const s_drawCircle = g_renderer.drawCircle;
	const s_drawCircleFilled = g_renderer.drawCircleFilled;
	const s_drawEllipse = g_renderer.drawEllipse;
	const s_drawLine = g_renderer.drawLine;
	const s_drawPixel = g_renderer.drawPixel;
	const s_drawRect = g_renderer.drawRect;
	const s_drawRectFilled = g_renderer.drawRectFilled;
	const s_drawImage = g_renderer.drawImage;
	const s_drawSprite = g_renderer.drawSprite;
	
	// Other API Commands
	const s_getImageFromRawInput = g_images.getImageFromRawInput;
	const s_getStoredImage = g_images.getStoredImage;

	// Utility commands
	const s_isObjectLiteral = g_utils.isObjectLiteral;
	const s_setImageDirty = g_renderer.setImageDirty;
	const s_getInt = g_utils.getInt;
	const s_getFloat = g_utils.getFloat;
	const s_degreesToRadian = g_utils.degreesToRadian;
	const s_getColorValueByRawInput = g_colors.getColorValueByRawInput;

	// Constants
	const s_pointsBatch = g_renderer.POINTS_BATCH;
	const s_imageReplaceBatch = g_renderer.IMAGE_REPLACE_BATCH;

	/**********************************************************************************************
	 * ARC Command
	 **********************************************************************************************/

	const arcFn = ( x, y, radius, angle1, angle2 ) => {
		const pX = s_getInt( x, null );
		const pY = s_getInt( y, null );
		const pRadius = s_getInt( radius, null );

		// Validate integer parameters
		if( pX === null || pY === null || pRadius === null ) {
			const error = new TypeError( "arc: Parameters x, y, and radius must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Validate angle parameters (numbers in radians)
		if(
			typeof angle1 !== "number" || isNaN( angle1 ) ||
			typeof angle2 !== "number" || isNaN( angle2 )
		) {
			const error = new TypeError(
				"arc: Parameters angle1 and angle2 must be numbers (in radians)."
			);
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw Arc
		s_drawArc(
			s_screenData, pX, pY, pRadius, s_degreesToRadian( angle1 ),
			s_degreesToRadian( angle2 )
		);
		s_setImageDirty( s_screenData );
	};
	const arcFnWrapper = ( x, y, radius, angle1, angle2 ) => {
		if( s_isObjectLiteral( x ) ) {
			arcFn( x.x, x.y, x.radius, x.angle1, x.angle2 );
		} else {
			arcFn( x, y, radius, angle1, angle2 );
		}
	};
	m_api.arc = arcFnWrapper;
	s_screenData.api.arc = arcFnWrapper;
	
	/**********************************************************************************************
	 * BEZIER Command
	 **********************************************************************************************/

	const bezierFn = ( x1, y1, x2, y2, x3, y3, x4, y4 ) => {
		const pX1 = s_getInt( x1, null );
		const pY1 = s_getInt( y1, null );
		const pX2 = s_getInt( x2, null );
		const pY2 = s_getInt( y2, null );
		const pX3 = s_getInt( x3, null );
		const pY3 = s_getInt( y3, null );
		const pX4 = s_getInt( x4, null );
		const pY4 = s_getInt( y4, null );

		if(
			pX1 === null || pY1 === null || pX2 === null || pY2 === null ||
			pX3 === null || pY3 === null || pX4 === null || pY4 === null
		) {
			const error = new TypeError(
				"bezier: All control point coordinates must be integers."
			);
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw Bezier
		s_drawBezier( s_screenData, pX1, pY1, pX2, pY2, pX3, pY3, pX4, pY4 );
		s_setImageDirty( s_screenData );
	};
	const bezierFnWrapper = ( x1, y1, x2, y2, x3, y3, x4, y4 ) => {
		if( s_isObjectLiteral( x1 ) ) {
			bezierFn( x1.x1, x1.y1, x1.x2, x1.y2, x1.x3, x1.y3, x1.x4, x1.y4 );
		} else {
			bezierFn( x1, y1, x2, y2, x3, y3, x4, y4 );
		}
	};
	m_api.bezier = bezierFnWrapper;
	s_screenData.api.bezier = bezierFnWrapper;

	/**********************************************************************************************
	 * Circle Command
	 **********************************************************************************************/

	const circleFn = ( x, y, radius, fillColor ) => {
		const pX = s_getInt( x, null );
		const pY = s_getInt( y, null );
		const pRadius = s_getInt( radius, null );

		if( pX === null || pY === null || pRadius === null ) {
			const error = new TypeError( "rect: Parameters x, y, and radius must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Parse and validate fillColor here (single source of truth)
		let fillColorValue = null;
		if( fillColor != null ) {
			fillColorValue = s_getColorValueByRawInput( s_screenData, fillColor );
			if( fillColorValue === null ) {
				const error = new TypeError( "rect: Parameter 'fillColor' must be a valid color." );
				error.code = "INVALID_PARAMETER";
				throw error;
			}

			// Fill in the circle
			if( pRadius > 0 ) {
				s_drawCircleFilled( s_screenData, pX, pY, pRadius, fillColorValue );
			}
		}

		// Draw the circle border
		s_drawCircle( s_screenData, pX, pY, pRadius );
		s_setImageDirty( s_screenData );
	};
	const circleFnWrapper = ( x, y, radius, fillColor ) => {
		if( s_isObjectLiteral( x ) ) {
			circleFn( x.x, x.y, x.radius, x.fillColor );
		} else {
			circleFn( x, y, radius, fillColor);
		}
	};

	m_api.circle = circleFnWrapper;
	s_screenData.api.circle = circleFnWrapper;

	/**********************************************************************************************
	 * Ellipse Command
	 **********************************************************************************************/

	const ellipseFn = ( x, y, radiusX, radiusY, fillColor ) => {
		const pX = s_getInt( x, null );
		const pY = s_getInt( y, null );
		const pRx = s_getInt( radiusX, null );
		const pRy = s_getInt( radiusY, null );

		if( pX === null || pY === null || pRx === null || pRy === null ) {
			const error = new TypeError( "ellipse: Parameters x, y, rx, and ry must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Parse and validate fillColor here (single source of truth)
		let fillColorValue = null;
		if( fillColor != null ) {
			fillColorValue = s_getColorValueByRawInput( s_screenData, fillColor );
			if( fillColorValue === null ) {
				const error = new TypeError(
					"ellipse: Parameter 'fillColor' must be a valid color."
				);
				error.code = "INVALID_PARAMETER";
				throw error;
			}

			// Filled handled inside drawEllipse
		}

		// Draw the ellipse border
		s_drawEllipse( s_screenData, pX, pY, pRx, pRy, fillColorValue );
		s_setImageDirty( s_screenData );
	};
	const ellipseFnWrapper = ( x, y, radiusX, radiusY, fillColor ) => {
		if( s_isObjectLiteral( x ) ) {
			ellipseFn( x.x, x.y, x.radiusX, x.radiusY, x.fillColor );
		} else {
			ellipseFn( x, y, radiusX, radiusY, fillColor);
		}
	};

	m_api.ellipse = ellipseFnWrapper;
	s_screenData.api.ellipse = ellipseFnWrapper;

	/**********************************************************************************************
	 * LINE Command
	 **********************************************************************************************/

	const lineFn = ( x1, y1, x2, y2 ) => {
		const pX1 = s_getInt( x1, null );
		const pY1 = s_getInt( y1, null );
		const pX2 = s_getInt( x2, null );
		const pY2 = s_getInt( y2, null );

		// Make sure x1, y1, x2, y2 are integers
		if( pX1 === null || pY1 === null || pX2 === null || pY2 === null ) {
			const error = new TypeError( "line: Parameters x1, y1, x2, y2 must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw Line
		s_drawLine( s_screenData, pX1, pY1, pX2, pY2 );
		s_setImageDirty( s_screenData );
	};
	const lineFnWrapper = ( x1, y1, x2, y2 ) => {
		if( s_isObjectLiteral( x1 ) ) {
			lineFn( x1.x1 , x1.y1, x1.x2, x1.y2 );
		} else {
			lineFn( x1, y1, x2, y2 );
		}
	};

	m_api.line = lineFnWrapper;
	s_screenData.api.line = lineFnWrapper;
	
	/**********************************************************************************************
	 * PSET Command
	 **********************************************************************************************/

	const psetFn = ( x, y ) => {
		const pX = s_getInt( x, null );
		const pY = s_getInt( y, null );

		// Make sure x and y are integers
		if( pX === null || pY === null ) {
			const error = new TypeError( "pset: Parameters x and y must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw the pixel
		s_drawPixel( s_screenData, pX, pY, s_pointsBatch );
		s_setImageDirty( s_screenData );

		// Set the cursor after drawing
		s_screenData.cursor.x = x;
		s_screenData.cursor.y = y;
	};
	const psetFnWrapper = ( x, y ) => {
		if( s_isObjectLiteral( x ) ) {
			psetFn( x.x , x.y );
		} else {
			psetFn( x, y );
		}
	};
	m_api.pset = psetFnWrapper;
	s_screenData.api.pset = psetFnWrapper;

	/**********************************************************************************************
	 * RECT Command
	 **********************************************************************************************/

	const rectFn = ( x, y, width, height, fillColor ) => {
		const pX = s_getInt( x, null );
		const pY = s_getInt( y, null );
		const pWidth = s_getInt( width, null );
		const pHeight = s_getInt( height, null );

		if( pX === null || pY === null || pWidth === null || pHeight === null ) {
			const error = new TypeError( "rect: Parameters x, y, width, height must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		if( pWidth < 1 || pHeight < 1 ) {
			return;
		}

		// Parse and validate fillColor here (single source of truth)
		let fillColorValue = null;
		if( fillColor != null ) {
			fillColorValue = s_getColorValueByRawInput( s_screenData, fillColor );
			if( fillColorValue === null ) {
				const error = new TypeError( "rect: Parameter 'fillColor' must be a valid color." );
				error.code = "INVALID_PARAMETER";
				throw error;
			}

			// Fill in the rectangle
			const fWidth = pWidth - 2;
			const fHeight = pHeight - 2;
			if( fWidth > 0 && fHeight > 0 ) {
				s_drawRectFilled( s_screenData, pX + 1, pY + 1, fWidth, fHeight, fillColorValue );
			}
		}

		// Draw the rect border
		s_drawRect( s_screenData, pX, pY, pWidth, pHeight );
		s_setImageDirty( s_screenData );
	};
	const rectFnWrapper = ( x, y, width, height, fillColor ) => {
		if( s_isObjectLiteral( x ) ) {
			rectFn( x.x , x.y, x.width, x.height, x.fillColor );
		} else {
			rectFn( x, y, width, height, fillColor );
		}
	};

	m_api.rect = rectFnWrapper;
	s_screenData.api.rect = rectFnWrapper;

	/**********************************************************************************************
	 * BLIT IMAGE Command
	 **********************************************************************************************/

	// Draw image with blending disabled
	const blitImageFn = ( img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad ) => {
		const pAnchorX = anchorX ?? s_screenData.defaultAnchorX;
		const pAnchorY = anchorY ?? s_screenData.defaultAnchorY;
		const pColor = color ?? DEFAULT_BLIT_COLOR;
		s_drawImage(
			s_screenData, img, x, y, pColor, pAnchorX, pAnchorY, scaleX, scaleY, angleRad,
			s_imageReplaceBatch
		);
		s_setImageDirty( s_screenData );
	};

	const blitImageFnWrapper = (
		img,
		x = 0,
		y = 0,
		color,
		anchorX,
		anchorY,
		scaleX = 1,
		scaleY = 1,
		angleRad = 0
	) => {
		if( s_isObjectLiteral( img ) ) {
			blitImageFn(
				img.img, img.x, img.y, img.color, img.anchorX, img.anchorY, img.scaleX, img.scaleY,
				img.angleRad
			);
		} else {
			blitImageFn( img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad );
		}
	};
	m_api.blitImage = blitImageFnWrapper;
	s_screenData.api.blitImage = blitImageFnWrapper;

	/**********************************************************************************************
	 * BLIT SPRITE Command
	 **********************************************************************************************/

	// Draw image with blending disabled
	const blitSpriteFn = (
		name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad
	) => {
		const spriteData = s_getStoredImage( name );
		const frameData = spriteData.frames[ frame ];
		const img = spriteData.image;
		const pAnchorX = anchorX ?? s_screenData.defaultAnchorX;
		const pAnchorY = anchorY ?? s_screenData.defaultAnchorY;
		const pColor = color ?? DEFAULT_BLIT_COLOR;
		s_drawSprite(
			s_screenData, img,
			frameData.x, frameData.y, frameData.width, frameData.height,
			x, y, frameData.width, frameData.height,
			pColor, pAnchorX, pAnchorY, scaleX, scaleY, angleRad,
			s_imageReplaceBatch
		);
		s_setImageDirty( s_screenData );
	};

	const blitSpriteFnWrapper = (
		name,
		frame = 0,
		x = 0,
		y = 0,
		color,
		anchorX,
		anchorY,
		scaleX = 1,
		scaleY = 1,
		angleRad = 0
	) => {
		if( s_isObjectLiteral( name ) ) {
			blitSpriteFn(
				name.name, name.frame, name.x, name.y, name.color, name.anchorX, name.anchorY,
				name.scaleX, name.scaleY, name.angleRad
			);
		} else {
			blitSpriteFn( name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad );
		}
	};
	m_api.blitSprite = blitSpriteFnWrapper;
	s_screenData.api.blitSprite = blitSpriteFnWrapper;

	/**********************************************************************************************
	 * DRAW IMAGE Command
	 **********************************************************************************************/

	const drawImageFn = ( image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle ) => {
		x = s_getInt( x, null );
		y = s_getInt( y, null );
		color = color ?? DEFAULT_BLIT_COLOR;
		anchorX = s_getFloat( anchorX, s_screenData.defaultAnchorX );
		anchorY = s_getFloat( anchorY, s_screenData.defaultAnchorY );
		scaleX = s_getFloat( scaleX, 1 );
		scaleY = s_getFloat( scaleY, 1 );
		angle = s_getFloat( angle, 0 );
		image = s_getImageFromRawInput( image, "drawImage" );
	
		// Validate coordinates
		if( x === null || y === null ) {
			const error = new TypeError( "drawImage: Parameters x and y must be numbers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}
	
		// Parses the color and makes sure it's in a valid format
		color = s_getColorValueByRawInput( s_screenData, color );
		if( color === null ) {
			color = DEFAULT_BLIT_COLOR;
		}
			
		// Convert angle from degrees to radians
		const angleRad = s_degreesToRadian( angle );
	
		// Draw using renderer-specific implementation
		s_drawImage(
			s_screenData, image, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad
		);
	
		// Mark screen as dirty
		s_setImageDirty( s_screenData );
	};

	const drawImageFnWrapper = ( image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle ) => {
		if( s_isObjectLiteral( image ) ) {
			drawImageFn(
				image.image, image.x, image.y, image.color, image.anchorX, image.anchorY,
				image.scaleX, image.scaleY, image.angle
			);
		} else {
			drawImageFn( image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle );
		}
	};

	m_api.drawImage = drawImageFnWrapper;
	s_screenData.api.drawImage = drawImageFnWrapper;

	/**********************************************************************************************
	 * DRAW SPRITE Command
	 **********************************************************************************************/

	const drawSpriteFn = ( name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle ) => {
		frame = frame ?? 0;
		x = s_getInt( x, null );
		y = s_getInt( y, null );
		color = color ?? DEFAULT_BLIT_COLOR;
		anchorX = s_getFloat( anchorX, s_screenData.defaultAnchorX );
		anchorY = s_getFloat( anchorY, s_screenData.defaultAnchorY );
		scaleX = s_getFloat( scaleX, 1 );
		scaleY = s_getFloat( scaleY, 1 );
		angle = s_getFloat( angle, 0 );

		// Validate name
		if( typeof name !== "string" ) {
			const error = new TypeError( "drawSprite: Parameter name must be a string." );
			error.code = "INVALID_NAME";
			throw error;
		}

		const spriteData = s_getStoredImage( name );
		if( !spriteData ) {
			const error = new Error( `drawSprite: Spritesheet "${name}" not found.` );
			error.code = "IMAGE_NOT_FOUND";
			throw error;
		}

		// Validate it's a spritesheet
		if( spriteData.type !== "spritesheet" ) {
			const error = new Error( `drawSprite: Image "${name}" is not a spritesheet.` );
			error.code = "NOT_A_SPRITESHEET";
			throw error;
		}

		if( spriteData.status !== "ready" ) {
			const imgName = `Spritesheet "${name}"`;
			if( spriteData.status === "loading" ) {
				const error = new Error(
					`drawSprite: ${imgName} is still loading. Use $.ready() to wait for it.`
				);
				error.code = "IMAGE_NOT_READY";
				throw error;
			}

			if( spriteData.status === "error" ) {
				const error = new Error( `drawSprite: ${imgName} failed to load.` );
				error.code = "IMAGE_LOAD_FAILED";
				throw error;
			}
		}

		// Validate frame
		if( !Number.isInteger( frame ) || frame >= spriteData.frames.length || frame < 0 ) {
			const error = new RangeError(
				`drawSprite: Frame ${frame} is not valid. Spritesheet has ` +
				`${spriteData.frames.length} frames.`
			);
			error.code = "INVALID_FRAME";
			throw error;
		}

		// Validate coordinates
		if( x === null || y === null ) {
			const error = new TypeError( "drawSprite: Parameters x and y must be numbers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Parses the color and makes sure it's in a valid format
		color = s_getColorValueByRawInput( s_screenData, color );
		if( color === null ) {
			color = DEFAULT_BLIT_COLOR;
		}

		// Convert angle from degrees to radians
		const angleRad = s_degreesToRadian( angle );

		// Get frame data
		const frameData = spriteData.frames[ frame ];
		const img = spriteData.image;

		// Draw using renderer-specific implementation
		g_renderer.drawSprite(
			s_screenData, img,
			frameData.x, frameData.y, frameData.width, frameData.height,
			x, y, frameData.width, frameData.height,
			color, anchorX, anchorY, scaleX, scaleY, angleRad
		);

		// Mark screen as dirty
		s_setImageDirty( s_screenData );
	};

	const drawSpriteFnWrapper = (
		name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle
	) => {
		if( s_isObjectLiteral( name ) ) {
			drawSpriteFn(
				name.name, name.frame, name.x, name.y, name.color, name.anchorX, name.anchorY,
				name.scaleX, name.scaleY, name.angle
			);
		} else {
			drawSpriteFn( name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle );
		}
	};

	m_api.drawSprite = drawSpriteFnWrapper;
	s_screenData.api.drawSprite = drawSpriteFnWrapper;
}

/**
 * Clear the screen or a rectangular region
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options containing x, y, width, height
 * @returns {void}
 */
function cls( screenData, options ) {
	const x = g_utils.clamp( g_utils.getInt( options.x, 0 ), 0, screenData.width );
	const y = g_utils.clamp( g_utils.getInt( options.y, 0 ), 0, screenData.height );
	const width = g_utils.clamp(
		g_utils.getInt( options.width, screenData.width - x ), 0, screenData.width
	);
	const height = g_utils.clamp(
		g_utils.getInt( options.height, screenData.height - y ), 0, screenData.height
	);

	if( width <= 0 || height <= 0 ) {
		return;
	}

	g_renderer.cls( screenData, x, y, width, height );
	g_renderer.setImageDirty( screenData );

	// Reset the cursor position if clearing the full screen
	if( x === 0 && y === 0 && width === screenData.width && height === screenData.height ) {
		screenData.api.setPos( 0, 0 );
	}
}
