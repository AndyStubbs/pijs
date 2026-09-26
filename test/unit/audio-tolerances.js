/**
 * Numeric tolerances for audio render assertions, recorded per metric and engine.
 *
 * Each value was set from the calibration renders in audio-reference-browser.test.js. The
 * comment on each metric records the observed maximum for valid fixtures and the smallest
 * value observed for deliberately abrupt fixtures, so later phases can see the margin.
 * An engine missing from a metric has no measurement; getTolerance() throws for it.
 *
 * WebKit values apply where Playwright's WebKit build has Web Audio (Linux and macOS; the
 * Windows build has none, so its render tests skip). WebKit renders match Chromium's precision,
 * and every WebKit render test passes with Chromium's values, so WebKit uses them.
 * Calibration: Ubuntu 24.04 (WSL 2 and the ubuntu-24.04 runner) and the macos-15 runner,
 * WebKit 26 (docs/evidence/ci-2.3/linux-webkit-audio.json and runners.json).
 */

const TOLERANCES = {

	// Reference residuals are normalized by the fixture's reference peak (audio-metrics.js).
	// Calibration: 45 fixtures per kind across sine, square, triangle, and sawtooth at 100,
	// 440, and 1250 Hz, three phases, and three seeded noise buffers.
	//
	// Stop, valid linear and exponential 10 ms fades:
	//   chromium max 2.8e-7, rms 8.9e-8; firefox max 7.6e-3, rms 1.4e-3;
	//   webkit max 2.9e-7, rms 8.9e-8 (macOS max 2.87e-7)
	// Stop, abrupt at nonzero amplitude (must fail):
	//   chromium min max 0.886, min rms 0.243; firefox min max 0.881, min rms 0.245;
	//   webkit min max 0.886, min rms 0.243
	"stopResidualMax": { "chromium": 1e-5, "firefox": 0.02, "webkit": 1e-5 },
	"stopResidualRms": { "chromium": 1e-5, "firefox": 0.005, "webkit": 1e-5 },

	// Onset, valid 3 ms linear ramp from silence:
	//   chromium max 3.4e-7, rms 5.8e-8; firefox max 3.2e-3, rms 1.0e-3;
	//   webkit max 3.6e-7, rms 5.7e-8
	// Onset, abrupt at nonzero amplitude (must fail):
	//   chromium min max 0.853, min rms 0.118; firefox min max 0.853, min rms 0.120;
	//   webkit min max 0.853, min rms 0.118
	"onsetResidualMax": { "chromium": 1e-5, "firefox": 0.01, "webkit": 1e-5 },
	"onsetResidualRms": { "chromium": 1e-5, "firefox": 0.005, "webkit": 1e-5 },

	// Every abrupt fixture must exceed its tolerance by at least this factor, so the checks
	// keep a clear gap between accepted fades and rejected clicks.
	"abruptSeparation": { "chromium": 10, "firefox": 10, "webkit": 10 },

	// Chromium and WebKit mix a node's inputs in an address-dependent order, so float rounding
	// in a multi-voice mix can differ in the last bits across page loads (observed up to
	// 4.8e-7 in Chromium; 4.9e-7 in WebKit on Linux, in 6 of 20 runs). Firefox mixes in a
	// fixed order and renders bit-identical output. Single-source renders are bit-identical on
	// all three.
	"mixDeterminism": {
		"chromium": 2e-6,
		"firefox": 0,
		"webkit": 2e-6
	},

	// Envelope stage boundaries measured from rendered sound() output against the analytic
	// ADSR model, in seconds (plan 10.2: within 1 ms)
	"envelopeTiming": { "chromium": 0.001, "firefox": 0.001, "webkit": 0.001 },

	// Limiter quality: share of samples above the soft clipper knee (0.9) on the stress
	// renders in audio-bus-browser.test.js. Chromium runs compressor + clipper. Firefox's
	// compressor pre-emphasizes high frequencies and cuts bright waveforms far below its
	// threshold, so the sound plugin's probe selects the clipper alone there; its value only
	// records the observed saturation on these deliberately extreme overloads. 64 looping
	// stereo sample instances at full volume: chromium 0.34%, firefox 31.6%.
	"limiterKneeShare": { "chromium": 0.01, "firefox": 0.65, "webkit": 0.01 },

	// Noise spectra: power-density slope error in dB/octave against 0 (white) and -3 (pink),
	// and the largest octave-band deviation from the fitted slope in dB, measured from 125 Hz
	// to 8 kHz on seeded 1.75 s sound() renders (audio-sound-design-browser.test.js).
	// Observed, identical on both engines: white slope -0.002, deviation 0.175; pink slope
	// -2.967, deviation 0.201.
	"noiseSlope": { "chromium": 0.15, "firefox": 0.15, "webkit": 0.15 },
	"noiseBandDeviation": { "chromium": 0.5, "firefox": 0.5, "webkit": 0.5 },

	// Decoded sample instances against content × gain, where the content position is
	// integrated per frame from the rate schedule with linear interpolation
	// (audio-samples-browser.test.js). Normalized maximum residual on the chirp fixtures.
	// Observed: chromium 3.1e-5 at every rate (half a 16-bit step); firefox 3.1e-5 at rate 1
	// and up to 1.9e-3 at other rates, where it resamples instead of interpolating linearly.
	// A position error of one frame measures about 1.3e-2.
	"samplePosition": { "chromium": 1e-4, "firefox": 0.004, "webkit": 1e-4 }
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
