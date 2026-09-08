/**
 * SYS-003 and SYS-011 browser regressions against fresh in-memory full and lite bundles.
 * Run with node --test test/unit/keyboard-lifecycle-browser.test.js; no server is required.
 */
const { test, before, after } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs/promises" );
const path = require( "node:path" );
const esbuild = require( "esbuild" );
const { chromium } = require( "@playwright/test" );
const bundles = {};
let browser;
let keyboardBundle;

before( async () => {
	for( const [ name, entry ] of [ [ "full", "index-full.js" ], [ "lite", "index.js" ] ] ) {
		const result = await esbuild.build( {
			"entryPoints": [ path.join( __dirname, "../../src", entry ) ],
			"bundle": true, "write": false, "format": "iife", "target": "es2020",
			"define": { "__VERSION__": JSON.stringify( require( "../../package.json" ).version ) },
			"loader": { ".vert": "text", ".frag": "text" },
			"plugins": [ {
				"name": "test-font-data",
				"setup": build => {
					build.onLoad( { "filter": /\.webp$/ }, async args => {
						const data = await fs.readFile( args.path );
						const font = { "data": "data:image/webp;base64," + data.toString( "base64" ) };
						return { "contents": "export default " + JSON.stringify( font ),
							"loader": "js" };
					} );
				}
			} ]
		} );
		bundles[ name ] = result.outputFiles[ 0 ].text;
	}
	const plugin = await esbuild.build( {
		"entryPoints": [ path.join( __dirname, "../../plugins/keyboard/index.js" ) ],
		"bundle": true, "write": false, "format": "iife", "target": "es2020"
	} );
	keyboardBundle = plugin.outputFiles[ 0 ].text;
	browser = await chromium.launch( { "headless": true } );
} );

after( async () => { await browser?.close(); } );

async function probe( bundle, fn, expectedErrors = [] ) {
	const page = await browser.newPage();
	const errors = [];
	let timeout;
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.setContent( "<!doctype html><html><body></body></html>" );
		await page.addScriptTag( { "content": bundles[ bundle ] } );
		if( bundle === "lite" ) {
			await page.addScriptTag( { "content": keyboardBundle } );
		}
		await page.evaluate( () => $.ready() );
		const result = await Promise.race( [
			page.evaluate( fn ),
			new Promise( ( resolve, reject ) => {
				timeout = setTimeout( () => reject( new Error( "Input scenario timed out" ) ), 10000 );
			} )
		] );
		// Cross a task boundary to observe errors from all queued microtasks.
		await page.evaluate( () => new Promise( resolve => setTimeout( resolve, 0 ) ) );
		assert.deepEqual( errors, expectedErrors );
		return result;
	} finally {
		clearTimeout( timeout );
		await page.close();
	}
}

for( const bundle of [ "full", "lite" ] ) {
	test( `SYS-003 ${bundle}: disposal before and after blinking releases resources`, async () => {
		const result = await probe( bundle, async () => {
			const intervals = new Map();
			const originalSet = window.setInterval;
			const originalClear = window.clearInterval;
			window.setInterval = ( fn, delay ) => {
				const id = originalSet( fn, delay );
				intervals.set( id, fn );
				return id;
			};
			window.clearInterval = id => { intervals.delete( id ); originalClear( id ); };
			const results = [];
			for( const blink of [ false, true ] ) {
				const survivor = $.screen( "160x80" );
				const owner = $.screen( "160x80" );
				let imageName;
				const capture = owner.createImageFromScreen;
				owner.createImageFromScreen = options => {
					imageName = options.name;
					return capture( options );
				};
				const values = [];
				const promise = owner.input( "Name?", value => values.push( value ) );
				if( blink ) {
					const now = Date.now;
					const later = now() + 600;
					Date.now = () => later;
					for( const tick of intervals.values() ) { tick(); }
					Date.now = now;
				}
				owner.removeScreen();
				let missing = false;
				try { $.getImage( imageName ); } catch( error ) { missing = true; }
				const pending = intervals.size;
				const settled = await promise;
				const next = survivor.input( "Again?" );
				window.dispatchEvent( new KeyboardEvent( "keydown", { "key": "x", "code": "KeyX" } ) );
				window.dispatchEvent( new KeyboardEvent( "keydown", { "key": "Enter", "code": "Enter" } ) );
				results.push( [ settled, values, missing, pending, await next, intervals.size ] );
				survivor.removeScreen();
			}
			await new Promise( resolve => setTimeout( resolve, 150 ) );
			return results;
		} );
		assert.deepEqual( result, [
			[ null, [ null ], true, 0, "x", 0 ], [ null, [ null ], true, 0, "x", 0 ]
		] );
	} );

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
		}, [ "expected disposal callback" ] ), [ null, "z", 1, "SCREEN_REMOVED", 255 ] );
	} );

	test( `SYS-003 ${bundle}: newest callback input supersedes an outer replacement`, async () => {
		assert.deepEqual( await probe( bundle, async () => {
			const screen = $.screen( "160x80" );
			let newest;
			const oldest = screen.input( "Old?", () => { newest = screen.input( "Newest?" ); } );
			const outer = screen.input( "Outer?" );
			window.dispatchEvent( new KeyboardEvent( "keydown", { "key": "n", "code": "KeyN" } ) );
			window.dispatchEvent( new KeyboardEvent( "keydown", { "key": "Enter", "code": "Enter" } ) );
			return [ await oldest, await outer, await newest ];
		} ), [ null, null, "n" ] );
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
		}, [ "expected key code callback", "expected any callback" ] ),
		[ 1, [ "key", "a", "key", "a" ], true, true, true ] );
	} );
}
