/**
 * The audio engines a test stage prepares once for every suite: a shared Firefox server that
 * suites connect to instead of launching Firefox each, and a probe of each engine's Web Audio
 * support that suites read to skip an engine, or its clock-driven group, as a whole.
 * Run with node --test test/unit/audio-engines-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_childProcess from "node:child_process";
import * as g_fs from "node:fs";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_playwright from "@playwright/test";
import * as g_audioEngines from "./audio-engines.js";
import * as g_suite from "./audio-browser-suite.js";
const { test } = g_test;
const assert = g_assert;

const SUITE_URL = g_url.pathToFileURL(
	g_path.join( import.meta.dirname, "audio-browser-suite.js" )
).href;

/**
 * Runs the variables in env on process.env for the length of fn, then restores them.
 *
 * @param {Object} env - Variable names and values
 * @param {Function} fn - Async function to run
 * @returns {Promise<*>} What fn returns
 */
async function withEnv( env, fn ) {
	const previous = {};
	for( const name of Object.keys( env ) ) {
		previous[ name ] = process.env[ name ];
		process.env[ name ] = env[ name ];
	}
	try {
		return await fn();
	} finally {
		for( const name of Object.keys( env ) ) {
			if( previous[ name ] === undefined ) {
				delete process.env[ name ];
			} else {
				process.env[ name ] = previous[ name ];
			}
		}
	}
}

/**
 * Runs a describeAudioEngines() suite in a child node --test process with the given support,
 * so only Chromium, the engine the support lets run, launches.
 *
 * @param {Object} chromium - Chromium's { webAudio, offlineSuspend }
 * @returns {Promise<string>} The TAP report
 */
async function runFixtureSuite( chromium ) {
	const dir = g_fs.mkdtempSync( g_path.join( g_os.tmpdir(), "pi-audio-suite-" ) );
	const fixture = g_path.join( dir, "fixture.test.mjs" );
	g_fs.writeFileSync( fixture, [
		"import * as g_test from \"node:test\";",
		`import * as g_suite from "${SUITE_URL}";`,
		"g_suite.describeAudioEngines( \"fixture\", suite => {",
		"\tg_test.test( \"plain\", () => {} );",
		"\tsuite.clockTest( \"clock\", () => {} );",
		"} );",
		""
	].join( "\n" ) );
	const none = { "webAudio": false, "offlineSuspend": false };
	const env = {
		...process.env,
		"PI_AUDIO_ENGINES": "chromium,firefox,webkit",
		[ g_audioEngines.ENGINE_SUPPORT ]: JSON.stringify( {
			"chromium": chromium, "firefox": none, "webkit": none
		} )
	};

	// Under node --test, this variable would make the child report to this runner, not in TAP
	delete env.NODE_TEST_CONTEXT;
	try {
		return await new Promise( ( resolve, reject ) => {
			g_childProcess.execFile( process.execPath, [
				"--test", "--test-reporter=tap", fixture
			], { "env": env }, ( error, stdout ) => {
				if( error ) {
					reject( new Error( stdout, { "cause": error } ) );
					return;
				}
				resolve( stdout );
			} );
		} );
	} finally {
		g_fs.rmSync( dir, { "recursive": true, "force": true } );
	}
}

test( "audio suites share one Firefox server per stage", {
	"skip": !g_audioEngines.AUDIO_ENGINES.includes( "firefox" ) &&
		"PI_AUDIO_ENGINES does not include firefox"
}, async () => {
	let endpoint = "";
	await g_audioEngines.withAudioEngines( async env => {
		endpoint = env[ g_audioEngines.SHARED_FIREFOX ];
		assert.match( endpoint, /^ws:\/\// );
		await withEnv( { [ g_audioEngines.SHARED_FIREFOX ]: endpoint }, async () => {

			// Two suites in turn: each connects, runs a page, and closes its connection
			for( let suite = 0; suite < 2; suite++ ) {
				const browser = await g_audioEngines.launchEngine( "firefox" );
				const page = await browser.newPage();
				assert.equal(
					await page.evaluate( () => typeof OfflineAudioContext ), "function"
				);
				await browser.close();
			}
		} );
	} );

	// The stage's end closes the server
	await assert.rejects( g_playwright.firefox.connect( endpoint, { "timeout": 5000 } ) );
} );

test( "the stage probes each engine's Web Audio support once for its suites", async () => {
	await g_audioEngines.withAudioEngines( async env => {
		const support = JSON.parse( env[ g_audioEngines.ENGINE_SUPPORT ] );
		assert.deepEqual( Object.keys( support ), g_audioEngines.AUDIO_ENGINES );
		for( const flags of Object.values( support ) ) {
			assert.deepEqual( Object.keys( flags ), [ "webAudio", "offlineSuspend" ] );
			assert.ok( flags.webAudio || !flags.offlineSuspend );
		}
		if( support.chromium ) {
			assert.deepEqual( support.chromium, { "webAudio": true, "offlineSuspend": true } );
		}
	} );

	// A suite reads the stage's probe instead of probing; one that misses an engine is probed
	const stage = {};
	for( const name of g_audioEngines.AUDIO_ENGINES ) {
		stage[ name ] = { "webAudio": true, "offlineSuspend": false };
	}
	await withEnv( { [ g_audioEngines.ENGINE_SUPPORT ]: JSON.stringify( stage ) }, async () => {
		assert.deepEqual( await g_audioEngines.loadSupport(), stage );
	} );
	await withEnv( { [ g_audioEngines.ENGINE_SUPPORT ]: "{}" }, async () => {
		const probed = await g_audioEngines.loadSupport();
		assert.deepEqual( Object.keys( probed ), g_audioEngines.AUDIO_ENGINES );
	} );
} );

test( "suites skip an engine without Web Audio and a clock group without suspend() once each",
	async () => {
		const skips = report => report.split( "\n" ).filter( line => line.includes( "# SKIP" ) )
			.map( line => line.trim() );
		const noWebAudio = [
			`ok 2 - firefox # SKIP ${g_suite.NO_WEB_AUDIO}`,
			`ok 3 - webkit # SKIP ${g_suite.NO_WEB_AUDIO}`
		];

		// Without suspend(), the clock-driven group is one skipped entry and its test never runs
		const withoutSuspend = await runFixtureSuite( {
			"webAudio": true, "offlineSuspend": false
		} );
		assert.deepEqual( skips( withoutSuspend ), [
			`ok 2 - clock-driven renders # SKIP ${g_suite.NO_SUSPEND}`
		].concat( noWebAudio ) );
		assert.match( withoutSuspend, /^# pass 1$/m );
		assert.match( withoutSuspend, /^# skipped 0$/m );
		assert.doesNotMatch( withoutSuspend, / - clock$/m );

		// With suspend(), the group runs its test after the engine's other tests
		const withSuspend = await runFixtureSuite( { "webAudio": true, "offlineSuspend": true } );
		assert.deepEqual( skips( withSuspend ), noWebAudio );
		assert.match( withSuspend, /^# pass 2$/m );
		assert.match( withSuspend, /ok 1 - plain[\s\S]*ok 1 - clock\n[\s\S]*ok 2 - clock-driven/ );
	}
);
