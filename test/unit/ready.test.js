/**
 * SYS-002 ready queue regressions against the real command module: DOM readiness, resource
 * waits, callback failures and reentrancy, and callback validation.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./vm-module-harness.js";
const { test } = g_test;
const assert = g_assert;

test( "SYS-002 ready failures reject independently and preserve unrelated waiters", async () => {
	const { commands, flush } = g_harness.createReadyHarness();
	const error = new Error( "expected ready failure" );
	const order = [];
	const outcomes = [];
	const callbacks = [
		() => { order.push( "first" ); throw error; },
		() => { order.push( "second" ); return 42; },
		null,
		() => { order.push( "third" ); throw null; },
		() => { order.push( "fourth" ); }
	];
	for( const [ index, callback ] of callbacks.entries() ) {
		commands.ready( { "callback": callback } ).then(
			value => { outcomes[ index ] = { "status": "fulfilled", "value": value }; },
			reason => { outcomes[ index ] = { "status": "rejected", "reason": reason }; }
		);
	}
	assert.deepEqual( order, [] );
	assert.doesNotThrow( flush );
	assert.deepEqual( order, [ "first", "second", "third", "fourth" ] );
	await Promise.resolve();
	assert.deepEqual( outcomes, [
		{ "status": "rejected", "reason": error },
		{ "status": "fulfilled", "value": undefined },
		{ "status": "fulfilled", "value": undefined },
		{ "status": "rejected", "reason": null },
		{ "status": "fulfilled", "value": undefined }
	] );
	assert.equal( outcomes[ 0 ].reason, error );
	let laterResolved = false;
	commands.ready( {} ).then( () => { laterResolved = true; } );
	flush();
	await Promise.resolve();
	assert.equal( laterResolved, true );
	flush();
	assert.deepEqual( order, [ "first", "second", "third", "fourth" ] );
} );

test( "SYS-002 reentrant ready callbacks run on a subsequent check", async () => {
	const { commands, flush } = g_harness.createReadyHarness();
	const order = [];
	let nestedResolved = false;
	commands.ready( { "callback": () => {
		order.push( "outer" );
		commands.ready( { "callback": () => order.push( "nested" ) } ).then( () => {
			nestedResolved = true;
		} );
	} } );
	commands.ready( { "callback": () => order.push( "sibling" ) } );
	assert.deepEqual( order, [] );
	flush();
	await Promise.resolve();
	assert.deepEqual( order, [ "outer", "sibling" ] );
	assert.equal( nestedResolved, false );
	flush();
	await Promise.resolve();
	assert.deepEqual( order, [ "outer", "sibling", "nested" ] );
	assert.equal( nestedResolved, true );
	flush();
	assert.equal( order.length, 3 );
} );

test( "SYS-002 ready still waits for document readiness and every resource", async () => {
	const { commands, listeners, flush } = g_harness.createReadyHarness( "loading" );
	let calls = 0;
	let resolved = false;
	commands.ready( { "callback": () => { calls++; } } ).then( () => { resolved = true; } );
	flush();
	await Promise.resolve();
	assert.equal( calls, 0 );
	assert.equal( resolved, false );
	commands.wait();
	commands.wait();
	listeners.DOMContentLoaded();
	flush();
	await Promise.resolve();
	assert.equal( calls, 0 );
	assert.equal( resolved, false );
	commands.done();
	flush();
	await Promise.resolve();
	assert.equal( calls, 0 );
	assert.equal( resolved, false );
	commands.done();
	assert.equal( calls, 0 );
	flush();
	await Promise.resolve();
	assert.equal( calls, 1 );
	assert.equal( resolved, true );
} );

test( "SYS-002 ready ignores async callback completion", async () => {
	const { commands, flush } = g_harness.createReadyHarness();
	let completeCallback;
	const pending = new Promise( resolve => { completeCallback = resolve; } );
	let callbackCompleted = false;
	const outcomes = [];
	commands.ready( { "callback": async () => {
		await pending;
		callbackCompleted = true;
		return 42;
	} } ).then( value => outcomes.push( value ) );
	flush();
	await Promise.resolve();
	assert.deepEqual( outcomes, [ undefined ] );
	assert.equal( callbackCompleted, false );
	completeCallback();
	await Promise.resolve();
	assert.equal( callbackCompleted, true );
	assert.deepEqual( outcomes, [ undefined ] );
} );

test( "SYS-002 invalid ready callbacks still throw synchronously", () => {
	const { commands, flush } = g_harness.createReadyHarness();
	for( const callback of [ false, 0, "callback", {}, [] ] ) {
		assert.throws( () => commands.ready( { "callback": callback } ), {
			"name": "TypeError", "code": "INVALID_CALLBACK"
		} );
	}
	assert.doesNotThrow( flush );
} );
