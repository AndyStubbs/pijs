/**
 * Pi.js - Keyboard Input Module
 * 
 * Handles keyboard events, key state tracking, input buffer, and event listeners.
 * 
 * @module modules/keyboard
 */

export function init( pi ) {
	const piData = pi._.data;

	// Keyboard state
	let m_keys = {};  // Key by character
	let m_keyKeys = {};  // Key by .key property
	let m_keyCodes = {};  // Key by .code property
	let m_inputs = [];  // Input buffer
	let m_inputIndex = 0;
	let m_onKeyEventListeners = {};
	let m_anyKeyEventListeners = {};
	let m_isKeyEventsActive = false;
	let m_inputFocus = null;
	let m_preventKeys = {};

	// Keyboard started flag
	let keyboardStarted = false;

	function startKeyboard() {
		if( keyboardStarted ) {
			return;
		}

		const target = m_inputFocus || piData.defaultInputFocus || window;

		if( !target ) {
			return;
		}

		target.addEventListener( "keydown", onKeyDown );
		target.addEventListener( "keyup", onKeyUp );
		target.addEventListener( "blur", clearPressedKeys );

		keyboardStarted = true;
	}

	function stopKeyboard() {
		if( !keyboardStarted ) {
			return;
		}

		const target = m_inputFocus || piData.defaultInputFocus || window;

		if( target ) {
			target.removeEventListener( "keydown", onKeyDown );
			target.removeEventListener( "keyup", onKeyUp );
			target.removeEventListener( "blur", clearPressedKeys );
		}

		keyboardStarted = false;
	}

	function onKeyDown( e ) {
		const key = e.key;
		const code = e.code;

		// Track key state
		if( key ) {
			m_keys[ key ] = true;
			m_keyKeys[ key ] = true;
		}
		if( code ) {
			m_keyCodes[ code ] = true;
		}

		// Add to input buffer if it's a printable character
		if( key && key.length === 1 ) {
			m_inputs.push( key );
		} else if( key === "Enter" ) {
			m_inputs.push( "\n" );
		} else if( key === "Backspace" ) {
			m_inputs.push( "\b" );
		} else if( key === "Tab" ) {
			m_inputs.push( "\t" );
		}

		// Prevent default for registered keys
		if( m_preventKeys[ key ] || m_preventKeys[ code ] ) {
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

		// Clear key state
		if( key ) {
			m_keys[ key ] = false;
			m_keyKeys[ key ] = false;
		}
		if( code ) {
			m_keyCodes[ code ] = false;
		}

		// Trigger event listeners
		if( m_isKeyEventsActive ) {
			triggerKeyEventListeners( "up", key, code );
		}
	}

	function clearPressedKeys() {
		for( const i in m_keys ) {
			m_keys[ i ] = false;
		}
		for( const i in m_keyKeys ) {
			m_keyKeys[ i ] = false;
		}
		for( const i in m_keyCodes ) {
			m_keyCodes[ i ] = false;
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
			if( m_keys[ key ] ) {
				return m_keys[ key ];
			}
			// Then check by .key property
			if( m_keyKeys[ key ] ) {
				return m_keyKeys[ key ];
			}
			// Finally check by .code property (e.g., "KeyA", "Semicolon")
			return m_keyCodes[ key ] || false;
		}

		// If no key is provided then return next key from input buffer
		if( m_inputs.length > 0 ) {
			return m_inputs.shift();
		}

		return "";
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
		m_keys = {};
		m_keyKeys = {};
		m_keyCodes = {};
		m_inputs = [];
		m_inputIndex = 0;
	}

	// REINIT KEYBOARD - Reinitialize keyboard with new focus element
	pi._.addCommand( "reinitKeyboard", reinitKeyboard, true, false );

	function reinitKeyboard() {
		if( keyboardStarted ) {
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
		if( keyboardStarted ) {
			stopKeyboard();
			startKeyboard();
		}
	}
}

