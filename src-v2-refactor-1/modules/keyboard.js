/**
 * Pi.js - Keyboard Input Module
 * 
 * Handles keyboard events, key state tracking, input buffer, and event listeners.
 * 
 * @module modules/keyboard
 */

"use strict";

export function init( pi ) {
	const piData = pi._.data;

	// Keyboard state
	let m_inKeys = {};  // Key by character
	let m_inKeyCodes = {};  // Key by .key property
	let m_inCodes = {};  // Key by .code property
	let m_inputs = [];  // Input buffer
	let m_inputIndex = 0;
	let m_onKeyEventListeners = {};
	let m_anyKeyEventListeners = {};
	let m_onKeyCombos = {};  // Key combination listeners
	let m_isKeyEventsActive = false;
	let m_inputFocus = null;
	let m_preventKeys = {};

	// Input command state
	let m_inputQueue = [];  // Queue of active input requests
	let m_inputQueueIndex = 0;
	let m_promptInterval = null;
	let m_promptBlink = false;
	let m_promptLastTime = 0;
	let m_promptBackground = null;
	let m_promptBackgroundWidth = 0;

	// Keyboard started flag
	let m_keyboardStarted = false;

	// STARTKEYBOARD - Start keyboard event listeners
	pi._.addCommand( "startKeyboard", startKeyboard, false, false, [] );

	function startKeyboard() {
		if( m_keyboardStarted ) {
			return;
		}

		const target = m_inputFocus || piData.defaultInputFocus || window;

		if( !target ) {
			return;
		}

		target.addEventListener( "keydown", onKeyDown );
		target.addEventListener( "keyup", onKeyUp );
		target.addEventListener( "blur", clearPressedKeys );

		m_keyboardStarted = true;
	}

	// STOPKEYBOARD - Stop keyboard event listeners
	pi._.addCommand( "stopKeyboard", stopKeyboard, false, false, [] );

	function stopKeyboard() {

		// Clear all keyboard state
		m_inKeys = {};
		m_inKeyCodes = {};
		m_inCodes = {};
		m_inputs = [];
		m_onkeyListeners = {};
		m_onKeyCombos = {};

		if( !m_keyboardStarted ) {
			return;
		}

		const target = m_inputFocus || piData.defaultInputFocus || window;

		if( target ) {
			target.removeEventListener( "keydown", onKeyDown );
			target.removeEventListener( "keyup", onKeyUp );
			target.removeEventListener( "blur", clearPressedKeys );
		}

		m_keyboardStarted = false;
	}

	function onKeyDown( e ) {
		const key = e.key;
		const code = e.code;
		const keyCode = e.keyCode;
		const keyData = {
			"key": e.key,
			"location": e.location,
			"code": e.code,
			"keyCode": e.keyCode
		};

		// Track key state
		m_inKeys[ key ] = keyData;
		m_inKeyCodes[ keyCode ] = keyData;
		m_inCodes[ code ] = keyData;

		m_inputs.push( keyData );

		// Prevent default for registered keys
		if( m_preventKeys[ key ] || m_preventKeys[ code ] || m_preventKeys[ keyCode ] ) {
			e.preventDefault();
		}

		// Trigger event listeners
		if( m_isKeyEventsActive ) {
			triggerKeyEventListeners( "down", key, code );
		}
	}

	function onKeyUp( e ) {
		const key = e.key;
		const code = e.code;
		const keyCode = e.keyCode;

		// Clear key state
		m_inKeys[ key ] = false;
		m_inCodes[ code ] = false;
		m_inKeyCodes[ keyCode ] = false;

		// Trigger event listeners
		if( m_isKeyEventsActive ) {
			triggerKeyEventListeners( "up", key, code );
		}
	}

	function clearPressedKeys() {
		for( const i in m_inKeys ) {
			m_inKeys[ i ] = false;
		}
		for( const i in m_inKeyCodes ) {
			m_inKeyCodes[ i ] = false;
		}
		for( const i in m_inCodes ) {
			m_inCodes[ i ] = false;
		}
	}

	function triggerKeyEventListeners( mode, key, code ) {
		
		// Trigger listeners registered for the key character (e.g., "a", ";")
		const keyListeners = m_onKeyEventListeners[ key ];
		if( keyListeners && keyListeners[ mode ] ) {
			for( let i = keyListeners[ mode ].length - 1; i >= 0; i-- ) {
				const listener = keyListeners[ mode ][ i ];
				listener.fn( { "key": key, "code": code, "mode": mode } );
				if( listener.once ) {
					keyListeners[ mode ].splice( i, 1 );
				}
			}
		}

		// Trigger listeners registered for the code (e.g., "KeyA", "Semicolon")
		if( code && code !== key ) {
			const codeListeners = m_onKeyEventListeners[ code ];
			if( codeListeners && codeListeners[ mode ] ) {
				for( let i = codeListeners[ mode ].length - 1; i >= 0; i-- ) {
					const listener = codeListeners[ mode ][ i ];
					listener.fn( { "key": key, "code": code, "mode": mode } );
					if( listener.once ) {
						codeListeners[ mode ].splice( i, 1 );
					}
				}
			}
		}

		// Trigger "any key" listeners
		if( m_anyKeyEventListeners[ mode ] ) {
			for( let i = m_anyKeyEventListeners[ mode ].length - 1; i >= 0; i-- ) {
				const listener = m_anyKeyEventListeners[ mode ][ i ];
				listener.fn( { "key": key, "code": code, "mode": mode } );
				if( listener.once ) {
					m_anyKeyEventListeners[ mode ].splice( i, 1 );
				}
			}
		}
	}

	// INKEY - Get key state or input buffer
	pi._.addCommand( "inkey", inkey, false, false, [ "key" ] );

	function inkey( args ) {
		const key = args[ 0 ];

		// Activate key events
		startKeyboard();

		// If the key is provided then return the key status
		if( key != null ) {

			// Check by character first (e.g., "a", ";", ":")
			if( m_inKeys[ key ] ) {
				return m_inKeys[ key ];
			}

			// Then check by .key property
			if( m_inKeyCodes[ key ] ) {
				return m_inKeyCodes[ key ];
			}

			// Finally check by .code property (e.g., "KeyA", "Semicolon")
			return m_inCodes[ key ] || false;
		}

		// If no key is provided then return all keys pressed status
		const keysReturn = {};
		for( const i in m_inCodes ) {
			if( m_inCodes[ i ] ) {
				keysReturn[ i ] = m_inCodes[ i ];
			}
		}
		return keysReturn;
	}

	// ONKEY - Register key event listener
	pi._.addCommand( "onkey", onkey, false, false, [ "key", "mode", "fn", "once" ] );

	function onkey( args ) {
		const key = args[ 0 ];
		const mode = args[ 1 ] || "down";
		const fn = args[ 2 ];
		const once = !!args[ 3 ];

		startKeyboard();
		m_isKeyEventsActive = true;

		if( !pi.util.isFunction( fn ) ) {
			const error = new TypeError( "onkey: fn must be a function" );
			error.code = "INVALID_CALLBACK";
			throw error;
		}

		// Handle "any key" listeners
		if( key == null || key === "*" ) {
			if( !m_anyKeyEventListeners[ mode ] ) {
				m_anyKeyEventListeners[ mode ] = [];
			}
			m_anyKeyEventListeners[ mode ].push( { "fn": fn, "once": once } );
			return;
		}

		// Use key directly - can be a character ("a", ";") or code ("KeyA", "Semicolon")
		// Register under the key value provided
		if( !m_onKeyEventListeners[ key ] ) {
			m_onKeyEventListeners[ key ] = {};
		}
		if( !m_onKeyEventListeners[ key ][ mode ] ) {
			m_onKeyEventListeners[ key ][ mode ] = [];
		}

		m_onKeyEventListeners[ key ][ mode ].push( { "fn": fn, "once": once } );
	}

	// OFFKEY - Remove key event listener
	pi._.addCommand( "offkey", offkey, false, false, [ "key", "mode", "fn" ] );

	function offkey( args ) {
		const key = args[ 0 ];
		const mode = args[ 1 ] || "down";
		const fn = args[ 2 ];

		// Remove "any key" listeners
		if( key == null || key === "*" ) {
			if( m_anyKeyEventListeners[ mode ] ) {
				if( fn ) {
					m_anyKeyEventListeners[ mode ] = m_anyKeyEventListeners[ mode ].filter(
						listener => listener.fn !== fn
					);
				} else {
					m_anyKeyEventListeners[ mode ] = [];
				}
			}
			return;
		}

		// Remove listener registered under this key
		if( m_onKeyEventListeners[ key ] && m_onKeyEventListeners[ key ][ mode ] ) {
			if( fn ) {
				m_onKeyEventListeners[ key ][ mode ] = 
					m_onKeyEventListeners[ key ][ mode ].filter(
						listener => listener.fn !== fn
					);
			} else {
				m_onKeyEventListeners[ key ][ mode ] = [];
			}
		}
	}

	// PREVENTKEY - Prevent default browser behavior for key
	pi._.addCommand( "preventKey", preventKey, false, false, [ "key", "isPrevent" ] );

	function preventKey( args ) {
		const key = args[ 0 ];
		const isPrevent = args[ 1 ] !== false;

		if( isPrevent ) {
			m_preventKeys[ key ] = true;
		} else {
			delete m_preventKeys[ key ];
		}
	}

	// CLEARKEYS - Clear all key states
	pi._.addCommand( "clearKeys", clearKeys, false, false, [] );

	function clearKeys() {
		m_inKeys = {};
		m_inKeyCodes = {};
		m_inCodes = {};
		m_inputs = [];
		m_inputIndex = 0;
	}

	// REINIT KEYBOARD - Reinitialize keyboard with new focus element
	pi._.addCommand( "reinitKeyboard", reinitKeyboard, true, false );

	function reinitKeyboard() {
		if( m_keyboardStarted ) {
			stopKeyboard();
			m_inputFocus = piData.defaultInputFocus;
			startKeyboard();
		}
	}

	// SETINPUTFOCUS - Set input focus element
	pi._.addCommand( "setInputFocus", setInputFocus, false, true, [ "element" ] );

	function setInputFocus( screenData, args ) {
		let element = args[ 0 ];

		if( typeof element === "string" ) {
			element = document.getElementById( element );
		}

		if( !element || !pi.util.canAddEventListeners( element ) ) {
			const error = new TypeError(
				"setInputFocus: Invalid element."
			);
			error.code = "INVALID_ELEMENT";
			throw error;
		}

		m_inputFocus = element;

		// Reinitialize keyboard if already started
		if( m_keyboardStarted ) {
			stopKeyboard();
			startKeyboard();
		}
	}

	// ONKEYCOMBO - Register key combination listener
	pi._.addCommand( "onkeyCombo", onkeyCombo, false, false, [ "keys", "fn", "once" ] );

	function onkeyCombo( args ) {
		const keys = args[ 0 ];
		const fn = args[ 1 ];
		const once = !!args[ 2 ];

		if( !pi.util.isArray( keys ) || keys.length === 0 ) {
			const error = new TypeError( "onkeyCombo: keys must be a non-empty array" );
			error.code = "INVALID_KEYS";
			throw error;
		}

		if( !pi.util.isFunction( fn ) ) {
			const error = new TypeError( "onkeyCombo: fn must be a function" );
			error.code = "INVALID_CALLBACK";
			throw error;
		}

		const comboId = keys.join( "+" );
		const allKeys = [];

		const comboData = {
			"keys": keys.slice(),
			"keyData": [],
			"fn": fn,
			"allKeys": allKeys,
			"once": once
		};

		// If the key combo doesn't exist add it
		if( !m_onKeyCombos[ comboId ] ) {
			m_onKeyCombos[ comboId ] = [];
		}
		m_onKeyCombos[ comboId ].push( comboData );

		for( let i = 0; i < keys.length; i++ ) {
			addKeyCombo( keys[ i ], i, allKeys, fn, once, comboData );
		}
	}

	function addKeyCombo( key, i, allKeys, fn, once, comboData ) {

		// Store the functions so we can run offkeyCombo later
		comboData.keyData.push( {
			"key": key,
			"keyComboDown": keyComboDown,
			"keyComboUp": keyComboUp
		} );

		// Default state is not pressed
		allKeys.push( false );

		// On key down
		onkey( [ key, "down", keyComboDown, false ] );

		// On key up
		onkey( [ key, "up", keyComboUp, false ] );

		function keyComboDown( e ) {
			allKeys[ i ] = true;
			if( allKeys.indexOf( false ) === -1 ) {
				if( once ) {
					offkey( [ key, "down", keyComboDown ] );
					offkey( [ key, "up", keyComboUp ] );
				}
				fn( e );
			}
		}

		function keyComboUp( e ) {
			allKeys[ i ] = false;
		}
	}

	// OFFKEYCOMBO - Remove key combination listener
	pi._.addCommand( "offkeyCombo", offkeyCombo, false, false, [ "keys", "fn" ] );

	function offkeyCombo( args ) {
		const keys = args[ 0 ];
		const fn = args[ 1 ];

		if( !pi.util.isArray( keys ) ) {
			return;
		}

		const comboId = keys.join( "+" );

		if( !m_onKeyCombos[ comboId ] ) {
			return;
		}

		for( let i = m_onKeyCombos[ comboId ].length - 1; i >= 0; i-- ) {
			const combo = m_onKeyCombos[ comboId ][ i ];

			if( !fn || combo.fn === fn ) {

				// Remove all individual key listeners for this combo
				for( let j = 0; j < combo.keyData.length; j++ ) {
					const kd = combo.keyData[ j ];
					offkey( [ kd.key, "down", kd.keyComboDown ] );
					offkey( [ kd.key, "up", kd.keyComboUp ] );
				}

				m_onKeyCombos[ comboId ].splice( i, 1 );
			}
		}

		if( m_onKeyCombos[ comboId ].length === 0 ) {
			delete m_onKeyCombos[ comboId ];
		}
	}

	// INPUT - Get user text input with prompt
	pi._.addCommand( "input", input, false, true, [
		"prompt", "callback", "isNumber", "isInteger", "allowNegative"
	] );

	function input( screenData, args ) {
		const prompt = args[ 0 ] || "";
		const callback = args[ 1 ];
		const isNumber = !!args[ 2 ];
		const isInteger = !!args[ 3 ];
		const allowNegative = args[ 4 ] !== false;

		if( typeof prompt !== "string" ) {
			const error = new TypeError( "input: prompt must be a string" );
			error.code = "INVALID_PROMPT";
			throw error;
		}

		if( callback != null && !pi.util.isFunction( callback ) ) {
			const error = new TypeError( "input: callback must be a function" );
			error.code = "INVALID_CALLBACK";
			throw error;
		}

		// Create promise for async/await support
		let resolvePromise, rejectPromise;
		const promise = new Promise( ( resolve, reject ) => {
			resolvePromise = resolve;
			rejectPromise = reject;
		} );

		const inputData = {
			"prompt": prompt,
			"isNumber": isNumber,
			"isInteger": isInteger,
			"allowNegative": allowNegative,
			"val": "",
			"callback": callback,
			"resolve": resolvePromise,
			"reject": rejectPromise,
			"screenData": screenData
		};

		m_inputQueue.push( inputData );

		// Start input collection if this is the first input
		if( m_inputQueue.length === 1 ) {
			startInputCollection();
		}

		return promise;
	}

	function startInputCollection() {
		startKeyboard();

		const input = m_inputQueue[ m_inputQueueIndex ];
		if( !input ) {
			return;
		}

		// Reset blinking cursor state
		m_promptLastTime = Date.now();
		m_promptBackground = null;
		m_promptBackgroundWidth = 0;

		// Start blinking cursor interval
		if( !m_promptInterval ) {
			m_promptInterval = setInterval( showPrompt, 100 );
		}

		// Listen for keyboard input
		onkey( [ null, "down", collectInput, false ] );
	}

	function collectInput( event ) {
		const input = m_inputQueue[ m_inputQueueIndex ];
		if( !input ) {
			return;
		}

		let removeLastChar = false;

		if( event.key === "Enter" ) {

			// Enter key pressed - finish input
			finishInput( input );

		} else if( event.key === "Backspace" ) {

			// Backspace - remove last character
			if( input.val.length > 0 ) {
				input.val = input.val.substring( 0, input.val.length - 1 );
			}

		} else if( event.key && event.key.length === 1 ) {

			// Handle +/- for numbers
			if( input.isNumber && input.allowNegative ) {
				if( event.key === "-" && input.val.length === 0 ) {
					input.val = "-";
					return;
				} else if( event.key === "+" && input.val.charAt( 0 ) === "-" ) {
					input.val = input.val.substring( 1 );
					return;
				}
			}

			// Add character
			input.val += event.key;

			// Validate number input
			if( input.isNumber ) {
				if( isNaN( Number( input.val ) ) ) {
					removeLastChar = true;
				} else if( input.isInteger && event.key === "." ) {
					removeLastChar = true;
				}
			}
		}

		// Remove invalid character
		if( removeLastChar ) {
			input.val = input.val.substring( 0, input.val.length - 1 );
		}

		// Update display
		showPrompt();
	}

	function showPrompt( hideCursor ) {
		if( m_inputQueue.length === 0 || m_inputQueueIndex >= m_inputQueue.length ) {
			return;
		}

		const input = m_inputQueue[ m_inputQueueIndex ];
		const screenData = input.screenData;

		// Build message
		let msg = input.prompt + input.val;

		// Blink cursor every half second
		const now = Date.now();
		if( now - m_promptLastTime > 500 ) {
			m_promptBlink = !m_promptBlink;
			m_promptLastTime = now;
		}

		if( m_promptBlink && !hideCursor ) {
			msg += screenData.printCursor.prompt;
		}

		// Check if need to scroll first
		let pos = piData.commands.getPos( screenData );
		if( pos.row >= piData.commands.getRows( screenData ) ) {
			piData.commands.print( screenData, [ "", false ] );
			piData.commands.setPos( screenData, [ pos.col, pos.row - 1 ] );
			pos = piData.commands.getPos( screenData );
		}

		// Get the background pixels
		const posPx = piData.commands.getPosPx( screenData );
		const width = ( msg.length + 1 ) * screenData.printCursor.font.width;
		const height = screenData.printCursor.font.height;

		// If there is no background, save it
		if( !m_promptBackground ) {
			m_promptBackground = piData.commands.get( screenData,
				[ posPx.x, posPx.y, posPx.x + width, posPx.y + height ]
			);
		} else if( m_promptBackgroundWidth < width ) {

			// We have a background but we need a bigger background
			piData.commands.put( screenData,
				[ m_promptBackground, posPx.x, posPx.y, true ]
			);
			m_promptBackground = piData.commands.get( screenData,
				[ posPx.x, posPx.y, posPx.x + width, posPx.y + height ]
			);
		} else {

			// Restore the background
			piData.commands.put( screenData,
				[ m_promptBackground, posPx.x, posPx.y, true ]
			);
		}

		// Store the background width for later use
		m_promptBackgroundWidth = width;

		// Print the prompt + input + cursor
		piData.commands.print( screenData, [ msg, true ] );

		// Reset cursor position
		piData.commands.setPos( screenData, [ pos.col, pos.row ] );

		piData.commands.render( screenData );
	}

	function finishInput( input ) {

		// Show prompt one last time without cursor
		showPrompt( true );

		// Stop blinking cursor
		if( m_promptInterval ) {
			clearInterval( m_promptInterval );
			m_promptInterval = null;
		}

		// Clear background
		m_promptBackground = null;
		m_promptBackgroundWidth = 0;

		// Remove input listener
		offkey( [ null, "down", collectInput ] );

		// Process and validate input
		processInputValue( input );

		// Print newline
		piData.commands.print( input.screenData, [ "" ] );

		// Call callback if provided
		if( input.callback ) {
			input.callback( input.val );
		}

		// Resolve promise
		input.resolve( input.val );

		// Move to next input in queue
		m_inputQueueIndex++;
		if( m_inputQueueIndex >= m_inputQueue.length ) {
			m_inputQueue = [];
			m_inputQueueIndex = 0;
		} else {
			startInputCollection();
		}
	}

	function processInputValue( input ) {
		if( input.isNumber ) {
			if( input.val === "" || input.val === "-" ) {
				input.val = 0;
			} else {
				input.val = Number( input.val );
				if( input.isInteger ) {
					input.val = Math.floor( input.val );
				}
			}
		}
	}

	// CANCELINPUT - Cancel active input request
	pi._.addCommand( "cancelInput", cancelInput, false, true, [] );

	function cancelInput( screenData ) {

		// Clear all inputs
		for( let i = m_inputQueue.length - 1; i >= 0; i-- ) {
			if( m_inputQueue[ i ].screenData === screenData ) {
				m_inputQueue[ i ].reject( new Error( "Input cancelled" ) );
				m_inputQueue.splice( i, 1 );
			}
		}

		// Stop prompt interval
		if( m_promptInterval ) {
			clearInterval( m_promptInterval );
			m_promptInterval = null;
		}

		// Remove input listener
		offkey( [ null, "down", collectInput ] );

		m_inputQueueIndex = 0;
	}

	// SETINPUTCURSOR - Set the cursor character for input prompt
	pi._.addCommand( "setInputCursor", setInputCursor, false, true, [ "cursor" ] );
	pi._.addSetting( "inputCursor", setInputCursor, true, [ "cursor" ] );

	function setInputCursor( screenData, args ) {
		let cursor = args[ 0 ];

		if( pi.util.isInteger( cursor ) ) {
			cursor = String.fromCharCode( cursor );
		}

		if( typeof cursor !== "string" ) {
			const error = new TypeError( "setInputCursor: cursor must be a string or integer" );
			error.code = "INVALID_CURSOR";
			throw error;
		}

		const font = screenData.printCursor.font;

		if( font.mode === "pixel" ) {
			// Check if character exists in pixel font charset
			if( font.charset ) {
				let badChar = true;
				for( let i = 0; i < font.charset.length; i++ ) {
					if( font.charset.charAt( i ) === cursor ) {
						badChar = false;
						break;
					}
				}

				if( badChar ) {
					console.warn(
						`setInputCursor: cursor "${cursor}" not found in current font charset`
					);
					return;
				}
			}
		}

		screenData.printCursor.prompt = cursor;
	}
}

