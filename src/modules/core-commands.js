/**
 * Pi.js - Core Commands Module
 * 
 * Core system commands including screen management and global settings.
 * 
 * @module modules/core-commands
 */

import { getScreenData } from "../core/command-system.js";

export function init( pi ) {
	const piData = pi._.data;

	// Set the active screen
	pi._.addCommand( "setScreen", setScreen, false, false, [ "screen" ] );
	pi._.addSetting( "screen", setScreen, false, [ "screen" ] );

	function setScreen( args ) {
		const screenObj = args[ 0 ];
		let screenId;

		if( pi.util.isInteger( screenObj ) ) {
			screenId = screenObj;
		} else if( screenObj && pi.util.isInteger( screenObj.id ) ) {
			screenId = screenObj.id;
		}

		if( !piData.screens[ screenId ] ) {
			const error = new Error( "screen: Invalid screen." );
			error.code = "INVALID_SCREEN";
			throw error;
		}

		piData.activeScreen = piData.screens[ screenId ];
	}

	// Remove all screens from the page and memory
	pi._.addCommand( "removeAllScreens", removeAllScreens, false, false, [] );

	function removeAllScreens() {
		for( const i in piData.screens ) {
			const screenData = piData.screens[ i ];
			screenData.screenObj.removeScreen();
		}
		piData.nextScreenId = 0;
	}

	// Get screen by ID
	pi._.addCommand( "getScreen", getScreen, false, false, [ "screenId" ] );

	function getScreen( args ) {
		const screenId = args[ 0 ];
		const screen = getScreenData( screenId, "getScreen" );
		return screen.screenObj;
	}

	// Set the default color
	pi._.addCommand( "setDefaultColor", setDefaultColor, false, false, [ "color" ] );
	pi._.addSetting( "defaultColor", setDefaultColor, false, [ "color" ] );

	function setDefaultColor( args ) {
		let c = args[ 0 ];

		if( !isNaN( Number( c ) ) && piData.defaultPalette.length > c ) {
			piData.defaultColor = c;
		} else {
			c = pi.util.convertToColor( c );
			if( c === null ) {
				const error = new TypeError(
					"setDefaultColor: invalid color value for parameter color."
				);
				error.code = "INVALID_COLOR";
				throw error;
			}
			piData.defaultColor = c;
		}
	}

	// Set the default palette
	pi._.addCommand( "setDefaultPal", setDefaultPal, false, false, [ "pal" ] );
	pi._.addSetting( "defaultPal", setDefaultPal, false, [ "pal" ] );

	function setDefaultPal( args ) {
		const pal = args[ 0 ];

		if( !pi.util.isArray( pal ) ) {
			const error = new TypeError( "setDefaultPal: parameter pal is not an array." );
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		if( pal.length < 1 ) {
			const error = new RangeError(
				"setDefaultPal: parameter pal must have at least one color value."
			);
			error.code = "EMPTY_PALETTE";
			throw error;
		}

		piData.defaultPalette = [];

		if( pal.length > 1 ) {
			piData.defaultColor = 1;
		} else {
			piData.defaultColor = 0;
		}

		for( let i = 0; i < pal.length; i++ ) {
			const c = pi.util.convertToColor( pal[ i ] );
			if( c === null ) {
				console.warn( "setDefaultPal: invalid color value inside array pal." );
				piData.defaultPalette.push( pi.util.convertToColor( "#000000" ) );
			} else {
				piData.defaultPalette.push( c );
			}
		}

		// Set color 0 to transparent
		const firstColor = piData.defaultPalette[ 0 ];
		piData.defaultPalette[ 0 ] = pi.util.convertToColor( [
			firstColor.r,
			firstColor.g,
			firstColor.b,
			0
		] );
	}

	// Get default palette
	pi._.addCommand( "getDefaultPal", getDefaultPal, false, false, [] );

	function getDefaultPal() {
		const colors = [];
		for( const color of piData.defaultPalette ) {
			colors.push( color );
		}
		return colors;
	}

	// Set the default input focus element
	pi._.addCommand( "setDefaultInputFocus", setDefaultInputFocus, false, false, [ "element" ] );
	pi._.addSetting( "defaultInputFocus", setDefaultInputFocus, false, [ "element" ] );

	function setDefaultInputFocus( args ) {
		let element = args[ 0 ];

		if( typeof element === "string" ) {
			element = document.getElementById( element );
		}

		if( !element || !pi.util.canAddEventListeners( element ) ) {
			const error = new TypeError(
				"setDefaultInputFocus: Invalid argument element. " +
				"Element must be a DOM element or string id of a DOM element."
			);
			error.code = "INVALID_ELEMENT";
			throw error;
		}

		if( !( element.tabIndex >= 0 ) ) {
			element.tabIndex = 0;
		}

		piData.defaultInputFocus = element;

		// Reinitialize keyboard if command exists
		if( piData.commands[ "reinitKeyboard" ] ) {
			piData.commands[ "reinitKeyboard" ]();
		}
	}

	// Global settings command
	pi._.addCommand( "set", set, false, true, piData.settingsList, true );

	function set( screenData, args ) {
		const options = args[ 0 ];

		// Loop through all the options
		for( const optionName in options ) {
			
			// If the option is a valid setting
			if( piData.settings[ optionName ] ) {

				// Get the setting data
				const setting = piData.settings[ optionName ];

				// Parse the options from the setting
				let optionValues = options[ optionName ];

				if(
					!pi.util.isArray( optionValues ) &&
					typeof optionValues === "object"
				) {
					optionValues = pi._.parseOptions( setting, [ optionValues ] );
				} else {
					optionValues = [ optionValues ];
				}

				// Call the setting function
				if( setting.isScreen ) {
					if( !screenData ) {
						screenData = getScreenData( undefined, `set ${setting.name}` );
					}
					setting.fn( screenData, optionValues );
				} else {
					setting.fn( optionValues );
				}
			}
		}
	}
}

