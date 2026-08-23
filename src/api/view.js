/**
 * Pi.js - View Module
 *
 * Bounded local drawing coordinate system and clip stack for the active screen.
 * A batch must never contain geometry from more than one view state. Every
 * view-stack change flushes pending batches before mutating view state.
 *
 * @module api/view
 */

"use strict";

import * as g_utils from "../core/utils.js";
import * as g_commands from "../core/commands.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_renderer from "../renderer/renderer.js";
import { updatePrintCursorDimensions } from "../text/print.js";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize view module
 *
 * @param {Object} api - The main Pi.js API object
 * @returns {void}
 */
export function init( api ) {
	g_screenManager.addScreenDataItem( "view", {
		"stack": [],
		"originX": 0,
		"originY": 0,
		"width": 0,
		"height": 0,
		"clipX": 0,
		"clipY": 0,
		"clipWidth": 0,
		"clipHeight": 0
	} );

	g_screenManager.addScreenInitFunction( ( screenData ) => {
		syncFullScreenCache( screenData );
		afterViewLayoutChange( screenData );
	} );
	registerCommands();
}


/***************************************************************************************************
 * Command Registration
 ***************************************************************************************************/


/**
 * Register view commands
 *
 * @returns {void}
 */
function registerCommands() {
	g_commands.addCommand( "view", viewCmd, true, [ "x", "y", "width", "height" ] );
	g_commands.addCommand( "pushView", pushViewCmd, true, [ "x", "y", "width", "height" ] );
	g_commands.addCommand( "popView", popViewCmd, true, [] );
	g_commands.addCommand( "viewToScreen", viewToScreenCmd, true, [ "x", "y" ] );
	g_commands.addCommand( "screenToView", screenToViewCmd, true, [ "x", "y" ] );
}


/***************************************************************************************************
 * Rectangle Helpers
 ***************************************************************************************************/


/**
 * Intersect two half-open rectangles.
 *
 * @param {number} aX - First rect left
 * @param {number} aY - First rect top
 * @param {number} aW - First rect width
 * @param {number} aH - First rect height
 * @param {number} bX - Second rect left
 * @param {number} bY - Second rect top
 * @param {number} bW - Second rect width
 * @param {number} bH - Second rect height
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function intersectRects( aX, aY, aW, aH, bX, bY, bW, bH ) {
	const left = Math.max( aX, bX );
	const top = Math.max( aY, bY );
	const right = Math.min( aX + aW, bX + bW );
	const bottom = Math.min( aY + aH, bY + bH );
	const width = Math.max( 0, right - left );
	const height = Math.max( 0, bottom - top );

	return {
		"x": left,
		"y": top,
		"width": width,
		"height": height
	};
}

/**
 * True if the half-open rectangle contains the point.
 *
 * @param {number} x - Point x
 * @param {number} y - Point y
 * @param {number} rectX - Rect left
 * @param {number} rectY - Rect top
 * @param {number} rectW - Rect width
 * @param {number} rectH - Rect height
 * @returns {boolean}
 */
export function containsPoint( x, y, rectX, rectY, rectW, rectH ) {
	if( x < rectX || y < rectY ) {
		return false;
	}
	if( x >= rectX + rectW || y >= rectY + rectH ) {
		return false;
	}
	return true;
}

/**
 * Convert local coordinates to physical screen/FBO coordinates.
 *
 * @param {Object} screenData - Screen data object
 * @param {number} x - Local x
 * @param {number} y - Local y
 * @returns {{ x: number, y: number }}
 */
export function toScreen( screenData, x, y ) {
	return {
		"x": x + screenData.view.originX,
		"y": y + screenData.view.originY
	};
}

/**
 * Copy the current view cache for deferred operations.
 *
 * @param {Object} screenData - Screen data object
 * @returns {Object} Snapshot of origin, size, and clip
 */
export function snapshotView( screenData ) {
	const view = screenData.view;
	return {
		"originX": view.originX,
		"originY": view.originY,
		"width": view.width,
		"height": view.height,
		"clipX": view.clipX,
		"clipY": view.clipY,
		"clipWidth": view.clipWidth,
		"clipHeight": view.clipHeight
	};
}

/**
 * True if the physical point lies inside the effective clip.
 *
 * @param {Object} viewState - View cache or snapshot
 * @param {number} x - Physical x
 * @param {number} y - Physical y
 * @returns {boolean}
 */
export function isInsideClip( viewState, x, y ) {
	return containsPoint(
		x, y,
		viewState.clipX, viewState.clipY,
		viewState.clipWidth, viewState.clipHeight
	);
}


/***************************************************************************************************
 * Cache and Stack
 ***************************************************************************************************/


/**
 * Set the view cache to the full logical framebuffer.
 *
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function syncFullScreenCache( screenData ) {
	const view = screenData.view;
	view.originX = 0;
	view.originY = 0;
	view.width = screenData.width;
	view.height = screenData.height;
	view.clipX = 0;
	view.clipY = 0;
	view.clipWidth = screenData.width;
	view.clipHeight = screenData.height;
}

/**
 * Rebuild derived origin/clip from requested local stack entries.
 *
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function recomputeViewCache( screenData ) {
	const view = screenData.view;
	const stack = view.stack;

	if( stack.length === 0 ) {
		syncFullScreenCache( screenData );
		return;
	}

	let originX = 0;
	let originY = 0;
	let clipX = 0;
	let clipY = 0;
	let clipWidth = screenData.width;
	let clipHeight = screenData.height;

	for( let i = 0; i < stack.length; i++ ) {
		const entry = stack[ i ];
		originX = originX + entry.localX;
		originY = originY + entry.localY;

		const clip = intersectRects(
			clipX, clipY, clipWidth, clipHeight,
			originX, originY, entry.width, entry.height
		);
		clipX = clip.x;
		clipY = clip.y;
		clipWidth = clip.width;
		clipHeight = clip.height;
	}

	const top = stack[ stack.length - 1 ];
	view.originX = originX;
	view.originY = originY;
	view.width = top.width;
	view.height = top.height;
	view.clipX = clipX;
	view.clipY = clipY;
	view.clipWidth = clipWidth;
	view.clipHeight = clipHeight;
}

/**
 * Normalize the stored print cursor into the current local view range.
 *
 * Insertion points at exactly width/height remain valid.
 *
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function normalizeCursor( screenData ) {
	const printCursor = screenData.printCursor;
	if( !printCursor ) {
		return;
	}

	const view = screenData.view;
	const maxX = view.width;
	const maxY = view.height;

	if( printCursor.x < 0 ) {
		printCursor.x = 0;
	} else if( printCursor.x > maxX ) {
		printCursor.x = maxX;
	}

	if( printCursor.y < 0 ) {
		printCursor.y = 0;
	} else if( printCursor.y > maxY ) {
		printCursor.y = maxY;
	}
}

/**
 * Refresh print cell cols/rows and normalize the cursor.
 *
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
function afterViewLayoutChange( screenData ) {
	updatePrintCursorDimensions( screenData );
	normalizeCursor( screenData );
}

/**
 * Recompute views after a logical FBO resize.
 *
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function onScreenResize( screenData ) {
	recomputeViewCache( screenData );
	afterViewLayoutChange( screenData );
}

/**
 * Flush pending batches, then apply a view-stack mutation.
 *
 * @param {Object} screenData - Screen data object
 * @param {Function} mutateFn - Mutates the stack
 * @returns {void}
 */
function flushThenMutate( screenData, mutateFn ) {
	g_renderer.flushBatches( screenData );
	mutateFn();
	recomputeViewCache( screenData );
	afterViewLayoutChange( screenData );
}

/**
 * Parse and validate a local view rectangle.
 *
 * @param {string} fnName - Command name for errors
 * @param {Object} options - x, y, width, height
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
function parseViewRect( fnName, options ) {
	const x = g_utils.getInt( options.x, null );
	const y = g_utils.getInt( options.y, null );
	const width = g_utils.getInt( options.width, null );
	const height = g_utils.getInt( options.height, null );

	if( x === null || y === null || width === null || height === null ) {
		const error = new TypeError(
			`${fnName}: Parameters x, y, width, and height must be integers.`
		);
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( width < 0 || height < 0 ) {
		const error = new RangeError(
			`${fnName}: Parameters width and height must be 0 or greater.`
		);
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	return {
		"x": x,
		"y": y,
		"width": width,
		"height": height
	};
}


/***************************************************************************************************
 * External API Commands
 ***************************************************************************************************/


/**
 * Set or reset the user-facing root view.
 *
 * @param {Object} screenData - Screen data object
 * @param {Object} options - x, y, width, height or all null to reset
 * @returns {void}
 */
function viewCmd( screenData, options ) {
	const hasAny = (
		options.x !== null || options.y !== null ||
		options.width !== null || options.height !== null
	);

	if( !hasAny ) {
		flushThenMutate( screenData, () => {
			screenData.view.stack = [];
		} );
		return;
	}

	const rect = parseViewRect( "view", options );
	const printCursor = screenData.printCursor;
	let savedX = 0;
	let savedY = 0;
	if( printCursor ) {
		savedX = printCursor.x;
		savedY = printCursor.y;
	}

	flushThenMutate( screenData, () => {
		screenData.view.stack = [
			{
				"localX": rect.x,
				"localY": rect.y,
				"width": rect.width,
				"height": rect.height,
				"savedCursorX": savedX,
				"savedCursorY": savedY
			}
		];
	} );
}

/**
 * Push a child view relative to the current view.
 *
 * @param {Object} screenData - Screen data object
 * @param {Object} options - x, y, width, height
 * @returns {void}
 */
function pushViewCmd( screenData, options ) {
	const rect = parseViewRect( "pushView", options );
	const printCursor = screenData.printCursor;
	let savedX = 0;
	let savedY = 0;
	if( printCursor ) {
		savedX = printCursor.x;
		savedY = printCursor.y;
	}

	flushThenMutate( screenData, () => {
		screenData.view.stack.push( {
			"localX": rect.x,
			"localY": rect.y,
			"width": rect.width,
			"height": rect.height,
			"savedCursorX": savedX,
			"savedCursorY": savedY
		} );
		if( printCursor ) {
			printCursor.x = 0;
			printCursor.y = 0;
		}
	} );
}

/**
 * Pop the current child view and restore the parent cursor.
 *
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
function popViewCmd( screenData ) {
	if( screenData.view.stack.length === 0 ) {
		const error = new Error( "popView: No view to pop." );
		error.code = "VIEW_STACK_EMPTY";
		throw error;
	}

	flushThenMutate( screenData, () => {
		const popped = screenData.view.stack.pop();
		const printCursor = screenData.printCursor;
		if( printCursor ) {
			printCursor.x = popped.savedCursorX;
			printCursor.y = popped.savedCursorY;
		}
	} );
}

/**
 * Convert a local point to screen/FBO coordinates using the logical origin.
 *
 * @param {Object} screenData - Screen data object
 * @param {Object} options - x, y
 * @returns {{ x: number, y: number }}
 */
function viewToScreenCmd( screenData, options ) {
	const x = g_utils.getInt( options.x, null );
	const y = g_utils.getInt( options.y, null );
	if( x === null || y === null ) {
		const error = new TypeError( "viewToScreen: Parameters x and y must be integers." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}
	return toScreen( screenData, x, y );
}

/**
 * Convert a screen/FBO point to local view coordinates using the logical origin.
 *
 * @param {Object} screenData - Screen data object
 * @param {Object} options - x, y
 * @returns {{ x: number, y: number }}
 */
function screenToViewCmd( screenData, options ) {
	const x = g_utils.getInt( options.x, null );
	const y = g_utils.getInt( options.y, null );
	if( x === null || y === null ) {
		const error = new TypeError( "screenToView: Parameters x and y must be integers." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}
	return {
		"x": x - screenData.view.originX,
		"y": y - screenData.view.originY
	};
}
