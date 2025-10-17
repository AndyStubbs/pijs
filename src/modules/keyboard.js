/**
 * Pi.js - Keyboard Module
 * 
 * Basic keyboard handler for screens
 * 
 * @module modules/keyboard
 */

"use strict";

import * as screenManager from "../core/screen-manager";
import * as utils from "../core/utils";

// Input tags that we don't want to capture
const INPUT_TAGS = new Set( [ "INPUT", "TEXTAREA", "SELECT", "BUTTON" ] );

// Global screen handlers
const m_screenKeyboardHandlers = {};


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize keyboard module
export function init() {

	// Add keyboard event listeners
	window.addEventListener( "keydown", onGlobalKeyEvent, { "capture": true } );
	window.addEventListener( "keyup", onGlobalKeyEvent, { "capture": true } );

	// Add screen data items
	screenManager.addScreenDataItem( "inCodes", {} );
	screenManager.addScreenDataItem( "inKeys", {} );
	screenManager.addScreenDataItem( "actionKeys", new Set() );
	screenManager.addScreenDataItem( "onKeyHandlers", {} );
	screenManager.addScreenDataItem( "inputData", null );

	// Add initialize screen item
	screenManager.addScreenInitFunction( ( screenData ) => {
		startKeyboard( screenData );
	} );

	// Add internal keyboard handlers
	screenManager.addScreenInternalCommands( "onKeyDown", onKeyDown );
	screenManager.addScreenInternalCommands( "onKeyUp", onKeyUp );

	// Add cleanup item
	screenManager.addScreenCleanupFunction( ( screenData ) => {
		stopKeyboard( screenData );
	} );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


screenManager.addCommand( "startKeyboard", startKeyboard, [] );
function startKeyboard( screenData ) {
	m_screenKeyboardHandlers[ screenData.id ] = screenData;
	screenData.canvas.focus();
}

screenManager.addCommand( "stopKeyboard", stopKeyboard, [] );
function stopKeyboard( screenData ) {
	delete m_screenKeyboardHandlers[ screenData.id ];
}

screenManager.addCommand( "inkey", inkey, [ "key" ] );
function inkey( screenData, options ) {
	const key = options.key;

	if( key ) {

		if( typeof key !== "string" ) {
			const error = new TypeError( "inkey: key must be a string." );
			error.code = "INVALID_PARAMETERS";
			throw error;
		}

		// Get key by code property
		if( screenData.inCodes[ key ] ) {
			return screenData.inCodes[ key ];
		}

		// Get key by key property
		if( screenData.inKeys[ key ] ) {
			return screenData.inKeys[ key ];
		}

		return null;
	}

	// If inkey is blank return all key codes
	const keyCodes = {};
	for( const code in screenData.inCodes ) {
		if( screenData.inCodes[ code ] ) {
			keyCodes[ code ] = screenData.inCodes[ code ];
		}
	}

	if( Object.keys( keyCodes ).length === 0 ) {
		return null;
	}
	return keyCodes;
}

screenManager.addCommand( "setActionKeys", setActionKeys, [ "keys" ] );
function setActionKeys( screenData, options ) {
	const keys = options.keys;

	if( !utils.isArray( keys ) ) {
		const error = new TypeError( "setActionKeys: keys must be an array." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}
	for( const key of keys ) {
		screenData.actionKeys.add( key );
	}
}

screenManager.addCommand( "removeActionKeys", removeActionKeys, [ "keys" ] );
function removeActionKeys( screenData, options ) {
	const keys = options.keys;

	if( !utils.isArray( keys ) ) {
		const error = new TypeError( "removeActionKeys: keys must be an array." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}
	for( const key of keys ) {
		screenData.actionKeys.delete( key );
	}
}

screenManager.addCommand( "onkey", onkey, [ "key", "mode", "fn", "once", "allowRepeat" ] );
function onkey( screenData, options ) {
	const key = options.key;
	const mode = options.mode;
	const fn = options.fn;
	const once = !!options.once;
	const allowRepeat = !!options.allowRepeat;
	
	if( !key || ( typeof key !== "string" && !utils.isArray( key ) ) ) {
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
	};
	
	// Add a on key handler for each of the key codes - in combo all must be pressed
	for( const key of combo ) {
		if( !screenData.onKeyHandlers[ key ] ) {
			screenData.onKeyHandlers[ key ] = [];
		}
		screenData.onKeyHandlers[ key ].push( handler );
	}
}

screenManager.addCommand( "offkey", offkey, [ "key", "mode", "fn", "once", "allowRepeat" ] );
function offkey( screenData, options ) {
	const key = options.key;
	const mode = options.mode;
	const fn = options.fn;
	const once = !!options.once;
	const allowRepeat = !!options.allowRepeat;

	if( !key || ( typeof key !== "string" && !utils.isArray( key ) ) ) {
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
		const handlers = screenData.onKeyHandlers[ key ];
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
			}
		}
		for( let i = toRemove.length - 1; i >= 0; i -= 1 ) {
			handlers.splice( i, 1 );
		}
		if( handlers.length === 0 ) {
			delete screenData.onKeyHandlers[ key ];
		}
	}
}

screenManager.addCommand(
	"input", input, [ "prompt", "fn", "cursor", "isNumber", "isInteger", "allowNegative" ]
);
function input( screenData, options ) {
	const prompt = options.prompt;
	const fn = options.fn;
	const cursor = options.cursor ? options.cursor : String.fromCharCode( 219 );
	const isNumber = !!options.isNumber;
	const isInteger = !!options.isInteger;
	const allowNegative = !!options.allowNegative;

	if( typeof prompt !== "string" ) {
		const error = new TypeError( "input: prompt must be a string" );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( fn && typeof fn !== "function" ) {
		const error = new TypeError( "input: fn must be a function." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	if( typeof cursor !== "string" ) {
		const error = new TypeError( "input: cursor must be a string" );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Create promise for async/await support
	let resolvePromise, rejectPromise;
	const promise = new Promise( ( resolve, reject ) => {
		resolvePromise = resolve;
		rejectPromise = reject;
	} );

	screenData.inputData = {
		"prompt": prompt,
		"isNumber": isNumber,
		"isInteger": isInteger,
		"allowNegative": allowNegative,
		"val": "",
		"fn": fn,
		"resolve": resolvePromise,
		"reject": rejectPromise,
		"screenData": screenData
	};

	startInput( screenData );

	return promise;
}

/***************************************************************************************************
 * Internal Helper Functions
 **************************************************************************************************/


function onGlobalKeyEvent( event ) {

	// Ignore typing when focus is inside an editable
	if ( isFromEditableTarget( event ) ) {
		return;
	}

	if( event.type === "keydown" ) {
		for( const screenDataId in m_screenKeyboardHandlers ) {
			const screenData = m_screenKeyboardHandlers[ screenDataId ];
			screenData.onKeyDown( screenData, event );
		}
	} else if( event.type === "keyup" ) {
		for( const screenDataId in m_screenKeyboardHandlers ) {
			const screenData = m_screenKeyboardHandlers[ screenDataId ];
			screenData.onKeyUp( screenData, event );
		}
	}
}

function onKeyDown( screenData, event ) {
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
	screenData.inCodes[ event.code ] = keyData;
	screenData.inKeys[ event.key ] = keyData;

	triggerKeyEventHandlers( screenData, event, "down", event.code );
	triggerKeyEventHandlers( screenData, event, "down", event.key );
	triggerKeyEventHandlers( screenData, event, "down", "any" );
	if( screenData.actionKeys.has( event.code ) || screenData.actionKeys.has( event.key ) ) {
		event.preventDefault();
	}
}

function onKeyUp( screenData, event ) {
	triggerKeyEventHandlers( screenData, event, "up", event.code );
	triggerKeyEventHandlers( screenData, event, "up", event.key );
	triggerKeyEventHandlers( screenData, event, "up", "any" );

	delete screenData.inCodes[ event.code ];
	delete screenData.inKeys[ event.key ];

	if( screenData.actionKeys.has( event.code ) || screenData.actionKeys.has( event.key ) ) {
		event.preventDefault();
	}
}

function triggerKeyEventHandlers( screenData, event, mode, keyOrCode ) {

	const handlers = screenData.onKeyHandlers[ keyOrCode ];
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
		if( !handlers.includes( handler ) ) {
			continue;
		}

		// For "any" key handlers, pass the current key data
		if( isAnyKey ) {
			let keyData = screenData.inCodes[ event.code ];
			if( !keyData ) {
				keyData = screenData.inKeys[ event.key ];
			}
			handler.fn( keyData );

			if( handler.once ) {
				toRemove.add( handler );
			}
			continue;
		}

		// For specific key handlers, check combo and pass combo data
		const isAllKeysPressed = handler.combo.every(
			key => screenData.inKeys[ key ] || screenData.inCodes[ key ]
		);

		if( isAllKeysPressed ) {
			const comboData = handler.combo.map( key => {
				if( screenData.inKeys[ key ] ) {
					return screenData.inKeys[ key ];
				}
				return screenData.inCodes[ key ];
			} );

			if( comboData.length === 1 ) {
				handler.fn( comboData[ 0 ] );
			} else {
				handler.fn( comboData );
			}

			if( handler.once ) {
				toRemove.add( handler );
			}
		}
	}

	// Remove the handlers that are one time only calls
	if( toRemove.size > 0 ) {
		screenData.onKeyHandlers[ keyOrCode ] = handlers.filter( h => !toRemove.has( h ) );
		
		// Delete the array if empty
		if( screenData.onKeyHandlers[ keyOrCode ].length === 0 ) {
			delete screenData.onKeyHandlers[ keyOrCode ];
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


/***************************************************************************************************
 * Input Commands
 **************************************************************************************************/


function startInput( screenData ) {

	// Add input event listerners
	const onInputKeyDown = ( keyData ) => {
		screenData.inputData.val += keyData.key;
		showPrompt( screenData );
	};
	screenData.api.onkey( "any", "down", onInputKeyDown );

	showPrompt( screenData );
}

function showPrompt( screenData ) {
	screenData.api.print( screenData.inputData.val );
}
