/**
 * Keyboard Input Command for Pi.js
 *
 * Provides text input functionality with cursor blinking and validation.
 *
 * @module plugins/keyboard/input
 */

"use strict";

const CURSOR_BLINK = 500;

// Values a numeric prompt may hold while typing, by whether it takes decimals and a sign
const NUMBER_PATTERNS = {
	"decimal": /^\d*\.?\d*$/,
	"signedDecimal": /^-?\d*\.?\d*$/,
	"integer": /^\d*$/,
	"signedInteger": /^-?\d*$/
};

// Input state
let m_inputData = null;
let m_inputRequest = 0;

// Store pluginApi reference for use in functions
let m_pluginApi = null;

// Editable-target test shared with the keyboard plugin's own listeners
let m_isFromEditableTarget = null;

// Called when a prompt takes the keyboard: the keyboard plugin releases its held keys
let m_takeKeyboard = null;

// Key events a prompt read, so the keyboard plugin withholds them even when the prompt's listener
// runs first and the key ends the prompt
const m_promptEvents = new WeakSet();


/*************************************************************************************************
 * Input Command Registration
 ************************************************************************************************/


/**
 * Initialize input command
 *
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 * @param {Function} isFromEditableTarget - Whether a key event comes from an editable element
 * @param {Function} takeKeyboard - Called when a prompt starts; releases held keys with
 *   `cancelled: true`
 * @returns {void}
 */
export function initInput( pluginApi, isFromEditableTarget, takeKeyboard ) {

	m_pluginApi = pluginApi;
	m_isFromEditableTarget = isFromEditableTarget;
	m_takeKeyboard = takeKeyboard;
	pluginApi.addScreenPreCleanupFunction( disposeInput );

	// Register screen commands
	pluginApi.addCommand(
		"input", input, true,
		[ "prompt", "fn", "cursor", "isNumber", "isInteger", "allowNegative", "maxLength" ]
	);
	pluginApi.addCommand( "cancelInput", cancelInput, true, [] );
}


/*************************************************************************************************
 * External API Commands
 ************************************************************************************************/


/**
 * Input command - Get text input from user
 *
 * Cancellation (including disposal) resolves with null and calls fn with null.
 * Callback errors are reported asynchronously after settlement and cleanup.
 * A reentrant input request supersedes any earlier request still being started.
 *
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Input options
 * @param {string} options.prompt - Prompt text to display
 * @param {Function} [options.fn] - Callback function called with result
 * @param {string} [options.cursor] - Cursor character (default: block character)
 * @param {boolean} [options.isNumber] - If true, only allow numeric input
 * @param {boolean} [options.isInteger] - If true, only allow integer input
 * @param {boolean} [options.allowNegative] - If true, allow negative numbers
 * @param {number} [options.maxLength] - Maximum length of input string
 * @returns {Promise} Promise resolving with the input value or null on cancellation
 */
function input( screenData, options ) {
	if( screenData.isRemoved ) {
		const error = new Error( "input: Cannot start input on a removed screen." );
		error.code = "SCREEN_REMOVED";
		throw error;
	}
	const prompt = options.prompt;
	const fn = options.fn;
	if( typeof prompt !== "string" ) {
		throwCode( TypeError, "input: prompt must be a string.", "INVALID_PROMPT" );
	}
	if( fn != null && typeof fn !== "function" ) {
		throwCode( TypeError, "input: fn must be a function.", "INVALID_FUNCTION" );
	}

	// An omitted or empty cursor draws the block
	let cursor = options.cursor;
	if( cursor == null || cursor === "" ) {
		cursor = String.fromCharCode( 219 );
	} else if( typeof cursor !== "string" ) {
		throwCode( TypeError, "input: cursor must be a string.", "INVALID_CURSOR" );
	}
	const isNumber = readFlag( "isNumber", options.isNumber, "INVALID_IS_NUMBER" );
	const isInteger = readFlag( "isInteger", options.isInteger, "INVALID_IS_INTEGER" );
	const allowNegative = readFlag(
		"allowNegative", options.allowNegative, "INVALID_ALLOW_NEGATIVE"
	);

	// An omitted maxLength, null or undefined, means no limit
	let maxLength = options.maxLength;
	if( maxLength == null ) {
		maxLength = null;
	} else if( !Number.isInteger( maxLength ) ) {
		throwCode( TypeError, "input: maxLength must be an integer.", "INVALID_MAX_LENGTH" );
	} else if( maxLength < 1 ) {
		throwCode( RangeError, "input: maxLength must be at least 1.", "INVALID_MAX_LENGTH" );
	}

	// Create promise for async/await support
	let resolvePromise, rejectPromise;
	const promise = new Promise( ( resolve, reject ) => {
		resolvePromise = resolve;
		rejectPromise = reject;
	} );
	const request = ++m_inputRequest;

	if( m_inputData ) {
		finishInput( true );
	}

	// A cancellation callback may start a newer prompt or dispose this target.
	if( request !== m_inputRequest || screenData.isRemoved ) {
		resolvePromise( null );
		notifyInput( fn, null );
		return promise;
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
		"maxLength": maxLength,
		"val": "",
		"fn": fn,
		"resolve": resolvePromise,
		"reject": rejectPromise,
		"backgroundImageName": null,
		"backgroundImage": null,
		"captureX": null,
		"captureY": null
	};

	const inputData = m_inputData;
	try {
		startInput( inputData );
	} catch( error ) {
		m_inputData = null;
		inputData.reject( error );
		releaseInput( inputData );
	}

	return promise;
}

/**
 * Cancel input command - Cancel current input
 *
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
function cancelInput( screenData ) {
	if( m_inputData && m_inputData.screenData === screenData ) {
		finishInput( true );
	}
}


/*************************************************************************************************
 * Internal Helper Functions
 ************************************************************************************************/


function startInput( inputData ) {

	// The prompt takes the keyboard, so keys held now are released, as cancelled
	m_takeKeyboard();

	// Create unique image name for background
	const key = `${Date.now()}_${Math.random().toString( 36 ).substring( 2, 9 )}`;
	inputData.backgroundImageName = `__input_bg_${key}`;

	// Capture the background image
	captureBackground( inputData );

	// The prompt reads keys from its own listener, so stopKeyboard() and cleared key handlers
	// cannot strand it
	inputData.keyListener = event => {
		if( !m_isFromEditableTarget( event ) ) {
			m_promptEvents.add( event );
			onInputKeyDown( inputData, event );
		}
	};
	window.addEventListener( "keydown", inputData.keyListener, { "capture": true } );
	inputData.pasteListener = event => {
		if( !m_isFromEditableTarget( event ) ) {
			onInputPaste( inputData, event );
		}
	};
	window.addEventListener( "paste", inputData.pasteListener, { "capture": true } );

	// Add interval for blinking cursor
	inputData.interval = setInterval( () => {
		if( m_inputData === inputData ) {
			showPrompt( inputData );
		}
	}, 100 );
}

function captureBackground( inputData ) {
	const screenData = inputData.screenData;

	// Check if need to scroll first
	const pos = screenData.api.getPos();
	if( pos.row >= screenData.api.getRows() ) {
		screenData.api.print( "" );
		screenData.api.setPos( pos.col, pos.row - 1 );
	}

	// Capture one print line, at the print size, from the cursor to the right edge of the view
	const posPx = screenData.api.getPosPx();
	const printCursor = screenData.printCursor;
	let viewWidth = screenData.width;
	if( screenData.view ) {
		viewWidth = screenData.view.width;
	}
	const captureWidth = viewWidth - posPx.x;
	const captureHeight = printCursor.height;

	screenData.api.createImageFromScreen( {
		"name": inputData.backgroundImageName ,
		"x1": posPx.x,
		"y1": posPx.y,
		"x2": posPx.x + captureWidth - 1,
		"y2": posPx.y + captureHeight - 1
	} );
	inputData.backgroundImage = m_pluginApi.getApi().getImage( inputData.backgroundImageName );
	inputData.captureX = posPx.x;
	inputData.captureY = posPx.y;
	inputData.captureWidth = captureWidth;
	inputData.captureHeight = captureHeight;
	inputData.lineChars = Math.floor( captureWidth / printCursor.width );
}

/**
 * Handle a keydown for the active prompt
 *
 * The prompt owns the keyboard: it prevents the default action of every key it handles, so
 * typing does not scroll the page, move focus, or activate a focused control. Shortcuts with
 * Ctrl or Meta are left to the browser, so Ctrl+V pastes; AltGr, which some browsers report as
 * Ctrl and Alt, types.
 *
 * @param {Object} inputData - Prompt session
 * @param {KeyboardEvent} keyData - Keydown event
 * @returns {void}
 */
function onInputKeyDown( inputData, keyData ) {
	if( m_inputData !== inputData ) {
		return;
	}
	const isAltGraph = Boolean(
		keyData.getModifierState && keyData.getModifierState( "AltGraph" )
	);
	if( ( keyData.ctrlKey || keyData.metaKey ) && !isAltGraph ) {
		return;
	}
	keyData.preventDefault();

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
		if( inputData.val.length > 0 ) {
			inputData.val = inputData.val.substring( 0, inputData.val.length - 1 );
		}

	// Handle single length keys
	} else if( keyData.key && keyData.key.length === 1 ) {
		insertCharacter( inputData, keyData.key );
	}

	showPrompt( inputData );
}

/**
 * Insert pasted text into the active prompt, one character at a time, by the typing rules
 *
 * Line breaks and other control characters are dropped.
 *
 * @param {Object} inputData - Prompt session
 * @param {ClipboardEvent} event - Paste event
 * @returns {void}
 */
function onInputPaste( inputData, event ) {
	if( m_inputData !== inputData ) {
		return;
	}
	event.preventDefault();
	let text = "";
	if( event.clipboardData ) {
		text = event.clipboardData.getData( "text" );
	}
	for( const char of text ) {
		if( char.length === 1 && char >= " " && char !== "\u007f" ) {
			insertCharacter( inputData, char );
		}
	}
	showPrompt( inputData );
}

/**
 * Insert one typed or pasted character, following the prompt's numeric and length rules
 *
 * A numeric prompt (isNumber or isInteger) keeps a value that matches its pattern: digits, one
 * decimal point unless isInteger, and a leading minus with allowNegative. Typing "-" adds the
 * minus at the start and "+" removes it. The minus counts toward maxLength.
 *
 * @param {Object} inputData - Prompt session
 * @param {string} char - Character to insert
 * @returns {void}
 */
function insertCharacter( inputData, char ) {
	const isNumeric = inputData.isNumber || inputData.isInteger;
	const val = inputData.val;
	let next = val + char;
	if( isNumeric && inputData.allowNegative ) {
		if( char === "-" ) {
			if( val.charAt( 0 ) === "-" ) {
				return;
			}
			next = "-" + val;
		} else if( char === "+" ) {
			if( val.charAt( 0 ) === "-" ) {
				inputData.val = val.substring( 1 );
			}
			return;
		}
	}
	if( inputData.maxLength !== null && next.length > inputData.maxLength ) {
		return;
	}
	if( isNumeric && !getNumberPattern( inputData ).test( next ) ) {
		return;
	}
	inputData.val = next;
}

/**
 * The pattern a numeric prompt's value must match while typing
 *
 * @param {Object} inputData - Prompt session
 * @returns {RegExp} Pattern
 */
function getNumberPattern( inputData ) {
	if( inputData.isInteger ) {
		if( inputData.allowNegative ) {
			return NUMBER_PATTERNS.signedInteger;
		}
		return NUMBER_PATTERNS.integer;
	}
	if( inputData.allowNegative ) {
		return NUMBER_PATTERNS.signedDecimal;
	}
	return NUMBER_PATTERNS.decimal;
}

function showPrompt( inputData, hideCursorOverride ) {
	if( inputData.screenData.isRemoved ) {
		return;
	}

	const screenData = inputData.screenData;

	// Keep to one line: when the value would reach the edge, show its end, leaving room for the
	// cursor so the line does not shift as it blinks
	let val = inputData.val;
	const valueChars = Math.max(
		inputData.lineChars - inputData.prompt.length - inputData.cursor.length, 0
	);
	if( val.length > valueChars ) {
		val = val.substring( val.length - valueChars );
	}
	let msg = inputData.prompt + val;

	// Blink cursor after every blink duration
	if( !hideCursorOverride ) {
		const now = Date.now();
		if( now - inputData.lastCursorBlink > CURSOR_BLINK ) {
			inputData.lastCursorBlink = now;
			inputData.showCursor = !inputData.showCursor;
		}

		// Show cursor if not hidden
		if( inputData.showCursor ) {
			msg += inputData.cursor;
		}
	}

	// Restore the background image over the prompt area
	screenData.api.blitImage(
		inputData.backgroundImage,
		inputData.captureX,
		inputData.captureY
	);

	// Get cursor position
	const posPx = screenData.api.getPosPx();

	// Print the prompt + input + cursor
	screenData.api.setPosPx( inputData.captureX, inputData.captureY );
	screenData.api.print( msg, true );

	// Restore the cursor
	screenData.api.setPosPx( posPx );
}

/** Finish the captured session before user code can start another one. */
function finishInput( isCancel, isDisposal = false ) {
	const inputData = m_inputData;
	if( !inputData ) {
		return;
	}
	m_inputData = null;
	const screenData = inputData.screenData;
	const fn = inputData.fn;
	let val = inputData.val;
	if( isCancel ) {
		val = null;
	} else if( inputData.isNumber || inputData.isInteger ) {

		// A value with no digits, such as "", "-", or ".", is 0, and so is "-0"
		if( /^-?\.?$/.test( val ) ) {
			val = 0;
		} else {
			val = Number( val );
			if( val === 0 ) {
				val = 0;
			}
		}
	}

	inputData.resolve( val );
	try {
		if( !isDisposal && !screenData.isRemoved ) {
			showPrompt( inputData, true );

			// Continue at column 0 of the line below the prompt
			screenData.printCursor.x = 0;
			screenData.printCursor.y = inputData.captureY + inputData.captureHeight;
		}
	} catch( error ) {
		reportInputError( error );
	} finally {
		releaseInput( inputData );
	}
	notifyInput( fn, val );
}

/** Release only this session's resources, including after partial initialization. */
function releaseInput( inputData ) {
	const api = m_pluginApi.getApi();
	clearInterval( inputData.interval );
	if( inputData.keyListener ) {
		window.removeEventListener( "keydown", inputData.keyListener, { "capture": true } );
	}
	if( inputData.pasteListener ) {
		window.removeEventListener( "paste", inputData.pasteListener, { "capture": true } );
	}
	try {
		if( inputData.backgroundImageName ) {
			api.removeImage( inputData.backgroundImageName );
		}
	} catch( error ) {
		reportInputError( error );
	} finally {
		inputData.screenData = null;
		inputData.backgroundImage = null;
		inputData.backgroundImageName = null;
		inputData.keyListener = null;
		inputData.pasteListener = null;
		inputData.interval = null;
		inputData.fn = null;
		inputData.resolve = null;
		inputData.reject = null;
	}
}

/**
 * Throw an error with an error code.
 *
 * @param {Function} ErrorType - Error constructor.
 * @param {string} message - Error message.
 * @param {string} code - Error code.
 * @returns {never}
 */
function throwCode( ErrorType, message, code ) {
	const error = new ErrorType( message );
	error.code = code;
	throw error;
}

/**
 * Check an optional input() flag.
 *
 * @param {string} name - Parameter name.
 * @param {*} value - Flag value.
 * @param {string} code - Error code.
 * @returns {boolean} The flag, false when omitted.
 */
function readFlag( name, value, code ) {
	if( value == null ) {
		return false;
	}
	if( typeof value !== "boolean" ) {
		throwCode( TypeError, `input: ${name} must be a boolean.`, code );
	}
	return value;
}

/** Invoke a completion callback without interrupting disposal or a replacement request. */
function notifyInput( fn, val ) {
	if( !fn ) {
		return;
	}
	try {
		fn( val );
	} catch( error ) {
		reportInputError( error );
	}
}

function reportInputError( error ) {
	m_pluginApi.utils.queueMicrotask( () => { throw error; } );
}

/** Cancel a removed screen's prompt before renderer cleanup; never redraw the screen. */
function disposeInput( screenData ) {
	if( m_inputData && m_inputData.screenData === screenData ) {
		finishInput( true, true );
	}
}

/**
 * Whether a key event belongs to a prompt: a prompt is active, or the event is one a prompt read,
 * such as the Enter that ended it. The keyboard plugin withholds these events from key handlers
 * and held keys.
 *
 * @param {Object} event - Keydown or keyup event
 * @returns {boolean} True when the event belongs to a prompt
 */
export function isPromptKey( event ) {
	return m_inputData !== null || m_promptEvents.has( event );
}

/**
 * Cancel all active input prompts
 * Called by clearKeyboardEvents
 *
 * @param {Object} [screenData] - Optional screen data to cancel input for specific screen only
 * @returns {void}
 */
export function cancelAllInputs( screenData ) {
	if( m_inputData ) {
		if( screenData === null || screenData === undefined ) {

			// Cancel all inputs (there can only be one active at a time)
			finishInput( true );
		} else if( m_inputData.screenData === screenData ) {

			// Cancel input for specific screen
			finishInput( true );
		}
	}
}
