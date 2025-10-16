/**
 * Pi.js - Table Module
 * 
 * Table formatting and printing with customizable borders
 * 
 * @module modules/table
 */

"use strict";

import * as screenManager from "../core/screen-manager.js";
import * as utils from "../core/utils.js";

// Predefined border styles
const m_borderStyles = {
	"single": [
		[ 218, 196, 194, 191 ],
		[ 195, 196, 197, 180 ],
		[ 192, 196, 193, 217 ],
		[ 179, 32, 179 ]
	],
	"double": [
		[ 201, 205, 203, 187 ],
		[ 204, 205, 206, 185 ],
		[ 200, 205, 202, 188 ],
		[ 186, 32, 186 ]
	],
	"singleDouble": [
		[ 213, 205, 209, 184 ],
		[ 198, 205, 216, 181 ],
		[ 212, 205, 207, 190 ],
		[ 179, 32, 179 ]
	],
	"doubleSingle": [
		[ 214, 196, 210, 183 ],
		[ 199, 196, 215, 182 ],
		[ 211, 196, 208, 189 ],
		[ 186, 32, 186 ]
	],
	"thick": [
		[ 219, 223, 219, 219 ],
		[ 219, 223, 219, 219 ],
		[ 223, 223, 223, 223 ],
		[ 219, 32, 219 ]
	]
};


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize table module
export function init() {

	// No initialization needed for table module
}


/***************************************************************************************************
 * External API Commands
 **************************************************************************************************/


// printTable command
screenManager.addCommand(
	"printTable",
	printTable,
	[ "items", "tableFormat", "borderStyle", "isCentered" ]
);

/**
 * Print a formatted table to the screen
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Options object
 * @param {Array} options.items - 2D array of items to display
 * @param {Array|null} options.tableFormat - Array of format strings (null for auto-format)
 * @param {string|Array|null} options.borderStyle - Border style name or custom array
 * @param {boolean} options.isCentered - Whether to center the table
 * @returns {Array} Array of box data objects with position/dimension info
 */
function printTable( screenData, options ) {
	const items = options.items;
	const tableFormat = options.tableFormat;
	let borderStyle = options.borderStyle;
	const isCentered = !!options.isCentered;

	// Validate items
	if( !utils.isArray( items ) ) {
		console.error( "printTable: items must be an array" );
		return [];
	}

	// Set default border style
	if( !borderStyle ) {
		borderStyle = m_borderStyles[ "single" ];
	}

	// Validate table format
	let isFormatted;
	if( tableFormat == null ) {
		isFormatted = false;
	} else if( utils.isArray( tableFormat ) ) {
		for( let i = 0; i < tableFormat.length; i++ ) {
			if( typeof tableFormat[ i ] !== "string" ) {
				console.error( "printTable: tableFormat must be an array of strings" );
				return [];
			}
		}
		isFormatted = true;
	} else {
		console.error( "printTable: tableFormat must be an array" );
		return [];
	}

	// Resolve border style
	if( typeof borderStyle === "string" && m_borderStyles[ borderStyle ] ) {
		borderStyle = m_borderStyles[ borderStyle ];
	} else if( !utils.isArray( borderStyle ) ) {
		console.error( "printTable: borderStyle must be a string or array" );
		return [];
	}

	// Build the appropriate table type
	if( isFormatted ) {
		return buildFormattedTable( screenData, items, borderStyle, tableFormat, isCentered );
	} else {
		const width = getCols( screenData );
		return buildStandardTable( screenData, items, width, borderStyle );
	}
}


/***************************************************************************************************
 * Internal Helper Functions
 **************************************************************************************************/


/**
 * Build a standard auto-formatted table
 * 
 * @param {Object} screenData - Screen data object
 * @param {Array} items - 2D array of items
 * @param {number} width - Width in columns
 * @param {Array} borders - Border character codes
 * @returns {Array} Array of box data objects
 */
function buildStandardTable( screenData, items, width, borders ) {
	let msg = "";
	const boxes = [];
	const font = screenData.font;
	const startPos = getPos( screenData );

	for( let row = 0; row < items.length; row++ ) {

		// Calculate the cellWidth
		let cellWidth = Math.floor( width / items[ row ].length );
		if( cellWidth < 3 ) {
			cellWidth = 3;
		}

		const rowWidth = ( cellWidth - 2 ) * items[ row ].length + items[ row ].length + 1;
		const rowPad = Math.round( ( width - rowWidth ) / 2 );
		let msgTop = utils.padL( "", rowPad, " " );
		let msgMid = msgTop;
		let msgBot = msgTop;

		// Format all the cells
		for( let col = 0; col < items[ row ].length; col++ ) {

			createBox(
				( col * ( cellWidth - 1 ) ) + rowPad,
				( row * 2 ) + startPos.row,
				boxes,
				font
			);
			const box = boxes[ boxes.length - 1 ];
			box.pos.width = cellWidth - 1;
			box.pos.height = 2;
			box.pixels.width = box.pos.width * font.width;
			box.pixels.height = box.pos.height * font.height;

			if( col === items[ row ].length - 1 ) {
				box.pixels.width += 1;
			}

			if( row === items.length - 1 ) {
				box.pixels.height += 1;
			}

			// Middle cell
			msgMid += String.fromCharCode( borders[ 3 ][ 0 ] ) +
				utils.pad(
					items[ row ][ col ],
					cellWidth - 2,
					String.fromCharCode( borders[ 3 ][ 1 ] )
				);

			if( col === items[ row ].length - 1 ) {
				msgMid += String.fromCharCode( borders[ 3 ][ 2 ] );
			}

			// Top Row
			if( row === 0 ) {

				// Top left corner
				if( col === 0 ) {
					msgTop += String.fromCharCode( borders[ 0 ][ 0 ] );
				} else {
					msgTop += String.fromCharCode( borders[ 0 ][ 2 ] );
				}

				// Top center line
				msgTop += utils.pad(
					"",
					cellWidth - 2,
					String.fromCharCode( borders[ 0 ][ 1 ] )
				);

				// Top Right corner
				if( col === items[ row ].length - 1 ) {
					msgTop += String.fromCharCode( borders[ 0 ][ 3 ] );
				}
			}

			// Bottom Row
			let bottomRow;
			if( row === items.length - 1 ) {
				bottomRow = 2;
			} else {
				bottomRow = 1;
			}

			// Bottom Left Corner
			if( col === 0 ) {
				msgBot += String.fromCharCode( borders[ bottomRow ][ 0 ] );
			} else {
				msgBot += String.fromCharCode( borders[ bottomRow ][ 2 ] );
			}

			// Bottom center line
			msgBot += utils.pad(
				"",
				cellWidth - 2,
				String.fromCharCode( borders[ bottomRow ][ 1 ] )
			);

			// Bottom Right corner
			if( col === items[ row ].length - 1 ) {
				msgBot += String.fromCharCode( borders[ bottomRow ][ 3 ] );
			}
		}

		// Move to the next row
		if( row === 0 ) {
			msg += msgTop + "\n";
		}
		msg += msgMid + "\n";
		msg += msgBot + "\n";
	}

	msg = msg.substring( 0, msg.length - 1 );
	print( screenData, msg );

	return boxes;
}


/**
 * Build a custom formatted table
 * 
 * @param {Object} screenData - Screen data object
 * @param {Array} items - 2D array or flat array of items
 * @param {Array} borders - Border character codes
 * @param {Array} tableFormat - Format strings defining table structure
 * @param {boolean} isCentered - Whether to center the table
 * @returns {Array} Array of box data objects
 */
function buildFormattedTable( screenData, items, borders, tableFormat, isCentered ) {
	let msg = "";
	const boxes = [];
	const pos = getPos( screenData );
	const font = screenData.font;

	// Set padding for centered table
	if( isCentered ) {
		pos.col = Math.floor( ( getCols( screenData ) - tableFormat[ 0 ].length ) / 2 );
	}

	// Create the padding
	const padding = utils.pad( "", pos.col, " " );
	setPos( screenData, 0, pos.row );

	for( let row = 0; row < tableFormat.length; row++ ) {
		msg += padding;
		for( let col = 0; col < tableFormat[ row ].length; col++ ) {
			const cell = tableFormat[ row ].charAt( col );

			// Table Intersection
			if( cell === "*" ) {

				const cellDirs = "" +
					lookCell( col, row, "left", tableFormat ) +
					lookCell( col, row, "right", tableFormat ) +
					lookCell( col, row, "up", tableFormat ) +
					lookCell( col, row, "down", tableFormat );

				if( cellDirs === " - |" ) {

					// Top Left Section
					msg += String.fromCharCode( borders[ 0 ][ 0 ] );
					createBox( pos.col + col, pos.row + row, boxes, font );

				} else if( cellDirs === "-- |" ) {

					// Top Middle Section
					msg += String.fromCharCode( borders[ 0 ][ 2 ] );
					createBox( pos.col + col, pos.row + row, boxes, font );

				} else if( cellDirs === "-  |" ) {

					// Top Right Section
					msg += String.fromCharCode( borders[ 0 ][ 3 ] );

				} else if( cellDirs === " -||" ) {

					// Middle Left Section
					msg += String.fromCharCode( borders[ 1 ][ 0 ] );
					createBox( pos.col + col, pos.row + row, boxes, font );

				} else if( cellDirs === "--||" ) {

					// Middle Middle
					msg += String.fromCharCode( borders[ 1 ][ 2 ] );
					createBox( pos.col + col, pos.row + row, boxes, font );

				} else if( cellDirs === "- ||" ) {

					// Middle Right
					msg += String.fromCharCode( borders[ 1 ][ 3 ] );

				} else if( cellDirs === " -| " ) {

					// Bottom Left
					msg += String.fromCharCode( borders[ 2 ][ 0 ] );

				} else if( cellDirs === "--| " ) {

					// Bottom Middle
					msg += String.fromCharCode( borders[ 2 ][ 2 ] );

				} else if( cellDirs === "- | " ) {

					// Bottom Right
					msg += String.fromCharCode( borders[ 2 ][ 3 ] );

				}
			} else if( cell === "-" ) {
				msg += String.fromCharCode( borders[ 0 ][ 1 ] );
			} else if( cell === "|" ) {
				msg += String.fromCharCode( borders[ 3 ][ 0 ] );
			} else {
				msg += " ";
			}
		}
		msg += "\n";
	}

	const posAfter = getPos( screenData );
	completeBoxes( boxes, tableFormat, font, pos );

	msg = msg.substring( 0, msg.length - 1 );
	print( screenData, msg );

	let i = 0;
	for( let row = 0; row < items.length; row++ ) {
		if( utils.isArray( items[ row ] ) ) {
			for( let col = 0; col < items[ row ].length; col++ ) {
				if( i < boxes.length ) {
					printItem( screenData, boxes[ i ], items[ row ][ col ], pos.col );
					i++;
				}
			}
		} else {
			printItem( screenData, boxes[ i ], items[ row ], pos.col );
			i++;
		}
	}

	setPos( screenData, 0, posAfter.row + tableFormat.length );

	return boxes;
}


/**
 * Print an item into a table cell
 * 
 * @param {Object} screenData - Screen data object
 * @param {Object} box - Box data object
 * @param {any} msg - Message to print
 * @param {number} colOffset - Column offset
 */
function printItem( screenData, box, msg ) {
	if( !box ) {
		return;
	}

	msg = "" + msg;

	// Calculate dimensions
	const width = box.pos.width;
	const height = box.pos.height;

	const isVertical = box.format.toLowerCase() === "v";

	if( isVertical ) {
		if( msg.length > height ) {
			msg = msg.substring( 0, height );
		}
	} else {
		if( msg.length > width ) {
			msg = msg.substring( 0, width );
		}
	}

	const pos = getPos( screenData );

	if( isVertical ) {
		let index = 0;
		const col = box.pos.col + Math.round( width / 2 );
		const startRow = box.pos.row + 1 + Math.floor( ( height - msg.length ) / 2 );
		for( let row = startRow; row <= height + startRow; row++ ) {
			setPos( screenData, col, row );
			print( screenData, msg.charAt( index ), true );
			index++;
		}
	} else {
		const col = box.pos.col + 1 + Math.floor( ( width - msg.length ) / 2 );
		const row = box.pos.row + Math.round( height / 2 );
		setPos( screenData, col, row );
		print( screenData, msg, true );
	}
	setPos( screenData, pos.col, pos.row );
}


/**
 * Create a box data object
 * 
 * @param {number} col - Column position
 * @param {number} row - Row position
 * @param {Array} boxes - Array to add box to
 * @param {Object} font - Font object
 */
function createBox( col, row, boxes, font ) {
	boxes.push( {
		"pos": {
			"col": col,
			"row": row,
			"width": null,
			"height": null
		},
		"pixels": {
			"x": ( col * font.width ) + Math.round( font.width / 2 ) - 1,
			"y": ( row * font.height ) + Math.round( font.height / 2 ),
			"width": null,
			"height": null
		},
		"format": " "
	} );
}


/**
 * Complete box dimensions by analyzing table format
 * 
 * @param {Array} boxes - Array of box objects to complete
 * @param {Array} tableFormat - Format strings
 * @param {Object} font - Font object
 * @param {Object} pos - Starting position
 */
function completeBoxes( boxes, tableFormat, font, pos ) {
	for( let i = 0; i < boxes.length; i++ ) {
		const box = boxes[ i ];

		// Compute table coordinates for formatting character
		let xt = box.pos.col + 1 - pos.col;
		let yt = box.pos.row + 1 - pos.row;

		// Find the formatting character
		if( yt < tableFormat.length && xt < tableFormat[ yt ].length ) {
			box.format = tableFormat[ yt ].charAt( xt );
		}

		// Compute table coordinates
		xt = box.pos.col - pos.col;
		yt = box.pos.row - pos.row;

		// Find box.width
		while( xt < tableFormat[ yt ].length - 1 ) {
			xt++;
			if( tableFormat[ yt ].charAt( xt ) === "*" ) {
				const cell = lookCell( xt, yt, "down", tableFormat );
				if( cell === "|" ) {
					box.pos.width = ( pos.col + ( xt - 1 ) ) - box.pos.col;
					box.pixels.width = ( box.pos.width + 1 ) * font.width;
					break;
				}
			}
		}

		// Box ends at table end
		if( box.pos.width === null ) {
			box.pos.width = ( pos.col + ( xt - 1 ) ) - box.pos.col;
			box.pixels.width = ( box.pos.width + 1 ) * font.width + 1;
		}

		// Find box.height
		while( yt < tableFormat.length - 1 ) {
			yt++;
			if( tableFormat[ yt ].charAt( xt ) === "*" ) {
				const cell = lookCell( xt, yt, "left", tableFormat );
				if( cell === "-" ) {
					box.pos.height = ( pos.row + ( yt - 1 ) ) - box.pos.row;
					box.pixels.height = ( box.pos.height + 1 ) * font.height;
					break;
				}
			}
		}

		// Box ends at table end
		if( box.pos.height === null ) {
			box.pos.height = ( pos.row + ( yt - 1 ) ) - box.pos.row;
			box.pixels.height = ( box.pos.height + 1 ) * font.height + 1;
		}
	}
}


/**
 * Look at adjacent cell in table format
 * 
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} dir - Direction (left, right, up, down)
 * @param {Array} tableFormat - Format strings
 * @returns {string} Character at adjacent position or space
 */
function lookCell( x, y, dir, tableFormat ) {
	if( dir === "left" ) {
		x -= 1;
	} else if( dir === "right" ) {
		x += 1;
	} else if( dir === "up" ) {
		y -= 1;
	} else if( dir === "down" ) {
		y += 1;
	}

	if( y >= tableFormat.length || y < 0 || x < 0 ) {
		return " ";
	}

	if( x >= tableFormat[ y ].length ) {
		return " ";
	}

	if(
		tableFormat[ y ].charAt( x ) === "*" &&
		( dir === "left" || dir === "right" )
	) {
		return "-";
	}

	if(
		tableFormat[ y ].charAt( x ) === "*" &&
		( dir === "up" || dir === "down" )
	) {
		return "|";
	}

	return tableFormat[ y ].charAt( x );
}


/**
 * Wrapper for print command
 * 
 * @param {Object} screenData - Screen data object
 * @param {string} msg - Message to print
 * @param {boolean} isInline - Whether to print inline
 */
function print( screenData, msg, isInline ) {
	screenData.api.print( msg, isInline );
}


/**
 * Wrapper for setPos command
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} col - Column position
 * @param {number} row - Row position
 */
function setPos( screenData, col, row ) {
	screenData.api.setPos( col, row );
}


/**
 * Wrapper for getPos command
 * 
 * @param {Object} screenData - Screen data object
 * @returns {Object} Position object with col and row
 */
function getPos( screenData ) {
	return screenData.api.getPos();
}


/**
 * Wrapper for getCols command
 * 
 * @param {Object} screenData - Screen data object
 * @returns {number} Number of columns
 */
function getCols( screenData ) {
	return screenData.api.getCols();
}

