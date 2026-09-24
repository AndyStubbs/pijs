/**
 * Self-tests for the corner checker used by the shader_orientation_01 visual fixture: it must
 * accept small readback differences and reject flipped corners and transparency.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_vm from "node:vm";
import * as g_harness from "./vm-module-harness.js";
const { test } = g_test;
const assert = g_assert;

function loadChecker() {
	const window = {};
	g_vm.runInNewContext( g_fs.readFileSync(
		g_path.join( g_harness.ROOT, "test/tests/patch-shader-checks.js" ), "utf8"
	), { "window": window } );
	return window.checkPatchShaderPixel;
}

test( "shader corner checks accept exact and rounded pixels", () => {
	const check = loadChecker();
	const corners = [ [ 255, 0, 0 ], [ 0, 255, 0 ], [ 0, 0, 255 ], [ 255, 255, 0 ] ];
	for( const [ corner, rgb ] of corners.entries() ) {
		assert.doesNotThrow( () => check( [ ...rgb, 255 ], corner, "exact" ) );
		const rounded = rgb.map( value => Math.min( 254, value + 1 ) );
		assert.doesNotThrow( () => check( [ ...rounded, 255 ], corner, "rounding" ) );
	}
} );

test( "shader corner checks reject a wrong corner and transparency", () => {
	const check = loadChecker();
	assert.throws( () => check( [ 0, 0, 255, 255 ], 0, "draw 0" ), {
		"message": "draw 0: corner 0 is 0,0,255,255"
	} );
	assert.throws( () => check( [ 255, 0, 0, 254 ], 0, "draw 1" ), /draw 1: corner 0/ );
	assert.throws( () => check( [ 251, 0, 0, 255 ], 0, "draw 2" ), /draw 2: corner 0/ );
} );
