/**
 * Pi.js - Screen Manager Core Module
 * 
 * Screen creation and management for Pi.js.
 * Creates canvas elements, manages multiple screens, handles aspect ratios.
 * WebGL2 only - no Canvas2D fallback.
 * 
 * @module core/screen-manager
 */

/**
 * IDEA:
 * 
 * Simplify "m" multiple mode to use this formula:
 * scaleX = floor(canvas.width / FBO_WIDTH)
 * scaleY = floor(canvas.height / FBO_HEIGHT)
 * finalScale = min(scaleX, scaleY)
 *  
 * Even when I use "m" mode I still see artifacts, maybe handle the upscaling manually by setting
 * the canvas.width and canvas.height to match the CSS width and height and then when I copy the
 * FBO to the canvas it will apply gl.NEAREST when display to canvas is run, this is already 
 * implemented I just need to set canvas.width and canvas.height to match.
 * 
 * I did a test 640m480 and even it still has pixels that are uneven in size some pixels are 2x2,
 * other pixels are 1x2. Even with a css resolution of 1280x960 still resulted in uneven pixel
 * sizes.
 * 
 * My main reason for letting CSS handle upscaling was I liked being able to copy and paste the
 * image and get the image with target resolution. But a work-around could be adding a copy
 * image that command that copies the canvas to clipboard.
 * 
 * IDEA:
 * 
 * Add a hardPalette flag to the screen command. When set it adds a hard requirement on palette
 * colors. This means that only colors from the palette can be used.
 * 
 * Need to find an optimal solution to enforce the hardPalette flag and to update FBO when palette
 * changes. I can try adding a 1D array or texture with color lookups and try to do it in the
 * shader. If I have to I can do a CPU filter on the colors when palette changes, but this is not
 * optimal. I can also enforce the colors in the color lookups but that would require more
 * complex code in multiple places.  Need to really think about a good strategy for this.
 */
"use strict";

import * as g_utils from "./utils.js";
import * as g_commands from "./commands.js";
import * as g_renderer from "../renderer/renderer.js";
import * as g_graphics from "../api/graphics.js";
import * as g_view from "../api/view.js";
import { getCanvasContentRect } from "./canvas-layout.js";

const SCREEN_API_PROTO = { "screen": true, "id": 0 };
const m_screens = {};
const m_screenCanvasMap = new Map();
const m_screenDataItems = {};
const m_screenDataItemGetters = [];
const m_screenDataInitFunctions = [];
const m_screenDataPreCleanupFunctions = [];
const m_screenDataCleanupFunctions = [];
const MAX_CANVAS_DIMENSION = 8192;
const m_observedContainers = new Set();
const m_styleOwners = new WeakMap();

let m_nextScreenId = 0;
let m_activeScreenData = null;
let m_resizeObserver = null;
let m_offscreenCanvas = null;


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


export { m_activeScreenData as activeScreenData };
export { m_screenCanvasMap as screenCanvasMap };

/**
 * Initialize screen management.
 *
 * Creates the shared ResizeObserver, registers screen commands, and attaches
 * removeScreen on the global API and each new screen.
 *
 * @param {Object} api - Global Pi.js API object
 * @returns {void}
 */
export function init( api ) {

	// TODO-LATER: Add matchMedia to watch for DPR changes

	// Create a single ResizeObserver for all screen containers
	m_resizeObserver = new ResizeObserver( ( entries ) => {
		for( const entry of entries ) {
			const container = entry.target;
			const ownScreen = m_screenCanvasMap.get( container );
			if( ownScreen?.noCss && m_screens[ ownScreen.id ] ) {
				resizeScreen( ownScreen, false );
			}
			
			// Find all canvas elements in this container
			const canvases = container.querySelectorAll( "canvas[data-screen-id]" );
			if( canvases.length === 0 ) {
				continue;
			}
			
			// Resize all screens in this container
			for( const canvas of canvases ) {
				const screenId = parseInt( canvas.dataset.screenId, 10 );
				const screenData = m_screens[ screenId ];
				
				if( screenData ) {
					resizeScreen( screenData, false );
				}
			}
		}
	} );

	registerCommands();

	// Special command removeScreen
	api.removeScreen = ( screenId ) => {
		if( Object.getPrototypeOf( screenId ) === SCREEN_API_PROTO ) {
			screenId = screenId.id;
		}
		if( m_screens[ screenId ] ) {
			return removeScreen( m_screens[ screenId ] );
		}
	};

	// Add screenObj remove screen command
	addScreenInitFunction( ( screenData ) => {
		screenData.api.removeScreen = () => removeScreen( screenData );
	} );
}

function registerCommands() {

	// Global commands
	g_commands.addCommand(
		"screen", screen, false,
		[ "aspect", "container", "isOffscreen", "resizeCallback", "parent", "noCss" ]
	);
	g_commands.addCommand( "setScreen", setScreen, false, [ "screen" ] );
	g_commands.addCommand( "getScreen", getScreen, false, [ "screenId" ] );
	g_commands.addCommand( "getAllScreens", getAllScreens, false, [] );
	g_commands.addCommand( "removeAllScreens", removeAllScreens, false, [] );

	// Screen-scoped info commands
	g_commands.addCommand( "width", widthCmd, true, [] );
	g_commands.addCommand( "height", heightCmd, true, [] );
	g_commands.addCommand( "canvas", canvasCmd, true, [] );
}

/**
 * Register a value cloned onto every new screenData object.
 *
 * Used by renderer and API modules at init for per-screen state.
 *
 * @param {string} name - Property name on screenData
 * @param {*} val - Default value to clone onto each new screen
 * @returns {void}
 */
export function addScreenDataItem( name, val ) {
	m_screenDataItems[ name ] = val;
}

/**
 * Register a getter that supplies a per-screen default.
 *
 * fn() is called for each new screen and the result is cloned onto
 * screenData. Used for per-screen defaults such as palette.
 *
 * @param {string} name - Property name on screenData
 * @param {Function} fn - Getter that returns the default value
 * @returns {void}
 */
export function addScreenDataItemGetter( name, fn ) {
	m_screenDataItemGetters.push( { name, fn } );
}

/**
 * Register a function to run after a screen is created.
 *
 * @param {Function} fn - Function called with the new screenData
 * @returns {void}
 */
export function addScreenInitFunction( fn ) {
	m_screenDataInitFunctions.push( fn );
}

/**
 * Register a function to run before screen module resources are cleaned up.
 *
 * @param {Function} fn - Function called with the screenData being removed
 * @returns {void}
 */
export function addScreenPreCleanupFunction( fn ) {
	m_screenDataPreCleanupFunctions.push( fn );
}

/**
 * Register a function to run before a screen is removed.
 *
 * @param {Function} fn - Function called with the screenData being removed
 * @returns {void}
 */
export function addScreenCleanupFunction( fn ) {
	m_screenDataCleanupFunctions.push( fn );
}

/**
 * Get the active screen data object.
 *
 * Throws NO_ACTIVE_SCREEN unless isScreenOptional is true.
 *
 * @param {string} fnName - Calling command name for the error message
 * @param {boolean} [isScreenOptional] - Allow null when no screen is active
 * @returns {Object|null} Active screen data, or null if optional and none
 */
export function getActiveScreen( fnName, isScreenOptional ) {
	if( m_activeScreenData === null && !isScreenOptional ) {
		const error = new Error(
			fnName + ": You are attempting to call a method that requires a screen but there " +
			"there is currently no active screen. Call $.screen() before calling any graphics " +
			"commands."
		);
		error.code = "NO_ACTIVE_SCREEN";
		throw error;
	}
	return m_activeScreenData;
}

/**
 * Guard deferred work against screen disposal, including disposal during cleanup hooks.
 *
 * @param {Object} screenData - Screen data retained by the deferred operation
 * @returns {void}
 * @throws {Error} SCREEN_REMOVED when disposal has begun
 */
export function assertScreenAvailable( screenData ) {
	if( screenData.isRemoved ) {
		const error = new Error(
			`Cannot complete deferred work on removed screen (id: ${screenData.id}).`
		);
		error.code = "SCREEN_REMOVED";
		throw error;
	}
}

/**
 * Get screen data by screen id.
 *
 * Throws INVALID_SCREEN_ID if the id is not found.
 *
 * @param {string} fnName - Calling command name for the error message
 * @param {number} screenId - Screen id to look up
 * @returns {Object} Screen data object
 */
export function getScreenData( fnName, screenId ) {
	if( !m_screens[ screenId ] ) {
		const error = new Error( `${fnName}: Invalid screen id.` );
		error.code = "INVALID_SCREEN_ID";
		throw error;
	}
	return m_screens[ screenId ];
}

/**
 * Get all active screens
 * 
 * @returns {Array<Object>} Array of all screen data objects
 */
export function getAllScreensData() {
	const screens = [];
	for( const id in m_screens ) {
		screens.push( m_screens[ id ] );
	}
	return screens;
}


/***************************************************************************************************
 * Screen Command
 ***************************************************************************************************/


/**
 * Create a WebGL2 screen and set it as the active screen.
 *
 * Aspect format is width + splitter + height:
 * - x: exact pixel size (e.g. "320x200")
 * - e: extend to fill the container
 * - m: scale by integer multiples of the target size
 *
 * Offscreen screens require exact pixel dimensions (x).
 *
 * @param {Object} options - Screen options
 * @param {string} options.aspect - Aspect string (WxH, WeH, or WmH)
 * @param {string|HTMLElement} [options.container] - Container element or id
 * @param {boolean} [options.isOffscreen] - Create an offscreen screen
 * @param {Function} [options.resizeCallback] - Called on container resize
 * @param {Object} [options.parent] - Screen whose WebGL context an offscreen screen uses
 * @param {boolean} [options.noCss=false] - Let host CSS control layout; omit automatic style writes
 * @returns {Object} Screen API object with id and graphics commands
 */
function screen( options ) {
	if( options.noCss != null && typeof options.noCss !== "boolean" ) {
		const error = new TypeError( "screen: Parameter noCss must be a boolean." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	// Validate resize callback
	if( options.resizeCallback != null && !g_utils.isFunction( options.resizeCallback ) ) {
		const error = new TypeError( "screen: Parameter resizeCallback must be a function." );
		error.code = "INVALID_CALLBACK";
		throw error;
	}

	let parentData = null;
	let parentScreenId = null;
	let parentRenderContext = null;
	if( options.parent != null ) {
		if( !options.isOffscreen ) {
			const error = new TypeError(
				"screen: Parameter parent can only be used with an offscreen screen."
			);
			error.code = "INVALID_SCREEN_PARENT";
			throw error;
		}
		if(
			( typeof options.parent === "string" || typeof options.parent === "number" ) &&
			m_screens[ options.parent ]
		) {
			parentData = m_screens[ options.parent ];
		} else if(
			typeof options.parent !== "object" ||
			Object.getPrototypeOf( options.parent ) !== SCREEN_API_PROTO ||
			!m_screens[ options.parent.id ] ||
			m_screens[ options.parent.id ].api !== options.parent
		) {
			const error = new TypeError(
				"screen: Parameter parent must be an existing screen."
			);
			error.code = "INVALID_SCREEN_PARENT";
			throw error;
		} else {
			parentData = m_screens[ options.parent.id ];
		}
		parentScreenId = parentData.id;
		parentRenderContext = parentData.gl;
	}

	// Validate aspect - "Now Required"
	if( typeof options.aspect !== "string" || options.aspect === "" ) {
		const error = new Error( "screen: Parameter aspect must be a non-empty string." );
		error.code = "INVALID_ASPECT";
		throw error;
	}

	const screenData = {
		"id": m_nextScreenId,
		"isRemoved": false,
		"isOffscreen": !!options.isOffscreen,
		"noCss": options.noCss === true,
		"styleChanges": [],
		"resizeCallback": options.resizeCallback,
		"api": Object.create( SCREEN_API_PROTO ),
		"canvas": null,
		"width": null,
		"height": null,
		"container": null,
		"aspectData": null,
		"clientRect": null,
		"previousOffsetSize": null,
		"parentScreenId": parentScreenId,
		"parentRenderContext": parentRenderContext
	};

	screenData.api.id = screenData.id;

	const previousActive = m_activeScreenData;
	m_nextScreenId += 1;
	try {
		// Append additional items onto the screendata
		Object.assign( screenData, structuredClone( m_screenDataItems ) );

		// Append dynamic screendata items (items with dynamic defaults)
		for( const itemGetter of m_screenDataItemGetters ) {
			screenData[ itemGetter.name ] = structuredClone( itemGetter.fn() );
		}


		// Parse aspect ratio
		screenData.aspectData = parseAspect( options.aspect.toLowerCase() );
		if( !screenData.aspectData ) {
			const error = new Error( "screen: Parameter aspect is not valid." );
			error.code = "INVALID_ASPECT";
			throw error;
		}

		// If it's not a ratio validate the dimensions
		validateDimensions( screenData.aspectData.width, screenData.aspectData.height );

		// Setup options for offscreen canvas
		if( screenData.isOffscreen ) {

			// Create a shared canvas for offscreen screens
			if( !m_offscreenCanvas ) {
				m_offscreenCanvas = document.createElement( "canvas" );
			}

			// Create a mock canvas for offscreen screen
			screenData.canvas = {
				"isMock": true,
				"canvas": m_offscreenCanvas,
				"dataset": { "screenId": screenData.id },
				"width": screenData.aspectData.width,
				"height": screenData.aspectData.height,
				"style": {}
			};

			if( screenData.aspectData.splitter !== "x" ) {
				const error = new Error(
					"screen: You must use aspect ratio with e(x)act pixel dimensions for offscreen " +
					"screens. For example: 320x200 for width of 320 and height of 200 pixels."
				);
				error.code = "INVALID_OFFSCREEN_ASPECT";
				throw error;
			}
			setupOffscreenCanvasOptions( screenData );
			screenData.width = screenData.aspectData.width;
			screenData.height = screenData.aspectData.height;
		} else {

			// Create the canvas
			screenData.canvas = document.createElement( "canvas" );
			screenData.canvas.dataset.screenId = screenData.id;

			// Setup options for onscreen canvas
			screenData.canvas.tabIndex = 0;

			// Get the container element from the dom if it's available
			if( typeof options.container === "string" ) {
				screenData.container = document.getElementById( options.container );
			} else if( !options.container ) {
				screenData.container = document.body;
			} else {
				screenData.container = options.container;
			}

			if( !g_utils.isDomElement( screenData.container ) ) {
				const error = new TypeError(
					"screen: Invalid argument container. Container must be a DOM element or a string " +
					"id of a DOM element."
				);
				error.code = "INVALID_CONTAINER";
				throw error;
			}

			// Create a default canvas
			if( !screenData.noCss ) {
				setDefaultCanvasOptions( screenData );
			}

			// Append the canvas to the container
			screenData.container.appendChild( screenData.canvas );

			if( screenData.noCss ) {
				m_resizeObserver.observe( screenData.canvas );
			}

			// Add container to the global resize observer (only if not already observed)
			if(
				m_resizeObserver && screenData.container &&
				!m_observedContainers.has( screenData.container )
			) {
				m_resizeObserver.observe( screenData.container );
				m_observedContainers.add( screenData.container );
			}
		}

		// Map the canvas to the screenData
		m_screenCanvasMap.set( screenData.canvas, screenData );
		
		if( !screenData.isOffscreen ) {
			if( screenData.noCss ) {
				screenData.width = screenData.aspectData.width;
				screenData.height = screenData.aspectData.height;
				screenData.canvas.width = screenData.width;
				screenData.canvas.height = screenData.height;
			}
			resizeScreen( screenData, true );
		}

		// Assign screen to active screen
		m_activeScreenData = screenData;
		m_screens[ screenData.id ] = screenData;

		// Setup WebGL2 renderer
		g_renderer.createContext( screenData );

		// Call init functions for all modules that need initialization
		for( const fn of m_screenDataInitFunctions ) {
			fn( screenData );
		}

		screenData.styleChanges = null;
		return screenData.api;
	} catch( error ) {
		rollbackScreen( screenData, previousActive );
		throw error;
	}
}

/** Record automatic styles so a failed construction can restore only its own writes. */
function writeAutomaticStyle( screenData, element, property, value ) {
	let properties = [ property.replace( /[A-Z]/g, letter => "-" + letter.toLowerCase() ) ];
	if( property === "margin" || property === "padding" ) {
		properties = [ "top", "right", "bottom", "left" ].map( side => property + "-" + side );
	}
	let owners = m_styleOwners.get( element );
	if( !owners ) {
		owners = new Map();
		m_styleOwners.set( element, owners );
	}
	for( const name of properties ) {
		const change = {
			"element": element, "name": name,
			"value": element.style.getPropertyValue( name ),
			"priority": element.style.getPropertyPriority( name ),
			"owner": owners.get( name ),
			"hadStyle": element.hasAttribute( "style" )
		};
		element.style.setProperty( name, value );
		change.written = element.style.getPropertyValue( name );
		owners.set( name, screenData.id );
		screenData.styleChanges?.push( change );
	}
}

/** Undo construction without assuming the renderer or module initializers completed. */
function rollbackScreen( screenData, previousActive ) {
	screenData.isRemoved = true;
	screenData.isRenderScheduled = false;
	try {
		flushScreenTextureUsers( screenData );
	} catch( error ) {
		// Preserve the original failure even if a partial renderer cannot flush its users.
	}
	for( const fn of m_screenDataPreCleanupFunctions ) {
		try {
			fn( screenData );
		} catch( error ) {
			// Preserve the construction error while continuing independent cleanup.
		}
	}
	for( const fn of m_screenDataCleanupFunctions ) {
		try {
			fn( screenData );
		} catch( error ) {
			// A partially initialized plugin must not prevent core rollback.
		}
	}
	m_screenCanvasMap.delete( screenData.canvas );
	delete m_screens[ screenData.id ];
	if( screenData.canvas?.parentElement ) {
		screenData.canvas.remove();
	}
	if( screenData.noCss && !screenData.isOffscreen && screenData.canvas ) {
		m_resizeObserver.unobserve( screenData.canvas );
	}
	if( screenData.container && !Object.values( m_screens ).some(
		other => other.container === screenData.container
	) ) {
		m_resizeObserver.unobserve( screenData.container );
		m_observedContainers.delete( screenData.container );
	}
	for( const change of screenData.styleChanges.reverse() ) {
		const { element, name } = change;
		const owners = m_styleOwners.get( element );
		if(
			owners.get( name ) === screenData.id &&
			element.style.getPropertyValue( name ) === change.written
		) {
			if( change.value ) {
				element.style.setProperty( name, change.value, change.priority );
			} else {
				element.style.removeProperty( name );
			}
			owners.set( name, change.owner );
			if( !change.hadStyle && element.style.length === 0 ) {
				element.removeAttribute( "style" );
			}
		}
	}
	screenData.styleChanges = null;
	activateScreen( previousActive );
}

function parseAspect( aspect ) {
	const match = aspect.replaceAll( " ", "" ).match( /^(\d+)(x|e|m)(\d+)$/ );
	if( !match ) {
		return null;
	}

	const width = Number( match[ 1 ] );
	const splitter = match[ 2 ];
	const height = Number( match[ 3 ] );

	if( isNaN( width ) || width === 0 || isNaN( height ) || height === 0 ) {
		return null;
	}

	return {
		"width": width,
		"height": height,
		"splitter": splitter,
		"isFixedSize": splitter !== "e"
	};
}

function setupOffscreenCanvasOptions( screenData ) {
	screenData.canvas.width = screenData.aspectData.width;
	screenData.canvas.height = screenData.aspectData.height;
	screenData.container = null;
	screenData.isOffscreen = true;
	screenData.resizeCallback = null;
	screenData.previousOffsetSize = null;
}

function setDefaultCanvasOptions( screenData ) {
	writeAutomaticStyle( screenData, screenData.canvas, "outline", "none" );
	writeAutomaticStyle( screenData, screenData.canvas, "backgroundColor", "black" );
	writeAutomaticStyle( screenData, screenData.canvas, "position", "absolute" );
	writeAutomaticStyle( screenData, screenData.canvas, "imageRendering", "pixelated" );

	// Check if the container is document.body
	if( screenData.container === document.body ) {
		writeAutomaticStyle( screenData, document.documentElement, "height", "100%" );
		writeAutomaticStyle( screenData, document.documentElement, "margin", "0" );
		writeAutomaticStyle( screenData, document.documentElement, "padding", "0" );
		writeAutomaticStyle( screenData, document.body, "height", "100%" );
		writeAutomaticStyle( screenData, document.body, "margin", "0" );
		writeAutomaticStyle( screenData, document.body, "padding", "0" );
		writeAutomaticStyle( screenData, screenData.canvas, "left", "0" );
		writeAutomaticStyle( screenData, screenData.canvas, "top", "0" );
	}

	// No scrolling within a container as canvases fit to size of container and are meant to 
	// overlap. If scrolling is required use an outer container that scrolls.
	writeAutomaticStyle( screenData, screenData.container, "overflow", "hidden" );

	// Make sure container is not blank
	if( screenData.container.offsetHeight === 0 ) {
		writeAutomaticStyle( screenData, screenData.container, "height", "200px" );
	}
}

function validateDimensions( width, height ) {
	if( width <= 0 || height <= 0 ) {
		const error = new Error( "screen: Canvas dimensions must be positive." );
		error.code = "INVALID_DIMENSIONS";
		throw error;
	}
	if( width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION ) {
		const error = new Error(
			`screen: Canvas dimensions exceed maximum of ${MAX_CANVAS_DIMENSION}px.`
		);
		error.code = "DIMENSION_TOO_LARGE";
		throw error;
	}
}


/**************************************************************************************************
 * Other External API Commands
 **************************************************************************************************/


/**
 * Remove every screen.
 *
 * @returns {void}
 */
function removeAllScreens() {
	const allScreenDatas = getAllScreensData();
	for( const screenData of allScreenDatas ) {
		removeScreen( screenData );
	}
}

/**
 * Tear down one screen and free its resources.
 *
 * Runs cleanup hooks, stubs API methods, unobserves the container when
 * unused, and clears screenData references.
 *
 * @param {Object} screenData - Screen data object to remove
 * @returns {void}
 */
function removeScreen( screenData ) {

	// Keep this lifecycle flag outside the registered data cleared during cleanup.
	screenData.isRemoved = true;

	// Get the id for reference
	const screenId = screenData.id;
	flushScreenTextureUsers( screenData );

	// Invalidate references held by other screens before GPU resources are destroyed
	for( const fn of m_screenDataPreCleanupFunctions ) {
		fn( screenData );
	}

	// Call cleanup functions for all modules that need cleanup
	for( const fn of m_screenDataCleanupFunctions ) {
		fn( screenData );
	}

	// Replace all commands from screen object
	for( const key in screenData.api ) {
		if( typeof screenData.api[ key ] === "function" ) {

			// Use string replacement to avoid capturing screenData in closure
			screenData.api[ key ] = () => {
				const error = new TypeError( 
					`Cannot call ${key}() on removed screen (id: ${screenId}). ` +
					`The screen has been removed from the page.`
				);
				error.code = "DELETED_METHOD";
				throw error;
			};
		}
	}

	// Remove from the screenCanvasMap
	m_screenCanvasMap.delete( screenData.canvas );

	if( screenData.noCss && !screenData.isOffscreen ) {
		m_resizeObserver.unobserve( screenData.canvas );
	}

	// Remove the canvas from the page
	if( screenData.canvas && screenData.canvas.parentElement ) {
		screenData.canvas.parentElement.removeChild( screenData.canvas );
	}

	// Unobserve the container from the global resize observer
	if( screenData.container && m_observedContainers.has( screenData.container ) ) {
		
		// Check if any other screens are using this container
		let hasOtherScreens = false;
		for( const id in m_screens ) {
			const otherScreen = m_screens[ id ];
			if( otherScreen !== screenData && otherScreen.container === screenData.container ) {
				hasOtherScreens = true;
				break;
			}
		}
		
		// Only unobserve if no other screens are using this container
		if( !hasOtherScreens ) {
			m_resizeObserver.unobserve( screenData.container );
			m_observedContainers.delete( screenData.container );
		}
	}

	// Clean up all references to prevent memory leaks
	screenData.canvas = null;
	screenData.commands = null;
	screenData.resizeCallback = null;
	screenData.container = null;
	screenData.aspectData = null;
	screenData.clientRect = null;
	screenData.previousOffsetSize = null;
	screenData.parentScreenId = null;
	screenData.parentRenderContext = null;

	// Remove additional screenData items
	for( const i in m_screenDataItems ) {
		screenData[ i ] = null;
	}
	for( const getter of m_screenDataItemGetters ) {
		screenData[ getter.name ] = null;
	}

	// If the current screen is the active screen then set to next screen available
	if( screenData === m_activeScreenData ) {
		let nextScreen = null;
		for( const i in m_screens ) {
			if( m_screens[ i ] !== screenData ) {
				nextScreen = m_screens[ i ];
				break;
			}
		}
		activateScreen( nextScreen );
	}

	// Delete the screen from the screens container
	delete m_screens[ screenId ];
}

/**
 * Synchronize the active screen and global graphics bindings.
 *
 * @param {Object|null} screenData - Initialized screen data, or null when no screens remain
 * @returns {void}
 */
function activateScreen( screenData ) {
	m_activeScreenData = screenData;
	g_graphics.buildApi( screenData );
}

/**
 * Set the active screen from an id or screen API object.
 *
 * Always rebuilds graphics bindings, including when reselecting the active screen.
 *
 * @param {Object} options - Command options
 * @param {number|Object} options.screen - Screen id or screen API object
 * @returns {void}
 */
function setScreen( options ) {
	const screenObj = options.screen;
	let screenId;

	if( Number.isInteger( screenObj ) ) {
		screenId = screenObj;
	} else if( screenObj && Number.isInteger( screenObj.id ) ) {
		screenId = screenObj.id;
	}
	if( !m_screens[ screenId ] ) {
		const error = new Error( "screen: Invalid screen." );
		error.code = "INVALID_SCREEN";
		throw error;
	}

	activateScreen( m_screens[ screenId ] );
}

/**
 * Get a screen API object by screen id.
 *
 * @param {Object} options - Command options
 * @param {number} options.screenId - Screen id to retrieve
 * @returns {Object} Screen API object
 */
function getScreen( options ) {
	const screenId = g_utils.getInt( options.screenId, null );
	if( screenId === null || screenId < 0 ) {
		const error = new Error( "screen: Invalid screen id." );
		error.code = "INVALID_SCREEN_ID";
		throw error;
	}
	const screen = m_screens[ screenId ];
	if( !screen ) {
		const error = new Error( `screen: Screen "${screenId}" not found.` );
		error.code = "SCREEN_NOT_FOUND";
		throw error;
	}
	return screen.api;
}

/**
 * Get all screen API objects.
 *
 * @returns {Array<Object>} Array of screen API objects
 */
function getAllScreens() {
	const screens = [];
	for( const id in m_screens ) {
		screens.push( m_screens[ id ].api );
	}
	return screens;
}

/**
 * Get the logical framebuffer width of the screen.
 *
 * @param {Object} screenData - Screen data object
 * @returns {number} Screen width in pixels
 */
function widthCmd( screenData ) {
	return screenData.view.width;
}

/**
 * Get the logical framebuffer height of the screen.
 *
 * @param {Object} screenData - Screen data object
 * @returns {number} Screen height in pixels
 */
function heightCmd( screenData ) {
	return screenData.view.height;
}

/**
 * Get the HTML canvas for the screen.
 *
 * Offscreen screens share one canvas used to draw to textures. A warning
 * is logged because changes to that canvas can affect other screens.
 *
 * @param {Object} screenData - Screen data object
 * @returns {HTMLCanvasElement} Canvas element for the screen
 */
function canvasCmd( screenData ) {
	if( screenData.isOffscreen ) {
		console.warn(
			"Offscreen screens use a shared canvas that draws to textures to simulate an " +
			"offscreen canvas. The canvas returned is that shared canvas. Proceed with caution " +
			"changes to this canvas could cause unexpected results." 
		);
		return screenData.canvas.canvas;
	}
	return screenData.canvas;
}


/***************************************************************************************************
 * Resize Screen
 ***************************************************************************************************/


/**
 * True when the screen can use existing screen-manager sizing and presentation.
 *
 * Offscreen, hidden, and detached canvases are ineligible. forcePresent must
 * not bypass this check.
 *
 * @param {Object} screenData - Screen data object
 * @returns {boolean} True if sizing and presentation may run
 */
function canSizeAndPresent( screenData ) {
	if( screenData.isOffscreen ) {
		return false;
	}
	if( !screenData.canvas || ( !screenData.noCss && screenData.canvas.offsetParent === null ) ) {
		return false;
	}
	return true;
}

/**
 * Flush pending batches and present if the screen is currently eligible.
 *
 * Does not resize or rewrite canvas dimensions.
 *
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function presentCurrentScreen( screenData ) {
	if( !canSizeAndPresent( screenData ) ) {
		return;
	}
	g_renderer.flushBatches( screenData );
	g_renderer.displayToCanvas( screenData );
}

/**
 * Recalculate CSS, logical, and backing size. Resize FBOs and/or present.
 *
 * @param {Object} screenData - Screen data object
 * @param {boolean} [forcePresent=false] - Present even if sizes did not change
 * @returns {void}
 */
export function refreshScreenSize( screenData, forcePresent ) {
	if( forcePresent == null ) {
		forcePresent = false;
	}

	if( !canSizeAndPresent( screenData ) ) {
		return;
	}

	const flags = applyScreenSizing( screenData );
	applyResizeConsequences( screenData, flags, forcePresent );
}

/**
 * Resize an offscreen screen to exact logical pixel dimensions.
 *
 * This is exposed through the plugin API for container-style plugins. Onscreen screens continue
 * to be sized exclusively from their configured aspect and DOM container.
 *
 * @param {Object} screenData - Offscreen screen data object
 * @param {number} width - New logical width
 * @param {number} height - New logical height
 * @returns {void}
 */
export function resizeOffscreenScreen( screenData, width, height ) {
	if( !screenData || !screenData.isOffscreen ) {
		const error = new TypeError( "resizeOffscreenScreen: Screen must be offscreen." );
		error.code = "INVALID_OFFSCREEN_SCREEN";
		throw error;
	}
	if( !Number.isInteger( width ) || !Number.isInteger( height ) ) {
		const error = new TypeError(
			"resizeOffscreenScreen: Width and height must be integers."
		);
		error.code = "INVALID_SCREEN_DIMENSIONS";
		throw error;
	}
	validateDimensions( width, height );
	if( screenData.width === width && screenData.height === height ) {
		return;
	}

	flushScreenTextureUsers( screenData );
	const oldWidth = screenData.width;
	const oldHeight = screenData.height;
	screenData.width = width;
	screenData.height = height;
	screenData.canvas.width = width;
	screenData.canvas.height = height;
	screenData.aspectData.width = width;
	screenData.aspectData.height = height;
	g_renderer.resizeScreen( screenData, oldWidth, oldHeight );
	g_view.onScreenResize( screenData );
}

/**
 * Finish queued same-context draws before a screen texture changes or is deleted.
 *
 * @param {Object} sourceData - Screen whose framebuffer texture is changing
 * @returns {void}
 */
function flushScreenTextureUsers( sourceData ) {
	if( !sourceData.fboTexture ) {
		return;
	}
	for( const screenData of getAllScreensData() ) {
		if( screenData !== sourceData ) {
			g_renderer.deleteWebGL2Texture( screenData, sourceData.canvas );
		}
		if(
			screenData !== sourceData && screenData.gl === sourceData.gl &&
			screenData.batchInfo?.textureBatchSet.has( sourceData.fboTexture )
		) {
			g_renderer.flushBatches( screenData );
		}
	}
}

function resizeScreen( screenData, isInit ) {
	if( !canSizeAndPresent( screenData ) ) {
		return;
	}
	const flags = applyScreenSizing( screenData );
	if( !isInit ) {
		applyResizeConsequences( screenData, flags, false );
	}
}

/**
 * Apply fit/aspect sizing and update CSS layout. Does not resize FBOs,
 * invoke resizeCallback, or present.
 *
 * @param {Object} screenData - Screen data object
 * @returns {{ logicalChanged: boolean, backingChanged: boolean,
 * 	oldWidth: number|null, oldHeight: number|null,
 * 	fromSize: Object|null, toSize: Object }} Sizing result
 */
function applyScreenSizing( screenData ) {
	const fromSize = screenData.previousOffsetSize;
	const size = getSize( screenData.container );
	const flags = setCanvasSize( screenData, size.width, size.height );

	screenData.clientRect = screenData.canvas.getBoundingClientRect();

	const toSize = {
		"width": screenData.canvas.offsetWidth,
		"height": screenData.canvas.offsetHeight
	};

	screenData.previousOffsetSize = toSize;
	return {
		"logicalChanged": flags.logicalChanged,
		"backingChanged": flags.backingChanged,
		"oldWidth": flags.oldWidth,
		"oldHeight": flags.oldHeight,
		"fromSize": fromSize,
		"toSize": toSize
	};
}

/**
 * Apply FBO resize, resize callback, optional flush, and a single present.
 *
 * @param {Object} screenData - Screen data object
 * @param {{ logicalChanged: boolean, backingChanged: boolean,
 * 	oldWidth: number|null, oldHeight: number|null,
 * 	fromSize: Object|null, toSize: Object }} flags - Sizing result
 * @param {boolean} forcePresent - Present even if sizes did not change
 * @returns {void}
 */
function applyResizeConsequences( screenData, flags, forcePresent ) {
	if( flags.logicalChanged ) {
		flushScreenTextureUsers( screenData );
		g_renderer.resizeScreen( screenData, flags.oldWidth, flags.oldHeight );
		g_view.onScreenResize( screenData );
	}

	let callbackRan = false;
	const fromSize = flags.fromSize;
	const toSize = flags.toSize;
	if(
		screenData.resizeCallback &&
		fromSize !== null &&
		( fromSize.width !== toSize.width || fromSize.height !== toSize.height )
	) {
		screenData.resizeCallback( screenData.api, fromSize, toSize );
		callbackRan = true;
	}

	if( callbackRan ) {
		g_renderer.flushBatches( screenData );
	}

	if(
		flags.logicalChanged || flags.backingChanged || forcePresent || callbackRan
	) {
		g_renderer.displayToCanvas( screenData );
	}
}

function setCanvasSize( screenData, maxWidth, maxHeight ) {
	const aspectData = screenData.aspectData;
	const canvas = screenData.canvas;
	let width = aspectData.width;
	let height = aspectData.height;
	const splitter = aspectData.splitter;
	let newCssWidth, newCssHeight;

	const oldWidth = screenData.width;
	const oldHeight = screenData.height;
	const oldBackingWidth = canvas.width;
	const oldBackingHeight = canvas.height;

	if( screenData.noCss ) {
		const bounds = getCanvasContentRect( canvas );
		if( !( maxWidth > 0 && maxHeight > 0 && bounds.width > 0 && bounds.height > 0 ) ) {
			return { "logicalChanged": false, "backingChanged": false,
				"oldWidth": oldWidth, "oldHeight": oldHeight };
		}
	}

	// If set size to multiple or extend
	if( splitter === "m" || splitter === "e" ) {
		const factorX = Math.floor( maxWidth / width );
		const factorY = Math.floor( maxHeight / height );
		let factor = factorX > factorY ? factorY : factorX;
		if( factor < 1 ) {
			factor = 1;
		}
		newCssWidth = width * factor;
		newCssHeight = height * factor;

		// Extending the canvas to match container size
		if( splitter === "e" ) {
			width = Math.floor( maxWidth / factor );
			height = Math.floor( maxHeight / factor );
			newCssWidth = width * factor;
			newCssHeight = height * factor;
		}
	} else {

		// Calculate the screen ratios
		const ratio1 = height / width;
		const ratio2 = width / height;
		newCssWidth = maxHeight * ratio2;
		newCssHeight = maxWidth * ratio1;

		// Calculate the best fit
		if( newCssWidth > maxWidth ) {
			newCssWidth = maxWidth;
			newCssHeight = newCssWidth * ratio1;
		} else {
			newCssHeight = maxHeight;
		}
	}

	const logicalChanged = oldWidth !== width || oldHeight !== height;
	screenData.width = width;
	screenData.height = height;

	// CSS presentation size (DOM layout only)
	if( !screenData.noCss ) {
		canvas.style.width = Math.floor( newCssWidth ) + "px";
		canvas.style.height = Math.floor( newCssHeight ) + "px";

		canvas.style.marginLeft = Math.floor( ( maxWidth - newCssWidth ) / 2 ) + "px";
		canvas.style.marginTop = Math.floor( ( maxHeight - newCssHeight ) / 2 ) + "px";
	}

	let desiredBackingWidth;
	let desiredBackingHeight;
	if( screenData.renderToDisplaySize ) {
		if( screenData.noCss ) {
			const bounds = getCanvasContentRect( canvas );

			// CSS layout pixels exclude transforms, matching ResizeObserver and avoiding an
			// intrinsic-size feedback loop on canvases styled only with transform: scale().
			newCssWidth = Math.max( 1, bounds.cssWidth );
			newCssHeight = Math.max( 1, bounds.cssHeight );
		}
		desiredBackingWidth = Math.min(
			Math.floor( newCssWidth ), MAX_CANVAS_DIMENSION
		);
		desiredBackingHeight = Math.min(
			Math.floor( newCssHeight ), MAX_CANVAS_DIMENSION
		);
	} else {
		desiredBackingWidth = Math.min( width, MAX_CANVAS_DIMENSION );
		desiredBackingHeight = Math.min( height, MAX_CANVAS_DIMENSION );
	}

	const backingChanged = (
		oldBackingWidth !== desiredBackingWidth ||
		oldBackingHeight !== desiredBackingHeight
	);

	if( canvas.width !== desiredBackingWidth ) {
		canvas.width = desiredBackingWidth;
	}
	if( canvas.height !== desiredBackingHeight ) {
		canvas.height = desiredBackingHeight;
	}

	return {
		"logicalChanged": logicalChanged,
		"backingChanged": backingChanged,
		"oldWidth": oldWidth,
		"oldHeight": oldHeight
	};
}

function getSize( element ) {
	return {
		"width": element.offsetWidth || element.clientWidth || element.width,
		"height": element.offsetHeight || element.clientHeight || element.height
	};
}
