/**
 * Node sandbox for plugins/sound/samples.js. Loads the real module source into a vm context
 * with controllable fetch, decode, media elements, and timers, and stubs for the sibling
 * sound modules. Voice admission is recorded rather than built, so tests cover loading,
 * ownership, IDs, and validation; rendering is covered by the browser harness.
 */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_vm from "node:vm";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const SOURCE = g_fs.readFileSync(
	g_path.join( DIRNAME, "../../plugins/sound/samples.js" ), "utf8"
).replace( /^import .*;\r?\n/gm, "" ).replace( /export /g, "" );

/**
 * Promise with its settle functions exposed
 *
 * @returns {Object} { promise, resolve, reject }
 */
function deferred() {
	let resolve;
	let reject;
	const promise = new Promise( ( res, rej ) => {
		resolve = res;
		reject = rej;
	} );
	return { "promise": promise, "resolve": resolve, "reject": reject };
}

/**
 * Let pending promise callbacks run
 *
 * @returns {Promise<void>} Resolves after queued microtasks and one macrotask turn
 */
export function flush() {
	return new Promise( resolve => setImmediate( resolve ) );
}

/**
 * Create a sandbox with the samples module registered
 *
 * @param {Object} [options] - { locked, baseURI }
 * @returns {Object} Harness
 */
export function createSampleSandbox( options = {} ) {
	const commands = {};
	const timers = new Map();
	const errors = [];
	const counts = { "wait": 0, "done": 0, "construct": 0 };
	const failures = {};
	const fetches = [];
	const decodes = [];
	const elements = [];
	const admitted = [];
	const stopped = [];
	const unlocks = [];
	const pending = [];
	let nextTimer = 0;
	let locked = options.locked === true;

	class FakeAudio {
		constructor() {
			counts.construct += 1;
			if( failures.constructAt === counts.construct ) {
				throw failures.error;
			}
			this.src = "";
			this.error = null;
			this.duration = 2;
			this.listeners = new Map();
			this.pauses = 0;
			this.loads = 0;
			this.plays = 0;
			elements.push( this );
		}
		addEventListener( name, fn ) {
			if( failures.listener === name ) {
				throw failures.error;
			}
			if( !this.listeners.has( name ) ) {
				this.listeners.set( name, new Set() );
			}
			this.listeners.get( name ).add( fn );
		}
		removeEventListener( name, fn ) {
			this.listeners.get( name )?.delete( fn );
		}
		listenerCount( name ) {
			return this.listeners.get( name )?.size || 0;
		}
		emit( name ) {
			for( const fn of Array.from( this.listeners.get( name ) || [] ) ) {
				fn();
			}
		}
		fail( code ) {
			this.error = { "code": code };
			this.emit( "error" );
		}
		pause() {
			this.pauses += 1;
		}
		play() {
			this.plays += 1;
			return Promise.resolve();
		}
		removeAttribute( name ) {
			if( name === "src" ) {
				this.src = "";
			}
		}
		load() {
			this.loads += 1;
		}
	}

	const audioContext = {
		"currentTime": 0,
		"sampleRate": 48000,
		"decodeAudioData": data => {
			const entry = deferred();
			entry.data = data;
			decodes.push( entry );
			return entry.promise;
		}
	};

	const context = g_vm.createContext( {
		"console": {
			"error": ( ...args ) => errors.push( args ),
			"warn": () => {}
		},
		"setTimeout": ( fn, delay ) => {
			nextTimer += 1;
			timers.set( nextTimer, { "fn": fn, "delay": delay } );
			return nextTimer;
		},
		"clearTimeout": id => timers.delete( id ),
		"AbortController": AbortController,
		"URL": URL,
		"document": { "baseURI": options.baseURI || "http://localhost:8080/game/" },
		"Audio": FakeAudio,
		"fetch": ( src, init ) => {
			const entry = deferred();
			entry.src = src;
			entry.signal = init.signal;
			init.signal.addEventListener( "abort", () => {
				entry.reject( new Error( "aborted" ) );
			} );
			fetches.push( entry );
			return entry.promise;
		}
	} );
	context.g_context = {
		"getAudioContext": () => audioContext,
		"getScheduleLead": () => audioContext.currentTime + 256 / 48000,
		"getBusInput": () => null,
		"isLocked": () => locked,
		"onUnlock": fn => unlocks.push( fn ),
		"cancelUnlock": fn => {
			const index = unlocks.indexOf( fn );
			if( index > -1 ) {
				unlocks.splice( index, 1 );
			}
		}
	};
	context.g_envelope = {
		"MIN_RAMP": 0.003,
		"STOP_FADE": 0.01,
		"rampValueAt": ramp => ramp.to,
		"applySchedule": () => {}
	};
	context.g_scheduler = {
		"LATE_GRACE": 0.025,
		"shouldCreate": ( start, now ) => start - now <= 0.2,
		"addPending": item => pending.push( item ),
		"removePending": id => {
			const index = pending.findIndex( item => item.id === id );
			if( index === -1 ) {
				return false;
			}
			pending.splice( index, 1 );
			return true;
		}
	};
	context.g_voices = {
		"panGain": () => 1,
		"admitVoice": request => {
			if( failures.reject ) {
				return null;
			}
			const voice = {
				"request": request, "slotEnd": Infinity, "end": Infinity, "disposed": false
			};
			admitted.push( voice );
			return voice;
		},
		"stopVoice": ( voice, when, kind ) => {
			stopped.push( { "voice": voice, "when": when, "kind": kind } );
			voice.slotEnd = null;
			voice.end = Math.min( voice.end, audioContext.currentTime + 256 / 48000 + 0.01 );
		},
		"releaseVoice": () => {},
		"registerVoice": () => {},
		"createVoiceRecord": fields => fields
	};
	g_vm.runInContext( SOURCE, context, { "filename": "plugins/sound/samples.js" } );
	context.registerSamples( {
		"addCommand": ( name, fn ) => {
			commands[ name ] = fn;
		},
		"utils": {
			"getFloat": ( v, d ) => {
				if( v === null || v === undefined || !Number.isFinite( Number( v ) ) ) {
					return d;
				}
				return Number( v );
			}
		},
		"wait": () => {
			counts.wait += 1;
		},
		"done": () => {
			counts.done += 1;
		}
	} );

	/**
	 * Fire the single pending retry timer and check its delay
	 *
	 * @returns {Function} The fired callback, for replaying stale timers
	 */
	function retry() {
		if( timers.size !== 1 ) {
			throw new Error( `expected one retry timer, found ${timers.size}` );
		}
		const [ id, timer ] = timers.entries().next().value;
		if( timer.delay !== 100 ) {
			throw new Error( `expected a 100 ms retry, found ${timer.delay}` );
		}
		timers.delete( id );
		timer.fn();
		return timer.fn;
	}

	/**
	 * Resolve a fetch with a response of a status
	 *
	 * @param {Object} entry - Fetch entry
	 * @param {number} [status=200] - HTTP status
	 * @returns {void}
	 */
	function respond( entry, status = 200 ) {
		entry.resolve( {
			"ok": status >= 200 && status < 300,
			"status": status,
			"arrayBuffer": () => Promise.resolve( new ArrayBuffer( 8 ) )
		} );
	}

	/**
	 * Complete a decode load: respond to the latest fetch, then decode a buffer
	 *
	 * @param {Object} [buffer] - Decoded buffer fields
	 * @returns {Promise<void>} Resolves once the load has settled
	 */
	async function finishDecode( buffer = {} ) {
		respond( fetches.at( -1 ) );
		await flush();
		decodes.at( -1 ).resolve( Object.assign(
			{ "duration": 2, "numberOfChannels": 2 }, buffer
		) );
		await flush();
	}

	return {
		"commands": commands,
		"timers": timers,
		"errors": errors,
		"counts": counts,
		"failures": failures,
		"fetches": fetches,
		"decodes": decodes,
		"elements": elements,
		"admitted": admitted,
		"stopped": stopped,
		"unlocks": unlocks,
		"pending": pending,
		"audioContext": audioContext,
		"retry": retry,
		"respond": respond,
		"finishDecode": finishDecode,
		"setLocked": value => {
			locked = value;
		}
	};
}
