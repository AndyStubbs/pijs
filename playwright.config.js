/**
 * Playwright Test Configuration
 *
 * Configuration for Pi.js visual regression testing
 */
import * as g_playwright from "@playwright/test";
import * as g_path from "node:path";
import * as g_url from "node:url";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const { defineConfig, devices } = g_playwright;

let retries = 0;
let workers;
if( process.env.CI ) {
	retries = 2;
	workers = 1;
}

export default defineConfig( {
	"testDir": "./test",
	"testMatch": "scripts/run-visual-tests.js",
	"fullyParallel": true,
	"forbidOnly": !!process.env.CI,
	"retries": retries,
	"workers": workers,
	"globalSetup": g_path.join( DIRNAME, "test/scripts/global-setup.js" ),
	"reporter": [
		[ g_path.join( DIRNAME, "test/scripts/minimal-reporter.js" ) ],
		[ "html", { "outputFolder": "test/playwright-report", "open": "never" } ]
	],
	"outputDir": "test/test-results",
	"timeout": 60000,
	"use": {
		"baseURL": "http://localhost:8080",
		"trace": "on-first-retry",
		"screenshot": "only-on-failure",
		"navigationTimeout": 30000,
		"actionTimeout": 10000
	},
	"projects": [
		{
			"name": "chromium",
			"use": { ...devices[ "Desktop Chrome" ] }
		}
	]
} );
