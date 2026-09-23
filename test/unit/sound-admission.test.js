/**
 * Unit tests for occupancy-interval admission and live-voice cleanup order in
 * plugins/sound/voices.js. Both are pure functions, so no AudioContext is needed.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_voices from "../../plugins/sound/voices.js";
const assert = g_assert;
const test = g_test.test;

let m_order = 0;

function holder( start, end, isProtected = false ) {
	m_order += 1;
	return { "start": start, "end": end, "order": m_order, "protected": isProtected };
}

function fill( count, start, end, isProtected = false ) {
	const holders = [];
	for( let i = 0; i < count; i++ ) {
		holders.push( holder( start, end, isProtected ) );
	}
	return holders;
}

test( "admits without stealing below the slot limit", () => {
	const holders = fill( 63, 0, 10 );
	const plan = g_voices.planAdmission( holders, 1, 2, 64 );
	assert.equal( plan.admit, true );
	assert.deepEqual( plan.victims, [] );
} );

test( "steals the oldest unprotected holder at the conflict time", () => {
	const holders = fill( 64, 0, 10 );
	const plan = g_voices.planAdmission( holders, 1, 2, 64 );
	assert.equal( plan.admit, true );
	assert.equal( plan.victims.length, 1 );
	assert.equal( plan.victims[ 0 ].holder, holders[ 0 ] );
	assert.equal( plan.victims[ 0 ].conflict, 1 );
} );

test( "a long sustained voice is not stolen for holders that end before the start", () => {
	const sustained = holder( 0, 100 );
	const short = fill( 63, 0, 0.5 );
	const plan = g_voices.planAdmission( [ sustained, ...short ], 1, 2, 64 );
	assert.equal( plan.admit, true );
	assert.deepEqual( plan.victims, [] );
} );

test( "an immediate long voice counts short voices scheduled ahead", () => {

	// 64 short voices start at 5 s; the incoming long voice starts now and overlaps them
	const ahead = fill( 64, 5, 5.2 );
	const plan = g_voices.planAdmission( ahead, 0, 10, 64 );
	assert.equal( plan.admit, true );
	assert.equal( plan.victims.length, 1 );
	assert.equal( plan.victims[ 0 ].conflict, 5 );
	assert.equal( plan.victims[ 0 ].holder, ahead[ 0 ] );
} );

test( "conflicts later in the interval can need further victims", () => {
	const early = fill( 64, 0, 3 );
	const late = fill( 2, 2, 4 );
	const plan = g_voices.planAdmission( [ ...early, ...late ], 1, 5, 64 );
	assert.equal( plan.admit, true );

	// One victim at 1 s makes room; at 2 s two more holders start
	assert.deepEqual( plan.victims.map( victim => victim.conflict ), [ 1, 2, 2 ] );
	assert.deepEqual(
		plan.victims.map( victim => victim.holder ), [ early[ 0 ], early[ 1 ], early[ 2 ] ]
	);
} );

test( "protected holders are never victims; protected-only capacity rejects", () => {
	const loops = fill( 64, 0, Infinity, true );
	const rejected = g_voices.planAdmission( loops, 1, 2, 64 );
	assert.equal( rejected.admit, false );
	assert.deepEqual( rejected.victims, [] );

	const mixed = [ ...fill( 63, 0, Infinity, true ), holder( 0.5, 3 ) ];
	const plan = g_voices.planAdmission( mixed, 1, 2, 64 );
	assert.equal( plan.admit, true );
	assert.equal( plan.victims[ 0 ].holder, mixed[ 63 ] );
} );

test( "an unresolvable multi-victim admission is rejected without victims", () => {

	// The first conflict at 1 s can be resolved, but at 2 s only protected holders remain
	const stealable = holder( 0, 10 );
	const loops = fill( 63, 0, Infinity, true );
	const lateLoop = holder( 2, Infinity, true );
	const plan = g_voices.planAdmission( [ stealable, ...loops, lateLoop ], 1, 5, 64 );
	assert.equal( plan.admit, false );
	assert.deepEqual( plan.victims, [] );
} );

test( "cleanup order spends silent and quiet voices first", () => {
	const now = 1;
	const lead = 1.01;
	const silentRetiring = {
		"begin": 1.5, "end": 2, "order": 5, "stopKind": "steal", "fadeStart": 1.9,
		"protected": false
	};
	const stoppingLate = {
		"begin": 0, "end": 1.02, "order": 1, "stopKind": "stop", "fadeStart": 1.01,
		"protected": false
	};
	const stoppingEarly = {
		"begin": 0, "end": 1.015, "order": 2, "stopKind": "stop", "fadeStart": 1.005,
		"protected": false
	};
	const audibleRetiring = {
		"begin": 0.5, "end": 1.5, "order": 3, "stopKind": "steal", "fadeStart": 1.49,
		"protected": false
	};
	const active = {
		"begin": 0.2, "end": 5, "order": 4, "stopKind": null, "fadeStart": null,
		"protected": false
	};
	const olderActive = { ...active, "order": 0 };
	const protectedLoop = {
		"begin": 0, "end": Infinity, "order": -1, "stopKind": null, "fadeStart": null,
		"protected": true
	};
	const scheduled = {
		"begin": 1.5, "end": 2, "order": -2, "stopKind": null, "fadeStart": null,
		"protected": false
	};

	let voices = [
		protectedLoop, scheduled, active, olderActive, audibleRetiring, stoppingLate,
		stoppingEarly, silentRetiring
	];
	const picks = [];
	for( let i = 0; i < 6; i++ ) {
		const pick = g_voices.chooseCleanup( voices, now, lead );
		picks.push( pick );
		voices = voices.filter( voice => voice !== pick );
	}
	assert.deepEqual( picks, [
		silentRetiring, stoppingEarly, stoppingLate, audibleRetiring, olderActive, active
	] );

	// Only protected and scheduled voices remain: reject
	assert.equal( g_voices.chooseCleanup( voices, now, lead ), null );
} );

test( "finished voices awaiting disposal are cleaned up before audible voices", () => {
	const finished = {
		"begin": 0, "end": 0.9, "order": 9, "stopKind": null, "fadeStart": null,
		"protected": false
	};
	const active = {
		"begin": 0, "end": 3, "order": 0, "stopKind": null, "fadeStart": null,
		"protected": false
	};
	assert.equal( g_voices.chooseCleanup( [ active, finished ], 1, 1.01 ), finished );
} );

test( "voice state is derived from stop kind, fade start, and the lead", () => {
	const voice = { "begin": 2, "stopKind": null, "fadeStart": null };
	assert.equal( g_voices.getVoiceState( voice, 1, 1.01 ), "scheduled" );
	assert.equal( g_voices.getVoiceState( voice, 2, 2.01 ), "active" );
	assert.equal(
		g_voices.getVoiceState( { ...voice, "stopKind": "steal", "fadeStart": 3 }, 2.5, 2.51 ),
		"retiring"
	);
	assert.equal(
		g_voices.getVoiceState( { ...voice, "stopKind": "steal", "fadeStart": 3 }, 3, 3.01 ),
		"stopping"
	);
	assert.equal(
		g_voices.getVoiceState( { ...voice, "stopKind": "stop", "fadeStart": 3 }, 2.5, 2.51 ),
		"stopping"
	);
} );
