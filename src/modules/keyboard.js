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
const INPUT_TAGS = new Set( [ "INPUT", "TEXTAREA", "SELECT" ] );

// Global screen handlers
const m_screenKeyboardHandlers = {};


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize draw module
export function init() {

	// Add keyboard event listeners
	window.addEventListener( "keydown", onGlobalKeyEvent, { "capture": true } );
	window.addEventListener( "keyup", onGlobalKeyEvent, { "capture": true } );

	// Add screen data items
	screenManager.addScreenDataItem( "inCodes", {} );
	screenManager.addScreenDataItem( "inKeys", {} );
	screenManager.addScreenDataItem( "actionKeys", {} );

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
		screenData.actionKeys[ key ] = true;
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
		delete screenData.actionKeys[ key ];
	}
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
		"location": event.location
	};
	screenData.inCodes[ event.code ] = keyData;
	screenData.inKeys[ event.key ] = keyData;

	if( screenData.actionKeys[ event.code ] || screenData.actionKeys[ event.key ] ) {
		event.preventDefault();
	}
}

function onKeyUp( screenData, event ) {
	delete screenData.inCodes[ event.code ];
	delete screenData.inKeys[ event.key ];

	if( screenData.actionKeys[ event.code ] || screenData.actionKeys[ event.key ] ) {
		event.preventDefault();
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
