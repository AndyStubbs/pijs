/**
 * SYS-004 and SYS-018 browser regressions against fresh in-memory full and lite bundles.
 * Run with node --test test/unit/audio-lifecycle-browser.test.js; no server is required.
 */
const { test, before, after } = require( "node:test" );
const assert = require( "node:assert/strict" );
const fs = require( "node:fs/promises" );
const path = require( "node:path" );
const esbuild = require( "esbuild" );
const { chromium } = require( "@playwright/test" );
const bundles = {};
let browser;
let audioBundle;

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
		"entryPoints": [ path.join( __dirname, "../../plugins/sound/index.js" ) ],
		"bundle": true, "write": false, "format": "iife", "target": "es2020"
	} );
	audioBundle = plugin.outputFiles[ 0 ].text;
	browser = await chromium.launch( { "headless": true } );
} );

after( async () => { await browser?.close(); } );

async function probe( bundle, fn, arg ) {
	const page = await browser.newPage();
	const errors = [];
	let timeout;
	page.on( "pageerror", error => errors.push( error.message ) );
	try {
		await page.setContent( "<!doctype html><html><body></body></html>" );
		await page.addScriptTag( { "content": bundles[ bundle ] } );
		if( bundle === "lite" ) {
			await page.addScriptTag( { "content": audioBundle } );
		}
		await page.evaluate( () => $.ready() );
		await page.evaluate( installAudioHarness );
		const result = await Promise.race( [
			page.evaluate( fn, arg ),
			new Promise( ( resolve, reject ) => {
				timeout = setTimeout( () => reject( new Error( "Audio scenario timed out" ) ), 10000 );
			} )
		] );
		// Cross a task boundary to observe errors from all queued microtasks.
		await page.evaluate( () => new Promise( resolve => setTimeout( resolve, 0 ) ) );
		assert.deepEqual( errors, [] );
		return result;
	} finally {
		clearTimeout( timeout );
		await page.close();
	}
}

/**
 * Control media events and retry timers while preserving the real readiness scheduler.
 */
function installAudioHarness() {
	const instances = [];
	const retries = new Map();
	const nativeSet = window.setTimeout;
	const nativeClear = window.clearTimeout;
	let timerId = -1;
	window.setTimeout = ( fn, delay, ...args ) => {
		if( delay === 100 ) {
			const id = timerId--;
			retries.set( id, fn );
			return id;
		}
		return nativeSet( fn, delay, ...args );
	};
	window.clearTimeout = id => {
		if( retries.delete( id ) ) { return; }
		nativeClear( id );
	};
	window.Audio = class extends EventTarget {
		constructor( src ) {
			super();
			this.src = src;
			this.error = { "code": 2 };
			this.listeners = new Map();
			this.pauses = 0;
			this.loads = 0;
			this.plays = 0;
			instances.push( this );
		}
		addEventListener( name, fn ) {
			this.listeners.set( name, fn );
			super.addEventListener( name, fn );
		}
		removeEventListener( name, fn ) {
			if( this.listeners.get( name ) === fn ) { this.listeners.delete( name ); }
			super.removeEventListener( name, fn );
		}
		pause() { this.pauses++; }
		play() { this.plays++; return Promise.resolve(); }
		removeAttribute( name ) { if( name === "src" ) { this.src = ""; } }
		load() {
			this.loads++;

			// Resetting media can deliver events; cleanup must have detached the listeners.
			this.dispatchEvent( new Event( "error" ) );
		}
	};
	let control;
	$.registerPlugin( {
		"name": "audio-lifecycle-control", "version": "1.0.0",
		"init": api => { control = api; }
	} );
	window.audioTest = {
		"instances": instances, "retries": retries, "control": control,
		"checkpoint": () => new Promise( resolve => nativeSet( resolve, 0 ) ),
		"retry": () => {
			const [ id, fn ] = retries.entries().next().value;
			retries.delete( id );
			fn();
		},
		"released": () => instances.every( audio => audio.src === "" && audio.loads > 0 &&
			audio.pauses > 0 && audio.listeners.size === 0 )
	};
}

for( const bundle of [ "full", "lite" ] ) {
	test( `SYS-004 ${bundle}: late events cannot release an unrelated readiness wait`, async () => {
		const result = await probe( bundle, async () => {
			const h = audioTest;
			const id = $.loadAudio( "one.wav" );
			const audio = h.instances[ 0 ];
			const ready = audio.listeners.get( "canplay" );
			const error = audio.listeners.get( "error" );
			audio.dispatchEvent( new Event( "canplay" ) );
			await $.ready();
			h.control.wait();
			let settlements = 0;
			const promise = $.ready().then( () => { settlements++; } );
			ready(); error();
			audio.dispatchEvent( new Event( "error" ) );
			await h.checkpoint();
			const pending = settlements;
			const retries = h.retries.size;
			$.removeAudio( id );
			await h.checkpoint();
			const afterRemoval = settlements;
			h.control.done();
			await promise;
			return [ pending, afterRemoval, settlements, retries, h.instances.length, h.released() ];
		} );
		assert.deepEqual( result, [ 0, 0, 1, 0, 1, true ] );
	} );

	for( const timing of [ "pending", "retry", "partial" ] ) {
		test( `SYS-018 ${bundle}: ${timing} removal cancels and isolates a replacement`, async () => {
			assert.deepEqual( await probe( bundle, removalScenario, timing ),
				[ 0, 0, 1, 1, 3, true ] );
		} );
	}

	test( `SYS-004 ${bundle}: retry success and terminal failure settle independently`, async () => {
		const result = await probe( bundle, async () => {
			const h = audioTest;
			const id = $.loadAudio( "retry.wav", "mixed", 2 );
			let settled = false;
			const promise = $.ready().then( () => { settled = true; } );
			const oldReady = h.instances[ 0 ].listeners.get( "canplay" );
			h.instances[ 0 ].dispatchEvent( new Event( "error" ) );
			oldReady();
			h.retry();
			h.instances[ 2 ].dispatchEvent( new Event( "canplay" ) );
			$.playAudio( id );
			await h.checkpoint();
			const pending = settled;
			h.instances[ 1 ].error = null;
			h.instances[ 1 ].dispatchEvent( new Event( "error" ) );
			await promise;
			const plays = h.instances[ 2 ].plays;
			$.removeAudio( id );
			return [ pending, settled, plays, h.retries.size, h.released() ];
		} );
		assert.deepEqual( result, [ false, true, 1, 0, true ] );
	} );
}

async function removalScenario( timing ) {
	const h = audioTest;
	const id = $.loadAudio( "old.wav", "reuse", 2 );
	const callbacks = h.instances.flatMap( audio => Array.from( audio.listeners.values() ) );
	if( timing === "retry" ) {
		h.instances[ 0 ].dispatchEvent( new Event( "error" ) );
		callbacks.push( h.retries.values().next().value );
	}
	if( timing === "partial" ) {
		h.instances[ 0 ].dispatchEvent( new Event( "canplay" ) );
		$.playAudio( id, 1, 0, 10 );
	}
	let settlements = 0;
	const promise = $.ready().then( () => { settlements++; } );
	$.removeAudio( id );
	$.loadAudio( "new.wav", "reuse" );
	for( const callback of callbacks ) { callback(); }
	await h.checkpoint();
	const pending = settlements;
	const retries = h.retries.size;
	h.instances[ 2 ].dispatchEvent( new Event( "canplay" ) );
	await promise;
	$.playAudio( "reuse" );
	const plays = h.instances[ 2 ].plays;
	$.removeAudio( "reuse" );
	await $.ready();
	return [ pending, retries, settlements, plays, h.instances.length, h.released() ];
}
