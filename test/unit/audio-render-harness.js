/**
 * Offline audio render harness for browser tests.
 *
 * installAudioRenderHarness() runs as a Playwright init script before any bundle loads. It
 * replaces page globals so production audio code renders into an OfflineAudioContext on a
 * virtual clock, with no test hooks in production code:
 *
 * - window.AudioContext returns one wrapped OfflineAudioContext. The wrapper reports "running"
 *   and swallows statechange, because the real context is "suspended" whenever page code runs
 *   inside the suspend-step clock loop.
 * - setTimeout, setInterval, clearTimeout, and clearInterval use virtual timers.
 * - performance.now and Date.now follow the virtual clock.
 * - Math.random is a seeded PRNG.
 * - document.hidden and visibilityState are controlled by the harness.
 *
 * The Node helpers open a page with the harness installed and decode rendered channels.
 */
import * as g_audioEngines from "./audio-engines.js";
import * as g_sourceHarness from "./browser-source-harness.js";

/** Sample rate of every harness render. */
const SAMPLE_RATE = 48000;

/** Frames per clock step: 10 render quanta, about 26.7 ms at 48 kHz. */
const STEP_FRAMES = 1280;

/** Default PRNG seed; tests log the seed they used when an assertion fails. */
const DEFAULT_SEED = 0x5eed2023;

/**
 * Page-side harness. Playwright serializes this function, so it must not reference anything
 * outside its own body.
 *
 * @param {Object} config - Harness configuration
 * @param {number} [config.seed] - PRNG seed
 * @param {number} [config.duration] - Render length in seconds (rounded up to whole steps)
 * @param {number} [config.channels] - Output channels
 * @param {boolean} [config.locked] - Report "suspended" until simulateGesture()
 */
function installAudioRenderHarness( config ) {
	const sampleRate = config.sampleRate;
	const stepFrames = config.stepFrames;
	const stepSeconds = stepFrames / sampleRate;
	const channelCount = config.channels || 2;
	const epoch = 1767225600000;
	const nativeSetTimeout = window.setTimeout.bind( window );
	const NativeOfflineAudioContext = window.OfflineAudioContext;

	// Seeded PRNG (mulberry32)
	let seed = config.seed >>> 0;
	Math.random = function() {
		seed = ( seed + 0x6d2b79f5 ) >>> 0;
		let value = seed;
		value = Math.imul( value ^ ( value >>> 15 ), value | 1 );
		value ^= value + Math.imul( value ^ ( value >>> 7 ), value | 61 );
		return ( ( value ^ ( value >>> 14 ) ) >>> 0 ) / 4294967296;
	};

	// Virtual clock and timers
	let now = 0;
	let nextTimerId = 1;
	let timerSequence = 0;
	const timers = new Map();

	function addTimer( fn, delay, args, isInterval ) {
		const id = nextTimerId++;
		let delaySeconds = Math.max( 0, Number( delay ) || 0 ) / 1000;
		if( isInterval && delaySeconds === 0 ) {
			delaySeconds = 0.001;
		}
		let interval = null;
		if( isInterval ) {
			interval = delaySeconds;
		}
		timers.set( id, {
			"fn": fn,
			"args": args,
			"due": now + delaySeconds,
			"sequence": timerSequence++,
			"interval": interval
		} );
		return id;
	}

	function nextDueTimer( time ) {
		let bestId = null;
		let best = null;
		for( const [ id, timer ] of timers ) {
			if( timer.due > time + 1e-9 ) {
				continue;
			}
			if(
				best === null || timer.due < best.due ||
				( timer.due === best.due && timer.sequence < best.sequence )
			) {
				best = timer;
				bestId = id;
			}
		}
		return bestId;
	}

	function runTimersUntil( time ) {
		const errors = [];
		let id = nextDueTimer( time );
		while( id !== null ) {
			const timer = timers.get( id );
			now = Math.max( now, timer.due );
			if( timer.interval === null ) {
				timers.delete( id );
			} else {
				timer.due += timer.interval;
				timer.sequence = timerSequence++;
			}
			try {
				if( typeof timer.fn === "function" ) {
					timer.fn( ...timer.args );
				}
			} catch( error ) {
				errors.push( String( error && error.stack || error ) );
			}
			id = nextDueTimer( time );
		}
		now = Math.max( now, time );
		return errors;
	}

	window.setTimeout = ( fn, delay, ...args ) => addTimer( fn, delay, args, false );
	window.setInterval = ( fn, delay, ...args ) => addTimer( fn, delay, args, true );
	window.clearTimeout = id => { timers.delete( id ); };
	window.clearInterval = id => { timers.delete( id ); };
	performance.now = () => now * 1000;
	Date.now = () => epoch + Math.floor( now * 1000 );

	// Visibility control
	let hidden = false;
	Object.defineProperty( document, "hidden", {
		"configurable": true, "get": () => hidden
	} );
	Object.defineProperty( document, "visibilityState", {
		"configurable": true,
		"get": () => {
			if( hidden ) {
				return "hidden";
			}
			return "visible";
		}
	} );

	// Wrapped OfflineAudioContext
	const webAudio = typeof NativeOfflineAudioContext === "function";
	const offlineSuspend = webAudio &&
		typeof NativeOfflineAudioContext.prototype.suspend === "function";
	let duration = config.duration || 2;
	let locked = config.locked === true;
	let realContext = null;
	let proxy = null;
	let pageStateHandler = null;
	const pageStateListeners = new Set();
	const nodeCounts = {};
	const statechangeLog = { "native": 0, "delivered": 0 };

	function lengthFrames() {
		return Math.ceil( ( duration * sampleRate ) / stepFrames ) * stepFrames;
	}

	function createContext() {
		if( !webAudio ) {
			throw new Error( "audio harness: this engine has no OfflineAudioContext" );
		}
		realContext = new NativeOfflineAudioContext( channelCount, lengthFrames(), sampleRate );
		realContext.addEventListener( "statechange", () => { statechangeLog.native++; } );
		proxy = new Proxy( realContext, {
			"get"( target, prop ) {
				if( prop === "state" ) {
					if( locked ) {
						return "suspended";
					}
					return "running";
				}
				if( prop === "onstatechange" ) {
					return pageStateHandler;
				}
				if( prop === "suspend" || prop === "resume" || prop === "close" ) {
					return () => Promise.resolve();
				}
				if( prop === "startRendering" ) {
					return () => Promise.reject(
						new Error( "audio harness: startRendering is reserved for the harness" )
					);
				}
				if( prop === "addEventListener" || prop === "removeEventListener" ) {
					const isAdd = prop === "addEventListener";
					return ( type, listener, options ) => {
						if( type === "statechange" ) {
							if( isAdd ) {
								pageStateListeners.add( listener );
							} else {
								pageStateListeners.delete( listener );
							}
							return;
						}
						target[ prop ]( type, listener, options );
					};
				}
				const value = Reflect.get( target, prop, target );
				if( typeof value === "function" ) {
					if( typeof prop === "string" && prop.startsWith( "create" ) ) {
						return ( ...args ) => {
							nodeCounts[ prop ] = ( nodeCounts[ prop ] || 0 ) + 1;
							return value.apply( target, args );
						};
					}
					return value.bind( target );
				}
				return value;
			},
			"set"( target, prop, value ) {
				if( prop === "onstatechange" ) {
					pageStateHandler = value;
					return true;
				}
				return Reflect.set( target, prop, value, target );
			}
		} );
	}

	function HarnessAudioContext() {
		if( !proxy ) {
			createContext();
		}
		return proxy;
	}
	window.AudioContext = HarnessAudioContext;
	window.webkitAudioContext = HarnessAudioContext;

	function deliverPageStatechange() {
		const event = new Event( "statechange" );
		statechangeLog.delivered++;
		if( typeof pageStateHandler === "function" ) {
			pageStateHandler.call( proxy, event );
		}
		for( const listener of pageStateListeners ) {
			if( typeof listener === "function" ) {
				listener.call( proxy, event );
			} else if( listener && typeof listener.handleEvent === "function" ) {
				listener.handleEvent( event );
			}
		}
	}

	function encodeChannel( data ) {
		const bytes = new Uint8Array( data.buffer, data.byteOffset, data.byteLength );
		let binary = "";
		const chunk = 0x8000;
		for( let i = 0; i < bytes.length; i += chunk ) {
			binary += String.fromCharCode.apply( null, bytes.subarray( i, i + chunk ) );
		}
		return btoa( binary );
	}

	/**
	 * Renders the shared context. Actions run at their step boundary, after due timers.
	 *
	 * @param {Object} [options] - Render options
	 * @param {Array<{ time: number, run: Function }>} [options.actions] - Timed test actions
	 * @param {Function} [options.onStep] - Called with the step time after actions run
	 * @param {boolean} [options.singlePass] - Render without suspension
	 * @returns {Promise<Object>} Encoded channels and render diagnostics
	 */
	async function render( options = {} ) {
		const actions = ( options.actions || [] ).slice().sort( ( a, b ) => a.time - b.time );
		const errors = [];
		let actionIndex = 0;
		let steps = 0;
		HarnessAudioContext();
		const context = realContext;
		const endTime = context.length / sampleRate;
		const clockDriven = offlineSuspend && options.singlePass !== true;

		function runActionsUntil( time ) {
			while( actionIndex < actions.length && actions[ actionIndex ].time <= time + 1e-9 ) {
				try {
					actions[ actionIndex ].run();
				} catch( error ) {
					errors.push( String( error && error.stack || error ) );
				}
				actionIndex++;
			}
		}

		function step( time ) {
			steps++;
			errors.push( ...runTimersUntil( time ) );
			runActionsUntil( time );
			if( options.onStep ) {
				options.onStep( time );
			}
		}

		if( !clockDriven && actions.some( action => action.time > 0 ) ) {
			throw new Error( "audio harness: timed actions need offline suspend()" );
		}

		step( 0 );
		if( clockDriven ) {
			const schedule = index => {
				const time = ( index * stepFrames ) / sampleRate;
				if( time >= endTime - 1e-9 ) {
					return;
				}
				context.suspend( time ).then( () => {
					step( time );
					schedule( index + 1 );
					context.resume();
				} );
			};
			schedule( 1 );
		}

		const buffer = await context.startRendering();
		errors.push( ...runTimersUntil( endTime ) );
		const channels = [];
		for( let i = 0; i < buffer.numberOfChannels; i++ ) {
			channels.push( encodeChannel( buffer.getChannelData( i ) ) );
		}
		return {
			"sampleRate": buffer.sampleRate,
			"length": buffer.length,
			"channels": channels,
			"clockDriven": clockDriven,
			"steps": steps,
			"nodeCounts": { ...nodeCounts },
			"statechanges": { ...statechangeLog },
			"errors": errors
		};
	}

	/**
	 * Resolves a page promise while firing zero-delay virtual timers, for setup such as
	 * $.ready() that waits on setTimeout( fn, 0 ).
	 */
	async function settle( value, maxTurns = 200 ) {
		let done = false;
		let result;
		let failure = null;
		Promise.resolve( value ).then(
			resolved => { done = true; result = resolved; },
			error => { done = true; failure = error; }
		);
		for( let turn = 0; turn < maxTurns && !done; turn++ ) {
			runTimersUntil( now );
			await new Promise( resolve => nativeSetTimeout( resolve, 0 ) );
		}
		if( !done ) {
			throw new Error( "audio harness: settle timed out" );
		}
		if( failure ) {
			throw failure;
		}
		return result;
	}

	window.__audioHarness = {
		"sampleRate": sampleRate,
		"stepSeconds": stepSeconds,
		"support": { "webAudio": webAudio, "offlineSuspend": offlineSuspend },
		"seed": config.seed >>> 0,
		"render": render,
		"settle": settle,
		"now": () => now,
		"advance": seconds => runTimersUntil( now + seconds ),
		"pendingTimers": () => timers.size,
		"nodeCounts": () => ( { ...nodeCounts } ),
		"statechanges": () => ( { ...statechangeLog } ),
		"hasContext": () => proxy !== null,
		"setDuration": seconds => {
			if( proxy ) {
				throw new Error( "audio harness: duration is fixed once the context exists" );
			}
			duration = seconds;
		},
		"setHidden": value => {
			hidden = value === true;
			document.dispatchEvent( new Event( "visibilitychange" ) );
		},
		"simulateGesture": () => {
			if( !locked ) {
				return;
			}
			locked = false;
			deliverPageStatechange();
		}
	};
}

/**
 * Decodes base64 Float32 channel data returned by the page.
 *
 * @param {string[]} channels - Encoded channels
 * @returns {Float32Array[]} Decoded channels
 */
function decodeChannels( channels ) {
	return channels.map( encoded => {
		const bytes = Buffer.from( encoded, "base64" );
		const copy = new Uint8Array( bytes.length );
		copy.set( bytes );
		return new Float32Array( copy.buffer );
	} );
}

/**
 * Converts a page render result into decoded channels plus diagnostics.
 *
 * @param {Object} result - Result of __audioHarness.render()
 * @returns {Object} Result with Float32Array channels
 */
function decodeRender( result ) {
	return { ...result, "channels": decodeChannels( result.channels ) };
}

/**
 * Init script that installs the harness when the document URL carries a harness config.
 * Reusable pages add it once; each load passes its own config in the query string.
 */
const HARNESS_INIT_SCRIPT = `( () => {
	const raw = new URLSearchParams( location.search ).get( "harness" );
	if( raw !== null ) {
		( ${installAudioRenderHarness.toString()} )( JSON.parse( raw ) );
	}
} )();`;

/**
 * Creates a harness session: one reusable page per browser whose loads each get a fresh
 * document with the harness installed before the bundles load.
 *
 * @param {Object} browser - Playwright browser
 * @returns {Promise<Object>} { open( options ), getSupport(), close() }
 */
async function createHarnessSession( browser ) {
	const reusable = await g_audioEngines.createReusablePage( browser, HARNESS_INIT_SCRIPT );
	let support = null;

	/**
	 * Loads a fresh harness document.
	 *
	 * @param {Object} [options] - Load options
	 * @param {string[]} [options.scripts] - Bundle sources added in order
	 * @param {Object} [options.config] - Harness configuration
	 * @param {boolean} [options.ready] - Await $.ready() through the virtual timers
	 * @returns {Promise<{ page: Object, support: Object, errors: string[] }>} Harness page
	 */
	async function open( options = {} ) {
		const config = {
			"sampleRate": SAMPLE_RATE,
			"stepFrames": STEP_FRAMES,
			"seed": DEFAULT_SEED,
			...( options.config || {} )
		};
		const page = await reusable.load( { "harness": JSON.stringify( config ) } );
		const scripts = options.scripts || [];
		for( const script of scripts ) {
			await page.addScriptTag( { "content": script } );
		}
		if( options.ready !== false && scripts.length > 0 ) {
			await page.evaluate( () => window.__audioHarness.settle( window.$.ready() ) );
		}
		if( support === null ) {
			support = await page.evaluate( () => window.__audioHarness.support );
		}
		return { "page": page, "support": support, "errors": reusable.errors };
	}

	/**
	 * Returns the engine's Web Audio support, loading one empty document the first time.
	 *
	 * @returns {Promise<{ webAudio: boolean, offlineSuspend: boolean }>} Support flags
	 */
	async function getSupport() {
		if( support === null ) {
			await open();
		}
		return support;
	}

	return { "open": open, "getSupport": getSupport, "close": reusable.close };
}

/**
 * Builds the in-memory full bundle used by harness tests.
 *
 * @returns {Promise<string>} Bundle source
 */
function buildFullBundle() {
	return g_sourceHarness.buildSource( "src/index-full.js" );
}

export {
	DEFAULT_SEED, SAMPLE_RATE, STEP_FRAMES, buildFullBundle, createHarnessSession, decodeChannels,
	decodeRender, installAudioRenderHarness
};
