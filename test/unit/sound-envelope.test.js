/**
 * Unit tests for the pure envelope math in plugins/sound/envelope.js.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_envelope from "../../plugins/sound/envelope.js";
const assert = g_assert;
const test = g_test.test;

const LN_10000 = Math.log( 10000 );

function env( params ) {
	return g_envelope.resolveEnvelope( {
		"duration": 1, "attackTime": 0, "decayTime": 0, "sustainLevel": 1, "releaseTime": 0.1,
		...params
	} );
}

function near( actual, expected, tolerance = 1e-9 ) {
	assert.ok(
		Math.abs( actual - expected ) <= tolerance, `expected ${expected}, got ${actual}`
	);
}

/** Evaluate an event list the way an AudioParam does, independent of envelopeValueAt. */
function evaluateEvents( events, time ) {
	let value = 0;
	let previous = { "time": -Infinity, "value": 0 };
	let target = null;
	for( let i = 0; i < events.length; i++ ) {
		const event = events[ i ];
		if( event.time > time ) {
			if( event.type === "linear" ) {
				const span = event.time - previous.time;
				return previous.value + ( event.value - previous.value ) *
					( time - previous.time ) / span;
			}
			break;
		}
		if( target ) {
			value = target.value + ( value - target.value ) *
				Math.exp( -( event.time - target.time ) / target.timeConstant );
			target = null;
		}
		if( event.type === "target" ) {
			target = event;
		} else {
			value = event.value;
		}
		previous = { "time": event.time, "value": value };
	}
	if( target ) {
		value = target.value + ( value - target.value ) *
			Math.exp( -( time - target.time ) / target.timeConstant );
	}
	return value;
}

test( "resolveEnvelope applies the de-click floors", () => {
	const resolved = env( { "attackTime": 0, "decayTime": 0, "releaseTime": 0 } );
	assert.equal( resolved.attack, g_envelope.MIN_RAMP );
	assert.equal( resolved.decay, g_envelope.MIN_RAMP );
	assert.equal( resolved.release, g_envelope.MIN_RAMP );
	assert.equal( resolved.gate, 1 );
	const long = env( { "attackTime": 0.05, "decayTime": 0.2, "releaseTime": 0.4 } );
	assert.equal( long.attack, 0.05 );
	assert.equal( long.decay, 0.2 );
	assert.equal( long.release, 0.4 );
	assert.equal( g_envelope.getEnvelopeLength( long ), 1.4 );
	assert.equal( g_envelope.MIN_RAMP, 0.003 );
	assert.equal( g_envelope.STOP_FADE, 0.01 );
} );

test( "envelopeValueAt follows attack, decay, sustain, and release", () => {
	const e = env( {
		"duration": 0.5, "attackTime": 0.1, "decayTime": 0.2, "sustainLevel": 0.4,
		"releaseTime": 0.3
	} );
	const peak = 0.8;
	assert.equal( g_envelope.envelopeValueAt( e, 0, peak ), 0 );
	assert.equal( g_envelope.envelopeValueAt( e, -1, peak ), 0 );
	near( g_envelope.envelopeValueAt( e, 0.05, peak ), 0.4 );
	near( g_envelope.envelopeValueAt( e, 0.1, peak ), peak );

	// Decay covers 80 dB of the distance to the sustain level over the stage time
	const sustain = peak * 0.4;
	near( g_envelope.envelopeValueAt( e, 0.3, peak ), sustain + ( peak - sustain ) * 1e-4 );
	near(
		g_envelope.envelopeValueAt( e, 0.2, peak ),
		sustain + ( peak - sustain ) * Math.exp( -0.1 * LN_10000 / 0.2 )
	);

	// Release starts from the gate-end value
	const gateValue = g_envelope.envelopeValueAt( e, 0.5, peak );
	near(
		g_envelope.envelopeValueAt( e, 0.65, peak ),
		gateValue * Math.exp( -0.15 * LN_10000 / 0.3 )
	);
	assert.ok( g_envelope.envelopeValueAt( e, 0.7999, peak ) > 0 );
	assert.equal( g_envelope.envelopeValueAt( e, 0.8, peak ), 0 );
	assert.equal( g_envelope.envelopeValueAt( e, 2, peak ), 0 );
} );

test( "an early gate end releases from the value reached in attack or decay", () => {
	const inAttack = env( { "duration": 0.05, "attackTime": 0.1, "releaseTime": 0.2 } );
	near( g_envelope.envelopeValueAt( inAttack, 0.05, 1 ), 0.5 );
	near(
		g_envelope.envelopeValueAt( inAttack, 0.1, 1 ),
		0.5 * Math.exp( -0.05 * LN_10000 / 0.2 )
	);

	const inDecay = env( {
		"duration": 0.15, "attackTime": 0.1, "decayTime": 0.5, "sustainLevel": 0.2,
		"releaseTime": 0.2
	} );
	const gateValue = 0.2 + 0.8 * Math.exp( -0.05 * LN_10000 / 0.5 );
	near( g_envelope.envelopeValueAt( inDecay, 0.15, 1 ), gateValue );
	near(
		g_envelope.envelopeValueAt( inDecay, 0.25, 1 ),
		gateValue * Math.exp( -0.1 * LN_10000 / 0.2 )
	);
} );

test( "a zero-length gate is silent", () => {
	const e = env( { "duration": 0 } );
	assert.equal( g_envelope.envelopeValueAt( e, 0.01, 1 ), 0 );
} );

test( "buildEnvelopeSchedule matches the analytic envelope", () => {
	const cases = [
		{ "duration": 0.5, "attackTime": 0.1, "decayTime": 0.2, "sustainLevel": 0.4,
			"releaseTime": 0.3 },
		{ "duration": 0.05, "attackTime": 0.1, "releaseTime": 0.2 },
		{ "duration": 0.3, "attackTime": 0, "releaseTime": 0 },
		{ "duration": 0.1, "attackTime": 0.1, "decayTime": 0.5, "sustainLevel": 0.2 }
	];
	for( const params of cases ) {
		const e = env( params );
		const start = 2;
		const events = g_envelope.buildEnvelopeSchedule( e, start, 0.7 );
		assert.deepEqual( events[ 0 ], { "type": "set", "time": start, "value": 0 } );
		const last = events[ events.length - 1 ];
		assert.deepEqual(
			last, { "type": "set", "time": start + g_envelope.getEnvelopeLength( e ), "value": 0 }
		);
		for( let t = 0; t <= g_envelope.getEnvelopeLength( e ) + 0.05; t += 0.0017 ) {
			near(
				evaluateEvents( events, start + t ), g_envelope.envelopeValueAt( e, t, 0.7 ), 1e-6
			);
		}
	}
} );

test( "an offset schedule continues from the timeline position", () => {
	const e = env( {
		"duration": 0.5, "attackTime": 0.1, "decayTime": 0.2, "sustainLevel": 0.4,
		"releaseTime": 0.3
	} );
	for( const offset of [ 0.02, 0.15, 0.6 ] ) {
		const events = g_envelope.buildEnvelopeSchedule( e, 1, 1, offset );
		assert.equal( events[ 0 ].type, "set" );
		assert.equal( events[ 0 ].time, 1 + offset );
		near( events[ 0 ].value, g_envelope.envelopeValueAt( e, offset, 1 ) );
		for( let t = offset; t <= 0.85; t += 0.0013 ) {
			near( evaluateEvents( events, 1 + t ), g_envelope.envelopeValueAt( e, t, 1 ), 1e-6 );
		}
	}
} );

test( "stopHoldEvent re-creates the attack ramp and sets other stages", () => {
	const e = env( { "duration": 0.5, "attackTime": 0.1, "releaseTime": 0.2 } );
	const inAttack = g_envelope.stopHoldEvent( e, 1, 1, 1.04 );
	assert.equal( inAttack.type, "linear" );
	assert.equal( inAttack.time, 1.04 );
	near( inAttack.value, 0.4 );
	const inSustain = g_envelope.stopHoldEvent( e, 1, 1, 1.3 );
	assert.equal( inSustain.type, "set" );
	near( inSustain.value, 1 );
	const inRelease = g_envelope.stopHoldEvent( e, 1, 1, 1.55 );
	assert.equal( inRelease.type, "set" );
	near( inRelease.value, g_envelope.envelopeValueAt( e, 0.55, 1 ) );
	const beforeStart = g_envelope.stopHoldEvent( e, 1, 1, 0.9 );
	assert.deepEqual( beforeStart, { "type": "set", "time": 0.9, "value": 0 } );

	// Replacing the cancelled attack event with the hold keeps the ramp's path
	const events = g_envelope.buildEnvelopeSchedule( e, 1, 1 );
	const kept = events.filter( event => event.time < 1.04 ).concat( [ inAttack ] );
	near( evaluateEvents( kept, 1.02 ), 0.2, 1e-9 );
} );

test( "applySchedule and scheduleEnvelope drive AudioParam methods", () => {
	const calls = [];
	const param = {
		"setValueAtTime": ( value, time ) => calls.push( [ "set", value, time ] ),
		"linearRampToValueAtTime": ( value, time ) => calls.push( [ "linear", value, time ] ),
		"setTargetAtTime": ( value, time, constant ) => {
			calls.push( [ "target", value, time, constant ] );
		}
	};
	const end = g_envelope.scheduleEnvelope(
		param, { "attackTime": 0.01, "releaseTime": 0.2 }, 1, 1.5, 0.5
	);
	near( end, 1.7 );
	assert.deepEqual( calls[ 0 ], [ "set", 0, 1 ] );
	assert.deepEqual( calls[ 1 ], [ "linear", 0.5, 1.01 ] );
	assert.equal( calls[ calls.length - 1 ][ 0 ], "set" );
	near( calls[ calls.length - 1 ][ 2 ], 1.7 );
} );
