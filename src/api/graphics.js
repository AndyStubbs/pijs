/**
 * Pi.js - Graphics API Module
 *
 * Thin wrapper layer for graphics commands.
 * Handles input parsing, validation, and builds optimized drawing functions.
 *
 * @module api/graphics
 */

"use strict";

import * as g_commands from "../core/commands.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_utils from "../core/utils.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_colors from "./colors.js";
import * as g_images from "./images.js";
import * as g_view from "./view.js";

const DEFAULT_BLIT_COLOR = g_utils.rgbToColor( 255, 255, 255, 255 );
let m_api = null;


/*************************************************************************************************
 * Module Commands
 ************************************************************************************************/


/**
 * Initialize the module and register its commands and lifecycle hooks.
 *
 * @param {Object} api - Public Pi.js API.
 * @returns {void}
 */
export function init( api ) {
	m_api = api;

	// Build the null graphics commands - basically will throw an error since no screen is available
	buildApi( null );

	// CLS doesn't need to be a hot-path item so just use addCommand
	g_commands.addCommand( "cls", cls, true, [ "x", "y", "width", "height" ] );

	// Register screen init function to rebuild API when screen is created
	g_screenManager.addScreenInitFunction( ( screenData ) => buildApi( screenData ) );
}

/**
 * Build screen-specific drawing wrappers with captured render functions and validated inputs.
 *
 * Capturing optimized render functions and screen configuration keeps drawing call sites
 * monomorphic in hot loops.
 *
 * @param {Object|null} sharedScreenData - Screen state, or null to install unavailable-screen
 * handlers.
 * @returns {void}
 */
export function buildApi( sharedScreenData ) {

	// Set error functions for when no screen is available
	if( sharedScreenData === null ) {
		m_api.arc = () => g_utils.errFn( "arc" );
		m_api.bezier = () => g_utils.errFn( "bezier" );
		m_api.circle = () => g_utils.errFn( "circle" );
		m_api.ellipse = () => g_utils.errFn( "ellipse" );
		m_api.line = () => g_utils.errFn( "line" );
		m_api.pset = () => g_utils.errFn( "pset" );
		m_api.rect = () => g_utils.errFn( "rect" );
		m_api.drawImage = () => g_utils.errFn( "drawImage" );
		m_api.drawSprite = () => g_utils.errFn( "drawSprite" );
		return;
	}

	// Draw commands
	const sharedDrawArc = g_renderer.drawArc;
	const sharedDrawBezier = g_renderer.drawBezier;
	const sharedDrawCircle = g_renderer.drawCircle;
	const sharedDrawCircleFilled = g_renderer.drawCircleFilled;
	const sharedDrawEllipse = g_renderer.drawEllipse;
	const sharedDrawLine = g_renderer.drawLine;
	const sharedDrawPixel = g_renderer.drawPixel;
	const sharedDrawRect = g_renderer.drawRect;
	const sharedDrawRectFilled = g_renderer.drawRectFilled;
	const sharedDrawImage = g_renderer.drawImage;
	const sharedDrawSprite = g_renderer.drawSprite;

	// Other API Commands
	const sharedGetImageFromRawInput = g_images.getImageFromRawInput;
	const sharedGetStoredImage = g_images.getStoredImage;

	// Utility commands
	const sharedIsObjectLiteral = g_utils.isObjectLiteral;
	const sharedSetImageDirty = g_renderer.setImageDirty;
	const sharedGetInt = g_utils.getInt;
	const sharedGetFloat = g_utils.getFloat;
	const sharedDegreesToRadian = g_utils.degreesToRadian;
	const sharedGetColorValueByRawInput = g_colors.getColorValueByRawInput;

	// Constants
	const sharedPointsBatch = g_renderer.POINTS_BATCH;
	const sharedImageReplaceBatch = g_renderer.IMAGE_REPLACE_BATCH;

	/**********************************************************************************************
	 * ARC Command
	 **********************************************************************************************/

	const arcFn = ( x, y, radius, angle1, angle2 ) => {
		const pX = sharedGetInt( x, null );
		const pY = sharedGetInt( y, null );
		const pRadius = sharedGetInt( radius, null );

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
		sharedDrawArc(
			sharedScreenData, pX, pY, pRadius, sharedDegreesToRadian( angle1 ),
			sharedDegreesToRadian( angle2 )
		);
		sharedSetImageDirty( sharedScreenData );
	};
	const arcFnWrapper = ( x, y, radius, angle1, angle2 ) => {
		if( sharedIsObjectLiteral( x ) ) {
			arcFn( x.x, x.y, x.radius, x.angle1, x.angle2 );
		} else {
			arcFn( x, y, radius, angle1, angle2 );
		}
	};
	m_api.arc = arcFnWrapper;
	sharedScreenData.api.arc = arcFnWrapper;

	/**********************************************************************************************
	 * BEZIER Command
	 **********************************************************************************************/

	const bezierFn = ( x1, y1, x2, y2, x3, y3, x4, y4 ) => {
		const pX1 = sharedGetInt( x1, null );
		const pY1 = sharedGetInt( y1, null );
		const pX2 = sharedGetInt( x2, null );
		const pY2 = sharedGetInt( y2, null );
		const pX3 = sharedGetInt( x3, null );
		const pY3 = sharedGetInt( y3, null );
		const pX4 = sharedGetInt( x4, null );
		const pY4 = sharedGetInt( y4, null );

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
		sharedDrawBezier( sharedScreenData, pX1, pY1, pX2, pY2, pX3, pY3, pX4, pY4 );
		sharedSetImageDirty( sharedScreenData );
	};
	const bezierFnWrapper = ( x1, y1, x2, y2, x3, y3, x4, y4 ) => {
		if( sharedIsObjectLiteral( x1 ) ) {
			bezierFn( x1.x1, x1.y1, x1.x2, x1.y2, x1.x3, x1.y3, x1.x4, x1.y4 );
		} else {
			bezierFn( x1, y1, x2, y2, x3, y3, x4, y4 );
		}
	};
	m_api.bezier = bezierFnWrapper;
	sharedScreenData.api.bezier = bezierFnWrapper;

	/**********************************************************************************************
	 * Circle Command
	 **********************************************************************************************/

	const circleFn = ( x, y, radius, fillColor ) => {
		const pX = sharedGetInt( x, null );
		const pY = sharedGetInt( y, null );
		const pRadius = sharedGetInt( radius, null );

		if( pX === null || pY === null || pRadius === null ) {
			const error = new TypeError(
				"circle: Parameters x, y, and radius must be integers."
			);
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Parse and validate fillColor here (single source of truth)
		let fillColorValue = null;
		if( fillColor != null ) {
			fillColorValue = sharedGetColorValueByRawInput( sharedScreenData, fillColor );
			if( fillColorValue === null ) {
				const error = new TypeError(
					"circle: Parameter 'fillColor' must be a valid color."
				);
				error.code = "INVALID_PARAMETER";
				throw error;
			}

			// Fill in the circle
			if( pRadius > 0 ) {
				sharedDrawCircleFilled( sharedScreenData, pX, pY, pRadius, fillColorValue );
			}
		}

		// Draw the circle border
		sharedDrawCircle( sharedScreenData, pX, pY, pRadius );
		sharedSetImageDirty( sharedScreenData );
	};
	const circleFnWrapper = ( x, y, radius, fillColor ) => {
		if( sharedIsObjectLiteral( x ) ) {
			circleFn( x.x, x.y, x.radius, x.fillColor );
		} else {
			circleFn( x, y, radius, fillColor );
		}
	};

	m_api.circle = circleFnWrapper;
	sharedScreenData.api.circle = circleFnWrapper;

	/**********************************************************************************************
	 * Ellipse Command
	 **********************************************************************************************/

	const ellipseFn = ( x, y, radiusX, radiusY, fillColor ) => {
		const pX = sharedGetInt( x, null );
		const pY = sharedGetInt( y, null );
		const pRx = sharedGetInt( radiusX, null );
		const pRy = sharedGetInt( radiusY, null );

		if( pX === null || pY === null || pRx === null || pRy === null ) {
			const error = new TypeError( "ellipse: Parameters x, y, rx, and ry must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Parse and validate fillColor here (single source of truth)
		let fillColorValue = null;
		if( fillColor != null ) {
			fillColorValue = sharedGetColorValueByRawInput( sharedScreenData, fillColor );
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
		sharedDrawEllipse( sharedScreenData, pX, pY, pRx, pRy, fillColorValue );
		sharedSetImageDirty( sharedScreenData );
	};
	const ellipseFnWrapper = ( x, y, radiusX, radiusY, fillColor ) => {
		if( sharedIsObjectLiteral( x ) ) {
			ellipseFn( x.x, x.y, x.radiusX, x.radiusY, x.fillColor );
		} else {
			ellipseFn( x, y, radiusX, radiusY, fillColor );
		}
	};

	m_api.ellipse = ellipseFnWrapper;
	sharedScreenData.api.ellipse = ellipseFnWrapper;

	/**********************************************************************************************
	 * LINE Command
	 **********************************************************************************************/

	const lineFn = ( x1, y1, x2, y2 ) => {
		const pX1 = sharedGetInt( x1, null );
		const pY1 = sharedGetInt( y1, null );
		const pX2 = sharedGetInt( x2, null );
		const pY2 = sharedGetInt( y2, null );

		// Make sure x1, y1, x2, y2 are integers
		if( pX1 === null || pY1 === null || pX2 === null || pY2 === null ) {
			const error = new TypeError( "line: Parameters x1, y1, x2, y2 must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw Line
		sharedDrawLine( sharedScreenData, pX1, pY1, pX2, pY2 );
		sharedSetImageDirty( sharedScreenData );
	};
	const lineFnWrapper = ( x1, y1, x2, y2 ) => {
		if( sharedIsObjectLiteral( x1 ) ) {
			lineFn( x1.x1 , x1.y1, x1.x2, x1.y2 );
		} else {
			lineFn( x1, y1, x2, y2 );
		}
	};

	m_api.line = lineFnWrapper;
	sharedScreenData.api.line = lineFnWrapper;

	/**********************************************************************************************
	 * PSET Command
	 **********************************************************************************************/

	const psetFn = ( x, y ) => {
		const pX = sharedGetInt( x, null );
		const pY = sharedGetInt( y, null );

		// Make sure x and y are integers
		if( pX === null || pY === null ) {
			const error = new TypeError( "pset: Parameters x and y must be integers." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// Draw the pixel
		sharedDrawPixel( sharedScreenData, pX, pY, sharedPointsBatch );
		sharedSetImageDirty( sharedScreenData );

		// Set the cursor after drawing
		sharedScreenData.cursor.x = x;
		sharedScreenData.cursor.y = y;
	};
	const psetFnWrapper = ( x, y ) => {
		if( sharedIsObjectLiteral( x ) ) {
			psetFn( x.x , x.y );
		} else {
			psetFn( x, y );
		}
	};
	m_api.pset = psetFnWrapper;
	sharedScreenData.api.pset = psetFnWrapper;

	/**********************************************************************************************
	 * RECT Command
	 **********************************************************************************************/

	const rectFn = ( x, y, width, height, fillColor ) => {
		const pX = sharedGetInt( x, null );
		const pY = sharedGetInt( y, null );
		const pWidth = sharedGetInt( width, null );
		const pHeight = sharedGetInt( height, null );

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
			fillColorValue = sharedGetColorValueByRawInput( sharedScreenData, fillColor );
			if( fillColorValue === null ) {
				const error = new TypeError( "rect: Parameter 'fillColor' must be a valid color." );
				error.code = "INVALID_PARAMETER";
				throw error;
			}

			// Fill in the rectangle
			const fWidth = pWidth - 2;
			const fHeight = pHeight - 2;
			if( fWidth > 0 && fHeight > 0 ) {
				sharedDrawRectFilled( sharedScreenData, pX + 1, pY + 1, fWidth, fHeight, fillColorValue );
			}
		}

		// Draw the rect border
		sharedDrawRect( sharedScreenData, pX, pY, pWidth, pHeight );
		sharedSetImageDirty( sharedScreenData );
	};
	const rectFnWrapper = ( x, y, width, height, fillColor ) => {
		if( sharedIsObjectLiteral( x ) ) {
			rectFn( x.x , x.y, x.width, x.height, x.fillColor );
		} else {
			rectFn( x, y, width, height, fillColor );
		}
	};

	m_api.rect = rectFnWrapper;
	sharedScreenData.api.rect = rectFnWrapper;

	/**********************************************************************************************
	 * BLIT IMAGE Command
	 **********************************************************************************************/

	// Draw image with blending disabled
	const blitImageFn = ( img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad ) => {
		const pAnchorX = anchorX ?? sharedScreenData.defaultAnchorX;
		const pAnchorY = anchorY ?? sharedScreenData.defaultAnchorY;
		const pColor = color ?? DEFAULT_BLIT_COLOR;
		sharedDrawImage(
			sharedScreenData, img, x, y, pColor, pAnchorX, pAnchorY, scaleX, scaleY, angleRad,
			sharedImageReplaceBatch
		);
		sharedSetImageDirty( sharedScreenData );
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
		if( sharedIsObjectLiteral( img ) ) {
			blitImageFn(
				img.img, img.x, img.y, img.color, img.anchorX, img.anchorY, img.scaleX, img.scaleY,
				img.angleRad
			);
		} else {
			blitImageFn( img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad );
		}
	};
	m_api.blitImage = blitImageFnWrapper;
	sharedScreenData.api.blitImage = blitImageFnWrapper;

	/**********************************************************************************************
	 * BLIT SPRITE Command
	 **********************************************************************************************/

	// Draw image with blending disabled
	const blitSpriteFn = (
		name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad
	) => {
		const spriteData = sharedGetStoredImage( name );
		const frameData = spriteData.frames[ frame ];
		const img = spriteData.image;
		const pAnchorX = anchorX ?? sharedScreenData.defaultAnchorX;
		const pAnchorY = anchorY ?? sharedScreenData.defaultAnchorY;
		const pColor = color ?? DEFAULT_BLIT_COLOR;
		sharedDrawSprite(
			sharedScreenData, img,
			frameData.x, frameData.y, frameData.width, frameData.height,
			x, y, frameData.width, frameData.height,
			pColor, pAnchorX, pAnchorY, scaleX, scaleY, angleRad,
			sharedImageReplaceBatch
		);
		sharedSetImageDirty( sharedScreenData );
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
		if( sharedIsObjectLiteral( name ) ) {
			blitSpriteFn(
				name.name, name.frame, name.x, name.y, name.color, name.anchorX, name.anchorY,
				name.scaleX, name.scaleY, name.angleRad
			);
		} else {
			blitSpriteFn( name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad );
		}
	};
	m_api.blitSprite = blitSpriteFnWrapper;
	sharedScreenData.api.blitSprite = blitSpriteFnWrapper;

	/**********************************************************************************************
	 * DRAW IMAGE Command
	 **********************************************************************************************/

	const drawImageFn = ( image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle ) => {
		x = sharedGetInt( x, null );
		y = sharedGetInt( y, null );
		color = color ?? DEFAULT_BLIT_COLOR;
		anchorX = sharedGetFloat( anchorX, sharedScreenData.defaultAnchorX );
		anchorY = sharedGetFloat( anchorY, sharedScreenData.defaultAnchorY );
		scaleX = sharedGetFloat( scaleX, 1 );
		scaleY = sharedGetFloat( scaleY, 1 );
		angle = sharedGetFloat( angle, 0 );
		image = sharedGetImageFromRawInput( image, "drawImage" );

		// Validate coordinates
		if( x === null || y === null ) {
			const error = new TypeError( "drawImage: Parameters x and y must be numbers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		// Parses the color and makes sure it's in a valid format
		color = sharedGetColorValueByRawInput( sharedScreenData, color );
		if( color === null ) {
			color = DEFAULT_BLIT_COLOR;
		}

		// Convert angle from degrees to radians
		const angleRad = sharedDegreesToRadian( angle );

		// Draw using renderer-specific implementation
		sharedDrawImage(
			sharedScreenData, image, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad
		);

		// Mark screen as dirty
		sharedSetImageDirty( sharedScreenData );
	};

	const drawImageFnWrapper = ( image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle ) => {
		if( sharedIsObjectLiteral( image ) ) {
			drawImageFn(
				image.image, image.x, image.y, image.color, image.anchorX, image.anchorY,
				image.scaleX, image.scaleY, image.angle
			);
		} else {
			drawImageFn( image, x, y, color, anchorX, anchorY, scaleX, scaleY, angle );
		}
	};

	m_api.drawImage = drawImageFnWrapper;
	sharedScreenData.api.drawImage = drawImageFnWrapper;

	/**********************************************************************************************
	 * DRAW SPRITE Command
	 **********************************************************************************************/

	const drawSpriteFn = ( name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle ) => {
		frame = frame ?? 0;
		x = sharedGetInt( x, null );
		y = sharedGetInt( y, null );
		color = color ?? DEFAULT_BLIT_COLOR;
		anchorX = sharedGetFloat( anchorX, sharedScreenData.defaultAnchorX );
		anchorY = sharedGetFloat( anchorY, sharedScreenData.defaultAnchorY );
		scaleX = sharedGetFloat( scaleX, 1 );
		scaleY = sharedGetFloat( scaleY, 1 );
		angle = sharedGetFloat( angle, 0 );

		// Validate name
		if( typeof name !== "string" ) {
			const error = new TypeError( "drawSprite: Parameter name must be a string." );
			error.code = "INVALID_NAME";
			throw error;
		}

		const spriteData = sharedGetStoredImage( name );
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
		color = sharedGetColorValueByRawInput( sharedScreenData, color );
		if( color === null ) {
			color = DEFAULT_BLIT_COLOR;
		}

		// Convert angle from degrees to radians
		const angleRad = sharedDegreesToRadian( angle );

		// Get frame data
		const frameData = spriteData.frames[ frame ];
		const img = spriteData.image;

		// Draw using renderer-specific implementation
		g_renderer.drawSprite(
			sharedScreenData, img,
			frameData.x, frameData.y, frameData.width, frameData.height,
			x, y, frameData.width, frameData.height,
			color, anchorX, anchorY, scaleX, scaleY, angleRad
		);

		// Mark screen as dirty
		sharedSetImageDirty( sharedScreenData );
	};

	const drawSpriteFnWrapper = (
		name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle
	) => {
		if( sharedIsObjectLiteral( name ) ) {
			drawSpriteFn(
				name.name, name.frame, name.x, name.y, name.color, name.anchorX, name.anchorY,
				name.scaleX, name.scaleY, name.angle
			);
		} else {
			drawSpriteFn( name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle );
		}
	};

	m_api.drawSprite = drawSpriteFnWrapper;
	sharedScreenData.api.drawSprite = drawSpriteFnWrapper;
}

/**
 * Clear the screen or a rectangular region
 *
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options containing x, y, width, height
 * @returns {void}
 */
function cls( screenData, options ) {
	const view = screenData.view;
	const localW = view.width;
	const localH = view.height;
	const x = g_utils.clamp( g_utils.getInt( options.x, 0 ), 0, localW );
	const y = g_utils.clamp( g_utils.getInt( options.y, 0 ), 0, localH );
	const width = g_utils.clamp(
		g_utils.getInt( options.width, localW - x ), 0, localW - x
	);
	const height = g_utils.clamp(
		g_utils.getInt( options.height, localH - y ), 0, localH - y
	);

	const phys = g_view.toScreen( screenData, x, y );
	const clip = g_view.intersectRects(
		phys.x, phys.y, width, height,
		view.clipX, view.clipY, view.clipWidth, view.clipHeight
	);

	if( clip.width > 0 && clip.height > 0 ) {
		g_renderer.cls( screenData, clip.x, clip.y, clip.width, clip.height );
		g_renderer.setImageDirty( screenData );
	}

	// Reset cursor for no-arg / full requested-view clears
	if( x === 0 && y === 0 && width === localW && height === localH ) {
		screenData.printCursor.x = 0;
		screenData.printCursor.y = 0;
	}
}
