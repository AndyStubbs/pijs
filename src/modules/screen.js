/**
 * Pi.js - Screen Module
 * 
 * Screen creation and management for Pi.js.
 * Creates canvas elements, manages multiple screens, handles aspect ratios.
 * 
 * @module modules/screen
 */

export function init( pi ) {
	const piData = pi._.data;

	// Main screen creation command
	pi._.addCommand( "screen", screen, false, false,
		[ "aspect", "container", "isOffscreen", "willReadFrequently", "noStyles",
		 "isMultiple", "resizeCallback" ]
	);

	function screen( args ) {
		const aspect = args[ 0 ];
		const container = args[ 1 ];
		const isOffscreen = args[ 2 ];
		const willReadFrequently = !!( args[ 3 ] );
		const noStyles = args[ 4 ];
		const isMultiple = args[ 5 ];
		const resizeCallback = args[ 6 ];

		let aspectData;

		// Validate resize callback
		if( resizeCallback != null && !pi.util.isFunction( resizeCallback ) ) {
			const error = new TypeError( "screen: resizeCallback must be a function." );
			error.code = "INVALID_CALLBACK";
			throw error;
		}

		// Parse aspect ratio
		if( typeof aspect === "string" && aspect !== "" ) {
			aspectData = parseAspect( aspect.toLowerCase() );
			if( !aspectData ) {
				const error = new Error( "screen: invalid value for aspect." );
				error.code = "INVALID_ASPECT";
				throw error;
			}
			aspectData.isMultiple = !!( isMultiple );
		}

		// Create appropriate screen type
		let screenData;

		if( isOffscreen ) {
			if( !aspectData ) {
				const error = new Error(
					"screen: You must supply an aspect ratio with exact dimensions " +
					"for offscreen screens."
				);
				error.code = "NO_ASPECT_OFFSCREEN";
				throw error;
			}
			if( aspectData.splitter !== "x" ) {
				const error = new Error(
					"screen: You must use aspect ratio with e(x)act pixel dimensions " +
					"such as 320x200 for offscreen screens."
				);
				error.code = "INVALID_OFFSCREEN_ASPECT";
				throw error;
			}
			screenData = createOffscreenScreen( aspectData, willReadFrequently );
		} else {
			let containerEl = container;
			if( typeof container === "string" ) {
				containerEl = document.getElementById( container );
			}
			if( containerEl && !pi.util.isDomElement( containerEl ) ) {
				const error = new TypeError(
					"screen: Invalid argument container. Container must be a DOM element " +
					"or a string id of a DOM element."
				);
				error.code = "INVALID_CONTAINER";
				throw error;
			}
			if( noStyles ) {
				screenData = createNoStyleScreen( aspectData, containerEl, willReadFrequently );
			} else {
				screenData = createScreen(
					aspectData, containerEl, resizeCallback, willReadFrequently
				);
			}
		}

		// Setup screen cache
		screenData.cache = { "findColor": {} };

		// Create screen object
		const screenObj = {};
		screenData.commands = {};

		// Loop through all the screen commands
		for( const cmdName in piData.screenCommands ) {
			const commandData = piData.screenCommands[ cmdName ];
			screenData.commands[ cmdName ] = commandData.fn;

			// Setup the API command on screenObj
			setupApiCommand( screenObj, cmdName, screenData, commandData );
		}

		// Assign screen object reference
		screenData.screenObj = screenObj;
		screenObj.id = screenData.id;
		screenObj.screen = true;

		return screenObj;
	}

	// Setup API command method on screen object
	function setupApiCommand( screenObj, name, screenData, cmd ) {
		screenObj[ name ] = function( ...args ) {
			const parsedArgs = pi._.parseOptions( cmd, args );
			return screenData.commands[ name ]( screenData, parsedArgs );
		};
	}

	// Parse aspect ratio string
	function parseAspect( aspect ) {
		let width, height, parts, splitter;

		// 2 types of ratios: percentage or exact pixels
		if( aspect.indexOf( ":" ) > -1 ) {
			splitter = ":";
		} else if( aspect.indexOf( "x" ) > -1 ) {
			splitter = "x";
		} else if( aspect.indexOf( "e" ) > -1 ) {
			splitter = "e";
		} else {
			return null;
		}

		parts = aspect.split( splitter );

		// Get the width and validate it
		width = Number( parts[ 0 ] );
		if( isNaN( width ) || width === 0 ) {
			return null;
		}

		// Get the height and validate it
		height = Number( parts[ 1 ] );
		if( isNaN( height ) || height === 0 ) {
			return null;
		}

		return {
			"width": width,
			"height": height,
			"splitter": splitter
		};
	}

	// Create offscreen canvas
	function createOffscreenScreen( aspectData, willReadFrequently ) {
		const canvas = document.createElement( "canvas" );
		canvas.width = aspectData.width;
		canvas.height = aspectData.height;

		const bufferCanvas = document.createElement( "canvas" );
		bufferCanvas.width = aspectData.width;
		bufferCanvas.height = aspectData.height;

		return createScreenData(
			canvas, bufferCanvas, null, aspectData, true,
			false, null, willReadFrequently
		);
	}

	// Create screen with default styling
	function createScreen( aspectData, container, resizeCallback, willReadFrequently ) {
		const canvas = document.createElement( "canvas" );
		const bufferCanvas = document.createElement( "canvas" );

		// Style the canvas
		canvas.style.backgroundColor = "black";
		canvas.style.position = "absolute";
		canvas.style.imageRendering = "pixelated";
		canvas.style.imageRendering = "crisp-edges";

		// If no container, use document body
		let isContainer = true;
		if( !pi.util.isDomElement( container ) ) {
			isContainer = false;
			document.documentElement.style.height = "100%";
			document.documentElement.style.margin = "0";
			document.body.style.height = "100%";
			document.body.style.margin = "0";
			document.body.style.overflow = "hidden";
			canvas.style.left = "0";
			canvas.style.top = "0";
			container = document.body;
		}

		// Make sure container is not blank
		if( container.offsetHeight === 0 ) {
			container.style.height = "200px";
		}

		// Append canvas to container
		container.appendChild( canvas );

		if( aspectData ) {
			// Calculate container size
			const size = getSize( container );

			// Set the canvas size
			setCanvasSize( aspectData, canvas, size.width, size.height );

			// Set the buffer size
			bufferCanvas.width = canvas.width;
			bufferCanvas.height = canvas.height;
		} else {
			// If canvas is inside an element, use static position
			if( isContainer ) {
				canvas.style.position = "static";
			}

			// Set canvas to fullscreen
			canvas.style.width = "100%";
			canvas.style.height = "100%";
			const size = getSize( canvas );
			canvas.width = size.width;
			canvas.height = size.height;
			bufferCanvas.width = size.width;
			bufferCanvas.height = size.height;
		}

		return createScreenData(
			canvas, bufferCanvas, container, aspectData, false,
			false, resizeCallback, willReadFrequently
		);
	}

	// Create screen without styles
	function createNoStyleScreen( aspectData, container, willReadFrequently ) {
		const canvas = document.createElement( "canvas" );
		const bufferCanvas = document.createElement( "canvas" );

		// If no container, use document body
		if( !pi.util.isDomElement( container ) ) {
			container = document.body;
		}

		// Append canvas to container
		container.appendChild( canvas );

		if( aspectData && aspectData.splitter === "x" ) {
			// Set the buffer size
			canvas.width = aspectData.width;
			canvas.height = aspectData.height;
			bufferCanvas.width = canvas.width;
			bufferCanvas.height = canvas.height;
		} else {
			const size = getSize( canvas );
			bufferCanvas.width = size.width;
			bufferCanvas.height = size.height;
		}

		return createScreenData(
			canvas, bufferCanvas, container, aspectData, false,
			true, null, willReadFrequently
		);
	}

	// Create the screen data object
	function createScreenData(
		canvas, bufferCanvas, container, aspectData, isOffscreen, isNoStyles,
		resizeCallback, willReadFrequently
	) {
		const screenData = {};

		// Set the screen id
		screenData.id = piData.nextScreenId;
		piData.nextScreenId += 1;
		piData.activeScreen = screenData;

		// Set the screenId on the canvas
		canvas.dataset.screenId = screenData.id;

		// Context attributes
		if( willReadFrequently ) {
			screenData.contextAttributes = { "willReadFrequently": true };
		} else {
			screenData.contextAttributes = {};
		}

		// Set the screen default data
		screenData.canvas = canvas;
		screenData.width = canvas.width;
		screenData.height = canvas.height;
		screenData.container = container;
		screenData.aspectData = aspectData;
		screenData.isOffscreen = isOffscreen;
		screenData.isNoStyles = isNoStyles;
		screenData.context = canvas.getContext( "2d", screenData.contextAttributes );
		screenData.bufferCanvas = bufferCanvas;
		screenData.bufferContext = bufferCanvas.getContext(
			"2d", screenData.contextAttributes
		);
		screenData.dirty = false;
		screenData.isAutoRender = true;
		screenData.autoRenderMicrotaskScheduled = false;
		screenData.imageData = null;
		screenData.x = 0;
		screenData.y = 0;
		screenData.angle = 0;
		screenData.pal = piData.defaultPalette.slice();
		screenData.fColor = screenData.pal[ piData.defaultColor ] || 
			pi.util.convertToColor( "#FFFFFF" );
		screenData.bColor = screenData.pal[ 0 ] || pi.util.convertToColor( "#000000" );
		screenData.context.fillStyle = screenData.fColor.s;
		screenData.context.strokeStyle = screenData.fColor.s;
		screenData.mouseStarted = false;
		screenData.touchStarted = false;
		screenData.printCursor = {
			"x": 0,
			"y": 0,
			"font": piData.defaultFont,
			"rows": Math.floor( canvas.height / ( piData.defaultFont.height || 14 ) ),
			"cols": Math.floor( canvas.width / ( piData.defaultFont.width || 8 ) ),
			"prompt": piData.defaultPrompt,
			"breakWord": true
		};
		screenData.clientRect = canvas.getBoundingClientRect();
		screenData.mouse = {
			"x": -1,
			"y": -1,
			"offsetX": 0,
			"offsetY": 0,
			"button": 0,
			"buttons": 0,
			"lastX": -1,
			"lastY": -1,
			"eventType": ""
		};
		screenData.touch = {
			"x": -1,
			"y": -1,
			"count": 0,
			"touches": [],
			"eventType": ""
		};
		screenData.touches = {};
		screenData.lastTouches = {};
		screenData.pixelMode = true;
		screenData.pen = {
			"draw": piData.defaultPenDraw,
			"size": 1,
			"noise": null
		};
		screenData.blendPixelCmd = piData.defaultBlendCmd;

		// Disable anti-aliasing
		screenData.context.imageSmoothingEnabled = false;

		// Event listeners
		screenData.onMouseEventListeners = {};
		screenData.onTouchEventListeners = {};
		screenData.onPressEventListeners = {};
		screenData.onClickEventListeners = {};
		screenData.mouseEventListenersActive = 0;
		screenData.touchEventListenersActive = 0;
		screenData.pressEventListenersActive = 0;
		screenData.clickEventListenersActive = 0;
		screenData.lastEvent = null;

		// Right click is enabled
		screenData.isContextMenuEnabled = true;

		// Resize callback
		screenData.resizeCallback = resizeCallback;

		// Register this screen
		piData.screens[ screenData.id ] = screenData;

		return screenData;
	}

	// Set canvas size based on aspect ratio
	function setCanvasSize( aspectData, canvas, maxWidth, maxHeight ) {
		let width = aspectData.width;
		let height = aspectData.height;
		const splitter = aspectData.splitter;
		let newWidth, newHeight;

		// If set size to exact multiple
		if( aspectData.isMultiple && splitter !== ":" ) {
			const factorX = Math.floor( maxWidth / width );
			const factorY = Math.floor( maxHeight / height );
			let factor = factorX > factorY ? factorY : factorX;
			if( factor < 1 ) {
				factor = 1;
			}
			newWidth = width * factor;
			newHeight = height * factor;

			// Extending the canvas to match container size
			if( splitter === "e" ) {
				width = Math.floor( maxWidth / factor );
				height = Math.floor( maxHeight / factor );
				newWidth = width * factor;
				newHeight = height * factor;
			}
		} else {
			// Calculate the screen ratios
			const ratio1 = height / width;
			const ratio2 = width / height;
			newWidth = maxHeight * ratio2;
			newHeight = maxWidth * ratio1;

			// Calculate the best fit
			if( newWidth > maxWidth ) {
				newWidth = maxWidth;
				newHeight = newWidth * ratio1;
			} else {
				newHeight = maxHeight;
			}

			// Extending canvas
			if( splitter === "e" ) {
				width += Math.round( ( maxWidth - newWidth ) * ( width / newWidth ) );
				height += Math.round( ( maxHeight - newHeight ) * ( height / newHeight ) );
				newWidth = maxWidth;
				newHeight = maxHeight;
			}
		}

		// Set the size
		canvas.style.width = Math.floor( newWidth ) + "px";
		canvas.style.height = Math.floor( newHeight ) + "px";

		// Set the margins
		canvas.style.marginLeft = Math.floor( ( maxWidth - newWidth ) / 2 ) + "px";
		canvas.style.marginTop = Math.floor( ( maxHeight - newHeight ) / 2 ) + "px";

		// Set the actual canvas dimensions
		if( splitter === "x" || splitter === "e" ) {
			canvas.width = width;
			canvas.height = height;
		} else {
			// For ratio mode, set to container size
			canvas.width = Math.floor( newWidth );
			canvas.height = Math.floor( newHeight );
		}
	}

	// Get size of container
	function getSize( element ) {
		return {
			"width": element.offsetWidth || element.clientWidth || element.width,
			"height": element.offsetHeight || element.clientHeight || element.height
		};
	}
}

