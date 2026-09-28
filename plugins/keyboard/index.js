/**
 * Keyboard Plugin for Pi.js
 *
 * Provides keyboard input handling including key state tracking, event handlers,
 * and action key management.
 *
 * @module plugins/keyboard
 * @version 2.0.0
 */

"use strict";

import * as g_input from "./input.js";

// Input tags that we don't want to capture
const INPUT_TAGS = new Set( [ "INPUT", "TEXTAREA", "SELECT", "BUTTON" ] );

// Held keys by code, in press order. Each entry is the data of the code's latest keydown, so a
// key value is held while any code whose latest keydown produced it is held.
const m_heldCodes = new Map();
const m_actionKeys = new Set();
const m_onKeyHandlers = {};

// Frozen list of the held key data returned by inKey(), rebuilt on the first read after a change
let m_heldList = null;

// Status variables. Tracking starts on first use; after stopKeyboard() it stays stopped until
// startKeyboard()
let m_isKeyboardActive = false;
let m_isStopped = false;
let m_isReleaseListening = false;


/*************************************************************************************************
 * Plugin Initialization
 ************************************************************************************************/


/**
 * Register keyboard commands, input handling, and screen cleanup hooks. Listeners are added on
 * first use, so a page that never reads the keyboard attaches none.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @returns {void}
 */
export default function keyboardPlugin( pluginApi ) {

	// Register global commands
	pluginApi.addCommand( "startKeyboard", startKeyboard, false, [] );
	pluginApi.addCommand( "stopKeyboard", stopKeyboard, false, [] );
	pluginApi.addCommand( "inKey", inKey, false, [ "key" ] );
	pluginApi.addCommand( "setActionKeys", setActionKeys, false, [ "keys" ] );
	pluginApi.addCommand( "removeActionKeys", removeActionKeys, false, [ "keys" ] );
	pluginApi.addCommand( "onKey", onKey, false, [ "key", "mode", "fn", "once", "allowRepeat" ] );
	pluginApi.addCommand( "offKey", offKey, false, [ "key", "mode", "fn" ] );

	// Initialize input command
	g_input.initInput( pluginApi, isFromEditableTarget, releaseHeldKeys );

	// Register clearEvents handler
	pluginApi.registerClearEvents( "keyboard", clearKeyboardEvents );
}


/*************************************************************************************************
 * External API Commands
 ************************************************************************************************/


/**
 * Start keyboard event handling, and undo stopKeyboard().
 *
 * Focus is left where it is: keys typed into an editable element are ignored anyway.
 *
 * @returns {void}
 */
function startKeyboard() {
	m_isStopped = false;
	if( m_isKeyboardActive ) {
		return;
	}
	window.addEventListener( "keydown", onKeyDown, { "capture": true } );
	window.addEventListener( "keyup", onKeyUp, { "capture": true } );

	// Held keys are released, as cancelled, when the window loses focus or the page is hidden
	if( !m_isReleaseListening ) {
		window.addEventListener( "blur", releaseHeldKeys );
		document.addEventListener( "visibilitychange", onVisibilityChange );
		m_isReleaseListening = true;
	}
	m_isKeyboardActive = true;
}

/**
 * Start tracking on first use: a read, a handler registration, or action keys. Nothing restarts
 * tracking after stopKeyboard() except startKeyboard().
 *
 * @returns {void}
 */
function startOnUse() {
	if( !m_isStopped ) {
		startKeyboard();
	}
}

/**
 * Stop keyboard event handling. Held keys are released first, through the "up" handlers with
 * `cancelled: true`. Tracking stays stopped until startKeyboard(); handlers stay registered but
 * are not called.
 *
 * @returns {void}
 */
function stopKeyboard() {
	m_isStopped = true;
	if( !m_isKeyboardActive ) {
		return;
	}
	releaseHeldKeys();
	window.removeEventListener( "keydown", onKeyDown, { "capture": true } );
	window.removeEventListener( "keyup", onKeyUp, { "capture": true } );
	m_isKeyboardActive = false;
}

/**
 * Read one held key, or all held keys. A list read returns the same frozen array until the held
 * keys change, so polling does not allocate.
 *
 * @param {Object} options - Command options.
 * @returns {Object|Array<Object>|null} Key data or null for one key; a frozen array for all.
 */
function inKey( options ) {
	const key = options.key;
	startOnUse();

	if( key ) {

		if( typeof key !== "string" ) {
			const error = new TypeError( "inKey: key must be a string." );
			error.code = "INVALID_PARAMETERS";
			throw error;
		}

		return findHeldKey( key );
	}

	// If inKey is blank return all held keys
	return getHeldKeys();
}

/**
 * Set the keys whose browser defaults are suppressed.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function setActionKeys( options ) {
	const keys = options.keys;

	if( !Array.isArray( keys ) ) {
		const error = new TypeError( "setActionKeys: keys must be an array." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}
	for( const key of keys ) {
		m_actionKeys.add( key );
	}
	startOnUse();
}

/**
 * Remove keys from the browser-default suppression list.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function removeActionKeys( options ) {
	const keys = options.keys;

	if( !Array.isArray( keys ) ) {
		const error = new TypeError( "removeActionKeys: keys must be an array." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}
	for( const key of keys ) {
		m_actionKeys.delete( key );
	}
}

/**
 * Register a handler; callback errors are reported with `console.error` without stopping
 * dispatch. A handler is identified by its key set, mode, and function, so registering the same
 * function for the same keys and mode again does nothing.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function onKey( options ) {
	const key = options.key;
	const mode = options.mode;
	const fn = options.fn;
	const once = !!options.once;
	const allowRepeat = !!options.allowRepeat;

	if( !key || ( typeof key !== "string" && !Array.isArray( key ) ) ) {
		const error = new TypeError( "onKey: key must be a string or an array of strings." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( !mode || ( typeof mode !== "string" ) ) {
		const error = new TypeError( "onKey: mode must be a string with value of up or down." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( typeof fn !== "function" ) {
		const error = new TypeError( "onKey: fn must be a function." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Normalize key into an array for easier processing
	let combo;
	if( typeof key === "string" ) {
		combo = [ key ];
	} else {
		combo = key;
	}

	startOnUse();
	const comboKey = combo.sort().join( "" );
	for( const existing of m_onKeyHandlers[ combo[ 0 ] ] || [] ) {
		if( existing.comboKey === comboKey && existing.mode === mode && existing.fn === fn ) {
			return;
		}
	}

	const handler = {
		"comboKey": comboKey,
		"combo": combo,
		"mode": mode,
		"fn": fn,
		"once": once,
		"allowRepeat": allowRepeat,
		"isRemoved": false
	};

	// Add a on key handler for each of the key codes - in combo all must be pressed
	for( const key of combo ) {
		if( !m_onKeyHandlers[ key ] ) {
			m_onKeyHandlers[ key ] = [];
		}
		m_onKeyHandlers[ key ].push( handler );
	}
}

/**
 * Remove matching keyboard listeners. A handler matches by key set, mode, and function: without a
 * function, every handler of the mode is removed, and without a mode, the function is removed
 * from both modes.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function offKey( options ) {
	const key = options.key;
	const mode = options.mode;
	const fn = options.fn;

	if( !key || ( typeof key !== "string" && !Array.isArray( key ) ) ) {
		const error = new TypeError( "offKey: key must be a string or an array of strings." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( mode == null && fn == null ) {
		const error = new TypeError(
			"offKey: mode or fn is required. To remove every key handler, call " +
			"clearEvents( \"keyboard\" )."
		);
		error.code = "INVALID_MODE";
		throw error;
	}

	if( fn != null && typeof fn !== "function" ) {
		const error = new TypeError( "offKey: callback must be a function." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Normalize key into an array for easier processing
	let combo;
	if( typeof key === "string" ) {
		combo = [ key ];
	} else {
		combo = key;
	}
	const comboKey = combo.sort().join( "" );

	// Find the handlers, then remove each from every key it is registered under
	const matches = [];
	for( const handler of m_onKeyHandlers[ combo[ 0 ] ] || [] ) {
		if(
			handler.comboKey === comboKey &&
			( mode == null || handler.mode === mode ) &&
			( fn == null || handler.fn === fn )
		) {
			matches.push( handler );
		}
	}
	for( const handler of matches ) {
		removeHandler( handler );
	}
}


/*************************************************************************************************
 * Internal Helper Functions
 ************************************************************************************************/


function onKeyDown( event ) {

	// Ignore typing when focus is inside an editable, and release the keys held until then
	if( isFromEditableTarget( event ) ) {
		releaseHeldKeys();
		return;
	}

	// The key is held before its handlers run. The latest keydown of a code moves it to the end,
	// so value lookups find the latest press
	const keyData = createKeyData( event );
	m_heldCodes.delete( event.code );
	m_heldCodes.set( event.code, keyData );
	m_heldList = null;

	const names = [ event.code ];
	if( event.code !== event.key ) {
		names.push( event.key );
	}
	dispatchKey( event, "down", names, null );
	if( m_actionKeys.has( event.code ) || m_actionKeys.has( event.key ) ) {
		event.preventDefault();
	}
}

function onKeyUp( event ) {

	// Ignore typing when focus is inside an editable, and release the keys held until then
	if( isFromEditableTarget( event ) ) {
		releaseHeldKeys();
		return;
	}
	const codeData = m_heldCodes.get( event.code );

	// Up handlers get the keyup's data, and run for the code, the value the keyup reports, and
	// the value the key was pressed with, which differs when a modifier changed during the hold.
	// A keyup whose press was not seen still reaches single-key and "any" handlers.
	const names = [ event.code ];
	if( !names.includes( event.key ) ) {
		names.push( event.key );
	}
	if( codeData && !names.includes( codeData.key ) ) {
		names.push( codeData.key );
	}
	releaseKey( event, createKeyData( event ), names );
	if( m_actionKeys.has( event.code ) || m_actionKeys.has( event.key ) ) {
		event.preventDefault();
	}
}

/**
 * Release a key by code, whatever value the release reports, then run its up handlers: in them,
 * the key is no longer held. Combinations are matched against the keys held just before.
 *
 * @param {Object} event - The keyup, or `{ code, key, repeat }` for a cancelled release.
 * @param {Object} data - The release data.
 * @param {Array<string>} names - The released key's names: its code and values.
 * @returns {void}
 */
function releaseKey( event, data, names ) {
	const heldBefore = new Map( m_heldCodes );
	if( m_heldCodes.delete( event.code ) ) {
		m_heldList = null;
	}
	dispatchKey( event, "up", names, {
		"data": data,
		"names": names,
		"heldBefore": heldBefore
	} );
}

/**
 * Release every held key that the player did not release: the window lost focus, the page was
 * hidden, the keyboard was stopped, a key came from an editable element, or a prompt took the
 * keyboard. Each key's "up" handlers run with a copy of its last keydown data, with
 * `repeat: false` and `cancelled: true`. A second trigger finds nothing held.
 *
 * @returns {void}
 */
function releaseHeldKeys() {
	for( const keyData of getHeldKeys() ) {

		// A handler of an earlier release can release or press keys itself
		if( m_heldCodes.get( keyData.code ) !== keyData ) {
			continue;
		}
		const names = [ keyData.code ];
		if( !names.includes( keyData.key ) ) {
			names.push( keyData.key );
		}
		const data = Object.freeze( { ...keyData, "repeat": false, "cancelled": true } );
		const event = { "code": keyData.code, "key": keyData.key, "repeat": false };
		releaseKey( event, data, names );
	}
}

/**
 * The held key data in press order, as a frozen array that is replaced when the keys change.
 *
 * @returns {Array<Object>} Frozen array of key data.
 */
function getHeldKeys() {
	if( m_heldList === null ) {
		m_heldList = Object.freeze( Array.from( m_heldCodes.values() ) );
	}
	return m_heldList;
}

function onVisibilityChange() {
	if( document.visibilityState === "hidden" ) {
		releaseHeldKeys();
	}
}

/** Remove this registration from every bucket before invoking a once-handler. */
function removeHandler( handler ) {
	handler.isRemoved = true;
	for( const key of handler.combo ) {
		const handlers = m_onKeyHandlers[ key ];
		if( !handlers ) {
			continue;
		}
		const remaining = handlers.filter( item => item !== handler );
		if( remaining.length === 0 ) {
			delete m_onKeyHandlers[ key ];
		} else {
			m_onKeyHandlers[ key ] = remaining;
		}
	}
}

/**
 * Call a handler. A `once` handler is removed first, so a dispatch started inside it does not
 * call it again. A handler that throws is reported with `console.error`, and the others still run.
 *
 * @param {Object} handler - The registration.
 * @param {Object|Array<Object>} data - Key data, or an array of key data for a combination.
 * @returns {void}
 */
function invokeHandler( handler, data ) {
	if( handler.once ) {
		removeHandler( handler );
	}
	try {
		handler.fn( data );
	} catch( error ) {
		console.error( `onKey: Handler for "${handler.mode}" failed:`, error );
	}
}

/**
 * Copy the state of a key event into key data.
 *
 * The data is frozen, because the same object is stored as held state, returned by inKey(),
 * and passed to handlers: callers must not be able to change plugin state through it.
 *
 * @param {KeyboardEvent} event - Keydown or keyup event
 * @returns {Object} Frozen key data
 */
function createKeyData( event ) {
	return Object.freeze( {
		"code": event.code,
		"key": event.key,
		"location": event.location,
		"altKey": event.altKey,
		"ctrlKey": event.ctrlKey,
		"metaKey": event.metaKey,
		"shiftKey": event.shiftKey,
		"repeat": event.repeat,
		"cancelled": false
	} );
}

/**
 * Run the handlers of a key event: those registered under the key's names, then the "any"
 * handlers. State is already updated. Handlers added during the dispatch first run in the next
 * one, a handler removed during it does not run later in it, and a combination registered under
 * several of the names runs once.
 *
 * @param {KeyboardEvent} event - Keydown or keyup event
 * @param {string} mode - "down" or "up"
 * @param {Array<string>} names - The key's code and values
 * @param {Object|null} release - For releases: { data, names, heldBefore }, the release data,
 *   the names of the released key, and the held keys just before the release
 * @returns {void}
 */
function dispatchKey( event, mode, names, release ) {
	const handlers = new Set();
	for( const name of names.concat( "any" ) ) {
		for( const handler of m_onKeyHandlers[ name ] || [] ) {
			if( handler.mode === mode && ( !event.repeat || handler.allowRepeat ) ) {
				handlers.add( handler );
			}
		}
	}
	for( const handler of handlers ) {
		if( handler.isRemoved ) {
			continue;
		}
		const data = getHandlerData( handler, event, release );
		if( data !== null ) {
			invokeHandler( handler, data );
		}
	}
}

/**
 * The data a handler receives for a key event, or null when it does not run.
 *
 * A down handler runs while all of its keys are held, with their held data. An up handler for a
 * single key runs with the release data; a combination's up handler runs when all of its keys
 * were held just before the release, with the release data for the released key and the held
 * data for the others.
 *
 * @param {Object} handler - The registration.
 * @param {KeyboardEvent} event - Keydown or keyup event
 * @param {Object|null} release - Release details, as for dispatchKey().
 * @returns {Object|Array<Object>|null} Key data, an array of key data, or null.
 */
function getHandlerData( handler, event, release ) {
	if( handler.combo.length === 1 && handler.combo[ 0 ] === "any" ) {
		if( release ) {
			return release.data;
		}

		// A handler earlier in the dispatch can release the key, as stopKeyboard() does
		return m_heldCodes.get( event.code ) || null;
	}
	if( release && handler.combo.length === 1 ) {
		return release.data;
	}

	let held = m_heldCodes;
	if( release ) {
		held = release.heldBefore;
	}
	const comboData = handler.combo.map( key => findHeldKey( key, held ) );
	if( comboData.includes( null ) ) {
		return null;
	}
	if( release ) {
		handler.combo.forEach( ( key, index ) => {
			if( release.names.includes( key ) ) {
				comboData[ index ] = release.data;
			}
		} );
	}
	if( comboData.length === 1 ) {
		return comboData[ 0 ];
	}
	return comboData;
}

/**
 * Whether an event comes from an element that takes text, such as an input or a
 * contenteditable element.
 *
 * Listeners on `window` see `event.target` retargeted to the host of an open shadow root, so
 * the original target is read from the composed path. A closed shadow root keeps its internals
 * out of the path, and its host is checked instead.
 *
 * @param {Event} event - Keyboard or clipboard event
 * @returns {boolean} True when the event comes from an editable element
 */
function isFromEditableTarget( event ) {
	let element = event.target;
	if( typeof event.composedPath === "function" ) {
		const path = event.composedPath();
		if( path.length > 0 ) {
			element = path[ 0 ];
		}
	}
	if( !element ) {
		return false;
	}

	// Standard form controls
	if( INPUT_TAGS.has( element.tagName ) ) {
		return true;
	}

	// Contenteditable
	if( element.isContentEditable ) {
		return true;
	}

	// Custom text controls, such as web components with a textbox role
	const role = element.getAttribute && element.getAttribute( "role" );
	if( role === "textbox" || role === "searchbox" ) {
		return true;
	}

	return false;
}

/**
 * Find a held key by code, or by key value.
 *
 * A code is checked first. A key value is held while any held code's latest keydown produced
 * it; when several do, the most recent press is returned.
 *
 * @param {string} key - Key code, such as "KeyA", or key value, such as "a".
 * @param {Map<string, Object>} [held] - Held keys by code; the current ones by default.
 * @returns {Object|null} Key data of the held key, or null.
 */
function findHeldKey( key, held = m_heldCodes ) {
	const codeData = held.get( key );
	if( codeData ) {
		return codeData;
	}
	let keyData = null;
	for( const data of held.values() ) {
		if( data.key === key ) {
			keyData = data;
		}
	}
	return keyData;
}


/*************************************************************************************************
 * Module Exports for Other Modules
 ************************************************************************************************/


/**
 * Clear all keyboard event handlers
 * Called by clearEvents command and exported for use by other modules
 *
 * @param {Object} [screenData] - Screen data to clear events for specific screen
 * @returns {void}
 */
export function clearKeyboardEvents( screenData ) {

	// Clear all keyboard event handlers
	for( const mode in m_onKeyHandlers ) {
		for( const handler of m_onKeyHandlers[ mode ] ) {
			handler.isRemoved = true;
		}
		delete m_onKeyHandlers[ mode ];
	}

	// Cancel all active input prompts
	g_input.cancelAllInputs( screenData );
}


// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "keyboard",
		"version": "2.0.0",
		"description": "Keyboard input handling for Pi.js",
		"init": keyboardPlugin
	} );
}
