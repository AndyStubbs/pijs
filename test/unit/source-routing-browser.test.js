/** Verify minified requests receive actual minified code, including cached plugin routes. */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_playwright from "@playwright/test";
import * as g_harness from "./browser-source-harness.js";

g_test.test( "source routing keeps minified core and plugin cache entries distinct", async () => {
	const browser = await g_playwright.chromium.launch( { "headless": true } );
	try {
		const context = await g_harness.createSourceContext( browser );
		const page = await context.newPage();
		await page.goto( "http://localhost:8080/" );
		for( const [ url, entry ] of [ [ "pi", "src/index-full.js" ],
			[ "pi.lite", "src/index.js" ],
			[ "plugins/keyboard/keyboard", "plugins/keyboard/index.js" ] ] ) {
			const bodies = await page.evaluate( async prefix => {
				const load = async suffix => ( await fetch( `/build/${prefix}${suffix}.js` ) ).text();
				return [ await load( ".min" ), await load( "" ), await load( ".min" ) ];
			}, url );
			g_assert.equal( bodies[ 0 ], await g_harness.buildSource( entry, "iife", true ) );
			g_assert.equal( bodies[ 1 ], await g_harness.buildSource( entry ) );
			g_assert.equal( bodies[ 2 ], bodies[ 0 ] );
			g_assert.ok( bodies[ 0 ].length < bodies[ 1 ].length );
		}
	} finally { await browser.close(); }
} );
