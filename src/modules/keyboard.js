/**
 * Pi.js - Keyboard Module
 * 
 * Basic keyboard handler for screens
 * 
 * @module modules/keyboard
 */

"use strict";

import * as commands from "../core/commands";
import * as screenManager from "../core/screen-manager";
import * as utils from "../core/utils";

// Input tags that we don't want to capture
const INPUT_TAGS = new Set( [ "INPUT", "TEXTAREA", "SELECT", "BUTTON" ] );
const CURSOR_BLINK = 500;

// Key information containers
const m_inCodes = {};
const m_inKeys = {};
const m_actionKeys = new Set();
const m_onKeyHandlers = {};

// Status variables
let m_inputData = null;
let m_isKeyboardActive = false;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize keyboard module
export function init() {
	startKeyboard();
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


commands.addCommand( "startKeyboard", startKeyboard, [] );
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

commands.addCommand( "stopKeyboard", stopKeyboard, [] );
function stopKeyboard() {
	if( !m_isKeyboardActive ) {
		return;
	}
	window.removeEventListener( "keydown", onKeyDown, { "capture": true } );
	window.removeEventListener( "keyup", onKeyUp, { "capture": true } );
	m_isKeyboardActive = false;
}

commands.addCommand( "inkey", inkey, [ "key" ] );
function inkey( options ) {
	const key = options.key;

	// TODO: Fix inkey, I think return values are wrong.

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
	const keyCodes = {};
	for( const code in m_inCodes ) {
		if( m_inCodes[ code ] ) {
			keyCodes[ code ] = m_inCodes[ code ];
		}
	}

	if( Object.keys( keyCodes ).length === 0 ) {
		return null;
	}
	return keyCodes;
}

commands.addCommand( "setActionKeys", setActionKeys, [ "keys" ] );
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

commands.addCommand( "removeActionKeys", removeActionKeys, [ "keys" ] );
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

commands.addCommand( "onkey", onkey, [ "key", "mode", "fn", "once", "allowRepeat" ] );
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
	};
	
	// Add a on key handler for each of the key codes - in combo all must be pressed
	for( const key of combo ) {
		if( !m_onKeyHandlers[ key ] ) {
			m_onKeyHandlers[ key ] = [];
		}
		m_onKeyHandlers[ key ].push( handler );
	}
}

commands.addCommand( "offkey", offkey, [ "key", "mode", "fn", "once", "allowRepeat" ] );
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
			}
		}
		for( let i = toRemove.length - 1; i >= 0; i -= 1 ) {
			handlers.splice( i, 1 );
		}
		if( handlers.length === 0 ) {
			delete m_onKeyHandlers[ key ];
		}
	}
}

screenManager.addCommand(
	"input",
	input,
	[ "prompt", "fn", "cursor", "isNumber", "isInteger", "allowNegative", "onscreenKeyboard" ]
);
function input( screenData, options ) {
	const prompt = options.prompt;
	const fn = options.fn;
	const cursor = options.cursor ? options.cursor : String.fromCharCode( 219 );
	const isNumber = !!options.isNumber;
	const isInteger = !!options.isInteger;
	const allowNegative = !!options.allowNegative;
	const onscreenKeyboard = options.onscreenKeyboard || "none";

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

	if( typeof onscreenKeyboard !== "string" ) {
		const error = new TypeError( "input: onscreenKeyboard must be a string." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	const validKeyboardModes = [ "none", "auto", "always" ];
	if( !validKeyboardModes.includes( onscreenKeyboard ) ) {
		const error = new TypeError(
			"input: onscreenKeyboard must be 'none', 'auto', or 'always'."
		);
		error.code = "INVALID_PARAMETERS";
		throw error;
	}

	// Create promise for async/await support
	let resolvePromise, rejectPromise;
	const promise = new Promise( ( resolve, reject ) => {
		resolvePromise = resolve;
		rejectPromise = reject;
	} );

	if( m_inputData ) {
		finishInput( true );
	}

	m_inputData = {
		"screenData": screenData,
		"prompt": prompt,
		"cursor": cursor,
		"lastCursorBlink": Date.now(),
		"showCursor": true,
		"isNumber": isNumber,
		"isInteger": isInteger,
		"allowNegative": allowNegative,
		"onscreenKeyboard": onscreenKeyboard,
		"val": "",
		"fn": fn,
		"resolve": resolvePromise,
		"reject": rejectPromise
	};

	startInput();

	return promise;
}

commands.addCommand( "cancelInput", cancelInput, [] );
function cancelInput() {
	if( m_inputData ) {
		finishInput( true );
	}
}

/***************************************************************************************************
 * Internal Helper Functions
 **************************************************************************************************/


function onKeyDown( event ) {

	// Ignore typing when focus is inside an editable
	if( isFromEditableTarget( event ) ) {
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
		if( !handlers.includes( handler ) ) {
			continue;
		}

		// For "any" key handlers, pass the current key data
		if( isAnyKey ) {
			let keyData = m_inCodes[ event.code ];
			if( !keyData ) {
				keyData = m_inKeys[ event.key ];
			}
			handler.fn( keyData );

			if( handler.once ) {
				toRemove.add( handler );
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


/***************************************************************************************************
 * Input Commands
 **************************************************************************************************/


function startInput() {

	const screenData = m_inputData.screenData;

	// Create a background canvas
	const backCanvas = document.createElement( "canvas" );
	backCanvas.width = screenData.width;
	backCanvas.height = screenData.height;
	
	// Get the context for the background canvas
	const backContext = backCanvas.getContext( "2d" );

	// Copy the background image to the canvas
	screenData.api.render();
	backContext.drawImage( screenData.canvas, 0, 0 );

	// Save the background canvas to the input data
	m_inputData.backCanvas = backCanvas;
	m_inputData.backContext = backContext;

	// Add input event listerner
	commands.getApi().onkey( "any", "down", onInputKeyDown );

	// Add interval for blinking cursor
	m_inputData.interval = setInterval( showPrompt, 100 );

	// Show onscreen keyboard if requested
	if( m_inputData.onscreenKeyboard === "always" ) {
		const mode = m_inputData.isNumber ? "number" : "text";
		screenData.api.showKeyboard( mode );
	}
}

function onInputKeyDown( keyData ) {

	// Handle Enter Key - Complete Input
	if( keyData.key === "Enter" ) {
		finishInput();
		return;
	
	// Handle Escape - Cancel Input
	} else if( keyData.key === "Escape" ) {
		finishInput( true );
		return;
	
	// Handle Backspace - Erase last character
	} else if( keyData.key === "Backspace" ) {
		if( m_inputData.val.length > 0 ) {
			m_inputData.val = m_inputData.val.substring( 0, m_inputData.val.length - 1 );
		}
	
	// Handle single length keys
	} else if( keyData.key && keyData.key.length === 1 ) {

		let inputHandled = false;

		// Handle +/- numbers
		if( m_inputData.isNumber && m_inputData.allowNegative ) {

			// If user enters a "-" then insert "-" at the start
			if( keyData.key === "-" ) {
				if( m_inputData.val.charAt( 0 ) !== "-" ) {
					m_inputData.val = "-" + m_inputData.val;
				}
				inputHandled = true;
			
			// Any time the user enters a "+" key then replace the minus symbol
			} else if( keyData.key === "+" && m_inputData.val.charAt( 0 ) === "-" ) {
				m_inputData.val = m_inputData.val.substring( 1 );
				inputHandled = true;
			}
		}

		if( !inputHandled ) {
			m_inputData.val += keyData.key;

			// Make sure it's a valid number or valid integer
			if(
				( m_inputData.isNumber && isNaN( Number( m_inputData.val ) ) ) ||
				( m_inputData.isInteger && !Number.isInteger( Number( m_inputData.val ) ) )
			) {
				m_inputData.val = m_inputData.val.substring( 0, m_inputData.val.length - 1 );
			}
		}
	}
}

function showPrompt( hideCursorOverride ) {
	const screenData = m_inputData.screenData;
	let msg = m_inputData.prompt + m_inputData.val;

	// Blink cursor after every blink duration
	if( !hideCursorOverride ) {
		const now = Date.now();
		if( now - m_inputData.lastCursorBlink > CURSOR_BLINK ) {
			m_inputData.lastCursorBlink = now;
			m_inputData.showCursor = !m_inputData.showCursor;
		}

		// Show cursor if not hidden
		if( m_inputData.showCursor ) {
			msg += m_inputData.cursor;
		}
	}

	// Check if need to scroll first
	let pos = screenData.api.getPos();
	if( pos.row >= screenData.api.getRows() ) {
		screenData.api.print( "" );
		screenData.api.setPos( pos.col, pos.row - 1 );
		pos = screenData.api.getPos( screenData );
	}

	// Get the background pixels
	const posPx = screenData.api.getPosPx( screenData );
	const width = ( msg.length + 1 ) * screenData.font.width;
	const height = screenData.font.height;

	// Restore the background image over the prompt
	screenData.context.clearRect( posPx.x, posPx.y, width, height );
	screenData.context.drawImage(
		m_inputData.backCanvas,
		posPx.x, posPx.y, width, height,
		posPx.x, posPx.y, width, height
	);
	screenData.imageData = null;
	
	// Print the prompt + input + cursor
	screenData.api.print( msg, true );

	// Restore the cursor
	screenData.api.setPos( pos.col, pos.row );
}

function finishInput( isCancel ) {
	const screenData = m_inputData.screenData;

	// Hide onscreen keyboard if it was shown
	if( m_inputData.onscreenKeyboard !== "none" ) {
		screenData.api.hideKeyboard();
	}

	// Remove input key handler
	commands.getApi().offkey( "any", "down", onInputKeyDown );

	// Show prompt on complete, without the cursor
	showPrompt( true );

	// Move cursor down one line
	screenData.printCursor.y += screenData.font.height;

	// Clear the interval
	clearInterval( m_inputData.interval );

	// Process Input Value
	let val = m_inputData.val;
	if( m_inputData.isNumber ) {
		if( val === "" || val === "-" ) {
			val = 0;
		} else {
			val = Number( val );
			if( m_inputData.isInteger ) {
				val = Math.floor( val );
			}
		}
	}

	// Clear out the inputData
	const tempInputData = m_inputData;
	m_inputData = null;

	// Handle cancel input
	if( isCancel ) {
		tempInputData.reject( val );
	
	// Handle successful input
	} else {
		tempInputData.resolve( val );

		// Callback function
		if( tempInputData.fn ) {
			tempInputData.fn( val );
		}
	}
}
