/**
 * The first sound of a page, requested in the click handler that creates the audio context,
 * plays in every engine with Web Audio, with the browser requiring a user gesture for audio.
 * Firefox creates that context suspended until it resumes on its own, so the plugin treats the
 * click as the unlocking gesture. A sound requested with no gesture is still dropped. The checks
 * count the oscillators that start, so they need no audio output device.
 *
 * Each page runs its own scripts as it loads. Playwright's page.evaluate() carries user
 * activation, so a sound requested from it would not be requested without a gesture.
 * Run with node --test test/unit/audio-unlock-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_playwright from "@playwright/test";
import * as g_audioEngines from "./audio-engines.js";
import * as g_chromiumLaunch from "./chromium-launch.js";
import * as g_sourceHarness from "./browser-source-harness.js";
const { test, before } = g_test;
const assert = g_assert;

const NO_WEB_AUDIO = "this engine build has no Web Audio API (Playwright WebKit on Windows)";

// Pages come from this origin; the route fulfills every request, so nothing reaches the network
const ORIGIN = "http://localhost:47111";

// Read before any test is defined, since a skipped engine is decided at definition
const SUPPORT = await g_audioEngines.loadSupport();

/** Launch options under which audio needs a user gesture, per engine. */
const GESTURE_REQUIRED = {
	"chromium": g_chromiumLaunch.chromiumLaunchOptions( {
		"headless": true, "args": [ "--autoplay-policy=user-gesture-required" ]
	} ),
	"firefox": {
		"headless": true,
		"firefoxUserPrefs": { "media.autoplay.default": 1, "media.autoplay.block-webaudio": true }
	},
	"webkit": { "headless": true }
};

const CLICK_SCRIPT = "document.getElementById( \"play\" ).addEventListener( \"click\", () => {" +
	" audioProbe.soundId = $.sound( 440, 0.2 ); } );";

let bundle = "";
before( async () => {
	bundle = await g_sourceHarness.buildSource( "src/index-full.js" );
} );

/**
 * Counts the oscillators of realtime audio contexts that start, and records each context's
 * state when it is created.
 *
 * @returns {void}
 */
function installProbe() {
	window.audioProbe = { "starts": 0, "createdStates": [] };
	const Native = window.AudioContext;
	window.AudioContext = class extends Native {
		constructor( ...args ) {
			super( ...args );
			window.audioProbe.createdStates.push( this.state );
		}
	};
	const start = OscillatorNode.prototype.start;
	OscillatorNode.prototype.start = function( ...args ) {
		if( !( this.context instanceof OfflineAudioContext ) ) {
			window.audioProbe.starts += 1;
		}
		return start.apply( this, args );
	};
}

/**
 * Opens a page with a Play button that loads the probe, the Full bundle, and a script of its
 * own, in that order.
 *
 * @param {Object} browser - Playwright browser
 * @param {string} script - The page's script, run as it loads
 * @returns {Promise<Object>} The page
 */
async function openPage( browser, script ) {
	const page = await browser.newPage();
	const html = "<!doctype html><html><body><button id=\"play\">Play</button>" +
		`<script>( ${installProbe.toString()} )();</script>` +
		"<script src=\"pi.js\"></script>" +
		`<script>${script}</script></body></html>`;
	await page.route( `${ORIGIN}/**`, route => {
		if( route.request().url().endsWith( "/pi.js" ) ) {
			return route.fulfill( { "contentType": "text/javascript", "body": bundle } );
		}
		return route.fulfill( { "contentType": "text/html", "body": html } );
	} );
	await page.goto( `${ORIGIN}/` );
	return page;
}

for( const engine of g_audioEngines.AUDIO_ENGINES ) {
	let skip = false;
	if( !SUPPORT[ engine ].webAudio ) {
		skip = NO_WEB_AUDIO;
	}

	test( `${engine}: the click that creates the audio context plays its sound`, {
		"skip": skip
	}, async () => {
		const browser = await g_playwright[ engine ].launch( GESTURE_REQUIRED[ engine ] );
		try {
			const page = await openPage( browser, CLICK_SCRIPT );

			// A real click, so the browser grants the page user activation
			const box = await page.locator( "#play" ).boundingBox();
			await page.mouse.click( box.x + box.width / 2, box.y + box.height / 2 );
			await page.waitForTimeout( 300 );
			const probe = await page.evaluate( () => window.audioProbe );
			assert.equal( probe.createdStates.length, 1, "the click created the context" );
			assert.match( probe.soundId, /^sound_\d+$/ );
			assert.equal( probe.starts, 1, `created ${probe.createdStates[ 0 ]}; no start` );
		} finally {
			await browser.close();
		}
	} );

	test( `${engine}: a sound requested with no gesture is still dropped`, {
		"skip": skip
	}, async t => {
		const browser = await g_playwright[ engine ].launch( GESTURE_REQUIRED[ engine ] );
		try {
			const page = await openPage( browser, "audioProbe.soundId = $.sound( 440, 0.2 );" );
			await page.waitForTimeout( 300 );
			const probe = await page.evaluate( () => window.audioProbe );
			assert.match( probe.soundId, /^sound_\d+$/ );
			assert.equal( probe.createdStates.length, 1 );

			// Headless Chromium lets audio start without a gesture, so its context starts
			// running and the sound plays; where the context starts suspended, it is dropped
			if( probe.createdStates[ 0 ] === "running" ) {
				t.diagnostic( `${engine} allows audio without a gesture here` );
				assert.equal( probe.starts, 1 );
			} else {
				assert.equal( probe.starts, 0 );
			}
		} finally {
			await browser.close();
		}
	} );
}
