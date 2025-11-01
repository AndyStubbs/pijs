/**
 * Pi.js - Colors Module
 * 
 * Manages the color palettes and color values.
 * Simplified version focused on WebGL2 rendering.
 * 
 * @module graphics/colors
 */

"use strict";

// Import modules directly
import * as g_commands from "../core/commands.js";
import * as g_utils from "../core/utils.js";
import * as g_screenManager from "../core/screen-manager.js";

let m_defaultPal = [];
let m_defaultPalMap = new Map();
let m_defaultColor = -1;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize color defaults
export function init( api ) {

	// Default 256-color palette (CGA + extended colors) - raw hex strings
	const defaultPaletteHex = [
		"#0000AA", "#00AA00", "#00AAAA", "#AA0000", "#AA00AA", "#AA5500", "#AAAAAA", "#555555",
		"#5555FF", "#55FF55", "#55FFFF", "#FF5555", "#FF55FF", "#FFFF55", "#FFFFFF", "#000000",
		"#141414", "#202020", "#2D2D2D", "#393939", "#454545", "#515151", "#616161", "#717171",
		"#828282", "#929292", "#A2A2A2", "#B6B6B6", "#CACACA", "#E3E3E3", "#FFFFFF", "#0000FF",
		"#4100FF", "#7D00FF", "#BE00FF", "#FF00FF", "#FF00BE", "#FF007D", "#FF0041", "#FF0000",
		"#FF4100", "#FF7D00", "#FFBE00", "#FFFF00", "#BEFF00", "#7DFF00", "#41FF00", "#00FF00",
		"#00FF41", "#00FF7D", "#00FFBE", "#00FFFF", "#00BEFF", "#007DFF", "#0041FF", "#7D7DFF",
		"#9E7DFF", "#BE7DFF", "#DF7DFF", "#FF7DFF", "#FF7DDF", "#FF7DBE", "#FF7D9E", "#FF7D7D",
		"#FF9E7D", "#FFBE7D", "#FFDF7D", "#FFFF7D", "#DFFF7D", "#BEFF7D", "#9EFF7D", "#7DFF7D",
		"#7DFF9E", "#7DFFBE", "#7DFFDF", "#7DFFFF", "#7DDFFF", "#7DBEFF", "#7D9EFF", "#B6B6FF",
		"#C6B6FF", "#DBB6FF", "#EBB6FF", "#FFB6FF", "#FFB6EB", "#FFB6DB", "#FFB6C6", "#FFB6B6",
		"#FFC6B6", "#FFDBB6", "#FFEBB6", "#FFFFB6", "#EBFFB6", "#DBFFB6", "#C6FFB6", "#B6FFB6",
		"#B6FFC6", "#B6FFDB", "#B6FFEB", "#B6FFFF", "#B6EBFF", "#B6DBFF", "#B6C6FF", "#000071",
		"#1C0071", "#390071", "#550071", "#710071", "#710055", "#710039", "#71001C", "#710000",
		"#711C00", "#713900", "#715500", "#717100", "#557100", "#397100", "#1C7100", "#007100",
		"#00711C", "#007139", "#007155", "#007171", "#005571", "#003971", "#001C71", "#393971",
		"#453971", "#553971", "#613971", "#713971", "#713961", "#713955", "#713945", "#713939",
		"#714539", "#715539", "#716139", "#717139", "#617139", "#557139", "#457139", "#397139",
		"#397145", "#397155", "#397161", "#397171", "#396171", "#395571", "#394571", "#515171",
		"#595171", "#615171", "#695171", "#715171", "#715169", "#715161", "#715159", "#715151",
		"#715951", "#716151", "#716951", "#717151", "#697151", "#617151", "#597151", "#517151",
		"#517159", "#517161", "#517169", "#517171", "#516971", "#516171", "#515971", "#000041",
		"#100041", "#200041", "#310041", "#410041", "#410031", "#410020", "#410010", "#410000",
		"#411000", "#412000", "#413100", "#414100", "#314100", "#204100", "#104100", "#004100",
		"#004110", "#004120", "#004131", "#004141", "#003141", "#002041", "#001041", "#202041",
		"#282041", "#312041", "#392041", "#412041", "#412039", "#412031", "#412028", "#412020",
		"#412820", "#413120", "#413920", "#414120", "#394120", "#314120", "#284120", "#204120",
		"#204128", "#204131", "#204139", "#204141", "#203941", "#203141", "#202841", "#2D2D41",
		"#312D41", "#352D41", "#3D2D41", "#412D41", "#412D3D", "#412D35", "#412D31", "#412D2D",
		"#41312D", "#41352D", "#413D2D", "#41412D", "#3D412D", "#35412D", "#31412D", "#2D412D",
		"#2D4131", "#2D4135", "#2D413D", "#2D4141", "#2D3D41", "#2D3541", "#2D3141", "#000000",
		"#000000", "#000000", "#000000", "#000000", "#000000", "#000000"
	];

	// Set the default pal and color
	setDefaultPal( { "pal": defaultPaletteHex } );
	setDefaultColor( { "color": 7 } );

	// Add getters for screen manager to get defaults for dynamic items
	g_screenManager.addScreenDataItemGetter( "pal", () => m_defaultPal );
	g_screenManager.addScreenDataItemGetter( "color", () => m_defaultColor );
	g_screenManager.addScreenDataItemGetter( "palMap", () => m_defaultPalMap );

	// Add external API commands
	registerCommands( api );
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/

function registerCommands() {

	// Register non-screen commands
	g_commands.addCommand( "setDefaultPal", setDefaultPal, false, [ "pal" ] );
	g_commands.addCommand( "setDefaultColor", setDefaultColor, false, [ "color" ] );

	// Register screen commands
	g_commands.addCommand( "setColor", setColor, true, [ "color", "isAddToPalette" ] );
	g_commands.addCommand( "getColor", getColor, true, [ "asIndex" ] );
	g_commands.addCommand( "getPal", getPal, true, [] );
	g_commands.addCommand( "setPal", setPal, true, [ "pal" ] );
	g_commands.addCommand( "getPalIndex", getPalIndex, true, [ "color", "tolerance" ] );
	g_commands.addCommand( "setBgColor", setBgColor, true, [ "color" ] );
	g_commands.addCommand( "setContainerBgColor", setContainerBgColor, true, [ "color" ] );
	g_commands.addCommand( "setPalColor", setPalColor, true, [ "index", "color" ] );
	g_commands.addCommand( "getPalColor", getPalColor, true, [ "index" ] );
}

// Set default pal
function setDefaultPal( options ) {
	const pal = options.pal;

	if( !Array.isArray( pal ) ) {
		const error = new TypeError( "setDefaultPal: Parameter pal must be an array." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( pal.length === 0 ) {
		const error = new RangeError(
			"setDefaultPal: Parameter pal must have at least one color value."
		);
		error.code = "EMPTY_PALETTE";
		throw error;
	}

	// Create default pal with the 0'th item set as a black transparent color
	m_defaultPal = [ g_utils.convertToColor( [ 0, 0, 0, 0 ] ) ];

	// Convert palette to color format
	for( let i = 0; i < pal.length; i++ ) {
		const c = g_utils.convertToColor( pal[ i ] );
		if( c === null ) {
			console.warn( `setDefaultPal: Invalid color value inside array pal at index: ${i}.` );
			m_defaultPal.push( g_utils.convertToColor( "#000000" ) );
		} else {
			m_defaultPal.push( c );
		}
	}

	// Set the default pal map
	m_defaultPalMap = new Map();
	for( let i = 0; i < m_defaultPal.length; i++ ) {
		m_defaultPalMap.set( m_defaultPal[ i ].key, i );
	}

	// Make sure default color is in the new palette
	if( !m_defaultPalMap.has( m_defaultColor.key ) ) {
		m_defaultColor = m_defaultPal[ 1 ];
	}
}

// Set default color
function setDefaultColor( options ) {
	let c = options.color;

	if( !isNaN( Number( c ) ) && m_defaultPal.length > c ) {
		m_defaultColor = m_defaultPal[ c ];
	} else {
		c = g_utils.convertToColor( c );
		if( c === null ) {
			const error = new TypeError(
				"setDefaultColor: Parameter color is not a valid color format."
			);
			error.code = "INVALID_PARAMETER";
			throw error;
		}
		m_defaultColor = c;
	}
}

// Set color
function setColor( screenData, options ) {
	const colorInput = options.color;
	const isAddToPalette = !!options.isAddToPalette;

	let colorValue;

	// If colorInput is an number then get colorValue for pal
	if( typeof colorInput === "number" ) {
		if( colorInput >= screenData.pal.length ) {
			const error = new TypeError(
				`setColor: Parameter color index is not in pal.`
			);
			error.code = "INVALID_PARAMETER";
			throw error;
		}
		colorValue = screenData.pal[ colorInput ];
	} else {

		// Convert the color to a colorValue
		colorValue = g_utils.convertToColor( colorInput );

		// If we were unable to convert this color than it is not a valid color format
		if( colorValue === null ) {
			const error = new TypeError(
				`setColor: Parameter color is not a valid color format.`
			);
			error.code = "INVALID_PARAMETER";
			throw error;
		}

		// If we are adding to palette then we need to do an additional check to see if the color
		// is already in the palette or not
		if( isAddToPalette && findColorIndexByColorValue( screenData, colorValue ) === null ) {
			screenData.pal.push( colorValue );
			screenData.palMap.set( colorValue.key, screenData.pal.length - 1 );
		}
	}

	// Update the color values
	g_utils.setColor( colorValue, screenData.color );

	return true;
}

function getColor( screenData, options ) {
	const asIndex = !!options.asIndex;
	if( asIndex ) {
		return findColorIndexByColorValue( screenData, screenData.color );
	}
	return g_utils.rgbToColor(
		screenData.color.r, screenData.color.g, screenData.color.b, screenData.color.a
	);
}

// TODO: Add parameter (include0) to return the 0 item from the pal.
// Get palette
function getPal( screenData ) {
	const filteredPal = [];

	// Need to explicitly convert each color because they need to have the 
	for( let i = 1; i < screenData.pal.length; i += 1 ) {
		filteredPal.push( { ...screenData.pal[ i ] } );
	}
	return filteredPal;
}

// Set entire palette
function setPal( screenData, options ) {
	const pal = options.pal;

	if( !Array.isArray( pal ) ) {
		const error = new TypeError( "setPal: Parameter pal is must be an array." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( pal.length === 0 ) {
		const error = new RangeError(
			"setPal: Parameter pal must have at least one color value."
		);
		error.code = "EMPTY_PALETTE";
		throw error;
	}

	// Create a new pal with 0'th color set to black transparent
	const newPal = [ g_utils.convertToColor( [ 0, 0, 0, 0 ] ) ];

	// Convert all colors and validate
	for( let i = 0; i < pal.length; i++ ) {
		const c = g_utils.convertToColor( pal[ i ] );
		if( c === null ) {
			console.warn( `setPal: Invalid color value inside array pal at index: ${i}.` );
			newPal.push( g_utils.convertToColor( "#000000" ) );
		} else {
			newPal.push( c );
		}
	}

	// Set the new palette
	screenData.pal = newPal;

	// Clear the palMap since we've replaced the entire palette
	screenData.palMap = new Map();

	// Rebuild palMap for new palette colors
	for( let i = 0; i < newPal.length; i++ ) {
		screenData.palMap.set( newPal[ i ].key, i );
	}

	// Check if current drawing color needs to be updated
	// Find the new palette index that best matches the current color
	const currentColor = screenData.color;
	const newIndex = findColorIndexByColorValue( screenData, currentColor );
	if( newIndex !== null ) {
		screenData.color = newPal[ newIndex ];
	} else {

		// If current color not found, default to palette index 1
		screenData.color = newPal[ 1 ];
	}
}

// Get palette index for a color
function getPalIndex( screenData, options ) {
	let color = options.color;
	let tolerance = g_utils.getFloat( options.tolerance, 1 );

	// Validate tolerance variable
	if( tolerance < 0 || tolerance > 1 ) {
		const error = new RangeError(
			"getPalIndex: Parameter tolerance must be a number between 0 and 1."
		);
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	// Convert to color value
	const colorValue = g_utils.convertToColor( color );
	if( colorValue === null ) {
		const error = new TypeError(
			`getPalIndex: Parameter color is not a valid color format.`
		);
		error.code = "INVALID_COLOR";
		throw error;
	}

	const index = findColorIndexByColorValue( screenData, colorValue, tolerance );
	if( index === null ) {
		return false;
	}
	return index;
}

// Set the background color of the canvas
function setBgColor( screenData, options ) {
	const color = options.color;
	let bc;

	if( Number.isInteger( color ) ) {
		bc = screenData.pal[ color ];
	} else {
		bc = g_utils.convertToColor( color );
	}
	if( bc && typeof bc.hex === "string" ) {
		screenData.canvas.style.backgroundColor = bc.hex;
	} else {
		const error = new TypeError( "setBgColor: invalid color value for parameter color." );
		error.code = "INVALID_COLOR";
		throw error;
	}
}

// Set the background color of the container
function setContainerBgColor( screenData, options ) {
	const color = options.color;
	let bc;
	if( screenData.container ) {
		if( Number.isInteger( color ) ) {
			bc = screenData.pal[ color ];
		} else {
			bc = g_utils.convertToColor( color );
		}
		if( bc && typeof bc.hex === "string" ) {
			screenData.container.style.backgroundColor = bc.hex;
			return;
		} else {
			const error = new TypeError(
				"setContainerBgColor: invalid color value for parameter color."
			);
			error.code = "INVALID_COLOR";
			throw error;
		}
	}
}

// Set palette color
function setPalColor( screenData, options ) {
	const index = options.index;
	const color = options.color;

	// index must be an integer
	if(
		!Number.isInteger( index ) ||
		index < 0 ||
		index >= screenData.pal.length
	) {
		const error = new RangeError(
			"setPalColor: Parameter index must be an integer value."
		);
		error.code = "INVALID_INDEX";
		throw error;
	}

	// index cannot be 0
	if( index === 0 ) {
		const error = new RangeError(
			"setPalColor: Parameter index cannot be 0, this is reserved for transparency. To set " +
			"background color of the screen use the setBgColor command."
		);
		error.code = "INVALID_INDEX";
		throw error;
	}

	// Get the color value
	const colorValue = g_utils.convertToColor( color );
	if( colorValue === null ) {
		const error = new TypeError(
			"setPalColor: Parameter color is not a valid color format."
		);
		error.code = "INVALID_COLOR";
		throw error;
	}

	// Store the old color before replacing
	const oldColor = screenData.pal[ index ];

	// Check if we are changing the current selected fore color
	if( screenData.color.key === oldColor.key ) {
		screenData.color = colorValue;
	}

	// Set the new palette color
	screenData.pal[ index ] = colorValue;

	// Update the palMap - remove old color entry and add new one
	screenData.palMap.delete( oldColor.key );
	screenData.palMap.set( colorValue.key, index );
}

function getPalColor( screenData, options ) {
	const index = options.index;

	if( screenData.pal[ index ] ) {
		const color = screenData.pal[ index ];
		return g_utils.rgbToColor( color.r, color.g, color.b, color.a );
	}
	return null;
}

// TODO: Implement replaceColors and replacePalColors commands
// These require special planning for WebGL2 implementation


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


export function getColorValueByRawInput( screenData, rawInput ) {
	let colorValue;

	// If it is an integer than get from pal array
	if( Number.isInteger( rawInput ) ) {
		if( rawInput >= screenData.pal.length ) {
			return null;
		}
		return screenData.pal[ rawInput ];
	}
	
	// Convert to a color value
	colorValue = g_utils.convertToColor( rawInput );

	return colorValue;
}

// Finds a color index without adding it to palette
export function findColorIndexByColorValue( screenData, color, tolerance = 1 ) {

	// First check by key - fastest lookup
	if( screenData.palMap.has( color.key ) ) {
		return screenData.palMap.get( color.key );
	}

	// Max color difference constant
	const maxDifference = ( 255 * 255 ) * 3.25;
	const minSimularity = tolerance * ( 2 - tolerance ) * maxDifference;

	// Collect all matches meeting the target similarity, then return the most similar
	let bestMatchIndex = null;
	let bestMatchSimularity = 0;
	for( let i = 0; i < screenData.pal.length; i++ ) {
		const palColor = screenData.pal[ i ];
		if( palColor.key === color.key ) {

			// Exact match found; this is the best possible
			return i;
		}

		let difference;

		// Special case for color 0: weight alpha higher for transparent color
		if( i === 0 ) {
			difference = g_utils.calcColorDifference( palColor, color, [ 0.2, 0.2, 0.2, 0.4 ] );
		} else {
			difference = g_utils.calcColorDifference( palColor, color );
		}

		const similarity = maxDifference - difference;
		if( similarity >= minSimularity ) {
			if( similarity > bestMatchSimularity ) {
				bestMatchIndex = i;
				bestMatchSimularity = similarity;
			}
		}
	}

	return bestMatchIndex;
}

export function getColorValueByIndex( screenData, palIndex ) {
	if( palIndex >= screenData.pal.length ) {
		return null;
	}
	return screenData.pal[ palIndex ];
}
