/**
 * Pi.js - Draw Module
 * 
 * BASIC-style draw command with string syntax for procedural drawing
 * 
 * @module api/draw
 */

"use strict";

import * as g_screenManager from "../core/screen-manager.js";
import * as g_utils from "../core/utils.js";
import * as g_commands from "../core/commands.js";


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


/**
 * Initialize draw module
 * 
 * @param {Object} api - The main Pi.js API object
 * @returns {void}
 */
export function init( api ) {
	g_screenManager.addScreenDataItem( "cursor", { "x": 0, "y": 0 } );
	g_screenManager.addScreenDataItem( "angle", 0 );

	registerCommands();
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


function registerCommands() {
	g_commands.addCommand( "draw", draw, true, [ "drawString" ] );
}


/**
 * Draw command - BASIC-style draw command with string syntax
 * 
 * @param {Object} screenData - The screen data object
 * @param {Object} options - Options object with drawString
 * @param {string} options.drawString - The draw command string
 * @returns {void}
 */
function draw( screenData, options ) {
	let drawString = options.drawString;

	if( typeof drawString !== "string" ) {
		const error = new TypeError( "draw: Parameter drawString must be a string." );
		error.code = "INVALID_PARAMETER";
		throw error;
	}

	// Convert to uppercase
	drawString = drawString.toUpperCase();

	// Get colors
	const tempColors = drawString.match( /(#[A-Z0-9]+)/g );
	if( tempColors ) {
		for( let i = 0; i < tempColors.length; i++ ) {
			drawString = drawString.replace( "C" + tempColors[ i ], "O" + i );
		}
	}

	// Remove spaces and invalid characters (keep only valid commands, numbers, #, and commas)
	// Note: Z is not included because Z is a replacement character and not allowed in original
	// string
	drawString = drawString.replace( /[^CRBFGLATDHUENMPSO0-9#,]/g, "" );
	
	// Convert TA to T
	drawString = drawString.replace( /(TA)/gi, "T" );

	// Convert ARC to Z
	drawString = drawString.replace( /(ARC)/gi, "Z" );
	
	// Regular expression for the draw commands
	const reg = /(?=C|O|R|B|F|G|L|A|T|D|G|H|U|E|N|M|P|S|Z)/;

	// Run the regular expression and split into separate commands
	const parts = drawString.split( reg );

	// This triggers a move back after drawing the next command
	let isReturn = false;

	// Store the last cursor - use current angle, not 0
	let lastCursor = {
		"x": screenData.cursor.x,
		"y": screenData.cursor.y,
		"angle": screenData.angle
	};

	// Move without drawing
	let isBlind = false;

	let isArc = false;
	let arcRadius, arcAngle1, arcAngle2;
	let scale = 1;

	for( let i = 0; i < parts.length; i++ ) {
		const drawArgs = parts[ i ].split( /(\d+)/ );

		switch( drawArgs[ 0 ] ) {

			// C - Change Color - Using integer
			case "C": {
				const colorNum = Number( drawArgs[ 1 ] );
				screenData.api.setColor( colorNum );
				isBlind = true;
				break;
			}

			// O - Change Color - Using string
			case "O": {
				const colorStr = tempColors[ drawArgs[ 1 ] ];
				screenData.api.setColor( colorStr );
				isBlind = true;
				break;
			}

			// D - Down
			case "D": {
				const len = g_utils.getInt( drawArgs[ 1 ], 1 ) * scale;
				const angle = g_utils.degreesToRadian( 90 ) + screenData.angle;
				screenData.cursor.x += Math.round( Math.cos( angle ) * len );
				screenData.cursor.y += Math.round( Math.sin( angle ) * len );
				break;
			}

			// E - Up and Right
			case "E": {
				let len = g_utils.getInt( drawArgs[ 1 ], 1 ) * scale;
				len = Math.sqrt( len * len + len * len );
				const angle = g_utils.degreesToRadian( 315 ) + screenData.angle;
				screenData.cursor.x += Math.round( Math.cos( angle ) * len );
				screenData.cursor.y += Math.round( Math.sin( angle ) * len );
				break;
			}

			// F - Down and Right
			case "F": {
				let len = g_utils.getInt( drawArgs[ 1 ], 1 ) * scale;
				len = Math.sqrt( len * len + len * len );
				const angle = g_utils.degreesToRadian( 45 ) + screenData.angle;
				screenData.cursor.x += Math.round( Math.cos( angle ) * len );
				screenData.cursor.y += Math.round( Math.sin( angle ) * len );
				break;
			}

			// G - Down and Left
			case "G": {
				let len = g_utils.getInt( drawArgs[ 1 ], 1 ) * scale;
				len = Math.sqrt( len * len + len * len );
				const angle = g_utils.degreesToRadian( 135 ) + screenData.angle;
				screenData.cursor.x += Math.round( Math.cos( angle ) * len );
				screenData.cursor.y += Math.round( Math.sin( angle ) * len );
				break;
			}

			// H - Up and Left
			case "H": {
				let len = g_utils.getInt( drawArgs[ 1 ], 1 ) * scale;
				len = Math.sqrt( len * len + len * len );
				const angle = g_utils.degreesToRadian( 225 ) + screenData.angle;
				screenData.cursor.x += Math.round( Math.cos( angle ) * len );
				screenData.cursor.y += Math.round( Math.sin( angle ) * len );
				break;
			}

			// L - Left
			case "L": {
				const len = g_utils.getInt( drawArgs[ 1 ], 1 ) * scale;
				const angle = g_utils.degreesToRadian( 180 ) + screenData.angle;
				screenData.cursor.x += Math.round( Math.cos( angle ) * len );
				screenData.cursor.y += Math.round( Math.sin( angle ) * len );
				break;
			}

			// R - Right
			case "R": {
				const len = g_utils.getInt( drawArgs[ 1 ], 1 ) * scale;
				const angle = g_utils.degreesToRadian( 0 ) + screenData.angle;
				screenData.cursor.x += Math.round( Math.cos( angle ) * len );
				screenData.cursor.y += Math.round( Math.sin( angle ) * len );
				break;
			}

			// U - Up
			case "U": {
				const len = g_utils.getInt( drawArgs[ 1 ], 1 ) * scale;
				const angle = g_utils.degreesToRadian( 270 ) + screenData.angle;
				screenData.cursor.x += Math.round( Math.cos( angle ) * len );
				screenData.cursor.y += Math.round( Math.sin( angle ) * len );
				break;
			}

			// P - Paint Exact Match
			case "P": {
				const colorNum = g_utils.getInt( drawArgs[ 1 ], 0 );
				const boundryNumber = g_utils.getInt( drawArgs[ 3 ], null );
				screenData.api.paint(
					screenData.cursor.x, screenData.cursor.y, colorNum, 0, boundryNumber
				);
				isBlind = true;
				break;
			}

			// S - Scale
			/*
				Set scale factor. n may range from 1 to 255. n is divided by 4 to derive the scale 
				factor. The scale factor is multiplied by the distances given with U, D, L, R, E, 
				F, G, H, or relative M commands to get the actual distance traveled. The default 
				for S is 4.
			*/
			case "S": {
				const scaleNum = g_utils.getInt( drawArgs[ 1 ], 4 );
				scale = scaleNum / 4;
				isBlind = true;
				break;
			}

			// Z - Arc Line
			case "Z":
				arcRadius = g_utils.getInt( drawArgs[ 1 ], 1 );
				arcAngle1 = g_utils.getInt( drawArgs[ 3 ], 1 );
				arcAngle2 = g_utils.getInt( drawArgs[ 5 ], 1 );
				isArc = true;
				break;

			// A - Angle
			/*
				Set angle n. n may range from 0 to 3, where 0 is 0°, 1 is 90°, 2 is 180°, and 3 is
				270°. Figures rotated 90° or 270° are scaled so that they will appear the same size
				as with 0° or 180° on a monitor screen with the standard aspect ratio of 4:3.
			*/
			case "A":
				screenData.angle = g_utils.degreesToRadian(
					g_utils.clamp( g_utils.getInt( drawArgs[ 1 ], 0 ), 0, 3 ) * 90
				);
				isBlind = true;
				break;

			// TA - T - Turn Angle
			case "T":
				screenData.angle = g_utils.degreesToRadian(
					g_utils.clamp( g_utils.getInt( drawArgs[ 1 ], 0 ), -360, 360 )
				);
				isBlind = true;
				break;

			// M - Move
			case "M":
				screenData.cursor.x = g_utils.getInt( drawArgs[ 1 ], 1 );
				screenData.cursor.y = g_utils.getInt( drawArgs[ 3 ], 1 );
				isBlind = true;
				break;

			default:
				isBlind = true;
		}

		if( !isBlind ) {
			if( isArc ) {
				screenData.api.arc(
					screenData.cursor.x,
					screenData.cursor.y,
					arcRadius,
					arcAngle1,
					arcAngle2
				);
			} else {
				screenData.api.line(
					lastCursor.x,
					lastCursor.y,
					screenData.cursor.x,
					screenData.cursor.y
				);
			}
		}

		isBlind = false;
		isArc = false;

		if( isReturn ) {
			isReturn = false;
			screenData.cursor.x = lastCursor.x;
			screenData.cursor.y = lastCursor.y;
			screenData.angle = lastCursor.angle;
		}

		if( drawArgs[ 0 ] === "N" ) {
			isReturn = true;
		} else {
			lastCursor = {
				"x": screenData.cursor.x,
				"y": screenData.cursor.y,
				"angle": screenData.angle
			};
		}

		if( drawArgs[ 0 ] === "B" ) {
			isBlind = true;
		}
	}
}

