/**
 * Pi.js - Colors Module
 * 
 * Manages the color palettes and color values
 * 
 * @module core/colors
 */

"use strict";

import * as commands from "./commands";
import * as utils from "./utils";
import * as screenManager from "./screen-manager";
import * as renderer from "./renderer";

let m_defaultPal = [];
let m_defaultColor = -1;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize color defaults
export function init() {

	// Default 256-color palette (CGA + extended colors) - raw hex strings
	const defaultPaletteHex = [
		"#000000", "#0000AA", "#00AA00", "#00AAAA", "#AA0000",
		"#AA00AA", "#AA5500", "#AAAAAA", "#555555", "#5555FF", "#55FF55", "#55FFFF",
		"#FF5555", "#FF55FF", "#FFFF55", "#FFFFFF", "#000000", "#141414", "#202020",
		"#2D2D2D", "#393939", "#454545", "#515151", "#616161", "#717171", "#828282",
		"#929292", "#A2A2A2", "#B6B6B6", "#CACACA", "#E3E3E3", "#FFFFFF", "#0000FF",
		"#4100FF", "#7D00FF", "#BE00FF", "#FF00FF", "#FF00BE", "#FF007D", "#FF0041",
		"#FF0000", "#FF4100", "#FF7D00", "#FFBE00", "#FFFF00", "#BEFF00", "#7DFF00",
		"#41FF00", "#00FF00", "#00FF41", "#00FF7D", "#00FFBE", "#00FFFF", "#00BEFF",
		"#007DFF", "#0041FF", "#7D7DFF", "#9E7DFF", "#BE7DFF", "#DF7DFF", "#FF7DFF",
		"#FF7DDF", "#FF7DBE", "#FF7D9E", "#FF7D7D", "#FF9E7D", "#FFBE7D", "#FFDF7D",
		"#FFFF7D", "#DFFF7D", "#BEFF7D", "#9EFF7D", "#7DFF7D", "#7DFF9E", "#7DFFBE",
		"#7DFFDF", "#7DFFFF", "#7DDFFF", "#7DBEFF", "#7D9EFF", "#B6B6FF", "#C6B6FF",
		"#DBB6FF", "#EBB6FF", "#FFB6FF", "#FFB6EB", "#FFB6DB", "#FFB6C6", "#FFB6B6",
		"#FFC6B6", "#FFDBB6", "#FFEBB6", "#FFFFB6", "#EBFFB6", "#DBFFB6", "#C6FFB6",
		"#B6FFB6", "#B6FFC6", "#B6FFDB", "#B6FFEB", "#B6FFFF", "#B6EBFF", "#B6DBFF",
		"#B6C6FF", "#000071", "#1C0071", "#390071", "#550071", "#710071", "#710055",
		"#710039", "#71001C", "#710000", "#711C00", "#713900", "#715500", "#717100",
		"#557100", "#397100", "#1C7100", "#007100", "#00711C", "#007139", "#007155",
		"#007171", "#005571", "#003971", "#001C71", "#393971", "#453971", "#553971",
		"#613971", "#713971", "#713961", "#713955", "#713945", "#713939", "#714539",
		"#715539", "#716139", "#717139", "#617139", "#557139", "#457139", "#397139",
		"#397145", "#397155", "#397161", "#397171", "#396171", "#395571", "#394571",
		"#515171", "#595171", "#615171", "#695171", "#715171", "#715169", "#715161",
		"#715159", "#715151", "#715951", "#716151", "#716951", "#717151", "#697151",
		"#617151", "#597151", "#517151", "#517159", "#517161", "#517169", "#517171",
		"#516971", "#516171", "#515971", "#000041", "#100041", "#200041", "#310041",
		"#410041", "#410031", "#410020", "#410010", "#410000", "#411000", "#412000",
		"#413100", "#414100", "#314100", "#204100", "#104100", "#004100", "#004110",
		"#004120", "#004131", "#004141", "#003141", "#002041", "#001041", "#202041",
		"#282041", "#312041", "#392041", "#412041", "#412039", "#412031", "#412028",
		"#412020", "#412820", "#413120", "#413920", "#414120", "#394120", "#314120",
		"#284120", "#204120", "#204128", "#204131", "#204139", "#204141", "#203941",
		"#203141", "#202841", "#2D2D41", "#312D41", "#352D41", "#3D2D41", "#412D41",
		"#412D3D", "#412D35", "#412D31", "#412D2D", "#41312D", "#41352D", "#413D2D",
		"#41412D", "#3D412D", "#35412D", "#31412D", "#2D412D", "#2D4131", "#2D4135",
		"#2D413D", "#2D4141", "#2D3D41", "#2D3541", "#2D3141", "#000000", "#000000",
		"#000000", "#000000", "#000000", "#000000", "#000000"
	];

	// Set the default pal and color
	setDefaultPal( { "pal": defaultPaletteHex } );
	setDefaultColor( { "color": 7 } );

	// Add getters for screen manager to get defaults for dynamic items
	screenManager.addScreenDataItemGetter( "pal", () => m_defaultPal );
	screenManager.addScreenDataItemGetter( "color", () => m_defaultColor );
	screenManager.addScreenDataItemGetter( "colorCache", getPrepopulatedColorCache );
}

// Gets the color value by index or raw color value
export function getColorValue( screenData, colorInput, commandName ) {
	let colorValue;

	if( Number.isInteger( colorInput ) ) {
		if( colorInput > screenData.pal.length ) {
			const error = new RangeError(
				`${commandName}: parameter color is not a color in the palette.`
			);
			error.code = "COLOR_OUT_OF_RANGE";
			throw error;
		}
		colorValue = screenData.pal[ colorInput ];
	} else {
		colorValue = utils.convertToColor( colorInput );
		if( colorValue === null ) {
			const error = new TypeError(
				`${commandName}: parameter color is not a valid color format.`
			);
			error.code = "INVALID_COLOR";
			throw error;
		}
	}

	return colorValue;
}

export function getColorIndex( screenData, colorValue, tolerance, isAddToPalette ) {
	let c = findColorIndex( colorValue, screenData.pal, tolerance, screenData.colorCache );

	if( c === false ) {
		if( isAddToPalette ) {
			screenData.pal.push( colorValue );
			c = screenData.pal.length;
			screenData.colorCache[ oldColor.s ] = c;
		} else {
			return 0;
		}
	}
	return c;
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// Set default pal
commands.addCommand( "setDefaultPal", setDefaultPal, [ "pal" ] );
function setDefaultPal( options ) {
	const pal = options.pal;

	if( !Array.isArray( pal ) ) {
		const error = new TypeError( "setDefaultPal: parameter pal is not an array." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( pal.length < 2 ) {
		const error = new RangeError(
			"setDefaultPal: parameter pal must have at least two color values."
		);
		error.code = "EMPTY_PALETTE";
		throw error;
	}

	m_defaultPal = [];

	for( let i = 0; i < pal.length; i++ ) {
		const c = utils.convertToColor( pal[ i ] );
		if( c === null ) {
			console.warn( "setDefaultPal: invalid color value inside array pal." );
			m_defaultPal.push( utils.convertToColor( "#000000" ) );
		} else {
			m_defaultPal.push( c );
		}
	}

	// Set color 0 to transparent
	const firstColor = m_defaultPal[ 0 ];
	m_defaultPal[ 0 ] = utils.convertToColor( [
		firstColor.r,
		firstColor.g,
		firstColor.b,
		0
	] );

	// Make sure default color is in the new palette
	const defaultColorIndex = findColorIndex( m_defaultColor, m_defaultPal, 1 );
	if( defaultColorIndex && defaultColorIndex < m_defaultPal.length ) {
		m_defaultColor = m_defaultPal[ defaultColorIndex ];
	} else {
		m_defaultColor = m_defaultPal[ 1 ];
	}
}

// Set default color
commands.addCommand( "setDefaultColor", setDefaultColor, [ "color" ] );
function setDefaultColor( options ) {
	let c = options.color;

	if( !isNaN( Number( c ) ) && m_defaultPal.length > c ) {
		m_defaultColor = m_defaultPal[ c ];
	} else {
		c = utils.convertToColor( c );
		if( c === null ) {
			const error = new TypeError(
				"setDefaultColor: invalid color value for parameter color."
			);
			error.code = "INVALID_COLOR";
			throw error;
		}
		m_defaultColor = c;
	}
}

// Set color
screenManager.addCommand( "setColor", setColor, [ "color", "isAddToPalette" ] );
function setColor( screenData, options ) {
	const colorInput = options.color;
	const isAddToPalette = !!options.isAddToPalette;
	const colorValue = getColorValue( screenData, colorInput, "setColor" );

	if( colorValue === undefined ) {
		return;
	}

	if( isAddToPalette ) {

		// Find or add color to palette
		const colorIndex = screenData.api.findColor( screenData, colorValue, 1, isAddToPalette );
		screenData.color = screenData.pal[ colorIndex ];
	} else {
		screenData.color = colorValue;
	}

	// Update canvas context styles for AA mode
	screenData.context.fillStyle = screenData.color.s;
	screenData.context.strokeStyle = screenData.color.s;
}

// Given a color value, find the index from the color palette.
screenManager.addCommand( "findColor", findColor, [ "color", "tolerance", "isAddToPalette" ] );
function findColor( screenData, options ) {
	let color = options.color;
	let tolerance = options.tolerance;
	const isAddToPalette = !!options.isAddToPalette;

	if( tolerance == null ) {
		tolerance = 1;
	} else if( isNaN( tolerance ) || tolerance < 0 || tolerance > 1 ) {
		const error = new RangeError(
			"findColor: parameter tolerance must be a number between 0 and 1"
		);
		error.code = "INVALID_TOLERANCE";
		throw error;
	}

	const pal = screenData.pal;

	// Check cache first
	if( color && color.s && screenData.colorCache[ color.s ] !== undefined ) {
		return screenData.colorCache[ color.s ];
	}

	// Convert color to color object
	color = getColorValue( screenData, color, "findColor" );

	const index = findColorIndex( color, pal, tolerance, screenData.colorCache );
	if( index ) {
		return index;
	}

	// Add to palette if allowed
	if( isAddToPalette ) {
		pal.push( color );
		screenData.colorCache[ color.s ] = pal.length - 1;
		return pal.length - 1;
	}

	return false;
}

// Set the background color of the canvas
screenManager.addCommand( "setBgColor", setBgColor, [ "color" ] );
function setBgColor( screenData, options ) {
	const color = options.color;
	let bc;

	if( Number.isInteger( color ) ) {
		bc = screenData.pal[ color ];
	} else {
		bc = utils.convertToColor( color );
	}
	if( bc && typeof bc.s === "string" ) {
		screenData.canvas.style.backgroundColor = bc.s;
	} else {
		const error = new TypeError( "bgColor: invalid color value for parameter color." );
		error.code = "INVALID_COLOR";
		throw error;
	}
}

// Set the background color of the container
screenManager.addCommand( "setContainerBgColor", setContainerBgColor, [ "color" ] );
function setContainerBgColor( screenData, options ) {
	const color = options.color;
	let bc;
	if( screenData.container ) {
		if( Number.isInteger( color ) ) {
			bc = screenData.pal[ color ];
		} else {
			bc = utils.convertToColor( color );
		}
		if( bc && typeof bc.s === "string" ) {
			screenData.container.style.backgroundColor = bc.s;
			return;
		} else {
			const error = new TypeError(
				"containerBgColor: invalid color value for parameter color."
			);
			error.code = "INVALID_COLOR";
			throw error
		}
	}
}

// Set palette color
screenManager.addCommand( "setPalColor", setPalColor, [ "index", "color" ] );
function setPalColor( screenData, options ) {
	const index = options.index;
	const color = options.color;

	if(
		!Number.isInteger( index ) ||
		index < 0 ||
		index >= screenData.pal.length
	) {
		const error = new RangeError( "setPalColor: index is not a valid integer value." );
		error.code = "INVALID_INDEX";
		throw error;
	}

	const colorValue = utils.convertToColor( color );
	if( colorValue === null ) {
		const error = new TypeError(
			"setPalColor: parameter color is not a valid color format."
		);
		error.code = "INVALID_COLOR";
		throw error;
	}

	// Store the old color before replacing
	const oldColor = screenData.pal[ index ];

	// Check if we are changing the current selected fore color
	if( screenData.color.s === oldColor.s ) {
		screenData.color = colorValue;
		screenData.context.fillStyle = colorValue.s;
		screenData.context.strokeStyle = colorValue.s;
	}

	// Set the new palette color
	screenData.pal[ index ] = colorValue;

	// Update the colorCache - remove old color entry and add new one
	delete screenData.colorCache[ oldColor.s ];
	screenData.colorCache[ colorValue.s ] = index;
}

// Get palette
screenManager.addCommand( "getPal", getPal, [] );
function getPal( screenData ) {
	const colors = [];
	for( let i = 0; i < screenData.pal.length; i++ ) {
		const color = {
			"r": screenData.pal[ i ].r,
			"g": screenData.pal[ i ].g,
			"b": screenData.pal[ i ].b,
			"a": screenData.pal[ i ].a,
			"s": screenData.pal[ i ].s,
			"s2": screenData.pal[ i ].s2
		};
		colors.push( color );
	}
	return colors;
}

// Set entire palette
screenManager.addCommand( "setPal", setPal, [ "pal" ] );
function setPal( screenData, options ) {
	const pal = options.pal;

	if( !Array.isArray( pal ) ) {
		const error = new TypeError( "setPal: parameter pal is not an array." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	if( pal.length < 2 ) {
		const error = new RangeError(
			"setPal: parameter pal must have at least two color values."
		);
		error.code = "EMPTY_PALETTE";
		throw error;
	}

	// Convert all colors and validate
	const newPal = [];
	for( let i = 0; i < pal.length; i++ ) {
		const c = utils.convertToColor( pal[ i ] );
		if( c === null ) {
			const error = new TypeError(
				`setPal: invalid color value at index ${i} in array pal.`
			);
			error.code = "INVALID_COLOR";
			throw error;
		}
		newPal.push( c );
	}

	// Set color 0 to transparent (first color should always be transparent)
	const firstColor = newPal[ 0 ];
	newPal[ 0 ] = utils.convertToColor( [
		firstColor.r,
		firstColor.g,
		firstColor.b,
		0
	] );

	// Set the new palette
	screenData.pal = newPal;

	// Clear the colorCache since we've replaced the entire palette
	screenData.colorCache = {};

	// Rebuild cache for new palette colors
	for( let i = 0; i < newPal.length; i++ ) {
		screenData.colorCache[ newPal[ i ].s ] = i;
	}

	// Check if current drawing color needs to be updated
	// Find the new palette index that best matches the current color
	const currentColor = screenData.color;
	const newIndex = findColorIndex( currentColor, newPal, 1, screenData.colorCache );
	if( newIndex !== false ) {
		screenData.color = newPal[ newIndex ];
		screenData.context.fillStyle = screenData.color.s;
		screenData.context.strokeStyle = screenData.color.s;
	} else {

		// If current color not found, default to palette index 1
		screenData.color = newPal[ 1 ];
		screenData.context.fillStyle = screenData.color.s;
		screenData.context.strokeStyle = screenData.color.s;
	}
}

// swapColor command
screenManager.addCommand( "swapColor", swapColor, [ "oldColor", "newColor" ] );
function swapColor( screenData, options ) {
	let oldColor = options.oldColor;
	const newColor = options.newColor;

	// Validate oldColor
	if( !Number.isInteger( oldColor ) ) {
		const error = new TypeError( "swapColor: Parameter oldColor must be an integer." );
		error.code = "INVALID_PARAMETERS";
		throw error;
	} else if( oldColor < 0 || oldColor > screenData.pal.length ) {
		const error = new RangeError( "swapColor: Parameter oldColor is an invalid integer." );
		error.code = "INVALID_COLOR_INDEX";
		throw error;
	} else if( screenData.pal[ oldColor ] === undefined ) {
		const error = new RangeError(
			"swapColor: Parameter oldColor is not in the screen color palette."
		);
		error.code = "COLOR_NOT_IN_PALETTE";
		throw error;
	}

	const index = oldColor;
	oldColor = screenData.pal[ index ];

	// Validate newColor
	const newColorValue = utils.convertToColor( newColor );
	if( newColorValue === null ) {
		const error = new TypeError(
			"swapColor: Parameter newColor is not a valid color format."
		);
		error.code = "INVALID_COLOR";
		throw error;
	}

	renderer.getImageData( screenData );
	const data = screenData.imageData.data;

	// Swap all colors
	for( let y = 0; y < screenData.height; y++ ) {
		for( let x = 0; x < screenData.width; x++ ) {
			const i = ( ( screenData.width * y ) + x ) * 4;
			if(
				data[ i ] === oldColor.r &&
				data[ i + 1 ] === oldColor.g &&
				data[ i + 2 ] === oldColor.b &&
				data[ i + 3 ] === oldColor.a
			) {
				data[ i ] = newColorValue.r;
				data[ i + 1 ] = newColorValue.g;
				data[ i + 2 ] = newColorValue.b;
				data[ i + 3 ] = newColorValue.a;
			}
		}
	}

	renderer.setImageDirty( screenData );

	// Update the pal data
	screenData.pal[ index ] = newColorValue;

	// Update the colorCache - remove old color entry and add new one
	delete screenData.colorCache[ oldColor.s ];
	screenData.colorCache[ newColorValue.s ] = index;
}


/***************************************************************************************************
 * Internal Commands
 **************************************************************************************************/


// Prepopulate color cache with all palette colors
function getPrepopulatedColorCache() {
	const cache = {};
	for( let i = 0; i < m_defaultPal.length; i++ ) {
		cache[ m_defaultPal[ i ].s ] = i;
	}
	return cache;
}

function findColorIndex( color, pal, tolerance, cache = {} ) {

	// Max color difference constant
	const maxDifference = ( 255 * 255 ) * 3.25;
	tolerance = tolerance * ( 2 - tolerance ) * maxDifference;

	// TODO: Maybe add special handling for pal index 0 which should is transparent color
	// Find exact match or closest color in palette
	for( let i = 0; i < pal.length; i++ ) {
		if( pal[ i ].s === color.s ) {
			cache[ color.s ] = i;
			return i;
		} else {
			const dr = pal[ i ].r - color.r;
			const dg = pal[ i ].g - color.g;
			const db = pal[ i ].b - color.b;
			const da = pal[ i ].a - color.a;

			// TODO: Need to unify color distance formula in all use cases
			// TODO: Research better color distance formulas
			const difference = ( dr * dr + dg * dg + db * db + da * da * 0.25 );
			const similarity = maxDifference - difference;

			if( similarity >= tolerance ) {
				cache[ color.s ] = i;
				return i;
			}
		}
	}

	return false;
}
