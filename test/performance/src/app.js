/**
 * Performance Test Application Module
 * 
 * Main application logic for the performance testing system.
 * 
 * @module app
 */

"use strict";

// Set up random seed for consistent test results
Math.seedrandom( "constant" );

import * as g_testManager from "./test-manager.js";
import * as g_reportManager from "./report-manager.js";

// App-level state for display positioning
let m_centerY = 0;
let m_centerPosY = 0;

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
	
	// Calculate display positioning
	m_centerY = Math.floor( $.height() / 2 ) - 20;
	m_centerPosY = Math.floor( $.getRows() / 2 ) - 1;

	// Set up display
	printTitle();
	$.setPos( 0, m_centerPosY );
	$.setColor( 15 );
	$.print( "Loading...", true, true );
	
	// Create API object for managers
	const api = {
		showMainMenu: showMainMenu,
		startTests: () => g_testManager.startTests()
	};
	
	// Initialize managers with API
	await g_testManager.init( api );
	g_reportManager.init( api );

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
	const menuStartRow = Math.floor( $.getRows() / 2 ) - 5;
	$.setPos( 0, menuStartRow );

	// Create the menu title
	$.setColor( 10 );
	$.print( "MAIN MENU", false, true );
	$.print();
	
	// Create main menu table
	const menuItems = [
		[ "1. Run Performance Tests" ],
		[ "2. View Previous Results" ],
		[ "3. Recalculate Target FPS" ],
		[ "4. Exit                 " ]
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
	]

	$.setColor( 15 );
	$.printTable( menuItems, menuFormat, "double", true );

	// Instruction - centered below table
	$.print();
	$.setColor( 7 );
	$.print( "Enter Key (1 - 4)", false, true );
	
	// Set up menu handlers
	$.onkey( "1", "down", menu1 );
	$.onkey( "2", "down", menu2 );
	$.onkey( "3", "down", menu3 );
	$.onkey( "4", "down", menu4 );

	function menu1() {
		clearMenuKeys();
		g_testManager.startTests();
	}

	function menu2() {
		clearMenuKeys();
		showPreviousResults();
	}

	async function menu3() {
		clearMenuKeys();
		await showRecalculateFps();
	}

	function menu4() {
		clearMenuKeys();
		showExitMessage();
	}

	function clearMenuKeys() {
		$.offkey( "1", "down", menu1 );
		$.offkey( "2", "down", menu2 );
		$.offkey( "3", "down", menu3 );
		$.offkey( "4", "down", menu4 );
	}
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
	
	$.onkey( "", "down", () => {
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
	
	$.onkey( "", "down", () => {
		showMainMenu();
	}, true );
}
