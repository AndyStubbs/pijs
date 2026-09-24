/**
 * Keyboard 2.3 audit probes: reproductions for the findings in
 * docs/plans/KEYBOARD-V2.3-AUDIT.md, run against fresh in-memory bundles of the current source
 * in Chromium, Firefox, and WebKit.
 *
 * Each probe dispatches synthetic `KeyboardEvent`s, runs one scenario, and records what it
 * observed next to what a correct plugin would do. K1n and K9n repeat two scenarios through
 * Playwright's native keyboard. The script changes no library code or tests.
 *
 * Run with `node docs/evidence/keyboard-2.3/probes.js`; it writes `probes-output.json` next to
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
const MANUAL_PAGES = [
	"clearevents_01.html", "events_comprehensive.html", "gamepad_01.html", "input_01.html",
	"onkey_sound_01.html"
];


/*************************************************************************************************
 * Page Helpers
 ************************************************************************************************/


/**
 * Install key-dispatch helpers. Runs in the page before the bundle loads.
 *
 * `window.__kb` exposes:
 * - `down( key, code, init, target )` / `up( ... )`: dispatch a cancelable keydown or keyup on
 *   `target` (default `window`) and return the event, so `defaultPrevented` can be read.
 * - `type( text )`: a keydown and keyup for each character, with a code for letters and digits.
 * - `tick( ms )`: wait for timers.
 * - `errors`: messages of uncaught errors, including those reported through microtasks.
 */
function installHelpers() {
	const kb = { "errors": [] };
	window.addEventListener( "error", event => kb.errors.push( event.message ) );

	function send( type, key, code, init, target ) {
		const event = new KeyboardEvent( type, Object.assign( {
			"key": key, "code": code, "bubbles": true, "cancelable": true, "composed": true
		}, init || {} ) );
		( target || window ).dispatchEvent( event );
		return event;
	}

	function codeFor( ch ) {
		if( /^[a-z]$/i.test( ch ) ) {
			return "Key" + ch.toUpperCase();
		}
		if( /^[0-9]$/.test( ch ) ) {
			return "Digit" + ch;
		}
		const codes = { " ": "Space", "-": "Minus", ".": "Period", "+": "Equal" };
		return codes[ ch ] || "Unidentified";
	}

	kb.down = ( key, code, init, target ) => send( "keydown", key, code, init, target );
	kb.up = ( key, code, init, target ) => send( "keyup", key, code, init, target );
	kb.type = text => {
		for( const ch of text ) {
			kb.down( ch, codeFor( ch ) );
			kb.up( ch, codeFor( ch ) );
		}
	};
	kb.press = ( key, code, init ) => {
		const event = kb.down( key, code, init );
		kb.up( key, code, init );
		return event;
	};
	kb.tick = ms => new Promise( resolve => setTimeout( resolve, ms ) );
	window.__kb = kb;
}


/*************************************************************************************************
 * Probes
 ************************************************************************************************/


const PROBES = {};

/** K1: a key released after Shift keeps its shifted key value held. */
PROBES.K1 = async () => {
	const kb = window.__kb;
	let comboFired = 0;
	$.onkey( [ "A", "Enter" ], "down", () => { comboFired += 1; } );
	kb.down( "Shift", "ShiftLeft", { "shiftKey": true } );
	kb.down( "A", "KeyA", { "shiftKey": true } );
	kb.up( "Shift", "ShiftLeft" );
	kb.up( "a", "KeyA" );
	const observed = {
		"inkeyA": !!$.inkey( "A" ),
		"inkeyKeyA": !!$.inkey( "KeyA" ),
		"inkeyAll": $.inkey().map( k => k.code )
	};
	kb.press( "Enter", "Enter" );
	observed.comboAEnterFiredAfterRelease = comboFired;

	// The same sequence with the letter held first and Shift pressed during the hold
	kb.down( "w", "KeyW" );
	kb.down( "Shift", "ShiftLeft", { "shiftKey": true } );
	kb.up( "W", "KeyW", { "shiftKey": true } );
	kb.up( "Shift", "ShiftLeft" );
	observed.inkeyLowerWAfterRelease = !!$.inkey( "w" );
	return {
		observed,
		"expected": "no key is held after every key is released; the combo never fires",
		"confirmed": observed.inkeyA || observed.inkeyLowerWAfterRelease
	};
};

/** K1b: two physical keys with the same key value; releasing one clears the other. */
PROBES.K1b = async () => {
	const kb = window.__kb;
	kb.down( "Shift", "ShiftLeft", { "shiftKey": true, "location": 1 } );
	kb.down( "Shift", "ShiftRight", { "shiftKey": true, "location": 2 } );
	kb.up( "Shift", "ShiftRight", { "shiftKey": true, "location": 2 } );
	const shift = $.inkey( "Shift" );
	const shiftLeft = $.inkey( "ShiftLeft" );
	kb.down( "1", "Digit1" );
	kb.down( "1", "Numpad1", { "location": 3 } );
	kb.up( "1", "Numpad1", { "location": 3 } );
	const one = $.inkey( "1" );
	const digit1 = $.inkey( "Digit1" );
	return {
		"observed": {
			"shiftWhileShiftLeftHeld": shift ? shift.code : null,
			"shiftLeft": shiftLeft ? shiftLeft.code : null,
			"oneWhileDigit1Held": one ? one.code : null,
			"digit1": digit1 ? digit1.code : null
		},
		"expected": "inkey( \"Shift\" ) and inkey( \"1\" ) report the key still held",
		"confirmed": shift === null || one === null
	};
};

/** K2: clearEvents on the active screen strands a prompt owned by another screen. */
PROBES.K2 = async () => {
	const kb = window.__kb;
	const owner = $.screen( "160x80" );
	const values = [];
	let settled = "pending";
	owner.input( "Name?", value => values.push( value ) ).then( value => {
		settled = value;
	} );
	const active = $.screen( "160x80" );
	let otherFired = 0;
	$.onkey( "KeyZ", "down", () => { otherFired += 1; } );
	active.clearEvents();
	kb.press( "x", "KeyX" );
	kb.press( "Enter", "Enter" );
	kb.press( "z", "KeyZ" );
	await kb.tick( 250 );
	const afterClearAndEnter = settled;
	const callbacksBeforeCancel = values.length;
	owner.cancelInput();
	await kb.tick( 0 );
	return {
		"observed": {
			"settledAfterClearAndEnter": afterClearAndEnter,
			"callbackCallsBeforeOwnerCancel": callbacksBeforeCancel,
			"globalHandlerRegisteredBeforeClearFired": otherFired,
			"settledAfterOwnerCancelInput": settled
		},
		"expected": "clearEvents cancels the prompt (API.md: event clearing resolves null), or " +
			"leaves it working",
		"confirmed": afterClearAndEnter === "pending"
	};
};

/** K3: maxLength undefined throws although the parameter is optional. */
PROBES.K3 = async () => {
	$.screen( "160x80" );
	const outcomes = {};
	const cases = {
		"objectFormUndefined": () => $.input( { "prompt": "?", "maxLength": undefined } ),
		"positionalUndefined": () => $.input( "?", undefined, undefined, false, false, false,
			undefined ),
		"objectFormOmitted": () => $.input( { "prompt": "?" } ),
		"nullNoLimit": () => $.input( { "prompt": "?", "maxLength": null } )
	};
	for( const name in cases ) {
		try {
			cases[ name ]();
			$.cancelInput();
			outcomes[ name ] = "accepted";
		} catch( error ) {
			outcomes[ name ] = "throws " + ( error.code || error.name );
		}
	}
	return {
		"observed": outcomes,
		"expected": "every form is accepted",
		"confirmed": outcomes.objectFormUndefined !== "accepted" ||
			outcomes.positionalUndefined !== "accepted"
	};
};

/** K4: onkey accepts any mode string; a mistyped mode never fires. */
PROBES.K4 = async () => {
	const kb = window.__kb;
	const outcomes = {};
	const fired = {};
	for( const mode of [ "press", "DOWN", "keydown" ] ) {
		fired[ mode ] = 0;
		try {
			$.onkey( "KeyA", mode, () => { fired[ mode ] += 1; } );
			outcomes[ mode ] = "accepted";
		} catch( error ) {
			outcomes[ mode ] = "throws " + ( error.code || error.name );
		}
	}
	try {
		$.offkey( "KeyA", "sideways", () => {} );
		outcomes.offkeyBadMode = "accepted";
	} catch( error ) {
		outcomes.offkeyBadMode = "throws " + ( error.code || error.name );
	}
	try {
		$.onkey( [], "down", () => {} );
		outcomes.emptyCombo = "accepted";
	} catch( error ) {
		outcomes.emptyCombo = "throws " + ( error.code || error.name );
	}
	kb.press( "a", "KeyA" );
	return {
		"observed": { outcomes, fired },
		"expected": "mode other than \"up\" or \"down\", and an empty combo, throw " +
			"INVALID_PARAMETERS",
		"confirmed": outcomes.press === "accepted"
	};
};

/** K5: offkey without the registration's flags leaves the handler registered. */
PROBES.K5 = async () => {
	const kb = window.__kb;
	let onceCount = 0;
	let repeatCount = 0;
	const onceFn = () => { onceCount += 1; };
	const repeatFn = () => { repeatCount += 1; };
	$.onkey( "KeyA", "down", onceFn, true );
	$.onkey( "KeyB", "down", repeatFn, false, true );
	$.offkey( "KeyA", "down", onceFn );
	$.offkey( "KeyB", "down", repeatFn );
	kb.press( "a", "KeyA" );
	kb.press( "b", "KeyB" );
	let omittedMode = 0;
	const modeFn = () => { omittedMode += 1; };
	$.onkey( "KeyC", "down", modeFn );
	$.offkey( { "key": "KeyC", "fn": modeFn } );
	kb.press( "c", "KeyC" );
	return {
		"observed": {
			"onceHandlerCallsAfterOffkey": onceCount,
			"allowRepeatHandlerCallsAfterOffkey": repeatCount,
			"handlerCallsAfterOffkeyWithoutMode": omittedMode
		},
		"expected": "offkey( key, mode, fn ) removes the handler; the toml marks mode optional",
		"confirmed": onceCount > 0 || repeatCount > 0 || omittedMode > 0
	};
};

/** K6: onkey sorts the caller's array; duplicate combo entries fire twice. */
PROBES.K6 = async () => {
	const kb = window.__kb;
	const combo = [ "KeyS", "Control" ];
	$.onkey( combo, "down", () => {} );
	let duplicateCalls = 0;
	$.onkey( [ "KeyD", "KeyD" ], "down", () => { duplicateCalls += 1; } );
	kb.press( "d", "KeyD" );
	let comboData = null;
	$.onkey( [ "Control", "KeyQ" ], "down", data => { comboData = data; } );
	kb.down( "Control", "ControlLeft", { "ctrlKey": true } );
	kb.down( "q", "KeyQ", { "ctrlKey": true } );
	kb.up( "q", "KeyQ", { "ctrlKey": true } );
	kb.up( "Control", "ControlLeft" );
	return {
		"observed": {
			"callerArrayAfterOnkey": combo,
			"duplicateComboCallsPerPress": duplicateCalls,
			"comboDataIsArray": Array.isArray( comboData ),
			"comboDataOrder": comboData ? comboData.map( k => k.code ) : null
		},
		"expected": "the caller's array is unchanged; a key listed twice fires once",
		"confirmed": combo[ 0 ] !== "KeyS" || duplicateCalls > 1
	};
};

/** K7: inkey( key ) returns the plugin's live state object. */
PROBES.K7 = async () => {
	const kb = window.__kb;
	kb.down( "a", "KeyA" );
	const first = $.inkey( "KeyA" );
	first.code = "Mutated";
	first.key = "Mutated";
	const second = $.inkey( "KeyA" );
	const sameObject = first === second;
	const all = $.inkey();
	const allAgain = $.inkey();
	kb.up( "a", "KeyA" );
	return {
		"observed": {
			"sameObjectReturnedTwice": sameObject,
			"codeAfterMutation": second ? second.code : null,
			"arrayIsNewEachCall": all !== allAgain
		},
		"expected": "callers cannot change plugin state through a returned object",
		"confirmed": sameObject && second.code === "Mutated"
	};
};

/** K8: stopKeyboard is not undone by polling or registration, and strands a prompt. */
PROBES.K8 = async () => {
	const kb = window.__kb;
	$.screen( "160x80" );
	$.stopKeyboard();
	let fired = 0;
	$.onkey( "KeyA", "down", () => { fired += 1; } );
	$.inkey( "KeyA" );
	kb.press( "a", "KeyA" );
	let settled = "pending";
	$.input( "?" ).then( value => { settled = value; } );
	kb.press( "Enter", "Enter" );
	await kb.tick( 50 );
	const settledWhileStopped = settled;
	$.cancelInput();
	await kb.tick( 0 );

	// startKeyboard blurs whatever element has focus
	const field = document.createElement( "input" );
	document.body.appendChild( field );
	field.focus();
	const focusedBefore = document.activeElement === field;
	$.startKeyboard();
	const focusedAfter = document.activeElement === field;
	return {
		"observed": {
			"handlerCallsAfterRegisterAndPoll": fired,
			"promptSettledAfterEnterWhileStopped": settledWhileStopped,
			"fieldFocusedBeforeStart": focusedBefore,
			"fieldFocusedAfterStart": focusedAfter
		},
		"expected": "API.md: polling and handler registration start the tracker",
		"confirmed": fired === 0
	};
};

/** K9: the prompt does not own the keyboard while it is active. */
PROBES.K9 = async () => {
	const kb = window.__kb;
	$.screen( "160x80" );
	let enterHandler = 0;
	$.onkey( "Enter", "down", () => { enterHandler += 1; } );
	let value = "pending";
	$.input( "?" ).then( v => { value = v; } );
	const space = kb.down( " ", "Space" );
	kb.up( " ", "Space" );
	const tab = kb.down( "Tab", "Tab" );
	kb.up( "Tab", "Tab" );
	kb.down( "Control", "ControlLeft", { "ctrlKey": true } );
	kb.press( "v", "KeyV", { "ctrlKey": true } );
	kb.up( "Control", "ControlLeft" );
	kb.press( "Enter", "Enter" );
	await kb.tick( 0 );
	const firstValue = value;

	// Keys arriving from a focused button are ignored; the prompt stays pending
	const button = document.createElement( "button" );
	document.body.appendChild( button );
	value = "pending";
	$.input( "?" ).then( v => { value = v; } );
	button.focus();
	kb.press( "x", "KeyX", {}, button );
	kb.down( "Enter", "Enter", {}, button );
	await kb.tick( 0 );
	const fromButton = value;
	$.cancelInput();
	return {
		"observed": {
			"spaceDefaultPrevented": space.defaultPrevented,
			"tabDefaultPrevented": tab.defaultPrevented,
			"valueAfterSpaceTabCtrlV": firstValue,
			"onkeyEnterCallsDuringPrompt": enterHandler,
			"promptAfterEnterFromFocusedButton": fromButton
		},
		"expected": "typed keys do not scroll or move focus; Ctrl+V does not type \"v\"; " +
			"game handlers do not see prompt keys",
		"confirmed": !space.defaultPrevented || firstValue === " v"
	};
};

/** K10: numeric prompt edge cases. */
PROBES.K10 = async () => {
	const kb = window.__kb;
	$.screen( "320x200" );
	async function run( options, keys ) {
		let result = "pending";
		$.input( Object.assign( { "prompt": "?" }, options ) ).then( v => { result = v; } );
		for( const k of keys ) {
			if( Array.isArray( k ) ) {
				kb.press( k[ 0 ], k[ 1 ] );
			} else {
				kb.type( k );
			}
		}
		kb.press( "Enter", "Enter" );
		await kb.tick( 0 );
		return result;
	}
	const observed = {
		"minusPastMaxLength2": await run(
			{ "isNumber": true, "allowNegative": true, "maxLength": 2 }, [ "12-" ]
		),
		"integerNumpadDecimal": await run(
			{ "isNumber": true, "isInteger": true }, [ "1", [ ".", "NumpadDecimal" ], "0" ]
		),
		"numberWithSpace": await run( { "isNumber": true }, [ " 4 " ] ),
		"leadingDecimalPoint5": await run( { "isNumber": true }, [ ".5" ] ),
		"integerWithoutIsNumber": await run( { "isInteger": true }, [ "12a" ] ),
		"negativeWithoutAllowNegative": await run( { "isNumber": true }, [ "-3" ] )
	};
	return {
		observed,
		"expected": "maxLength 2 holds \"-1\" at most; integer input has no decimal point; " +
			"\".5\" is accepted; isInteger returns a number",
		"confirmed": observed.minusPastMaxLength2 === -12 ||
			observed.leadingDecimalPoint5 !== 0.5 ||
			typeof observed.integerWithoutIsNumber === "string"
	};
};

/**
 * K11: prompt layout after a mid-line start, with a scaled print size, and with a value longer
 * than the line. Inline printing never wraps, so the long case records the widths only.
 */
PROBES.K11 = async () => {
	const kb = window.__kb;
	const s = $.screen( "160x80" );
	const observed = {};

	s.print( "Name", true );
	const before = s.getPosPx();
	s.input( "?" );
	kb.press( "Enter", "Enter" );
	await kb.tick( 0 );
	observed.midLine = { "before": before, "after": s.getPosPx() };

	s.cls();
	s.setPrintSize( 2, 2 );
	const scaledBefore = s.getPosPx();
	s.input( "?" );
	kb.press( "Enter", "Enter" );
	await kb.tick( 0 );
	observed.scaled = { "before": scaledBefore, "after": s.getPosPx(), "row": s.getPos().row };
	s.setPrintSize( 1, 1 );

	s.cls();
	s.setPos( 0, 0 );
	s.input( "?" );
	kb.type( "abcdefghijklmnopqrstuvwxyz0123" );
	kb.press( "Enter", "Enter" );
	await kb.tick( 0 );
	observed.longValue = { "cols": s.getCols(), "promptAndValueChars": 31, "after": s.getPos() };
	return {
		observed,
		"expected": "after Enter the cursor is at column 0 of the line below everything the " +
			"prompt drew",
		"confirmed": observed.midLine.after.x !== 0 || observed.scaled.row === 0
	};
};

/** K12: an input inside an open shadow root is not treated as editable. */
PROBES.K12 = async () => {
	const kb = window.__kb;
	const host = document.createElement( "div" );
	document.body.appendChild( host );
	const root = host.attachShadow( { "mode": "open" } );
	const field = document.createElement( "input" );
	root.appendChild( field );
	let fired = 0;
	$.onkey( "KeyA", "down", () => { fired += 1; } );
	kb.down( "a", "KeyA", {}, field );
	const held = !!$.inkey( "KeyA" );
	kb.up( "a", "KeyA", {}, field );
	const plain = document.createElement( "input" );
	document.body.appendChild( plain );
	kb.down( "a", "KeyA", {}, plain );
	const plainHeld = !!$.inkey( "KeyA" );
	kb.up( "a", "KeyA", {}, plain );
	return {
		"observed": {
			"shadowInputHandlerCalls": fired,
			"shadowInputHeld": held,
			"lightDomInputHeld": plainHeld
		},
		"expected": "typing into a shadow-root input is ignored, like a light-DOM input",
		"confirmed": fired > 0 || held
	};
};

/** K13: "any" keyup data and releases of keys pressed while stopped. */
PROBES.K13 = async () => {
	const kb = window.__kb;
	const upData = [];
	$.onkey( "any", "up", data => upData.push( { "shiftKey": data.shiftKey, "key": data.key } ) );
	let codeUp = 0;
	$.onkey( "KeyB", "up", () => { codeUp += 1; } );
	kb.down( "a", "KeyA" );
	kb.up( "a", "KeyA", { "shiftKey": true } );
	$.stopKeyboard();
	kb.down( "b", "KeyB" );
	$.startKeyboard();
	kb.up( "b", "KeyB" );
	return {
		"observed": { "anyUpData": upData, "keyBUpCallsForPressWhileStopped": codeUp },
		"expected": "the up handler gets the keyup's state (shiftKey true); a release is " +
			"reported even if the press was not seen",
		"confirmed": upData.length > 0 && upData[ 0 ].shiftKey === false
	};
};

/**
 * K14: composition. Browsers report composing keydowns as key "Process" and deliver composed
 * text through composition and input events, never as a keydown carrying the text.
 */
PROBES.K14 = async () => {
	const kb = window.__kb;
	$.screen( "160x80" );
	let value = "pending";
	$.input( "?" ).then( v => { value = v; } );
	kb.down( "Process", "KeyN", { "isComposing": true } );
	kb.up( "n", "KeyN", { "isComposing": true } );
	window.dispatchEvent( new CompositionEvent( "compositionend", { "data": "に" } ) );
	const heldAfterComposition = $.inkey( "Process" ) !== null;
	kb.press( "Enter", "Enter" );
	await kb.tick( 0 );
	return {
		"observed": {
			"value": value,
			"processHeldAfterRelease": heldAfterComposition
		},
		"expected": "the composed text \"に\" is entered; no key stays held after release",
		"confirmed": value !== "に"
	};
};

/** K20: setActionKeys adds to the set; elements are not validated. */
PROBES.K20 = async () => {
	const kb = window.__kb;
	$.setActionKeys( [ "Space" ] );
	$.setActionKeys( [ "KeyA" ] );
	const space = kb.press( " ", "Space" );
	$.set( { "actionKeys": [ "KeyB" ] } );
	const spaceAfterSet = kb.press( " ", "Space" );
	let badElement;
	try {
		$.setActionKeys( [ 1, null ] );
		badElement = "accepted";
	} catch( error ) {
		badElement = "throws " + ( error.code || error.name );
	}
	return {
		"observed": {
			"spacePreventedAfterSecondSet": space.defaultPrevented,
			"spacePreventedAfterSetSetting": spaceAfterSet.defaultPrevented,
			"nonStringElements": badElement
		},
		"expected": "a set command replaces the set; non-string keys throw",
		"confirmed": space.defaultPrevented
	};
};

/** K18: control: a plain press and release behaves correctly. */
PROBES.K18 = async () => {
	const kb = window.__kb;
	let down = 0;
	let up = 0;
	$.onkey( "KeyA", "down", () => { down += 1; } );
	$.onkey( "a", "up", () => { up += 1; } );
	kb.down( "a", "KeyA" );
	const held = !!$.inkey( "KeyA" ) && !!$.inkey( "a" );
	kb.up( "a", "KeyA" );
	const released = $.inkey( "KeyA" ) === null && $.inkey( "a" ) === null;
	return {
		"observed": { down, up, held, released },
		"expected": "one down, one up, held while pressed, released after",
		"confirmed": !( down === 1 && up === 1 && held && released )
	};
};

/** K19: Lite without the plugin has no keyboard commands; with it, they work. */
PROBES.K19 = async () => {
	return {
		"observed": { "inkeyType": typeof $.inkey, "inputType": typeof $.input },
		"expected": "record only",
		"confirmed": false
	};
};


/*************************************************************************************************
 * Runner
 ************************************************************************************************/


const FULL_PROBES = [
	"K1", "K1b", "K2", "K3", "K4", "K5", "K6", "K7", "K8", "K9", "K10", "K11", "K12", "K13",
	"K14", "K18", "K20"
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
		await page.evaluate( installHelpers );
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
 * K1n and K9n: the K1 and K9 scenarios through Playwright's native keyboard, whose events the
 * browser generates as trusted input rather than script-dispatched events.
 *
 * @param {Object} browser - Playwright browser.
 * @param {string} bundle - Full bundle source.
 * @returns {Promise<Object>} Results keyed by probe ID.
 */
async function runNativeProbes( browser, bundle ) {
	const page = await browser.newPage();
	const pageErrors = [];
	page.on( "pageerror", error => pageErrors.push( error.message ) );
	try {
		await page.setContent(
			"<!doctype html><html><body><div style=\"height:3000px\"></div></body></html>"
		);
		await page.addScriptTag( { "content": bundle } );
		await page.evaluate( () => $.ready() );
		await page.evaluate( () => { $.screen( { "aspect": "160x80", "noCss": true } ); } );

		await page.keyboard.down( "Shift" );
		await page.keyboard.down( "KeyA" );
		await page.keyboard.up( "Shift" );
		await page.keyboard.up( "KeyA" );
		const k1 = await page.evaluate( () => ( {
			"inkeyA": $.inkey( "A" ) !== null, "inkeyKeyA": $.inkey( "KeyA" ) !== null
		} ) );

		await page.evaluate( () => {
			window.__value = "pending";
			$.input( "?" ).then( v => { window.__value = v; } );
		} );
		await page.keyboard.press( "Space" );
		await page.keyboard.press( "Control+KeyV" );
		await page.keyboard.press( "Enter" );

		// Let smooth scrolling finish before reading the scroll position
		await page.waitForTimeout( 600 );
		const k9 = await page.evaluate( () => ( {
			"value": window.__value, "scrollY": Math.round( window.scrollY )
		} ) );
		return {
			"K1n": {
				"observed": k1,
				"expected": "no key held after release",
				"confirmed": k1.inkeyA,
				pageErrors
			},
			"K9n": {
				"observed": k9,
				"expected": "the prompt value is \" \" and the page does not scroll",
				"confirmed": k9.scrollY > 0 || k9.value !== " ",
				pageErrors
			}
		};
	} finally {
		await page.close();
	}
}

/**
 * K15: onscreen-keyboard integration, driven by native mouse clicks on a 400x280 screen at the
 * page origin. The coordinates are key positions of the "text" layout: (4, 34) is "q" and
 * (130, 50) is the SYMBOLS toggle.
 *
 * @param {Object} browser - Playwright browser.
 * @param {string[]} scripts - Full, print-table, and onscreen-keyboard bundles.
 * @returns {Promise<Object>} Probe result.
 */
async function runOnscreenProbe( browser, scripts ) {
	const observed = {};
	const pageErrors = [];
	for( const step of [ "code", "hideKeyboard", "removeScreen" ] ) {
		const page = await browser.newPage( { "viewport": { "width": 400, "height": 280 } } );
		page.on( "pageerror", error => pageErrors.push( error.message ) );
		try {
			await page.setContent(
				"<!doctype html><html><body style=\"margin:0\"></body></html>"
			);
			for( const content of scripts ) {
				await page.addScriptTag( { "content": content } );
			}
			await page.evaluate( async () => {
				await $.ready();
				window.__screen = $.screen( { "aspect": "400x280", "noCss": true } );
				window.__keys = [];
				$.onkey( "any", "down", k => window.__keys.push( k.code ) );
				$.showKeyboard( "text" );
			} );
			if( step === "code" ) {
				await page.mouse.click( 4, 34 );
				observed.codeForQ = await page.evaluate( () => window.__keys[ 0 ] );
				continue;
			}
			await page.mouse.click( 130, 50 );
			observed[ step + "AfterSymbolsTap" ] = await page.evaluate( name => {
				try {
					if( name === "hideKeyboard" ) {
						$.hideKeyboard();
					} else {
						window.__screen.removeScreen();
					}
					return "ok";
				} catch( error ) {
					return "throws " + error.message;
				}
			}, step );
		} finally {
			await page.close();
		}
	}
	return {
		observed,
		"expected": "a key press reports code \"KeyQ\"; hideKeyboard and removeScreen succeed",
		"confirmed": observed.codeForQ !== "KeyQ" ||
			observed.hideKeyboardAfterSymbolsTap !== "ok",
		pageErrors
	};
}

/**
 * Load each manual page that loads the keyboard plugin and record page errors.
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
	const plugin = await g_harness.buildSource( "plugins/keyboard/index.js" );
	const printTable = await g_harness.buildSource( "plugins/print-table/index.js" );
	const onscreen = await g_harness.buildSource( "plugins/onscreen-keyboard/index.js" );
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
		results.probes.K19 = await runProbe( browser, [ lite ], PROBES.K19 );
		results.probes.K19b = await runProbe( browser, [ lite, plugin ], PROBES.K18 );
		Object.assign( results.probes, await runNativeProbes( browser, full ) );
		results.probes.K15 = await runOnscreenProbe( browser, [ full, printTable, onscreen ] );
		results.manualPages = await runManualPages( browser );
		await browser.close();
		output.engines[ engine ] = results;
		const confirmed = Object.keys( results.probes ).filter(
			id => results.probes[ id ].confirmed
		);
		const failed = Object.keys( results.probes ).filter( id => results.probes[ id ].error );
		console.log( `${engine} ${results.version}: confirmed ${confirmed.join( ", " )}` );
		if( failed.length > 0 ) {
			console.log( `${engine}: probe errors ${failed.join( ", " )}` );
		}
	}

	await g_fs.writeFile( OUTPUT_FILE, JSON.stringify( output, null, "\t" ) + "\n" );
	console.log( "Wrote " + g_path.relative( process.cwd(), OUTPUT_FILE ) );
}

await main();
