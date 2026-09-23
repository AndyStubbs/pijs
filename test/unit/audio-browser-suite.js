/**
 * Shared scaffolding for offline-render browser tests.
 *
 * describeAudioEngines() builds the in-memory full bundle once, then defines one describe
 * block per engine from audio-engines.js. Engines run in parallel; each engine's tests share
 * one harness session and run in order. Engines without Web Audio or offline suspend() skip
 * the tests that need them, with the reason reported.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_audioEngines from "./audio-engines.js";
import * as g_harness from "./audio-render-harness.js";
const { describe, before, after } = g_test;
const assert = g_assert;

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
 * @param {string} title - Top-level describe title
 * @param {Function} defineTests - Called with { engine, inHarness, getSession, getBundle }
 * @returns {void}
 */
function describeAudioEngines( title, defineTests ) {
	let fullBundle;
	before( async () => {
		fullBundle = await g_harness.buildFullBundle();
	} );

	describe( title, { "concurrency": true }, () => {
		for( const engine of g_audioEngines.AUDIO_ENGINES ) {
			describe( engine, { "concurrency": 1 }, () => {
				let browser = null;
				let session = null;
				let support = null;

				before( async () => {
					browser = await g_audioEngines.launchEngine( engine );
					session = await g_harness.createHarnessSession( browser );
					support = await session.getSupport();
				} );

				after( async () => {
					await browser?.close();
				} );

				/**
				 * Runs a page function in a fresh harness document, or skips the test when
				 * the engine lacks what it needs.
				 *
				 * @param {Object} t - node:test context, used to skip unsupported engines
				 * @param {Object} options - { config, needsWebAudio, needsSuspend }
				 * @param {Function} fn - Page function
				 * @param {*} [arg] - Page function argument
				 * @returns {Promise<*>} Page result, or null when skipped
				 */
				async function inHarness( t, options, fn, arg ) {
					if( options.needsWebAudio !== false && !support.webAudio ) {
						t.skip( NO_WEB_AUDIO );
						return null;
					}
					if( options.needsSuspend && !support.offlineSuspend ) {
						t.skip( NO_SUSPEND );
						return null;
					}
					const harness = await session.open( {
						"scripts": [ fullBundle ],
						"config": options.config
					} );
					const result = await harness.page.evaluate( fn, arg );
					assert.deepEqual( harness.errors, [] );
					return result;
				}

				defineTests( {
					"engine": engine,
					"inHarness": inHarness,
					"getSession": () => session,
					"getBundle": () => fullBundle
				} );
			} );
		}
	} );
}

export { LEAD, MIN_RAMP, NO_SUSPEND, NO_WEB_AUDIO, STOP_FADE, describeAudioEngines, frame };
