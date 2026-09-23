/**
 * Browser engines and reusable pages for the audio browser tests.
 *
 * Audio tests run in Chromium, Firefox, and WebKit from one command. Set PI_AUDIO_ENGINES to a
 * comma-separated subset, such as "chromium,firefox", to run fewer engines while iterating.
 */
import * as g_playwright from "@playwright/test";

const ALL_ENGINES = [ "chromium", "firefox", "webkit" ];
const INSTALL_HINT = "Install the audio test engines with: npx playwright install firefox webkit";

/**
 * Origin of the blank documents that reusable pages navigate to. Localhost is a secure
 * context, which AudioWorklet requires; the route fulfills every request, so nothing is sent
 * to the network.
 */
const BLANK_ORIGIN = "http://localhost:47109";

/**
 * Parses an engine list from PI_AUDIO_ENGINES.
 *
 * @param {string|undefined} value - Comma-separated engine names, or undefined for all
 * @returns {string[]} Engine names in canonical order
 */
function parseEngines( value ) {
	if( value === undefined || value.trim() === "" ) {
		return [ ...ALL_ENGINES ];
	}
	const requested = value.split( "," ).map( name => name.trim().toLowerCase() );
	for( const name of requested ) {
		if( !ALL_ENGINES.includes( name ) ) {
			throw new Error(
				`PI_AUDIO_ENGINES: unknown engine "${name}"; use ${ALL_ENGINES.join( ", " )}.`
			);
		}
	}
	return ALL_ENGINES.filter( name => requested.includes( name ) );
}

const AUDIO_ENGINES = parseEngines( process.env.PI_AUDIO_ENGINES );

/**
 * Launch options that let a realtime AudioContext and media elements play without a user
 * gesture, for the realtime stream-mode test.
 */
const REALTIME_OPTIONS = {
	"chromium": { "args": [ "--autoplay-policy=no-user-gesture-required" ] },
	"firefox": {
		"firefoxUserPrefs": {
			"media.autoplay.default": 0,
			"media.autoplay.block-webaudio": false,
			"media.autoplay.blocking_policy": 0
		}
	},
	"webkit": {}
};

/**
 * Launches a headless browser for an engine, explaining how to install a missing one.
 *
 * @param {string} name - "chromium", "firefox", or "webkit"
 * @param {Object} [options] - { realtimeAudio: true } allows playback without a gesture
 * @returns {Promise<Object>} Playwright browser
 */
async function launchEngine( name, options = {} ) {
	let launchOptions = { "headless": true };
	if( options.realtimeAudio ) {
		launchOptions = { ...launchOptions, ...REALTIME_OPTIONS[ name ] };
	}
	try {
		return await g_playwright[ name ].launch( launchOptions );
	} catch( error ) {
		if( /Executable doesn't exist|install/i.test( error.message ) ) {
			throw new Error( `${name} is not installed. ${INSTALL_HINT}`, { "cause": error } );
		}
		throw error;
	}
}

/**
 * Creates one page that tests reuse by navigating it to a fresh blank document.
 *
 * Every load() is a real navigation, so the previous document's globals and scripts are gone
 * and init scripts run again. That is much cheaper than a new page, especially in Firefox.
 *
 * @param {Object} browser - Playwright browser
 * @param {string} [initScript] - Script source run at the start of every document
 * @returns {Promise<Object>} { page, errors, load( query ), close() }
 */
async function createReusablePage( browser, initScript ) {
	const page = await browser.newPage();
	const errors = [];
	let loads = 0;
	page.on( "pageerror", error => errors.push( error.message ) );
	if( initScript ) {
		await page.addInitScript( initScript );
	}
	await page.route( `${BLANK_ORIGIN}/**`, route => route.fulfill( {
		"contentType": "text/html",
		"body": "<!doctype html><html><body></body></html>"
	} ) );
	return {
		"page": page,
		"errors": errors,

		/**
		 * Navigates to a new blank document and clears the collected page errors.
		 *
		 * @param {Object} [query] - Search parameters visible to init scripts
		 * @returns {Promise<Object>} The page
		 */
		"load": async ( query = {} ) => {
			errors.length = 0;
			loads++;
			const params = new URLSearchParams( { ...query, "load": String( loads ) } );
			await page.goto( `${BLANK_ORIGIN}/?${params}` );
			return page;
		},
		"close": () => page.close()
	};
}

export { ALL_ENGINES, AUDIO_ENGINES, createReusablePage, launchEngine, parseEngines };
