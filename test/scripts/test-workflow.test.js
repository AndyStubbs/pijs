/** Correctness workflow boundaries, process arguments, reporting, and server ownership. */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_events from "node:events";
import * as g_childProcess from "node:child_process";
import * as g_workflow from "../../scripts/test.js";
import * as g_server from "./test-server.js";
import * as g_reporter from "./minimal-reporter.js";
import * as g_config from "../../playwright.config.js";
import * as g_visualReview from "../../scripts/visual-review.js";

const ROOT = g_url.fileURLToPath( new URL( "../../", import.meta.url ) );

function temporaryDirectory( t ) {
	const directory = g_fs.mkdtempSync( g_path.join( g_os.tmpdir(), "pijs-workflow-" ) );
	t.after( () => g_fs.rmSync( directory, { "recursive": true, "force": true } ) );
	return directory;
}

g_test.test( "discovery assigns every maintained file once and excludes snapshot copies", t => {
	const root = temporaryDirectory( t );
	for( const directory of [ "test/unit", "test/scripts", "test/performance/snapshot/test/unit" ] ) {
		g_fs.mkdirSync( g_path.join( root, directory ), { "recursive": true } );
	}
	for( const file of [ "test/unit/a.test.js", "test/unit/a-browser.test.js",
		"test/unit/benchmark.test.js", "test/unit/benchmark-browser.test.js",
		"test/scripts/package-types-consumer.test.js", "test/scripts/tool.test.js",
		"test/performance/snapshot/test/unit/a.test.js" ] ) {
		g_fs.writeFileSync( g_path.join( root, file ), "" );
	}
	g_assert.deepEqual( g_workflow.discoverTests( root ), {
		"unit": [ "test/scripts/tool.test.js", "test/unit/a.test.js" ],
		"browser": [ "test/unit/a-browser.test.js" ],
		"types": [ "test/scripts/package-types-consumer.test.js" ],
		"benchmark": [ "test/unit/benchmark-browser.test.js", "test/unit/benchmark.test.js" ]
	} );
	const real = Object.values( g_workflow.discoverTests() ).flat();
	const expected = [ "test/unit", "test/scripts" ].flatMap( directory =>
		g_fs.readdirSync( g_path.join( ROOT, directory ) )
			.filter( name => name.endsWith( ".test.js" ) ).map( name => `${directory}/${name}` )
	).sort();
	g_assert.deepEqual( [ ...real ].sort(), expected );
	g_assert.equal( new Set( real ).size, real.length );
} );

g_test.test( "Playwright does not load campaign runner copies", t => {
	const root = temporaryDirectory( t );
	const copies = [
		"phase3-20260916/sources/baseline", "phase3-20260916/sources/p2",
		"phase4-20260916/sources/baseline", "phase4-20260916/sources/p2",
		"phase4-20260916/sources/p2-direct"
	].map( name => `test/performance/campaigns/${name}/test/scripts` );
	for( const directory of [ "test/scripts", ...copies ] ) {
		g_fs.mkdirSync( g_path.join( root, directory ), { "recursive": true } );
	}
	const playwright = g_url.pathToFileURL(
		g_path.join( ROOT, "node_modules/@playwright/test/index.mjs" )
	).href;
	g_fs.writeFileSync( g_path.join( root, "package.json" ),
		JSON.stringify( { "type": "module" } ) );
	g_fs.writeFileSync( g_path.join( root, "test/scripts/run-visual-tests.js" ),
		`import { test } from ${JSON.stringify( playwright )}; test("only maintained",()=>{});` );
	for( const directory of copies ) {
		g_fs.writeFileSync( g_path.join( root, directory, "run-visual-tests.js" ),
			"throw new Error( \"snapshot loaded\" );" );
	}
	g_fs.writeFileSync( g_path.join( root, "playwright.config.js" ),
		`export default ${JSON.stringify( {
			"testDir": g_config.default.testDir, "testMatch": g_config.default.testMatch
		} )};` );
	const result = g_childProcess.spawnSync( process.execPath, [
		g_path.join( ROOT, "node_modules/playwright/cli.js" ), "test", "--list", "--reporter=list"
	], { "cwd": root, "encoding": "utf8", "timeout": 30000 } );
	g_assert.equal( result.status, 0, result.stderr );
	g_assert.match( result.stdout, /Total: 1 test in 1 file/ );
} );

g_test.test(
	"process invocation preserves shell-sensitive arguments and reports failures", async () => {
	for( const code of [ 0, 2 ] ) {
		const args = [ "tool with spaces.js", "--grep", "Circle|line $(literal)" ];
		const run = g_workflow.runNode( args, { "PI_TEST_MODE": "lite" },
			( exe, actual, opts ) => {
				g_assert.equal( exe, process.execPath );
				g_assert.deepEqual( actual, args );
				g_assert.equal( opts.shell, false );
				g_assert.equal( opts.env.PI_TEST_MODE, "lite" );
				const child = new g_events.EventEmitter();
				queueMicrotask( () => child.emit( "close", code, null ) );
				return child;
			}
		);
		if( code ) { await g_assert.rejects( run, /Command failed/ ); } else { await run; }
	}
	g_assert.deepEqual( g_workflow.parseOptions(
		[ "visual", "--mode=lite", "--grep", "Circle|line" ]
	), { "command": "visual", "modes": [ "lite" ], "forwarded": [ "--grep", "Circle|line" ] } );
	g_assert.throws( () => g_workflow.parseOptions( [ "all", "--grep", "line" ] ) );
	g_assert.throws( () => g_workflow.parseOptions( [ "visual", "--mode=unknown" ] ) );
} );

g_test.test( "failed stages prevent subsequent stages from running", async t => {
	t.mock.method( console, "log", () => {} );
	const visited = [];
	await g_assert.rejects( g_workflow.runStages( [
		[ "build", async () => { visited.push( "build" ); throw new Error( "failure" ); } ],
		[ "tests", async () => { visited.push( "tests" ); } ]
	] ), /build: failure/ );
	g_assert.deepEqual( visited, [ "build" ] );
} );

g_test.test(
	"test server serves fresh files, rejects writes, and closes after failure", async t => {
	const root = temporaryDirectory( t );
	g_fs.writeFileSync( g_path.join( root, "fixture.html" ), "fresh fixture" );
	let url;
	await g_assert.rejects( g_server.withTestServer( root, async address => {
		url = address;
		g_assert.equal( await ( await fetch( `${url}/fixture.html` ) ).text(), "fresh fixture" );
		g_assert.equal( ( await fetch( `${url}/fixture.html`, { "method": "POST" } ) ).status, 405 );
		g_assert.equal( ( await fetch( `${url}/missing.html` ) ).status, 404 );
		throw new Error( "test failure" );
	} ), /test failure/ );
	await g_assert.rejects( fetch( `${url}/fixture.html` ) );
} );

g_test.test( "reporter counts final outcomes once and isolates all visual modes", t => {
	t.mock.method( console, "log", () => {} );
	t.mock.method( console, "error", () => {} );
	const root = temporaryDirectory( t );
	const oldStrict = process.env.PI_TEST_STRICT;
	const oldMode = process.env.PI_TEST_MODE;
	t.after( () => {
		if( oldStrict === undefined ) { delete process.env.PI_TEST_STRICT; }
		else { process.env.PI_TEST_STRICT = oldStrict; }
		if( oldMode === undefined ) { delete process.env.PI_TEST_MODE; }
		else { process.env.PI_TEST_MODE = oldMode; }
	} );
	const statuses = [ "passed", "flaky", "failed", "timedOut", "interrupted", "skipped" ];
	const tests = statuses.map( ( status, index ) => {
		let results = [ { "status": status } ];
		const annotations = [ { "type": "screenshot-name", "description": `fixture_${index}` } ];
		if( status === "flaky" ) { results = [ { "status": "failed" }, { "status": "passed" } ]; }
		if( status === "skipped" ) {
			annotations.push( { "type": "skip-reason", "description": "No reference screenshot" } );
		}
		return { "id": String( index ), "title": status, "results": results,
			"annotations": annotations, "outcome": () => status };
	} );
	for( const mode of [ "full", "lite", "plugins" ] ) {
		process.env.PI_TEST_MODE = mode;
		process.env.PI_TEST_STRICT = "true";
		const reporter = new g_reporter.default( { "outputRoot": root } );
		reporter.onBegin( { "workers": 2 }, { "allTests": () => [ ...tests, tests[ 0 ] ] } );
		g_assert.deepEqual( reporter.onEnd( { "status": "passed" } ), { "status": "failed" } );
		const directory = g_path.join( root, "test/test-results", mode );
		const summary = JSON.parse( g_fs.readFileSync( g_path.join( directory, "summary.json" ) ) );
		g_assert.equal( summary.total, 6 );
		g_assert.equal( summary.retries, 1 );
		g_assert.equal( summary.pendingBaselines, 1 );
		g_assert.equal( summary.status, "failed" );
		for( const status of statuses ) { g_assert.equal( summary[ status ], 1 ); }
		const html = g_fs.readFileSync( g_path.join( directory, "results.html" ), "utf8" );
		g_assert.ok( html.includes( `/test/test-results/${mode}/screenshots/fixture_0.png` ) );
		g_assert.ok( html.includes( `/test/playwright-report/${mode}/` ) );
		g_assert.ok( html.includes( `const TEST_MODE = "${mode}"` ) );
		g_assert.doesNotMatch( html, /\{\{[A-Z_]+\}\}/ );
	}
} );

g_test.test( "review actions select each mode's candidate and reject invalid paths", () => {
	for( const mode of [ "full", "lite", "plugins" ] ) {
		const paths = g_visualReview.reviewPaths( ROOT, mode, "loadFont_01" );
		g_assert.equal( paths.sourcePath,
			g_path.join( ROOT, "test/test-results", mode, "screenshots/loadFont_01.png" ) );
		g_assert.equal( paths.destPath,
			g_path.join( ROOT, "test/tests/screenshots/loadFont_01.png" ) );
	}
	for( const mode of [ "../full", "core", undefined ] ) {
		g_assert.throws( () => g_visualReview.reviewPaths( ROOT, mode, "fixture" ) );
	}
	for( const name of [ "../fixture", "a/b", "a\\b", "a:stream", null ] ) {
		g_assert.throws( () => g_visualReview.reviewPaths( ROOT, "full", name ) );
	}
} );

g_test.test( "legacy report bookmarks redirect instead of serving stale counts", () => {
	for( const [ url, target ] of [
		[ "/test/results.html", "/test/test-results/full/results.html" ],
		[ "/test/results-plugins.html", "/test/test-results/plugins/results.html" ],
		[ "/test/playwright-report/index.html", "/test/playwright-report/full/" ],
		[ "/test/playwright-report/", "/test/playwright-report/full/" ],
		[ "/test/playwright-report", "/test/playwright-report/full/" ]
	] ) {
		const response = {
			"writeHead": ( status, headers ) => {
				g_assert.equal( status, 302 );
				g_assert.equal( headers.Location, target );
				g_assert.equal( headers[ "Cache-Control" ], "no-store" );
			},
			"end": () => {}
		};
		for( const method of [ "GET", "HEAD" ] ) {
			g_assert.equal( g_visualReview.redirectLegacyReport(
				{ "method": method, "url": url + "?old=1" }, response ), true );
		}
	}
	g_assert.equal( g_visualReview.redirectLegacyReport(
		{ "method": "GET", "url": "/test/test-results/lite/results.html" }, {} ), false );
	g_assert.equal( g_visualReview.redirectLegacyReport(
		{ "method": "POST", "url": "/test/results.html" }, {} ), false );
} );

g_test.test( "interruption terminates the child and removes process listeners", async () => {
	const listeners = process.listenerCount( "SIGINT" );
	let killed = false;
	const run = g_workflow.runNode( [ "test-child.js" ], {}, () => {
		const child = new g_events.EventEmitter();
		child.kill = signal => {
			killed = true;
			queueMicrotask( () => child.emit( "close", null, signal ) );
		};
		queueMicrotask( () => process.emit( "SIGINT" ) );
		return child;
	} );
	await g_assert.rejects( run, /SIGTERM/ );
	g_assert.equal( killed, true );
	g_assert.equal( process.listenerCount( "SIGINT" ), listeners );
} );
