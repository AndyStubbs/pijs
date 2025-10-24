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
	"2.0.0-alpha.1": {
		"path": "../../build/pi.js",
		"plugins": [
			"../../plugins/print-table/dist/print-table.js"
		],
		"menuName": "2.0.0-alpha.1 (Current Build)"
	},
	"2.0.0-alpha.0": {
		"path": "../../releases/pi-2.0.0-alpha.0/pi.js",
		"menuName": "2.0.0-alpha.0"
	},
	"1.2.4": {
		"path": "../../releases/pi-1.all/pi-1.2.4.js",
		"menuName": "1.2.4"
	}
};

// App-level state for display positioning
let m_centerPosY = 0;
let m_reducedFlashing = false;
let m_piVersion = localStorage.getItem( "piVersion" ) || "2.0.0-alpha.1";

// Load Pi.js dynamically before initializing the app
loadPiJsVersion();

/**
 * Loads the selected Pi.js version dynamically
 * 
 * @returns {void}
 */
function loadPiJsVersion() {
	const versionInfo = PI_VERSIONS[ m_piVersion ] || PI_VERSIONS[ "2.0.0-alpha.1" ];
	const scriptPath = versionInfo.path;
	
	console.log( "Loading Pi.js version:", m_piVersion, "from:", scriptPath );
	console.log( "Available versions:", Object.keys( PI_VERSIONS ) );
	
	// Load Pi.js first, then plugins if they exist for this version
	loadPiJsScript( scriptPath, versionInfo.plugins );
}

/**
 * Loads plugins in sequence
 * 
 * @param {Array<string>} pluginPaths - Array of plugin script paths
 * @param {Function} onComplete - Callback when all plugins are loaded
 * @returns {void}
 */
function loadPlugins( pluginPaths, onComplete ) {
	let loadedCount = 0;
	const totalPlugins = pluginPaths.length;
	
	if( totalPlugins === 0 ) {
		onComplete();
		return;
	}
	
	pluginPaths.forEach( ( pluginPath, index ) => {
		const script = document.createElement( "script" );
		script.src = pluginPath;
		script.onload = function() {
			loadedCount++;
			console.log( `Plugin ${index + 1}/${totalPlugins} loaded: ${pluginPath}` );
			
			if( loadedCount === totalPlugins ) {
				console.log( "All plugins loaded successfully" );
				onComplete();
			}
		};
		script.onerror = function() {
			console.error( `Failed to load plugin: ${pluginPath}` );
			loadedCount++;
			
			if( loadedCount === totalPlugins ) {
				console.log( "Plugin loading completed (with errors)" );
				onComplete();
			}
		};
		document.head.appendChild( script );
	} );
}

/**
 * Loads the Pi.js script
 * 
 * @param {string} scriptPath - Path to the Pi.js script
 * @param {Array<string>} plugins - Array of plugin paths to load after Pi.js
 * @returns {void}
 */
function loadPiJsScript( scriptPath, plugins ) {
	const script = document.createElement( "script" );
	script.src = scriptPath;
	script.onload = function() {
		console.log( "Pi.js loaded successfully, version:", m_piVersion );
		
		// Load plugins after Pi.js if they exist
		if( plugins && plugins.length > 0 ) {
			console.log( "Loading plugins for version:", m_piVersion );
			loadPlugins( plugins, () => {
				// Initialize the app after all plugins are loaded
				$.ready( initApp );
			} );
		} else {
			// No plugins, initialize the app directly
			$.ready( initApp );
		}
	};
	script.onerror = function() {
		console.error( "Failed to load Pi.js version:", m_piVersion, "from:", scriptPath );
		
		// Fallback to default version
		const fallbackVersion = PI_VERSIONS[ "2.0.0-alpha.1" ];
		const fallbackScript = document.createElement( "script" );
		fallbackScript.src = fallbackVersion.path;
		fallbackScript.onload = function() {
			console.log( "Fallback Pi.js loaded successfully" );
			// Load plugins for fallback version if they exist
			if( fallbackVersion.plugins && fallbackVersion.plugins.length > 0 ) {
				loadPlugins( fallbackVersion.plugins, () => {
					$.ready( initApp );
				} );
			} else {
				$.ready( initApp );
			}
		};
		fallbackScript.onerror = function() {
			console.error( "Failed to load fallback Pi.js version" );
			document.body.innerHTML = "<h1 style='color: red;'>Error: Could not load Pi.js</h1>";
		};
		document.head.appendChild( fallbackScript );
	};
	document.head.appendChild( script );
}

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
	
	// Pi.js version - top right
	$.setColor( 11 );
	$.setPos( 0, 4 );
	$.print( `Pi.js: ${m_piVersion}`, true, true );
	
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
		[ "5. Change Pi.js Version".padEnd( endPadding, " " ) ],
		[ "6. Exit".padEnd( endPadding ) ]
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
		"*-------------------------------*",
		"|                               |",
		"*-------------------------------*"
	]

	$.setColor( 15 );
	$.printTable( menuItems, menuFormat, "double", true );

	// Instruction - centered below table
	$.print();
	$.setColor( 7 );
	$.print( "Enter Key (1 - 6)", false, true );
	
	// Set up menu handlers
	$.onkey( "1", "down", menu1 );
	$.onkey( "2", "down", menu2 );
	$.onkey( "3", "down", menu3 );
	$.onkey( "4", "down", menu4 );
	$.onkey( "5", "down", menu5 );
	$.onkey( "6", "down", menu6 );

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
		showPiVersionMenu();
	}

	function menu6() {
		clearMenuKeys();
		showExitMessage();
	}

	function clearMenuKeys() {
		$.offkey( "1", "down", menu1 );
		$.offkey( "2", "down", menu2 );
		$.offkey( "3", "down", menu3 );
		$.offkey( "4", "down", menu4 );
		$.offkey( "5", "down", menu5 );
		$.offkey( "6", "down", menu6 );
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
 * Shows Pi.js version selection menu
 * 
 * @returns {void}
 */
function showPiVersionMenu() {
	$.cls();
	
	// Title - centered
	printTitle();
	
	// Center the content vertically
	const contentStartRow = Math.floor( $.getRows() / 2 ) - 4;
	$.setPos( 0, contentStartRow );
	
	// Create version selection table
	const versionKeys = Object.keys( PI_VERSIONS );
	const versionItems = versionKeys.map( ( key, index ) => [
		`${index + 1}. ${PI_VERSIONS[ key ].menuName}`
	] );
	versionItems.push( [ `${versionKeys.length + 1}. Return to Main Menu` ] );

	const format = [
		"*-----------------------------------*",
		"|                                   |",
		"*-----------------------------------*",
		"|                                   |",
		"*-----------------------------------*",
		"|                                   |",
		"*-----------------------------------*",
		"|                                   |",
		"*-----------------------------------*"
	];
	
	$.setColor( 15 );
	$.printTable( versionItems, format, "double", true );
	
	// Show current version
	$.print();
	$.setColor( 7 );
	$.print( `Current Version: ${m_piVersion}`, false, true );
	
	// Instruction - centered below table
	$.print();
	$.setColor( 7 );
	$.print( `Enter Key (1 - ${versionKeys.length + 1})`, false, true );
	
	// Set up menu handlers
	versionKeys.forEach( ( key, index ) => {
		const keyNum = ( index + 1 ).toString();
		$.onkey( keyNum, "down", () => changePiVersion( key ) );
	} );
	
	// Return to main menu handler
	const returnKey = ( versionKeys.length + 1 ).toString();
	$.onkey( returnKey, "down", () => {
		// Clear all version menu keys
		versionKeys.forEach( ( key, index ) => {
			$.offkey( ( index + 1 ).toString(), "down" );
		} );
		$.offkey( returnKey, "down" );
		showMainMenu();
	} );
}

/**
 * Changes the Pi.js version and reloads the page
 * 
 * @param {string} version - The version to switch to
 * @returns {void}
 */
function changePiVersion( version ) {
	if( version === m_piVersion ) {
		// Already using this version, just return to main menu
		$.offkey( "1", "down" );
		$.offkey( "2", "down" );
		$.offkey( "3", "down" );
		$.offkey( "4", "down" );
		showMainMenu();
		return;
	}
	
	// Save the new version
	localStorage.setItem( "piVersion", version );
	
	// Show loading message
	$.cls();
	printTitle();
	$.setPos( 0, m_centerPosY );
	$.setColor( 15 );
	$.print( "Switching to Pi.js version:", false, true );
	$.print( version, false, true );
	$.print();
	$.setColor( 7 );
	$.print( "Reloading page...", false, true );
	
	// Reload the page to load the new version
	setTimeout( () => {
		window.location.reload();
	}, 1000 );
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
