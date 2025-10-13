/**
 * Pi.js - DRAW Command Module
 * 
 * QBasic-style turtle graphics using draw strings
 * Commands: U/D/L/R (directions), E/F/G/H (diagonals), C (color),
 *           M (move), T (turn), B (blind), N (return), P/S (paint), A (arc)
 * 
 * @module modules/draw
 */

"use strict";

export function init( pi ) {
	const piData = pi._.data;

	// DRAW - QBasic-style turtle graphics
	pi._.addCommand( "draw", draw, false, true, [ "drawString" ] );

	function draw( screenData, args ) {
		let drawString = args[ 0 ];

		if( typeof drawString !== "string" ) {
			const error = new TypeError( "draw: drawString must be a string" );
			error.code = "INVALID_DRAW_STRING";
			throw error;
		}

		// Convert to uppercase
		drawString = drawString.toUpperCase();

		// Extract colors (e.g., C#FF0000)
		const tempColors = drawString.match( /(#[A-Z0-9]+)/g );
		if( tempColors ) {
			for( let i = 0; i < tempColors.length; i++ ) {
				drawString = drawString.replace( "C" + tempColors[ i ], "O" + i );
			}
		}

		// Convert TA to T
		drawString = drawString.replace( /(TA)/gi, "T" );

		// Remove spaces
		drawString = drawString.split( /\s+/ ).join( "" );

		// Regular expression for the draw commands
		const reg = /(?=C|C#|R|B|F|G|L|A|T|D|G|H|U|E|N|M|P|S)/;

		// Split into separate commands
		const parts = drawString.split( reg );

		// This triggers a move back after drawing the next command
		let isReturn = false;

		// Store the last cursor
		let lastCursor = {
			"x": screenData.x,
			"y": screenData.y,
			"angle": 0
		};

		// Move without drawing
		let isBlind = false;

		// Arc mode
		let isArc = false;

		for( let i = 0; i < parts.length; i++ ) {
			const drawArgs = parts[ i ].split( /(\d+)/ );

			switch( drawArgs[ 0 ] ) {

				// C - Change Color
				case "C":
					const color = Number( drawArgs[ 1 ] );
					screenData.screenObj.setColor( color );
					isBlind = true;
					break;

				case "O":
					const colorStr = tempColors[ drawArgs[ 1 ] ];
					screenData.screenObj.setColor( colorStr );
					isBlind = true;
					break;

				// D - Down
				case "D": {
					const len = pi.util.getInt( drawArgs[ 1 ], 1 );
					const angle = pi.util.degreesToRadian( 90 ) + screenData.angle;
					screenData.x += Math.round( Math.cos( angle ) * len );
					screenData.y += Math.round( Math.sin( angle ) * len );
					break;
				}

				// E - Up and Right
				case "E": {
					let len = pi.util.getInt( drawArgs[ 1 ], 1 );
					len = Math.sqrt( len * len + len * len );
					const angle = pi.util.degreesToRadian( 315 ) + screenData.angle;
					screenData.x += Math.round( Math.cos( angle ) * len );
					screenData.y += Math.round( Math.sin( angle ) * len );
					break;
				}

				// F - Down and Right
				case "F": {
					let len = pi.util.getInt( drawArgs[ 1 ], 1 );
					len = Math.sqrt( len * len + len * len );
					const angle = pi.util.degreesToRadian( 45 ) + screenData.angle;
					screenData.x += Math.round( Math.cos( angle ) * len );
					screenData.y += Math.round( Math.sin( angle ) * len );
					break;
				}

				// G - Down and Left
				case "G": {
					let len = pi.util.getInt( drawArgs[ 1 ], 1 );
					len = Math.sqrt( len * len + len * len );
					const angle = pi.util.degreesToRadian( 135 ) + screenData.angle;
					screenData.x += Math.round( Math.cos( angle ) * len );
					screenData.y += Math.round( Math.sin( angle ) * len );
					break;
				}

				// H - Up and Left
				case "H": {
					let len = pi.util.getInt( drawArgs[ 1 ], 1 );
					len = Math.sqrt( len * len + len * len );
					const angle = pi.util.degreesToRadian( 225 ) + screenData.angle;
					screenData.x += Math.round( Math.cos( angle ) * len );
					screenData.y += Math.round( Math.sin( angle ) * len );
					break;
				}

				// L - Left
				case "L": {
					const len = pi.util.getInt( drawArgs[ 1 ], 1 );
					const angle = pi.util.degreesToRadian( 180 ) + screenData.angle;
					screenData.x += Math.round( Math.cos( angle ) * len );
					screenData.y += Math.round( Math.sin( angle ) * len );
					break;
				}

				// R - Right
				case "R": {
					const len = pi.util.getInt( drawArgs[ 1 ], 1 );
					const angle = pi.util.degreesToRadian( 0 ) + screenData.angle;
					screenData.x += Math.round( Math.cos( angle ) * len );
					screenData.y += Math.round( Math.sin( angle ) * len );
					break;
				}

				// U - Up
				case "U": {
					const len = pi.util.getInt( drawArgs[ 1 ], 1 );
					const angle = pi.util.degreesToRadian( 270 ) + screenData.angle;
					screenData.x += Math.round( Math.cos( angle ) * len );
					screenData.y += Math.round( Math.sin( angle ) * len );
					break;
				}

				// P - Paint
				// S - Paint with boundary color
				case "P":
				case "S": {
					const color1 = pi.util.getInt( drawArgs[ 1 ], 0 );
					screenData.screenObj.paint(
						screenData.x,
						screenData.y,
						color1,
						drawArgs[ 0 ] === "S"
					);
					isBlind = true;
					break;
				}

				// A - Arc Line
				case "A": {
					const radius = pi.util.getInt( drawArgs[ 1 ], 1 );
					const angle1 = pi.util.getInt( drawArgs[ 3 ], 1 );
					const angle2 = pi.util.getInt( drawArgs[ 5 ], 1 );
					isArc = true;

					// Store arc parameters for next draw
					screenData._arcParams = { radius, angle1, angle2 };
					break;
				}

				// TA/T - Turn Angle
				case "T":
					screenData.angle = pi.util.degreesToRadian(
						pi.util.getInt( drawArgs[ 1 ], 1 )
					);
					isBlind = true;
					break;

				// M - Move to absolute position
				case "M":
					screenData.x = pi.util.getInt( drawArgs[ 1 ], 1 );
					screenData.y = pi.util.getInt( drawArgs[ 3 ], 1 );
					isBlind = true;
					break;

				default:
					isBlind = true;
			}

			// Draw line or arc from last position to current position
			if( !isBlind ) {
				if( isArc && screenData._arcParams ) {
					const arc = screenData._arcParams;
					screenData.screenObj.arc(
						screenData.x,
						screenData.y,
						arc.radius,
						arc.angle1,
						arc.angle2
					);
				} else {
					screenData.screenObj.line(
						lastCursor.x,
						lastCursor.y,
						screenData.x,
						screenData.y
					);
				}
			}

			isBlind = false;
			isArc = false;

			// Handle return (N command)
			if( isReturn ) {
				isReturn = false;
				screenData.x = lastCursor.x;
				screenData.y = lastCursor.y;
				screenData.angle = lastCursor.angle;
			}

			// Check for N (return after next command)
			if( drawArgs[ 0 ] === "N" ) {
				isReturn = true;
			} else {
				lastCursor = {
					"x": screenData.x,
					"y": screenData.y,
					"angle": screenData.angle
				};
			}

			// B command triggers blind mode for next move
			if( drawArgs[ 0 ] === "B" ) {
				isBlind = true;
			}
		}
	}
}

