/** Qualification targets, conservative gates, isolated input differences and resume identity. */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_run from "../performance/benchmark/run.js";
import * as g_artifacts from "../performance/benchmark/artifacts.js";
import * as g_target from "../performance/benchmark/target.js";
import * as g_readiness from "../performance/benchmark/readiness.js";
import * as g_inputs from "../performance/benchmark/qualification-inputs.js";
import * as g_qualify from "../performance/benchmark/qualify.js";
import * as g_diagnostics from "../performance/benchmark/diagnostics.js";

g_test.test( "target options preserve defaults and reject incompatible selections", () => {
	const defaults = g_run.parseArgs( [ "--source=current=." ] );
	g_assert.equal( defaults.browser, "chromium" );
	g_assert.equal( defaults.backend, "default" );
	g_assert.equal( defaults.build, "full" );
	g_assert.equal( defaults.minify, false );
	const selected = g_run.parseArgs( [ "--source=current=.", "--browser=firefox",
		"--build=lite", "--minify" ] );
	g_assert.equal( selected.build, "lite" );
	g_assert.equal( selected.minify, true );
	for( const flags of [ [ "--browser=webkit" ], [ "--backend=vulkan" ],
		[ "--build=other" ], [ "--browser=firefox", "--backend=opengl" ],
		[ "--browser=firefox", "--backend=d3d11" ] ] ) {
		g_assert.throws( () => g_run.parseArgs( [ "--source=current=.", ...flags ] ) );
	}
	g_assert.deepEqual( g_target.target( { "backend": "opengl" } ).options,
		{ "headless": false, "timeout": 30000, "args": [ "--use-angle=gl" ] } );
} );

g_test.test( "backend coverage requires distinct observed hardware", () => {
	g_assert.equal( g_target.additionalBackend( "ANGLE NVIDIA Direct3D11", "NVIDIA OpenGL" ), true );
	for( const renderer of [ "ANGLE NVIDIA D3D11", "unknown", null, "OpenGL SwiftShader" ] ) {
		g_assert.equal( g_target.additionalBackend( "ANGLE NVIDIA D3D11", renderer ), false );
	}
} );

g_test.test( "build selection and browser identity invalidate an existing campaign", async () => {
	const config = g_run.parseArgs( [ `--source=current=${g_artifacts.ROOT}`, "--cases=line" ] );
	const original = await g_artifacts.prepare( config );
	for( const changes of [ { "browser": "firefox" }, { "backend": "opengl" },
		{ "build": "lite" }, { "minify": true } ] ) {
		const changed = await g_artifacts.prepare( { ...config, ...changes } );
		g_assert.notEqual( changed.fingerprint, original.fingerprint );
		g_assert.throws( () => g_run.readCompleted( config.out,
			{ "fingerprint": original.fingerprint }, changed ), /inputs changed/ );
		if( changes.minify || changes.build ) {
			g_assert.notEqual( changed.identity.artifacts[ 0 ].sha256,
				original.identity.artifacts[ 0 ].sha256 );
			g_assert.ok( changed.files[ "artifacts/core-current.js" ].length <
				original.files[ "artifacts/core-current.js" ].length );
		}
	}
	g_assert.ok( "executable" in original.identity.target );
	g_assert.ok( "sha256" in original.identity.target );
} );

function summary() {
	return { "complete": true, "smoke": false, "comparisons":
		[ "images", "sprites", "line", "circle-filled" ].map( name => ( {
			name, "changePercent": -12, "change95": [ -20, -5 ], "stable": false
		} ) ) };
}

g_test.test( "primary benefits and regression gate do not use MAD as a veto", () => {
	const data = summary();
	g_assert.equal( g_readiness.assessPerformance( data, true ).status, "passed" );
	data.comparisons[ 0 ].changePercent = -8;
	g_assert.equal( g_readiness.assessPerformance( data, true ).status, "failed" );
	g_assert.equal( g_readiness.assessPerformance( data, false ).status, "passed" );
	data.comparisons.push( { "name": "text", "changePercent": 6,
		"change95": [ 1, 12 ], "stable": false } );
	g_assert.equal( g_readiness.assessPerformance( data, false ).status, "failed" );
	data.comparisons.at( -1 ).change95 = [ -1, 12 ];
	g_assert.equal( g_readiness.assessPerformance( data, false ).status, "passed" );
} );

g_test.test( "missing and smoke evidence never establish a performance pass", () => {
	for( const data of [ null, { ...summary(), "smoke": true },
		{ ...summary(), "complete": false }, { ...summary(), "comparisons": [] } ] ) {
		g_assert.equal( g_readiness.assessPerformance( data, true ).status, "inconclusive" );
	}
	const data = summary();
	data.comparisons[ 0 ].change95 = null;
	g_assert.equal( g_readiness.assessPerformance( data, true ).status, "inconclusive" );
	const passed = { "status": "passed" };
	g_assert.deepEqual( g_readiness.assessReadiness( [ passed ], passed,
		[ { "status": "pending" } ] ), { "local": "passed", "broad": "pending" } );
	g_assert.equal( g_readiness.assessReadiness( [ passed ], passed,
		[ { "status": "failed" } ] ).local, "failed" );
	g_assert.equal( g_readiness.assessReadiness( [ passed ], { "status": "pending" }, [] ).local,
		"inconclusive" );
	g_assert.equal( g_qualify.failure( new Error( "Executable doesn't exist" ) ).status, "pending" );
	g_assert.equal( g_qualify.failure( new Error( "Blank rendering" ) ).status, "failed" );
} );

g_test.test( "runtime source inventories disclose unrelated changes", () => {
	const before = [ { "file": "src/a.js", "sha256": "a" },
		{ "file": "docs/a.md", "sha256": "a" } ];
	const after = [ { "file": "src/a.js", "sha256": "b" },
		{ "file": "plugins/new/index.js", "sha256": "c" } ];
	g_assert.equal( g_inputs.sourceDifferences( before, after ).length, 2 );
	g_assert.throws( () => g_qualify.parseArgs( [ "--out=build/qualification" ] ) );
	g_assert.throws( () => g_qualify.parseArgs( [ "--out=test/performance/campaigns/../escape" ] ) );
	const out = g_path.join( g_artifacts.ROOT, "test/performance/campaigns/uncreated-check" );
	g_assert.equal( g_qualify.parseArgs( [ `--out=${out}` ] ).out, out );
} );

g_test.test( "Chromium-only diagnostics reject unsupported shared benchmark options", async () => {
	const config = g_run.parseArgs( [ "--source=current=.", "--cases=line" ] );
	for( const changes of [ { "browser": "firefox" }, { "backend": "opengl" },
		{ "build": "lite" }, { "minify": true } ] ) {
		await g_assert.rejects( g_diagnostics.experiment( { ...config, ...changes }, "execution" ),
			/Diagnostics require Chromium/ );
	}
} );

g_test.test( "nested candidate snapshot includes metadata and excludes campaigns", () => {
	const root = g_fs.mkdtempSync( g_path.join( g_os.tmpdir(), "pi-snapshot-" ) );
	try {
		g_fs.mkdirSync( g_path.join( root, "metadata" ) );
		g_fs.writeFileSync( g_path.join( root, "metadata/input.json" ), "{}" );
		g_fs.mkdirSync( g_path.join( root, "test/performance/campaigns/old" ), { "recursive": true } );
		g_fs.writeFileSync( g_path.join( root, "test/performance/campaigns/old/run.json" ), "{}" );
		g_fs.writeFileSync( g_path.join( root, "test/fixture.html" ), "<body>" );
		const out = g_path.join( root, "test/performance/campaigns/new/candidate" );
		const files = g_inputs.snapshot( root, out );
		g_assert.deepEqual( files.map( item => item.file ),
			[ "metadata/input.json", "test/fixture.html" ] );
		g_assert.equal( g_fs.existsSync( g_path.join( out, "test/performance/campaigns" ) ), false );
	} finally {
		g_assert.ok( root.startsWith( g_path.resolve( g_os.tmpdir() ) + g_path.sep ) );
		g_fs.rmSync( root, { "recursive": true, "force": true } );
	}
} );
