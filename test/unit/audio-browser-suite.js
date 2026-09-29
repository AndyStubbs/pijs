/**
 * Shared scaffolding for offline-render browser tests.
 *
 * describeAudioEngines() builds the in-memory full bundle, plus any plugin bundles the suite
 * asks for, once, then defines one describe block per engine from audio-engines.js. Engines
 * run in parallel; each engine's tests share one harness session and run in order. An engine
 * without Web Audio is skipped as a whole, and one without offline suspend() skips its
 * clock-driven group, so the report names each reason once per suite instead of once per test.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_audioEngines from "./audio-engines.js";
import * as g_harness from "./audio-render-harness.js";
import * as g_sourceHarness from "./browser-source-harness.js";
const { describe, test, before, after } = g_test;
const assert = g_assert;

// Read before any test is defined, since a skipped engine or group is decided at definition
const SUPPORT = await g_audioEngines.loadSupport();

const NO_WEB_AUDIO = "this engine build has no Web Audio API (Playwright WebKit on Windows)";
const NO_SUSPEND = "this engine has no OfflineAudioContext.suspend(), so clock-driven " +
	"renders are unsupported";

/** Scheduling lead in the harness: two render quanta at 48 kHz. */
const LEAD = 256 / g_harness.SAMPLE_RATE;

/** Stop fade and de-click floor from the sound plan, in seconds. */
const STOP_FADE = 0.01;
const MIN_RAMP = 0.003;

/**
 * Converts seconds to a frame index at the harness sample rate.
 *
 * @param {number} seconds - Time in seconds
 * @returns {number} Frame index
 */
function frame( seconds ) {
	return Math.round( seconds * g_harness.SAMPLE_RATE );
}

/**
 * Defines the per-engine test blocks.
 *
 * Tests that need clock-driven renders are defined with clockTest( name, fn ) instead of
 * test(); they run after the engine's other tests, in a "clock-driven renders" group that an
 * engine without offline suspend() skips.
 *
 * @param {string} title - Top-level describe title
 * @param {Function} defineTests - Called with
 * { engine, inHarness, clockTest, getSession, getBundle }
 * @param {Object} [suiteOptions] - { plugins }: plugin names whose source bundles every page
 * loads after the full bundle, in order
 * @returns {void}
 */
function describeAudioEngines( title, defineTests, suiteOptions = {} ) {
	let fullBundle;
	let pluginBundles = [];
	before( async () => {
		fullBundle = await g_harness.buildFullBundle();
		pluginBundles = await Promise.all( ( suiteOptions.plugins || [] ).map(
			name => g_sourceHarness.buildSource( `plugins/${name}/index.js` )
		) );
	} );

	describe( title, { "concurrency": true }, () => {
		for( const engine of g_audioEngines.AUDIO_ENGINES ) {
			let skipEngine = false;
			if( !SUPPORT[ engine ].webAudio ) {
				skipEngine = NO_WEB_AUDIO;
			}
			let skipClock = false;
			if( !SUPPORT[ engine ].offlineSuspend ) {
				skipClock = NO_SUSPEND;
			}
			describe( engine, { "concurrency": 1, "skip": skipEngine }, () => {
				let browser = null;
				let session = null;
				const clockTests = [];

				before( async () => {
					browser = await g_audioEngines.launchEngine( engine );
					session = await g_harness.createHarnessSession( browser );
				} );

				after( async () => {
					await browser?.close();
				} );

				/**
				 * Runs a page function in a fresh harness document.
				 *
				 * @param {Object} options - { config }
				 * @param {Function} fn - Page function
				 * @param {*} [arg] - Page function argument
				 * @returns {Promise<*>} Page result
				 */
				async function inHarness( options, fn, arg ) {
					const harness = await session.open( {
						"scripts": [ fullBundle ].concat( pluginBundles ),
						"config": options.config
					} );
					const result = await harness.page.evaluate( fn, arg );
					assert.deepEqual( harness.errors, [] );
					return result;
				}

				/**
				 * Defines a test that needs clock-driven renders, in the engine's
				 * "clock-driven renders" group.
				 *
				 * @param {string} name - Test name
				 * @param {Function} fn - Test function
				 * @returns {void}
				 */
				function clockTest( name, fn ) {
					clockTests.push( [ name, fn ] );
				}

				defineTests( {
					"engine": engine,
					"inHarness": inHarness,
					"clockTest": clockTest,
					"getSession": () => session,
					"getBundle": () => fullBundle
				} );
				if( clockTests.length > 0 ) {
					describe( "clock-driven renders", {
						"concurrency": 1, "skip": skipClock
					}, () => {
						for( const [ name, fn ] of clockTests ) {
							test( name, fn );
						}
					} );
				}
			} );
		}
	} );
}

export { LEAD, MIN_RAMP, NO_SUSPEND, NO_WEB_AUDIO, STOP_FADE, describeAudioEngines, frame };
