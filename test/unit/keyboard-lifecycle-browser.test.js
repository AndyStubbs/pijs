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

const { probe, open } = g_harness.useBrowserBundles( {
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

	test( `KEY-001 ${bundle}: native keys released with a different value are not held (K1n)`,
		async () => {
			const { page, errors } = await open( bundle );
			try {
				await page.evaluate( () => $.ready() );
				const keyboard = page.keyboard;
				const held = () => page.evaluate( () => [
					$.inkey( "A" ) !== null, $.inkey( "KeyA" ) !== null,
					$.inkey( "w" ) !== null, $.inkey( "W" ) !== null, $.inkey().length
				] );
				await keyboard.down( "Shift" );
				await keyboard.down( "KeyA" );
				const whileHeld = await page.evaluate( () => $.inkey( "A" )?.code );
				await keyboard.up( "Shift" );
				await keyboard.up( "KeyA" );
				const afterA = await held();
				await keyboard.down( "KeyW" );
				await keyboard.down( "Shift" );
				await keyboard.up( "KeyW" );
				await keyboard.up( "Shift" );
				assert.equal( whileHeld, "KeyA" );
				assert.deepEqual( afterA, [ false, false, false, false, 0 ] );
				assert.deepEqual( await held(), [ false, false, false, false, 0 ] );
				assert.deepEqual( errors, [] );
			} finally {
				await page.close();
			}
		} );

	test( `KEY-003 ${bundle}: native keys typed into a prompt stay in the prompt (K9n)`,
		async () => {
			const { page, errors } = await open( bundle, { "html": "<!doctype html><html><body>" +
				"<button>Button</button><div style=\"height:3000px\"></div></body></html>" } );
			try {
				await page.evaluate( () => {
					$.screen( { "aspect": "160x80", "noCss": true } );
					window.__value = "pending";
					$.input( "?" ).then( value => { window.__value = value; } );
				} );
				const keyboard = page.keyboard;
				await keyboard.press( "Space" );
				await keyboard.press( "Tab" );
				await keyboard.press( "KeyA" );
				await keyboard.press( "Control+KeyV" );
				await keyboard.press( "Enter" );
				const result = await page.evaluate( () => [
					window.__value, Math.round( window.scrollY ),
					document.activeElement === document.body
				] );
				assert.deepEqual( result, [ " a", 0, true ] );
				assert.deepEqual( errors, [] );
			} finally {
				await page.close();
			}
		} );

	test( `KEY-004 ${bundle}: keys typed into a shadow-root input are ignored (K12)`, async () => {
		const { page, errors } = await open( bundle );
		try {
			await page.evaluate( () => {
				const host = document.createElement( "div" );
				document.body.appendChild( host );
				const input = document.createElement( "input" );
				host.attachShadow( { "mode": "open" } ).appendChild( input );
				window.__calls = [];
				$.onkey( "KeyA", "down", () => window.__calls.push( "KeyA" ) );
				input.focus();
			} );
			await page.keyboard.down( "KeyA" );
			const whileTyping = await page.evaluate( () => [
				window.__calls.length, $.inkey( "KeyA" ) !== null,
				document.activeElement.shadowRoot.activeElement.value
			] );
			await page.keyboard.up( "KeyA" );
			await page.evaluate( () => document.activeElement.blur() );
			await page.keyboard.press( "KeyA" );
			const afterBlur = await page.evaluate( () => window.__calls.length );
			assert.deepEqual( whileTyping, [ 0, false, "a" ] );
			assert.equal( afterBlur, 1, "keys outside the input are game input" );
			assert.deepEqual( errors, [] );
		} finally {
			await page.close();
		}
	} );
}
