/**
 * Minimal Playwright Reporter
 * 
 * Only shows progress dots and summary at end (no error details)
 */

const fs = require( "fs" );
const path = require( "path" );
const { generateResultsPage } = require( "./results-page-generator.js" );

class MinimalReporter {
	constructor( options ) {
		this.options = options;
		this.total = 0;
		this.passed = 0;
		this.failed = 0;
		this.skipped = 0;
		this.failedTests = [];
		this.allTests = [];
		this.startTime = Date.now();
	}

	onBegin( config, suite ) {
		console.log( "" );
	}

	onTestEnd( test, result ) {
		this.total++;
		
		// Extract test name and filename
		const title = test.title;
		
		// Try to extract the actual HTML filename from the test
		// The title format is usually the metadata name (e.g., "circle 01")
		// We need to convert it to the filename format (e.g., "circle_01.html")
		let htmlFile = title.toLowerCase().replace( /\s+/g, "_" ) + ".html";
		
		// Create test record
		const testRecord = {
			"name": title,
			"file": htmlFile,
			"url": `/test/tests/${htmlFile}`,
			"status": result.status,
			"error": result.error ? result.error.message : null
		};
		
		this.allTests.push( testRecord );
		
		if( result.status === "passed" ) {
			this.passed++;
			process.stdout.write( "." );
		} else if( result.status === "failed" ) {
			this.failed++;
			this.failedTests.push( {
				"title": test.title,
				"error": result.error ? result.error.message : "Unknown error"
			} );
			process.stdout.write( "F" );
		} else if( result.status === "skipped" ) {
			this.skipped++;
			process.stdout.write( "S" );
		}

		// New line every 50 tests
		if( this.total % 50 === 0 ) {
			console.log( "" );
		}
	}

	onEnd( result ) {
		const duration = ( ( Date.now() - this.startTime ) / 1000 ).toFixed( 1 );
		
		console.log( "\n" );
		console.log( `Finished in ${duration}s\n` );
		
		// Show custom summary
		console.log( "========================================" );
		console.log( "   Pi.js Visual Regression Results" );
		console.log( "========================================" );
		console.log( `  Total:    ${this.total}` );
		console.log( `  Passed:   ${this.passed}` );
		console.log( `  Failed:   ${this.failed}` );
		console.log( `  Skipped:  ${this.skipped}` );
		
		const passRate = this.total > 0 
			? ( ( this.passed / this.total ) * 100 ).toFixed( 1 )
			: 0;
		console.log( `  Pass Rate: ${passRate}%` );
		console.log( "========================================" );
		
		// Show failed tests if any
		if( this.failed > 0 ) {
			console.log( "\nFailed Tests:" );
			this.failedTests.forEach( ( test, index ) => {
				// Extract just the percentage from error message if it's a mismatch
				let errorMsg = test.error;
				const mismatchMatch = errorMsg.match( /(\d+\.?\d*)% different/ );
				if( mismatchMatch ) {
					errorMsg = `${mismatchMatch[ 1 ]}% different`;
				}
				
				console.log( `${index + 1}. ${test.title} - ${errorMsg}` );
			} );
			console.log( "" );
		}
		
		// Generate HTML results page
		const resultsData = {
			"total": this.total,
			"passed": this.passed,
			"failed": this.failed,
			"skipped": this.skipped,
			"tests": this.allTests
		};
		
		const resultsHTML = generateResultsPage( resultsData );
		const resultsPath = path.join( process.cwd(), "test/test-results/results.html" );
		const resultsDir = path.dirname( resultsPath );
		
		// Ensure directory exists
		if( !fs.existsSync( resultsDir ) ) {
			fs.mkdirSync( resultsDir, { "recursive": true } );
		}
		
		fs.writeFileSync( resultsPath, resultsHTML );
		
		// Show results page link
		console.log( `Results page: ${resultsPath}` );
		console.log( "========================================\n" );
	}
}

module.exports = MinimalReporter;

