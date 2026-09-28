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

// Status variables
let m_isKeyboardActive = false;
let m_pluginApi = null;


/*************************************************************************************************
 * Plugin Initialization
 ************************************************************************************************/


/**
 * Register keyboard commands, input handling, and screen cleanup hooks.
 *
 * @param {Object} pluginApi - Plugin registration and screen access API.
 * @returns {void}
 */
export default function keyboardPlugin( pluginApi ) {
	m_pluginApi = pluginApi;

	// Initialize keyboard on plugin load
	startKeyboard();
	window.addEventListener( "blur", clearInKeys );

	// Register global commands
	pluginApi.addCommand( "startKeyboard", startKeyboard, false, [] );
	pluginApi.addCommand( "stopKeyboard", stopKeyboard, false, [] );
	pluginApi.addCommand( "inKey", inKey, false, [ "key" ] );
	pluginApi.addCommand( "setActionKeys", setActionKeys, false, [ "keys" ] );
	pluginApi.addCommand( "removeActionKeys", removeActionKeys, false, [ "keys" ] );
	pluginApi.addCommand( "onKey", onKey, false, [ "key", "mode", "fn", "once", "allowRepeat" ] );
	pluginApi.addCommand( "offKey", offKey, false, [ "key", "mode", "fn", "once", "allowRepeat" ] );

	// Initialize input command
	g_input.initInput( pluginApi, isFromEditableTarget );

	// Register clearEvents handler
	pluginApi.registerClearEvents( "keyboard", clearKeyboardEvents );
}


/*************************************************************************************************
 * External API Commands
 ************************************************************************************************/


/**
 * Start keyboard event handling.
 *
 * Focus is left where it is: keys typed into an editable element are ignored anyway.
 *
 * @returns {void}
 */
function startKeyboard() {
	if( m_isKeyboardActive ) {
		return;
	}
	window.addEventListener( "keydown", onKeyDown, { "capture": true } );
	window.addEventListener( "keyup", onKeyUp, { "capture": true } );
	m_isKeyboardActive = true;
}

/**
 * Stop keyboard event handling and clear active key state.
 *
 * @returns {void}
 */
function stopKeyboard() {
	if( !m_isKeyboardActive ) {
		return;
	}
	window.removeEventListener( "keydown", onKeyDown, { "capture": true } );
	window.removeEventListener( "keyup", onKeyUp, { "capture": true } );
	m_isKeyboardActive = false;

	// Clear keys to prevent any after effects
	clearInKeys();
}

/**
 * Read one active key event or all active key events.
 *
 * @param {Object} options - Command options.
 * @returns {Object|Array<Object>|null}
 */
function inKey( options ) {
	const key = options.key;

	if( key ) {

		if( typeof key !== "string" ) {
			const error = new TypeError( "inKey: key must be a string." );
			error.code = "INVALID_PARAMETERS";
			throw error;
		}

		return findHeldKey( key );
	}

	// If inKey is blank return all held keys
	return Array.from( m_heldCodes.values() );
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
 *  Register a handler; callback errors are reported asynchronously without stopping dispatch.
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

	const handler = {
		"comboKey": combo.sort().join( "" ),
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
 * Remove matching keyboard listeners.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function offKey( options ) {
	const key = options.key;
	const mode = options.mode;
	const fn = options.fn;
	const once = !!options.once;
	const allowRepeat = !!options.allowRepeat;

	if( !key || ( typeof key !== "string" && !Array.isArray( key ) ) ) {
		const error = new TypeError( "offKey: key must be a string or an array of strings." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( typeof fn !== "function" ) {
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

	// Find the handlers and remove them
	for( const key of combo ) {
		const handlers = m_onKeyHandlers[ key ];
		if( !handlers ) {
			continue;
		}
		const toRemove = [];
		for( let i = 0; i < handlers.length; i += 1 ) {
			const handler = handlers[ i ];
			if(
				handler.comboKey === comboKey &&
				handler.mode === mode &&
				handler.fn === fn &&
				handler.once === once &&
				handler.allowRepeat === allowRepeat
			) {
				toRemove.push( i );
				handler.isRemoved = true;
			}
		}
		for( let i = toRemove.length - 1; i >= 0; i -= 1 ) {
			handlers.splice( toRemove[ i ], 1 );
		}
		if( handlers.length === 0 ) {
			delete m_onKeyHandlers[ key ];
		}
	}
}


/*************************************************************************************************
 * Internal Helper Functions
 ************************************************************************************************/


function onKeyDown( event ) {

	// Ignore typing when focus is inside an editable
	if( isFromEditableTarget( event ) ) {
		clearInKeys();
		return;
	}
	const keyData = createKeyData( event );

	// The latest keydown of a code moves it to the end, so value lookups find the latest press
	m_heldCodes.delete( event.code );
	m_heldCodes.set( event.code, keyData );

	triggerKeyEventHandlers( event, "down", event.code );
	if( event.code !== event.key ) {
		triggerKeyEventHandlers( event, "down", event.key );
	}
	triggerKeyEventHandlers( event, "down", "any" );
	if( m_actionKeys.has( event.code ) || m_actionKeys.has( event.key ) ) {
		event.preventDefault();
	}
}

function onKeyUp( event ) {

	// Ignore typing when focus is inside an editable
	if( isFromEditableTarget( event ) ) {
		clearInKeys();
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
	const release = { "data": createKeyData( event ), "names": names };
	try {
		for( const name of names ) {
			triggerKeyEventHandlers( event, "up", name, release );
		}
		triggerKeyEventHandlers( event, "up", "any", release );
	} finally {

		// Release by code, whatever value the release reports; preserve a new press dispatched
		// by a release callback.
		if( m_heldCodes.get( event.code ) === codeData ) {
			m_heldCodes.delete( event.code );
		}
		if( m_actionKeys.has( event.code ) || m_actionKeys.has( event.key ) ) {
			event.preventDefault();
		}
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

/** Isolate each callback while preserving the original error for browser error reporting. */
function invokeHandler( handler, data ) {
	if( handler.once ) {
		removeHandler( handler );
	}
	try {
		handler.fn( data );
	} catch( error ) {
		m_pluginApi.utils.queueMicrotask( () => { throw error; } );
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
		"repeat": event.repeat
	} );
}

/**
 * Run the handlers registered under one key name for a key event.
 *
 * A down handler runs when all of its keys are held, with their held data. An up handler for a
 * single key runs with the release data; a combination's up handler runs when all of its keys
 * were held, with the release data for the released key and the held data for the others.
 *
 * @param {KeyboardEvent} event - Keydown or keyup event
 * @param {string} mode - "down" or "up"
 * @param {string} keyOrCode - Handler bucket: a key code, a key value, or "any"
 * @param {Object} [release] - For keyups: { data, names }, the release data and the names of
 *   the released key
 * @returns {void}
 */
function triggerKeyEventHandlers( event, mode, keyOrCode, release = null ) {
	const handlers = m_onKeyHandlers[ keyOrCode ];
	if( !handlers ) {
		return;
	}

	const isAnyKey = keyOrCode === "any";
	const handlersCopy = handlers.slice();

	for( let i = 0; i < handlersCopy.length; i += 1 ) {
		const handler = handlersCopy[ i ];

		if( handler.mode !== mode ) {
			continue;
		}

		if( event.repeat && !handler.allowRepeat ) {
			continue;
		}

		// Need to check if handler has been removed in case a previous handler includes an offKey
		if( handler.isRemoved ) {
			continue;
		}

		// For "any" key handlers, pass the release data or the current key data
		if( isAnyKey ) {
			let keyData = m_heldCodes.get( event.code );
			if( release ) {
				keyData = release.data;
			}

			// In case stopKeyboard gets called in another key event handler keyData will be blank
			if( keyData !== undefined ) {
				invokeHandler( handler, keyData );
			}
			continue;
		}

		if( release && handler.combo.length === 1 ) {
			invokeHandler( handler, release.data );
			continue;
		}

		// For specific key handlers, check combo and pass combo data
		const comboData = handler.combo.map( key => findHeldKey( key ) );

		if( comboData.every( keyData => keyData !== null ) ) {
			if( release ) {
				handler.combo.forEach( ( key, index ) => {
					if( release.names.includes( key ) ) {
						comboData[ index ] = release.data;
					}
				} );
			}
			if( comboData.length === 1 ) {
				invokeHandler( handler, comboData[ 0 ] );
			} else {
				invokeHandler( handler, comboData );
			}
		}
	}
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

function clearInKeys() {
	m_heldCodes.clear();
}

/**
 * Find a held key by code, or by key value.
 *
 * A code is checked first. A key value is held while any held code's latest keydown produced
 * it; when several do, the most recent press is returned.
 *
 * @param {string} key - Key code, such as "KeyA", or key value, such as "a".
 * @returns {Object|null} Key data of the held key, or null.
 */
function findHeldKey( key ) {
	const codeData = m_heldCodes.get( key );
	if( codeData ) {
		return codeData;
	}
	let keyData = null;
	for( const data of m_heldCodes.values() ) {
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
