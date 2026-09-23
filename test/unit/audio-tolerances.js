/**
 * Numeric tolerances for audio render assertions, recorded per metric and engine.
 *
 * Each value was set from the calibration renders in audio-reference-browser.test.js. The
 * comment on each metric records the observed maximum for valid fixtures and the smallest
 * value observed for deliberately abrupt fixtures, so later phases can see the margin.
 * An engine missing from a metric has no measurement; getTolerance() throws for it.
 */

const TOLERANCES = {

	// Reference residuals are normalized by the fixture's reference peak (audio-metrics.js).
	// Calibration: 45 fixtures per kind across sine, square, triangle, and sawtooth at 100,
	// 440, and 1250 Hz, three phases, and three seeded noise buffers.
	//
	// Stop, valid linear and exponential 10 ms fades:
	//   chromium max 2.8e-7, rms 8.9e-8; firefox max 7.6e-3, rms 1.4e-3
	// Stop, abrupt at nonzero amplitude (must fail):
	//   chromium min max 0.886, min rms 0.243; firefox min max 0.881, min rms 0.245
	"stopResidualMax": { "chromium": 1e-5, "firefox": 0.02 },
	"stopResidualRms": { "chromium": 1e-5, "firefox": 0.005 },

	// Onset, valid 3 ms linear ramp from silence:
	//   chromium max 3.4e-7, rms 5.8e-8; firefox max 3.2e-3, rms 1.0e-3
	// Onset, abrupt at nonzero amplitude (must fail):
	//   chromium min max 0.853, min rms 0.118; firefox min max 0.853, min rms 0.120
	"onsetResidualMax": { "chromium": 1e-5, "firefox": 0.01 },
	"onsetResidualRms": { "chromium": 1e-5, "firefox": 0.005 },

	// Every abrupt fixture must exceed its tolerance by at least this factor, so the checks
	// keep a clear gap between accepted fades and rejected clicks.
	"abruptSeparation": { "chromium": 10, "firefox": 10 },

	// Chromium mixes a node's inputs in an address-dependent order, so float rounding in a
	// multi-voice mix can differ in the last bits across page loads (observed up to 4.8e-7).
	// Firefox mixes in a fixed order and renders bit-identical output. Single-source renders
	// are bit-identical on both.
	"mixDeterminism": {
		"chromium": 2e-6,
		"firefox": 0
	}
};

/**
 * Returns the tolerance for a metric on an engine.
 *
 * @param {string} metric - Metric name
 * @param {string} engine - Engine name
 * @returns {number} Tolerance
 */
function getTolerance( metric, engine ) {
	const values = TOLERANCES[ metric ];
	if( !values ) {
		throw new Error( `audio tolerances: unknown metric "${metric}".` );
	}
	if( !Object.prototype.hasOwnProperty.call( values, engine ) ) {
		throw new Error( `audio tolerances: "${metric}" has no recorded value for ${engine}.` );
	}
	return values[ engine ];
}

export { TOLERANCES, getTolerance };
