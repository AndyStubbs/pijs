/**
 * Numeric closeness assertion shared by the sound Node tests.
 */
import * as g_assert from "node:assert/strict";
const assert = g_assert;

/**
 * Asserts that a number is within a tolerance of the expected value. NaN is never near.
 *
 * @param {number} actual - Measured value
 * @param {number} expected - Expected value
 * @param {number} [tolerance=1e-9] - Largest allowed absolute difference
 * @returns {void}
 */
function near( actual, expected, tolerance = 1e-9 ) {
	assert.ok(
		Math.abs( actual - expected ) <= tolerance,
		`${actual} is not within ${tolerance} of ${expected}`
	);
}

export { near };
