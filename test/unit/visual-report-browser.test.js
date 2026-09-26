/** Exercise mode-specific review links and approval requests without changing baselines. */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_chromiumLaunch from "./chromium-launch.js";
import * as g_report from "../scripts/results-page-generator.js";

let m_browser;
const IMAGE = g_fs.readFileSync( new URL(
	"../tests/screenshots/colors_comprehensive.png", import.meta.url
) );

g_test.before( async () => { m_browser = await g_chromiumLaunch.launchChromium(); } );
g_test.after( async () => { await m_browser?.close(); } );

for( const mode of [ "full", "lite", "plugins" ] ) {
	g_test.test( `${mode}: comparison and approval requests use the selected mode`, async () => {
		const record = {
			"name": "Fixture", "file": "fixture.html", "screenshotName": "fixture",
			"url": "/fixture.html", "status": "passed"
		};
		const html = g_report.generateResultsPage( {
			"total": 2, "passed": 1, "failed": 0, "skipped": 1,
			"tests": [ record, { ...record, "status": "skipped",
				"error": "No reference screenshot" } ]
		}, mode );
		const page = await m_browser.newPage();
		page.setDefaultTimeout( 5000 );
		const errors = [];
		page.on( "pageerror", error => errors.push( error.message ) );
		page.on( "dialog", dialog => dialog.accept() );
		await page.route( "http://review.test/**", async route => {
			const path = new URL( route.request().url() ).pathname;
			if( path.startsWith( "/api/" ) ) {
				await route.fulfill( { "json": { "success": false, "error": "Test interception" } } );
			} else if( path.endsWith( ".png" ) ) {
				await route.fulfill( { "contentType": "image/png", "body": IMAGE } );
			} else {
				await route.fulfill( { "contentType": "text/html", "body": html } );
			}
		} );
		try {
			await page.goto( "http://review.test/results.html" );
			await page.locator( ".section-header" ).filter( { "hasText": "Passed Tests" } ).click();
			await page.locator( ".test-item.passed .view-diff-btn" ).click();
			const reset = page.waitForRequest( "**/api/reset-base-image" );
			await page.locator( "#resetBaseBtn" ).click();
			g_assert.equal( ( await reset ).postDataJSON().mode, mode );

			// The rejected request ends with an alert, and a key pressed while it is open is
			// lost. Close the modal once the button is re-enabled after the alert, and wait for
			// it to hide, so it cannot cover the next click.
			await page.locator( "#resetBaseBtn:enabled" ).waitFor();
			await page.keyboard.press( "Escape" );
			await page.locator( "#diffModal" ).waitFor( { "state": "hidden" } );
			await page.locator( ".section-header" ).filter( { "hasText": "Skipped Tests" } ).click();
			await page.locator( ".test-item.skipped .view-diff-btn" ).click();
			const approve = page.waitForRequest( "**/api/approve-new-test" );
			await page.locator( "#approveTestBtn" ).click();
			g_assert.equal( ( await approve ).postDataJSON().mode, mode );
			g_assert.deepEqual( errors, [] );
			g_assert.equal( await page.getByText( "Playwright Report" ).getAttribute( "href" ),
				`/test/playwright-report/${mode}/` );
		} finally {
			await page.close();
		}
	} );
}
