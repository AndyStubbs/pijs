/**
 * Chromium launch settings shared by the browser tests and the visual suite.
 *
 * Headless Chromium renders WebGL with SwiftShader on every platform the tests run on, and the
 * approved visual baselines are SwiftShader renders. These flags make that choice explicit
 * instead of relying on Chromium's automatic fallback, which Chromium is removing:
 * `--disable-gpu` keeps a machine's GPU out of the path, and `--enable-unsafe-swiftshader`
 * keeps WebGL on SwiftShader. `--use-angle=swiftshader` is deliberately not used, because it
 * also changes how CSS-scaled canvases are composited (CI-V2.3-EXPLORATION.md, Q2).
 *
 * The benchmark launches Chromium with its own flags and does not use these settings.
 */
import * as g_playwright from "@playwright/test";

const CHROMIUM_ARGS = Object.freeze( [ "--disable-gpu", "--enable-unsafe-swiftshader" ] );

/**
 * Returns Playwright launch options with the pinned renderer flags added to any caller flags.
 *
 * @param {Object} [options] - Playwright launch options; `headless` defaults to true
 * @returns {Object} Launch options
 */
function chromiumLaunchOptions( options = {} ) {
	return {
		"headless": true,
		...options,
		"args": [ ...CHROMIUM_ARGS, ...( options.args || [] ) ]
	};
}

/**
 * Launches headless Chromium with the pinned renderer flags.
 *
 * @param {Object} [options] - Playwright launch options, merged as in chromiumLaunchOptions()
 * @returns {Promise<Object>} Playwright browser
 */
function launchChromium( options = {} ) {
	return g_playwright.chromium.launch( chromiumLaunchOptions( options ) );
}

export { CHROMIUM_ARGS, chromiumLaunchOptions, launchChromium };
