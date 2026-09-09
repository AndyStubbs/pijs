/**
 * Pi.js - Context availability and generation checks shared by renderer entry points.
 * @module renderer/context-state
 */
"use strict";

/**
 * Read cached availability without querying WebGL in drawing hot paths.
 * @param {Object} screenData - Screen data
 * @returns {boolean} Whether GPU work must be discarded
 */
export function isContextUnavailable( screenData ) {
	return screenData.contextLost === true;
}

/**
 * Observe browser loss at a GPU boundary, before its asynchronous event if necessary.
 * @param {Object} screenData - Screen data
 * @returns {boolean} Whether the GPU operation must be canceled
 */
export function probeContextLoss( screenData ) {
	if( isContextUnavailable( screenData ) ) {
		return true;
	}
	if( screenData.gl?.isContextLost?.() ) {
		screenData.contextLost = true;
		screenData.contextState?.suspend();
		return true;
	}
	return false;
}

/**
 * Read the current generation without querying WebGL.
 * @param {Object} screenData - Screen data
 * @returns {number} Context generation
 */
export function getContextGeneration( screenData ) {
	return screenData.contextGeneration ?? 0;
}
