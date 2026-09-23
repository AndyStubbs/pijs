/**
 * Pi.js - Sound Advanced Analyser Module (Plugin)
 *
 * getSoundLevels(): peak and RMS levels plus optional spectrum and waveform data for
 * visualizers. Each bus gets one AnalyserNode on first use, connected through the sound
 * service's read-only bus tap after the bus effects and volume.
 *
 * @module plugins/sound-advanced/analyser
 */

"use strict";

export const ANALYSER_BUSES = [ "sfx", "music", "audio", "master", "output" ];

// Analysis window in frames, and the spectrum floor in dB
const FFT_SIZE = 2048;
const MIN_DECIBELS = -120;

// Analysers by bus name
const m_analysers = new Map();


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Throw an error with an error code
 *
 * @param {Function} ErrorType - Error constructor
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {never}
 */
function throwCode( ErrorType, message, code ) {
	const error = new ErrorType( message );
	error.code = code;
	throw error;
}

/**
 * Check that an optional flag is a boolean
 *
 * @param {string} name - Parameter name
 * @param {*} value - Flag value
 * @param {string} code - Error code
 * @returns {boolean} Flag, false when omitted
 */
function readFlag( name, value, code ) {
	if( value == null ) {
		return false;
	}
	if( typeof value !== "boolean" ) {
		throwCode( TypeError, `getSoundLevels: Parameter ${name} must be a boolean.`, code );
	}
	return value;
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Peak and RMS of a block of samples
 *
 * @param {Float32Array} samples - Time-domain samples
 * @returns {Object} { peak, rms }
 */
export function measureLevels( samples ) {
	let peak = 0;
	let sum = 0;
	for( let i = 0; i < samples.length; i++ ) {
		const value = samples[ i ];
		const magnitude = Math.abs( value );
		if( magnitude > peak ) {
			peak = magnitude;
		}
		sum += value * value;
	}
	let rms = 0;
	if( samples.length > 0 ) {
		rms = Math.sqrt( sum / samples.length );
	}
	return { "peak": peak, "rms": rms };
}


/*************************************************************************************************
 * Plugin Registration
 ************************************************************************************************/


/**
 * Register the level analyser command
 *
 * @param {Object} pluginApi - Plugin API
 * @param {Object} service - Sound extension service
 * @returns {void}
 */
export function register( pluginApi, service ) {

	/**
	 * Get the analyser for a bus, tapping the bus on first use
	 *
	 * @param {string} bus - Bus name
	 * @returns {AnalyserNode} Analyser
	 */
	function getAnalyser( bus ) {
		let analyser = m_analysers.get( bus );
		if( !analyser ) {
			const context = service.getContext();
			analyser = context.createAnalyser();
			analyser.fftSize = FFT_SIZE;
			analyser.smoothingTimeConstant = 0;
			analyser.minDecibels = MIN_DECIBELS;
			service.tapBus( bus, analyser );
			m_analysers.set( bus, analyser );
		}
		return analyser;
	}


	pluginApi.addCommand(
		"getSoundLevels", getSoundLevels, false, [ "bus", "spectrum", "waveform" ]
	);

	/**
	 * Measure the most recent 2048 frames of a bus
	 *
	 * Levels are linear sample values after the bus effects and volume; "master" is measured
	 * after the master volume and before the limiter, and "output" after the limiter. The
	 * spectrum holds 1024 bins in dB from 0 Hz to half the sample rate. The first call on a bus
	 * starts its analyser and returns silence, so call it every frame rather than once.
	 *
	 * @param {Object} options - Command options
	 * @param {string} options.bus - "sfx", "music", "audio", "master", or "output"
	 *   (default: "master")
	 * @param {boolean} options.spectrum - Include frequency data in dB (default: false)
	 * @param {boolean} options.waveform - Include time-domain samples (default: false)
	 * @returns {Object} { peak, rms, spectrum, waveform }; arrays are null unless requested
	 */
	function getSoundLevels( options ) {
		let bus = "master";
		if( options.bus != null ) {
			bus = options.bus;
		}
		if( ANALYSER_BUSES.indexOf( bus ) === -1 ) {
			throwCode(
				Error,
				"getSoundLevels: Parameter bus must be one of: sfx, music, audio, master, output.",
				"INVALID_BUS"
			);
		}
		const includeSpectrum = readFlag( "spectrum", options.spectrum, "INVALID_SPECTRUM" );
		const includeWaveform = readFlag( "waveform", options.waveform, "INVALID_WAVEFORM" );
		const analyser = getAnalyser( bus );
		const samples = new Float32Array( analyser.fftSize );
		analyser.getFloatTimeDomainData( samples );
		const levels = measureLevels( samples );
		let spectrum = null;
		if( includeSpectrum ) {
			spectrum = new Float32Array( analyser.frequencyBinCount );
			analyser.getFloatFrequencyData( spectrum );
		}
		let waveform = null;
		if( includeWaveform ) {
			waveform = samples;
		}
		return {
			"peak": levels.peak,
			"rms": levels.rms,
			"spectrum": spectrum,
			"waveform": waveform
		};
	}
}
