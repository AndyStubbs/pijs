/**
 * Pi.js 1.2.5 Performance Patch
 *
 * Adds the commands that the performance tests need and Pi.js 1.2.5 does not have:
 *
 * - registerPlugin, with the part of the plugin API that the polygons plugin uses, so the same
 *   plugin bundle provides polygon
 * - getPalColor
 * - blitImage and blitSprite, with the Pi.js 2 parameters
 * - drawImageColor and drawSpriteColor, which take the Pi.js 2 drawImage and drawSprite
 *   parameters, including the tint color that the 1.2.5 commands have no parameter for
 *
 * Pi.js 1.2.5 removes its internal API after loading, so the patch uses public commands and the
 * screen's 2D context only. The existing 1.2.5 commands are left as they are, apart from
 * setColor, loadImage, and loadSpritesheet, which also record what the patch needs to read back.
 *
 * Scores from patched commands measure the patch together with the Canvas 2D core.
 *
 * Loaded as a classic script after the Pi.js 1.2.5 core and before the polygons plugin. Global
 * commands use the most recently created screen.
 */

"use strict";

( function () {

	const pi = window.pi;

	// Tinted copies are dropped all at once when the cache reaches this many canvases
	const MAX_TINTED_IMAGES = 4096;

	// Color index that Pi.js 1.2.5 starts each screen with
	const DEFAULT_COLOR = 7;

	// Image elements by image name, since 1.2.5 has no command that returns a loaded image
	const m_images = {};

	// Spritesheet frames by image name
	const m_frames = {};

	// Tinted copies: image element -> Map of color string -> canvas
	const m_tintedImages = new Map();
	let m_tintedImageCount = 0;

	// Commands added by plugins, installed on every screen
	const m_pluginCommands = [];

	// State of the most recently created screen
	let m_screen = null;
	let m_context = null;
	let m_screenData = null;
	let m_pal = null;
	let m_colorInput = DEFAULT_COLOR;

	// Unwrapped screen commands used by the patch
	let m_setColor = null;
	let m_setPalColor = null;

	patchGlobalCommands();


	/**********************************************************************************************
	 * Command Installation
	 **********************************************************************************************/


	/**
	 * Wraps and adds the global commands
	 *
	 * @returns {void}
	 */
	function patchGlobalCommands() {
		const screen = pi.screen;
		const loadImage = pi.loadImage;
		const loadSpritesheet = pi.loadSpritesheet;
		const setColor = pi.setColor;
		const setPalColor = pi.setPalColor;

		pi.screen = function () {
			const screenObj = screen.apply( pi, arguments );
			if( screenObj ) {
				patchScreen( screenObj );
			}
			return screenObj;
		};

		// A string source is loaded into an element here, so the patch can draw from it
		pi.loadImage = function ( src, name ) {
			if( typeof src !== "string" ) {
				return loadImage.apply( pi, arguments );
			}
			const image = createImageElement( src );
			const imageName = loadImage( image, name );
			m_images[ imageName ] = image;
			return imageName;
		};
		pi.loadSpritesheet = function ( src, name, width, height, margin ) {
			if( typeof src !== "string" ) {
				return loadSpritesheet.apply( pi, arguments );
			}
			const image = createImageElement( src );
			const imageName = loadSpritesheet( image, name, width, height, margin );
			m_images[ imageName ] = image;
			return imageName;
		};

		// The color is recorded because 1.2.5 has no getColor command
		pi.setColor = function ( color ) {
			m_colorInput = getColorInput( color );
			return setColor.apply( pi, arguments );
		};
		pi.setPalColor = function () {
			m_pal = null;
			return setPalColor.apply( pi, arguments );
		};

		pi.registerPlugin = registerPlugin;
		pi.getPalColor = getPalColor;
		pi.blitImage = blitImage;
		pi.blitSprite = blitSprite;
		pi.drawImageColor = drawImageColor;
		pi.drawSpriteColor = drawSpriteColor;
	}

	/**
	 * Wraps and adds the commands of a new screen, and makes it the screen the patch draws on
	 *
	 * @param {Object} screenObj - Screen object returned by the screen command
	 * @returns {void}
	 */
	function patchScreen( screenObj ) {
		m_screen = screenObj;
		m_context = screenObj.canvas().getContext( "2d" );
		m_pal = null;
		m_colorInput = DEFAULT_COLOR;
		m_setColor = screenObj.setColor;
		m_setPalColor = screenObj.setPalColor;

		// Screen data in the shape that Pi.js 2 plugins receive
		m_screenData = {
			"api": {
				"getColor": getColor,
				"getPalColor": getPalColor,
				"setColor": restoreColor,
				"rect": screenObj.rect,
				"line": screenObj.line
			},
			"view": {
				"originX": 0,
				"originY": 0,
				"clipX": 0,
				"clipY": 0,
				get "clipWidth"() {
					return screenObj.width();
				},
				get "clipHeight"() {
					return screenObj.height();
				}
			}
		};

		screenObj.setColor = function ( color ) {
			m_colorInput = getColorInput( color );
			return m_setColor.apply( screenObj, arguments );
		};
		screenObj.setPalColor = function () {
			m_pal = null;
			return m_setPalColor.apply( screenObj, arguments );
		};

		screenObj.getPalColor = getPalColor;
		screenObj.blitImage = blitImage;
		screenObj.blitSprite = blitSprite;
		screenObj.drawImageColor = drawImageColor;
		screenObj.drawSpriteColor = drawSpriteColor;
		for( const command of m_pluginCommands ) {
			screenObj[ command.name ] = command.fn;
		}
	}

	/**
	 * Creates an image element for a source path
	 *
	 * @param {string} src - Image source path
	 * @returns {HTMLImageElement} Image element, which may still be loading
	 */
	function createImageElement( src ) {
		const image = new Image();
		image.src = src;
		return image;
	}


	/**********************************************************************************************
	 * Plugins
	 **********************************************************************************************/


	/**
	 * Initializes a Pi.js 2 plugin with the plugin API that the polygons plugin uses
	 *
	 * @param {Object} plugin - Plugin registration
	 * @param {Function} plugin.init - Receives the plugin API
	 * @returns {void}
	 */
	function registerPlugin( plugin ) {
		plugin.init( {
			"addCommand": addPluginCommand,
			"utils": {
				"getInt": getInt,
				"convertToColor": convertToColor
			}
		} );
	}

	/**
	 * Adds a plugin's screen command to the global API and to the screens
	 *
	 * @param {string} name - Command name
	 * @param {Function} fn - Command implementation, which receives screen data and options
	 * @param {boolean} isScreen - Whether the implementation receives screen data
	 * @param {Array<string>} parameterNames - Parameter names in positional order
	 * @returns {void}
	 */
	function addPluginCommand( name, fn, isScreen, parameterNames ) {
		const command = function () {

			// Missing parameters are null, as they are in Pi.js 2 option objects
			const options = {};
			for( let i = 0; i < parameterNames.length; i++ ) {
				options[ parameterNames[ i ] ] = arguments[ i ] ?? null;
			}
			if( isScreen ) {
				return fn( m_screenData, options );
			}
			return fn( options );
		};
		m_pluginCommands.push( { "name": name, "fn": command } );
		pi[ name ] = command;
		if( m_screen ) {
			m_screen[ name ] = command;
		}
	}

	/**
	 * Rounds a value to an integer, as the Pi.js 2 getInt utility does
	 *
	 * @param {*} val - Value to parse
	 * @param {*} def - Value returned when val is not a finite number
	 * @returns {*} Rounded integer or def
	 */
	function getInt( val, def ) {
		if( val === null || val === undefined ) {
			return def;
		}
		const parsed = Number( val );
		if( !Number.isFinite( parsed ) ) {
			return def;
		}
		return Math.round( parsed );
	}


	/**********************************************************************************************
	 * Colors
	 **********************************************************************************************/


	/**
	 * Reads the color argument of a setColor call in either its positional or its object form
	 *
	 * @param {*} color - First argument of setColor
	 * @returns {*} Color input
	 */
	function getColorInput( color ) {
		if(
			color !== null && typeof color === "object" && !Array.isArray( color ) &&
			Object.prototype.hasOwnProperty.call( color, "color" )
		) {
			return color.color;
		}
		return color;
	}

	/**
	 * Gets the palette with a key on each color, as Pi.js 2 colors have. The palette is read
	 * once and kept until setPalColor changes it.
	 *
	 * @returns {Array<Object>} Palette colors
	 */
	function getPal() {
		if( m_pal === null ) {
			m_pal = m_screen.getPal();
			for( let i = 0; i < m_pal.length; i++ ) {
				m_pal[ i ].key = m_pal[ i ].s;
				m_pal[ i ].index = i;
			}
		}
		return m_pal;
	}

	/**
	 * Gets a palette color
	 *
	 * @param {number} index - Palette index
	 * @returns {Object|null} Color, or null when the index is not in the palette
	 */
	function getPalColor( index ) {
		return getPal()[ index ] ?? null;
	}

	/**
	 * Converts a color value to a color with a key
	 *
	 * @param {*} color - Color in any format that 1.2.5 accepts
	 * @returns {Object|null} Color, or null when the value is not a color
	 */
	function convertToColor( color ) {
		if( color === null || color === undefined ) {
			return null;
		}
		const colorValue = pi.util.convertToColor( color );
		if( colorValue !== null ) {
			colorValue.key = colorValue.s;
		}
		return colorValue;
	}

	/**
	 * Gets the current drawing color
	 *
	 * @returns {Object} Color
	 */
	function getColor() {
		if( Number.isInteger( m_colorInput ) ) {
			return getPalColor( m_colorInput ) ?? getPalColor( DEFAULT_COLOR );
		}
		return convertToColor( m_colorInput ) ?? getPalColor( DEFAULT_COLOR );
	}

	/**
	 * Sets the drawing color for a plugin without recording it. A plugin changes the color
	 * only while it draws and then sets the recorded color again.
	 *
	 * @param {Object} color - Color from getColor, getPalColor, or convertToColor
	 * @returns {void}
	 */
	function restoreColor( color ) {

		// A palette index skips the color conversion in 1.2.5
		m_setColor( color.index ?? color );
	}


	/**********************************************************************************************
	 * Images
	 **********************************************************************************************/


	/**
	 * Draws an image tinted by a color, with the parameters of the Pi.js 2 drawImage command
	 *
	 * @param {string|HTMLImageElement|HTMLCanvasElement} name - Image name or element
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {Object} [color] - Tint color; white when omitted
	 * @param {number} [anchorX] - Anchor point X (0-1)
	 * @param {number} [anchorY] - Anchor point Y (0-1)
	 * @param {number} [scaleX] - Scale X factor
	 * @param {number} [scaleY] - Scale Y factor
	 * @param {number} [angle] - Rotation angle in degrees
	 * @returns {void}
	 */
	function drawImageColor( name, x, y, color, anchorX, anchorY, scaleX, scaleY, angle ) {
		const image = getImageElement( name, "drawImageColor" );
		drawItem(
			image, 0, 0, image.width, image.height, x, y, color, anchorX, anchorY, scaleX,
			scaleY, ( angle ?? 0 ) * Math.PI / 180, false
		);
	}

	/**
	 * Draws a sprite frame tinted by a color, with the parameters of the Pi.js 2 drawSprite
	 * command
	 *
	 * @param {string} name - Spritesheet name
	 * @param {number} frame - Frame index
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {Object} [color] - Tint color; white when omitted
	 * @param {number} [anchorX] - Anchor point X (0-1)
	 * @param {number} [anchorY] - Anchor point Y (0-1)
	 * @param {number} [scaleX] - Scale X factor
	 * @param {number} [scaleY] - Scale Y factor
	 * @param {number} [angle] - Rotation angle in degrees
	 * @returns {void}
	 */
	function drawSpriteColor(
		name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angle
	) {
		const frameData = getFrame( name, frame, "drawSpriteColor" );
		drawItem(
			getImageElement( name, "drawSpriteColor" ),
			frameData.x, frameData.y, frameData.width, frameData.height,
			x, y, color, anchorX, anchorY, scaleX, scaleY, ( angle ?? 0 ) * Math.PI / 180, false
		);
	}

	/**
	 * Draws an image with blending disabled, with the parameters of the Pi.js 2 blitImage
	 * command
	 *
	 * @param {string|HTMLImageElement|HTMLCanvasElement} name - Image name or element
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {Object} [color] - Tint color; white when omitted
	 * @param {number} [anchorX] - Anchor point X (0-1)
	 * @param {number} [anchorY] - Anchor point Y (0-1)
	 * @param {number} [scaleX] - Scale X factor
	 * @param {number} [scaleY] - Scale Y factor
	 * @param {number} [angleRad] - Rotation angle in radians
	 * @returns {void}
	 */
	function blitImage( name, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad ) {
		const image = getImageElement( name, "blitImage" );
		drawItem(
			image, 0, 0, image.width, image.height, x, y, color, anchorX, anchorY, scaleX,
			scaleY, angleRad ?? 0, true
		);
	}

	/**
	 * Draws a sprite frame with blending disabled, with the parameters of the Pi.js 2
	 * blitSprite command
	 *
	 * @param {string} name - Spritesheet name
	 * @param {number} frame - Frame index
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {Object} [color] - Tint color; white when omitted
	 * @param {number} [anchorX] - Anchor point X (0-1)
	 * @param {number} [anchorY] - Anchor point Y (0-1)
	 * @param {number} [scaleX] - Scale X factor
	 * @param {number} [scaleY] - Scale Y factor
	 * @param {number} [angleRad] - Rotation angle in radians
	 * @returns {void}
	 */
	function blitSprite(
		name, frame, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad
	) {
		const frameData = getFrame( name, frame ?? 0, "blitSprite" );
		drawItem(
			getImageElement( name, "blitSprite" ),
			frameData.x, frameData.y, frameData.width, frameData.height,
			x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad ?? 0, true
		);
	}

	/**
	 * Gets the element of a loaded image
	 *
	 * @param {string|HTMLImageElement|HTMLCanvasElement} name - Image name or element
	 * @param {string} fnName - Command name for the error message
	 * @returns {HTMLImageElement|HTMLCanvasElement} Image element
	 */
	function getImageElement( name, fnName ) {
		if( typeof name !== "string" ) {
			return name;
		}
		const image = m_images[ name ];
		if( !image ) {
			throw new Error( `${fnName}: Image "${name}" not found.` );
		}
		return image;
	}

	/**
	 * Gets a frame of a spritesheet. The frames of each spritesheet are read once.
	 *
	 * @param {string} name - Spritesheet name
	 * @param {number} frame - Frame index
	 * @param {string} fnName - Command name for the error message
	 * @returns {Object} Frame with x, y, width, and height
	 */
	function getFrame( name, frame, fnName ) {
		let frames = m_frames[ name ];
		if( !frames ) {
			const spriteData = m_screen.getSpritesheetData( name );
			if( !spriteData ) {
				throw new Error( `${fnName}: Spritesheet "${name}" not found.` );
			}
			frames = spriteData.frames;
			m_frames[ name ] = frames;
		}
		const frameData = frames[ frame ];
		if( !frameData ) {
			throw new RangeError( `${fnName}: Frame ${frame} is not valid.` );
		}
		return frameData;
	}

	/**
	 * Gets a copy of an image with its colors multiplied by a tint color. Each copy is kept
	 * for later draws of the same image and color.
	 *
	 * @param {HTMLImageElement|HTMLCanvasElement} image - Source image
	 * @param {Object} color - Tint color with r, g, b, and s
	 * @returns {HTMLImageElement|HTMLCanvasElement} Tinted copy, or the image for white
	 */
	function getTintedImage( image, color ) {
		if( color.r === 255 && color.g === 255 && color.b === 255 ) {
			return image;
		}

		let tintedByColor = m_tintedImages.get( image );
		if( !tintedByColor ) {
			tintedByColor = new Map();
			m_tintedImages.set( image, tintedByColor );
		}
		let tinted = tintedByColor.get( color.s );
		if( tinted ) {
			return tinted;
		}

		// Simple approach: clear every copy once the cache is full
		if( m_tintedImageCount >= MAX_TINTED_IMAGES ) {
			m_tintedImages.clear();
			m_tintedImageCount = 0;
			tintedByColor = new Map();
			m_tintedImages.set( image, tintedByColor );
		}

		tinted = document.createElement( "canvas" );
		tinted.width = image.width;
		tinted.height = image.height;
		const context = tinted.getContext( "2d" );
		context.drawImage( image, 0, 0 );

		// Multiply the color channels, then take the alpha channel of the image again
		context.globalCompositeOperation = "multiply";
		context.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
		context.fillRect( 0, 0, tinted.width, tinted.height );
		context.globalCompositeOperation = "destination-in";
		context.drawImage( image, 0, 0 );

		tintedByColor.set( color.s, tinted );
		m_tintedImageCount += 1;
		return tinted;
	}

	/**
	 * Draws a region of an image on the screen's 2D context with a transform, as the 1.2.5
	 * drawImage and drawSprite commands do
	 *
	 * @param {HTMLImageElement|HTMLCanvasElement} image - Source image
	 * @param {number} sx - Source X
	 * @param {number} sy - Source Y
	 * @param {number} width - Source width
	 * @param {number} height - Source height
	 * @param {number} x - Destination X position
	 * @param {number} y - Destination Y position
	 * @param {Object} [color] - Tint color; white when omitted
	 * @param {number} [anchorX] - Anchor point X (0-1)
	 * @param {number} [anchorY] - Anchor point Y (0-1)
	 * @param {number} [scaleX] - Scale X factor
	 * @param {number} [scaleY] - Scale Y factor
	 * @param {number} angleRad - Rotation angle in radians
	 * @param {boolean} isBlit - Whether the region replaces the pixels under it
	 * @returns {void}
	 */
	function drawItem(
		image, sx, sy, width, height, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad,
		isBlit
	) {
		let source = image;
		let alpha = 1;
		if( color != null ) {
			source = getTintedImage( image, color );
			alpha = ( color.a ?? 255 ) / 255;
		}
		const pScaleX = scaleX ?? 1;
		const pScaleY = scaleY ?? 1;
		const anchorXPx = Math.round( width * ( anchorX ?? 0 ) );
		const anchorYPx = Math.round( height * ( anchorY ?? 0 ) );
		const context = m_context;

		// A clear of an empty region that is not the whole screen writes pending pixels to the
		// canvas and drops the cached pixel data, which 1.2.5 does around its own image draws
		m_screen.cls( 1, 1, 0, 0 );

		const oldAlpha = context.globalAlpha;
		context.globalAlpha = alpha;
		context.translate( x ?? 0, y ?? 0 );
		context.rotate( angleRad );
		context.scale( pScaleX, pScaleY );

		// Drawing on a cleared region replaces its pixels, including transparent source pixels
		if( isBlit ) {
			context.clearRect( -anchorXPx, -anchorYPx, width, height );
		}
		context.drawImage(
			source, sx, sy, width, height, -anchorXPx, -anchorYPx, width, height
		);

		// The transform is undone in reverse, as 1.2.5 does, in place of a save and restore
		context.scale( 1 / pScaleX, 1 / pScaleY );
		context.rotate( -angleRad );
		context.translate( -( x ?? 0 ), -( y ?? 0 ) );
		context.globalAlpha = oldAlpha;
	}

} )();
