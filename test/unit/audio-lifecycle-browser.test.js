/**
 * SYS-004 and SYS-018 browser regressions against fresh in-memory full and lite bundles.
 * Runs in every engine from audio-engines.js. Run with
 * node --test test/unit/audio-lifecycle-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_audioEngines from "./audio-engines.js";
import * as g_sourceHarness from "./browser-source-harness.js";
const { test, describe, before, after } = g_test;
const assert = g_assert;

const bundles = {};
const browsers = {};
const pages = {};
let audioBundle;

before( async () => {
	bundles.full = await g_sourceHarness.buildSource( "src/index-full.js" );
	bundles.lite = await g_sourceHarness.buildSource( "src/index.js" );
	audioBundle = await g_sourceHarness.buildSource( "plugins/sound/index.js" );
} );

async function probe( engine, bundle, fn, arg ) {
	const reusable = pages[ engine ];
	const page = await reusable.load();
	let timeout;
	try {
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
		assert.deepEqual( reusable.errors, [] );
		return result;
	} finally {
		clearTimeout( timeout );
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

// Engines run in parallel; each engine's tests share one page and run in order
describe( "audio engines", { "concurrency": true }, () => {
	for( const engine of g_audioEngines.AUDIO_ENGINES ) {
		describe( engine, { "concurrency": 1 }, () => {
			before( async () => {
				browsers[ engine ] = await g_audioEngines.launchEngine( engine );
				pages[ engine ] = await g_audioEngines.createReusablePage( browsers[ engine ] );
			} );

			after( async () => {
				await browsers[ engine ]?.close();
			} );

			for( const bundle of [ "full", "lite" ] ) {
				test( `SYS-004 ${bundle}: late events cannot release an unrelated readiness wait`, async () => {
					const result = await probe( engine, bundle, async () => {
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
						assert.deepEqual( await probe( engine, bundle, removalScenario, timing ),
							[ 0, 0, 1, 1, 3, true ] );
					} );
				}

				test( `SYS-004 ${bundle}: retry success and terminal failure settle independently`, async () => {
					const result = await probe( engine, bundle, async () => {
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
		} );
	}
} );

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
