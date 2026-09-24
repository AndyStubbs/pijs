/**
 * Gamepad 2.3 audit probes: reproductions for the findings in
 * docs/plans/GAMEPAD-V2.3-AUDIT.md, run against fresh in-memory bundles of the current source
 * in Chromium, Firefox, and WebKit.
 *
 * Each probe replaces `navigator.getGamepads`, `requestAnimationFrame`, and the gamepad
 * connection events with deterministic mocks, runs one scenario, and records what it observed
 * next to what a correct plugin would do. The script changes no library code or tests.
 *
 * Run with `node docs/evidence/gamepad-2.3/probes.js`; it writes `probes-output.json` next to
 * this file. No server is required.
 */
import * as g_fs from "node:fs/promises";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_childProcess from "node:child_process";
import * as g_playwright from "@playwright/test";
import * as g_harness from "../../../test/unit/browser-source-harness.js";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const OUTPUT_FILE = g_path.join( DIRNAME, "probes-output.json" );
const EMPTY_PAGE = "<!doctype html><html><body></body></html>";
const ENGINES = [ "chromium", "firefox", "webkit" ];
const MANUAL_PAGES = [ "gamepad_01.html", "gamepad_02.html", "gamepad_03.html" ];


/*************************************************************************************************
 * Page Mocks
 ************************************************************************************************/


/**
 * Install the deterministic gamepad environment. Runs in the page before the bundle loads.
 *
 * `window.__gp` exposes:
 * - `setPad( index, state )` / `removePad( index )`: what `navigator.getGamepads()` reports.
 * - `frame()`: run every queued animation-frame callback once, in registration order.
 * - `connect( index )` / `disconnect( index )`: dispatch a connection event for a pad.
 * - `errors`: messages of uncaught errors, including those thrown by event listeners.
 */
function installMocks() {
	const pads = [];
	let queue = [];
	let nextId = 0;
	let time = 0;
	const gp = {
		"errors": [],
		"frameCount": 0
	};

	function snapshot( pad ) {
		return {
			"index": pad.index,
			"id": pad.id,
			"connected": pad.connected,
			"mapping": pad.mapping,
			"timestamp": pad.timestamp,
			"vibrationActuator": null,
			"buttons": pad.buttons.map( pressed => ( {
				"pressed": pressed, "touched": pressed, "value": pressed ? 1 : 0
			} ) ),
			"axes": pad.axes.slice()
		};
	}

	gp.setPad = ( index, state ) => {
		const pad = pads[ index ] || {
			"index": index, "id": "Probe pad " + index, "connected": true,
			"mapping": "standard", "timestamp": 0,
			"buttons": [ false, false, false, false ], "axes": [ 0, 0, 0, 0 ]
		};
		if( state && state.buttons ) {
			pad.buttons = state.buttons.slice();
		}
		if( state && state.axes ) {
			pad.axes = state.axes.slice();
		}
		pad.timestamp += 1;
		pads[ index ] = pad;
	};
	gp.removePad = index => {
		pads[ index ] = null;
	};
	gp.snapshot = index => snapshot( pads[ index ] );
	gp.connect = index => {
		const event = new Event( "gamepadconnected" );
		Object.defineProperty( event, "gamepad", { "value": snapshot( pads[ index ] ) } );
		window.dispatchEvent( event );
	};
	gp.disconnect = index => {
		const pad = snapshot( pads[ index ] );
		pad.connected = false;
		pads[ index ] = null;
		const event = new Event( "gamepaddisconnected" );
		Object.defineProperty( event, "gamepad", { "value": pad } );
		window.dispatchEvent( event );
	};
	gp.frame = () => {
		const callbacks = queue;
		queue = [];
		time += 16.667;
		gp.frameCount += 1;
		for( const item of callbacks ) {
			item.fn( time );
		}
	};
	gp.pending = () => queue.length;

	Object.defineProperty( navigator, "getGamepads", {
		"configurable": true,
		"value": () => pads.map( pad => {
			if( pad ) {
				return snapshot( pad );
			}
			return null;
		} )
	} );
	window.requestAnimationFrame = fn => {
		nextId += 1;
		queue.push( { "id": nextId, "fn": fn } );
		return nextId;
	};
	window.cancelAnimationFrame = id => {
		queue = queue.filter( item => item.id !== id );
	};
	window.addEventListener( "error", event => {
		gp.errors.push( event.message );
	} );
	window.__gp = gp;
}


/*************************************************************************************************
 * Probes
 *
 * Each probe is a page function returning `{ observed, expected, confirmed }`, where
 * `confirmed` is true when the observed behavior differs from the expected contract.
 ************************************************************************************************/


const PROBES = {};

/**
 * P1: button and axis edges seen by a consumer, by read timing. A press lasts three frames
 * and the axis moves once, so a correct plugin reports one press edge, one release edge, and
 * two axis changes to any consumer that reads at least once per frame, or once per read.
 */
PROBES.P1 = async () => {
	const gp = window.__gp;

	// Pad script: frame index → state, applied before each frame runs.
	const script = [
		{},
		{ "buttons": [ true, false, false, false ], "axes": [ 0.8, 0, 0, 0 ] },
		{},
		{},
		{ "buttons": [ false, false, false, false ], "axes": [ 0, 0, 0, 0 ] },
		{}, {}, {}
	];

	function run( mode ) {
		const counts = { "pressed": 0, "released": 0, "axisChanged": 0, "reads": 0 };
		let frame = 0;
		let active = true;
		function read() {
			const pad = $.ingamepad( 0 );
			counts.reads += 1;
			if( pad.getButtonJustPressed( 0 ) ) { counts.pressed += 1; }
			if( pad.getButtonJustReleased( 0 ) ) { counts.released += 1; }
			if( pad.getAxisChanged( 0 ) ) { counts.axisChanged += 1; }
		}
		function userLoop() {
			if( !active ) {
				return;
			}
			if( mode !== "every-other-frame" || frame % 2 === 0 ) {
				read();
			}
			requestAnimationFrame( userLoop );
		}

		// "after-loop" modes: the plugin loop is registered first, so it runs first each frame.
		gp.setPad( 0, { "buttons": [ false, false, false, false ], "axes": [ 0, 0, 0, 0 ] } );
		if( mode === "every-frame-before-loop" ) {
			requestAnimationFrame( userLoop );
		}
		$.startGamepad();
		if( mode === "every-frame" || mode === "every-other-frame" ) {
			requestAnimationFrame( userLoop );
		}
		for( frame = 0; frame < script.length; frame++ ) {
			gp.setPad( 0, script[ frame ] );
			gp.frame();

			// Timer-driven consumer: reads between frames, every other frame.
			if( mode === "timer-every-other-frame" && frame % 2 === 0 ) {
				read();
			}
			if( mode === "timer-every-frame" ) {
				read();
			}
		}
		active = false;
		$.stopGamepad();
		return counts;
	}

	const modes = [
		"every-frame", "every-frame-before-loop", "timer-every-frame", "every-other-frame",
		"timer-every-other-frame"
	];
	const observed = {};
	for( const mode of modes ) {
		observed[ mode ] = run( mode );
	}
	const confirmed = modes.some( mode => {
		const c = observed[ mode ];
		return c.pressed !== 1 || c.released !== 1;
	} );
	return {
		observed,
		"expected": "each mode: pressed 1, released 1 (axisChanged 2 when every frame is read)",
		confirmed
	};
};

/**
 * P3: a `gamepadconnected` event for a pad that is already tracked, such as an event that
 * arrives after the start-up scan found the pad, fires the connect handlers again.
 */
PROBES.P3 = async () => {
	const gp = window.__gp;
	const calls = [];
	gp.setPad( 0, {} );
	$.onGamepadConnected( pad => { calls.push( pad.index ); } );
	gp.connect( 0 );
	$.stopGamepad();
	return {
		"observed": { "connectCalls": calls },
		"expected": "one connect call for pad 0",
		"confirmed": calls.length !== 1
	};
};

/**
 * P3b: the press that exposes a pad. Browsers hide pads until a button is pressed, then
 * dispatch `gamepadconnected` with that button held. A game reading every frame should see
 * that press once, as it does for later presses.
 */
PROBES.P3b = async () => {
	const gp = window.__gp;
	let presses = 0;
	function userLoop() {
		const pad = $.ingamepad( 0 );
		if( pad && pad.getButtonJustPressed( 0 ) ) {
			presses += 1;
		}
		requestAnimationFrame( userLoop );
	}
	$.onGamepadConnected( () => {} );
	requestAnimationFrame( userLoop );
	gp.frame();
	gp.frame();

	// The gesture: the pad appears with button 0 held, and the event arrives between frames.
	gp.setPad( 0, { "buttons": [ true, false, false, false ] } );
	gp.connect( 0 );
	gp.frame();
	gp.frame();
	gp.setPad( 0, { "buttons": [ false, false, false, false ] } );
	gp.frame();

	// A second, ordinary press for comparison.
	gp.setPad( 0, { "buttons": [ true, false, false, false ] } );
	gp.frame();
	gp.setPad( 0, { "buttons": [ false, false, false, false ] } );
	gp.frame();
	$.stopGamepad();
	return {
		"observed": { "pressesSeen": presses, "pressesMade": 2 },
		"expected": "2: the exposing press and the ordinary press",
		"confirmed": presses !== 2
	};
};

/**
 * P4: window blur while a button edge is active. Pi.js pauses its loop, so every later read
 * returns the frozen snapshot, including a "just pressed" that repeats and a button that
 * stays held after it is released.
 */
PROBES.P4 = async () => {
	const gp = window.__gp;
	const frames = [];
	let label = "";

	// A game loop that reads every frame after the plugin loop: the case P1 shows working.
	function userLoop() {
		const pad = $.ingamepad( 0 );
		frames.push( {
			"frame": label,
			"justPressed": pad.getButtonJustPressed( 0 ),
			"pressed": pad.getButtonPressed( 0 )
		} );
		requestAnimationFrame( userLoop );
	}
	gp.setPad( 0, {} );
	$.startGamepad();
	requestAnimationFrame( userLoop );
	label = "idle";
	gp.frame();
	label = "press";
	gp.setPad( 0, { "buttons": [ true, false, false, false ] } );
	gp.frame();
	window.dispatchEvent( new Event( "blur" ) );
	label = "blurred, held";
	gp.frame();
	label = "blurred, released";
	gp.setPad( 0, { "buttons": [ false, false, false, false ] } );
	gp.frame();
	label = "blurred, released";
	gp.frame();
	window.dispatchEvent( new Event( "focus" ) );
	label = "focused";
	gp.frame();
	$.stopGamepad();
	const blurred = frames.filter( f => f.frame.startsWith( "blurred" ) );
	return {
		"observed": { frames },
		"expected": "justPressed only on the press frame; pressed false once released",
		"confirmed": blurred.some( f => f.justPressed ) ||
			blurred.some( f => f.frame === "blurred, released" && f.pressed )
	};
};

/**
 * P5: throwing handlers. A throwing disconnect handler stops later handlers and leaves the
 * pad in the list. A throwing connect handler stops later handlers; during the start-up scan
 * it also escapes from the command that started polling and leaves the loop stopped.
 */
PROBES.P5 = async () => {
	const gp = window.__gp;
	const result = {};

	// Disconnect path.
	gp.setPad( 0, {} );
	gp.setPad( 1, {} );
	$.startGamepad();
	gp.frame();
	const later = [];
	$.onGamepadDisconnected( () => { throw new Error( "probe disconnect handler" ); } );
	$.onGamepadDisconnected( data => { later.push( data.index ); } );
	gp.disconnect( 1 );
	gp.frame();
	const list = $.ingamepad();
	result.disconnect = {
		"laterHandlerCalls": later,
		"listIndices": list.map( pad => pad.index ),
		"ghostConnectedFlag": list.length > 1 ? list[ 1 ].connected : null
	};
	$.clearEvents( "gamepad" );

	// Connect path during an event.
	const laterConnect = [];
	$.onGamepadConnected( () => { throw new Error( "probe connect handler" ); } );
	$.onGamepadConnected( pad => { laterConnect.push( pad.index ); } );
	gp.setPad( 2, {} );
	gp.connect( 2 );
	result.connectEvent = { "laterHandlerCalls": laterConnect };
	result.uncaught = gp.errors.slice();
	$.stopGamepad();
	return {
		"observed": result,
		"expected": "later handlers still run; pad 1 leaves the list; errors are reported",
		"confirmed": later.length === 0 || result.disconnect.listIndices.includes( 1 ) ||
			laterConnect.length === 0
	};
};

/**
 * P5b: a throwing connect handler during the start-up scan escapes from the registering
 * command and leaves the polling loop unscheduled. Needs a fresh page, so it is its own probe.
 */
PROBES.P5b = async () => {
	const gp = window.__gp;
	gp.setPad( 0, {} );
	let thrown = null;
	try {
		$.onGamepadConnected( () => { throw new Error( "probe scan handler" ); } );
	} catch( error ) {
		thrown = error.message;
	}
	const pendingAfterThrow = gp.pending();
	return {
		"observed": { "thrownFromOnGamepadConnected": thrown, pendingAfterThrow },
		"expected": "registration succeeds; the loop is scheduled (1 pending frame)",
		"confirmed": thrown !== null || pendingAfterThrow !== 1
	};
};

/**
 * P6: a handler that registers another handler during dispatch. The new handler runs in the
 * same dispatch because the plugin iterates the live array.
 */
PROBES.P6 = async () => {
	const gp = window.__gp;
	const calls = [];
	$.startGamepad();
	$.onGamepadConnected( () => {
		calls.push( "first" );
		if( calls.length === 1 ) {
			$.onGamepadConnected( () => { calls.push( "added-during-dispatch" ); } );
		}
	} );
	gp.setPad( 0, {} );
	gp.connect( 0 );
	$.stopGamepad();
	return {
		"observed": { calls },
		"expected": "[\"first\"]: a handler added during dispatch waits for the next event",
		"confirmed": calls.includes( "added-during-dispatch" )
	};
};

/**
 * P7: replay of already-connected pads. Only the first start scans, so a handler registered
 * after polling started never learns of a pad that is already connected.
 */
PROBES.P7 = async () => {
	const gp = window.__gp;
	gp.setPad( 0, {} );
	const first = [];
	const second = [];
	$.onGamepadConnected( pad => { first.push( pad.index ); } );
	$.onGamepadConnected( pad => { second.push( pad.index ); } );
	$.stopGamepad();
	return {
		"observed": { "firstHandler": first, "secondHandler": second },
		"expected": "both handlers receive pad 0 (metadata: also triggered for connected pads)",
		"confirmed": second.length !== 1
	};
};

/** P8: lifecycle: stop, reads after stop, handler registration after stop, repeat start. */
PROBES.P8 = async () => {
	const gp = window.__gp;
	gp.setPad( 0, {} );
	$.startGamepad();
	$.startGamepad();
	const pendingAfterDoubleStart = gp.pending();
	$.stopGamepad();
	const readAfterStop = $.ingamepad( 0 );
	const listAfterStop = $.ingamepad();
	const connectCalls = [];
	$.onGamepadConnected( pad => { connectCalls.push( pad.index ); } );
	const readAfterRegister = $.ingamepad( 0 ) ? "gamepad object" : null;
	$.stopGamepad();
	gp.setPad( 1, {} );
	gp.connect( 1 );
	const trackedWhileStopped = connectCalls.includes( 1 );
	return {
		"observed": {
			pendingAfterDoubleStart,
			"readAfterStop": readAfterStop,
			"listAfterStop": listAfterStop,
			readAfterRegister,
			"connectHandlerCalledWhileStopped": trackedWhileStopped
		},
		"expected": "documented behavior (recorded, not a defect by itself)",
		"confirmed": readAfterRegister !== null
	};
};

/** P9: `clearEvents( "gamepad" )` from a screen clears the global handlers; polling goes on. */
PROBES.P9 = async () => {
	const gp = window.__gp;
	const screen = $.screen( "16x16" );
	const calls = [];
	$.onGamepadConnected( pad => { calls.push( pad.index ); } );
	screen.clearEvents( "gamepad" );
	gp.setPad( 0, {} );
	gp.connect( 0 );
	const pendingAfterClear = gp.pending();
	$.onGamepadConnected( pad => { calls.push( "again-" + pad.index ); } );
	$.clearEvents();
	gp.setPad( 1, {} );
	gp.connect( 1 );
	$.stopGamepad();
	return {
		"observed": { calls, pendingAfterClear },
		"expected": "screen-level clear leaves global gamepad handlers (or is documented)",
		"confirmed": calls.length === 0
	};
};

/** P10: helper-method validation and out-of-range values. */
PROBES.P10 = async () => {
	const gp = window.__gp;
	gp.setPad( 0, {} );
	$.startGamepad();
	gp.frame();
	const pad = $.ingamepad( 0 );
	const outcomes = {};
	const calls = {
		"getButton(-1)": () => pad.getButton( -1 ),
		"getButton(9)": () => pad.getButton( 9 ),
		"getButton('0')": () => typeof pad.getButton( "0" ),
		"getButton('a')": () => pad.getButton( "a" ),
		"getButtonPressed(9)": () => pad.getButtonPressed( 9 ),
		"getButtonPressed(1.5)": () => pad.getButtonPressed( 1.5 ),
		"getButtonPressed(NaN)": () => pad.getButtonPressed( NaN ),
		"getButtonPressed()": () => pad.getButtonPressed(),
		"getButtonJustPressed(9)": () => pad.getButtonJustPressed( 9 ),
		"getButtonJustPressed(1.5)": () => pad.getButtonJustPressed( 1.5 ),
		"getButtonJustReleased(9)": () => pad.getButtonJustReleased( 9 ),
		"getAxis(9)": () => pad.getAxis( 9 ),
		"getAxis(1.5)": () => pad.getAxis( 1.5 ),
		"getAxisChanged(9)": () => pad.getAxisChanged( 9 )
	};
	for( const name in calls ) {
		try {
			const value = calls[ name ]();
			if( value === undefined ) {
				outcomes[ name ] = "undefined";
			} else {
				outcomes[ name ] = value;
			}
		} catch( error ) {
			outcomes[ name ] = "throws " + error.name;
		}
	}
	$.stopGamepad();
	return {
		"observed": outcomes,
		"expected": "invalid indices rejected or reported alike; no raw TypeError",
		"confirmed": Object.values( outcomes ).some(
			v => typeof v === "string" && v.startsWith( "throws" )
		)
	};
};

/** P11: `ingamepad()` return shapes and index gaps. */
PROBES.P11 = async () => {
	const gp = window.__gp;
	gp.setPad( 0, {} );
	gp.setPad( 2, {} );
	$.startGamepad();
	gp.frame();
	const list = $.ingamepad();
	const missing = $.ingamepad( 1 );
	let badIndex;
	try {
		$.ingamepad( -1 );
		badIndex = "no error";
	} catch( error ) {
		badIndex = error.code;
	}
	$.stopGamepad();
	return {
		"observed": {
			"listIndices": list.map( pad => pad.index ),
			"listPosition1Index": list[ 1 ].index,
			"missingIndex": missing === undefined ? "undefined" : missing,
			"afterStop": $.ingamepad( 0 ),
			"negativeIndex": badIndex
		},
		"expected": "recorded; the four return shapes are null, undefined, object, and array",
		"confirmed": true
	};
};

/** P12: identity and per-update allocation of the returned state. */
PROBES.P12 = async () => {
	const gp = window.__gp;
	gp.setPad( 0, {} );
	$.startGamepad();
	gp.frame();
	const pad = $.ingamepad( 0 );
	const buttons = pad.buttons;
	const button0 = pad.buttons[ 0 ];
	const axes = pad.axes;
	const listA = $.ingamepad();
	const listB = $.ingamepad();
	gp.setPad( 0, { "buttons": [ true, false, false, false ] } );
	gp.frame();
	const again = $.ingamepad( 0 );
	$.stopGamepad();
	return {
		"observed": {
			"samePadObject": pad === again,
			"sameButtonsArray": buttons === again.buttons,
			"sameButtonObject": button0 === again.buttons[ 0 ],
			"heldButtonsReferenceSeesPress": buttons[ 0 ].pressed,
			"sameAxesArray": axes === again.axes,
			"sameListArray": listA === listB,
			"allocationsPerPadUpdate": "1 buttons array + 1 object per button + axes array " +
				"+ lastAxes copy"
		},
		"expected": "live object with stable arrays, or a documented snapshot",
		"confirmed": pad === again && buttons !== again.buttons
	};
};

/** P13: dead-zone model. */
PROBES.P13 = async () => {
	const gp = window.__gp;
	function read( axes ) {
		gp.setPad( 0, { "axes": axes } );
		gp.frame();
		return $.ingamepad( 0 ).axes.slice( 0, 2 ).map( v => Math.round( v * 1e4 ) / 1e4 );
	}
	gp.setPad( 0, {} );
	$.startGamepad();
	gp.frame();
	const observed = {
		"diagonal (0.15, 0.15), magnitude 0.212": read( [ 0.15, 0.15, 0, 0 ] ),
		"(0.5, 0.1)": read( [ 0.5, 0.1, 0, 0 ] ),
		"(0.7071, 0.7071), magnitude 1": read( [ 0.7071, 0.7071, 0, 0 ] )
	};
	$.setGamepadSensitivity( 1 );
	observed[ "sensitivity 1: (0.99, 1)" ] = read( [ 0.99, 1, 0, 0 ] );
	$.set( { "gamepadSensitivity": 0.5 } );
	observed[ "set({ gamepadSensitivity: 0.5 }): (0.75, 0)" ] = read( [ 0.75, 0, 0, 0 ] );
	$.stopGamepad();
	return {
		observed,
		"expected": "a radial stick dead zone keeps the diagonal and does not snap (0.5, 0.1)",
		"confirmed": observed[ "diagonal (0.15, 0.15), magnitude 0.212" ][ 0 ] === 0
	};
};

/** P14: Lite without the plugin: the `set()` option and unknown options. */
PROBES.P14 = async () => {
	const outcomes = {};
	for( const [ name, options ] of [
		[ "gamepadSensitivity", { "gamepadSensitivity": 0.5 } ],
		[ "unknownOption", { "notARealOption": 1 } ]
	] ) {
		try {
			$.set( options );
			outcomes[ name ] = "accepted silently";
		} catch( error ) {
			outcomes[ name ] = "throws " + ( error.code || error.name );
		}
	}
	outcomes.ingamepadType = typeof $.ingamepad;
	return {
		"observed": outcomes,
		"expected": "API.md: unsupported properties are not accepted",
		"confirmed": outcomes.gamepadSensitivity === "accepted silently"
	};
};

/** P14b: Lite with the standalone plugin registered: the commands exist and work. */
PROBES.P14b = async () => {
	const gp = window.__gp;
	gp.setPad( 0, {} );
	$.startGamepad();
	gp.frame();
	const pad = $.ingamepad( 0 );
	$.stopGamepad();
	return {
		"observed": { "ingamepadIndex": pad ? pad.index : null },
		"expected": "pad 0",
		"confirmed": !pad
	};
};


/*************************************************************************************************
 * Runner
 ************************************************************************************************/


const FULL_PROBES = [
	"P1", "P3", "P3b", "P4", "P5", "P5b", "P6", "P7", "P8", "P9", "P10", "P11", "P12", "P13"
];

/**
 * Run one probe in a fresh page.
 *
 * @param {Object} browser - Playwright browser.
 * @param {string[]} scripts - Bundles to inject, in order.
 * @param {Function} fn - Probe page function.
 * @returns {Promise<Object>} Probe result plus page errors.
 */
async function runProbe( browser, scripts, fn ) {
	const page = await browser.newPage();
	const pageErrors = [];
	page.on( "pageerror", error => pageErrors.push( error.message ) );
	try {
		await page.setContent( EMPTY_PAGE );
		await page.evaluate( installMocks );
		for( const content of scripts ) {
			await page.addScriptTag( { "content": content } );
		}
		await page.evaluate( () => $.ready() );
		const result = await page.evaluate( fn );
		result.pageErrors = pageErrors;
		return result;
	} catch( error ) {
		return { "error": error.message, pageErrors };
	} finally {
		await page.close();
	}
}

/**
 * Load each manual gamepad page through the source-serving context and record page errors.
 *
 * @param {Object} browser - Playwright browser.
 * @returns {Promise<Object>} Page errors keyed by page name.
 */
async function runManualPages( browser ) {
	const context = await g_harness.createSourceContext( browser );
	const results = {};
	try {
		for( const name of MANUAL_PAGES ) {
			const page = await context.newPage();
			const errors = [];
			page.on( "pageerror", error => errors.push( error.message ) );
			await page.goto( "http://localhost:8080/test/tests/html-manual/" + name );
			await page.waitForTimeout( 250 );
			results[ name ] = { "pageErrors": errors };
			await page.close();
		}
	} finally {
		await context.close();
	}
	return results;
}

async function main() {
	const full = await g_harness.buildSource( "src/index-full.js" );
	const lite = await g_harness.buildSource( "src/index.js" );
	const plugin = await g_harness.buildSource( "plugins/gamepad/index.js" );
	const revision = g_childProcess.execFileSync( "git", [ "rev-parse", "--short", "HEAD" ], {
		"encoding": "utf8"
	} ).trim();
	const output = { revision, "engines": {} };

	for( const engine of ENGINES ) {
		const browser = await g_playwright[ engine ].launch( { "headless": true } );
		const results = { "version": browser.version(), "probes": {} };
		for( const id of FULL_PROBES ) {
			results.probes[ id ] = await runProbe( browser, [ full ], PROBES[ id ] );
		}
		results.probes.P14 = await runProbe( browser, [ lite ], PROBES.P14 );
		results.probes.P14b = await runProbe( browser, [ lite, plugin ], PROBES.P14b );
		results.manualPages = await runManualPages( browser );
		await browser.close();
		output.engines[ engine ] = results;
		const confirmed = Object.keys( results.probes ).filter(
			id => results.probes[ id ].confirmed
		);
		console.log( `${engine} ${results.version}: confirmed ${confirmed.join( ", " )}` );
	}

	await g_fs.writeFile( OUTPUT_FILE, JSON.stringify( output, null, "\t" ) + "\n" );
	console.log( "Wrote " + g_path.relative( process.cwd(), OUTPUT_FILE ) );
}

await main();
