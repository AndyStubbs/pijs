/** Diagnostic scheduling, capture persistence, attribution, and isolation checks. */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_os from "node:os";
import * as g_vm from "node:vm";
import * as g_diagnostics from "../performance/benchmark/diagnostics.js";
import * as g_artifacts from "../performance/benchmark/artifacts.js";
import * as g_run from "../performance/benchmark/run.js";

g_test.test( "diagnostics counterbalance settings and sources for seven rounds", () => {
	const entries = g_diagnostics.schedule( [ "a", "b" ] );
	g_assert.equal( entries.length, 28 );
	g_assert.deepEqual( entries.slice( 0, 2 ).map( x => x.label ), [ "a", "b" ] );
	g_assert.deepEqual( entries.slice( 4, 6 ).map( x => x.label ), [ "b", "a" ] );
	g_assert.equal( entries[ 0 ].warmupFrames, 16 );
	g_assert.equal( entries[ 4 ].warmupFrames, 120 );
} );

g_test.test( "isolated instrumentation records resize and forced flush phases", () => {
	const events = [];
	const source = `function resizeBatch(batch, newCapacity) {}
		let requiredCount = 3; let batch = { maxCapacity: 2, capacity: 1, type: 0 };
		let screenData = {}; function flushBatches() {}
		resizeBatch(batch, 4);
		if (requiredCount > batch.maxCapacity) {
      flushBatches(screenData);
		}`;
	g_vm.runInNewContext( g_diagnostics.instrument( Buffer.from( source ) ), {
		"piBenchmarkEvent": ( event, details ) => events.push( { event, details } )
	} );
	g_assert.deepEqual( events.map( item => item.event ), [ "resize", "forcedFlush" ] );
	g_assert.equal( events[ 0 ].details.newCapacity, 4 );
	g_assert.throws( () => g_diagnostics.instrument( Buffer.from( "different source" ) ), /site/ );
} );

g_test.test( "CDP capture retains trace, CPU profile, phase events and detaches", async () => {
	const saved = {};
	const calls = [];
	const handlers = {};
	const session = {
		"once": ( name, callback ) => { handlers[ name ] = callback; },
		"send": async name => {
			calls.push( name );
			if( name === "Tracing.end" ) {
				handlers[ "Tracing.tracingComplete" ]( { "stream": "trace" } );
			}
			if( name === "IO.read" ) {
				return { "data": "{\"traceEvents\":[]}", "eof": true };
			}
			return { "profile": {} };
		},
		"detach": async () => { calls.push( "detach" ); }
	};
	const context = { "newCDPSession": async () => session };
	const page = { "addInitScript": async () => {},
		"evaluate": async () => [ { "phase": "measurement", "event": "forcedFlush" } ] };
	const stop = await g_diagnostics.capture( context, page, "execution",
		( name, data ) => { saved[ name ] = data; } );
	await stop();
	g_assert.deepEqual( saved[ "trace.json" ], { "traceEvents": [] } );
	g_assert.equal( saved[ "events.json" ][ 0 ].phase, "measurement" );
	g_assert.ok( saved[ "cpu.json" ] );
	g_assert.equal( calls.at( -1 ), "detach" );
	const stopHeap = await g_diagnostics.capture( context, page, "allocation",
		( name, data ) => { saved[ name ] = data; } );
	await stopHeap();
	g_assert.ok( saved[ "heap.json" ] );
} );

g_test.test( "diagnostic interruptions retain evidence and cannot qualify", async () => {
	const temp = g_fs.mkdtempSync( g_path.join( g_os.tmpdir(), "pi-diagnostic-" ) );
	const config = g_run.parseArgs( [ `--source=a=${g_artifacts.ROOT}`, "--cases=line",
		`--out=${g_path.join( temp, "experiment" )}` ] );
	try {
		await g_assert.rejects( g_diagnostics.experiment( config, "representative", {
			"launch": async () => ( { "close": async () => {} } ),
			"measure": async () => {
				const error = new Error( "asset failure" );
				error.interruption = { "stage": "initialization" };
				throw error;
			}
		} ), /asset failure/ );
		const manifest = JSON.parse( g_fs.readFileSync( g_path.join( config.out, "manifest.json" ) ) );
		g_assert.equal( manifest.qualificationEligible, false );
		g_assert.equal( manifest.complete, false );
		g_assert.equal( manifest.interruptions[ 0 ].stage, "initialization" );
		g_artifacts.verifyFiles( config.out, manifest.identity.files );
		g_assert.throws( () => g_run.validateRun( {}, manifest.identity, "", {} ), /Diagnostic/ );
	} finally {
		g_assert.ok( g_path.resolve( temp ).startsWith( g_path.resolve( g_os.tmpdir() ) + g_path.sep ) );
		g_fs.rmSync( temp, { "recursive": true, "force": true } );
	}
} );
