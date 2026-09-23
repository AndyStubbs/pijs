/**
 * Audio metrics and reference-residual checks for rendered sample buffers.
 *
 * This module is pure Node code and imports nothing from production. The oracle envelopes
 * below are an independent model of Web Audio automation, so tests do not validate the
 * production envelope helpers against themselves.
 */

/** Default threshold below which a sample counts as silent. */
const SILENCE = 1e-4;

function clampRange( samples, from, to ) {
	let start = 0;
	let end = samples.length;
	if( from !== undefined ) {
		start = Math.max( 0, Math.floor( from ) );
	}
	if( to !== undefined ) {
		end = Math.min( samples.length, Math.ceil( to ) );
	}
	return [ start, end ];
}

/**
 * Maximum absolute sample value over a frame range.
 *
 * @param {Float32Array|number[]} samples - Samples
 * @param {number} [from] - First frame
 * @param {number} [to] - End frame (exclusive)
 * @returns {number} Peak magnitude
 */
function peak( samples, from, to ) {
	const [ start, end ] = clampRange( samples, from, to );
	let max = 0;
	for( let i = start; i < end; i++ ) {
		max = Math.max( max, Math.abs( samples[ i ] ) );
	}
	return max;
}

/**
 * Root mean square over a frame range.
 *
 * @param {Float32Array|number[]} samples - Samples
 * @param {number} [from] - First frame
 * @param {number} [to] - End frame (exclusive)
 * @returns {number} RMS, or 0 for an empty range
 */
function rms( samples, from, to ) {
	const [ start, end ] = clampRange( samples, from, to );
	if( end <= start ) {
		return 0;
	}
	let sum = 0;
	for( let i = start; i < end; i++ ) {
		sum += samples[ i ] * samples[ i ];
	}
	return Math.sqrt( sum / ( end - start ) );
}

/**
 * RMS of consecutive windows.
 *
 * @param {Float32Array|number[]} samples - Samples
 * @param {number} windowFrames - Frames per window
 * @param {number} [from] - First frame
 * @param {number} [to] - End frame (exclusive)
 * @returns {number[]} One RMS value per complete window
 */
function rmsWindows( samples, windowFrames, from, to ) {
	const [ start, end ] = clampRange( samples, from, to );
	const windows = [];
	for( let i = start; i + windowFrames <= end; i += windowFrames ) {
		windows.push( rms( samples, i, i + windowFrames ) );
	}
	return windows;
}

/**
 * Share of samples whose magnitude exceeds a knee, used for the limiter quality metric.
 *
 * @param {Float32Array|number[]} samples - Samples
 * @param {number} [knee] - Threshold magnitude
 * @returns {number} Fraction from 0 to 1
 */
function kneeShare( samples, knee = 0.9 ) {
	if( samples.length === 0 ) {
		return 0;
	}
	let count = 0;
	for( let i = 0; i < samples.length; i++ ) {
		if( Math.abs( samples[ i ] ) > knee ) {
			count++;
		}
	}
	return count / samples.length;
}

/**
 * Estimates frequency from interpolated rising zero crossings.
 *
 * @param {Float32Array|number[]} samples - Samples
 * @param {number} sampleRate - Sample rate in Hz
 * @param {number} [from] - First frame
 * @param {number} [to] - End frame (exclusive)
 * @returns {number} Frequency in Hz, or 0 with fewer than two crossings
 */
function zeroCrossingFrequency( samples, sampleRate, from, to ) {
	const [ start, end ] = clampRange( samples, from, to );
	const crossings = [];
	for( let i = start + 1; i < end; i++ ) {
		const a = samples[ i - 1 ];
		const b = samples[ i ];
		if( a < 0 && b >= 0 ) {
			crossings.push( i - 1 + ( -a / ( b - a ) ) );
		}
	}
	if( crossings.length < 2 ) {
		return 0;
	}
	const periods = crossings.length - 1;
	return ( periods * sampleRate ) / ( crossings[ crossings.length - 1 ] - crossings[ 0 ] );
}

/**
 * First frame whose magnitude exceeds a threshold.
 *
 * @param {Float32Array|number[]} samples - Samples
 * @param {number} [threshold] - Silence threshold
 * @returns {number} Frame index, or -1 when all samples are silent
 */
function firstNonSilent( samples, threshold = SILENCE ) {
	for( let i = 0; i < samples.length; i++ ) {
		if( Math.abs( samples[ i ] ) > threshold ) {
			return i;
		}
	}
	return -1;
}

/**
 * Last frame whose magnitude exceeds a threshold.
 *
 * @param {Float32Array|number[]} samples - Samples
 * @param {number} [threshold] - Silence threshold
 * @returns {number} Frame index, or -1 when all samples are silent
 */
function lastNonSilent( samples, threshold = SILENCE ) {
	for( let i = samples.length - 1; i >= 0; i-- ) {
		if( Math.abs( samples[ i ] ) > threshold ) {
			return i;
		}
	}
	return -1;
}

/**
 * Whether every sample in a range is at or below a threshold.
 *
 * @param {Float32Array|number[]} samples - Samples
 * @param {number} from - First frame
 * @param {number} to - End frame (exclusive)
 * @param {number} [threshold] - Silence threshold
 * @returns {boolean} True when the range is silent
 */
function isSilent( samples, from, to, threshold = SILENCE ) {
	return peak( samples, from, to ) <= threshold;
}

/*************************************************************************************************
 * Oracle envelopes
 ************************************************************************************************/

/**
 * Builds an envelope from Web Audio style automation events.
 *
 * Supported events, in time order:
 * - { "type": "set", "time", "value" }: setValueAtTime
 * - { "type": "linear", "time", "value" }: linearRampToValueAtTime ending at time
 * - { "type": "target", "time", "target", "timeConstant" }: setTargetAtTime from time
 *
 * The value before the first event is initialValue. A linear ramp starts at the previous
 * event's time and value. A target approach starts from the value in effect at its time.
 *
 * @param {Object[]} events - Automation events
 * @param {number} [initialValue] - Value before the first event
 * @returns {Function} gain( t ) for time t in seconds
 */
function automationEnvelope( events, initialValue = 1 ) {
	const sorted = events.slice().sort( ( a, b ) => a.time - b.time );

	function valueAt( t ) {
		let value = initialValue;
		let lastTime = 0;
		let target = null;
		for( let i = 0; i < sorted.length; i++ ) {
			const event = sorted[ i ];
			if( event.type === "linear" ) {
				if( t < event.time ) {
					if( t < lastTime ) {
						return value;
					}
					const span = event.time - lastTime;
					if( span <= 0 ) {
						return event.value;
					}
					return value + ( event.value - value ) * ( ( t - lastTime ) / span );
				}
				value = event.value;
				lastTime = event.time;
				target = null;
				continue;
			}
			if( t < event.time ) {
				break;
			}
			if( target !== null ) {
				value = targetValue( target, event.time );
				target = null;
			}
			if( event.type === "set" ) {
				value = event.value;
			} else if( event.type === "target" ) {
				target = { "start": event.time, "from": value, "event": event };
			}
			lastTime = event.time;
		}
		if( target !== null ) {
			return targetValue( target, t );
		}
		return value;
	}

	function targetValue( target, t ) {
		const event = target.event;
		const decay = Math.exp( -( t - target.start ) / event.timeConstant );
		return event.target + ( target.from - event.target ) * decay;
	}

	return valueAt;
}

/**
 * Linear fade from 1 to 0, holding 0 afterward.
 *
 * @param {number} start - Fade start in seconds
 * @param {number} length - Fade length in seconds
 * @returns {Function} gain( t )
 */
function linearFade( start, length ) {
	return automationEnvelope( [
		{ "type": "set", "time": start, "value": 1 },
		{ "type": "linear", "time": start + length, "value": 0 }
	] );
}

/**
 * Exponential fade toward 0 with an 80 dB stage, then exactly 0 at the stage end.
 *
 * @param {number} start - Fade start in seconds
 * @param {number} length - Stage length in seconds
 * @returns {Function} gain( t )
 */
function exponentialFade( start, length ) {
	return automationEnvelope( [
		{
			"type": "target", "time": start, "target": 0,
			"timeConstant": length / Math.log( 10000 )
		},
		{ "type": "set", "time": start + length, "value": 0 }
	] );
}

/**
 * Linear onset from 0 to 1 starting at start, silent before it.
 *
 * @param {number} start - Onset start in seconds
 * @param {number} length - Ramp length in seconds (the 3 ms de-click floor is 0.003)
 * @returns {Function} gain( t )
 */
function linearOnset( start, length ) {
	return automationEnvelope( [
		{ "type": "set", "time": start, "value": 0 },
		{ "type": "linear", "time": start + length, "value": 1 }
	], 0 );
}

/*************************************************************************************************
 * Reference residuals
 ************************************************************************************************/

/**
 * Compares a render with carrier × expected envelope.
 *
 * Residuals are normalized by the reference's peak over the compared range, never by
 * individual samples, so zero crossings cannot inflate them.
 *
 * @param {Float32Array} rendered - Rendered samples
 * @param {Float32Array} carrier - Unmodulated carrier from the same engine and source
 * @param {Function} envelope - Expected gain( t )
 * @param {Object} range - Comparison range
 * @param {number} range.sampleRate - Sample rate
 * @param {number} range.from - First frame
 * @param {number} range.to - End frame (exclusive)
 * @returns {{ max: number, rms: number, referencePeak: number }} Normalized residuals
 */
function referenceResidual( rendered, carrier, envelope, range ) {
	const [ start, end ] = clampRange( rendered, range.from, range.to );
	let referencePeak = 0;
	for( let i = start; i < end; i++ ) {
		referencePeak = Math.max(
			referencePeak, Math.abs( carrier[ i ] * envelope( i / range.sampleRate ) )
		);
	}
	if( referencePeak === 0 ) {
		throw new RangeError( "referenceResidual: the reference is silent over the range." );
	}
	let max = 0;
	let sum = 0;
	for( let i = start; i < end; i++ ) {
		const expected = carrier[ i ] * envelope( i / range.sampleRate );
		const difference = Math.abs( rendered[ i ] - expected );
		max = Math.max( max, difference );
		sum += difference * difference;
	}
	return {
		"max": max / referencePeak,
		"rms": Math.sqrt( sum / Math.max( 1, end - start ) ) / referencePeak,
		"referencePeak": referencePeak
	};
}

/**
 * Stop check: residual through the fade plus silence after it.
 *
 * @param {Float32Array} rendered - Rendered samples
 * @param {Float32Array} carrier - Unmodulated carrier
 * @param {Function} envelope - Expected falling gain( t )
 * @param {Object} options - Check options
 * @param {number} options.sampleRate - Sample rate
 * @param {number} options.from - First compared frame, before the fade begins
 * @param {number} options.stopEnd - Time in seconds when the fade reaches silence
 * @param {number} [options.tail] - Seconds of silence to check after stopEnd
 * @returns {Object} Residuals plus silentAfter
 */
function stopResidual( rendered, carrier, envelope, options ) {
	const endFrame = Math.ceil( options.stopEnd * options.sampleRate );
	const tailFrames = Math.round( ( options.tail ?? 0.01 ) * options.sampleRate );
	const residual = referenceResidual( rendered, carrier, envelope, {
		"sampleRate": options.sampleRate, "from": options.from, "to": endFrame
	} );
	return {
		...residual,
		"silentAfter": isSilent( rendered, endFrame + 1, endFrame + 1 + tailFrames )
	};
}

/**
 * Onset check: silence before onset plus residual through the rise.
 *
 * @param {Float32Array} rendered - Rendered samples
 * @param {Float32Array} carrier - Unmodulated carrier
 * @param {Function} envelope - Expected rising gain( t )
 * @param {Object} options - Check options
 * @param {number} options.sampleRate - Sample rate
 * @param {number} options.onset - Onset time in seconds
 * @param {number} options.to - End frame (exclusive) of the compared range
 * @param {number} [options.lead] - Seconds of silence to check before onset
 * @returns {Object} Residuals plus silentBefore
 */
function onsetResidual( rendered, carrier, envelope, options ) {
	const onsetFrame = Math.floor( options.onset * options.sampleRate );
	const leadFrames = Math.round( ( options.lead ?? 0.01 ) * options.sampleRate );
	const residual = referenceResidual( rendered, carrier, envelope, {
		"sampleRate": options.sampleRate, "from": onsetFrame - leadFrames, "to": options.to
	} );
	return {
		...residual,
		"silentBefore": isSilent( rendered, onsetFrame - leadFrames, onsetFrame )
	};
}

export {
	SILENCE, automationEnvelope, exponentialFade, firstNonSilent, isSilent, kneeShare,
	lastNonSilent, linearFade, linearOnset, onsetResidual, peak, referenceResidual, rms,
	rmsWindows, stopResidual, zeroCrossingFrequency
};
