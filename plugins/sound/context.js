/**
 * Pi.js - Sound Context Module (Plugin)
 *
 * Shared AudioContext lifecycle, the master gain node, and the global volume setting.
 *
 * @module plugins/sound/context
 */

"use strict";

let m_audioContext = null;
let m_masterGain = null;
let m_volume = 0.75;


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Get the shared AudioContext, creating it if needed
 *
 * @returns {AudioContext} Shared audio context
 */
export function getAudioContext() {
	if( !m_audioContext ) {
		const audioContextClass = window.AudioContext || window.webkitAudioContext;
		m_audioContext = new audioContextClass();
	}

	return m_audioContext;
}

/**
 * Get the shared master gain node connected to the destination
 *
 * @returns {GainNode} Shared master gain
 */
export function getMasterGain() {
	const audioContext = getAudioContext();

	if( !m_masterGain ) {
		m_masterGain = audioContext.createGain();
		m_masterGain.gain.value = 1;
		m_masterGain.connect( audioContext.destination );
	}

	return m_masterGain;
}

/**
 * Get the global volume applied to new sounds and audio playback
 *
 * @returns {number} Volume (0-1)
 */
export function getVolume() {
	return m_volume;
}

/**
 * Store the global volume; callers apply it to active sounds and audio pools
 *
 * @param {number} volume - Volume (0-1)
 * @returns {void}
 */
export function setVolumeValue( volume ) {
	m_volume = volume;
}
