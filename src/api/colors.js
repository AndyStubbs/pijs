/**
 * Pi.js - Colors Module
 *
 * Manages the color palettes and color values.
 * Simplified version focused on WebGL2 rendering.
 *
 * @module api/colors
 */

"use strict";

import * as g_commands from "../core/commands.js";
import * as g_utils from "../core/utils.js";
import * as g_errors from "../core/errors.js";
import * as g_screenManager from "../core/screen-manager.js";

// Max color difference used in find color by index
const MAX_DIFFERENCE = ( 255 * 255 ) * 3.25;

let m_defaultPal = [];
let m_defaultPalMap = new Map();
let m_defaultColor = -1;


/*************************************************************************************************
 * Module Commands
 ************************************************************************************************/


/**
 * Initialize the module and register its commands and lifecycle hooks.
 *
 * @param {Object} api - Public Pi.js API.
 * @returns {void}
 */
export function init( api ) {

	// Default 256-color palette (CGA + extended colors). Entries are packed six-digit RGB hex
	// values, expanded to "#RRGGBB" strings; setDefaultPal adds the transparent entry 0.
	const defaultPaletteHex = (
		"0000AA00AA0000AAAAAA0000AA00AAAA5500AAAAAA5555555555FF55FF5555FFFFFF5555FF55FFFFFF55" +
		"FFFFFF0000001414142020202D2D2D393939454545515151616161717171828282929292A2A2A2B6B6B6" +
		"CACACAE3E3E3FFFFFF0000FF4100FF7D00FFBE00FFFF00FFFF00BEFF007DFF0041FF0000FF4100FF7D00" +
		"FFBE00FFFF00BEFF007DFF0041FF0000FF0000FF4100FF7D00FFBE00FFFF00BEFF007DFF0041FF7D7DFF" +
		"9E7DFFBE7DFFDF7DFFFF7DFFFF7DDFFF7DBEFF7D9EFF7D7DFF9E7DFFBE7DFFDF7DFFFF7DDFFF7DBEFF7D" +
		"9EFF7D7DFF7D7DFF9E7DFFBE7DFFDF7DFFFF7DDFFF7DBEFF7D9EFFB6B6FFC6B6FFDBB6FFEBB6FFFFB6FF" +
		"FFB6EBFFB6DBFFB6C6FFB6B6FFC6B6FFDBB6FFEBB6FFFFB6EBFFB6DBFFB6C6FFB6B6FFB6B6FFC6B6FFDB" +
		"B6FFEBB6FFFFB6EBFFB6DBFFB6C6FF0000711C007139007155007171007171005571003971001C710000" +
		"711C007139007155007171005571003971001C710000710000711C007139007155007171005571003971" +
		"001C71393971453971553971613971713971713961713955713945713939714539715539716139717139" +
		"617139557139457139397139397145397155397161397171396171395571394571515171595171615171" +
		"695171715171715169715161715159715151715951716151716951717151697151617151597151517151" +
		"517159517161517169517171516971516171515971000041100041200041310041410041410031410020" +
		"410010410000411000412000413100414100314100204100104100004100004110004120004131004141" +
		"003141002041001041202041282041312041392041412041412039412031412028412020412820413120" +
		"4139204141203941203141202841202041202041282041312041392041412039412031412028412D2D41" +
		"312D41352D413D2D41412D41412D3D412D35412D31412D2D41312D41352D413D2D41412D3D412D35412D" +
		"31412D2D412D2D41312D41352D413D2D41412D3D412D35412D3141000000000000000000000000000000" +
		"000000000000"
	).match( /.{6}/g ).map( color => "#" + color );

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


/*************************************************************************************************
 * External API Commands
 ************************************************************************************************/

function registerCommands() {

	// Register non-screen commands
	g_commands.addCommand( "setDefaultPal", setDefaultPal, false, [ "pal" ] );
	g_commands.addCommand( "getDefaultPal", getDefaultPal, false, [ "include0" ] );
	g_commands.addCommand( "setDefaultColor", setDefaultColor, false, [ "color" ] );
	g_commands.addCommand( "getDefaultColor", getDefaultColor, false, [ "asIndex" ] );
	g_commands.addCommand( "createColor", createColor, false, [ "color" ] );

	// Register screen commands
	g_commands.addCommand( "setColor", setColor, true, [ "color" ] );
	g_commands.addCommand( "getColor", getColor, true, [ "asIndex" ] );
	g_commands.addCommand( "getPal", getPal, true, [ "include0" ] );
	g_commands.addCommand( "setPal", setPal, true, [ "pal" ] );
	g_commands.addCommand( "getPalIndex", getPalIndex, true, [ "color", "tolerance" ] );
	g_commands.addCommand( "setBgColor", setBgColor, true, [ "color" ] );
	g_commands.addCommand( "setContainerBgColor", setContainerBgColor, true, [ "color" ] );
	g_commands.addCommand( "setPalColors", setPalColors, true, [ "indices", "colors" ] );
	g_commands.addCommand( "addPalColors", addPalColors, true, [ "colors" ] );
	g_commands.addCommand( "getPalColor", getPalColor, true, [ "index" ] );
}

/**
 * Set the palette used by newly created screens, reserving index zero for transparency.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function setDefaultPal( options ) {
	const pal = options.pal;

	if( !Array.isArray( pal ) ) {
		g_errors.throwError(
			TypeError, "setDefaultPal: Parameter pal must be an array.", "INVALID_PARAMETER"
		);
	}

	if( pal.length === 0 ) {
		g_errors.throwError(
			RangeError, "setDefaultPal: Parameter pal must have at least one color value.",
			"EMPTY_PALETTE"
		);
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

/**
 * Return copies of the default palette colors.
 *
 * @param {Object} options - Command options.
 * @returns {Array<Object>}
 */
function getDefaultPal( options ) {
	const filteredPal = [];

	// Index 0, transparent black, is included only when include0 is true
	let startIndex = 0;
	if( !options.include0 ) {
		startIndex = 1;
	}

	// Need to explicitly convert each color because I don't want the default pal to be modified
	// outside.
	for( let i = startIndex; i < m_defaultPal.length; i += 1 ) {
		filteredPal.push( g_utils.rgbToColor(
			m_defaultPal[ i ].r,
			m_defaultPal[ i ].g,
			m_defaultPal[ i ].b,
			m_defaultPal[ i ].a
		) );
	}
	return filteredPal;
}

/**
 * Set the initial drawing color for newly created screens.
 *
 * @param {Object} options - Command options.
 * @returns {void}
 */
function setDefaultColor( options ) {
	const colorValue = getColorValueByRawInput( { "pal": m_defaultPal }, options.color );
	if( colorValue === null ) {
		g_errors.throwError(
			TypeError,
			"setDefaultColor: Parameter color must be a valid color or an integer palette " +
			"index in range.",
			"INVALID_PARAMETER"
		);
	}
	m_defaultColor = colorValue;
}

/**
 * Return the default drawing color as a palette index or color object.
 *
 * @param {Object} options - Command options.
 * @returns {number|Object|null}
 */
function getDefaultColor( options ) {
	const asIndex = options.asIndex ?? true;
	if( asIndex ) {
		const fakeScreenData = { "pal": m_defaultPal, "palMap": m_defaultPalMap };
		return findColorIndexByColorValue( fakeScreenData, m_defaultColor );
	}
	return g_utils.createColor( m_defaultColor.array );
}

/**
 * Convert a supported color value into a color object.
 *
 * @param {Object} options - Command options.
 * @returns {Object}
 */
function createColor( options ) {
	const color = g_utils.convertToColor( options.color );
	if( color === null ) {
		g_errors.throwError(
			TypeError, "createColor: Parameter color is not a valid color format.",
			"INVALID_PARAMETER"
		);
	}
	return color;
}

/**
 * Set the screen drawing color from a palette index or color value.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {void}
 */
function setColor( screenData, options ) {
	const colorInput = options.color;

	let colorValue;

	// Resolve numeric palette indices before publishing the drawing color
	if( typeof colorInput === "number" ) {
		colorValue = getColorValueByIndex( screenData, colorInput );
		if( colorValue === null ) {
			g_errors.throwError(
				TypeError, "setColor: Parameter color index is not in pal.", "INVALID_PARAMETER"
			);
		}
	} else {

		// Convert the color to a colorValue
		colorValue = g_utils.convertToColor( colorInput );

		// If we were unable to convert this color than it is not a valid color format
		if( colorValue === null ) {
			g_errors.throwError(
				TypeError, "setColor: Parameter color is not a valid color format.",
				"INVALID_PARAMETER"
			);
		}
	}

	// Update the color values
	screenData.color = colorValue;
}

/**
 * Return the screen drawing color as a palette index or color object.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {number|Object|null}
 */
function getColor( screenData, options ) {
	const asIndex = !!options.asIndex;
	if( asIndex ) {
		return findColorIndexByColorValue( screenData, screenData.color );
	}
	return g_utils.createColor( screenData.color.array );
}


/**
 * Return copies of the screen palette colors.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {Array<Object>}
 */
function getPal( screenData, options ) {
	const filteredPal = [];

	// Index 0, transparent black, is included only when include0 is true
	let startIndex = 0;
	if( !options.include0 ) {
		startIndex = 1;
	}

	// Need to explicitly convert each color because I don't want the pal to be modified
	// outside.
	for( let i = startIndex; i < screenData.pal.length; i += 1 ) {
		filteredPal.push( g_utils.rgbToColor(
			screenData.pal[ i ].r,
			screenData.pal[ i ].g,
			screenData.pal[ i ].b,
			screenData.pal[ i ].a
		) );
	}
	return filteredPal;
}

/**
 * Replace the screen palette and update its color lookup map.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {void}
 */
function setPal( screenData, options ) {
	const pal = options.pal;

	if( !Array.isArray( pal ) ) {
		g_errors.throwError(
			TypeError, "setPal: Parameter pal is must be an array.", "INVALID_PARAMETER"
		);
	}

	if( pal.length === 0 ) {
		g_errors.throwError(
			RangeError, "setPal: Parameter pal must have at least one color value.", "EMPTY_PALETTE"
		);
	}

	// Create a new pal with 0'th color set to black transparent
	const newPal = [ g_utils.rgbToColor( 0, 0, 0, 0 ) ];

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

/**
 * Find a palette index for a color within the requested tolerance.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {number|null}
 */
function getPalIndex( screenData, options ) {
	const color = options.color;
	const tolerance = g_utils.getFloat( options.tolerance, 0 );

	// Validate tolerance variable
	if( tolerance < 0 || tolerance > 1 ) {
		g_errors.throwError(
			RangeError,
			"getPalIndex: Parameter tolerance must be a number between 0 and 1 " +
			"(0 = exact match, 1 = any color).",
			"INVALID_PARAMETER"
		);
	}

	// Convert to color value
	const colorValue = g_utils.convertToColor( color );
	if( colorValue === null ) {
		g_errors.throwError(
			TypeError, "getPalIndex: Parameter color is not a valid color format.", "INVALID_COLOR"
		);
	}

	const index = findColorIndexByColorValue( screenData, colorValue, tolerance );
	return index;
}

/**
 * Set the canvas background color.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {void}
 */
function setBgColor( screenData, options ) {
	const colorRaw = options.color;
	const color = getColorValueByRawInput( screenData, colorRaw );
	if( color !== null ) {
		screenData.canvas.style.backgroundColor = g_utils.colorToHex( color );
	} else {
		g_errors.throwError(
			TypeError, "setBgColor: invalid color value for parameter color.", "INVALID_COLOR"
		);
	}
}

/**
 * Set the background color of the screen container.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {void}
 */
function setContainerBgColor( screenData, options ) {
	if( !screenData.container ) {
		return;
	}

	const colorRaw = options.color;
	const color = getColorValueByRawInput( screenData, colorRaw );

	if( color !== null ) {
		screenData.container.style.backgroundColor = g_utils.colorToHex( color );
	} else {
		g_errors.throwError(
			TypeError, "setContainerBgColor: invalid color value for parameter color.",
			"INVALID_COLOR"
		);
	}
}

/**
 * Replace selected palette colors and update the screen pixels.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {void}
 */
function setPalColors( screenData, options ) {
	const indices = options.indices;
	const colors = options.colors;

	// Validate indices array
	if( !Array.isArray( indices ) ) {
		g_errors.throwError(
			TypeError, "setPalColors: Parameter indices must be an array.", "INVALID_INDICES"
		);
	}

	// Validate colors array
	if( !Array.isArray( colors ) ) {
		g_errors.throwError(
			TypeError, "setPalColors: Parameter colors must be an array.", "INVALID_COLORS"
		);
	}

	// Arrays must have the same length
	if( indices.length !== colors.length ) {
		g_errors.throwError(
			RangeError, "setPalColors: Parameters indices and colors must have the same length.",
			"LENGTH_MISMATCH"
		);
	}

	// Arrays must not be empty
	if( indices.length === 0 ) {
		return;
	}

	// Validate each index and color
	for( let i = 0; i < indices.length; i += 1 ) {
		const index = indices[ i ];
		const color = colors[ i ];

		// index must be an integer
		if(
			!Number.isInteger( index ) ||
			index < 0 ||
			index >= screenData.pal.length
		) {
			console.warn(
				`setPalColors: Parameter indices[${i}] must be an integer value between 0 and ` +
				`${screenData.pal.length - 1}.`
			);
			continue;
		}

		// index cannot be 0
		if( index === 0 ) {
			console.warn(
				`setPalColors: Parameter indices[${i}] cannot be 0, this is reserved for ` +
				"transparency. To set background color of the screen use the setBgColor command."
			);
			continue;
		}

		// Get the color value
		const colorValue = g_utils.convertToColor( color );
		if( colorValue === null ) {
			console.warn(
				`setPalColors: Parameter colors[${i}] is not a valid color format.`
			);
			continue;
		}

		// Store the old color before replacing
		const oldColor = screenData.pal[ index ];

		// Skip if color is not changing
		if( colorValue.key === oldColor.key ) {
			continue;
		}

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
}

/**
 * Append colors to the screen palette.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {Array<number>} Indices of newly added colors.
 */
function addPalColors( screenData, options ) {
	const colors = options.colors;

	// Validate colors array
	if( !Array.isArray( colors ) ) {
		g_errors.throwError(
			TypeError, "addPalColors: Parameter colors must be an array.", "INVALID_COLORS"
		);
	}

	// Array must not be empty
	if( colors.length === 0 ) {
		return [];
	}

	const newIndices = [];

	// Convert and add each color to the palette
	for( let i = 0; i < colors.length; i += 1 ) {
		const color = colors[ i ];

		// Get the color value
		const colorValue = g_utils.convertToColor( color );
		if( colorValue === null ) {
			console.warn( `addPalColors: Parameter colors[${i}] is not a valid color format.` );
			continue;
		}

		// Check if color already exists in palette
		const existingIndex = screenData.palMap.get( colorValue.key );
		if( existingIndex !== undefined ) {

			// Color already exists, skip it
			continue;
		}

		// Add the new color to the palette
		const newIndex = screenData.pal.length;
		screenData.pal.push( colorValue );
		screenData.palMap.set( colorValue.key, newIndex );
		newIndices.push( newIndex );
	}

	return newIndices;
}

/**
 * Return a copy of the color at the requested palette index.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} options - Command options.
 * @returns {Object|null} Color, or null when the index is invalid.
 */
function getPalColor( screenData, options ) {
	const color = getColorValueByIndex( screenData, options.index );
	if( color !== null ) {
		return g_utils.createColor( color.array );
	}
	return null;
}


/*************************************************************************************************
 * Internal Commands
 ************************************************************************************************/


/**
 * Resolve a palette index or supported color value into an internal color object.
 *
 * @param {Object} screenData - Screen state.
 * @param {*} rawInput - Palette index or supported color value.
 * @returns {Object|null}
 */
export function getColorValueByRawInput( screenData, rawInput ) {

	// Every number denotes a palette index, including invalid numeric inputs
	if( typeof rawInput === "number" ) {
		return getColorValueByIndex( screenData, rawInput );
	}

	return g_utils.convertToColor( rawInput );
}

/**
 * Find the closest palette entry within tolerance without adding a color.
 *
 * @param {Object} screenData - Screen state.
 * @param {Object} color - RGBA color object.
 * @param {number} [tolerance] - Color matching tolerance from zero to one.
 * @returns {number|null}
 */
export function findColorIndexByColorValue( screenData, color, tolerance = 0 ) {

	// First check by key - fastest lookup
	if( screenData.palMap.has( color.key ) ) {
		return screenData.palMap.get( color.key );
	}

	// Calculate minimum similarity threshold for color comparison
	// Tolerance: 0 = exact match only, 1 = any color
	const minSimularity = ( 1 - tolerance * tolerance ) * MAX_DIFFERENCE;

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

		const similarity = MAX_DIFFERENCE - difference;
		if( similarity >= minSimularity ) {
			if( similarity > bestMatchSimularity ) {
				bestMatchIndex = i;
				bestMatchSimularity = similarity;
			}
		}
	}

	return bestMatchIndex;
}

/**
 * Resolve a numeric integer palette index without coercion.
 *
 * @param {Object} screenData - Screen data containing the palette.
 * @param {*} palIndex - Palette index, including zero for transparent black.
 * @returns {Object|null} Palette color, or null for an invalid index.
 */
export function getColorValueByIndex( screenData, palIndex ) {
	if( !Number.isInteger( palIndex ) || palIndex < 0 || palIndex >= screenData.pal.length ) {
		return null;
	}
	return screenData.pal[ palIndex ];
}
