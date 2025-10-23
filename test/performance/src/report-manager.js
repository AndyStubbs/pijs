/**
 * Report Manager Module
 * 
 * Handles test results display and reporting functionality.
 * 
 * @module report-manager
 */

export { init, showResults, postResults };

"use strict";

let m_api = null;

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
	
	// Create compact menu options table - one line of data
	menuOptionsData.push(
		[ "1. Restart Tests", "2. Post Results", "3. Return to Main Menu" ]
	);
		
	$.setColor( 15 );
	$.printTable( menuOptionsData, null, "single", true );
	
	// Set up menu handlers
	$.onkey( "1", "down", menu1 );
	$.onkey( "2", "down", menu2 );
	$.onkey( "3", "down", menu3 );

	function menu1() {
		clearMenuKeys();
		if( m_api && m_api.startTests ) {
			m_api.startTests();
		}
	}

	function menu2() {
		clearMenuKeys();
		postResults( resultsObject );
	}

	function menu3() {
		clearMenuKeys();
		if( m_api && m_api.showMainMenu ) {
			m_api.showMainMenu();
		}
	}

	function clearMenuKeys() {
		$.offkey( "1", "down", menu1 );
		$.offkey( "2", "down", menu2 );
		$.offkey( "3", "down", menu3 );
	}
}

/**
 * Shows the post results menu (placeholder)
 * 
 * @returns {void}
 */
function showPostResults() {
	$.cls();
	
	// Title - centered
	$.setColor( 10 );
	$.setPos( 0, 2 );
	$.print( "Post Results", true, true );
	
	// Center the content vertically
	const contentStartRow = Math.floor( $.getRows() / 2 ) - 1;
	$.setPos( 0, contentStartRow );
	
	// Create placeholder message table
	const placeholderItems = [
		[ "Feature not implemented yet" ],
		[ "Coming soon..." ]
	];
	
	const placeholderFormat = [
		"*-------------------------------*",
		"|                               |",
		"*-------------------------------*",
		"|                               |",
		"*-------------------------------*"
	];
	
	$.setColor( 7 );
	$.printTable( placeholderItems, placeholderFormat, "single", true );
	
	// Instruction - centered below table
	$.setColor( 7 );
	$.setPos( 0, contentStartRow + 6 );
	$.print( "Press any key to return", false, true );
	
	$.onkey( "any", "down", () => {
		// Return to results (would need results data passed back)
		if( m_api && m_api.showMainMenu ) {
			m_api.showMainMenu();
		}
	}, true );
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
	$.print( "Press any key to return to main menu", false, true );
	
	$.onkey( "any", "down", () => {
		if( m_api && m_api.showMainMenu ) {
			m_api.showMainMenu();
		}
	}, true );
}
