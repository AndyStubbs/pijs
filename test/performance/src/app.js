/**
 * Performance Test Application Module
 * 
 * Main application logic for the performance testing system.
 * 
 * @module app
 */

"use strict";


import * as g_testManager from "./test-manager.js";
import * as g_reportManager from "./report-manager.js";

const PI_VERSIONS = {
	"2.0.0-alpha.1":  "../../build/pi.js",
	"2.0.0-alpha.0":  "../../releases/pi-2.0.0-alpha-0/pi.js",
	"1.2.4":          "../../releases/pi-1.all/pi-1.2.4.js"
};

// App-level state for display positioning
let m_centerPosY = 0;
let m_reducedFlashing = false;

let m_piVersion = localStorage.getItem( "piVersion" ) || "2.0.0-alpha.1";

// Initialize the application when the DOM is ready
$.ready( initApp );

/**
 * Prints the title header centered at the top of the screen
 * 
 * @returns {void}
 */
function printTitle() {
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Performance Tests", true, true );
}

/**
 * Initializes the application
 * 
 * @returns {void}
 */
async function initApp() {

	// Set up the screen
	$.screen( "800x600" );
	$.setFont( 4 );

	// Load reduced flashing setting from localStorage
	m_reducedFlashing = localStorage.getItem( "reducedFlashing" ) === "true";
	
	// Calculate display positioning
	m_centerPosY = Math.floor( $.getRows() / 2 ) - 1;

	// Set up display
	printTitle();
	$.setPos( 0, m_centerPosY );
	$.setColor( 15 );
	$.print( "Loading...", true, true );
	
	// Create API object for managers
	const api = {
		showMainMenu: showMainMenu,
		startTests: () => g_testManager.startTests(),
		getReducedFlashing: () => m_reducedFlashing,
		showPreviousResults: () => g_reportManager.showPreviousResults(),
		showResults: (resultsObject) => g_reportManager.showResults(resultsObject)
	};
	
	// Initialize managers with API
	await Promise.all( [
		g_testManager.init( api ),
		g_reportManager.init( api )
	] );

	showMainMenu();
}

/**
 * Shows the main menu with options
 * 
 * @returns {void}
 */
function showMainMenu() {
	$.cls();
	
	// Title - centered
	printTitle();
	
	// Target FPS - bottom right
	$.setColor( 7 );
	$.setPos( $.getCols() - 20, $.getRows() - 2 );
	$.print( "Target FPS: " + g_testManager.getTargetFps().toFixed( 2 ) );
	
	// Center the menu vertically
	const menuStartRow = Math.floor( $.getRows() / 2 ) - 6;
	$.setPos( 0, menuStartRow );

	// Create the menu title
	$.setColor( 10 );
	$.print( "MAIN MENU", false, true );
	$.print();
	
	// Create main menu table
	let flashingMenuText = "4. Enable Reduced Flashing";
	if( m_reducedFlashing ) {
		flashingMenuText = "4. Disable Reduced Flashing";
	}
	let endPadding = flashingMenuText.length;
	const menuItems = [
		[ "1. Run Performance Tests".padEnd( endPadding, " " ) ],
		[ "2. View Previous Results".padEnd( endPadding, " " ) ],
		[ "3. Recalculate Target FPS".padEnd( endPadding, " " ) ],
		[ flashingMenuText.padEnd( endPadding, " " ) ],
		[ "5. Exit".padEnd( endPadding ) ]
	];

	const menuFormat = [
		"*-------------------------------*",
		"|                               |",
		"*-------------------------------*",
		"|                               |",
		"*-------------------------------*",
		"|                               |",
		"*-------------------------------*",
		"|                               |",
		"*-------------------------------*",
		"|                               |",
		"*-------------------------------*"
	]

	$.setColor( 15 );
	$.printTable( menuItems, menuFormat, "double", true );

	// Instruction - centered below table
	$.print();
	$.setColor( 7 );
	$.print( "Enter Key (1 - 5)", false, true );
	
	// Set up menu handlers
	$.onkey( "1", "down", menu1 );
	$.onkey( "2", "down", menu2 );
	$.onkey( "3", "down", menu3 );
	$.onkey( "4", "down", menu4 );
	$.onkey( "5", "down", menu5 );

	function menu1() {
		clearMenuKeys();
		g_testManager.startTests();
	}

	function menu2() {
		clearMenuKeys();
		g_reportManager.showPreviousResults();
	}

	async function menu3() {
		clearMenuKeys();
		await showRecalculateFps();
	}

	function menu4() {
		clearMenuKeys();
		toggleReducedFlashing();
	}

	function menu5() {
		clearMenuKeys();
		showExitMessage();
	}

	function clearMenuKeys() {
		$.offkey( "1", "down", menu1 );
		$.offkey( "2", "down", menu2 );
		$.offkey( "3", "down", menu3 );
		$.offkey( "4", "down", menu4 );
		$.offkey( "5", "down", menu5 );
	}
}

/**
 * Toggles the reduced flashing setting
 * 
 * @returns {void}
 */
function toggleReducedFlashing() {
	m_reducedFlashing = !m_reducedFlashing;
	localStorage.setItem( "reducedFlashing", m_reducedFlashing.toString() );

	// Return to main menu
	showMainMenu();
}

/**
 * Shows recalculate FPS menu
 * 
 * @returns {Promise<void>}
 */
async function showRecalculateFps() {
	$.cls();
	
	printTitle();

	// Center the content vertically
	$.setPos( 0, m_centerPosY );
	
	// Show loading message
	$.setColor( 15 );
	$.print( "Calculating...", false, true );
	
	// Recalculate target FPS
	await g_testManager.calculateTargetFPS();
	
	// Return to main menu
	showMainMenu();
}

/**
 * Shows previous results menu (placeholder)
 * 
 * @returns {void}
 */
function showPreviousResults() {
	$.cls();
	
	// Title - centered
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Previous Results", true, true );
	
	// Center the content vertically
	const contentStartRow = Math.floor( $.getRows() / 2 ) - 1;
	$.setPos( 0, contentStartRow );
	
	// Create placeholder message table
	const placeholderItems = [
		[ "Feature not implemented yet" ],
		[ "Coming soon..." ]
	];
	
	$.setColor( 7 );
	$.printTable( placeholderItems, null, "single", true );
	
	// Instruction - centered below table
	$.setColor( 7 );
	$.setPos( 0, contentStartRow + 6 );
	$.print( "Press any key to return to main menu", false, true );
	
	$.onkey( "any", "down", () => {
		showMainMenu();
	}, true );
}

/**
 * Shows exit message
 * 
 * @returns {void}
 */
function showExitMessage() {
	$.cls();
	
	// Center the content vertically
	const contentStartRow = Math.floor( $.getRows() / 2 ) - 1;
	$.setPos( 0, contentStartRow );
	
	// Create exit message table
	const exitItems = [
		[ "Thank you for using" ],
		[ "Performance Tests!" ]
	];

	const format = [
		"*-----------------------*",
		"|                       |",
		"*-----------------------*",
		"|                       |",
		"*-----------------------*"
	];
	
	$.setColor( 15 );
	$.printTable( exitItems, format, "double", true );
	
	// Instruction - centered below table
	$.setColor( 7 );
	$.setPos( 0, contentStartRow + 6 );
	$.print( "Press F5 to restart", false, true );
}
