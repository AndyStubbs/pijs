/**
 * Unit tests for the shared near() assertion in test/unit/assert-near.js.
 */
import * as g_assert from "node:assert/strict";
import * as g_test from "node:test";
import * as g_assertNear from "./assert-near.js";
const assert = g_assert;
const test = g_test.test;
const near = g_assertNear.near;

test( "near() accepts differences up to the tolerance, 1e-9 by default", () => {
	near( 1, 1 );
	near( 0.1 + 0.2, 0.3 );
	near( 1 + 5e-10, 1 );
	near( -2, -2.5, 0.5 );
	near( 3, 2, 1 );
} );

test( "near() fails beyond the tolerance, with both values and the tolerance", () => {
	assert.throws( () => near( 1 + 1e-8, 1 ), {
		"name": "AssertionError",
		"message": `${1 + 1e-8} is not within 1e-9 of 1`
	} );
	assert.throws( () => near( 0.3, 0.1, 0.1 ), {
		"message": "0.3 is not within 0.1 of 0.1"
	} );
	assert.throws( () => near( 0.1, 0.3, 0.1 ), {
		"message": "0.1 is not within 0.1 of 0.3"
	} );
	assert.throws( () => near( 1e-11, 0, 1e-12 ), {
		"message": "1e-11 is not within 1e-12 of 0"
	} );
} );

test( "near() fails for NaN on either side", () => {
	assert.throws( () => near( NaN, 0, Infinity ), {
		"message": "NaN is not within Infinity of 0"
	} );
	assert.throws( () => near( 0, NaN ), { "message": "0 is not within 1e-9 of NaN" } );
} );
