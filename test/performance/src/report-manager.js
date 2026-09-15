/**
 * Report Manager Module
 * 
 * Handles test results display and reporting functionality.
 * 
 * @module report-manager
 */

export { init, showResults, postResults, showPreviousResults };

"use strict";

let m_api = null;
let m_currentResultsObject = null;
const PAGE_SIZE = 9;

/**
 * Adds a DOM keydown listener that matches the specified key.
 * 
 * @param {string} key - Key identifier or "any" to match all keys
 * @param {Function} handler - Handler to invoke when key matches
 * @param {Object} [options] - Listener options
 * @param {boolean} [options.once=false] - Remove listener after first invocation
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
 * Determines if a keyboard event matches the provided key identifier.
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

/**
 * Initializes the report manager with an API object
 * 
 * @param {Object} api - API object with showMainMenu function
 * @returns {void}
 */
async function init( api ) {
	m_api = api;
	
	// Reset stats to ensure data integrity
	try {
		const response = await fetch( "http://localhost:8080/api/reset-stats", {
			method: "POST"
		} );
		
		const result = await response.json();
		
		if( response.ok && result.success ) {
			console.log( `Report manager initialized: ${result.message}` );
		} else {
			console.error( `Failed to reset stats: ${result.error || "Unknown error"}` );
		}
	} catch( error ) {
		console.error( `Error resetting stats: ${error.message}` );
	}
}

/**
 * Displays the test results with improved formatting
 * 
 * @param {Object} resultsObject - Results object containing version, date, and tests array
 * @returns {void}
 */
function showResults( resultsObject ) {
	const { version, date, score, tests: results } = resultsObject;

	// Store current results object
	m_currentResultsObject = resultsObject;

	// Clear the screen
	$.cls();
	
	// Compact summary table - one line of data
	const dateTime = new Date( date ).toLocaleString();
	const summaryData = [
		[ 
			`${dateTime}`,
			`${version}`,
			`Score: ${score}`
		]
	];
	
	// Draw the table at the top
	$.setColor( 10 );

	$.print( summaryData[ 0 ].join( " | " ) );
	
	// Position the detailed results table below the compact summary
	const resultsStartRow = 6;
	$.setPos( 0, resultsStartRow );
	
	// Create results table data
	const resultsData = [ [
		"Test Name", "Score", "FPS", "Items/Frame", "Items/Sec", "P95", "Var"
	] ];
	const menuOptionsData = [];

	const padding = [];
	for( const resultData of resultsData[ 0 ] ) {
		padding.push( resultData.length );
	}

	// Add results to table
	for( const result of results ) {
		resultsData.push( [
			result.name,
			( result.score || 0 ) + "",
			result.medianFps,
			Math.round( result.itemCount ).toString(),
			Math.round( result.itemCountPerSecond ).toString(),
			result.p95FrameMs.toFixed( 1 ) + "ms",
			result.variabilityPercent.toFixed( 1 ) + "%"
		] );
		const resultsIndex = resultsData.length - 1;
		for( let i = 0; i < padding.length; i += 1 ) {
			padding[ i ] = Math.max( padding[ i ], resultsData[ resultsIndex ][ i ].length );
		}
	}

	const rowLength = padding.reduce( ( acc, val ) => val + acc, 0 ) + padding.length * 3;
	
	// Display results table
	$.setColor( 7 );
	for( let i = 0; i < resultsData.length; i += 1 ) {
		for( let j = 0; j < resultsData[ i ].length; j += 1 ) {
			let msg = ( resultsData[ i ][ j ] + "" ).trim().padEnd( padding[ j ] );
			$.print( msg + " | ", true );
		}
		if( i === 0 ) {
			$.print( "\n-".padEnd( rowLength, "-" ) );
		} else {
			$.print();
		}
	}

	// Add some spacing
	$.setPos( 0, $.getRows() - 3 );
	
	// Define menu options
	const menuOptions = [
		{
			"title": "Run New Tests",
			"handler": () => {
				clearMenuKeys();
				if( m_api && m_api.startTests ) {
					m_api.startTests();
				}
			}
		}
	];
	
	// Add "Post Results" option if not already posted
	if( !resultsObject.posted ) {
		menuOptions.push( {
			"title": "Post Results",
			"handler": () => {
				clearMenuKeys();
				postResults( resultsObject );
			}
		} );
	} else {
		menuOptions.push( {
			"title": "Return to Results Lists",
			"handler": () => {
				clearMenuKeys();
				showPreviousResults();
			}
		} );
	}
	
	// Add "Return to Main Menu" option
	menuOptions.push( {
		"title": `Return to Main Menu`,
		"handler": () => {
			clearMenuKeys();
			if( m_api && m_api.showMainMenu ) {
				m_api.showMainMenu();
			}
		}
	} );
	
	// Build menu items array
	const menuItems = menuOptions.map( ( option, index ) => `${index + 1}. ${option.title}` );
	menuOptionsData.push( menuItems );
	
	$.setColor( 15 );
	$.print( menuOptionsData[ 0 ].join( " | " ) );

	// Set up menu handlers
	const menuKeyCleanups = [];
	menuOptions.forEach( ( option, index ) => {
		const key = ( index + 1 ).toString();
		menuKeyCleanups.push( addKeyListener( key, option.handler ) );
	} );

	function clearMenuKeys() {
		while( menuKeyCleanups.length > 0 ) {
			const removeListener = menuKeyCleanups.pop();
			removeListener();
		}
	}

}

/**
 * Shows the previous results menu with list of saved results
 * 
 * @returns {void}
 */
async function showPreviousResults() {
	$.cls();
	
	// Title - centered
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Previous Results", true, true );
	
	// Show loading message
	$.setColor( 7 );
	$.setPos( 0, 4 );
	$.print( "Loading results...", false, true );
	
	try {
		// Fetch list of results from server
		const response = await fetch( "http://localhost:8080/api/list-results" );
		const result = await response.json();
		
		if( response.ok && result.success ) {
			displayResultsList( result.files, 0 );
		} else {
			showError( "Failed to load results list" );
		}
	} catch( error ) {
		showError( `Error: ${error.message}` );
	}
}

/**
 * Displays the list of saved results with options to view or delete
 * 
 * @param {Array} files - Array of file objects with name and date
 * @returns {void}
 */
function displayResultsList( files, startIndex ) {
	$.cls();
	const totalPages = Math.ceil( files.length / PAGE_SIZE );
	const normalizedStartIndex = startIndex >= files.length ? 0 : startIndex;
	const pageFiles = files.slice( normalizedStartIndex, normalizedStartIndex + PAGE_SIZE );
	
	// Title - centered
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Previous Results", true, true );
	
	if( files.length === 0 ) {

		// No results found
		$.setColor( 7 );
		$.setPos( 0, 4 );
		$.print( "No saved results found", false, true );
		
		// Return to main menu option
		$.setColor( 15 );
		$.setPos( 0, 6 );
		$.print( "Press any key to return to main menu", false, true );
		
		addKeyListener( "any", () => {
			if( m_api && m_api.showMainMenu ) {
				m_api.showMainMenu();
			}
		}, { "once": true } );
		return;
	}
	
	// Create results list table
	const resultsData = [ [ "Key", "Date/Time", "Version", "Score", "FPS" ] ];
	
	// Add each result file to the table
	for( let i = 0; i < pageFiles.length; i++ ) {
		const file = pageFiles[ i ];
		const dateTime = new Date( file.date ).toLocaleString();
		
		resultsData.push( [
			i + 1,
			dateTime,
			file.version,
			file.score,
			file.targetFps,
		] );
	}

	if( totalPages > 1 ) {
		const currentPage = Math.floor( normalizedStartIndex / PAGE_SIZE ) + 1;
		resultsData.push( [
			"0",
			"View Next Page",
			`Page (${currentPage} of ${totalPages})`,
			"",
			""
		] );
	}
	
	// Create table format
	// Display results table
	$.setColor( 7 );
	$.setPos( 0, 4 );
	const padding = [ 3, 24, 15, 8, 8 ];
	for( let i = 0; i < resultsData.length; i += 1 ) {
		for( let j = 0; j < resultsData[ i ].length; j += 1 ) {
			let msg = ( resultsData[ i ][ j ] + "" );
			msg = msg.padEnd( padding[ j ], " " );
			$.print( msg + " | ", true );
		}
		if( i === 0 ) {
			$.print( "\n------------------------------------------------------------------------" );
		} else {
			$.print();
		}
	}
	
	// Add menu options
	$.setColor( 15 );
	$.setPos( 0, $.getRows() - 3 );
	$.print( "1-9: View | C: Compare | 0: Next | D: Delete | R: Return", false, true );
	
	// Define key handler cleanup list
	const keyListenerCleanups = [];
	
	function registerKeyHandler( key, handler, options ) {
		const cleanup = addKeyListener( key, handler, options );
		keyListenerCleanups.push( cleanup );
	}

	// Set up key handlers for each file
	for( let i = 0; i < pageFiles.length; i++ ) {
		const key = ( i + 1 ).toString();
		const handler = () => {
			clearAllKeys();
			viewResult( pageFiles[ i ].name );
		};
		registerKeyHandler( key, handler );
	}

	if( totalPages > 1 ) {
		const key = "0";
		const handler = () => {
			clearAllKeys();
			let nextStartIndex = normalizedStartIndex + PAGE_SIZE;
			if( nextStartIndex >= files.length ) {
				nextStartIndex = 0;
			}
			displayResultsList( files, nextStartIndex );
		};
		registerKeyHandler( key, handler );
	}
	
	// Set up menu handlers
	registerKeyHandler( "KeyD", deleteHandler );
	registerKeyHandler( "KeyC", compareHandler );
	registerKeyHandler( "KeyR", returnHandler );
	
	function clearAllKeys() {
		while( keyListenerCleanups.length > 0 ) {
			const removeListener = keyListenerCleanups.pop();
			removeListener();
		}
	}

	function returnHandler() {
		clearAllKeys();
		if( m_api && m_api.showMainMenu ) {
			m_api.showMainMenu();
		}
	}

	function deleteHandler() {
		clearAllKeys();
		deleteAllResults( files );
	}

	function compareHandler() {
		clearAllKeys();
		showComparison( files );
	}

}

/**
 * Loads saved runs and displays a version comparison graph.
 *
 * @param {Array<Object>} files - Saved result summaries
 * @returns {Promise<void>}
 */
async function showComparison( files ) {
	$.cls();
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Loading comparison...", false, true );

	try {
		const responses = await Promise.all( files.map( file => fetch(
			`http://localhost:8080/api/get-result/${encodeURIComponent( file.name )}`
		) ) );
		const payloads = await Promise.all( responses.map( response => response.json() ) );
		const runs = payloads.filter( payload => payload.success ).map( payload => payload.data );
		if( runs.length === 0 ) {
			showError( "No comparable results found" );
			return;
		}
		displayComparisonGraph( files, runs, 0 );
	} catch( error ) {
		showError( `Error: ${error.message}` );
	}
}

/**
 * Draws median scores by version, with a selectable overall or per-test metric.
 *
 * @param {Array<Object>} files - Saved result summaries
 * @param {Array<Object>} runs - Full saved result objects
 * @param {number} metricIndex - Selected metric index
 * @returns {void}
 */
function displayComparisonGraph( files, runs, metricIndex ) {
	const testNames = [ ...new Set( runs.flatMap(
		run => run.tests.filter( test => test.supported !== false ).map( test => test.name )
	) ) ].sort();
	const versions = [ ...new Set( runs.map( run => run.version ) ) ];
	const commonTestNames = testNames.filter( name => versions.every( version => runs.some(
		run => run.version === version && run.tests.some(
			test => test.name === name && test.supported !== false
		)
	) ) );
	const metrics = [ "Overall Score", ...testNames ];
	const selectedIndex = ( metricIndex + metrics.length ) % metrics.length;
	const metric = metrics[ selectedIndex ];
	const grouped = new Map();

	for( const run of runs ) {
		let value = null;
		if( selectedIndex === 0 ) {
			const commonTests = run.tests.filter( test => commonTestNames.includes( test.name ) );
			if( commonTests.length > 0 ) {
				value = commonTests.reduce( ( sum, test ) => sum + test.score, 0 ) /
					commonTests.length;
			}
		}
		if( selectedIndex > 0 ) {
			const test = run.tests.find( entry => entry.name === metric );
			value = test ? test.itemCountPerSecond : null;
		}
		if( Number.isFinite( value ) ) {
			if( !grouped.has( run.version ) ) {
				grouped.set( run.version, [] );
			}
			grouped.get( run.version ).push( value );
		}
	}

	const bars = [ ...grouped.entries() ].map( ( [ version, values ] ) => ( {
		"version": version,
		"value": median( values ),
		"runs": values.length
	} ) ).sort( ( a, b ) => a.version.localeCompare( b.version, undefined, { "numeric": true } ) );
	const maxValue = Math.max( ...bars.map( bar => bar.value ), 1 );
	const width = $.width();
	const height = $.height();
	const chartLeft = 90;
	const chartRight = width - 35;
	const chartTop = 100;
	const chartBottom = height - 115;
	const chartHeight = chartBottom - chartTop;
	const slotWidth = ( chartRight - chartLeft ) / Math.max( bars.length, 1 );
	const colors = [ 12, 11, 10, 13, 14, 9 ];
	const measureText = text => {
		if( typeof $.calcWidth === "function" ) {
			return $.calcWidth( text );
		}
		return text.length * width / $.getCols();
	};

	$.cls();
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Performance Comparison", false, true );
	$.setColor( 15 );
	$.setPos( 0, 5 );
	$.print( metric, false, true );
	$.setColor( 8 );
	$.line( chartLeft, chartTop, chartLeft, chartBottom );
	$.line( chartLeft, chartBottom, chartRight, chartBottom );

	for( let i = 0; i < bars.length; i++ ) {
		const bar = bars[ i ];
		const barHeight = Math.max( 1, Math.round( bar.value / maxValue * chartHeight ) );
		const barWidth = Math.max( 10, Math.floor( slotWidth * 0.55 ) );
		const x = Math.floor( chartLeft + slotWidth * i + ( slotWidth - barWidth ) / 2 );
		const y = chartBottom - barHeight;
		const valueText = formatGraphValue( bar.value );
		const versionText = bar.runs > 1 ? `${bar.version} (${bar.runs})` : bar.version;
		const lineHeight = height / $.getRows();
		$.rect( x, y, barWidth, barHeight, colors[ i % colors.length ] );
		$.setColor( 15 );
		$.setPosPx(
			Math.max( 0, x + ( barWidth - measureText( valueText ) ) / 2 ),
			y + ( barHeight - lineHeight ) / 2
		);
		$.print( valueText );
		$.setPosPx(
			Math.max( 0, x + ( barWidth - measureText( versionText ) ) / 2 ),
			chartBottom + 12
		);
		$.print( versionText );
	}

	$.setColor( 7 );
	const helpText = "Up/Down: Change metric | R: Return to results";
	$.setPosPx( ( width - measureText( helpText ) ) / 2, height - 35 );
	$.print( helpText );
	const cleanups = [];
	const changeMetric = offset => {
		while( cleanups.length > 0 ) cleanups.pop()();
		displayComparisonGraph( files, runs, selectedIndex + offset );
	};
	cleanups.push( addKeyListener( "ArrowUp", () => changeMetric( -1 ) ) );
	cleanups.push( addKeyListener( "ArrowDown", () => changeMetric( 1 ) ) );
	cleanups.push( addKeyListener( "KeyR", () => {
		while( cleanups.length > 0 ) cleanups.pop()();
		displayResultsList( files, 0 );
	} ) );
}

/**
 * Returns the median of numeric values.
 *
 * @param {Array<number>} values - Numeric values
 * @returns {number} Median value
 */
function median( values ) {
	const sorted = [ ...values ].sort( ( a, b ) => a - b );
	const middle = Math.floor( sorted.length / 2 );
	if( sorted.length % 2 === 0 ) {
		return ( sorted[ middle - 1 ] + sorted[ middle ] ) / 2;
	}
	return sorted[ middle ];
}

/**
 * Formats a graph value compactly.
 *
 * @param {number} value - Numeric graph value
 * @returns {string} Compact value
 */
function formatGraphValue( value ) {
	if( value >= 1000000 ) return ( value / 1000000 ).toFixed( 1 ) + "m";
	if( value >= 1000 ) return ( value / 1000 ).toFixed( 1 ) + "k";
	return Math.round( value ).toString();
}

/**
 * Views a specific result file
 * 
 * @param {string} filename - Name of the file to view
 * @returns {void}
 */
async function viewResult( filename ) {
	$.cls();
	
	// Title - centered
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Viewing Result", true, true );
	
	// Show loading message
	$.setColor( 7 );
	$.setPos( 0, 4 );
	$.print( "Loading result...", false, true );
	
	try {
		// Fetch the specific result file
		const response = await fetch(
			`http://localhost:8080/api/get-result/${encodeURIComponent( filename )}`
		);
		const result = await response.json();
		
		if( response.ok && result.success ) {

			// Display the result using the existing showResults function
			showResults( result.data );
		} else {
			showError( "Failed to load result file" );
		}
	} catch( error ) {
		showError( `Error: ${error.message}` );
	}
}

/**
 * Deletes all result files after confirmation
 * 
 * @param {Array} files - Array of files to delete
 * @returns {void}
 */
async function deleteAllResults( files ) {
	$.cls();
	
	// Title - centered
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Delete All Results", true, true );
	
	// Confirmation message
	$.setColor( 4 );
	$.setPos( 0, 4 );
	$.print( `Are you sure you want to delete ${files.length} result files?`, false, true );
	
	// Menu options
	$.setColor( 15 );
	$.setPos( 0, 6 );
	$.print( "Press 'Y' to confirm, 'N' to cancel", false, true );
	
	const confirmationKeyCleanups = [];
	
	function registerConfirmationKey( key, handler ) {
		const cleanup = addKeyListener( key, handler );
		confirmationKeyCleanups.push( cleanup );
	}
	
	function clearConfirmationKeys() {
		while( confirmationKeyCleanups.length > 0 ) {
			const removeListener = confirmationKeyCleanups.pop();
			removeListener();
		}
	}
	
	// Define confirmation handlers
	async function confirmHandler() {

		clearConfirmationKeys();
		
		$.cls();
		$.setColor( 10 );
		$.setPos( 0, 2 );
		$.print( "Deleting files...", true, true );
		
		try {
			const response = await fetch( "http://localhost:8080/api/delete-all-results", {
				method: "POST"
			} );
			
			const result = await response.json();
			
			if( response.ok && result.success ) {
				$.setColor( 2 );
				$.setPos( 0, 4 );
				$.print( `Successfully deleted ${result.deletedCount} files`, false, true );
			} else {
				$.setColor( 4 );
				$.setPos( 0, 4 );
				$.print( "Failed to delete files", false, true );
			}
			
			// Return to main menu after delay
			$.setColor( 7 );
			$.setPos( 0, 6 );
			$.print( "Press any key to return to main menu", false, true );
			
			addKeyListener( "any", () => {
				if( m_api && m_api.showMainMenu ) {
					m_api.showMainMenu();
				}
			}, { "once": true } );
		} catch( error ) {
			showError( `Error: ${error.message}` );
		}
	}

	function cancelHandler() {

		clearConfirmationKeys();

		// Return to results list
		showPreviousResults();
	}

	registerConfirmationKey( "KeyY", confirmHandler );
	registerConfirmationKey( "KeyN", cancelHandler );
}

/**
 * Shows an error message and returns to main menu
 * 
 * @param {string} message - Error message to display
 * @returns {void}
 */
function showError( message ) {
	$.cls();
	
	$.setColor( 4 );
	$.setPos( 0, 4 );
	$.print( message, false, true );
	
	$.setColor( 7 );
	$.setPos( 0, 6 );
	$.print( "Press any key to return to main menu", false, true );
	
	addKeyListener( "any", () => {
		if( m_api && m_api.showMainMenu ) {
			m_api.showMainMenu();
		}
	}, { "once": true } );
}

/**
 * Posts the test results to the server for storage
 * 
 * @param {Object} resultsObject - Results object containing version, date, and tests array
 * @returns {void}
 */
async function postResults( resultsObject ) {
	$.cls();
	
	// Show title
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Performance Tests", true, true );
	
	// Center the content vertically
	const contentStartRow = Math.floor( $.getRows() / 2 ) - 1;
	$.setPos( 0, contentStartRow );
	
	// Show posting message
	$.setColor( 7 );
	$.print( "Posting results...", false, true );
	
	try {
		// Send results to server
		const response = await fetch( "http://localhost:8080/api/post-results", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify( resultsObject )
		} );
		
		const result = await response.json();
		
		if( response.ok && result.success ) {
			
			// Mark results as posted in the object
			m_currentResultsObject.posted = true;

			// Show success message
			$.setColor( 2 );
			$.setPos( 0, contentStartRow + 2 );
			$.print( `Results saved: ${result.filename}`, false, true );
		} else {

			// Show error message
			$.setColor( 4 );
			$.setPos( 0, contentStartRow + 2 );
			$.print( `Error: ${result.error || "Failed to save results"}`, false, true );
		}
	} catch( error ) {
		// Show error message
		$.setColor( 4 );
		$.setPos( 0, contentStartRow + 2 );
		$.print( `Error: ${error.message}`, false, true );
	}
	
	// Show instruction
	$.setColor( 7 );
	$.setPos( 0, contentStartRow + 4 );
	$.print( "Press any key to return to results", false, true );
	
	addKeyListener( "any", () => {

		// Return to results display (which will now show updated menu without "Post Results")
		if( m_currentResultsObject ) {
			showResults( m_currentResultsObject );
		} else {
			// Fallback to main menu if no results object is available
			if( m_api && m_api.showMainMenu ) {
				m_api.showMainMenu();
			}
		}
	}, { "once": true } );
}
