/**
 * Playwright Test Configuration
 *
 * Configuration for Pi.js visual regression testing
 */
import * as g_playwright from "@playwright/test";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_chromiumLaunch from "./test/unit/chromium-launch.js";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const { defineConfig, devices } = g_playwright;
const MODE = process.env.PI_TEST_MODE || "full";
if( ![ "full", "lite", "plugins" ].includes( MODE ) ) {
	throw new Error( "Invalid PI_TEST_MODE" );
}

// PI_VISUAL_PIXELS=report records pixel mismatches without failing (run-visual-tests.js)
if( ![ undefined, "", "fail", "report" ].includes( process.env.PI_VISUAL_PIXELS ) ) {
	throw new Error( "Invalid PI_VISUAL_PIXELS; use fail or report" );
}

// CI retries a failure once, so a flaky fixture is identified with a trace, and then fails the
// run on it (failOnFlakyTests) instead of hiding it. Workers keep Playwright's default.
let retries = 0;
if( process.env.CI ) {
	retries = 1;
}

export default defineConfig( {
	"testDir": "./test/scripts",
	"testMatch": "run-visual-tests.js",
	"fullyParallel": true,
	"forbidOnly": !!process.env.CI,
	"retries": retries,
	"failOnFlakyTests": !!process.env.CI,
	"globalSetup": g_path.join( DIRNAME, "test/scripts/global-setup.js" ),
	"reporter": [
		[ g_path.join( DIRNAME, "test/scripts/minimal-reporter.js" ) ],
		[ "html", { "outputFolder": `test/playwright-report/${MODE}`, "open": "never" } ]
	],
	"outputDir": `test/test-results/${MODE}/traces`,
	"timeout": 60000,
	"use": {
		"baseURL": process.env.PI_TEST_BASE_URL,
		"trace": "on-first-retry",
		"screenshot": "only-on-failure",
		"navigationTimeout": 30000,
		"actionTimeout": 10000
	},
	"projects": [
		{
			"name": "chromium",
			"use": {
				...devices[ "Desktop Chrome" ],
				"launchOptions": { "args": [ ...g_chromiumLaunch.CHROMIUM_ARGS ] }
			}
		}
	]
} );
