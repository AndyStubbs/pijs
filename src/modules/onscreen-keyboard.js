/**
 * Pi.js - Onscreen Keyboard Module
 * 
 * Provides an onscreen keyboard for touch devices and accessibility.
 * Renders a virtual keyboard and simulates keystrokes.
 * 
 * @module modules/onscreen-keyboard
 */

"use strict";

import * as commands from "../core/commands";
import * as screenManager from "../core/screen-manager";


const KEYBOARD_LAYOUTS = {
	"lowercase": [
		"1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "BS",
		"q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "CP",
		"a", "s", "d", "f", "g", "h", "j", "k", "l", "SY",
		"z", "x", "c", "SPACE", "v", "b", "n", "m", "ENTER"
	],
	"uppercase": [
		"1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "BS",
		"Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "CP2",
		"A", "S", "D", "F", "G", "H", "J", "K", "L", "SY",
		"Z", "X", "C", "SPACE", "V", "B", "N", "M", "ENTER"
	],
	"symbol": [
		"~", "!", "@", "#", "$", "%", "^", "&", "*", "|", "BS",
		"(", ")", "{", "}", "[", "]", "<", ">", "\\", "/", "CP",
		"`", "\"", "'", ",", ".", ";", ":", "?", "_", "CH",
		"+", "-", "NU", "NU", "NU", "NU", "NU", "NU", "ENTER"
	],
	"numbers": [
		"1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "BS",
		"PM", ".", "ENTER"
	]
};

const KEYBOARD_FORMATS = [
	[
		"*-*-*-*-*-*-*-*-*-*-*------*",
		"| | | | | | | | | | |      |",
		"*-*-*-*-*-*-*-*-*-*-*------*",
		"| | | | | | | | | | |      |",
		"*-*-*-*-*-*-*-*-*-*-*------*",
		"| | | | | | | | | |        |",
		"*-*-*-*-*-*-*-*-*-*-*------*",
		"| | | |     | | | | |      |",
		"*-*-*-*-----*-*-*-*-*------*"
	],
	[
		"*-*-*-*-*-*-*-*-*-*-*------*",
		"| | | | | | | | | | |      |",
		"*-*-*-*-*-*-*-*-*-*-*------*",
		"|     | |                  |",
		"*-----*-*------------------*"
	]
];

const KEY_LOOKUP = {
	"BS": { "val": String.fromCharCode( 27 ) + " BACK", "key": "Backspace", "code": "Backspace" },
	"CP": { "val": String.fromCharCode( 24 ) + " CAPS", "key": "CapsLock", "code": "CapsLock" },
	"CP2": { "val": String.fromCharCode( 25 ) + " CAPS", "key": "CapsLock", "code": "CapsLock" },
	"ENTER": {
		"val": String.fromCharCode( 17 ) + String.fromCharCode( 217 ) + "RET",
		"key": "Enter",
		"code": "Enter"
	},
	"SY": { "val": " SYMBOLS", "key": "SYMBOLS", "code": "SYMBOLS" },
	"CH": { "val": "   CHARS", "key": "SYMBOLS", "code": "SYMBOLS" },
	"NU": { "val": "", "key": "", "code": "" },
	"PM": { "val": "+/-", "key": "+/-", "code": "+/-" },
	"SPACE": { "val": "SPACE", "key": " ", "code": "Space" }
};

let m_keyboardState = {
	"layout": "lowercase",
	"format": 0,
	"isLowerCase": true,
	"background": null,
	"hitBoxes": null,
	"screenData": null,
	"isVisible": false,
	"startPos": null,
	"inputMode": "text"
};


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {

	// Add screen cleanup function
	screenManager.addScreenCleanupFunction( cleanupScreen );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


screenManager.addCommand( "showKeyboard", showKeyboard, [ "mode" ] );
function showKeyboard( screenData, options ) {
	const mode = options.mode || "text";

	if( mode !== "text" && mode !== "number" ) {
		const error = new TypeError( "showKeyboard: mode must be 'text' or 'number'." );
		error.code = "INVALID_MODE";
		throw error;
	}

	// TODO: Keyboard should remember staring position and not move if printCursor moves.

	// Store keyboard state
	m_keyboardState.screenData = screenData;
	m_keyboardState.inputMode = mode;

	// Set layout based on mode
	if( mode === "number" ) {
		m_keyboardState.layout = "numbers";
		m_keyboardState.format = 1;
	} else {
		m_keyboardState.layout = "lowercase";
		m_keyboardState.format = 0;
		m_keyboardState.isLowerCase = true;
	}

	renderKeyboard();
	m_keyboardState.isVisible = true;
}

screenManager.addCommand( "hideKeyboard", hideKeyboard, [] );
function hideKeyboard( screenData ) {
	if( !m_keyboardState.isVisible || m_keyboardState.screenData !== screenData ) {
		return;
	}

	if( m_keyboardState.background && m_keyboardState.startPos ) {
		const pos = m_keyboardState.startPos;

		// Restore background
		screenData.context.clearRect(
			pos.x, pos.y,
			m_keyboardState.background.width,
			m_keyboardState.background.height
		);
		screenData.context.drawImage( m_keyboardState.background, pos.x, pos.y );
		screenData.imageData = null;
		screenData.api.render();
	}

	// Clear event handlers
	clearKeyboardEvents();

	// Reset state
	m_keyboardState.isVisible = false;
	m_keyboardState.background = null;
	m_keyboardState.hitBoxes = null;
	m_keyboardState.startPos = null;
	m_keyboardState.screenData = null;
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


function renderKeyboard() {
	const screenData = m_keyboardState.screenData;
	const layout = m_keyboardState.layout;
	const format = KEYBOARD_FORMATS[ m_keyboardState.format ];

	// Get current position
	const pos = screenData.api.getPos();

	// Move to keyboard position (below current line)
	screenData.api.setPos( 0, pos.row + 1 );

	// Calculate dimensions
	const font = screenData.font;
	const keyboardPos = screenData.api.getPos();
	const x = keyboardPos.col * font.width;
	const y = keyboardPos.row * font.height;
	const width = format[ 0 ].length * font.width;
	const height = format.length * font.height;

	// Store start position
	m_keyboardState.startPos = { x, y };

	// Save background
	if( !m_keyboardState.background ) {
		const backCanvas = document.createElement( "canvas" );
		backCanvas.width = width;
		backCanvas.height = height;
		const backContext = backCanvas.getContext( "2d" );

		// Render current screen first
		screenData.api.render();
		backContext.drawImage(
			screenData.canvas,
			x, y, width, height,
			0, 0, width, height
		);

		m_keyboardState.background = backCanvas;
	} else {

		// Restore previous background before rendering new keyboard
		screenData.context.clearRect( x, y, width, height );
		screenData.context.drawImage( m_keyboardState.background, x, y );
		screenData.imageData = null;
	}

	// Build display keys array
	const displayKeys = buildDisplayKeys( layout );

	// Print the keyboard using table
	const hitBoxes = screenData.api.printTable( displayKeys, format );

	// Restore original position
	screenData.api.setPos( pos.col, pos.row );

	// Store hitboxes and setup events
	m_keyboardState.hitBoxes = hitBoxes;
	setupKeyboardEvents( hitBoxes );
}

function buildDisplayKeys( layout ) {
	const keys = KEYBOARD_LAYOUTS[ layout ];
	const displayKeys = [];

	for( let i = 0; i < keys.length; i++ ) {
		const key = keys[ i ];
		if( KEY_LOOKUP[ key ] ) {
			displayKeys.push( KEY_LOOKUP[ key ].val );
		} else {
			displayKeys.push( key );
		}
	}

	return displayKeys;
}

function setupKeyboardEvents( hitBoxes ) {

	// Clear any existing events first
	clearKeyboardEvents();

	const api = commands.getApi();

	// Add press events for each key
	for( let i = 0; i < hitBoxes.length; i++ ) {
		const screenData = m_keyboardState.screenData;
		screenData.api.onpress(
			"down", onKeyboardPress, false, hitBoxes[ i ].pixels, { "index": i }
		);
	}
}

function clearKeyboardEvents() {
	if( !m_keyboardState.hitBoxes || !m_keyboardState.screenData ) {
		return;
	}

	const screenData = m_keyboardState.screenData;
	const hitBoxes = m_keyboardState.hitBoxes;

	for( let i = 0; i < hitBoxes.length; i++ ) {
		screenData.api.offpress( "down", onKeyboardPress );
	}
}

function onKeyboardPress( data, customData ) {
	const index = customData.index;
	const layout = m_keyboardState.layout;
	const keys = KEYBOARD_LAYOUTS[ layout ];
	let keyValue = keys[ index ];
	let keyCode = keyValue;
	let keyEvent = null;

	// Look up special keys
	if( KEY_LOOKUP[ keyValue ] ) {
		const lookup = KEY_LOOKUP[ keyValue ];
		keyCode = lookup.code;
		keyValue = lookup.key;
	}

	// Handle special keys
	if( keyValue === "CapsLock" ) {
		if( m_keyboardState.isLowerCase ) {
			m_keyboardState.layout = "uppercase";
			m_keyboardState.isLowerCase = false;
		} else {
			m_keyboardState.layout = "lowercase";
			m_keyboardState.isLowerCase = true;
		}
		renderKeyboard();
		highlightKey( customData.index );
		return;

	} else if( keyValue === "SYMBOLS" ) {
		if( m_keyboardState.layout === "symbol" ) {
			m_keyboardState.layout = m_keyboardState.isLowerCase ? "lowercase" : "uppercase";
		} else {
			m_keyboardState.layout = "symbol";
		}
		renderKeyboard();
		highlightKey( customData.index );
		return;

	} else if( keyValue === "+/-" ) {

		// Toggle plus/minus - simulate minus or plus key
		keyEvent = createKeyEvent( "-", "Minus" );

	} else if( keyValue === "" ) {

		// Empty key - do nothing
		return;

	} else {

		// Regular key - simulate keystroke
		keyEvent = createKeyEvent( keyValue, keyCode );
	}

	// Trigger the key event
	if( keyEvent ) {
		simulateKeystroke( keyEvent );
	}

	// Highlight the pressed key
	highlightKey( customData.index );
}

function createKeyEvent( key, code ) {
	return {
		"key": key,
		"code": code,
		"location": 0,
		"altKey": false,
		"ctrlKey": false,
		"metaKey": false,
		"shiftKey": false,
		"repeat": false
	};
}

function simulateKeystroke( keyEvent ) {

	// Create a synthetic keyboard event that mimics a real keydown
	const syntheticEvent = new KeyboardEvent( "keydown", {
		"key": keyEvent.key,
		"code": keyEvent.code,
		"location": keyEvent.location,
		"altKey": keyEvent.altKey,
		"ctrlKey": keyEvent.ctrlKey,
		"metaKey": keyEvent.metaKey,
		"shiftKey": keyEvent.shiftKey,
		"repeat": keyEvent.repeat,
		"bubbles": true,
		"cancelable": true
	} );

	// Dispatch the event to trigger keyboard handlers
	window.dispatchEvent( syntheticEvent );
}

function highlightKey( index ) {
	if( !m_keyboardState.hitBoxes || !m_keyboardState.screenData ) {
		return;
	}

	const screenData = m_keyboardState.screenData;
	const pixels = m_keyboardState.hitBoxes[ index ].pixels;

	// Save current color
	const currentColor = screenData.color;

	// Draw highlight
	screenData.api.setColor( 15 );
	screenData.api.rect( pixels.x, pixels.y, pixels.width + 1, pixels.height + 1 );

	// Restore color
	screenData.api.setColor( currentColor.s );

	// Re-render keyboard after short delay
	setTimeout( () => {
		if( m_keyboardState.isVisible ) {
			renderKeyboard();
		}
	}, 100 );
}

function cleanupScreen( screenData ) {
	if( m_keyboardState.screenData === screenData ) {
		m_keyboardState.isVisible = false;
		m_keyboardState.background = null;
		m_keyboardState.hitBoxes = null;
		m_keyboardState.startPos = null;
		m_keyboardState.screenData = null;
	}
}

