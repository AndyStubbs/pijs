/**
 * Keyboard Plugin for Pi.js
 * 
 * Provides keyboard input handling including key state tracking, event handlers,
 * and action key management.
 * 
 * @module plugins/keyboard
 * @version 1.0.0
 */

"use strict";

import { initInput, cancelAllInputs } from "./input.js";

// Input tags that we don't want to capture
const INPUT_TAGS = new Set( [ "INPUT", "TEXTAREA", "SELECT", "BUTTON" ] );

// Key information containers
const m_inCodes = {};
const m_inKeys = {};
const m_actionKeys = new Set();
const m_onKeyHandlers = {};

// Status variables
let m_isKeyboardActive = false;


/***************************************************************************************************
 * Plugin Initialization
 **************************************************************************************************/


export default function keyboardPlugin( pluginApi ) {

	// Initialize keyboard on plugin load
	startKeyboard();
	window.addEventListener( "blur", clearInKeys );

	// Add screen cleanup function to clear keyboard events when screen is removed
	pluginApi.addScreenCleanupFunction( () => {
		// Keyboard events are global, so we don't need screen-specific cleanup
		// But we can use this hook if needed in the future
	} );

	// Register global commands
	pluginApi.addCommand( "startKeyboard", startKeyboard, false, [] );
	pluginApi.addCommand( "stopKeyboard", stopKeyboard, false, [] );
	pluginApi.addCommand( "inkey", inkey, false, [ "key" ] );
	pluginApi.addCommand( "setActionKeys", setActionKeys, false, [ "keys" ] );
	pluginApi.addCommand( "removeActionKeys", removeActionKeys, false, [ "keys" ] );
	pluginApi.addCommand( "onkey", onkey, false, [ "key", "mode", "fn", "once", "allowRepeat" ] );
	pluginApi.addCommand( "offkey", offkey, false, [ "key", "mode", "fn", "once", "allowRepeat" ] );

	// Initialize input command
	initInput( pluginApi );

	// Register clearEvents handler
	pluginApi.registerClearEvents( "keyboard", clearKeyboardEvents );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


function startKeyboard() {
	if( m_isKeyboardActive ) {
		return;
	}
	window.addEventListener( "keydown", onKeyDown, { "capture": true } );
	window.addEventListener( "keyup", onKeyUp, { "capture": true } );
	m_isKeyboardActive = true;
	if( document.activeElement ) {
		document.activeElement.blur();
	}
}

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

function inkey( options ) {
	const key = options.key;

	if( key ) {

		if( typeof key !== "string" ) {
			const error = new TypeError( "inkey: key must be a string." );
			error.code = "INVALID_PARAMETERS";
			throw error;
		}

		// Get key by code property
		if( m_inCodes[ key ] ) {
			return m_inCodes[ key ];
		}

		// Get key by key property
		if( m_inKeys[ key ] ) {
			return m_inKeys[ key ];
		}

		return null;
	}

	// If inkey is blank return all key codes
	const keyCodes = [];
	for( const code in m_inCodes ) {
		if( m_inCodes[ code ] ) {
			keyCodes.push( m_inCodes[ code ] );
		}
	}

	return keyCodes;
}

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

function onkey( options ) {
	const key = options.key;
	const mode = options.mode;
	const fn = options.fn;
	const once = !!options.once;
	const allowRepeat = !!options.allowRepeat;
	
	if( !key || ( typeof key !== "string" && !Array.isArray( key ) ) ) {
		const error = new TypeError( "onkey: key must be a string or an array of strings." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( !mode || ( typeof mode !== "string" ) ) {
		const error = new TypeError( "onkey: mode must be a string with value of up or down." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( typeof fn !== "function" ) {
		const error = new TypeError( "onkey: fn must be a function." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Normalize key into an array for easier processing
	const combo = typeof key === "string" ? [ key ] : key;

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

function offkey( options ) {
	const key = options.key;
	const mode = options.mode;
	const fn = options.fn;
	const once = !!options.once;
	const allowRepeat = !!options.allowRepeat;

	if( !key || ( typeof key !== "string" && !Array.isArray( key ) ) ) {
		const error = new TypeError( "offkey: key must be a string or an array of strings." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( typeof fn !== "function" ) {
		const error = new TypeError( "offkey: callback must be a function." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Normalize key into an array for easier processing
	const combo = typeof key === "string" ? [ key ] : key;
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


/***************************************************************************************************
 * Internal Helper Functions
 **************************************************************************************************/


function onKeyDown( event ) {

	// Ignore typing when focus is inside an editable
	if( isFromEditableTarget( event ) ) {
		clearInKeys();
		return;
	}
	const keyData = {
		"code": event.code,
		"key": event.key,
		"location": event.location,
		"altKey": event.altKey,
		"ctrlKey": event.ctrlKey,
		"metaKey": event.metaKey,
		"shiftKey": event.shiftKey,
		"repeat": event.repeat
	};
	m_inCodes[ event.code ] = keyData;
	m_inKeys[ event.key ] = keyData;

	triggerKeyEventHandlers( event, "down", event.code );
	triggerKeyEventHandlers( event, "down", event.key );
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
	triggerKeyEventHandlers( event, "up", event.code );
	triggerKeyEventHandlers( event, "up", event.key );
	triggerKeyEventHandlers( event, "up", "any" );

	delete m_inCodes[ event.code ];
	delete m_inKeys[ event.key ];

	if( m_actionKeys.has( event.code ) || m_actionKeys.has( event.key ) ) {
		event.preventDefault();
	}
}

function triggerKeyEventHandlers( event, mode, keyOrCode ) {
	const handlers = m_onKeyHandlers[ keyOrCode ];
	if( !handlers ) {
		return;
	}

	const isAnyKey = keyOrCode === "any";
	const handlersCopy = handlers.slice();
	const toRemove = new Set();

	for( let i = 0; i < handlersCopy.length; i += 1 ) {
		const handler = handlersCopy[ i ];

		if( handler.mode !== mode ) {
			continue;
		}

		if( event.repeat && !handler.allowRepeat ) {
			continue;
		}

		// Need to check if handler has been removed in case a previous handler includes an offkey
		if( handler.isRemoved ) {
			continue;
		}

		// For "any" key handlers, pass the current key data
		if( isAnyKey ) {
			let keyData = m_inCodes[ event.code ];
			if( !keyData ) {
				keyData = m_inKeys[ event.key ];
			}

			// In case stopKeyboard gets called in another key event handler keyData will be blank
			if( keyData !== undefined ) {
				handler.fn( keyData );
			}

			if( handler.once ) {
				toRemove.add( handler );
				handler.isRemoved = true;
			}
			continue;
		}

		// For specific key handlers, check combo and pass combo data
		const isAllKeysPressed = handler.combo.every( key => m_inKeys[ key ] || m_inCodes[ key ] );

		if( isAllKeysPressed ) {
			const comboData = handler.combo.map( key => {
				if( m_inKeys[ key ] ) {
					return m_inKeys[ key ];
				}
				return m_inCodes[ key ];
			} );

			if( comboData.length === 1 ) {
				handler.fn( comboData[ 0 ] );
			} else {
				handler.fn( comboData );
			}

			if( handler.once ) {
				toRemove.add( handler );
				handler.isRemoved = true;
			}
		}
	}

	// Remove the handlers that are one time only calls
	if( toRemove.size > 0 ) {
		m_onKeyHandlers[ keyOrCode ] = handlers.filter( h => !toRemove.has( h ) );
		
		// Delete the array if empty
		if( m_onKeyHandlers[ keyOrCode ].length === 0 ) {
			delete m_onKeyHandlers[ keyOrCode ];
		}
	}
}

function isFromEditableTarget ( event ) {
	const element = event.target;
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

	// Inputs inside shadow roots
	const role = element.getAttribute && element.getAttribute( "role" );
	if( role === "textbox" || role === "searchbox" ) {
		return true;
	}

	return false;
}

function clearInKeys() {

	// Clear all key states
	for( const code in m_inCodes ) {
		delete m_inCodes[ code ];
	}
	for( const key in m_inKeys ) {
		delete m_inKeys[ key ];
	}
}


/***************************************************************************************************
 * Module Exports for Other Modules
 **************************************************************************************************/


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
		delete m_onKeyHandlers[ mode ];
	}
	
	// Cancel all active input prompts
	cancelAllInputs( screenData );
}


// Auto-register in IIFE mode (when loaded via <script> tag)
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "keyboard",
		"version": "1.0.0",
		"description": "Keyboard input handling for Pi.js",
		"init": keyboardPlugin
	} );
}

