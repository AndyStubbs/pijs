/**
 * Pi.js - Sound Envelope Module (Plugin)
 *
 * Pure ADSR envelope math and AudioParam scheduling helpers. The module has no AudioContext
 * dependency, so Node unit tests import it directly and share the math used for playback.
 *
 * @module plugins/sound/envelope
 */

"use strict";

// De-click floor for every onset and stop ramp, in seconds
export const MIN_RAMP = 0.003;

// Fade length used by every stop, in seconds
export const STOP_FADE = 0.01;

// Decay and release time constants reach 80 dB below their start over the stage time
export const LN_10000 = Math.log( 10000 );


/*************************************************************************************************
 * Internal Functions
 ************************************************************************************************/


/**
 * Envelope value before the gate ends, ignoring release
 *
 * @param {Object} env - Resolved envelope
 * @param {number} t - Seconds since the envelope start
 * @param {number} peak - Peak gain
 * @returns {number} Gain value
 */
function heldValueAt( env, t, peak ) {
	if( t <= 0 ) {
		return 0;
	}
	if( t < env.attack ) {
		return peak * t / env.attack;
	}
	const sustain = peak * env.sustain;
	return sustain + ( peak - sustain ) * Math.exp( -( t - env.attack ) * LN_10000 / env.decay );
}


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Resolve public envelope parameters into stage times with the de-click floors applied
 *
 * The decay time is floored as well, so a sustain level below 1 with no decay time still
 * reaches the sustain level through a short curve instead of a step.
 *
 * @param {Object} params - Envelope parameters
 * @param {number} params.duration - Gate length in seconds
 * @param {number} params.attackTime - Seconds from silence to peak
 * @param {number} params.decayTime - Seconds from peak to the sustain level
 * @param {number} params.sustainLevel - Fraction of peak held until the gate ends
 * @param {number} params.releaseTime - Seconds from the gate-end value to silence
 * @returns {Object} Resolved envelope with attack, decay, sustain, gate, and release
 */
export function resolveEnvelope( params ) {
	return {
		"attack": Math.max( params.attackTime, MIN_RAMP ),
		"decay": Math.max( params.decayTime, MIN_RAMP ),
		"sustain": params.sustainLevel,
		"gate": params.duration,
		"release": Math.max( params.releaseTime, MIN_RAMP )
	};
}

/**
 * Total envelope length: gate plus the floored release
 *
 * @param {Object} env - Resolved envelope
 * @returns {number} Length in seconds
 */
export function getEnvelopeLength( env ) {
	return env.gate + env.release;
}

/**
 * Analytic envelope value at a time since the envelope start
 *
 * If the gate ends before attack and decay finish, release starts from the value reached at
 * the gate end. The value is exactly 0 from the end of release.
 *
 * @param {Object} env - Resolved envelope
 * @param {number} t - Seconds since the envelope start
 * @param {number} peak - Peak gain
 * @returns {number} Gain value
 */
export function envelopeValueAt( env, t, peak ) {
	if( t <= 0 || t >= env.gate + env.release ) {
		return 0;
	}
	if( t <= env.gate ) {
		return heldValueAt( env, t, peak );
	}
	const gateValue = heldValueAt( env, env.gate, peak );
	return gateValue * Math.exp( -( t - env.gate ) * LN_10000 / env.release );
}

/**
 * Build the automation events for an envelope
 *
 * With an offset, the schedule starts at start + offset from the envelope's value at that
 * timeline position. Decay and release are exponential approaches, which are memoryless, so
 * the continuation matches the full envelope exactly.
 *
 * @param {Object} env - Resolved envelope
 * @param {number} start - Context time of the envelope start
 * @param {number} peak - Peak gain
 * @param {number} [offset=0] - Timeline position in seconds at which scheduling begins
 * @returns {Array<Object>} Events of type "set", "linear", or "target"
 */
export function buildEnvelopeSchedule( env, start, peak, offset = 0 ) {
	const events = [];
	const attackEnd = start + env.attack;
	const gateEnd = start + env.gate;
	const end = gateEnd + env.release;
	const begin = start + offset;

	events.push( {
		"type": "set", "time": begin, "value": envelopeValueAt( env, offset, peak )
	} );

	// Attack ramp, cut at the gate end when the gate is shorter than the attack
	if( offset < env.attack && offset < env.gate ) {
		if( env.gate < env.attack ) {
			events.push( {
				"type": "linear", "time": gateEnd, "value": peak * env.gate / env.attack
			} );
		} else {
			events.push( { "type": "linear", "time": attackEnd, "value": peak } );
		}
	}

	// Decay toward the sustain level until the gate ends
	if( env.gate > env.attack && offset < env.gate ) {
		events.push( {
			"type": "target", "time": Math.max( attackEnd, begin ), "value": peak * env.sustain,
			"timeConstant": env.decay / LN_10000
		} );
	}

	// Release from the gate-end value, then exactly zero
	events.push( {
		"type": "target", "time": Math.max( gateEnd, begin ), "value": 0,
		"timeConstant": env.release / LN_10000
	} );
	events.push( { "type": "set", "time": end, "value": 0 } );

	return events;
}

/**
 * Event that pins the analytic envelope value at a cancel time
 *
 * cancelScheduledValues( t ) also removes a ramp that is still in progress at t, so inside
 * the attack ramp the value is re-created with a linear ramp from the previous event. Other
 * stages keep their earlier setTarget event, so a set event is exact. This avoids
 * cancelAndHoldAtTime, which Firefox lacks.
 *
 * @param {Object} env - Resolved envelope
 * @param {number} start - Context time of the envelope start
 * @param {number} peak - Peak gain
 * @param {number} time - Context time of the cancellation
 * @returns {Object} A "linear" or "set" event at time
 */
export function stopHoldEvent( env, start, peak, time ) {
	const t = time - start;
	const value = envelopeValueAt( env, t, peak );
	if( t > 0 && t < env.attack && t < env.gate ) {
		return { "type": "linear", "time": time, "value": value };
	}
	return { "type": "set", "time": time, "value": value };
}

/**
 * Apply automation events to an AudioParam
 *
 * @param {AudioParam} param - Target parameter
 * @param {Array<Object>} events - Events from buildEnvelopeSchedule or stopHoldEvent
 * @returns {void}
 */
export function applySchedule( param, events ) {
	for( const event of events ) {
		if( event.type === "set" ) {
			param.setValueAtTime( event.value, event.time );
		} else if( event.type === "linear" ) {
			param.linearRampToValueAtTime( event.value, event.time );
		} else {
			param.setTargetAtTime( event.value, event.time, event.timeConstant );
		}
	}
}

/**
 * Schedule an envelope on an AudioParam from public parameters (extension service method)
 *
 * @param {AudioParam} param - Target parameter
 * @param {Object} env - attackTime, decayTime, sustainLevel, and releaseTime
 * @param {number} start - Context time of the envelope start
 * @param {number} gateEnd - Context time at which release begins
 * @param {number} peak - Peak value
 * @returns {number} Context time at which the envelope reaches zero
 */
export function scheduleEnvelope( param, env, start, gateEnd, peak ) {
	const resolved = resolveEnvelope( {
		"duration": Math.max( gateEnd - start, 0 ),
		"attackTime": env.attackTime || 0,
		"decayTime": env.decayTime || 0,
		"sustainLevel": env.sustainLevel ?? 1,
		"releaseTime": env.releaseTime ?? 0.1
	} );
	applySchedule( param, buildEnvelopeSchedule( resolved, start, peak ) );
	return start + getEnvelopeLength( resolved );
}

/**
 * Value of a linear ramp record at a context time
 *
 * @param {Object} ramp - Ramp record { from, to, t0, t1 }
 * @param {number} time - Context time
 * @returns {number} Value
 */
export function rampValueAt( ramp, time ) {
	if( time <= ramp.t0 ) {
		return ramp.from;
	}
	if( time >= ramp.t1 ) {
		return ramp.to;
	}
	return ramp.from + ( ramp.to - ramp.from ) * ( time - ramp.t0 ) / ( ramp.t1 - ramp.t0 );
}
