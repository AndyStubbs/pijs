/**
 * Performance Test Application Module
 * 
 * Main application logic for the performance testing system.
 * 
 * @module app
 */

"use strict";


import "../../libs/seedrandom.js";
import * as g_testManager from "./test-manager.js";
import * as g_reportManager from "./report-manager.js";

const PI_VERSIONS = {
	"2.3.0": {
		"path": "../../build/pi.js",
		"menuName": "2.3.0 (Current Build)"
	},
	"2.2.0": {
		"path": "../../releases/pi-2.2.0/pi.js",
		"menuName": "2.2.0"
	},
	"2.1.0": {
		"path": "../../releases/pi-2.1.0/pi.js",
		"pluginPath": "../../build/plugins/polygons/polygons.js",
		"menuName": "2.1.0"
	},
	"2.0.3": {
		"path": "../../releases/pi-2.0.3/pi.js",
		"patchPath": "./src/patches/pi-2.0.3.js",
		"pluginPath": "../../build/plugins/polygons/polygons.js",
		"menuName": "2.0.3"
	},
	"1.2.5": {
		"path": "../../releases/pi-1.2.5/pi.js",
		"patchPath": "./src/patches/pi-1.2.5.js",
		"pluginPath": "../../build/plugins/polygons/polygons.js",
		"menuName": "1.2.5 (Legacy)"
	}
};

// An all-versions run survives the reload each version switch needs through this storage key
const AUTO_RUN_KEY = "autoRun";
const AUTO_RUN_ROUNDS = 3;
const AUTO_RUN_TIMEOUT = 2 * 60 * 60 * 1000;

// App-level state for display positioning
let m_centerPosY = 0;
let m_reducedFlashing = false;
let m_piVersion = localStorage.getItem( "piVersion" ) || "1.2.5";

// Cleanup for the watchdog timer and cancel key of the all-versions run on this page load
let m_autoRunCleanup = null;

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
	const versionInfo = PI_VERSIONS[ m_piVersion ] || PI_VERSIONS[ "2.1.0" ];
	const scriptPath = versionInfo.path;
	
	console.log( "Loading Pi.js version:", m_piVersion, "from:", scriptPath );
	console.log( "Available versions:", Object.keys( PI_VERSIONS ) );
	
	// Load Pi.js
	loadPiJsScript( scriptPath );
}

/**
 * Loads the Pi.js script and any applicable plugins
 * 
 * @param {string} scriptPath - Path to the Pi.js script
 * @returns {void}
 */
function loadPiJsScript( scriptPath ) {
	const script = document.createElement( "script" );
	script.src = scriptPath;
	script.onload = function() {
		console.log( "Pi.js loaded successfully, version:", m_piVersion );

		const versionInfo = PI_VERSIONS[ m_piVersion ];

		// A patch loads before the plugin, since it supplies what the plugin needs from the core
		const scriptPaths = [ versionInfo?.patchPath, versionInfo?.pluginPath ].filter(
			( path ) => path
		);
		const loadNextScript = () => {
			if( scriptPaths.length === 0 ) {
				$.ready( initApp );
				return;
			}
			loadPluginScript( scriptPaths.shift(), loadNextScript );
		};
		loadNextScript();
	};
	script.onerror = function() {
		console.error( "Failed to load Pi.js version:", m_piVersion, "from:", scriptPath );

		// Results from the fallback would be recorded against the wrong version
		const autoRunState = getAutoRunState();
		if( autoRunState ) {
			autoRunState.aborted = `Failed to load Pi.js ${m_piVersion}`;
			saveAutoRunState( autoRunState );
		}

		// Fallback to default version
		const fallbackVersion = PI_VERSIONS[ "1.2.5" ];
		m_piVersion = "1.2.5";
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
 * Loads a plugin script dynamically
 * 
 * @param {string} pluginPath - Path to the plugin script
 * @param {Function} callback - Function called when loaded
 * @returns {void}
 */
function loadPluginScript( pluginPath, callback ) {
	const pluginScript = document.createElement( "script" );
	pluginScript.src = pluginPath;
	pluginScript.onload = function() {
		console.log( "Plugin loaded successfully from:", pluginPath );
		callback();
	};
	pluginScript.onerror = function() {
		console.error( "Failed to load plugin from:", pluginPath );
		// Proceed anyway so the rest of the test suite can run
		callback();
	};
	document.head.appendChild( pluginScript );
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

	// A stored all-versions run resumes here after each version switch reloads the page
	if( getAutoRunState() ) {
		continueAutoRun();
	} else {
		showMainMenu();
	}
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
	$.print( `Pi.js: ${$.version}`, true, true );
	
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
	let flashingMenuText = "5. Enable Reduced Flashing";
	if( m_reducedFlashing ) {
		flashingMenuText = "5. Disable Reduced Flashing";
	}
	const menuText = [
		"1. Run Performance Tests",
		`2. Run All Versions (${AUTO_RUN_ROUNDS} Rounds)`,
		"3. View Previous Results",
		"4. Recalculate Target FPS",
		flashingMenuText,
		"6. Change Pi.js Version",
		"7. Exit"
	];
	const endPadding = Math.max( ...menuText.map( ( item ) => item.length ) );
	const menuItems = menuText.map( ( item ) => item.padEnd( endPadding, " " ) );

	$.setColor( 15 );
	menuItems.forEach( ( item ) => $.print( item, false, true ) );

	// Instruction - centered below table
	$.print();
	$.setColor( 7 );
	$.print( "Enter Key (1 - 7)", false, true );

	// Set up menu handlers
	const menuKeyCleanups = [];
	menuKeyCleanups.push( addKeyListener( "1", menu1 ) );
	menuKeyCleanups.push( addKeyListener( "2", menu2 ) );
	menuKeyCleanups.push( addKeyListener( "3", menu3 ) );
	menuKeyCleanups.push( addKeyListener( "4", menu4 ) );
	menuKeyCleanups.push( addKeyListener( "5", menu5 ) );
	menuKeyCleanups.push( addKeyListener( "6", menu6 ) );
	menuKeyCleanups.push( addKeyListener( "7", menu7 ) );

	function menu1() {
		clearMenuKeys();
		g_testManager.startTests();
	}

	function menu2() {
		clearMenuKeys();
		showAutoRunConfirmation();
	}

	function menu3() {
		clearMenuKeys();
		g_reportManager.showPreviousResults();
	}

	async function menu4() {
		clearMenuKeys();
		await showRecalculateFps();
	}

	function menu5() {
		clearMenuKeys();
		toggleReducedFlashing();
	}

	function menu6() {
		clearMenuKeys();
		showPiVersionMenu();
	}

	function menu7() {
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
 * Reads the stored all-versions run state
 *
 * @returns {Object|null} The run state, or null when no run is in progress
 */
function getAutoRunState() {
	try {
		const state = JSON.parse( localStorage.getItem( AUTO_RUN_KEY ) );
		if( state && Array.isArray( state.order ) ) {
			return state;
		}
	} catch( error ) {
		console.error( "Ignoring unreadable all-versions run state:", error );
	}
	return null;
}

/**
 * Stores the all-versions run state so it survives a page reload
 *
 * @param {Object} state - The run state
 * @returns {void}
 */
function saveAutoRunState( state ) {
	localStorage.setItem( AUTO_RUN_KEY, JSON.stringify( state ) );
}

/**
 * Builds the run order: every version once per round, so no version runs back-to-back
 *
 * @returns {Array<string>} Version keys in execution order
 */
function buildAutoRunOrder() {
	const order = [];
	for( let round = 0; round < AUTO_RUN_ROUNDS; round++ ) {
		order.push( ...Object.keys( PI_VERSIONS ) );
	}
	return order;
}

/**
 * Asks for confirmation, since an all-versions run deletes the saved results
 *
 * @returns {void}
 */
function showAutoRunConfirmation() {
	const versionCount = Object.keys( PI_VERSIONS ).length;

	$.cls();
	printTitle();
	$.setPos( 0, m_centerPosY - 2 );
	$.setColor( 15 );
	$.print( `Run all ${versionCount} versions, ${AUTO_RUN_ROUNDS} rounds each`, false, true );
	$.print();
	$.setColor( 4 );
	$.print( "This deletes all saved results first", false, true );
	$.print();
	$.setColor( 15 );
	$.print( "Press 'Y' to confirm, 'N' to cancel", false, true );

	const cleanups = [];
	const clearKeys = () => {
		while( cleanups.length > 0 ) {
			cleanups.pop()();
		}
	};
	cleanups.push( addKeyListener( "KeyY", () => {
		clearKeys();
		startAutoRun();
	} ) );
	cleanups.push( addKeyListener( "KeyN", () => {
		clearKeys();
		showMainMenu();
	} ) );
}

/**
 * Clears the saved results and begins an all-versions run
 *
 * @returns {Promise<void>}
 */
async function startAutoRun() {
	$.cls();
	printTitle();
	$.setPos( 0, m_centerPosY );
	$.setColor( 15 );
	$.print( "Clearing results...", false, true );

	// Results left over from earlier runs would be mixed into the comparison medians
	try {
		const response = await fetch( "http://localhost:8080/api/delete-all-results", {
			"method": "POST"
		} );
		const result = await response.json();
		if( !response.ok || !result.success ) {
			throw new Error( result.error || "Failed to clear results" );
		}
	} catch( error ) {
		showAutoRunMessage( [ "Could not clear results", error.message ], 4, showMainMenu );
		return;
	}

	saveAutoRunState( {
		"startTime": Date.now(),
		"order": buildAutoRunOrder(),
		"index": 0,
		"originalVersion": m_piVersion
	} );
	continueAutoRun();
}

/**
 * Performs the next step of the stored all-versions run: finish, switch version, or test
 *
 * @returns {void}
 */
function continueAutoRun() {
	const state = getAutoRunState();
	if( !state ) {
		showMainMenu();
		return;
	}

	if( state.aborted ) {
		endAutoRun( state );
		showAutoRunMessage( [ "All-versions run stopped", state.aborted ], 4, showMainMenu );
		return;
	}

	const remainingTime = state.startTime + AUTO_RUN_TIMEOUT - Date.now();
	if( !( remainingTime > 0 ) ) {
		endAutoRun( state );
		showAutoRunMessage(
			[ "All-versions run stopped", getAutoRunTimeoutText() ], 4, showMainMenu
		);
		return;
	}

	if( state.index >= state.order.length ) {
		endAutoRun( state );
		showAutoRunMessage(
			[ "All-versions run complete", `${state.order.length} runs saved` ], 10,
			() => g_reportManager.showPreviousResults(), "Press any key to view results"
		);
		return;
	}

	const version = state.order[ state.index ];
	if( !PI_VERSIONS[ version ] ) {
		endAutoRun( state );
		showAutoRunMessage(
			[ "All-versions run stopped", `Unknown Pi.js version: ${version}` ], 4, showMainMenu
		);
		return;
	}

	// The watchdog and cancel key also cover a reload that never completes its tests
	if( !m_autoRunCleanup ) {
		const timer = setTimeout( () => abortAutoRun( getAutoRunTimeoutText() ), remainingTime );
		const removeKey = addKeyListener( "Escape", () => abortAutoRun( "Cancelled" ) );
		m_autoRunCleanup = () => {
			clearTimeout( timer );
			removeKey();
		};
	}

	if( version !== m_piVersion ) {
		localStorage.setItem( "piVersion", version );
		$.cls();
		printTitle();
		$.setPos( 0, m_centerPosY );
		$.setColor( 15 );
		$.print( `Run ${state.index + 1} of ${state.order.length}`, false, true );
		$.print( `Switching to Pi.js version: ${version}`, false, true );
		$.print();
		$.setColor( 7 );
		$.print( "Press Esc to cancel", false, true );
		setTimeout( () => {

			// Escape during the delay has already stored the abort and reloaded
			window.location.reload();
		}, 500 );
		return;
	}

	g_testManager.startTests( async ( resultsObject ) => {
		const saved = await g_reportManager.saveResults( resultsObject );
		const currentState = getAutoRunState();
		if( !currentState ) {
			return;
		}
		if( !saved.success ) {
			abortAutoRun( `Failed to save results: ${saved.error}` );
			return;
		}
		currentState.index += 1;
		saveAutoRunState( currentState );
		continueAutoRun();
	} );
}

/**
 * Stops the all-versions run; the reload ends any test in progress and reports the reason
 *
 * @param {string} reason - Why the run stopped
 * @returns {void}
 */
function abortAutoRun( reason ) {
	const state = getAutoRunState();
	if( state ) {
		state.aborted = reason;
		saveAutoRunState( state );
	}
	window.location.reload();
}

/**
 * Removes the all-versions run state and restores the version selected before the run
 *
 * @param {Object} state - The run state
 * @returns {void}
 */
function endAutoRun( state ) {
	localStorage.removeItem( AUTO_RUN_KEY );
	if( PI_VERSIONS[ state.originalVersion ] ) {
		localStorage.setItem( "piVersion", state.originalVersion );
	}
	if( m_autoRunCleanup ) {
		m_autoRunCleanup();
		m_autoRunCleanup = null;
	}
}

/**
 * Describes the all-versions run time limit
 *
 * @returns {string} Timeout message
 */
function getAutoRunTimeoutText() {
	return `Timed out after ${AUTO_RUN_TIMEOUT / 3600000} hours`;
}

/**
 * Shows an all-versions run message and waits for a key
 *
 * @param {Array<string>} lines - Message lines
 * @param {number} color - Palette color of the message
 * @param {Function} next - Called after a key press
 * @param {string} [prompt] - Instruction shown below the message
 * @returns {void}
 */
function showAutoRunMessage(
	lines, color, next, prompt = "Press any key to return to main menu"
) {
	$.canvas().style.opacity = "";
	$.cls();
	printTitle();
	$.setPos( 0, m_centerPosY );
	$.setColor( color );
	lines.forEach( ( line ) => $.print( line, false, true ) );
	$.print();
	$.setColor( 7 );
	$.print( prompt, false, true );
	addKeyListener( "any", next, { "once": true } );
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
