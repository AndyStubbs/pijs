/**
 * Keyboard Input Command for Pi.js
 * 
 * Provides text input functionality with cursor blinking and validation.
 * 
 * @module plugins/keyboard/input
 */

"use strict";

const CURSOR_BLINK = 500;

// Input state
let m_inputData = null;


/***************************************************************************************************
 * Input Command Registration
 **************************************************************************************************/


/**
 * Initialize input command
 * 
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 * @returns {void}
 */
export function initInput( pluginApi ) {

	// Register screen commands
	pluginApi.addCommand(
		"input", input, true,
		[ "prompt", "fn", "cursor", "isNumber", "isInteger", "allowNegative" ]
	);
	pluginApi.addCommand( "cancelInput", cancelInput, true, [] );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


/**
 * Input command - Get text input from user
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Input options
 * @param {string} options.prompt - Prompt text to display
 * @param {Function} [options.fn] - Callback function called with result
 * @param {string} [options.cursor] - Cursor character (default: block character)
 * @param {boolean} [options.isNumber] - If true, only allow numeric input
 * @param {boolean} [options.isInteger] - If true, only allow integer input
 * @param {boolean} [options.allowNegative] - If true, allow negative numbers
 * @returns {Promise} Promise that resolves with input value or rejects on cancel
 */
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
		"val": "",
		"fn": fn,
		"resolve": resolvePromise,
		"reject": rejectPromise,
		"backgroundImageName": null
	};

	startInput();

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


/***************************************************************************************************
 * Internal Helper Functions
 **************************************************************************************************/


function startInput() {

	const screenData = m_inputData.screenData;
	const api = pluginApi.getApi();

	// Get current position to capture background region
	const posPx = screenData.api.getPosPx();
	const font = screenData.font;
	const width = screenData.width;
	const height = font.height;

	// Capture background region using createImageFromScreen
	// Capture enough width for prompt + reasonable input length
	const prompt = m_inputData.prompt;
	const captureWidth = Math.min( width - posPx.x, ( prompt.length + 50 ) * font.width );
	const captureHeight = height;

	// Create unique image name for background
	const imageName = `__input_bg_${Date.now()}_${Math.random().toString( 36 ).substr( 2, 9 )}`;

	// Capture the background region
	try {
		m_inputData.backgroundImageName = api.createImageFromScreen( {
			"name": imageName,
			"x1": posPx.x,
			"y1": posPx.y,
			"x2": posPx.x + captureWidth,
			"y2": posPx.y + captureHeight
		} );
		m_inputData.captureX = posPx.x;
		m_inputData.captureY = posPx.y;
		m_inputData.captureWidth = captureWidth;
		m_inputData.captureHeight = captureHeight;
	} catch( error ) {
		// If capture fails, clean up and reject
		const tempInputData = m_inputData;
		m_inputData = null;
		tempInputData.reject( error );
		return;
	}

	// Add input event listener
	api.onkey( "any", "down", onInputKeyDown );

	// Add interval for blinking cursor
	m_inputData.interval = setInterval( showPrompt, 100 );
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
	const api = pluginApi.getApi();
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
		pos = screenData.api.getPos();
	}

	// Get the background pixels
	const posPx = screenData.api.getPosPx();
	const font = screenData.font;
	const width = ( msg.length + 1 ) * font.width;
	const height = font.height;

	// Restore the background image over the prompt area
	if( m_inputData.backgroundImageName ) {
		screenData.api.drawImage( {
			"image": m_inputData.backgroundImageName,
			"x": m_inputData.captureX,
			"y": m_inputData.captureY,
			"scaleX": 1,
			"scaleY": 1
		} );
	}
	
	// Print the prompt + input + cursor
	screenData.api.print( msg, true );

	// Restore the cursor
	screenData.api.setPos( pos.col, pos.row );
}

function finishInput( isCancel ) {
	const screenData = m_inputData.screenData;
	const api = pluginApi.getApi();

	// Remove input key handler
	api.offkey( "any", "down", onInputKeyDown );

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

	// Clean up background image texture
	if( m_inputData.backgroundImageName ) {
		try {
			api.removeImage( { "name": m_inputData.backgroundImageName } );
		} catch( error ) {
			// Ignore errors during cleanup
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


/***************************************************************************************************
 * Module Exports
 **************************************************************************************************/


// Store pluginApi reference for use in functions
let pluginApi = null;

/**
 * Set plugin API reference
 * 
 * @param {Object} api - Plugin API object
 * @returns {void}
 */
export function setPluginApi( api ) {
	pluginApi = api;
}

