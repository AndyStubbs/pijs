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

	// Key lookup table (character/special key to code mapping)
	const m_keyLookup = buildKeyLookup();

	function buildKeyLookup() {
		return {
			"Alt_1": "AltLeft",
			"Alt_2": "AltRight",
			"ArrowDown_0": "ArrowDown",
			"ArrowLeft_0": "ArrowLeft",
			"ArrowRight_0": "ArrowRight",
			"ArrowUp_0": "ArrowUp",
			"\\_0": "Backslash",
			"|_0": "Backslash",
			"~_0": "Backquote",
			"`_0": "Backquote",
			"Backspace_0": "Backspace",
			"[_0": "BracketLeft",
			"{_0": "BracketLeft",
			"]_0": "BracketRight",
			"}_0": "BracketRight",
			"CapsLock_0": "CapsLock",
			"ContextMenu_0": "ContextMenu",
			"Control_1": "ControlLeft",
			"Control_2": "ControlRight",
			",_0": "Comma",
			"<_0": "Comma",
			"Delete_0": "Delete",
			")_0": "Digit0",
			"0_0": "Digit0",
			"1_0": "Digit1",
			"!_0": "Digit1",
			"2_0": "Digit2",
			"@_0": "Digit2",
			"3_0": "Digit3",
			"#_0": "Digit3",
			"4_0": "Digit4",
			"$_0": "Digit4",
			"5_0": "Digit5",
			"%_0": "Digit5",
			"6_0": "Digit6",
			"^_0": "Digit6",
			"7_0": "Digit7",
			"&_0": "Digit7",
			"8_0": "Digit8",
			"*_0": "Digit8",
			"9_0": "Digit9",
			"(_0": "Digit9",
			"End_0": "End",
			"Enter_0": "Enter",
			"+_0": "Equal",
			"=_0": "Equal",
			"Escape_0": "Escape",
			"F1_0": "F1",
			"F2_0": "F2",
			"F3_0": "F3",
			"F4_0": "F4",
			"F5_0": "F5",
			"F6_0": "F6",
			"F7_0": "F7",
			"F8_0": "F8",
			"F9_0": "F9",
			"F10_0": "F10",
			"F11_0": "F11",
			"F12_0": "F12",
			"Home_0": "Home",
			"Insert_0": "Insert",
			"a_0": "KeyA", "A_0": "KeyA",
			"b_0": "KeyB", "B_0": "KeyB",
			"c_0": "KeyC", "C_0": "KeyC",
			"d_0": "KeyD", "D_0": "KeyD",
			"e_0": "KeyE", "E_0": "KeyE",
			"f_0": "KeyF", "F_0": "KeyF",
			"g_0": "KeyG", "G_0": "KeyG",
			"h_0": "KeyH", "H_0": "KeyH",
			"i_0": "KeyI", "I_0": "KeyI",
			"j_0": "KeyJ", "J_0": "KeyJ",
			"k_0": "KeyK", "K_0": "KeyK",
			"l_0": "KeyL", "L_0": "KeyL",
			"m_0": "KeyM", "M_0": "KeyM",
			"n_0": "KeyN", "N_0": "KeyN",
			"o_0": "KeyO", "O_0": "KeyO",
			"p_0": "KeyP", "P_0": "KeyP",
			"q_0": "KeyQ", "Q_0": "KeyQ",
			"r_0": "KeyR", "R_0": "KeyR",
			"s_0": "KeyS", "S_0": "KeyS",
			"t_0": "KeyT", "T_0": "KeyT",
			"u_0": "KeyU", "U_0": "KeyU",
			"v_0": "KeyV", "V_0": "KeyV",
			"w_0": "KeyW", "W_0": "KeyW",
			"x_0": "KeyX", "X_0": "KeyX",
			"y_0": "KeyY", "Y_0": "KeyY",
			"z_0": "KeyZ", "Z_0": "KeyZ",
			"-_0": "Minus",
			"__0": "Minus",
			"._0": "Period",
			">_0": "Period",
			"'_0": "Quote",
			"\"_0": "Quote",
			";_0": "Semicolon",
			":_0": "Semicolon",
			"Shift_1": "ShiftLeft",
			"Shift_2": "ShiftRight",
			"/_0": "Slash",
			"?_0": "Slash",
			" _0": "Space",
			"Tab_0": "Tab",
			"Numpad0_0": "Numpad0",
			"Numpad1_0": "Numpad1",
			"Numpad2_0": "Numpad2",
			"Numpad3_0": "Numpad3",
			"Numpad4_0": "Numpad4",
			"Numpad5_0": "Numpad5",
			"Numpad6_0": "Numpad6",
			"Numpad7_0": "Numpad7",
			"Numpad8_0": "Numpad8",
			"Numpad9_0": "Numpad9",
			"NumpadAdd_0": "NumpadAdd",
			"NumpadDecimal_0": "NumpadDecimal",
			"NumpadDivide_0": "NumpadDivide",
			"NumpadEnter_0": "NumpadEnter",
			"NumpadMultiply_0": "NumpadMultiply",
			"NumpadSubtract_0": "NumpadSubtract",
			"PageDown_0": "PageDown",
			"PageUp_0": "PageUp"
		};
	}

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
		// Trigger specific key listeners
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
			if( m_keys[ key ] ) {
				return m_keys[ key ];
			}
			if( m_keyKeys[ key ] ) {
				return m_keyKeys[ key ];
			}
			return m_keyCodes[ key ];
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

		// Resolve key to code
		const code = m_keyLookup[ key + "_0" ] || key;

		if( !m_onKeyEventListeners[ code ] ) {
			m_onKeyEventListeners[ code ] = {};
		}
		if( !m_onKeyEventListeners[ code ][ mode ] ) {
			m_onKeyEventListeners[ code ][ mode ] = [];
		}

		m_onKeyEventListeners[ code ][ mode ].push( { "fn": fn, "once": once } );
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

		// Resolve key to code
		const code = m_keyLookup[ key + "_0" ] || key;

		if( m_onKeyEventListeners[ code ] && m_onKeyEventListeners[ code ][ mode ] ) {
			if( fn ) {
				m_onKeyEventListeners[ code ][ mode ] = 
					m_onKeyEventListeners[ code ][ mode ].filter(
						listener => listener.fn !== fn
					);
			} else {
				m_onKeyEventListeners[ code ][ mode ] = [];
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

