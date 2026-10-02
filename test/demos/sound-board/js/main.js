// Pi.js SFX Lab entry point: one Pi.js screen for the whole UI, sound through sound-advanced

import { C, SCREEN_W, SCREEN_H } from "./theme.js";
import * as gui from "./gui.js";
import {
	CATEGORIES, WAVES, FILTER_TYPES, ARP_PATTERNS, SPECS, clamp, specToT, specFromT, formatValue,
	fromSynthOptions, toSynthOptions, toOneShotOptions, sanitizeParams, mutateParams, soundLength,
	isNoise, arpLabel
} from "./params.js";
import { EFFECTS, MAX_CHAIN, defaultEffects, applyEffects, countEnabled } from "./effects.js";
import { drawEnvelope, drawScope, drawSpectrum, drawMeter } from "./display.js";
import * as exporter from "./exporter.js";
import * as library from "./library.js";
import { ENGINE_STYLES, generateEngine } from "./engine.js";

const MAX_SEED = 4294967295;
const MAX_LAYERS = 4;

// The generator buttons: the generateSfx() categories, and the lab's own engine
const GENERATORS = CATEGORIES.concat( [ "engine" ] );

// Burn sliders, which set the envelope times of every layer at once
const BURN_SPECS = {
	"up": { "label": "BURN UP", "min": 0, "max": 3, "curve": "sq", "def": 0.5, "fmt": "s" },
	"active": { "label": "ACTIVE", "min": 0.05, "max": 5, "curve": "exp", "def": 1, "fmt": "s" },
	"down": { "label": "BURN DOWN", "min": 0, "max": 4, "curve": "sq", "def": 1, "fmt": "s" }
};
const BURN_TIPS = {
	"up": "Time every layer takes to rise: sets its attack and filter attack",
	"active": "Time at full burn after the burn up, for PLAY, AUTO, and the WAV file",
	"down": "Time every layer takes to fade: sets its release and filter release"
};
const STATUS_MS = 5000;
const STATUS_FRESH_MS = 2500;
const DELETE_CONFIRM_MS = 3000;
const WHEEL_PLAY_MS = 150;
const MUTATE_AMOUNT = 0.06;

// Parameter rows
const ROW_W = 220;
const ROW_H = 14;
const SLIDER_X = 60;
const SLIDER_W = 116;

const CATEGORY_TIPS = {
	"coin": "Pickups and points",
	"laser": "Shots: a falling sweep",
	"jump": "A rising sweep",
	"hit": "Short noise burst",
	"explosion": "Long filtered noise",
	"powerup": "Rising arpeggio",
	"blip": "Tiny UI tick",
	"select": "Menu confirm",
	"random": "Anything goes",
	"engine": "Layers that burn up, burn, and burn down. Each click is the next style: " +
		ENGINE_STYLES.join( ", " )
};

const PARAM_TIPS = {
	"duty": "Pulse width. 50% is square; 12.5% and 25% sound like retro consoles",
	"volume": "Peak volume",
	"pan": "Stereo position",
	"frequency": "Start pitch in Hz",
	"frequencyEnd": "Pitch the sound sweeps to over its length. Right-click turns the sweep off",
	"duration": "Gate length before the release starts",
	"attackTime": "Time from silence to peak",
	"decayTime": "Time from peak down to the sustain level",
	"sustainLevel": "Level held until the gate ends",
	"releaseTime": "Fade-out after the gate ends",
	"arpeggioRate": "Arpeggio steps per second",
	"filterCutoff": "Filter cutoff frequency",
	"filterQ": "Filter resonance",
	"filterAmount": "Octaves the filter envelope moves the cutoff (negative lowers it)",
	"filterAttackTime": "Filter envelope attack",
	"filterDecayTime": "Filter envelope decay",
	"filterSustainLevel": "Filter envelope sustain",
	"filterReleaseTime": "Filter envelope release",
	"vibratoDepth": "Pitch wobble in cents. 0 turns vibrato off",
	"vibratoRate": "Vibrato cycles per second",
	"tremoloDepth": "Volume wobble. 0 turns tremolo off",
	"tremoloRate": "Tremolo cycles per second"
};

const SLIDER_HELP = "Drag, wheel for fine steps, right-click to reset";

const state = {

	// A sound is one to MAX_LAYERS layers that play together. params is the selected layer
	"layers": [ null ],
	"layer": 0,
	get "params"() {
		return this.layers[ this.layer ];
	},
	set "params"( value ) {
		this.layers[ this.layer ] = value;
	},

	// A held sound plays while PLAY or Space is down, then releases
	"hold": false,
	"holding": false,

	// Style of the last engine the ENGINE button made, so the next click makes the next style
	"engineStyle": -1,
	"releaseStart": -1,
	"name": "",
	"category": "",
	"seed": null,
	"modified": false,
	"effects": defaultEffects(),
	"autoPlay": true,
	"trim": true,
	"masterVolume": 0.75,
	"libTab": "saved",
	"libScroll": 0,
	"pendingDelete": -1,
	"pendingDeleteTime": 0,
	"status": "",
	"statusColor": C.status,
	"statusTime": 0,
	"soundIds": [],
	"playStart": -1,
	"playLength": 0,
	"lastWheelPlay": 0,
	"prompt": false,
	"recording": false,
	"audioStarted": false,
	"peakHold": 0,
	"peakTime": 0
};

// ---- Actions ----

function setStatus( msg, color ) {
	state.status = msg;
	state.statusColor = color || C.status;
	state.statusTime = performance.now();
}

// The first sound call inside a user gesture creates and unlocks the audio context
function startAudio() {
	if( state.audioStarted ) {
		return;
	}
	state.audioStarted = true;
	$.sound( { "frequency": 440, "duration": 0.01, "volume": 0 } );
}

// Starts every layer, replacing the sound that is playing. Held, the layers play until they
// are released; otherwise each plays once for its own length.
function startLayers( held ) {
	startAudio();
	for( const soundId of state.soundIds ) {
		$.stopSound( soundId );
	}
	state.soundIds = [];
	state.holding = false;
	state.releaseStart = -1;
	try {
		state.soundIds = state.layers.map( params => $.synth(
			held ? toSynthOptions( params, true ) : toOneShotOptions( params, state.hold )
		) );
	} catch( err ) {
		console.error( err );
		setStatus( "SYNTH ERROR: " + ( err.code || err.message ), C.warn );
		return false;
	}
	markPlayhead();
	return true;
}

// Plays the sound once, each layer for its own length
function play() {
	startLayers( false );
}

// Starts the sound held; it plays until releaseHeld()
function startHeld() {
	state.holding = startLayers( true );
}

function releaseHeld() {
	if( !state.holding ) {
		return;
	}
	state.holding = false;
	state.releaseStart = performance.now();
	for( const soundId of state.soundIds ) {
		$.releaseSound( soundId );
	}
}

function markPlayhead() {
	state.playStart = performance.now();
	state.playLength = soundLength( state.params ) * 1000;
}

function autoPlay() {
	if( state.autoPlay ) {
		play();
	}
}

// Plays on wheel steps, but not faster than WHEEL_PLAY_MS
function wheelPlay() {
	const now = performance.now();
	if( now - state.lastWheelPlay > WHEEL_PLAY_MS ) {
		state.lastWheelPlay = now;
		autoPlay();
	}
}

function stopAll() {
	$.stopSound();
	state.soundIds = [];
	state.holding = false;
	state.playStart = -1;
}

function displayName() {
	return state.name + ( state.modified ? "*" : "" );
}

function historyEntry() {
	return {
		"name": displayName(),
		"category": state.category,
		"seed": state.seed,
		"params": state.layers[ 0 ],
		"layers": state.layers,
		"hold": state.hold
	};
}

function loadSound( sound ) {
	state.layers = sound.layers;
	state.layer = 0;
	state.hold = sound.hold;
	state.holding = false;
	state.name = sound.name;
	state.category = sound.category;
	state.seed = sound.seed;
	state.modified = false;
	if( sound.effects ) {
		state.effects = sound.effects;
		applyEffects( state.effects );
	}
}

function generate( category, seed ) {
	if( category === "engine" ) {
		generateEngineSound( seed );
		return;
	}
	if( seed === undefined ) {
		seed = 1 + Math.floor( Math.random() * MAX_SEED );
	}
	loadSound( {
		"name": category + "-" + seed,
		category,
		seed,
		"layers": [ fromSynthOptions( $.generateSfx( category, seed ) ) ],
		"hold": false,

		// An engine brings its own bus effects, so the sound after one starts without them
		"effects": state.category === "engine" ? defaultEffects() : null
	} );
	library.addHistory( historyEntry() );
	play();
}

// An engine's seed also picks its style. Without a seed, the next style is made.
function generateEngineSound( seed ) {
	const styles = ENGINE_STYLES.length;
	if( seed === undefined ) {
		state.engineStyle = ( state.engineStyle + 1 ) % styles;
		seed = ( 1 + Math.floor( Math.random() * ( MAX_SEED / styles - 1 ) ) ) * styles + state.engineStyle;
	}
	const engine = generateEngine( seed );
	state.engineStyle = ENGINE_STYLES.indexOf( engine.style );
	loadSound( {
		"name": engine.style + "-" + seed,
		"category": "engine",
		seed,
		"layers": engine.layers,
		"hold": true,
		"effects": engine.effects
	} );
	library.addHistory( historyEntry() );
	play();
}

function mutate() {
	state.layers = state.layers.map( params => mutateParams( params, MUTATE_AMOUNT ) );
	state.modified = true;
	library.addHistory( historyEntry() );
	play();
}

function setParam( key, value ) {
	state.params = sanitizeParams( { ...state.params, [ key ]: value } );
	state.modified = true;

	// A sound that is being held follows its volume and cutoff sliders as they move
	if( state.holding && ( key === "volume" || key === "filterCutoff" ) ) {
		$.setSynth( { "soundId": state.soundIds[ state.layer ], [ key ]: state.params[ key ] } );
	}
}

// A new layer starts as a copy of the selected one
function addLayer() {
	if( state.layers.length >= MAX_LAYERS ) {
		return;
	}
	state.layers.splice( state.layer + 1, 0, { ...state.params } );
	state.layer += 1;
	state.modified = true;
}

function removeLayer() {
	if( state.layers.length <= 1 ) {
		return;
	}
	state.layers.splice( state.layer, 1 );
	state.layer = Math.min( state.layer, state.layers.length - 1 );
	state.modified = true;
	autoPlay();
}

// The burn times, read from the first layer
function burnValue( kind ) {
	const p = state.layers[ 0 ];
	if( kind === "up" ) {
		return p.attackTime;
	}
	if( kind === "down" ) {
		return p.releaseTime;
	}
	return Math.max( BURN_SPECS.active.min, p.duration - p.attackTime );
}

// Sets a burn time on every layer. The gate of a layer is its burn up plus its active time.
// A layer with no sustain is a burst at the start, such as an ignition, and keeps its times.
function setBurn( kind, value ) {
	const active = burnValue( "active" );
	state.layers = state.layers.map( p => {
		if( p.sustainLevel === 0 ) {
			return p;
		}
		const next = { ...p };
		if( kind === "up" ) {
			next.attackTime = value;
			next.filterAttackTime = value;
			next.duration = value + active;
		} else if( kind === "down" ) {
			next.releaseTime = value;
			next.filterReleaseTime = value;
		} else {
			next.duration = p.attackTime + value;
		}
		return sanitizeParams( next );
	} );
	state.modified = true;
}

function stepList( list, current, dir ) {
	const key = JSON.stringify( current );
	const index = list.findIndex( item => JSON.stringify( item ) === key );
	const next = index === -1 ? ( dir > 0 ? 0 : list.length - 1 ) : ( index + dir + list.length ) % list.length;
	return list[ next ];
}

function toggleEffect( fx ) {
	const values = state.effects[ fx.name ];
	if( !values.on && countEnabled( state.effects ) >= MAX_CHAIN ) {
		setStatus( "A BUS HOLDS AT MOST " + MAX_CHAIN + " EFFECTS. TURN ONE OFF FIRST.", C.warn );
		return;
	}
	values.on = !values.on;
	applyEffects( state.effects );
	autoPlay();
}

function setEffectValue( fx, key, value ) {
	state.effects[ fx.name ][ key ] = value;
	applyEffects( state.effects );
}

function effectsOff() {
	for( const fx of EFFECTS ) {
		state.effects[ fx.name ].on = false;
	}
	applyEffects( state.effects );
}

function effectsReset() {
	state.effects = defaultEffects();
	applyEffects( state.effects );
}

// Shows a Pi.js input() prompt in a box. The frame loop pauses while it is open.
async function ask( label, isInteger, maxLength ) {
	state.prompt = true;
	gui.setBlocked( true );
	const w = 440;
	const h = 60;
	const x = Math.floor( ( SCREEN_W - w ) / 2 );
	const y = Math.floor( ( SCREEN_H - h ) / 2 );
	gui.box( x, y, w, h, C.panel, C.title );
	gui.text( "ENTER TO ACCEPT, ESCAPE TO CANCEL", x + 12, y + 42, C.dim );
	$.setColor( C.text );
	$.setPosPx( x + 12, y + 18 );
	try {
		return await $.input( label, null, null, isInteger, isInteger, false, maxLength );
	} finally {
		state.prompt = false;
		gui.setBlocked( false );
	}
}

async function askSeed() {
	const value = await ask( "SEED (0-" + MAX_SEED + "): ", true, 10 );
	if( value === null ) {
		return;
	}
	const category = GENERATORS.indexOf( state.category ) === -1 ? "random" : state.category;
	generate( category, clamp( Math.floor( value ), 0, MAX_SEED ) );
}

async function saveToLibrary() {
	const value = await ask( "SAVE AS: ", false, 40 );
	if( value === null ) {
		return;
	}
	const name = value.trim() || state.name;
	const ok = library.save( {
		name,
		"category": state.category,
		"seed": state.seed,
		"params": state.layers[ 0 ],
		"layers": state.layers,
		"hold": state.hold,
		"effects": state.effects
	} );
	if( ok ) {
		state.name = name;
		state.modified = false;
		state.libTab = "saved";
		state.libScroll = 0;
		setStatus( "SAVED \"" + name + "\" TO THE LIBRARY" );
	} else {
		setStatus( "COULD NOT SAVE: BROWSER STORAGE IS UNAVAILABLE OR FULL", C.warn );
	}
}

function loadEntry( entry ) {
	loadSound( library.restore( entry ) );
	play();
}

function deleteSaved( index ) {
	const entry = library.getSaved()[ index ];
	library.remove( index );
	state.pendingDelete = -1;
	setStatus( "DELETED \"" + entry.name + "\"" );
}

function copyText( what, text ) {
	if( !navigator.clipboard ) {
		console.log( text );
		setStatus( "CLIPBOARD UNAVAILABLE. " + what + " PRINTED TO THE CONSOLE.", C.warn );
		return;
	}
	navigator.clipboard.writeText( text ).then(
		() => setStatus( what + " COPIED TO THE CLIPBOARD" ),
		err => {
			console.log( text );
			setStatus( "COPY FAILED (" + err.name + "). " + what + " PRINTED TO THE CONSOLE.", C.warn );
		}
	);
}

async function saveWav() {
	if( state.recording ) {
		return;
	}
	startAudio();
	state.recording = true;
	setStatus( "RECORDING...", C.warn );
	markPlayhead();
	try {
		const size = await exporter.exportWav(
			state.layers, state.hold, state.effects, state.name, state.trim
		);
		if( size > 0 ) {
			setStatus( "SAVED " + exporter.fileName( state.name ) + ".wav (" + Math.ceil( size / 1024 ) + " KB)" );
		} else {
			setStatus( "THE RECORDING WAS SILENT. CLICK THE PAGE TO ENABLE AUDIO AND TRY AGAIN.", C.warn );
		}
	} catch( err ) {
		console.error( err );
		setStatus( "WAV EXPORT FAILED: " + ( err.code || err.message ), C.warn );
	} finally {
		state.recording = false;
	}
}

// ---- Layout pieces ----

function section( x, y, title ) {
	gui.text( title, x, y + 2, C.title );
	gui.hline( x + $.calcWidth( title ) + 4, x + ROW_W, y + 5, C.panelEdge );
}

// A label, a slider, and the value. opts: dim, noLabel, resetValue
function paramRow( x, y, key, opts = {} ) {
	const spec = SPECS[ key ];
	const value = state.params[ key ];
	const dim = opts.dim === true;
	if( !opts.noLabel ) {
		gui.text( spec.label, x, y + 1, dim ? C.dim : C.text );
	}
	const shown = value === null ? spec.def : value;
	const resetValue = opts.resetValue !== undefined ? opts.resetValue : spec.def;
	gui.slider( "p:" + key, x + SLIDER_X, y, SLIDER_W, 9, specToT( spec, shown ), {
		"set": t => setParam( key, specFromT( spec, t ) ),
		"step": dir => {
			const current = state.params[ key ] === null ? spec.def : state.params[ key ];
			setParam( key, specFromT( spec, specToT( spec, current ) + dir * 0.02 ) );
			wheelPlay();
		},
		"reset": () => {
			setParam( key, resetValue );
			autoPlay();
		},
		"release": autoPlay,
		"tip": ( PARAM_TIPS[ key ] || spec.label ) + ". " + SLIDER_HELP,
		dim
	} );
	gui.textRight( value === null ? "OFF" : formatValue( spec.fmt, value ), x + ROW_W, y + 1, dim ? C.dim : C.value );
}

// A slider that sets a burn time on every layer
function burnRow( x, y, kind ) {
	const spec = BURN_SPECS[ kind ];
	const value = burnValue( kind );
	gui.text( spec.label, x, y + 1, C.text );
	gui.slider( "burn:" + kind, x + SLIDER_X, y, SLIDER_W, 9, specToT( spec, value ), {
		"set": t => setBurn( kind, specFromT( spec, t ) ),
		"step": dir => {
			setBurn( kind, specFromT( spec, specToT( spec, burnValue( kind ) ) + dir * 0.02 ) );
			wheelPlay();
		},
		"reset": () => {
			setBurn( kind, spec.def );
			autoPlay();
		},
		"release": autoPlay,
		"tip": BURN_TIPS[ kind ] + ". " + SLIDER_HELP
	} );
	gui.textRight( formatValue( spec.fmt, value ), x + ROW_W, y + 1, C.value );
}

// The rate row of vibrato or tremolo. Its label is a button that switches the wobble between
// steady and random.
function rateRow( x, y, kind, dim ) {
	const shapeKey = kind + "Shape";
	const isRandom = state.params[ shapeKey ] === "random";
	gui.button( "shape:" + kind, x, y - 1, 52, 11, isRandom ? "RANDOM" : "STEADY", () => {
		setParam( shapeKey, isRandom ? "sine" : "random" );
		autoPlay();
	}, {
		"on": isRandom,
		"tip": "Steady is an even wave. Random wobbles unevenly, like an engine or a flame"
	} );
	paramRow( x, y, kind + "Rate", { dim, "noLabel": true } );
}

function cycleRow( x, y, id, label, valueLabel, onStep, tip ) {
	gui.text( label, x, y + 1, C.text );
	gui.cycle( id, x + SLIDER_X, y - 1, ROW_W - SLIDER_X, 11, valueLabel, dir => {
		onStep( dir );
		state.modified = true;
		autoPlay();
	}, { "tip": tip + ". Click for next, right-click for previous" } );
}

// ---- Panels ----

function drawHeader() {
	gui.box( 0, 0, SCREEN_W, 25, C.panel, C.panelEdge );
	$.setPrintSize( 2, 2 );
	gui.text( "PI.JS SFX LAB", 10, 5, C.title );
	$.setPrintSize( 1, 1 );

	gui.text( "SOUND", 200, 9, C.dim );
	gui.text( gui.fit( displayName(), 260 ), 236, 9, C.text );

	gui.text( "MASTER", 736, 9, C.dim );
	gui.slider( "master", 776, 8, 130, 9, state.masterVolume, {
		"set": t => {
			state.masterVolume = Math.round( clamp( t, 0, 1 ) * 100 ) / 100;
			$.setVolume( state.masterVolume );
		},
		"step": dir => {
			state.masterVolume = clamp( Math.round( state.masterVolume * 100 + dir * 2 ) / 100, 0, 1 );
			$.setVolume( state.masterVolume );
		},
		"reset": () => {
			state.masterVolume = 0.75;
			$.setVolume( state.masterVolume );
		},
		"tip": "Master volume. " + SLIDER_HELP
	} );
	gui.textRight( Math.round( state.masterVolume * 100 ) + "%", 950, 9, C.value );
}

// The x where a column of buttons left-aligns its labels, centered on the widest label
function columnTextX( labels, buttonX, buttonW ) {
	const widest = Math.max( ...labels.map( label => $.calcWidth( label ) ) );
	return buttonX + Math.floor( ( buttonW - widest ) / 2 );
}

function drawGenerate() {
	const x = 8;
	const y = 30;
	gui.panel( x, y, 150, 300, "GENERATE" );

	// The tenth generator takes the 0 key
	const keys = GENERATORS.map( ( category, i ) => ( i + 1 ) % 10 );
	const labels = GENERATORS.map( ( category, i ) => keys[ i ] + "  " + category.toUpperCase() );
	const textX = columnTextX( labels, x + 8, 134 );
	GENERATORS.forEach( ( category, i ) => {
		gui.button(
			"cat:" + category, x + 8, y + 18 + i * 17, 134, 15,
			labels[ i ],
			() => generate( category ),
			{
				"on": state.category === category,
				textX,
				"tip": CATEGORY_TIPS[ category ] + ". Each click makes a new variant (key " + keys[ i ] + ")"
			}
		);
	} );

	const seedY = y + 192;
	gui.text( "SEED", x + 8, seedY + 4, C.dim );
	gui.button( "seed", x + 38, seedY, 104, 14, state.seed === null ? "-" : String( state.seed ), askSeed, {
		"textColor": C.value,
		"tip": "The same category and seed always give the same sound. Click to type a seed"
	} );

	gui.button( "mutate", x + 8, seedY + 18, 134, 16, "MUTATE", mutate, {
		"tip": "Nudge every slider a little for a variation (key M)"
	} );
	if( state.hold ) {
		gui.button( "play", x + 8, seedY + 38, 134, 20, "HOLD TO PLAY", null, {
			"fill": C.play,
			"fillHot": C.playHot,
			"onDown": startHeld,
			"onUp": releaseHeld,
			"tip": "Hold to play the sound and let go to release it (Space)"
		} );
	} else {
		gui.button( "play", x + 8, seedY + 38, 134, 20, "PLAY", play, {
			"fill": C.play,
			"fillHot": C.playHot,
			"tip": "Play the sound (Space)"
		} );
	}
	gui.button( "stop", x + 8, seedY + 62, 65, 16, "STOP", stopAll, {
		"tip": "Stop every sound (key S)"
	} );
	gui.button( "auto", x + 77, seedY + 62, 65, 16, "AUTO", () => {
		state.autoPlay = !state.autoPlay;
	}, {
		"on": state.autoPlay,
		"tip": "Play the sound after every change"
	} );
	gui.button( "hold", x + 8, seedY + 82, 134, 16, "HELD SOUND", () => {
		releaseHeld();
		state.hold = !state.hold;
		state.modified = true;
	}, {
		"on": state.hold,
		"tip": "A held sound plays for as long as PLAY or Space is down, then releases"
	} );
}

// Layer tabs in the title bar of the parameters panel
function drawLayerTabs( right, y ) {
	const count = state.layers.length;
	let x = right - 4 - 36 - 4 - 16 - 8 - count * 18;
	gui.text( "LAYER", x - 36, y + 3, C.dim );
	for( let i = 0; i < count; i++ ) {
		gui.button( "layer:" + i, x, y + 1, 16, 11, String( i + 1 ), () => {
			state.layer = i;
		}, { "on": state.layer === i, "tip": "Edit layer " + ( i + 1 ) + ". The layers play together" } );
		x += 18;
	}
	x += 8;
	gui.button( "layer:add", x, y + 1, 16, 11, "+", addLayer, {
		"disabled": count >= MAX_LAYERS,
		"tip": "Add a layer, as a copy of this one. A sound has up to " + MAX_LAYERS + " layers"
	} );
	gui.button( "layer:del", x + 20, y + 1, 36, 11, "DEL", removeLayer, {
		"disabled": count <= 1,
		"tip": "Remove this layer"
	} );
}

function drawParams() {
	const px = 164;
	const py = 30;
	gui.panel( px, py, 468, 300, "PARAMETERS" );
	drawLayerTabs( px + 468, py );
	const p = state.params;
	const noise = isNoise( p );

	// Column A
	let x = px + 8;
	let y = py + 18;
	section( x, y, "OSCILLATOR" );
	y += ROW_H;
	cycleRow( x, y, "wave", "WAVE", p.oType.toUpperCase(),
		dir => setParam( "oType", stepList( WAVES, p.oType, dir ) ), "Waveform" );
	y += ROW_H;
	paramRow( x, y, "duty", { "dim": p.oType !== "pulse" } );
	y += ROW_H;
	paramRow( x, y, "volume" );
	y += ROW_H;
	paramRow( x, y, "pan" );
	y += ROW_H;

	section( x, y, "PITCH" );
	y += ROW_H;
	paramRow( x, y, "frequency", { "dim": noise } );
	y += ROW_H;
	const sweepOn = p.frequencyEnd !== null;
	gui.button( "sweep", x, y - 1, 52, 11, "SWEEP", () => {
		setParam( "frequencyEnd", sweepOn ? null : Math.min( 5000, state.params.frequency * 2 ) );
		autoPlay();
	}, { "on": sweepOn, "tip": "Turn the pitch sweep on or off" } );
	paramRow( x, y, "frequencyEnd", {
		"dim": noise || !sweepOn || state.hold, "noLabel": true, "resetValue": null
	} );
	y += ROW_H;

	section( x, y, "ENVELOPE" );
	y += ROW_H;
	for( const key of [ "duration", "attackTime", "decayTime", "sustainLevel", "releaseTime" ] ) {
		paramRow( x, y, key );
		y += ROW_H;
	}

	section( x, y, "ARPEGGIO" );
	y += ROW_H;
	cycleRow( x, y, "arp", "NOTES", arpLabel( p.arpeggio ),
		dir => setParam( "arpeggio", stepList( ARP_PATTERNS, p.arpeggio, dir ) ),
		"Semitone steps the pitch cycles through" );
	y += ROW_H;
	paramRow( x, y, "arpeggioRate", { "dim": !p.arpeggio || noise } );

	// Column B
	x = px + 240;
	y = py + 18;
	const filterOff = !p.filterType;
	section( x, y, "FILTER" );
	y += ROW_H;
	cycleRow( x, y, "filter", "TYPE", filterOff ? "OFF" : p.filterType.toUpperCase(),
		dir => setParam( "filterType", stepList( FILTER_TYPES, p.filterType, dir ) ), "Filter type" );
	y += ROW_H;
	for( const key of [
		"filterCutoff", "filterQ", "filterAmount", "filterAttackTime", "filterDecayTime",
		"filterSustainLevel", "filterReleaseTime"
	] ) {
		paramRow( x, y, key, { "dim": filterOff } );
		y += ROW_H;
	}

	section( x, y, "VIBRATO" );
	y += ROW_H;
	paramRow( x, y, "vibratoDepth", { "dim": noise } );
	y += ROW_H;
	rateRow( x, y, "vibrato", noise || p.vibratoDepth === 0 );
	y += ROW_H;

	section( x, y, "TREMOLO" );
	y += ROW_H;
	paramRow( x, y, "tremoloDepth" );
	y += ROW_H;
	rateRow( x, y, "tremolo", p.tremoloDepth === 0 );
	y += ROW_H;

	section( x, y, "ALL LAYERS" );
	for( const kind of [ "up", "active", "down" ] ) {
		y += ROW_H;
		burnRow( x, y, kind );
	}
}

function drawEffects() {
	const x = 164;
	const y = 336;
	const w = 468;
	const h = 186;
	gui.panel( x, y, w, h, "BUS EFFECTS" );
	const enabled = countEnabled( state.effects );
	gui.textRight( enabled + "/" + MAX_CHAIN + " ON", x + w - 6, y + 3, C.text );

	EFFECTS.forEach( ( fx, i ) => {
		const cx = x + 8 + i * 76;
		const cw = 72;
		const values = state.effects[ fx.name ];
		gui.button( "fx:" + fx.name, cx, y + 18, cw, 14, fx.label, () => toggleEffect( fx ), {
			"on": values.on,
			"tip": "Turn " + fx.name + " on or off on the sfx bus"
		} );
		let yy = y + 38;
		if( fx.choice ) {
			const choice = fx.choice;
			gui.cycle( "fxc:" + fx.name, cx, yy - 1, cw, 11, values[ choice.key ].slice( 0, 4 ).toUpperCase(), dir => {
				setEffectValue( fx, choice.key, stepList( choice.options, values[ choice.key ], dir ) );
				autoPlay();
			}, { "tip": "Filter type: lowpass, highpass, or bandpass" } );
			yy += 16;
		}
		for( const param of fx.params ) {
			gui.text( param.label, cx, yy, values.on ? C.text : C.dim );
			gui.textRight( formatValue( param.fmt, values[ param.key ] ), cx + cw, yy, values.on ? C.value : C.dim );
			gui.slider( "fx:" + fx.name + ":" + param.key, cx, yy + 10, cw, 7, specToT( param, values[ param.key ] ), {
				"set": t => setEffectValue( fx, param.key, specFromT( param, t ) ),
				"step": dir => {
					setEffectValue( fx, param.key, specFromT( param, specToT( param, values[ param.key ] ) + dir * 0.02 ) );
					wheelPlay();
				},
				"reset": () => {
					setEffectValue( fx, param.key, param.def );
					autoPlay();
				},
				"release": autoPlay,
				"tip": fx.label + " " + param.label.toLowerCase() + ". " + SLIDER_HELP,
				"dim": !values.on
			} );
			yy += 24;
		}
	} );

	const chain = EFFECTS.filter( fx => state.effects[ fx.name ].on ).map( fx => fx.label );
	const chainText = "SYNTH > " + ( chain.length > 0 ? chain.join( " > " ) + " > " : "" ) + "OUT";
	gui.text( "CHAIN", x + 8, y + h - 34, C.dim );
	gui.text( gui.fit( chainText, w - 60 ), x + 44, y + h - 34, chain.length > 0 ? C.text : C.dim );
	gui.text( "EFFECTS PLAY IN PREVIEW AND WAV EXPORT", x + 8, y + h - 16, C.dim );
	gui.button( "fx:off", x + w - 140, y + h - 20, 64, 14, "ALL OFF", () => {
		effectsOff();
		autoPlay();
	}, { "tip": "Turn every effect off" } );
	gui.button( "fx:reset", x + w - 72, y + h - 20, 64, 14, "RESET", () => {
		effectsReset();
		autoPlay();
	}, { "tip": "Turn every effect off and reset its settings" } );
}

function drawExport() {
	const x = 8;
	const y = 336;
	gui.panel( x, y, 150, 186, "EXPORT" );
	const bx = x + 8;
	const bw = 134;
	// RECORDING... is included so the column does not shift while a WAV records
	const textX = columnTextX( [
		"SAVE .WAV", "RECORDING...", "TRIM SILENCE", "COPY $.synth()", "COPY PRESET", "COPY JSON",
		"SAVE TO LIBRARY"
	], bx, bw );
	let by = y + 18;
	gui.button( "wav", bx, by, bw, 16, state.recording ? "RECORDING..." : "SAVE .WAV", saveWav, {
		"disabled": state.recording,
		textX,
		"tip": "Record one playback (with effects) and download it as a WAV file"
	} );
	by += 20;
	gui.button( "trim", bx, by, bw, 14, "TRIM SILENCE", () => {
		state.trim = !state.trim;
	}, { "on": state.trim, textX, "tip": "Cut silence from the start and end of the WAV file" } );
	by += 24;
	gui.button( "copy:synth", bx, by, bw, 16, "COPY $.synth()", () => {
		copyText( "SYNTH CODE", exporter.synthCode( state.layers, state.hold, state.effects ) );
	}, { textX, "tip": "Copy a $.synth() call that plays this sound" } );
	by += 20;
	gui.button( "copy:preset", bx, by, bw, 16, "COPY PRESET", () => {
		copyText( "PRESET CODE", exporter.presetCode(
			exporter.fileName( state.name ), state.layers, state.hold, state.effects
		) );
	}, { textX, "tip": "Copy $.definePreset() and $.sfx() calls for this sound" } );
	by += 20;
	gui.button( "copy:json", bx, by, bw, 16, "COPY JSON", () => {
		copyText( "JSON", exporter.jsonText( state.layers, state.hold, state.effects ) );
	}, { textX, "tip": "Copy the synth() options and bus effects as JSON" } );
	by += 24;
	gui.button( "save", bx, by, bw, 16, "SAVE TO LIBRARY", saveToLibrary, {
		textX,
		"tip": "Save this sound and its effects in the browser"
	} );
}

function drawDisplay( levels, peak ) {
	const x = 638;
	const y = 30;
	gui.panel( x, y, 314, 300, "DISPLAY" );
	let progress = -1;
	if( state.playStart >= 0 && state.playLength > 0 ) {
		const now = performance.now();
		const gate = state.params.duration * 1000;
		let elapsed = now - state.playStart;

		// A held sound waits at the end of its gate, and moves on when it is released
		if( state.holding ) {
			elapsed = Math.min( elapsed, gate );
		} else if( state.releaseStart >= 0 ) {
			elapsed = Math.min( state.releaseStart - state.playStart, gate ) + now - state.releaseStart;
		}
		progress = elapsed / state.playLength;
		if( progress > 1 ) {
			state.playStart = -1;
		}
	}
	drawEnvelope( x + 8, y + 18, 298, 112, state.params, progress );
	drawScope( x + 8, y + 136, 298, 70, levels ? levels.waveform : null );
	drawSpectrum( x + 8, y + 212, 298, 66, levels ? levels.spectrum : null );
	gui.text( "OUT", x + 8, y + 285, C.dim );
	drawMeter( x + 30, y + 284, 276, 9, peak, state.peakHold );
}

function drawLibrary() {
	const x = 638;
	const y = 336;
	const w = 314;
	gui.panel( x, y, w, 186, "LIBRARY" );
	const saved = library.getSaved();
	const history = library.getHistory();
	const isSaved = state.libTab === "saved";

	function setTab( tab ) {
		state.libTab = tab;
		state.libScroll = 0;
		state.pendingDelete = -1;
	}
	gui.button( "tab:saved", x + 8, y + 18, 110, 13, "SAVED (" + saved.length + ")", () => setTab( "saved" ), {
		"on": isSaved, "tip": "Sounds saved in this browser"
	} );
	gui.button( "tab:history", x + 122, y + 18, 110, 13, "HISTORY (" + history.length + ")", () => setTab( "history" ), {
		"on": !isSaved, "tip": "Sounds generated or mutated this session"
	} );

	const list = isSaved ? saved : history;
	const rows = 10;
	const rowH = 14;
	const listY = y + 36;
	const listW = w - 16;
	const maxScroll = Math.max( 0, list.length - rows );
	state.libScroll = clamp( state.libScroll, 0, maxScroll );
	function scroll( dir ) {
		state.libScroll = clamp( state.libScroll - dir, 0, maxScroll );
		state.pendingDelete = -1;
	}
	gui.area( "lib:area", x + 8, listY, listW, rows * rowH, { "wheel": scroll } );

	if( list.length === 0 ) {
		gui.text( isSaved ? "NOTHING SAVED YET." : "NO HISTORY YET.", x + 12, listY + 4, C.dim );
		gui.text( isSaved ? "USE SAVE TO LIBRARY IN EXPORT." : "GENERATE A SOUND TO START.", x + 12, listY + 16, C.dim );
		return;
	}

	if( performance.now() - state.pendingDeleteTime > DELETE_CONFIRM_MS ) {
		state.pendingDelete = -1;
	}
	for( let r = 0; r < rows; r++ ) {
		const index = state.libScroll + r;
		if( index >= list.length ) {
			break;
		}
		const entry = list[ index ];
		const ry = listY + r * rowH;
		const rowW = isSaved ? listW - 32 : listW;
		gui.button( "lib:" + state.libTab + ":" + index, x + 8, ry, rowW, 12, "", () => loadEntry( entry ), {
			"tip": "Click to load and play. Wheel to scroll",
			"onWheel": scroll
		} );
		const category = ( entry.category || "" ).toUpperCase();
		gui.text( gui.fit( entry.name, rowW - 70 ), x + 12, ry + 3, C.text );
		gui.textRight( category, x + 8 + rowW - 4, ry + 3, C.dim );
		if( isSaved ) {
			const armed = state.pendingDelete === index;
			gui.button( "lib:del:" + index, x + 8 + listW - 28, ry, 28, 12, armed ? "DEL?" : "X", () => {
				if( armed ) {
					deleteSaved( index );
				} else {
					state.pendingDelete = index;
					state.pendingDeleteTime = performance.now();
				}
			}, {
				"fill": armed ? C.danger : undefined,
				"tip": armed ? "Click again to delete" : "Delete"
			} );
		}
	}
	if( maxScroll > 0 ) {
		const last = Math.min( list.length, state.libScroll + rows );
		gui.textRight( ( state.libScroll + 1 ) + "-" + last + " OF " + list.length, x + w - 8, y + 21, C.dim );
	}
}

function drawFooter() {
	const y = 525;
	gui.box( 0, y, SCREEN_W, SCREEN_H - y, C.panel, C.panelEdge );
	// A fresh status message wins over the hover tip, then the tip wins until the message expires
	const age = performance.now() - state.statusTime;
	const tip = age < STATUS_FRESH_MS ? "" : gui.hoverTip();
	const msg = tip || ( age < STATUS_MS ? state.status : "" );
	gui.text( gui.fit( msg.toUpperCase(), 600 ), 8, y + 4, tip ? C.text : state.statusColor );
	gui.textRight( "SPACE PLAY  0-9 NEW  M MUTATE  S STOP", SCREEN_W - 8, y + 4, C.dim );
}

// ---- Frame loop ----

function readLevels() {
	if( !state.audioStarted ) {
		return { "levels": null, "peak": 0 };
	}
	try {
		const levels = $.getSoundLevels( "sfx", true, true );
		const peak = $.getSoundLevels( "output" ).peak;
		return { levels, peak };
	} catch( err ) {
		return { "levels": null, "peak": 0 };
	}
}

function frame() {
	requestAnimationFrame( frame );
	if( state.prompt ) {
		return;
	}
	const now = performance.now();
	const { levels, peak } = readLevels();
	if( peak >= state.peakHold ) {
		state.peakHold = peak;
		state.peakTime = now;
	} else if( now - state.peakTime > 800 ) {
		state.peakHold *= 0.92;
	}

	$.cls();
	gui.beginFrame();
	drawHeader();
	drawGenerate();
	drawParams();
	drawEffects();
	drawExport();
	drawDisplay( levels, peak );
	drawLibrary();
	drawFooter();
	gui.endFrame();
}

function initKeys() {
	$.onKey( "any", "down", startAudio );
	$.onKey( "Space", "down", () => {
		if( state.hold ) {
			startHeld();
		} else {
			play();
		}
	} );
	$.onKey( "Space", "up", releaseHeld );
	GENERATORS.forEach( ( category, i ) => {
		$.onKey( "Digit" + ( i + 1 ) % 10, "down", () => generate( category ) );
	} );
	$.onKey( "KeyM", "down", mutate );
	$.onKey( "KeyS", "down", stopAll );
}

// Pi.js measures the body when the screen is created. A page loaded in a hidden tab can have a
// zero-size window at that point, so wait until it has a size.
function waitForViewport() {
	return new Promise( resolve => {
		function check() {
			if( innerWidth > 0 && innerHeight > 0 ) {
				removeEventListener( "resize", check );
				resolve();
			}
		}
		addEventListener( "resize", check );
		check();
	} );
}

async function main() {
	await $.ready();
	await waitForViewport();
	$.screen( SCREEN_W + "x" + SCREEN_H );
	$.setBgColor( C.bg );
	$.setContainerBgColor( "#0b0c14" );
	$.setVolume( state.masterVolume );

	loadSound( {
		"name": "coin",
		"category": "coin",
		"seed": 0,
		"layers": [ fromSynthOptions( $.generateSfx( "coin", 0 ) ) ],
		"hold": false,
		"effects": null
	} );
	applyEffects( state.effects );

	gui.initGui( startAudio );
	initKeys();
	setStatus( "CLICK A CATEGORY TO GENERATE A SOUND. THE FIRST CLICK ENABLES AUDIO." );
	frame();
}

main().catch( err => {
	console.error( err );
} );
