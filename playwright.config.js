/**
 * Playwright Test Configuration
 * 
 * Configuration for Pi.js visual regression testing
 */

const { defineConfig, devices } = require( "@playwright/test" );

module.exports = defineConfig( {
	"testDir": "./test",
	"testMatch": "run-visual-tests.js",
	"fullyParallel": true,
	"forbidOnly": !!process.env.CI,
	"retries": process.env.CI ? 2 : 0,
	"workers": process.env.CI ? 1 : undefined,
	"globalSetup": require.resolve( "./test/global-setup.js" ),
	"reporter": [
		[ require.resolve( "./test/minimal-reporter.js" ) ],
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

