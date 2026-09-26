/** Report unique visual-test outcomes and keep retry attempts separate. */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_resultsPageGenerator from "./results-page-generator.js";

/** Convert the final result of a Playwright test into a report record. */
export function summarizeTest( test, mode ) {
	const result = test.results.at( -1 ) || { "status": "interrupted" };
	let status = result.status;
	if( test.outcome() === "flaky" ) { status = "flaky"; }
	const annotation = test.annotations.find( item => item.type === "screenshot-name" );
	const skip = test.annotations.find( item => item.type === "skip-reason" );
	const mismatch = test.annotations.find( item => item.type === "pixel-mismatch" );
	const screenshotName = annotation?.description || test.title;
	let directory = "html-core";
	if( mode === "plugins" ) { directory = "html-plugins"; }
	return {
		"id": test.id, "name": test.title, "file": `${screenshotName}.html`,
		"url": `/test/tests/${directory}/${screenshotName}.html`,
		"screenshotName": screenshotName, "status": status,
		"error": result.error?.message || skip?.description || "",
		"pendingBaseline": !!skip?.description.includes( "No reference screenshot" ),
		"pixelMismatch": mismatch?.description || "",
		"retries": Math.max( 0, test.results.length - 1 )
	};
}

export default class MinimalReporter {
	constructor( options = {} ) {
		this.outputRoot = options.outputRoot || process.cwd();
		this.mode = process.env.PI_TEST_MODE || "full";
		this.startTime = Date.now();
	}

	onBegin( config, suite ) {
		this.suite = suite;
		this.mode = process.env.PI_TEST_MODE || "full";
		this.startTime = Date.now();
		const count = new Set( suite.allTests().map( test => test.id ) ).size;
		console.log( `Running ${count} ${this.mode} visual tests ` +
			`with up to ${config.workers} workers` );
	}

	onTestEnd( test, result ) {
		if( result.retry > 0 ) {
			console.log( `Retry ${result.retry}: ${test.title} (${result.status})` );
		}
	}

	onEnd( result ) {
		const tests = [ ...new Map( ( this.suite?.allTests() || [] ).map( test =>
			[ test.id, summarizeTest( test, this.mode ) ]
		) ).values() ];
		const count = status => tests.filter( test => test.status === status ).length;
		const summary = {
			"total": tests.length, "passed": count( "passed" ), "flaky": count( "flaky" ),
			"failed": count( "failed" ), "timedOut": count( "timedOut" ),
			"interrupted": count( "interrupted" ), "skipped": count( "skipped" ),
			"pendingBaselines": tests.filter( test => test.pendingBaseline ).length,
			"pixelMismatches": tests.filter( test => test.pixelMismatch ).length,
			"retries": tests.reduce( ( total, test ) => total + test.retries, 0 ),
			"status": result.status, "tests": tests
		};
		const markers = {
			"passed": ".", "flaky": "R", "failed": "F", "timedOut": "T",
			"interrupted": "I", "skipped": "S"
		};
		const pending = process.env.PI_TEST_STRICT === "true" && summary.pendingBaselines > 0;
		if( pending ) { summary.status = "failed"; }
		console.log( tests.map( test => markers[ test.status ] || "?" ).join( "" ) );
		console.log( `Finished in ${ ( ( Date.now() - this.startTime ) / 1000 ).toFixed( 1 ) }s` );
		for( const [ key, value ] of Object.entries( summary ) ) {
			if( key !== "tests" ) { console.log( `${key}: ${value}` ); }
		}

		// Report-only pixel mode passes mismatches, so name them for CI logs
		for( const test of tests.filter( item => item.pixelMismatch ) ) {
			console.log( `Pixel mismatch (report only): ${test.screenshotName}: ` +
				test.pixelMismatch );
		}
		const directory = g_path.resolve( this.outputRoot, "test/test-results", this.mode );
		g_fs.mkdirSync( directory, { "recursive": true } );
		g_fs.writeFileSync( g_path.join( directory, "summary.json" ),
			JSON.stringify( summary, null, "\t" ) + "\n" );
		g_fs.writeFileSync( g_path.join( directory, "results.html" ),
			g_resultsPageGenerator.generateResultsPage( summary, this.mode ) );
		console.log( `Review: /test/test-results/${this.mode}/results.html (npm run server)` );
		if( pending ) {
			console.error( "Baseline approval is pending; complete correctness validation failed." );
			return { "status": "failed" };
		}
	}
}
