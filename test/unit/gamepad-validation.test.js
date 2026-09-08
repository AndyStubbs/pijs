/**
 * SYS-021 sensitivity regressions against the actual gamepad plugin with controlled polling.
 */
"use strict";

const { test } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs" );
const path = require( "node:path" );
const vm = require( "node:vm" );

function createHarness() {
	const commands = {};
	const frames = new Map();
	let nextFrame = 0;
	const pad = { "index": 0, "id": "test-pad", "connected": true, "mapping": "standard",
		"timestamp": 0, "axes": [ 0.5, -0.5, 0.1, -0.1, 0, 1, -1 ], "buttons": [] };
	const context = vm.createContext( {
		"window": { "addEventListener": () => {} },
		"navigator": { "getGamepads": () => [ pad ] },
		"requestAnimationFrame": fn => { frames.set( ++nextFrame, fn ); return nextFrame; },
		"cancelAnimationFrame": id => frames.delete( id )
	} );
	const source = fs.readFileSync( path.join( __dirname, "../../plugins/gamepad/index.js" ),
		"utf8" ).replace( "export default function", "function" );
	vm.runInContext( source, context, { "filename": "plugins/gamepad/index.js" } );
	context.gamepadPlugin( {
		"addCommand": ( name, fn ) => { commands[ name ] = fn; },
		"registerClearEvents": () => {}
	} );
	function poll() {
		assert.equal( frames.size, 1 );
		const [ id, fn ] = frames.entries().next().value;
		frames.delete( id );
		fn();

		// The loop advances its tick after updating; this read polls on the new tick.
		return Array.from( commands.ingamepad( { "gamepadIndex": 0 } ).axes );
	}
	commands.ingamepad( { "gamepadIndex": 0 } );
	return { "commands": commands, "pad": pad, "poll": poll };
}

function checkAxes( actual, expected ) {
	assert.equal( actual.length, expected.length );
	for( let i = 0; i < expected.length; i++ ) {
		assert.ok( Number.isFinite( actual[ i ] ) );
		assert.ok( Math.abs( actual[ i ] - expected[ i ] ) < 1e-10,
			`Axis ${i}: expected ${expected[ i ]}, received ${actual[ i ]}` );
	}
}

const invalidValues = [ NaN, Infinity, -Infinity, -0.01, 1.01, "0.2", null, undefined,
	true, false, {}, [], [ 0.2 ], new Number( 0.2 ), 0n, Symbol( "sensitivity" ) ];

for( const [ index, value ] of invalidValues.entries() ) {
	test( `SYS-021 invalid sensitivity ${index} (${String( value )}) preserves polling`, () => {
		const h = createHarness();
		h.commands.setGamepadSensitivity( { "sensitivity": 0.25 } );
		checkAxes( h.poll(), [ 1 / 3, -1 / 3, 0, 0, 0, 1, -1 ] );
		assert.throws( () => h.commands.setGamepadSensitivity( { "sensitivity": value } ), {
			"name": "TypeError", "code": "INVALID_PARAMETERS",
			"message": "setGamepadSensitivity: sensitivity must be a number between 0 and 1."
		} );
		h.pad.axes = [ 0.625, -0.625, 0.2, -0.2, 0, 1, -1 ];
		checkAxes( h.poll(), [ 0.5, -0.5, 0, 0, 0, 1, -1 ] );
	} );
}

test( "SYS-021 rejected NaN cannot contaminate a subsequent axis update", () => {
	const h = createHarness();
	h.commands.setGamepadSensitivity( { "sensitivity": 0.25 } );

	// Check state preservation independently of whether validation throws.
	try { h.commands.setGamepadSensitivity( { "sensitivity": NaN } ); } catch {}
	checkAxes( h.poll(), [ 1 / 3, -1 / 3, 0, 0, 0, 1, -1 ] );
} );

test( "SYS-021 default, fractional and boundary sensitivities retain finite axis output", () => {
	const h = createHarness();
	checkAxes( h.poll(), [ 0.375, -0.375, 0, 0, 0, 1, -1 ] );
	for( const value of [ 0, -0 ] ) {
		h.commands.setGamepadSensitivity( { "sensitivity": value } );
		checkAxes( h.poll(), [ 0.5, -0.5, 0.1, -0.1, 0, 1, -1 ] );
	}
	h.commands.setGamepadSensitivity( { "sensitivity": 0.5 } );
	checkAxes( h.poll(), [ 0, 0, 0, 0, 0, 1, -1 ] );
	h.commands.setGamepadSensitivity( { "sensitivity": 1 } );
	h.pad.axes = [ 0.999995, -0.999995, 0.5, -0.5, 0, 1, -1 ];
	checkAxes( h.poll(), [ 0.5, -0.5, 0, 0, 0, 1, -1 ] );
} );
