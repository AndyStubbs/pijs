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
	"2.0.0-alpha.3": {
		"path": "../../build/pi.js",
		"menuName": "2.0.0-alpha.3 (Current Build)"
	},
	"2.0.0-alpha.2": {
		"path": "../../releases/pi-2.0.0-alpha.2/pi.js",
		"menuName": "2.0.0-alpha.2"
	},
	"2.0.0-alpha.1": {
		"path": "../../releases/pi-2.0.0-alpha.1/pi.js",
		"menuName": "2.0.0-alpha.1"
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

/**
 * Adds a DOM keydown listener that matches the specified key.
 * 
 * @param {string} key - Key identifier or "any" for all keys
 * @param {Function} handler - Handler function to execute on key match
 * @param {Object} [options] - Listener options
 * @param {boolean} [options.once=false] - If true, listener removes itself after firing
 * @param {boolean} [options.preventDefault=true] - Prevent default browser behaviour
 * @returns {Function} Cleanup function to remove the listener
 */
function addKeyListener( key, handler, options = {} ) {
	const settings = {
		"once": false,
		"preventDefault": true,
		...options
	};
	
	const listener = function( event ) {
		if( !keyMatchesEvent( key, event ) ) {
			return;
		}
		
		if( settings.preventDefault ) {
			event.preventDefault();
		}
		
		handler( event );
		
		if( settings.once ) {
			document.removeEventListener( "keydown", listener );
		}
	};
	
	document.addEventListener( "keydown", listener );
	
	return function removeListener() {
		document.removeEventListener( "keydown", listener );
	};
}

/**
 * Determines if the provided key identifier matches the keyboard event.
 * 
 * @param {string} key - Key identifier or "any"
 * @param {KeyboardEvent} event - Keyboard event to evaluate
 * @returns {boolean} True if the event matches the key identifier
 */
function keyMatchesEvent( key, event ) {
	if( key === "any" ) {
		return true;
	}
	
	if( key.length === 1 ) {
		return event.key === key;
	}
	
	return event.code === key;
}

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
	
	// Load Pi.js
	loadPiJsScript( scriptPath );
}

/**
 * Loads the Pi.js script
 * 
 * @param {string} scriptPath - Path to the Pi.js script
 * @returns {void}
 */
function loadPiJsScript( scriptPath ) {
	const script = document.createElement( "script" );
	script.src = scriptPath;
	script.onload = function() {
		console.log( "Pi.js loaded successfully, version:", m_piVersion );
		
		$.ready( initApp );
	};
	script.onerror = function() {
		console.error( "Failed to load Pi.js version:", m_piVersion, "from:", scriptPath );
		
		// Fallback to default version
		const fallbackVersion = PI_VERSIONS[ "2.0.0-alpha.1" ];
		const fallbackScript = document.createElement( "script" );
		fallbackScript.src = fallbackVersion.path;
		fallbackScript.onload = function() {
			console.log( "Fallback Pi.js loaded successfully" );
			$.ready( initApp );
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
	$.screen( { "aspect": "800x600", "willReadFrequently": true } );
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
		"1. Run Performance Tests".padEnd( endPadding, " " ),
		"2. View Previous Results".padEnd( endPadding, " " ),
		"3. Recalculate Target FPS".padEnd( endPadding, " " ),
		flashingMenuText.padEnd( endPadding, " " ),
		"5. Change Pi.js Version".padEnd( endPadding, " " ),
		"6. Exit".padEnd( endPadding )
	];

	$.setColor( 15 );
	menuItems.forEach( ( item ) => $.print( item, false, true ) );

	// Instruction - centered below table
	$.print();
	$.setColor( 7 );
	$.print( "Enter Key (1 - 6)", false, true );
	
	// Set up menu handlers
	const menuKeyCleanups = [];
	menuKeyCleanups.push( addKeyListener( "1", menu1 ) );
	menuKeyCleanups.push( addKeyListener( "2", menu2 ) );
	menuKeyCleanups.push( addKeyListener( "3", menu3 ) );
	menuKeyCleanups.push( addKeyListener( "4", menu4 ) );
	menuKeyCleanups.push( addKeyListener( "5", menu5 ) );
	menuKeyCleanups.push( addKeyListener( "6", menu6 ) );

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
		while( menuKeyCleanups.length > 0 ) {
			const removeListener = menuKeyCleanups.pop();
			removeListener();
		}
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
	const padding = 33;
	const versionKeys = Object.keys( PI_VERSIONS );
	const versionItems = versionKeys.map( ( key, index ) => {
		return `${index + 1}. ${PI_VERSIONS[ key ].menuName}`.padEnd( padding );
	} );
	versionItems.push( `${versionKeys.length + 1}. Return to Main Menu`.padEnd( padding ) );
	
	$.setColor( 15 );
	versionItems.forEach( ( item ) => $.print( item, false, true ) );
	
	// Show current version
	$.print();
	$.setColor( 7 );
	$.print( `Current Version: ${m_piVersion}`.padEnd( padding ), false, true );
	
	// Instruction - centered below table
	$.print();
	$.setColor( 7 );
	$.print( `Enter Key (1 - ${versionKeys.length + 1})`, false, true );
	
	const versionKeyCleanups = [];
	
	versionKeys.forEach( ( key, index ) => {
		const keyNum = ( index + 1 ).toString();
		versionKeyCleanups.push( addKeyListener( keyNum, () => changePiVersion( key ) ) );
	} );
	
	const returnKey = ( versionKeys.length + 1 ).toString();
	versionKeyCleanups.push( addKeyListener( returnKey, () => {
		clearVersionKeys();
		showMainMenu();
	} ) );
	
	function clearVersionKeys() {
		while( versionKeyCleanups.length > 0 ) {
			const removeListener = versionKeyCleanups.pop();
			removeListener();
		}
	}
	
	function changePiVersion( version ) {
		clearVersionKeys();
		
		if( version === m_piVersion ) {
			showMainMenu();
			return;
		}
		
		localStorage.setItem( "piVersion", version );
		
		$.cls();
		printTitle();
		$.setPos( 0, m_centerPosY );
		$.setColor( 15 );
		$.print( "Switching to Pi.js version:", false, true );
		$.print( version, false, true );
		$.print();
		$.setColor( 7 );
		$.print( "Reloading page...", false, true );
		
		setTimeout( () => {
			window.location.reload();
		}, 1000 );
	}
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
		"Thank you for using",
		"Performance Tests! "
	];
	
	$.setColor( 15 );
	exitItems.forEach( ( item ) => $.print( item, false, true ) );
	
	// Instruction - centered below table
	$.setColor( 7 );
	$.setPos( 0, contentStartRow + 6 );
	$.print( "Press F5 to restart", false, true );
}
