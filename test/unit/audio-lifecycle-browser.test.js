/**
 * SYS-004 and SYS-018 browser regressions against fresh in-memory full and lite bundles, for
 * decoded (fetch + decodeAudioData) and streamed (media element) audio. Runs in every engine
 * from audio-engines.js. Run with node --test test/unit/audio-lifecycle-browser.test.js; no
 * server is required.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_audioEngines from "./audio-engines.js";
import * as g_sourceHarness from "./browser-source-harness.js";
const { test, describe, before, after } = g_test;
const assert = g_assert;

const NO_WEB_AUDIO = "this engine build has no Web Audio API (Playwright WebKit on Windows)";

const bundles = {};
const browsers = {};
const pages = {};
const webAudio = {};
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
				timeout = setTimeout(
					() => reject( new Error( "Audio scenario timed out" ) ), 10000
				);
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
 * Control fetches, media events, and retry timers while preserving the real readiness
 * scheduler and the real decodeAudioData.
 */
function installAudioHarness() {
	const fetches = [];
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
		if( retries.delete( id ) ) {
			return;
		}
		nativeClear( id );
	};

	// A 10 ms mono 16-bit WAV of silence
	function wav() {
		const frames = 441;
		const view = new DataView( new ArrayBuffer( 44 + frames * 2 ) );
		const text = ( offset, value ) => {
			for( let i = 0; i < value.length; i++ ) {
				view.setUint8( offset + i, value.charCodeAt( i ) );
			}
		};
		text( 0, "RIFF" );
		view.setUint32( 4, 36 + frames * 2, true );
		text( 8, "WAVEfmt " );
		view.setUint32( 16, 16, true );
		view.setUint16( 20, 1, true );
		view.setUint16( 22, 1, true );
		view.setUint32( 24, 44100, true );
		view.setUint32( 28, 88200, true );
		view.setUint16( 32, 2, true );
		view.setUint16( 34, 16, true );
		text( 36, "data" );
		view.setUint32( 40, frames * 2, true );
		return view.buffer;
	}

	window.fetch = ( src, init ) => new Promise( ( resolve, reject ) => {
		const entry = { "src": src, "resolve": resolve, "reject": reject };
		init.signal.addEventListener( "abort", () => {
			entry.aborted = true;
			reject( new DOMException( "The operation was aborted.", "AbortError" ) );
		} );
		fetches.push( entry );
	} );

	window.Audio = class extends EventTarget {
		constructor() {
			super();
			this.src = "";
			this.error = { "code": 2 };
			this.duration = 1;
			this.listeners = new Map();
			this.pauses = 0;
			this.loads = 0;
			instances.push( this );
		}
		addEventListener( name, fn ) {
			this.listeners.set( name, fn );
			super.addEventListener( name, fn );
		}
		removeEventListener( name, fn ) {
			if( this.listeners.get( name ) === fn ) {
				this.listeners.delete( name );
			}
			super.removeEventListener( name, fn );
		}
		pause() {
			this.pauses++;
		}
		play() {
			return Promise.resolve();
		}
		removeAttribute( name ) {
			if( name === "src" ) {
				this.src = "";
			}
		}
		load() {
			this.loads++;

			// Resetting media can deliver events; cleanup must have detached the listeners.
			this.dispatchEvent( new Event( "error" ) );
		}
	};
	let control;
	$.registerPlugin( {
		"name": "audio-lifecycle-control", "version": "1.0.0",
		"init": api => {
			control = api;
		}
	} );
	window.audioTest = {
		"fetches": fetches,
		"instances": instances,
		"retries": retries,
		"control": control,
		"checkpoint": () => new Promise( resolve => nativeSet( resolve, 20 ) ),
		"respond": ( entry, status = 200 ) => {
			entry.resolve( new Response( wav(), { "status": status } ) );
		},
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
				const page = await pages[ engine ].load();
				webAudio[ engine ] = await page.evaluate(
					() => typeof AudioContext === "function"
				);
			} );

			after( async () => {
				await browsers[ engine ]?.close();
			} );

			for( const bundle of [ "full", "lite" ] ) {
				test( `SYS-004 ${bundle}: late events cannot release an unrelated readiness wait`,
					async () => {
						const result = await probe( engine, bundle, async () => {
							const h = audioTest;
							const id = $.loadAudio( "one.wav", null, true );
							const audio = h.instances[ 0 ];
							const ready = audio.listeners.get( "canplay" );
							const error = audio.listeners.get( "error" );
							audio.dispatchEvent( new Event( "canplay" ) );
							await $.ready();
							h.control.wait();
							let settlements = 0;
							const promise = $.ready().then( () => {
								settlements++;
							} );
							ready();
							error();
							audio.dispatchEvent( new Event( "error" ) );
							await h.checkpoint();
							const pending = settlements;
							const retries = h.retries.size;
							$.removeAudio( id );
							await h.checkpoint();
							const afterRemoval = settlements;
							h.control.done();
							await promise;
							return [
								pending, afterRemoval, settlements, retries, h.instances.length,
								h.released()
							];
						} );
						assert.deepEqual( result, [ 0, 0, 1, 0, 1, true ] );
					} );

				for( const timing of [ "fetching", "retry", "decoding" ] ) {
					test( `SYS-018 ${bundle}: ${timing} removal cancels and isolates a replacement`,
						async t => {
							if( !webAudio[ engine ] ) {
								t.skip( NO_WEB_AUDIO );
								return;
							}
							assert.deepEqual(
								await probe( engine, bundle, removalScenario, timing ),
								[ 0, 0, 1, "number", 2, true ]
							);
						} );
				}

				test( `SYS-018 ${bundle}: stream removal releases the element and isolates a ` +
					"replacement", async () => {
					const result = await probe( engine, bundle, async () => {
						const h = audioTest;
						$.loadAudio( "old.wav", "reuse", true );
						const old = h.instances[ 0 ];
						const callbacks = Array.from( old.listeners.values() );
						old.dispatchEvent( new Event( "error" ) );
						callbacks.push( h.retries.values().next().value );
						let settlements = 0;
						const promise = $.ready().then( () => {
							settlements++;
						} );
						$.removeAudio( "reuse" );
						$.loadAudio( "new.wav", "reuse", true );
						for( const callback of callbacks ) {
							callback();
						}
						await h.checkpoint();
						const pending = settlements;
						h.instances.at( -1 ).dispatchEvent( new Event( "canplay" ) );
						await promise;
						$.removeAudio( "reuse" );
						return [ pending, settlements, h.instances.length, h.released() ];
					} );
					assert.deepEqual( result, [ 0, 1, 2, true ] );
				} );

				test( `SYS-004 ${bundle}: retry success and terminal failure settle independently`,
					async t => {
						if( !webAudio[ engine ] ) {
							t.skip( NO_WEB_AUDIO );
							return;
						}
						const result = await probe( engine, bundle, async () => {
							const h = audioTest;
							const retried = $.loadAudio( "retry.wav", "retried" );
							const missing = $.loadAudio( "missing.wav", "missing" );
							let settled = false;
							const promise = $.ready().then( () => {
								settled = true;
							} );
							h.fetches[ 0 ].reject( new TypeError( "Failed to fetch" ) );
							await h.checkpoint();
							h.retry();
							h.respond( h.fetches[ 2 ] );
							await h.checkpoint();
							const pending = settled;
							h.respond( h.fetches[ 1 ], 404 );
							await promise;
							const instance = typeof $.playAudio( retried );
							let code = null;
							try {
								$.playAudio( missing );
							} catch( error ) {
								code = error.code;
							}
							$.removeAudio( retried );
							$.removeAudio( missing );
							return [
								pending, settled, instance, code, h.fetches.length, h.retries.size
							];
						} );
						assert.deepEqual(
							result, [ false, true, "number", "AUDIO_NOT_LOADED", 3, 0 ]
						);
					} );
			}
		} );
	}
} );

async function removalScenario( timing ) {
	const h = audioTest;
	$.loadAudio( "old.wav", "reuse" );
	const old = h.fetches[ 0 ];
	let staleRetry = null;
	if( timing === "retry" ) {
		old.reject( new TypeError( "Failed to fetch" ) );
		await h.checkpoint();
		staleRetry = h.retries.values().next().value;
	}
	if( timing === "decoding" ) {
		h.respond( old );
		await Promise.resolve();
	}
	let settlements = 0;
	const promise = $.ready().then( () => {
		settlements++;
	} );
	$.removeAudio( "reuse" );
	$.loadAudio( "new.wav", "reuse" );
	if( staleRetry ) {
		staleRetry();
	}
	if( timing === "fetching" ) {
		h.respond( old );
	}
	await h.checkpoint();
	const pending = settlements;
	const retries = h.retries.size;
	h.respond( h.fetches.at( -1 ) );
	await promise;
	const instance = typeof $.playAudio( "reuse" );
	$.removeAudio( "reuse" );
	await $.ready();
	return [ pending, retries, settlements, instance, h.fetches.length, h.released() ];
}
