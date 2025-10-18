/**
 * Onscreen Keyboard Plugin for Pi.js
 * 
 * Provides an onscreen keyboard for touch devices and accessibility.
 * Renders a virtual keyboard and simulates keystrokes.
 * 
 * @module plugins/onscreen-keyboard
 */

"use strict";

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
	"startPosPx": null,
	"startPos": null,
	"inputMode": "text",
	"activeKeys": new Map(),
	"highlightedKeys": new Set(),
	"toggledKeys": new Set()
};

export default function onscreenKeyboardPlugin( pluginApi ) {

	// Add screen cleanup function
	pluginApi.addScreenCleanupFunction( cleanupScreen );

	// Add showKeyboard command
	pluginApi.addScreenCommand( "showKeyboard", showKeyboard, [ "mode" ] );
	function showKeyboard( screenData, options ) {
		const mode = options.mode || "text";

		if( mode !== "text" && mode !== "number" ) {
			const error = new TypeError( "showKeyboard: mode must be 'text' or 'number'." );
			error.code = "INVALID_MODE";
			throw error;
		}

		// Check if printTable is available (required dependency)
		if( !screenData.api.printTable || typeof screenData.api.printTable !== "function" ) {
			const error = new Error(
				"showKeyboard: Requires the 'print-table' plugin. " +
				"Load print-table plugin before onscreen-keyboard."
			);
			error.code = "MISSING_DEPENDENCY";
			throw error;
		}

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

		// Move to keyboard position (below current line) and save start position
		const pos = screenData.api.getPos();
		pos.row += 1;
		screenData.api.setPos( 0, pos.row );
		m_keyboardState.startPos = pos;

		// Set keyboard initial pixel position
		const posPx = screenData.api.getPosPx();
		m_keyboardState.startPosPx = posPx;

		// Restore original position
		screenData.api.setPos( pos.col, pos.row - 1 );

		renderKeyboard();
		m_keyboardState.isVisible = true;
	}

	// Add hideKeyboard command
	pluginApi.addScreenCommand( "hideKeyboard", hideKeyboard, [] );

	function hideKeyboard( screenData ) {
		if( !m_keyboardState.isVisible || m_keyboardState.screenData !== screenData ) {
			return;
		}

		if( m_keyboardState.background && m_keyboardState.startPosPx ) {
			const pos = m_keyboardState.startPosPx;

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
		m_keyboardState.startPosPx = null;
		m_keyboardState.screenData = null;
	}

	/***************************************************************************************************
	 * Internal Commands
	 **************************************************************************************************/

	function renderKeyboard() {
		const screenData = m_keyboardState.screenData;
		const layout = m_keyboardState.layout;
		const format = KEYBOARD_FORMATS[ m_keyboardState.format ];

		// Calculate dimensions
		const font = screenData.font;
		const { x, y } = m_keyboardState.startPosPx;
		const width = format[ 0 ].length * font.width;
		const height = format.length * font.height;

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

		// Get the current screen position
		const pos = screenData.api.getPos();

		// Set the position to the original start position
		const startPos = m_keyboardState.startPos;
		screenData.api.setPos( startPos.col, startPos.row );

		// Print the keyboard using table
		const hitBoxes = screenData.api.printTable( displayKeys, format );

		// Restore the position to the start position
		screenData.api.setPos( pos.col, pos.row );

		// Only setup events if this is the first render (hitBoxes was null)
		const isFirstRender = m_keyboardState.hitBoxes === null;

		// Store hitboxes
		m_keyboardState.hitBoxes = hitBoxes;

		// Setup events only on first render
		if( isFirstRender ) {
			setupKeyboardEvents( hitBoxes );
		}

		// Redraw highlights for currently pressed keys
		redrawHighlights();
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

		const screenData = m_keyboardState.screenData;

		// Add global move handler to detect key presses via movement
		screenData.api.onpress( "move", onKeyboardMove, false );

		// Add down handler to start tracking
		screenData.api.onpress( "down", onKeyboardDown, false );

		// Add up handler to release all keys
		screenData.api.onpress( "up", onKeyboardUp, false );
	}

	function clearKeyboardEvents() {
		if( !m_keyboardState.screenData ) {
			return;
		}

		const screenData = m_keyboardState.screenData;

		// Remove event handlers
		screenData.api.offpress( "move", onKeyboardMove );
		screenData.api.offpress( "down", onKeyboardDown );
		screenData.api.offpress( "up", onKeyboardUp );

		// Release all active keys
		for( const [ index, keyEvent ] of m_keyboardState.activeKeys ) {
			simulateKeyRelease( keyEvent );
		}
		m_keyboardState.activeKeys.clear();
		m_keyboardState.highlightedKeys.clear();
	}

	function onKeyboardDown( data ) {

		// Immediately check if press is on a key and activate it
		onKeyboardMove( data );
	}

	function onKeyboardUp( data ) {

		// Release all active keys
		const keysToRelease = Array.from( m_keyboardState.activeKeys.keys() );

		for( const index of keysToRelease ) {
			const keyEvent = m_keyboardState.activeKeys.get( index );
			if( keyEvent ) {
				simulateKeyRelease( keyEvent );
				m_keyboardState.activeKeys.delete( index );
			}
			m_keyboardState.highlightedKeys.delete( index );
		}

		// Clear toggled keys when all presses are released
		m_keyboardState.toggledKeys.clear();

		// Redraw keyboard if any keys were released
		if( keysToRelease.length > 0 ) {
			renderKeyboard();
		}
	}

	function pressKey( index ) {
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

			// Only toggle if not already toggled during this press
			if( !m_keyboardState.toggledKeys.has( index ) ) {
				m_keyboardState.toggledKeys.add( index );

				if( m_keyboardState.isLowerCase ) {
					m_keyboardState.layout = "uppercase";
					m_keyboardState.isLowerCase = false;
				} else {
					m_keyboardState.layout = "lowercase";
					m_keyboardState.isLowerCase = true;
				}

				// Add to highlighted and active keys for visual feedback
				m_keyboardState.highlightedKeys.add( index );
				m_keyboardState.activeKeys.set( index, null );

				renderKeyboard();
			}
			return;

		} else if( keyValue === "SYMBOLS" ) {

			// Only toggle if not already toggled during this press
			if( !m_keyboardState.toggledKeys.has( index ) ) {
				m_keyboardState.toggledKeys.add( index );

				if( m_keyboardState.layout === "symbol" ) {
					m_keyboardState.layout = m_keyboardState.isLowerCase ? "lowercase" : "uppercase";
				} else {
					m_keyboardState.layout = "symbol";
				}

				// Add to highlighted and active keys for visual feedback
				m_keyboardState.highlightedKeys.add( index );
				m_keyboardState.activeKeys.set( index, null );

				renderKeyboard();
			}
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

		// Trigger the key down event
		if( keyEvent ) {
			simulateKeystroke( keyEvent );

			// Store the active key for later release
			m_keyboardState.activeKeys.set( index, keyEvent );
		}

		// Add to highlighted keys and draw highlight
		m_keyboardState.highlightedKeys.add( index );
		drawKeyHighlight( index );
	}

	function releaseKey( index ) {

		// Get the key event that was pressed
		const keyEvent = m_keyboardState.activeKeys.get( index );

		if( keyEvent ) {

			// Trigger key up event (only for regular keys, not toggle keys)
			simulateKeyRelease( keyEvent );
		}

		// Remove from active keys and highlights
		m_keyboardState.activeKeys.delete( index );
		m_keyboardState.highlightedKeys.delete( index );
	}

	function onKeyboardMove( data ) {

		const screenData = m_keyboardState.screenData;
		const hitBoxes = m_keyboardState.hitBoxes;
		const pressData = screenData.api.inpress();

		// Get all current touches/presses
		const activePresses = [];

		// Check mouse press
		if( pressData.buttons > 0 && pressData.type !== "touch" ) {
			activePresses.push( { "x": pressData.x, "y": pressData.y } );
		}

		// Check touch presses
		if( pressData.touches && pressData.touches.length > 0 ) {
			for( const touch of pressData.touches ) {
				if( touch.action !== "up" ) {
					activePresses.push( { "x": touch.x, "y": touch.y } );
				}
			}
		}

		// Track which keys should be active based on current presses
		const keysUnderPress = new Set();

		for( const press of activePresses ) {
			for( let i = 0; i < hitBoxes.length; i++ ) {
				const hitBox = hitBoxes[ i ].pixels;

				// Check if press is over this key
				if(
					press.x >= hitBox.x &&
					press.x < hitBox.x + hitBox.width &&
					press.y >= hitBox.y &&
					press.y < hitBox.y + hitBox.height
				) {
					keysUnderPress.add( i );
					break; // Each press can only be on one key
				}
			}
		}

		let needsRedraw = false;

		// Activate keys that are being pressed but not yet active
		for( const index of keysUnderPress ) {
			if( !m_keyboardState.activeKeys.has( index ) ) {
				pressKey( index );
				needsRedraw = true;
			}
		}

		// Release keys that are no longer being pressed
		const keysToRelease = [];
		for( const [ index ] of m_keyboardState.activeKeys ) {
			if( !keysUnderPress.has( index ) ) {
				keysToRelease.push( index );
			}
		}

		for( const index of keysToRelease ) {
			releaseKey( index );
			needsRedraw = true;
		}

		// Redraw keyboard if any keys changed state
		if( needsRedraw ) {
			renderKeyboard();
		}
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

	function simulateKeyRelease( keyEvent ) {

		// Create a synthetic keyboard event that mimics a real keyup
		const syntheticEvent = new KeyboardEvent( "keyup", {
			"key": keyEvent.key,
			"code": keyEvent.code,
			"location": keyEvent.location,
			"altKey": keyEvent.altKey,
			"ctrlKey": keyEvent.ctrlKey,
			"metaKey": keyEvent.metaKey,
			"shiftKey": keyEvent.shiftKey,
			"repeat": false,
			"bubbles": true,
			"cancelable": true
		} );

		// Dispatch the event to trigger keyboard handlers
		window.dispatchEvent( syntheticEvent );
	}

	function drawKeyHighlight( index ) {
		if( !m_keyboardState.hitBoxes || !m_keyboardState.screenData ) {
			return;
		}

		const screenData = m_keyboardState.screenData;
		const pixels = m_keyboardState.hitBoxes[ index ].pixels;

		// Save current color
		const currentColor = screenData.color;

		// Draw highlight
		screenData.api.setColor( 15 );
		screenData.api.rect( pixels.x + 1, pixels.y, pixels.width, pixels.height + 1 );

		// Restore color
		screenData.api.setColor( currentColor.s );
	}

	function redrawHighlights() {
		if( !m_keyboardState.highlightedKeys || m_keyboardState.highlightedKeys.size === 0 ) {
			return;
		}

		// Redraw all highlighted keys
		for( const index of m_keyboardState.highlightedKeys ) {
			drawKeyHighlight( index );
		}
	}

	function cleanupScreen( screenData ) {
		if( m_keyboardState.screenData === screenData ) {

			// Release all active keys before cleanup
			for( const [ index, keyEvent ] of m_keyboardState.activeKeys ) {
				simulateKeyRelease( keyEvent );
			}
			m_keyboardState.activeKeys.clear();
			m_keyboardState.highlightedKeys.clear();
			m_keyboardState.toggledKeys.clear();

			m_keyboardState.isVisible = false;
			m_keyboardState.background = null;
			m_keyboardState.hitBoxes = null;
			m_keyboardState.startPosPx = null;
			m_keyboardState.screenData = null;
		}
	}
}

// Auto-register in IIFE mode
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "onscreen-keyboard",
		"version": "1.0.0",
		"description": "Onscreen keyboard for touch devices and accessibility",
		"init": onscreenKeyboardPlugin
	} );
}

