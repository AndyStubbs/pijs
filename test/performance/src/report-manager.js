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

/**
 * Initializes the report manager with an API object
 * 
 * @param {Object} api - API object with showMainMenu function
 * @returns {void}
 */
function init( api ) {
	m_api = api;
}

/**
 * Displays the test results with improved formatting
 * 
 * @param {Object} resultsObject - Results object containing version, date, and tests array
 * @returns {void}
 */
function showResults( resultsObject ) {
	const { version, date, tests: results } = resultsObject;

	// Store current results object
	m_currentResultsObject = resultsObject;

	// Clear the screen
	$.cls();
	
	// Compact summary table - one line of data
	const dateTime = new Date( date ).toLocaleString();
	const completedTests = results.filter( r => r.status === "complete" ).length;
	
	const summaryData = [
		[ 
			`Generated: ${dateTime}`,
			`Version: ${version}`,
			`Completed: ${completedTests} of ${results.length}`,
		]
	];
	
	const summaryFormat = [
		"*-------------------------------------*-------------------------*------------------------------*",
		"|                                     |                         |                              |",
		"*-------------------------------------*-------------------------*------------------------------*"
	];

	// Draw the table at the top
	$.setColor( 10 );
	$.printTable( summaryData, summaryFormat, "single", true );
	
	// Position the detailed results table below the compact summary
	const resultsStartRow = 4;
	$.setPos( 0, resultsStartRow );
	
	// Create results table data
	const resultsData = [ [ "Test Name", "Status", "Items/Frame", "Items/Sec", "Duration" ] ];
	const menuOptionsData = [];
	
	// Add results to table
	for( const result of results ) {
		resultsData.push( [
			result.name,
			result.status,
			Math.round( result.itemCountAvg ).toString(),
			Math.round( result.itemCountPerSecond ).toString(),
			Math.round( result.testTime / 1000 ).toString() + "s"
		] );
	}
	
	const borderLine = "*---------------*----------*-------------*-----------*----------*";
	const itemLine =   "|               |          |             |           |          |";

	// Create results table format (header + data rows)
	const resultsFormat = [ borderLine, itemLine, borderLine ];
	
	// Extend format for each result row (header + data rows)
	for( let i = 0; i < results.length; i++ ) {
		resultsFormat.push( itemLine );
		resultsFormat.push( borderLine );
	}
	
	// Display results table
	$.setColor( 7 );
	$.printTable( resultsData, resultsFormat, "double", true );
	
	// Add some spacing
	$.setPos( 0, $.getRows() - 3 );
	
	// Define menu options
	const menuOptions = [
		{
			"title": "Restart Tests",
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
	$.printTable( menuOptionsData, null, "single", true );
	
	// Set up menu handlers
	menuOptions.forEach( ( option, index ) => {
		const key = ( index + 1 ).toString();
		$.onkey( key, "down", option.handler );
	} );

	function clearMenuKeys() {
		menuOptions.forEach( ( option, index ) => {
			const key = ( index + 1 ).toString();
			$.offkey( key, "down", option.handler );
		} );
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
			displayResultsList( result.files );
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
function displayResultsList( files ) {
	$.cls();
	
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
		
		$.onkey( "any", "down", () => {
			if( m_api && m_api.showMainMenu ) {
				m_api.showMainMenu();
			}
		}, true );
		return;
	}
	
	// Create results list table
	const resultsData = [ [ "Date/Time", "File Name", "Actions" ] ];
	
	// Add each result file to the table
	for( let i = 0; i < files.length; i++ ) {
		const file = files[ i ];
		const dateTime = new Date( file.date ).toLocaleString();
		const fileName = file.name.length > 20 ? file.name.substring( 0, 17 ) + "..." : file.name;
		
		resultsData.push( [
			dateTime,
			fileName,
			`View (${i + 1})`
		] );
	}
	
	// Create table format
	const borderLine = "*---------------------*----------------------*----------*";
	const itemLine =   "|                     |                      |          |";
	
	const resultsFormat = [ borderLine, itemLine, borderLine ];
	
	// Extend format for each result row
	for( let i = 0; i < files.length; i++ ) {
		resultsFormat.push( itemLine );
		resultsFormat.push( borderLine );
	}
	
	// Display results table
	$.setColor( 7 );
	$.setPos( 0, 4 );
	$.printTable( resultsData, resultsFormat, "double", true );
	
	// Add menu options
	$.setColor( 15 );
	$.setPos( 0, $.getRows() - 3 );
	$.print( "Press number to view result, 'D' to delete all, 'R' to return", false, true );
	
	// Define key handler functions
	const keyHandlers = [];

	// Set up key handlers for each file
	for( let i = 0; i < files.length; i++ ) {
		const key = ( i + 1 ).toString();
		const handler = () => viewResult( files[ i ].name );
		keyHandlers.push( handler );
		$.onkey( key, "down", handler );
	}
	
	// Set up menu handlers
	$.onkey( "KeyD", "down", deleteHandler );
	$.onkey( "KeyR", "down", returnHandler );
	
	function clearAllKeys() {

		// Clear numbered keys
		for( let i = 0; i < files.length; i++ ) {
			const key = ( i + 1 ).toString();
			$.offkey( key, "down", keyHandlers[ i ] );
		}
		
		// Clear menu keys
		$.offkey( "KeyD", "down", deleteHandler );
		$.offkey( "KeyR", "down", returnHandler );
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
	
	// Define confirmation handlers
	async function confirmHandler() {
		// Clear the confirmation key handlers
		$.offkey( "KeyY", "down", confirmHandler );
		$.offkey( "KeyN", "down", cancelHandler );
		
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
			
			$.onkey( "any", "down", () => {
				if( m_api && m_api.showMainMenu ) {
					m_api.showMainMenu();
				}
			}, true );
		} catch( error ) {
			showError( `Error: ${error.message}` );
		}
	}

	function cancelHandler() {
		// Clear the confirmation key handlers
		$.offkey( "KeyY", "down", confirmHandler );
		$.offkey( "KeyN", "down", cancelHandler );

		// Return to results list
		displayResultsList( files );
	}

	$.onkey( "KeyY", "down", confirmHandler );
	$.onkey( "KeyN", "down", cancelHandler );
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
	
	$.onkey( "any", "down", () => {
		if( m_api && m_api.showMainMenu ) {
			m_api.showMainMenu();
		}
	}, true );
}

/**
 * Clears all key handlers for the results list
 * 
 * @param {number} fileCount - Number of files (for numbered keys)
 * @returns {void}
 */
function clearAllKeys( fileCount ) {
	for( let i = 1; i <= fileCount; i++ ) {
		$.offkey( i.toString(), "down", () => {} );
	}
	$.offkey( "KeyD", "down", () => {} );
	$.offkey( "KeyR", "down", () => {} );
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
	
	$.onkey( "any", "down", () => {
		// Return to results display (which will now show updated menu without "Post Results")
		if( m_currentResultsObject ) {
			showResults( m_currentResultsObject );
		} else {
			// Fallback to main menu if no results object is available
			if( m_api && m_api.showMainMenu ) {
				m_api.showMainMenu();
			}
		}
	}, true );
}
