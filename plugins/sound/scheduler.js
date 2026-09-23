/**
 * Pi.js - Sound Scheduler Module (Plugin)
 *
 * Lookahead scheduler for delayed requests. Pending items cost a small record; their nodes
 * are created only when their start time enters the lookahead window.
 *
 * @module plugins/sound/scheduler
 */

"use strict";

import * as g_context from "./context.js";

// Lookahead windows in seconds; hidden tabs throttle timers, so their window is larger
export const BASE_WINDOW = 0.2;
export const HIDDEN_WINDOW = 2;

// Scheduler interval, which is also the grace interval for late items, in seconds
export const TICK = 0.025;
export const LATE_GRACE = 0.025;

// Items beyond the base horizon are created only while node-holding voices stay this far
// below the live-voice cap
export const FILL_HEADROOM = 16;

export const MAX_PENDING_SOUNDS = 1024;

// Pending items sorted by start time: { id, kind, start, run }
const m_pending = [];
let m_timer = null;
let m_canFill = () => true;


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Process due items, then stop the timer when nothing is pending
 *
 * @returns {void}
 */
function tick() {
	processPending( g_context.getAudioContext().currentTime );
	if( m_pending.length === 0 ) {
		clearInterval( m_timer );
		m_timer = null;
	}
}

/**
 * Start the tick timer if items are pending
 *
 * @returns {void}
 */
function ensureTimer() {
	if( m_timer === null && m_pending.length > 0 ) {
		m_timer = setInterval( tick, TICK * 1000 );
	}
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Register the check that allows creation beyond the base horizon
 *
 * @param {Function} canFill - Returns true while capacity allows window fill
 * @returns {void}
 */
export function setFillProbe( canFill ) {
	m_canFill = canFill;
}

/**
 * Current lookahead window
 *
 * @returns {number} Window length in seconds
 */
export function getWindow() {
	if( typeof document !== "undefined" && document.hidden ) {
		return HIDDEN_WINDOW;
	}
	return BASE_WINDOW;
}

/**
 * Whether an item starting at a time should be created now under the window-fill rule
 *
 * @param {number} start - Context start time
 * @param {number} now - Current context time
 * @returns {boolean} True for due items, and for items within the window while fill capacity
 * remains
 */
export function shouldCreate( start, now ) {
	const ahead = start - now;
	if( ahead <= BASE_WINDOW ) {
		return true;
	}
	return ahead <= getWindow() && m_canFill();
}

/**
 * Add a pending record
 *
 * @param {Object} item - { id, kind, start, run }; run() creates the item's nodes
 * @param {string} commandName - Command name for the error message
 * @returns {void}
 */
export function addPending( item, commandName ) {
	if( m_pending.length >= MAX_PENDING_SOUNDS ) {
		const error = new RangeError(
			`${commandName}: Too many pending sounds; at most ${MAX_PENDING_SOUNDS} delayed ` +
			"requests can wait at once."
		);
		error.code = "TOO_MANY_PENDING_SOUNDS";
		throw error;
	}

	// Insert after items with the same start time to keep request order
	let index = m_pending.length;
	while( index > 0 && m_pending[ index - 1 ].start > item.start ) {
		index -= 1;
	}
	m_pending.splice( index, 0, item );
	ensureTimer();
}

/**
 * Remove a pending record
 *
 * @param {string|number} id - Item ID
 * @returns {boolean} True if a record was removed
 */
export function removePending( id ) {
	const index = m_pending.findIndex( item => item.id === id );
	if( index === -1 ) {
		return false;
	}
	m_pending.splice( index, 1 );
	return true;
}

/**
 * Remove every pending record of one kind
 *
 * @param {string} kind - Item kind, such as "sound"
 * @returns {void}
 */
export function clearPending( kind ) {
	for( let i = m_pending.length - 1; i >= 0; i-- ) {
		if( m_pending[ i ].kind === kind ) {
			m_pending.splice( i, 1 );
		}
	}
}

/**
 * Create nodes for items in start order: due items always, items beyond the base horizon
 * only while fill capacity remains
 *
 * @param {number} now - Current context time
 * @returns {void}
 */
export function processPending( now ) {
	while( m_pending.length > 0 && shouldCreate( m_pending[ 0 ].start, now ) ) {
		const item = m_pending.shift();
		try {
			item.run();
		} catch( error ) {
			console.error( "sound: Scheduled start failed:", error );
		}
	}
}
