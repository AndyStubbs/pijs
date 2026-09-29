/**
 * The shared Firefox server for the audio browser suites (Sound 11.1): suites connect to one
 * server per test stage instead of launching Firefox each, a suite's close() leaves the server
 * for the next suite, and the server closes with the stage.
 * Run with node --test test/unit/audio-engines-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_playwright from "@playwright/test";
import * as g_audioEngines from "./audio-engines.js";
const { test } = g_test;
const assert = g_assert;

test( "audio suites share one Firefox server per stage", {
	"skip": !g_audioEngines.AUDIO_ENGINES.includes( "firefox" ) &&
		"PI_AUDIO_ENGINES does not include firefox"
}, async () => {
	const previous = process.env[ g_audioEngines.SHARED_FIREFOX ];
	let endpoint = "";
	try {
		await g_audioEngines.withSharedFirefox( async env => {
			endpoint = env[ g_audioEngines.SHARED_FIREFOX ];
			assert.match( endpoint, /^ws:\/\// );
			process.env[ g_audioEngines.SHARED_FIREFOX ] = endpoint;

			// Two suites in turn: each connects, runs a page, and closes its connection
			for( let suite = 0; suite < 2; suite++ ) {
				const browser = await g_audioEngines.launchEngine( "firefox" );
				const page = await browser.newPage();
				assert.equal( await page.evaluate( () => typeof OfflineAudioContext ), "function" );
				await browser.close();
			}
		} );
	} finally {
		if( previous === undefined ) {
			delete process.env[ g_audioEngines.SHARED_FIREFOX ];
		} else {
			process.env[ g_audioEngines.SHARED_FIREFOX ] = previous;
		}
	}

	// The stage's end closes the server
	await assert.rejects( g_playwright.firefox.connect( endpoint, { "timeout": 5000 } ) );
} );
