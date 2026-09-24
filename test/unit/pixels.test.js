/**
 * SYS-005 and SYS-008 pixel readback and filter lifetimes against the real pixel modules.
 * The browser partner is pixel-disposal-browser.test.js.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_vm from "node:vm";
import * as g_harness from "./vm-module-harness.js";
const { test } = g_test;
const assert = g_assert;
const vm = g_vm;

for( const command of [ "getPixelAsync", "getAsync" ] ) {
	for( const asIndex of [ false, true ] ) {
		test( `SYS-005 ${command} rejects disposal with asIndex=${asIndex}`, async () => {
			const { pixels, screen, microtasks, calls } = g_harness.createPixelHarness();
			const promise = pixels[ command ]( screen, {
				"x": 0, "y": 0, "width": 2, "height": 2, "asIndex": asIndex
			} );
			let settlements = 0;
			const observed = promise.then( () => { settlements++; }, error => {
				settlements++;
				return error.code;
			} );
			screen.isRemoved = true;
			screen.gl = null;
			assert.doesNotThrow( () => microtasks.shift()() );
			assert.equal( await observed, "SCREEN_REMOVED" );
			assert.equal( settlements, 1 );
			assert.equal( calls.read, 0 );
			assert.equal( calls.convert, 0 );
		} );
	}

	test( `SYS-005 ${command} checks disposal before palette conversion`, async () => {
		const { pixels, screen, microtasks, calls } = g_harness.createPixelHarness();
		const promise = pixels[ command ]( screen, {
			"x": 0, "y": 0, "width": 2, "height": 2, "asIndex": true
		} );
		const rejected = assert.rejects( promise, { "code": "SCREEN_REMOVED" } );
		microtasks.shift()();
		screen.isRemoved = true;
		await rejected;
		assert.equal( calls.read, 1 );
		assert.equal( calls.convert, 0 );
	} );

	test( `SYS-005 ${command} propagates the original read failure`, async () => {
		const { pixels, screen, microtasks } = g_harness.createPixelHarness();
		const failure = new Error( "read failed" );
		screen.gl.readPixels = () => { throw failure; };
		const promise = pixels[ command ]( screen, {
			"x": 0, "y": 0, "width": 2, "height": 2
		} );
		const rejected = assert.rejects( promise, error => error === failure );
		assert.doesNotThrow( () => microtasks.shift()() );
		await rejected;
	} );
}

for( const command of [ "getPixelAsync", "getAsync" ] ) {
	for( const afterRead of [ false, true ] ) {
		test( `SYS-008 ${command} discards old-generation reads afterRead=${afterRead}`, async () => {
			const { pixels, screen, microtasks, calls } = g_harness.createPixelHarness();
			const promise = pixels[ command ]( screen, {
				"x": 0, "y": 0, "width": 2, "height": 2, "asIndex": false
			} );
			if( afterRead ) {
				microtasks.shift()();
			}
			// Simulate restoration before queued work or its conversion continuation executes.
			screen.contextGeneration = 1;
			while( microtasks.length ) { microtasks.shift()(); }
			const result = await promise;
			let colors = [ result ];
			if( command === "getAsync" ) { colors = result.flat(); }
			assert.ok( colors.every( color => color.r === 0 && color.a === 0 ) );
			assert.equal( calls.read, Number( afterRead ) );
		} );
	}
}

test( "SYS-008 filters queued before restoration never touch the new generation", () => {
	const { pixels, screen, microtasks, calls } = g_harness.createPixelHarness();
	let callbacks = 0;
	pixels.filterImg( screen, { "filter": () => { callbacks++; return true; } } );
	microtasks.shift()();
	screen.contextGeneration = 1;
	while( microtasks.length ) { microtasks.shift()(); }
	assert.equal( callbacks, 0 );
	assert.equal( calls.read, 0 );
	assert.equal( calls.upload, 0 );
} );

for( const timing of [ "immediate", "between microtasks", "inside callback", "live" ] ) {
	test( "SYS-005 filter lifetime: " + timing, () => {
		const { pixels, screen, microtasks, calls, dispose } = g_harness.createPixelHarness();
		let callbacks = 0;
		pixels.filterImg( screen, { "filter": () => {
			callbacks++;
			if( timing === "inside callback" ) {
				dispose();
			}
			return true;
		} } );
		if( timing === "between microtasks" ) {
			microtasks.shift()();
		}
		if( timing === "immediate" || timing === "between microtasks" ) {
			dispose();
		}
		while( microtasks.length ) {
			microtasks.shift()();
		}
		assert.equal( vm.runInContext( "m_activeFilters", pixels ).has( screen ), false );
		if( timing === "live" ) {
			assert.equal( callbacks, 4 );
			assert.equal( calls.upload, 1 );
			assert.equal( calls.dirty, 1 );
		} else {
			let expectedCallbacks = 0;
			if( timing === "inside callback" ) {
				expectedCallbacks = 1;
			}
			assert.equal( callbacks, expectedCallbacks );
			assert.equal( calls.upload, 0 );
			assert.equal( calls.dirty, 0 );
		}
	} );
}

test( "SYS-005 throwing filters release cancellation state and allow subsequent filtering", () => {
	const { pixels, screen, microtasks, calls } = g_harness.createPixelHarness();
	const failure = new Error( "filter failed" );
	pixels.filterImg( screen, { "filter": () => { throw failure; } } );
	microtasks.shift()();
	assert.throws( () => microtasks.shift()(), error => error === failure );
	assert.equal( vm.runInContext( "m_activeFilters", pixels ).has( screen ), false );
	assert.equal( calls.upload, 0 );
	assert.equal( calls.dirty, 0 );
	let callbacks = 0;
	pixels.filterImg( screen, { "filter": () => { callbacks++; return true; } } );
	while( microtasks.length ) {
		microtasks.shift()();
	}
	assert.equal( callbacks, 4 );
	assert.equal( calls.upload, 1 );
	assert.equal( calls.dirty, 1 );
} );
