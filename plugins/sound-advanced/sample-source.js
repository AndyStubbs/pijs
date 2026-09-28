/**
 * Pi.js - Sound Advanced Sample Source Module (Plugin)
 *
 * Source types that play a file loaded with loadAudio(), pitched by playback rate, for sample
 * instruments. A type is registered on first use for each audio name, root frequency, and loop
 * setting, because a source factory receives only the voice spec. The note frequency stays the
 * musical pitch, so PLAY observers report it unchanged. Each note reads the file's buffer when
 * its voice is built, so a file that loads later plays in later notes; until then the source is
 * silent.
 *
 * @module plugins/sound-advanced/sample-source
 */

"use strict";

export const SAMPLE_TYPE_PREFIX = "sample:";

// C4, the default pitch of a recording
export const DEFAULT_ROOT_FREQUENCY = 261.63;

// Registered source type names
const m_types = new Set();


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Source factory for one audio name, root frequency, and loop setting
 *
 * The buffer source plays from the start of the file, so a late note keeps the sample's
 * attack. The source reports no frequency parameter: it schedules its playback rate itself,
 * and its detune parameter carries vibrato and arpeggios. A file that is loading, streamed,
 * or removed leaves the buffer empty, which plays silence until the voice stops.
 *
 * @param {Object} service - Sound extension service
 * @param {string} name - Audio ID from loadAudio
 * @param {number} rootFrequency - Frequency in Hz that plays the file at its own pitch
 * @param {boolean} loop - Whether the file repeats until the voice stops
 * @returns {Function} factory( context, spec ) returning the source contract
 */
function createSampleFactory( service, name, rootFrequency, loop ) {
	return ( context, spec ) => {
		const source = context.createBufferSource();
		const buffer = service.getAudioBuffer( name );
		if( buffer ) {
			source.buffer = buffer;
		}
		source.loop = loop;
		scheduleRate( source.playbackRate, spec, rootFrequency );

		let stopAt = Infinity;
		let disposed = false;
		return {
			"output": source,
			"frequency": null,
			"detune": source.detune,
			"start": ( when ) => {
				source.start( when );
			},
			"stop": ( when ) => {
				if( when >= stopAt ) {
					return;
				}
				stopAt = when;
				source.stop( when );
			},
			"onEnded": ( callback ) => {
				source.onended = callback;
			},
			"dispose": () => {
				if( disposed ) {
					return;
				}
				disposed = true;
				source.onended = null;
				source.disconnect();
			}
		};
	};
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Schedule a sample's playback rate: frequency / rootFrequency, with the voice's exponential
 * sweep toward frequencyEnd over the gate, as core schedules an oscillator's frequency. A late
 * voice begins at the rate the sweep has reached.
 *
 * @param {AudioParam} param - Playback rate parameter
 * @param {Object} spec - Source spec: frequency, frequencyEnd, start, gate, offset
 * @param {number} rootFrequency - Frequency in Hz that plays the file at its own pitch
 * @returns {void}
 */
export function scheduleRate( param, spec, rootFrequency ) {
	const rate = spec.frequency / rootFrequency;
	if( spec.frequencyEnd == null ) {
		param.value = rate;
		return;
	}
	const rateEnd = spec.frequencyEnd / rootFrequency;
	const begin = spec.start + spec.offset;
	let rateBegin = rate;
	if( spec.offset > 0 && spec.gate > 0 ) {
		const progress = Math.min( spec.offset / spec.gate, 1 );
		rateBegin = rate * Math.pow( rateEnd / rate, progress );
	}
	param.setValueAtTime( rateBegin, begin );
	if( spec.start + spec.gate > begin ) {
		param.exponentialRampToValueAtTime( rateEnd, spec.start + spec.gate );
	}
}

/**
 * Source type name for an audio name, root frequency, and loop setting. The name is quoted,
 * so no two settings share a type: "sample:\"piano\"", with "@392" for another root
 * frequency and ":loop" for a looping sample.
 *
 * @param {string} name - Audio ID from loadAudio
 * @param {number} rootFrequency - Frequency in Hz that plays the file at its own pitch
 * @param {boolean} loop - Whether the file repeats until the voice stops
 * @returns {string} Source type name
 */
export function sampleTypeName( name, rootFrequency, loop ) {
	let type = SAMPLE_TYPE_PREFIX + JSON.stringify( name );
	if( rootFrequency !== DEFAULT_ROOT_FREQUENCY ) {
		type += "@" + rootFrequency;
	}
	if( loop ) {
		type += ":loop";
	}
	return type;
}

/**
 * Get the source type that plays an audio file, registering it on first use
 *
 * @param {Object} service - Sound extension service
 * @param {string} name - Audio ID from loadAudio
 * @param {number} rootFrequency - Frequency in Hz that plays the file at its own pitch
 * @param {boolean} loop - Whether the file repeats until the voice stops
 * @returns {string} Source type name for sound(), createVoice(), and PLAY notes
 */
export function getSampleType( service, name, rootFrequency, loop ) {
	const type = sampleTypeName( name, rootFrequency, loop );
	if( !m_types.has( type ) ) {
		service.registerSource( type, createSampleFactory( service, name, rootFrequency, loop ) );
		m_types.add( type );
	}
	return type;
}
