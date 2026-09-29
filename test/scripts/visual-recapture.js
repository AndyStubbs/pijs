/**
 * Visual comparison with one recapture. Chromium can return a capture with blank canvases,
 * which the next frame does not repeat; a real rendering difference captures the same way
 * again. So a pixel mismatch is captured once more before it fails, and the recapture is
 * reported either way, so the glitch stays visible.
 *
 * @module test/scripts/visual-recapture
 */

"use strict";

/**
 * Compare a capture with its baseline, recapturing once after a pixel mismatch. A comparison
 * error, such as a size mismatch or a missing file, is not recaptured.
 *
 * @param {Function} compare - Returns `{ match, diffPercent, error }` for the current capture.
 * @param {Function} recapture - Keeps the first capture, waits for the page to present, and
 *   captures again, to the same file.
 * @returns {Promise<Object>} `{ comparison, recapture }`: the final comparison, and a
 *   description of the recapture, or an empty string when there was none.
 */
export async function compareWithRecapture( compare, recapture ) {
	const first = compare();
	if( first.match || first.error ) {
		return { "comparison": first, "recapture": "" };
	}
	await recapture();
	const comparison = compare();
	let outcome = "the recapture also differed";
	if( comparison.match ) {
		outcome = "the recapture matched";
	}
	return {
		"comparison": comparison,
		"recapture": `First capture ${first.diffPercent}% pixels different; ${outcome}`
	};
}
