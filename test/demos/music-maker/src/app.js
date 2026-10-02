// Pi.js Tracks: the main editor screen, drawn every frame with Pi.js.

import { ui, PAL, COL, CHAR, CW, fill, frame, text, smallText, textCenter, bigText, fit, bevel, shade } from "./ui.js";
import {
	app, initState, track, trackColor, toast, pushUndo, changed, edit, undo, redo, loadSong,
	importCode, togglePlay, samplePitch
} from "./state.js";
import {
	STEPS_PER_BAR, NOTE_NAMES, SCALES, SCALE_IDS, PROGRESSIONS, LENGTH_NAMES, pitchName,
	scalePitches, inScale, chordOffsets, chordName, progressionLabel, snapLength
} from "./music.js";
import { PRESETS, KITS, DRUM_SHORT, DRUM_ORDER, getPreset } from "./instruments.js";
import {
	totalSteps, setBars, setKey, setScale, setProgression, progressionChords, doubleSong,
	melodyTrack, drumTrack, buildTemplate, MAX_TRACKS, MAX_BARS, MAGIC, VELOCITIES
} from "./song.js";
import { trackLabel, songToCode } from "./codegen.js";
import { downloadText, fileName, saveToLibrary } from "./storage.js";
import { drawOverlay, openOverlay, closeOverlay } from "./overlays.js";
import { tipFor, wrapText } from "./help.js";

const $ = window.pi;

export const W = 480;
export const H = 270;
const TOP_H = 16;
const LEFT_W = 118;
const ED_X = 120;
const ROW1_Y = 18;
const ROW2_Y = 30;
const CHORD_Y = 42;
const GRID_Y = 52;
const GRID_H = 160;
const LABEL_W = 24;
const GRID_X = ED_X + LABEL_W;
const GRID_W = 320;
const SCROLL_X = GRID_X + GRID_W + 2;
const MAP_Y = 215;
const MAP_H = 10;
const FX_Y = 229;
const BTN_Y = 249;
const TRACK_Y = 18;
const TRACK_H = 22;

// Computer keyboard as a piano: two rows, like most music software.
const PIANO_KEYS = {
	"KeyZ": 0, "KeyS": 1, "KeyX": 2, "KeyD": 3, "KeyC": 4, "KeyV": 5, "KeyG": 6, "KeyB": 7,
	"KeyH": 8, "KeyN": 9, "KeyJ": 10, "KeyM": 11, "Comma": 12, "KeyL": 13, "Period": 14,
	"KeyQ": 12, "Digit2": 13, "KeyW": 14, "Digit3": 15, "KeyE": 16, "KeyR": 17, "Digit5": 18,
	"KeyT": 19, "Digit6": 20, "KeyY": 21, "Digit7": 22, "KeyU": 23, "KeyI": 24
};
const DRUM_KEYS = [ "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma" ];

const vis = new Array( 19 ).fill( 0 );

// ---------------------------------------------------------------------------------------------
// Startup and main loop

export async function start() {
	await $.ready();
	$.screen( "480x270" );
	// Pi.js gives a container 200px when it measures 0 high (e.g. a page loaded in a hidden
	// tab). The body should always fill the window; Pi.js follows the resize.
	if( document.body.style.height === "200px" ) {
		document.body.style.height = "100%";
	}
	$.setBlend( "alpha" );
	$.setActionKeys( [ "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Backspace", "Slash", "Quote" ] );
	$.setVolume( 0.8 );
	ui.init();
	ui.onClick = clickSound;
	app.restored = initState();
	window.pixelTracks = app; // handy for poking at the song from the browser console
	app.volume = 0.8;
	$.onKey( "any", "down", k => app.keys.push( k ), false, true );
	$.onKey( "any", "up", k => releaseKey( k.code ) );

	// The first gesture unlocks audio; play the start jingle inside its handler.
	const begin = () => {
		if( app.mode === "splash" ) {
			enterEditor();
		}
	};
	$.onPress( "down", begin, true );
	$.onKey( "any", "down", begin, true );

	document.addEventListener( "paste", onPaste );
	window.addEventListener( "dragover", e => e.preventDefault() );
	window.addEventListener( "drop", onDrop );
	requestAnimationFrame( loop );
}

function loop( t ) {
	try {
		app.time = t;
		ui.beginFrame();
		if( performance.now() < ( app.swallowUntil || 0 ) ) {
			ui.pressed = false;
			ui.released = false;
			ui.rpressed = false;
			app.keys = [];
		}
		processKeys();
		app.player.update();
		fill( 0, 0, W, H, COL.bg );
		if( app.mode === "splash" ) {
			drawSplash();
		} else {
			drawEditor();
		}
		ui.endFrame();
	} catch( err ) {
		console.error( err );
	}
	requestAnimationFrame( loop );
}

function enterEditor() {
	app.mode = "editor";
	app.swallowUntil = performance.now() + 150;
	$.sfx( "powerup" );
	toast( app.restored ? "WELCOME BACK! YOUR SONG WAS RESTORED" : "PRESS PLAY (OR SPACE) TO HEAR THIS DEMO", 4000 );
}

function clickSound() {
	if( !app.player.recording ) {
		$.synth( { "frequency": 1800, "duration": 0.01, "volume": 0.05, "oType": "square", "releaseTime": 0.02 } );
	}
}

// ---------------------------------------------------------------------------------------------
// Keyboard, paste and drop

function processKeys() {
	const keys = app.keys;
	app.keys = [];
	for( const k of keys ) {
		handleKey( k );
	}
}

function handleKey( k ) {
	if( app.mode === "splash" ) {
		return;
	}
	if( app.textEdit ) {
		textKey( k );
		return;
	}
	const ctrl = k.ctrlKey || k.metaKey;
	if( ctrl ) {
		if( k.code === "KeyZ" && !app.player.recording ) {
			k.shiftKey ? redo() : undo();
		} else if( k.code === "KeyY" && !app.player.recording ) {
			redo();
		}
		return;
	}
	if( k.code === "Escape" ) {
		app.menu = null;
		closeOverlay();
		return;
	}
	if( k.code === "Space" && !k.repeat ) {
		togglePlay();
		return;
	}
	const overlay = app.overlay ? app.overlay.type : null;
	if( overlay === "code" || overlay === "help" ) {
		if( k.code === "ArrowUp" || k.code === "ArrowDown" ) {
			app.overlay.scroll += k.code === "ArrowUp" ? -1 : 1;
		} else if( k.code === "PageUp" || k.code === "PageDown" ) {
			app.overlay.scroll += k.code === "PageUp" ? -15 : 15;
		}
		return;
	}
	if( overlay && overlay !== "sound" && overlay !== "instruments" ) {
		return;
	}
	if( !overlay ) {
		if( k.code === "ArrowLeft" || k.code === "ArrowRight" ) {
			app.page += k.code === "ArrowLeft" ? -1 : 1;
			app.follow = false;
			return;
		}
		if( k.code === "ArrowUp" || k.code === "ArrowDown" ) {
			scrollRows( gridGeom(), k.code === "ArrowUp" ? -2 : 2 );
			return;
		}
	}
	if( !k.repeat ) {
		pianoKey( k.code );
	}
}

function pianoKey( code ) {
	const t = track();
	if( !t ) {
		return;
	}
	let value;
	if( t.type === "drums" ) {
		value = DRUM_KEYS.indexOf( code );
		if( value < 0 ) {
			return;
		}
	} else {
		const semi = PIANO_KEYS[ code ];
		if( semi === undefined ) {
			return;
		}
		if( app.overlay && app.overlay.type === "sound" ) {
			// Line the typed keys up with the test keyboard drawn in the sound editor
			value = Math.floor( samplePitch( t ) / 12 ) * 12 + semi;
		} else {
			const g = gridGeom();
			const mid = g.rows[ Math.min( g.rows.length - 1, g.top + Math.floor( g.visible / 2 ) ) ];
			value = Math.floor( mid / 12 ) * 12 - 12 + semi + app.song.key;
		}
		if( value < 12 || value > 119 ) {
			return;
		}
	}

	// A melody note sounds for as long as its key is down; a drum is a single hit
	if( t.type === "drums" ) {
		app.player.preview( app.sel, value );
		return;
	}
	const held = { "pitch": value, "sound": app.player.noteOn( app.sel, value ) };
	if( held.sound === null ) {
		app.player.preview( app.sel, value );
	}
	app.pianoHeld[ code ] = held;
}

// A piano key came up: its note is released.
function releaseKey( code ) {
	const held = app.pianoHeld[ code ];
	if( !held ) {
		return;
	}
	delete app.pianoHeld[ code ];
	if( held.sound !== null ) {
		app.player.noteOff( held.sound );
	}
}

function startTextEdit( target, value, max ) {
	app.textEdit = { target, value, max };
}

function textKey( k ) {
	const te = app.textEdit;
	if( k.code === "Enter" || k.code === "NumpadEnter" ) {
		const value = te.value.trim();
		if( value ) {
			edit( s => {
				if( te.target === "title" ) {
					s.title = value;
				} else if( s.tracks[ app.sel ] ) {
					s.tracks[ app.sel ].name = value;
				}
			} );
		}
		app.textEdit = null;
	} else if( k.code === "Escape" ) {
		app.textEdit = null;
	} else if( k.code === "Backspace" ) {
		te.value = te.value.slice( 0, -1 );
	} else if( k.key && k.key.length === 1 && /[ -~]/.test( k.key ) && te.value.length < te.max ) {
		te.value += k.key.toUpperCase();
	}
}

function onPaste( e ) {
	if( app.mode !== "editor" || !e.clipboardData ) {
		return;
	}
	const pasted = e.clipboardData.getData( "text" );
	if( !pasted ) {
		return;
	}
	e.preventDefault();
	if( app.textEdit ) {
		const te = app.textEdit;
		te.value = ( te.value + pasted.replace( /[^ -~]/g, "" ).toUpperCase() ).slice( 0, te.max );
		return;
	}
	if( app.player.recording ) {
		return;
	}
	importCode( pasted );
}

function onDrop( e ) {
	e.preventDefault();
	const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[ 0 ];
	if( file && app.mode === "editor" && !app.player.recording ) {
		file.text().then( importCode );
	}
}

// ---------------------------------------------------------------------------------------------
// Splash screen

function drawSplash() {
	const t = app.time / 1000;
	// Scrolling equalizer
	for( let i = 0; i < 40; i++ ) {
		const h = Math.round( 20 + 18 * Math.sin( t * 3 + i * 0.5 ) * Math.sin( t * 1.3 + i * 0.21 ) + 14 * Math.sin( i * 1.7 + t * 5 ) );
		const colors = [ PAL.teal, PAL.green, PAL.lime, PAL.yellow ];
		for( let y = 0; y < h; y += 4 ) {
			fill( i * 12 + 1, H - 4 - y, 10, 3, shade( colors[ Math.min( 3, Math.floor( y / 12 ) ) ], 0.55 ) );
		}
	}
	// Floating notes
	for( let i = 0; i < 12; i++ ) {
		const x = ( i * 83 + t * 20 * ( 1 + i % 3 ) ) % ( W + 20 ) - 10;
		const y = 20 + ( i * 37 ) % 120 + Math.sin( t * 2 + i ) * 6;
		text( x, y, i % 2 ? CHAR.note : String.fromCharCode( 13 ), shade( PAL.sky, 0.5 ) );
	}
	const rainbow = [ PAL.red, PAL.orange, PAL.yellow, PAL.lime, PAL.green, PAL.cyan, PAL.sky, PAL.blue, PAL.purple ];
	const drawWord = ( word, y, offset ) => {
		const x0 = Math.floor( ( W - word.length * 24 ) / 2 );
		for( let i = 0; i < word.length; i++ ) {
			const bob = Math.round( Math.sin( t * 4 + ( i + offset ) * 0.7 ) * 3 );
			bigText( x0 + i * 24 + 2, y + bob + 2, word[ i ], PAL.black, 4 );
			bigText( x0 + i * 24, y + bob, word[ i ], rainbow[ ( i + offset ) % rainbow.length ], 4 );
		}
	};
	drawWord( "PI.JS", 40, 0 );
	drawWord( "TRACKS", 80, 5 );
	textCenter( 0, 124, W, "A RETRO MUSIC MAKER FOR PI.JS", COL.dim );
	textCenter( 0, 138, W, "COMPOSE " + CHAR.dot + " JAM " + CHAR.dot + " EXPORT CODE & WAV", COL.dim );
	if( Math.floor( t * 2 ) % 2 === 0 ) {
		textCenter( 0, 168, W, "CLICK OR PRESS ANY KEY TO START", PAL.yellow );
	}
}

// ---------------------------------------------------------------------------------------------
// Editor

function drawEditor() {
	const modal = !!app.overlay || !!app.menu;
	ui.enabled = !modal;
	followPlayhead();
	drawTopBar();
	drawTracks();
	drawVisualizer();
	drawTrackHeader();
	drawGridArea();
	drawBottom();
	if( app.menu ) {
		ui.enabled = true;
		drawMenu();
	}
	if( app.overlay ) {
		fill( 0, 0, W, H, "rgba(8, 9, 16, 0.75)" );
		ui.enabled = true;
		drawOverlay();
	}
	ui.enabled = true;
	drawToast();
	drawTip();
}

// The pop-up tip for whatever the pointer is over, while TIPS is on.
function drawTip() {
	if( !app.tips || !ui.hot ) {
		return;
	}
	const tip = tipFor( ui.hot );
	if( !tip ) {
		return;
	}
	const lines = wrapText( tip, 36 );
	const w = Math.max( ...lines.map( line => line.length ) ) * CW + 9;
	const h = lines.length * 9 + 6;
	let x = ui.mx + 10;
	let y = ui.my + 12;
	if( x + w > W - 1 ) {
		x = W - 1 - w;
	}
	if( y + h > H - 1 ) {
		y = ui.my - h - 4;
	}
	x = Math.max( 1, x );
	y = Math.max( 1, y );
	fill( x + 2, y + 2, w, h, "#0b0c14" );
	fill( x, y, w, h, PAL.black );
	frame( x, y, w, h, PAL.yellow );
	lines.forEach( ( line, i ) => text( x + 5, y + 4 + i * 9, line, PAL.white ) );
}

function drawToast() {
	if( !app.toast || performance.now() > app.toast.until ) {
		app.toast = null;
		return;
	}
	const msg = fit( app.toast.text, 76 );
	const w = msg.length * CW + 12;
	const x = Math.floor( ( W - w ) / 2 );
	bevel( x, 213, w, 13, PAL.navy, PAL.sky, COL.lo );
	text( x + 6, 216, msg, PAL.white );
}

function followPlayhead() {
	const pos = app.player.position();
	if( pos < 0 || app.drag ) {
		app.follow = true;
		return;
	}
	if( app.follow ) {
		const perPage = Math.min( 32, totalSteps( app.song ) );
		app.page = Math.floor( pos / perPage );
	}
}

function setTempo( id, tempo ) {
	if( ui.grabbed === id ) {
		pushUndo();
	}
	app.song.tempo = Math.max( 32, Math.min( 255, tempo ) );
	changed();
}

function drawTopBar() {
	const song = app.song;
	bevel( 0, 0, W, TOP_H, COL.face );
	const logo = "PI.JS TRACKS";
	const colors = [ PAL.red, PAL.orange, PAL.yellow, PAL.lime, PAL.green, PAL.cyan, PAL.sky ];
	const pos = app.player.position();
	for( let i = 0; i < logo.length; i++ ) {
		const bob = pos >= 0 ? Math.round( Math.sin( pos * Math.PI / 2 + i * 0.8 ) ) : 0;
		text( 4 + i * CW, 4 + bob, logo[ i ], colors[ i % colors.length ] );
	}
	const playing = app.player.playing;
	if( ui.button( "play", 82, 2, 44, 12, playing ? CHAR.stop + " STOP" : CHAR.right + " PLAY", { "on": playing, "color": PAL.green } ) ) {
		togglePlay();
	}
	if( ui.button( "loop", 128, 2, 28, 12, "LOOP", { "on": app.player.loop } ) ) {
		app.player.setLoop( !app.player.loop );
	}
	text( 162, 4, "BPM", COL.dim );
	if( ui.button( "tempo-", 180, 2, 9, 12, "-", { "repeat": true } ) ) {
		setTempo( "tempo-", song.tempo - 1 );
	}
	textCenter( 189, 4, 20, String( song.tempo ), COL.accent );
	ui.hint( "tempo", 189, 2, 20, 12 );
	if( ui.enabled && ui.wheelY && ui.over( 189, 2, 20, 12 ) ) {
		pushUndo();
		app.song.tempo = Math.max( 32, Math.min( 255, song.tempo - Math.sign( ui.wheelY ) * 2 ) );
		changed();
		ui.wheelY = 0;
	}
	if( ui.button( "tempo+", 209, 2, 9, 12, "+", { "repeat": true } ) ) {
		setTempo( "tempo+", song.tempo + 1 );
	}
	text( 224, 4, "KEY", COL.dim );
	if( ui.button( "key-", 242, 2, 9, 12, CHAR.left ) ) {
		edit( s => setKey( s, s.key - 1 ) );
	}
	textCenter( 251, 4, 16, NOTE_NAMES[ song.key ], COL.accent );
	if( ui.button( "key+", 267, 2, 9, 12, CHAR.right ) ) {
		edit( s => setKey( s, s.key + 1 ) );
	}
	text( 282, 4, "SCALE", COL.dim );
	const si = SCALE_IDS.indexOf( song.scale );
	if( ui.button( "scale-", 313, 2, 9, 12, CHAR.left ) ) {
		edit( s => setScale( s, SCALE_IDS[ ( si + SCALE_IDS.length - 1 ) % SCALE_IDS.length ] ) );
	}
	textCenter( 322, 4, 75, SCALES[ song.scale ].name, COL.accent );
	if( ui.button( "scale+", 397, 2, 9, 12, CHAR.right ) ) {
		edit( s => setScale( s, SCALE_IDS[ ( si + 1 ) % SCALE_IDS.length ] ) );
	}
	text( 412, 4, "BARS", COL.dim );
	if( ui.button( "bars-", 437, 2, 9, 12, "-" ) ) {
		if( song.bars > 1 ) {
			const lost = song.tracks.some( t => t.notes.some( n => n.s >= ( song.bars - 1 ) * STEPS_PER_BAR ) );
			edit( s => setBars( s, s.bars - 1 ) );
			if( lost ) {
				toast( "NOTES IN THE LAST BAR WERE REMOVED - UNDO BRINGS THEM BACK" );
			}
		}
	}
	textCenter( 446, 4, 14, String( song.bars ), COL.accent );
	if( ui.button( "bars+", 460, 2, 9, 12, "+" ) ) {
		if( song.bars < MAX_BARS ) {
			edit( s => setBars( s, s.bars + 1 ) );
		}
	}
}

function drawTracks() {
	const tracks = app.song.tracks;
	const now = performance.now();
	tracks.forEach( ( t, i ) => {
		const y = TRACK_Y + i * TRACK_H;
		const sel = i === app.sel;
		const c = trackColor( i );
		ui.hint( "track", 0, y, LEFT_W, TRACK_H - 1 );
		bevel( 0, y, LEFT_W, TRACK_H - 1, sel ? shade( c, 0.32 ) : COL.face, sel ? c : COL.hi );
		fill( 2, y + 2, 3, TRACK_H - 5, t.mute ? COL.hi : c );
		text( 8, y + 3, fit( t.name, 13 ), sel ? PAL.white : c );
		text( 8, y + 12, fit( trackLabel( t ), 17 ), sel ? shade( c, 1.4 ) : COL.dim );
		if( ui.button( "mute" + i, 88, y + 2, 10, 9, "M", { "on": t.mute, "color": PAL.red } ) ) {
			t.mute = !t.mute;
			changed();
		}
		if( ui.button( "solo" + i, 99, y + 2, 10, 9, "S", { "on": t.solo, "color": PAL.orange } ) ) {
			t.solo = !t.solo;
			changed();
		}
		const age = now - ( app.player.trackHits[ i ] || 0 );
		const glow = app.player.playing ? Math.max( 0, 1 - age / 250 ) : 0;
		fill( 111, y + 2, 4, TRACK_H - 5, shade( c, 0.2 + glow * 0.8 ) );
		if( ui.pressIn( 0, y, LEFT_W, TRACK_H - 1 ) ) {
			ui.grab( "track" );
			if( app.sel !== i ) {
				app.sel = i;
				app.page = app.player.playing ? app.page : 0;
			}
		}
	} );
	if( tracks.length < MAX_TRACKS ) {
		const y = TRACK_Y + tracks.length * TRACK_H;
		if( ui.button( "addm", 0, y, 58, 12, "+ MELODY" ) ) {
			addTrack( "melody" );
		}
		if( ui.button( "addd", 60, y, 58, 12, "+ DRUMS" ) ) {
			addTrack( "drums" );
		}
	}
}

function addTrack( type ) {
	const song = app.song;
	let t;
	if( type === "drums" ) {
		t = drumTrack( "DRUMS", KITS[ song.tracks.filter( x => x.type === "drums" ).length % KITS.length ].id );
	} else {
		const order = [ "squarelead", "epiano", "pluck", "strings", "bells", "acidbass", "flute", "glasspad", "organ" ];
		const id = order.find( o => !song.tracks.some( x => x.preset === o ) ) || "chiplead";
		const p = getPreset( id );
		t = melodyTrack( p.cat, id );
	}
	const names = new Set( song.tracks.map( x => x.name ) );
	let name = t.name;
	for( let n = 2; names.has( name ); n++ ) {
		name = t.name + " " + n;
	}
	t.name = name;
	edit( s => s.tracks.push( t ) );
	app.sel = song.tracks.length - 1;
	app.page = 0;
	toast( "NEW " + ( type === "drums" ? "DRUM" : "MELODY" ) + " TRACK - CLICK THE GRID OR TRY MAGIC" );
}

function drawVisualizer() {
	const y0 = TRACK_Y + 8 * TRACK_H + 14;
	bevel( 0, y0, LEFT_W, 227 - y0, COL.lo, COL.lo, COL.hi );
	ui.hint( "vis", 0, y0, LEFT_W, 227 - y0 );
	let levels = null;
	try {
		levels = $.getSoundLevels( "output", true );
	} catch( e ) {
		return;
	}
	const spec = levels.spectrum;
	const bars = vis.length;
	const h = 227 - y0 - 4;
	for( let b = 0; b < bars; b++ ) {
		let level = 0;
		if( spec ) {
			const binHz = 24000 / spec.length;
			const f0 = 50 * Math.pow( 240, b / bars );
			const f1 = 50 * Math.pow( 240, ( b + 1 ) / bars );
			let sum = 0;
			let count = 0;
			for( let i = Math.floor( f0 / binHz ); i <= Math.ceil( f1 / binHz ) && i < spec.length; i++ ) {
				sum += isFinite( spec[ i ] ) ? spec[ i ] : -120;
				count++;
			}
			level = Math.max( 0, Math.min( 1, ( sum / Math.max( 1, count ) + 95 ) / 65 ) );
		}
		vis[ b ] = Math.max( level, vis[ b ] * 0.88 );
		const bh = Math.round( vis[ b ] * h / 2 ) * 2;
		for( let y = 0; y < bh; y += 2 ) {
			const f = y / h;
			const c = f > 0.75 ? PAL.red : f > 0.5 ? PAL.yellow : PAL.lime;
			fill( 3 + b * 6, y0 + 2 + h - y - 1, 5, 1, c );
		}
	}
}

function samplePreviewPitch( t ) {
	return samplePitch( t );
}

function cycleInstrument( dir ) {
	const t = track();
	pushUndo();
	if( t.type === "drums" ) {
		const i = KITS.findIndex( k => k.id === t.preset );
		const kit = KITS[ ( i + dir + KITS.length ) % KITS.length ];
		t.preset = kit.id;
		t.drums = kit.drums.map( d => ( { ...d } ) );
		changed();
		app.player.preview( app.sel, 0 );
		setTimeout( () => app.player.preview( app.sel, 1 ), 180 );
	} else {
		const i = PRESETS.findIndex( p => p.id === t.preset );
		const p = PRESETS[ ( i + dir + PRESETS.length ) % PRESETS.length ];
		t.preset = p.id;
		t.inst = { ...p.params };
		changed();
		app.player.preview( app.sel, samplePreviewPitch( t ) );
	}
}

function drawTrackHeader() {
	const t = track();
	if( !t ) {
		text( ED_X + 4, ROW1_Y + 2, "ADD A TRACK ON THE LEFT TO START", COL.dim );
		return;
	}
	const c = trackColor( app.sel );
	const editing = app.textEdit && app.textEdit.target === "track";
	if( ui.button( "tname", ED_X, ROW1_Y, 60, 11, "" ) ) {
		startTextEdit( "track", t.name, 10 );
	}
	if( editing ) {
		const caret = Math.floor( app.time / 300 ) % 2 ? "_" : " ";
		text( ED_X + 3, ROW1_Y + 2, fit( app.textEdit.value + caret, 9 ), PAL.white );
	} else {
		text( ED_X + 3, ROW1_Y + 2, fit( t.name, 9 ), c );
	}
	if( ui.button( "inst-", 182, ROW1_Y, 9, 11, CHAR.left ) ) {
		cycleInstrument( -1 );
	}
	if( ui.button( "inst", 192, ROW1_Y, 84, 11, fit( trackLabel( t ), 13 ), { "textColor": PAL.yellow } ) ) {
		openOverlay( "instruments" );
	}
	if( ui.button( "inst+", 277, ROW1_Y, 9, 11, CHAR.right ) ) {
		cycleInstrument( 1 );
	}
	if( ui.button( "sound", 289, ROW1_Y, 30, 11, "EDIT" ) ) {
		openOverlay( "sound", { "drum": 0 } );
	}
	text( 323, ROW1_Y + 2, "VOL", COL.dim );
	const vol = Math.round( ui.slider( "tvol", 342, ROW1_Y, 40, 11, t.vol, 0, 100, { "color": c } ) );
	if( ui.grabbed === "tvol" ) {
		pushUndo();
	}
	if( vol !== t.vol ) {
		t.vol = vol;
		changed();
	}
	text( 386, ROW1_Y + 2, "PAN", COL.dim );
	const pan = Math.round( ui.slider( "tpan", 405, ROW1_Y, 36, 11, t.pan, -100, 100, { "color": c } ) / 10 ) * 10;
	fill( 405 + 18, ROW1_Y + 1, 1, 9, COL.hi );
	if( ui.grabbed === "tpan" ) {
		pushUndo();
	}
	if( pan !== t.pan ) {
		t.pan = pan;
		changed();
	}
	if( ui.button( "tdel", 446, ROW1_Y, 32, 11, "DEL", { "textColor": PAL.orange } ) ) {
		const name = t.name;
		edit( s => s.tracks.splice( app.sel, 1 ) );
		toast( name + " DELETED - UNDO BRINGS IT BACK" );
		return;
	}

	// Row 2
	if( t.type === "drums" ) {
		text( ED_X + 2, ROW2_Y + 2, "HITS", COL.dim );
		text( ED_X + 30, ROW2_Y + 2, "R-CLICK=SOFTER", shade( COL.dim, 0.7 ) );
	} else {
		[ 1, 2, 4, 8, 16 ].forEach( ( len, i ) => {
			if( ui.button( "len" + len, ED_X + i * 27, ROW2_Y, 26, 11, LENGTH_NAMES[ len ], { "on": app.noteLen === len, "color": PAL.blue } ) ) {
				app.noteLen = len;
			}
		} );
		if( ui.button( "lock", 258, ROW2_Y, 30, 11, "LOCK", { "on": app.lock, "color": PAL.teal } ) ) {
			app.lock = !app.lock;
			toast( app.lock ? "LOCK ON: ONLY NOTES IN THE KEY ARE SHOWN" : "LOCK OFF: ALL 12 NOTES ARE SHOWN" );
		}
	}
	if( ui.button( "magic", 290, ROW2_Y, 48, 11, CHAR.star + " MAGIC", { "on": true, "color": PAL.purple } ) ) {
		app.menu = { "type": "magic" };
	}
	if( ui.button( "clear", 340, ROW2_Y, 32, 11, "CLEAR" ) ) {
		edit( s => {
			s.tracks[ app.sel ].notes = [];
		} );
		toast( "TRACK CLEARED - UNDO BRINGS THE NOTES BACK" );
	}
	if( ui.button( "double", 374, ROW2_Y, 42, 11, "DOUBLE" ) ) {
		if( app.song.bars * 2 > MAX_BARS ) {
			toast( "THE SONG CAN BE AT MOST " + MAX_BARS + " BARS" );
		} else {
			edit( s => doubleSong( s ) );
			toast( "SONG DOUBLED TO " + app.song.bars + " BARS - NOW CHANGE THE COPY!" );
		}
	}
	const g = gridGeom();
	if( ui.button( "page-", 446, ROW2_Y, 15, 11, CHAR.left, { "disabled": app.page === 0 } ) ) {
		app.page -= 1;
		app.follow = false;
	}
	if( ui.button( "page+", 463, ROW2_Y, 15, 11, CHAR.right, { "disabled": app.page >= g.pages - 1 } ) ) {
		app.page += 1;
		app.follow = false;
	}
}

// ---------------------------------------------------------------------------------------------
// Grid

function gridRows( t ) {
	if( t.type === "drums" ) {
		return DRUM_ORDER.slice();
	}
	if( app.lock ) {
		return scalePitches( app.song.key, app.song.scale, 24, 108 );
	}
	const out = [];
	for( let p = 108; p >= 24; p-- ) {
		out.push( p );
	}
	return out;
}

function gridGeom() {
	const t = track();
	const total = totalSteps( app.song );
	const perPage = Math.min( 32, total );
	const cellW = Math.floor( GRID_W / perPage );
	const pages = Math.ceil( total / perPage );
	app.page = Math.max( 0, Math.min( pages - 1, app.page ) );
	const first = app.page * perPage;
	const steps = Math.min( perPage, total - first );
	const isDrums = t.type === "drums";
	const rows = gridRows( t );
	const rowH = isDrums ? GRID_H / 8 : 8;
	const visible = Math.min( rows.length, Math.floor( GRID_H / rowH ) );
	let top = 0;
	if( !isDrums ) {
		top = rows.findIndex( p => p <= t.view );
		if( top < 0 ) {
			top = rows.length - visible;
		}
		top = Math.max( 0, Math.min( rows.length - visible, top ) );
	}
	return { t, total, perPage, cellW, pages, first, steps, rows, rowH, visible, top, isDrums };
}

function scrollRows( g, delta ) {
	if( g.isDrums ) {
		return;
	}
	const top = Math.max( 0, Math.min( g.rows.length - g.visible, g.top + delta ) );
	g.t.view = g.rows[ top ];
	g.top = top;
}

function noteAt( t, step, p ) {
	for( let i = t.notes.length - 1; i >= 0; i-- ) {
		const n = t.notes[ i ];
		if( n.p === p && n.s <= step && step < n.s + n.l ) {
			return n;
		}
	}
	return null;
}

function drawGridArea() {
	const t = track();
	if( !t ) {
		return;
	}
	const g = gridGeom();
	handleGridInput( g );
	drawChordLane( g );
	drawLabels( g );
	drawGrid( g );
	drawScroll( g );
	drawMinimap( g );
}

function handleGridInput( g ) {
	const t = g.t;
	const gw = g.steps * g.cellW;
	const gh = g.visible * g.rowH;
	const cellAt = ( x, y ) => {
		const i = Math.max( 0, Math.min( g.steps - 1, Math.floor( ( x - GRID_X ) / g.cellW ) ) );
		const r = Math.max( 0, Math.min( g.visible - 1, Math.floor( ( y - GRID_Y ) / g.rowH ) ) );
		return { "step": g.first + i, "value": g.rows[ g.top + r ] };
	};

	ui.hint( g.isDrums ? "grid-drums" : "grid", GRID_X, GRID_Y, gw, gh );
	if( ui.enabled && ui.wheelY && ui.over( ED_X, GRID_Y, GRID_W + LABEL_W + 16, gh ) ) {
		scrollRows( g, Math.sign( ui.wheelY ) * Math.max( 1, Math.round( Math.abs( ui.wheelY ) / 40 ) ) );
		ui.wheelY = 0;
	}

	if( ui.pressIn( GRID_X, GRID_Y, gw, gh ) ) {
		ui.grab( "grid" );
		const c = cellAt( ui.px, ui.py );
		pushUndo();
		if( g.isDrums ) {
			const hit = t.notes.find( n => n.s === c.step && n.p === c.value );
			app.drag = { "type": "paint", "add": !hit, "visited": new Set( [ c.step + ":" + c.value ] ) };
			if( hit ) {
				t.notes.splice( t.notes.indexOf( hit ), 1 );
			} else {
				t.notes.push( { "s": c.step, "p": c.value, "l": 1, "v": 1 } );
				app.player.preview( app.sel, c.value );
			}
		} else {
			const hit = noteAt( t, c.step, c.value );
			if( hit && hit.l > 1 && c.step === hit.s + hit.l - 1 ) {
				app.drag = { "type": "resize", "note": hit };
			} else if( hit ) {
				app.drag = { "type": "move", "note": hit, "grab": c.step - hit.s, "moved": false };
				app.player.preview( app.sel, hit.p );
			} else {
				const note = { "s": c.step, "p": c.value, "l": snapLength( Math.min( app.noteLen, g.total - c.step ) ), "v": 1 };
				t.notes.push( note );
				app.drag = { "type": "new", note, "start": c.step };
				app.player.preview( app.sel, c.value );
			}
		}
		changed();
	}

	const drag = app.drag;
	if( drag && ui.active === "grid" && ui.down ) {
		const c = cellAt( ui.mx, ui.my );
		if( drag.type === "paint" ) {
			const key = c.step + ":" + c.value;
			if( !drag.visited.has( key ) ) {
				drag.visited.add( key );
				const hit = t.notes.find( n => n.s === c.step && n.p === c.value );
				if( drag.add && !hit ) {
					t.notes.push( { "s": c.step, "p": c.value, "l": 1, "v": 1 } );
					changed();
				} else if( !drag.add && hit ) {
					t.notes.splice( t.notes.indexOf( hit ), 1 );
					changed();
				}
			}
		} else if( drag.type === "new" || drag.type === "resize" ) {
			const n = drag.note;
			if( drag.type === "resize" || c.step !== drag.start ) {
				const len = snapLength( Math.max( 1, Math.min( g.total - n.s, c.step - n.s + 1 ) ) );
				if( len !== n.l ) {
					n.l = len;
					changed();
				}
			}
		} else if( drag.type === "move" ) {
			const n = drag.note;
			const s = Math.max( 0, Math.min( g.total - n.l, c.step - drag.grab ) );
			if( s !== n.s || c.value !== n.p ) {
				if( c.value !== n.p ) {
					app.player.preview( app.sel, c.value );
				}
				n.s = s;
				n.p = c.value;
				drag.moved = true;
				changed();
			}
		}
	}
	if( drag && ( ui.released || !ui.down ) ) {
		if( drag.type === "move" && !drag.moved ) {
			t.notes.splice( t.notes.indexOf( drag.note ), 1 );
			changed();
		}
		app.drag = null;
	}

	if( ui.rightIn( GRID_X, GRID_Y, gw, gh ) ) {
		const c = cellAt( ui.px, ui.py );
		const hit = g.isDrums ? t.notes.find( n => n.s === c.step && n.p === c.value ) : noteAt( t, c.step, c.value );
		if( hit ) {
			edit( () => {
				hit.v = VELOCITIES[ ( VELOCITIES.indexOf( hit.v ) + 1 ) % VELOCITIES.length ];
			} );
			toast( "VOLUME " + Math.round( hit.v * 100 ) + "%", 900 );
		}
	}
}

function barChordPcs( bar ) {
	return chordOffsets( app.song.key, app.song.scale, app.song.chords[ bar ] || 0, 3 ).map( o => o % 12 );
}

function drawChordLane( g ) {
	text( ED_X + 1, CHORD_Y + 1, "CHD", shade( COL.dim, 0.7 ) );
	const b0 = Math.floor( g.first / STEPS_PER_BAR );
	const b1 = Math.floor( ( g.first + g.steps - 1 ) / STEPS_PER_BAR );
	for( let b = b0; b <= b1; b++ ) {
		const x = GRID_X + ( b * STEPS_PER_BAR - g.first ) * g.cellW;
		const w = STEPS_PER_BAR * g.cellW;
		const hover = ui.enabled && ui.over( x, CHORD_Y, w, 9 );
		ui.hint( "chord", x, CHORD_Y, w, 9 );
		fill( x, CHORD_Y, w - 1, 9, hover ? PAL.navy : b % 2 ? "#232842" : "#2a3050" );
		text( x + 2, CHORD_Y + 1, String( b + 1 ), shade( COL.dim, 0.6 ) );
		const name = chordName( app.song.key, app.song.scale, app.song.chords[ b ] || 0 );
		text( x + 20, CHORD_Y + 1, name, hover ? PAL.white : PAL.yellow );
		if( ui.pressIn( x, CHORD_Y, w, 9 ) ) {
			ui.grab( "chord" );
			edit( s => {
				s.chords[ b ] = ( ( s.chords[ b ] || 0 ) + 1 ) % 7;
			} );
			toast( "BAR " + ( b + 1 ) + " CHORD: " + chordName( app.song.key, app.song.scale, app.song.chords[ b ] ) + " (RIGHT-CLICK GOES BACK)", 1600 );
		}
		if( ui.rightIn( x, CHORD_Y, w, 9 ) ) {
			edit( s => {
				s.chords[ b ] = ( ( s.chords[ b ] || 0 ) + 6 ) % 7;
			} );
		}
	}
}

function drawLabels( g ) {
	fill( ED_X, GRID_Y, LABEL_W - 1, g.visible * g.rowH, COL.face );
	ui.hint( g.isDrums ? "label-drums" : "label", ED_X, GRID_Y, LABEL_W - 1, g.visible * g.rowH );
	for( let r = 0; r < g.visible; r++ ) {
		const v = g.rows[ g.top + r ];
		const y = GRID_Y + r * g.rowH;
		let label;
		let color;
		if( g.isDrums ) {
			label = DRUM_SHORT[ v ];
			color = trackColor( app.sel );
			fill( ED_X, y + g.rowH - 1, LABEL_W - 1, 1, COL.lo );
			text( ED_X + 2, y + Math.floor( ( g.rowH - 8 ) / 2 ), label, color );
		} else {
			const pc = ( ( v - app.song.key ) % 12 + 12 ) % 12;
			label = pitchName( v );
			color = pc === 0 ? PAL.yellow : inScale( v, app.song.key, app.song.scale ) ? COL.dim : COL.hi;
			if( v % 12 === 0 ) {
				fill( ED_X, y, LABEL_W - 1, g.rowH, shade( COL.face, 1.12 ) );
			}
			smallText( ED_X + 2, y + 1, label, color );
		}
		if( ui.pressIn( ED_X, y, LABEL_W - 1, g.rowH ) ) {
			ui.grab( "label" );
			app.player.preview( app.sel, v );
		}
	}
}

function drawGrid( g ) {
	const t = g.t;
	const song = app.song;
	const gw = g.steps * g.cellW;
	const c = trackColor( app.sel );
	const b0 = Math.floor( g.first / STEPS_PER_BAR );
	const b1 = Math.floor( ( g.first + g.steps - 1 ) / STEPS_PER_BAR );

	// Rows
	for( let r = 0; r < g.visible; r++ ) {
		const v = g.rows[ g.top + r ];
		const y = GRID_Y + r * g.rowH;
		if( g.isDrums ) {
			fill( GRID_X, y, gw, g.rowH, r % 2 ? "#1e2135" : "#222640" );
			continue;
		}
		const pc = ( ( v - song.key ) % 12 + 12 ) % 12;
		const isIn = inScale( v, song.key, song.scale );
		fill( GRID_X, y, gw, g.rowH, pc === 0 ? "#2b2f4c" : isIn ? "#20233a" : "#171826" );
		// Chord tones of each bar glow softly
		for( let b = b0; b <= b1; b++ ) {
			if( barChordPcs( b ).includes( v % 12 ) ) {
				const x = GRID_X + Math.max( 0, b * STEPS_PER_BAR - g.first ) * g.cellW;
				const x2 = GRID_X + Math.min( g.steps, ( b + 1 ) * STEPS_PER_BAR - g.first ) * g.cellW;
				fill( x, y, x2 - x, g.rowH, pc === 0 ? "#34406a" : "#28335a" );
			}
		}
		fill( GRID_X, y + g.rowH - 1, gw, 1, "#191a28" );
	}

	// Beat and bar lines
	const gh = g.visible * g.rowH;
	for( let i = 0; i < g.steps; i++ ) {
		const s = g.first + i;
		const x = GRID_X + i * g.cellW;
		if( s % STEPS_PER_BAR === 0 ) {
			fill( x, GRID_Y, 1, gh, PAL.gray );
		} else if( s % 4 === 0 ) {
			fill( x, GRID_Y, 1, gh, "#3a4262" );
		} else if( g.cellW >= 10 ) {
			fill( x, GRID_Y, 1, gh, "#252a42" );
		}
	}

	// Other melody tracks, faintly, to help notes fit together
	if( !g.isDrums ) {
		song.tracks.forEach( ( other, ti ) => {
			if( ti === app.sel || other.type !== "melody" || other.mute ) {
				return;
			}
			const ghost = shade( trackColor( ti ), 0.28 );
			for( const n of other.notes ) {
				drawNoteBox( g, n, ghost, true );
			}
		} );
	}

	// Notes of this track
	const hits = app.player.noteHits.filter( h => h.track === app.sel );
	for( const n of t.notes ) {
		const lit = hits.some( h => h.s === n.s && h.p === n.p );
		const color = lit ? PAL.white : shade( c, n.v === 1 ? 1 : n.v === 0.6 ? 0.72 : 0.48 );
		drawNoteBox( g, n, color, false );
	}

	// Hover cell
	if( ui.enabled && !ui.down && ui.over( GRID_X, GRID_Y, gw, gh ) ) {
		const i = Math.floor( ( ui.mx - GRID_X ) / g.cellW );
		const r = Math.floor( ( ui.my - GRID_Y ) / g.rowH );
		frame( GRID_X + i * g.cellW, GRID_Y + r * g.rowH, g.cellW + 1, g.rowH + 1, PAL.white );
	}

	// Playhead
	const pos = app.player.position();
	if( pos >= g.first && pos < g.first + g.steps ) {
		const x = GRID_X + Math.floor( ( pos - g.first ) * g.cellW );
		fill( x, GRID_Y - 1, 2, gh + 1, PAL.yellow );
		fill( x - 2, GRID_Y - 3, 6, 2, PAL.yellow );
	}
	frame( GRID_X - 1, GRID_Y - 1, gw + 2, gh + 2, COL.lo );
}

function drawNoteBox( g, n, color, ghost ) {
	const rowIndex = g.rows.indexOf( n.p );
	const r = rowIndex - g.top;
	if( rowIndex < 0 || r < 0 || r >= g.visible ) {
		return;
	}
	const end = g.isDrums ? n.s + 1 : n.s + n.l;
	if( end <= g.first || n.s >= g.first + g.steps ) {
		return;
	}
	const x0 = GRID_X + ( Math.max( n.s, g.first ) - g.first ) * g.cellW;
	const x1 = GRID_X + ( Math.min( end, g.first + g.steps ) - g.first ) * g.cellW;
	const y = GRID_Y + r * g.rowH;
	if( ghost ) {
		frame( x0 + 1, y + 1, x1 - x0 - 1, g.rowH - 1, color );
		return;
	}
	if( g.isDrums ) {
		bevel( x0 + 1, y + 2, x1 - x0 - 1, g.rowH - 3, color, shade( color, 1.4 ), shade( color, 0.5 ) );
		return;
	}
	fill( x0 + 1, y, x1 - x0 - 1, g.rowH - 1, color );
	fill( x0 + 1, y, x1 - x0 - 1, 1, shade( color, 1.35 ) );
	fill( x1 - 2, y + 2, 1, g.rowH - 5, shade( color, 0.55 ) );
}

function drawScroll( g ) {
	if( g.isDrums ) {
		return;
	}
	const h = g.visible * g.rowH;
	if( ui.button( "up", SCROLL_X, GRID_Y, 12, 12, CHAR.up, { "repeat": true } ) ) {
		scrollRows( g, -1 );
	}
	if( ui.button( "down", SCROLL_X, GRID_Y + h - 12, 12, 12, CHAR.down, { "repeat": true } ) ) {
		scrollRows( g, 1 );
	}
	const trackY = GRID_Y + 13;
	const trackH = h - 26;
	fill( SCROLL_X, trackY, 12, trackH, COL.lo );
	ui.hint( "vscroll", SCROLL_X, trackY, 12, trackH );
	const thumbH = Math.max( 6, Math.round( trackH * g.visible / g.rows.length ) );
	const maxTop = Math.max( 1, g.rows.length - g.visible );
	const thumbY = trackY + Math.round( ( trackH - thumbH ) * g.top / maxTop );
	if( ui.pressIn( SCROLL_X, trackY, 12, trackH ) ) {
		ui.grab( "vscroll" );
	}
	if( ui.active === "vscroll" && ui.down ) {
		const f = Math.max( 0, Math.min( 1, ( ui.my - trackY - thumbH / 2 ) / ( trackH - thumbH ) ) );
		scrollRows( g, Math.round( f * maxTop ) - g.top );
	}
	bevel( SCROLL_X + 1, thumbY, 10, thumbH, COL.hi, PAL.light, COL.face );
}

function drawMinimap( g ) {
	const song = app.song;
	const t = g.t;
	const total = g.total;
	text( ED_X + 1, MAP_Y + 1, "MAP", shade( COL.dim, 0.7 ) );
	bevel( GRID_X - 1, MAP_Y - 1, GRID_W + 2, MAP_H + 2, COL.lo, COL.lo, COL.hi );
	const scale = GRID_W / total;
	for( let b = 1; b < song.bars; b++ ) {
		fill( GRID_X + Math.round( b * STEPS_PER_BAR * scale ), MAP_Y, 1, MAP_H, COL.face );
	}
	const c = trackColor( app.sel );
	let lo = 127;
	let hi = 0;
	for( const n of t.notes ) {
		lo = Math.min( lo, n.p );
		hi = Math.max( hi, n.p );
	}
	for( const n of t.notes ) {
		const x = GRID_X + Math.floor( n.s * scale );
		const w = Math.max( 1, Math.floor( ( g.isDrums ? 1 : n.l ) * scale ) );
		const f = g.isDrums ? DRUM_ORDER.indexOf( n.p ) / 7 : hi > lo ? ( hi - n.p ) / ( hi - lo ) : 0.5;
		fill( x, MAP_Y + 1 + Math.round( f * ( MAP_H - 3 ) ), w, 1, c );
	}
	frame( GRID_X + Math.round( g.first * scale ), MAP_Y - 1, Math.max( 2, Math.round( g.steps * scale ) + 1 ), MAP_H + 2, PAL.white );
	const pos = app.player.position();
	if( pos >= 0 ) {
		fill( GRID_X + Math.floor( pos * scale ), MAP_Y - 1, 1, MAP_H + 2, PAL.yellow );
	}
	ui.hint( "map", GRID_X, MAP_Y - 1, GRID_W, MAP_H + 2 );
	if( ui.pressIn( GRID_X, MAP_Y - 1, GRID_W, MAP_H + 2 ) ) {
		ui.grab( "map" );
	}
	if( ui.active === "map" && ui.down ) {
		const step = Math.max( 0, Math.min( total - 1, Math.floor( ( ui.mx - GRID_X ) / scale ) ) );
		app.page = Math.floor( step / g.perPage );
		app.follow = false;
	}
}

// ---------------------------------------------------------------------------------------------
// Bottom bar

const FX = [ [ "reverb", "REV" ], [ "echo", "ECHO" ], [ "chorus", "CHOR" ], [ "crush", "CRSH" ] ];

function drawBottom() {
	const song = app.song;
	fill( 0, FX_Y - 2, W, H - FX_Y + 2, "#141522" );
	fill( 0, FX_Y - 2, W, 1, COL.face );

	// Chord progression
	text( 3, FX_Y + 2, "CHORDS", COL.dim );
	const custom = progressionChords( song.prog, song.bars ).join() !== song.chords.join();
	const setProg = dir => {
		edit( s => setProgression( s, s.prog + dir ) );
		toast( "NEW CHORDS - PRESS MAGIC TO REWRITE PARTS FOR THEM", 3000 );
	};
	if( ui.button( "prog-", 42, FX_Y, 9, 11, CHAR.left ) ) {
		setProg( -1 );
	}
	const label = custom ? "CUSTOM" : progressionLabel( song.scale, PROGRESSIONS[ song.prog ] );
	if( ui.button( "prog", 52, FX_Y, 76, 11, fit( label, 12 ), { "textColor": PAL.yellow } ) ) {
		setProg( custom ? 0 : 1 );
	}
	if( ui.button( "prog+", 129, FX_Y, 9, 11, CHAR.right ) ) {
		setProg( 1 );
	}

	// Effects
	FX.forEach( ( [ key, name ], i ) => {
		const x = 144 + i * 70;
		text( x, FX_Y + 2, name, COL.dim );
		const id = "fx-" + key;
		const v = ui.slider( id, x + 26, FX_Y, 40, 11, song.fx[ key ], 0, 1, { "color": PAL.lime } );
		if( ui.grabbed === id ) {
			pushUndo();
		}
		if( v !== song.fx[ key ] ) {
			song.fx[ key ] = Math.round( v * 100 ) / 100;
			changed();
		}
	} );
	text( 424, FX_Y + 2, "VOL", COL.dim );
	const vol = ui.slider( "master", 443, FX_Y, 34, 11, app.volume, 0, 1, { "color": PAL.orange } );
	if( vol !== app.volume ) {
		app.volume = vol;
		$.setVolume( vol );
	}

	// Title and file buttons
	const editing = app.textEdit && app.textEdit.target === "title";
	if( ui.button( "title", 2, BTN_Y, 122, 15, "" ) ) {
		startTextEdit( "title", song.title, 24 );
	}
	if( editing ) {
		const caret = Math.floor( app.time / 300 ) % 2 ? "_" : " ";
		text( 6, BTN_Y + 4, fit( app.textEdit.value + caret, 19 ), PAL.white );
	} else {
		text( 6, BTN_Y + 4, CHAR.note + " " + fit( song.title, 17 ), PAL.yellow );
	}
	const buttons = [
		[ "NEW", 28 ], [ "SAVE", 32 ], [ "LOAD", 32 ], [ "CODE", 32 ], [ "EXPORT", 42 ], [ "WAV", 28 ],
		[ "UNDO", 32 ], [ "REDO", 32 ], [ "HELP", 32 ], [ "TIPS", 32 ]
	];
	let x = 128;
	for( const [ name, w ] of buttons ) {
		let color = { "CODE": PAL.green, "WAV": PAL.red, "LOAD": PAL.blue }[ name ];
		if( name === "TIPS" && app.tips ) {
			color = PAL.orange;
		}
		if( ui.button( "b-" + name, x, BTN_Y, w, 15, name, { "on": !!color, color } ) ) {
			fileButton( name );
		}
		x += w + 3;
	}
}

function fileButton( name ) {
	switch( name ) {
		case "NEW":
			loadSong( buildTemplate( "blank" ), "NEW SONG - UNDO BRINGS BACK THE OLD ONE" );
			break;
		case "SAVE":
			if( saveToLibrary( app.song ) ) {
				toast( "SAVED " + app.song.title + " IN THIS BROWSER - LOAD OPENS IT AGAIN" );
			} else {
				toast( "COULD NOT SAVE - USE EXPORT TO KEEP YOUR SONG AS A FILE", 4000 );
			}
			break;
		case "LOAD":
			openOverlay( "load" );
			break;
		case "CODE":
			openOverlay( "code" );
			break;
		case "EXPORT": {
			const name = fileName( app.song.title, ".js" );
			downloadText( name, songToCode( app.song ) );
			toast( "EXPORTED " + name + " - LOAD CAN IMPORT IT BACK" );
			break;
		}
		case "WAV":
			openOverlay( "wav" );
			break;
		case "UNDO":
			undo();
			break;
		case "REDO":
			redo();
			break;
		case "HELP":
			openOverlay( "help" );
			break;
		case "TIPS":
			app.tips = !app.tips;
			toast( app.tips ? "TIPS ON: POINT AT ANYTHING TO SEE WHAT IT DOES" : "TIPS OFF" );
			break;
	}
}

// ---------------------------------------------------------------------------------------------
// Magic menu

function drawMenu() {
	const t = track();
	if( !t ) {
		app.menu = null;
		return;
	}
	const items = MAGIC[ t.type ];
	const x = 290;
	const y = ROW2_Y + 12;
	const w = 100;
	const h = items.length * 12 + 16;
	fill( x + 3, y + 3, w, h, "#0b0c14" );
	bevel( x, y, w, h, COL.face, PAL.purple, COL.lo );
	text( x + 4, y + 3, "WRITE A PART:", PAL.light );
	items.forEach( ( item, i ) => {
		if( ui.button( "mg" + i, x + 2, y + 13 + i * 12, w - 4, 11, item.name ) ) {
			const seed = app.seed++;
			edit( s => item.fn( s, s.tracks[ app.sel ], seed ) );
			app.menu = null;
			app.page = 0;
			toast( item.name + " FOR " + t.name + ( app.player.playing ? "" : " - PRESS PLAY!" ) );
		}
	} );
	const inside = ui.px >= x && ui.px < x + w && ui.py >= y && ui.py < y + h;
	if( ui.pressed && ui.active === null && !inside ) {
		app.menu = null;
		ui.grab( "menu-close" );
	}
}
