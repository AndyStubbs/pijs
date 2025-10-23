/**
 * Report Manager Module
 * 
 * Handles test results display and reporting functionality.
 * 
 * @module report-manager
 */

export { init, showResults };

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
	
	// Set up menu handlers with once flag
	$.onkey( "1", "down", () => {
		if( m_api && m_api.restartTests ) {
			m_api.restartTests();
		}
	}, true );
	
	$.onkey( "2", "down", () => {
		showPostResults();
	}, true );
	
	$.onkey( "3", "down", () => {
		if( m_api && m_api.showMainMenu ) {
			m_api.showMainMenu();
		}
	}, true );
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
	
	$.onkey( "", "down", () => {
		// Return to results (would need results data passed back)
		if( m_api && m_api.showMainMenu ) {
			m_api.showMainMenu();
		}
	}, true );
}
