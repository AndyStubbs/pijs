/**
 * Pointer Events routing for the Pointer plugin. Each canvas gets one set of pointer listeners
 * while mouse or touch tracking runs on its screen. Mouse and pen pointers go to the mouse
 * handlers and touch pointers to the touch handlers, each only while that tracking runs. A press
 * that a handler accepts captures its pointer, so its moves and its release arrive wherever they
 * happen.
 *
 * @module plugins/pointer/listeners
 */

"use strict";

const EVENT_TYPES = [ "pointerdown", "pointermove", "pointerup", "pointercancel" ];

// Handlers by kind: { pointerdown, pointermove, pointerup, pointercancel }, each called with
// ( screenData, event ); pointerdown returns whether it accepted the press
const m_handlers = {};

// The kinds each screen tracks, "mouse" and "touch"
const m_tracked = new WeakMap();
let m_getScreenData = null;

/**
 * Register the handlers of one kind of pointer.
 *
 * @param {string} kind - `"mouse"` for mouse and pen pointers, or `"touch"`.
 * @param {Object} handlers - One function per pointer event type.
 * @param {Function} getScreenData - Returns the screen of an event's target, or null.
 * @returns {void}
 */
export function setHandlers( kind, handlers, getScreenData ) {
	m_handlers[ kind ] = handlers;
	m_getScreenData = getScreenData;
}

/**
 * Start routing one kind of pointer on a screen, adding the canvas listeners if none were.
 *
 * @param {Object} screenData - Screen state.
 * @param {string} kind - `"mouse"` or `"touch"`.
 * @returns {void}
 */
export function track( screenData, kind ) {
	let kinds = m_tracked.get( screenData );
	if( !kinds ) {
		kinds = new Set();
		m_tracked.set( screenData, kinds );
		for( const type of EVENT_TYPES ) {
			screenData.canvas.addEventListener( type, onPointerEvent );
		}
	}
	kinds.add( kind );
}

/**
 * Stop routing one kind of pointer on a screen, removing the canvas listeners with the last.
 *
 * @param {Object} screenData - Screen state.
 * @param {string} kind - `"mouse"` or `"touch"`.
 * @returns {void}
 */
export function untrack( screenData, kind ) {
	const kinds = m_tracked.get( screenData );
	if( !kinds ) {
		return;
	}
	kinds.delete( kind );
	if( kinds.size === 0 ) {
		m_tracked.delete( screenData );
		for( const type of EVENT_TYPES ) {
			screenData.canvas.removeEventListener( type, onPointerEvent );
		}
	}
}

/**
 * Route a pointer event to the handlers of its kind, and capture an accepted press.
 *
 * @param {PointerEvent} e - Pointer event on a canvas.
 * @returns {void}
 */
function onPointerEvent( e ) {
	const screenData = m_getScreenData( e );
	if( !screenData ) {
		return;
	}
	let kind = "mouse";
	if( e.pointerType === "touch" ) {
		kind = "touch";
	}
	const kinds = m_tracked.get( screenData );
	if( !kinds || !kinds.has( kind ) ) {
		return;
	}
	const isAccepted = m_handlers[ kind ][ e.type ]( screenData, e );
	if( e.type === "pointerdown" && isAccepted ) {
		capturePointer( screenData.canvas, e.pointerId );
	}
}

/**
 * Capture a pointer on a canvas. The browser refuses pointers it does not track, such as those
 * of synthetic events; their moves and release then arrive only over the canvas.
 *
 * @param {HTMLCanvasElement} canvas - The pressed canvas.
 * @param {number} pointerId - The pressed pointer.
 * @returns {void}
 */
function capturePointer( canvas, pointerId ) {
	try {
		canvas.setPointerCapture( pointerId );
	} catch( error ) {

		// The pointer stays uncaptured; its events still arrive while it is over the canvas
	}
}
