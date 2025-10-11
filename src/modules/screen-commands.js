/**
 * Pi.js - Screen Commands Module
 * 
 * Basic screen commands like remove, render, width/height getters, etc.
 * 
 * @module modules/screen-commands
 */

export function init( pi ) {
	const piData = pi._.data;

	// Remove the screen from the page and memory
	pi._.addCommand( "removeScreen", removeScreen, false, true, [] );

	function removeScreen( screenData ) {
		const screenId = screenData.id;

		// If removing active screen, find another
		if( screenData === piData.activeScreen ) {
			for( const i in piData.screens ) {
				if( piData.screens[ i ] !== screenData ) {
					piData.activeScreen = piData.screens[ i ];
					break;
				}
			}
		}

		// Cancel input if method exists
		if( screenData.screenObj.cancelInput ) {
			screenData.screenObj.cancelInput();
		}

		// Remove all commands from screen object
		for( const i in screenData.screenObj ) {
			delete screenData.screenObj[ i ];
		}

		// Remove the canvas from the page
		if( screenData.canvas.parentElement ) {
			screenData.canvas.parentElement.removeChild( screenData.canvas );
		}

		// Set values to null
		screenData.canvas = null;
		screenData.bufferCanvas = null;
		screenData.pal = null;
		screenData.commands = null;
		screenData.context = null;
		screenData.imageData = null;
		screenData.screenObj = null;

		// Delete the screen from screens container
		delete piData.screens[ screenId ];
	}

	// Render screen (puts buffer to main canvas)
	pi._.addCommand( "render", render, false, true, [] );

	function render( screenData ) {
		if( screenData.dirty === true ) {
			screenData.context.putImageData(
				screenData.imageData, 0, 0
			);
			screenData.dirty = false;
		}
	}

	// Get screen width
	pi._.addCommand( "width", getWidth, false, true, [] );

	function getWidth( screenData ) {
		return screenData.width;
	}

	// Get screen height
	pi._.addCommand( "height", getHeight, false, true, [] );

	function getHeight( screenData ) {
		return screenData.height;
	}

	// Get canvas element
	pi._.addCommand( "canvas", getCanvas, false, true, [] );

	function getCanvas( screenData ) {
		return screenData.canvas;
	}

	// Set background color
	pi._.addCommand( "setBgColor", setBgColor, false, true, [ "color" ] );
	pi._.addSetting( "bgColor", setBgColor, true, [ "color" ] );

	function setBgColor( screenData, args ) {
		let color = args[ 0 ];
		let bc;

		if( pi.util.isInteger( color ) ) {
			bc = screenData.pal[ color ];
		} else {
			bc = pi.util.convertToColor( color );
		}

		if( bc && typeof bc.s === "string" ) {
			screenData.canvas.style.backgroundColor = bc.s;
		} else {
			const error = new TypeError( "bgColor: invalid color value for parameter c." );
			error.code = "INVALID_COLOR";
			throw error;
		}
	}

	// Set container background color
	pi._.addCommand( "setContainerBgColor", setContainerBgColor, false, true, [ "color" ] );
	pi._.addSetting( "containerBgColor", setContainerBgColor, true, [ "color" ] );

	function setContainerBgColor( screenData, args ) {
		const color = args[ 0 ];
		let bc;

		if( screenData.container ) {
			if( pi.util.isInteger( color ) ) {
				bc = screenData.pal[ color ];
			} else {
				bc = pi.util.convertToColor( color );
			}

			if( bc && typeof bc.s === "string" ) {
				screenData.container.style.backgroundColor = bc.s;
			} else {
				const error = new TypeError(
					"containerBgColor: invalid color value for parameter c."
				);
				error.code = "INVALID_COLOR";
				throw error;
			}
		}
	}
}

