/** Benchmark protocol, integrity, statistics, and interruption/resume regression tests. */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_run from "../performance/benchmark/run.js";
import * as g_stats from "../performance/benchmark/statistics.js";
import * as g_artifacts from "../performance/benchmark/artifacts.js";
import * as g_browser from "../performance/benchmark/browser.js";

function samples( value ) {
	return Array.from( { "length": 32 }, ( unused, index ) => {
		let frameMs = 16;
		if( index === 0 ) {
			frameMs = null;
		}
		return {
			"queueMs": value / 2, "submitMs": value, "frameMs": frameMs,
			"visibility": "visible"
		};
	} );
}

function result( value = 10 ) {
	return {
		"environment": { "browser": "test-only", "browserState": { "visibility": "visible" } },
		"seedProof": g_run.expectedProof(),
		"tests": [ {
			"name": "line", "supported": true, "count": 1200, "warmupFrames": 16,
			"samples": samples( value )
		} ]
	};
}

g_test.test( "CLI validates source paths, equals, and duplicate labels", () => {
	const config = g_run.parseArgs( [ "--source=before=.", "--source=after=some=directory",
		"--cases=line,images", "--smoke" ] );
	g_assert.equal( config.sources.length, 2 );
	g_assert.equal( config.sources[ 1 ].directory, g_path.resolve( "some=directory" ) );
	g_assert.equal( config.pluginSource, g_path.resolve( "plugins/polygons" ) );
	g_assert.deepEqual( config.cases, [ "line", "images" ] );
	g_assert.ok( config.out.includes( "campaigns" ) );
	for( const args of [ [], [ "--source=a=.", "--source=A=." ],
		[ "--source=a=.", "--cases=nope" ], [ "--source=a=.", "--cases=line,line" ],
		[ "--source=a=.", "--resume" ], [ "--source=a=.", "--hedless" ] ] ) {
		g_assert.throws( () => g_run.parseArgs( args ) );
	}
} );

g_test.test( "two-source order alternates; larger groups rotate and reverse", () => {
	const pair = Array.from( { "length": 4 }, ( unused, round ) =>
		g_run.orderForRound( [ "a", "b" ], round ) );
	g_assert.deepEqual( pair, [ [ "a", "b" ], [ "b", "a" ], [ "a", "b" ], [ "b", "a" ] ] );
	g_assert.deepEqual( g_run.orderForRound( [ "a", "b", "c" ], 1 ), [ "a", "c", "b" ] );
	g_assert.deepEqual( g_run.orderForRound( [ "a" ], 3 ), [ "a" ] );
} );

g_test.test( "whole-run summaries preserve p95 and deterministic intervals", () => {
	const runs = [ 10, 20, 30 ].map( value => result( value ) );
	const row = g_stats.summarize( runs )[ 0 ];
	g_assert.equal( row.submitMs, 20 );
	g_assert.equal( row.queueMs, 10 );
	g_assert.equal( row.p95SubmitMs, 20 );
	g_assert.equal( row.runMadPercent, 50 );
	g_assert.equal( row.stable, false );
	g_assert.deepEqual( g_stats.ratioInterval( [ 10, 10, 10 ], [ 5, 5, 5 ] ), [ -50, -50 ] );
	g_assert.deepEqual( g_stats.ratioInterval( [ 1, 2, 3 ], [ 2, 3, 4 ] ),
		g_stats.ratioInterval( [ 1, 2, 3 ], [ 2, 3, 4 ] ) );
	g_assert.equal( g_stats.variability( [ 0, 0 ] ), null );
	g_assert.equal( g_stats.ratioInterval( [ 0 ], [ 1 ] ), null );
	g_assert.throws( () => g_stats.percentile( [], 0.5 ) );
} );

g_test.test( "seven rounds extend once without removing noisy observations", () => {
	const stable = Array.from( { "length": 7 }, () => ( { ...result(), "artifact": "a" } ) );
	g_assert.equal( g_stats.roundLimit( stable.slice( 0, 6 ), [ "a" ], false ), 7 );
	g_assert.equal( g_stats.roundLimit( stable, [ "a" ], false ), 7 );
	const noisy = [ 10, 20, 30, 40, 50, 60, 70 ].map( value => ( {
		...result( value ), "artifact": "a"
	} ) );
	g_assert.equal( g_stats.roundLimit( noisy, [ "a" ], false ), 14 );
	g_assert.equal( g_stats.roundLimit( noisy.concat( stable ), [ "a" ], false ), 14 );
	g_assert.equal( g_stats.roundLimit( noisy, [ "a" ], true ), 1 );
	g_assert.deepEqual( g_stats.campaignSummary( noisy, [ "a" ], true, true ).comparisons, [] );
	g_assert.deepEqual( g_stats.campaignSummary( noisy, [ "a" ], false, false ).comparisons, [] );
} );

g_test.test( "normal measurements reject hidden and software renderers", () => {
	const env = { "browserState": { "visibility": "visible", "renderer": "ANGLE RTX" } };
	g_assert.doesNotThrow( () => g_browser.validateEnvironment( env ) );
	env.browserState.renderer = "SwiftShader";
	g_assert.throws( () => g_browser.validateEnvironment( env ), /Hardware/ );
	g_assert.doesNotThrow( () => g_browser.validateEnvironment( env, true ) );
	env.browserState.visibility = "hidden";
	g_assert.throws( () => g_browser.validateEnvironment( env, true ), /hidden/ );
} );

g_test.test( "campaign failures and resume preserve completed results", async () => {
	const temp = g_fs.mkdtempSync( g_path.join( g_os.tmpdir(), "pi-benchmark-" ) );
	const out = g_path.join( temp, "campaign" );
	const config = g_run.parseArgs( [ `--source=a=${g_artifacts.ROOT}`,
		`--source=b=${g_artifacts.ROOT}`, "--cases=line", "--smoke", `--out=${out}` ] );
	const calls = [];
	let closed = 0;
	const hooks = {
		"launch": async () => ( { "close": async () => { closed++; } } ),
		"measure": async ( browser, url, artifact ) => {
			calls.push( artifact.label );
			if( artifact.label === "b" ) {
				const error = new Error( "Image img_4 failed to load" );
				error.interruption = { "stage": "initialization", "error": error.message };
				throw error;
			}
			return result();
		}
	};
	try {
		await g_assert.rejects( g_run.campaign( config, hooks ), /img_4/ );
		const read = () => JSON.parse( g_fs.readFileSync( g_path.join( out, "manifest.json" ) ) );
		const first = read();
		g_assert.equal( first.completed.length, 1 );
		g_assert.equal( first.interruptions[ 0 ].stage, "initialization" );
		g_assert.equal( first.complete, false );
		g_assert.equal( closed, 1 );
		g_assert.equal( g_fs.existsSync( g_path.join( out, "runs/1-b.json" ) ), false );
		const saved = g_fs.readFileSync( g_path.join( out, "runs/1-a.json" ) );
		hooks.measure = async ( browser, url, artifact ) => {
			calls.push( artifact.label );
			return result();
		};
		config.resume = true;
		await g_run.campaign( config, hooks );
		g_assert.deepEqual( calls, [ "a", "b", "b" ] );
		g_assert.deepEqual( g_fs.readFileSync( g_path.join( out, "runs/1-a.json" ) ), saved );
		g_assert.equal( read().complete, true );
		g_assert.equal( read().interruptions.length, 1 );
		const summary = JSON.parse( g_fs.readFileSync( g_path.join( out, "summary.json" ) ) );
		g_assert.equal( summary.smoke, true );
		g_assert.deepEqual( summary.comparisons, [] );

		// Resume must validate actual saved bytes and the selected workload, not just version labels.
		config.cases = [ "images" ];
		await g_assert.rejects( g_run.campaign( config, hooks ), /inputs changed/ );
		config.cases = [ "line" ];
		const prepared = await g_artifacts.prepare( config );
		const complete = read();
		const badOrder = structuredClone( complete );
		badOrder.completed.reverse();
		g_assert.throws( () => g_run.readCompleted( out, badOrder, prepared ), /execution order/ );
		g_fs.appendFileSync( g_path.join( out, "runs/1-a.json" ), " " );
		g_assert.throws( () => g_run.readCompleted( out, complete, prepared ), /Changed or missing/ );
		g_fs.writeFileSync( g_path.join( out, "runs/1-a.json" ), saved );
		g_fs.appendFileSync( g_path.join( out, "artifacts/polygons.js" ), "\n" );
		await g_assert.rejects( g_run.campaign( config, hooks ), /Changed or missing/ );
	} finally {
		g_assert.ok( g_path.resolve( temp ).startsWith( g_path.resolve( g_os.tmpdir() ) + g_path.sep ) );
		g_fs.rmSync( temp, { "recursive": true, "force": true } );
	}
} );

g_test.test( "result validation rejects partial samples, wrong seeds, and environment", () => {
	const run = { ...result(), "fingerprint": "id", "artifact": "a", "sha256": "hash" };
	const identity = {
		"artifacts": [ { "label": "a", "sha256": "hash" } ], "cases": [ "line" ]
	};
	const check = value => g_run.validateRun( value, identity, "id", run.environment );
	g_assert.doesNotThrow( () => check( run ) );
	g_assert.throws( () => check( { ...run, "environment": {} } ), /mismatch/ );
	g_assert.throws( () => check( { ...run, "seedProof": {} } ), /mismatch/ );
	run.tests[ 0 ].samples.pop();
	g_assert.throws( () => check( run ), /Invalid samples/ );
} );
