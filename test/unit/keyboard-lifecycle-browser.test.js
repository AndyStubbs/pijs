/**
 * SYS-003 and SYS-011 browser regressions against fresh in-memory full and lite bundles: what a
 * browser adds to the Node tests in keyboard-lifecycle.test.js, which are real KeyboardEvent
 * dispatch, prompt rendering at its owner's cursor, and drawing after a prompt's screen is
 * removed. Run with node --test test/unit/keyboard-lifecycle-browser.test.js; no server is
 * required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./browser-source-harness.js";
const { test } = g_test;
const assert = g_assert;

const { probe } = g_harness.useBrowserBundles( {
	"litePlugins": [ "keyboard" ],
	"timeout": 10000
} );

for( const bundle of g_harness.BUNDLES ) {
	test( `SYS-003 ${bundle}: nonactive owner renders at its own cursor`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const owner = $.screen( "160x80" );
			owner.setPosPx( 8, 16 );
			const other = $.screen( "160x80" );
			other.setPosPx( 24, 32 );
			const before = [ owner.getPosPx(), other.getPosPx() ];
			const prints = [];
			const print = owner.print;
			owner.print = ( ...args ) => { prints.push( owner.getPosPx() ); return print( ...args ); };
			const pending = owner.input( "Name?" );
			window.dispatchEvent( new KeyboardEvent( "keydown", { "key": "x", "code": "KeyX" } ) );
			const after = [ owner.getPosPx(), other.getPosPx() ];
			other.removeScreen();
			window.dispatchEvent( new KeyboardEvent( "keydown", { "key": "Enter", "code": "Enter" } ) );
			return [ before, after, prints, await pending ];
		} ), [
			[ { "x": 8, "y": 16 }, { "x": 24, "y": 32 } ],
			[ { "x": 8, "y": 16 }, { "x": 24, "y": 32 } ],
			[ { "x": 8, "y": 16 }, { "x": 8, "y": 16 } ], "x"
		] );
	} );

	test( `SYS-003 ${bundle}: throwing disposal callback can start another prompt`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const survivor = $.screen( "160x80" );
			const owner = $.screen( "160x80" );
			let replacement;
			let calls = 0;
			let removedError;
			const pending = owner.input( "Name?", () => {
				calls++;
				try { owner.input( "Removed?" ); } catch( error ) { removedError = error.code; }
				replacement = survivor.input( "Next?" );
				throw new Error( "expected disposal callback" );
			} );
			owner.removeScreen();
			window.dispatchEvent( new KeyboardEvent( "keydown", { "key": "z", "code": "KeyZ" } ) );
			window.dispatchEvent( new KeyboardEvent( "keydown", { "key": "Enter", "code": "Enter" } ) );
			survivor.setColor( "red" );
			survivor.pset( 0, 0 );
			const pixel = survivor.getPixel( 0, 0 );
			return [ await pending, await replacement, calls, removedError, pixel.r ];
		}, undefined, { "errors": [ "expected disposal callback" ] } ),
		[ null, "z", 1, "SCREEN_REMOVED", 255 ] );
	} );

	test( `SYS-011 ${bundle}: reentrant once and throwing keyup preserve state`, async () => {
		assert.deepEqual( await probe( bundle, () => {
			function key( name, mode = "keydown" ) {
				const event = new KeyboardEvent( mode, {
					"key": name, "code": "Key" + name.toUpperCase(), "cancelable": true
				} );
				window.dispatchEvent( event );
				return event.defaultPrevented;
			}
			let once = 0;
			$.onkey( [ "KeyA", "b" ], "down", () => {
				once++;
				if( once === 1 ) { key( "a" ); }
			}, true );
			key( "b" ); key( "a" ); key( "a" );
			const seen = [];
			$.setActionKeys( [ "a" ] );
			$.onkey( "KeyA", "up", () => { throw new Error( "expected key code callback" ); }, true );
			$.onkey( "a", "up", () => seen.push( "key" ) );
			$.onkey( "any", "up", () => { throw new Error( "expected any callback" ); }, true );
			$.onkey( "any", "up", data => seen.push( data.key ) );
			const prevented = key( "a", "keyup" );
			const released = $.inkey( "KeyA" ) === null && $.inkey( "a" ) === null;
			$.onkey( "a", "up", () => key( "a" ), true );
			key( "a" );
			key( "a", "keyup" );
			return [ once, seen, prevented, released, $.inkey( "a" ) !== null ];
		}, undefined, {
			"errors": [ "expected key code callback", "expected any callback" ]
		} ),
		[ 1, [ "key", "a", "key", "a" ], true, true, true ] );
	} );
}
