/**
 * Pointer shared-event dispatch regressions against the real plugin module. Owned by the
 * pointer workstream.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./vm-module-harness.js";
const { test } = g_test;
const assert = g_assert;

test( "pointer dispatch snapshots exclude new listeners and once survives nested dispatch", () => {
	const module = g_harness.loadModule( "plugins/pointer/shared-events.js" );
	const helpers = module.createEventHelpers( { "utils": { "inRange": () => true } } );
	const listeners = {};
	const order = [];
	const on = ( fn, once = false ) => helpers.onevent(
		"move", fn, once, { "x": 0, "y": 0, "width": 8, "height": 8 },
		[ "move" ], "onmouse", listeners, null, null, "custom"
	);
	const dispatch = () => helpers.triggerEventListeners( "move", { "x": 1, "y": 1 }, listeners );
	on( ( data, custom ) => {
		assert.equal( custom, "custom" );
		order.push( "once" );
		on( () => order.push( "new" ) );
		dispatch();
	}, true );
	dispatch();
	assert.deepEqual( order, [ "once", "new" ] );
	helpers.offevent( "move", null, [ "move" ], "offmouse", listeners );
	dispatch();
	assert.equal( order.length, 2 );
} );

test( "pointer registration can be removed in the same turn", () => {
	const timers = [];
	const module = g_harness.loadModule( "plugins/pointer/shared-events.js", {
		"setTimeout": fn => timers.push( fn )
	} );
	const helpers = module.createEventHelpers( { "utils": {} } );
	const listeners = {};
	const fn = () => {};
	helpers.onevent( "move", fn, false, null, [ "move" ], "onmouse", listeners );
	assert.equal( helpers.offevent( "move", fn, [ "move" ], "offmouse", listeners ), true );
	for( const timer of timers ) {
		timer();
	}
	assert.equal( listeners.move, undefined );
} );
