// Pop-up screens drawn over the editor: instrument picker, sound editor, code viewer,
// demo songs, WAV export and help.

import { ui, PAL, COL, CHAR, fill, text, fit, bevel, panel, shade } from "./ui.js";
import { app, track, trackColor, toast, pushUndo, changed, edit, loadSong, importCode, samplePitch } from "./state.js";
import {
	PRESETS, KITS, CATEGORIES, WAVES, FILTERS, FILTER_NAMES, ARP_IDS, STYLES, STYLE_NAMES,
	DRUM_NAMES, getPreset, getKit
} from "./instruments.js";
import { TEMPLATES, totalSteps } from "./song.js";
import { songToCode } from "./codegen.js";
import { copyText, readClipboard, downloadText, pickTextFile, fileName } from "./storage.js";

const $ = window.pi;
const W = 480;
const H = 270;

export function openOverlay( type, data = {} ) {
	app.menu = null;
	app.textEdit = null;
	app.overlay = { type, ...data };
}

export function closeOverlay() {
	if( !app.overlay ) {
		return;
	}
	if( app.overlay.type === "wav" && app.player.recording ) {
		app.player.cancelRecording();
	}
	app.overlay = null;
}

export function drawOverlay() {
	switch( app.overlay.type ) {
		case "instruments":
			drawInstruments();
			break;
		case "sound":
			drawSound();
			break;
		case "code":
			drawCode();
			break;
		case "demos":
			drawDemos();
			break;
		case "wav":
			drawWav();
			break;
		case "help":
			drawHelp();
			break;
	}
}

function closeBox( x, y ) {
	if( ui.button( "ov-x", x, y, 11, 11, "X" ) ) {
		closeOverlay();
	}
}

// ---------------------------------------------------------------------------------------------
// Instrument picker

function drawInstruments() {
	const t = track();
	if( !t ) {
		closeOverlay();
		return;
	}
	const x = 24;
	const y = 24;
	const w = 432;
	const h = 222;
	const c = trackColor( app.sel );
	panel( x, y, w, h, "CHOOSE A SOUND FOR " + t.name, c );
	closeBox( x + w - 15, y + 3 );
	if( t.type === "drums" ) {
		text( x + 12, y + 22, "PICK A DRUM KIT. EACH HAS 8 SOUNDS YOU CAN TWEAK WITH EDIT.", COL.dim );
		KITS.forEach( ( kit, i ) => {
			if( ui.button( "kit" + i, x + 12, y + 38 + i * 30, 200, 24, kit.name, { "on": t.preset === kit.id, "color": PAL.teal } ) ) {
				pushUndo();
				t.preset = kit.id;
				t.drums = kit.drums.map( d => ( { ...d } ) );
				changed();
				[ 0, 3, 1, 3 ].forEach( ( d, j ) => setTimeout( () => app.player.preview( app.sel, d ), j * 160 ) );
			}
		} );
	} else {
		CATEGORIES.forEach( ( cat, ci ) => {
			const cx = x + 10 + ci * 84;
			text( cx + 2, y + 20, cat, c );
			PRESETS.filter( p => p.cat === cat ).forEach( ( p, j ) => {
				if( ui.button( "pre-" + p.id, cx, y + 32 + j * 17, 80, 15, p.name, { "on": t.preset === p.id, "color": PAL.teal } ) ) {
					pushUndo();
					t.preset = p.id;
					t.inst = { ...p.params };
					changed();
					app.player.preview( app.sel, samplePitch( t ) );
				}
			} );
		} );
	}
	text( x + 12, y + h - 36, "CLICK A SOUND TO HEAR IT. YOUR NOTES STAY THE SAME.", COL.dim );
	text( x + 12, y + h - 26, "USE EDIT TO SHAPE THE SOUND YOURSELF.", COL.dim );
	if( ui.button( "ins-edit", x + w - 132, y + h - 20, 56, 14, "EDIT" ) ) {
		openOverlay( "sound", { "drum": 0 } );
	}
	if( ui.button( "ins-done", x + w - 70, y + h - 20, 56, 14, "DONE", { "on": true, "color": PAL.green } ) ) {
		closeOverlay();
	}
}

// ---------------------------------------------------------------------------------------------
// Sound editor

const WAVE_LABELS = {
	"sine": "SINE", "triangle": "TRI", "square": "SQR", "sawtooth": "SAW",
	"pulse25": "P-25", "pulse12": "P-12", "noise": "NOISE", "pink": "PINK"
};
const ARP_LABELS = { "off": "OFF", "major": "MAJ", "minor": "MIN", "power": "PWR", "octave": "OCT", "trill": "TRL" };

function fmtSeconds( v ) {
	return v < 1 ? Math.round( v * 1000 ) + "MS" : v.toFixed( 2 ) + "S";
}

function drawSound() {
	const t = track();
	if( !t ) {
		closeOverlay();
		return;
	}
	const ov = app.overlay;
	const isDrums = t.type === "drums";
	const c = trackColor( app.sel );
	const x = 8;
	const y = 6;
	const w = 464;
	const h = 258;
	panel( x, y, w, h, "SOUND EDITOR - " + t.name + ( isDrums ? "" : " (" + getPreset( t.preset ).name + ")" ), c );
	closeBox( x + w - 15, y + 3 );
	const p = isDrums ? t.drums[ ov.drum ] : t.inst;
	const hear = () => app.player.preview( app.sel, isDrums ? ov.drum : samplePitch( t ) );
	let top = y + 20;
	if( isDrums ) {
		DRUM_NAMES.forEach( ( name, i ) => {
			if( ui.button( "drum" + i, x + 8 + i * 56, top, 54, 12, name, { "on": ov.drum === i, "color": PAL.teal } ) ) {
				ov.drum = i;
				app.player.preview( app.sel, i );
			}
		} );
		top += 17;
	}

	const set = ( key, value ) => {
		if( p[ key ] !== value ) {
			pushUndo();
			p[ key ] = value;
			changed();
			hear();
		}
	};
	const choice = ( label, key, list, labels, cx, cy, bw, perRow = 8 ) => {
		text( cx, cy + 2, label, COL.dim );
		list.forEach( ( id, i ) => {
			const bx = cx + 56 + ( i % perRow ) * ( bw + 2 );
			const by = cy + Math.floor( i / perRow ) * 13;
			if( ui.button( "c-" + key + id, bx, by, bw, 11, labels[ id ], { "on": p[ key ] === id, "color": PAL.blue } ) ) {
				set( key, id );
			}
		} );
	};
	const slider = ( label, key, min, max, cx, cy, o = {} ) => {
		text( cx, cy + 2, label, COL.dim );
		const id = "p-" + key;
		const v = ui.slider( id, cx + 56, cy, 116, 11, p[ key ], min, max, { "curve": o.curve || 1, "color": c } );
		if( ui.grabbed === id ) {
			pushUndo();
		}
		const r = o.step ? Math.round( v / o.step ) * o.step : Math.round( v * 1000 ) / 1000;
		if( r !== p[ key ] ) {
			p[ key ] = r;
			changed();
		}
		if( ui.released && ui.active === id ) {
			hear();
		}
		const shown = o.fmt ? o.fmt( p[ key ] ) : String( p[ key ] );
		text( cx + 176, cy + 2, fit( shown, 8 ), PAL.white );
	};

	const lx = x + 10;
	const rx = x + 238;
	choice( "WAVE", "wave", WAVES, WAVE_LABELS, lx, top, 38, 4 );
	let ly = top + 30;
	slider( "VOLUME", "volume", 0, 1, lx, ly, { "fmt": v => Math.round( v * 100 ) + "%" } );
	slider( "ATTACK", "attack", 0, 2, lx, ly += 15, { "curve": 3, "fmt": fmtSeconds } );
	slider( "DECAY", "decay", 0, 3, lx, ly += 15, { "curve": 2, "fmt": fmtSeconds } );
	slider( "SUSTAIN", "sustain", 0, 1, lx, ly += 15, { "fmt": v => Math.round( v * 100 ) + "%" } );
	slider( "RELEASE", "release", 0, 3, lx, ly += 15, { "curve": 2, "fmt": fmtSeconds } );
	choice( "STYLE", "style", STYLES, STYLE_NAMES, lx, ly += 17, 44 );
	if( isDrums ) {
		slider( "PITCH", "pitch", 0, 2000, lx, ly += 17, { "curve": 2.5, "step": 1, "fmt": v => v ? v + "HZ" : "NOTE" } );
		slider( "DROP TO", "pitchEnd", 0, 2000, lx, ly += 15, { "curve": 2.5, "step": 1, "fmt": v => v ? v + "HZ" : "OFF" } );
		slider( "RING", "ring", 1, 8, lx, ly += 15, { "step": 1, "fmt": v => v + " STEPS" } );
	}

	choice( "FILTER", "filter", FILTERS, FILTER_NAMES, rx, top, 38 );
	let ry = top + 15;
	const noFilter = p.filter === "off";
	slider( "CUTOFF", "cutoff", 40, 12000, rx, ry, { "curve": 3, "step": 1, "fmt": v => noFilter ? "-" : v + "HZ" } );
	slider( "RESO", "resonance", 0.1, 20, rx, ry += 15, { "curve": 2, "fmt": v => noFilter ? "-" : v.toFixed( 1 ) } );
	slider( "SWEEP", "envAmount", -4, 6, rx, ry += 15, { "step": 0.1, "fmt": v => noFilter ? "-" : v.toFixed( 1 ) + " OCT" } );
	slider( "SWP TIME", "envDecay", 0, 2, rx, ry += 15, { "curve": 2, "fmt": fmtSeconds } );
	slider( "VIBRATO", "vibrato", 0, 60, rx, ry += 15, { "curve": 1.5, "step": 1, "fmt": v => v + " CT" } );
	slider( "TREMOLO", "tremolo", 0, 1, rx, ry += 15, { "fmt": v => Math.round( v * 100 ) + "%" } );
	choice( "ARPEGGIO", "arp", ARP_IDS, ARP_LABELS, rx, ry += 17, 26 );
	slider( "ARP RATE", "arpRate", 2, 40, rx, ry += 15, { "step": 1, "fmt": v => p.arp === "off" ? "-" : v + "/S" } );

	// Test keyboard
	const ky = y + h - 42;
	if( isDrums ) {
		if( ui.button( "test", lx, ky + 8, 90, 20, CHAR.right + " HEAR IT", { "on": true, "color": PAL.green } ) ) {
			hear();
		}
	} else {
		text( lx, ky - 10, "TRY IT: CLICK THE KEYS, OR TYPE Z-M / Q-U", COL.dim );
		const base = Math.floor( samplePitch( t ) / 12 ) * 12;
		const whites = [ 0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24 ];
		const kw = 14;
		const typed = Object.values( app.pianoHeld );
		whites.forEach( ( semi, i ) => {
			const kx = lx + i * kw;
			const id = "wk" + i;
			const held = ( ui.active === id && ui.down ) || typed.includes( base + semi );
			if( ui.pressIn( kx, ky, kw - 1, 32 ) ) {
				ui.grab( id );
				app.player.preview( app.sel, base + semi );
			}
			fill( kx, ky, kw - 1, 32, held ? PAL.yellow : PAL.white );
			fill( kx, ky + 30, kw - 1, 2, PAL.light );
		} );
		[ 1, 3, -1, 6, 8, 10, -1, 13, 15, -1, 18, 20, 22 ].forEach( ( semi, i ) => {
			if( semi < 0 ) {
				return;
			}
			const kx = lx + ( i + 1 ) * kw - 4;
			const id = "bk" + i;
			const held = ( ui.active === id && ui.down ) || typed.includes( base + semi );
			fill( kx, ky, 8, 19, held ? PAL.orange : PAL.black );
			if( ui.enabled && ui.pressed && ui.px >= kx && ui.px < kx + 8 && ui.py >= ky && ui.py < ky + 19 ) {
				// Black keys sit on top of the white keys, so they win the press
				ui.grab( id );
				app.player.preview( app.sel, base + semi );
			}
		} );
		text( lx + 1, ky + 22, "C" + ( Math.floor( base / 12 ) - 1 ), PAL.gray );
	}
	if( ui.button( "snd-reset", x + w - 132, y + h - 20, 56, 14, "RESET" ) ) {
		pushUndo();
		if( isDrums ) {
			t.drums[ ov.drum ] = { ...getKit( t.preset ).drums[ ov.drum ] };
		} else {
			t.inst = { ...getPreset( t.preset ).params };
		}
		changed();
		hear();
		toast( "SOUND RESET" );
	}
	if( ui.button( "snd-done", x + w - 70, y + h - 20, 56, 14, "DONE", { "on": true, "color": PAL.green } ) ) {
		closeOverlay();
	}
}

// ---------------------------------------------------------------------------------------------
// Code viewer

const CODE_COLS = 74;
const CODE_ROWS = 23;
const CODE_LH = 9;

function codeLines( code ) {
	const out = [];
	for( const raw of code.split( "\n" ) ) {
		let line = raw.replace( /\t/g, "  " );
		const trimmed = line.trim();
		let kind = "code";
		if( trimmed.startsWith( "/*" ) ) {
			kind = "data";
			line = "/* @pixeltracks {...project data for loading this song back...} */";
		} else if( trimmed.startsWith( "//" ) ) {
			kind = "comment";
		} else if( trimmed.startsWith( "\"" ) ) {
			kind = "string";
		}
		const indent = line.match( /^ */ )[ 0 ].length;
		let first = true;
		while( line.length > CODE_COLS ) {
			const cut = line.lastIndexOf( " ", CODE_COLS );
			const at = cut > indent + 10 ? cut : CODE_COLS;
			out.push( { "text": line.slice( 0, at ), kind, first } );
			line = " ".repeat( indent + 4 ) + line.slice( at ).trimStart();
			first = false;
		}
		out.push( { "text": line, kind, first } );
	}
	return out;
}

const CODE_COLORS = {
	"code": PAL.cyan, "comment": PAL.gray, "string": PAL.yellow, "data": shade( PAL.gray, 0.8 )
};

function drawCode() {
	const ov = app.overlay;
	if( !ov.lines ) {
		ov.code = songToCode( app.song );
		ov.lines = codeLines( ov.code );
		ov.scroll = 0;
	}
	const x = 4;
	const y = 4;
	const w = 472;
	const h = 262;
	panel( x, y, w, h, "SONG CODE - " + app.song.title + " AS PI.JS COMMANDS", PAL.lime );
	closeBox( x + w - 15, y + 3 );
	const ax = x + 6;
	const ay = y + 18;
	fill( ax, ay, 450, CODE_ROWS * CODE_LH + 3, "#10111c" );
	const maxScroll = Math.max( 0, ov.lines.length - CODE_ROWS );
	if( ui.wheelY ) {
		ov.scroll += Math.sign( ui.wheelY ) * Math.max( 1, Math.round( Math.abs( ui.wheelY ) / 25 ) );
		ui.wheelY = 0;
	}
	ov.scroll = Math.max( 0, Math.min( maxScroll, ov.scroll ) );
	for( let i = 0; i < CODE_ROWS; i++ ) {
		const line = ov.lines[ ov.scroll + i ];
		if( line ) {
			text( ax + 3, ay + 2 + i * CODE_LH, line.text, CODE_COLORS[ line.kind ] );
		}
	}
	// Scroll bar
	const sx = ax + 452;
	if( ui.button( "code-up", sx, ay, 10, 10, CHAR.up, { "repeat": true } ) ) {
		ov.scroll = Math.max( 0, ov.scroll - 2 );
	}
	if( ui.button( "code-dn", sx, ay + CODE_ROWS * CODE_LH - 7, 10, 10, CHAR.down, { "repeat": true } ) ) {
		ov.scroll = Math.min( maxScroll, ov.scroll + 2 );
	}
	const trackY = ay + 11;
	const trackH = CODE_ROWS * CODE_LH - 19;
	fill( sx, trackY, 10, trackH, COL.lo );
	const thumbH = Math.max( 8, Math.round( trackH * Math.min( 1, CODE_ROWS / ov.lines.length ) ) );
	const thumbY = trackY + Math.round( ( trackH - thumbH ) * ( maxScroll ? ov.scroll / maxScroll : 0 ) );
	if( ui.pressIn( sx, trackY, 10, trackH ) ) {
		ui.grab( "code-scroll" );
	}
	if( ui.active === "code-scroll" && ui.down ) {
		ov.scroll = Math.round( Math.max( 0, Math.min( 1, ( ui.my - trackY - thumbH / 2 ) / ( trackH - thumbH ) ) ) * maxScroll );
	}
	bevel( sx + 1, thumbY, 8, thumbH, COL.hi, PAL.light, COL.face );

	const by = y + h - 20;
	if( ui.button( "code-copy", x + 6, by, 70, 15, "COPY CODE", { "on": true, "color": PAL.green } ) ) {
		copyText( ov.code ).then(
			() => toast( "CODE COPIED - PASTE IT INTO ANY PI.JS PROGRAM" ),
			() => toast( "COULD NOT COPY - USE SAVE .JS INSTEAD" )
		);
	}
	if( ui.button( "code-save", x + 80, by, 60, 15, "SAVE .JS" ) ) {
		const name = fileName( app.song.title, ".js" );
		downloadText( name, ov.code );
		toast( "SAVED " + name );
	}
	if( ui.button( "code-paste", x + 144, by, 76, 15, "PASTE CODE" ) ) {
		readClipboard().then( textIn => {
			if( textIn ) {
				importCode( textIn );
			}
		}, () => toast( "PRESS CTRL+V TO PASTE CODE" ) );
	}
	if( ui.button( "code-load", x + 224, by, 64, 15, "LOAD FILE" ) ) {
		pickTextFile().then( importCode ).catch( () => {} );
	}
	text( x + 294, by + 4, fit( ov.lines.length + " LINES. CTRL+V LOADS CODE", 29 ), COL.dim );
}

// ---------------------------------------------------------------------------------------------
// Demo songs

function drawDemos() {
	const x = 80;
	const y = 28;
	const w = 320;
	const h = 214;
	panel( x, y, w, h, "DEMO SONGS", PAL.blue );
	closeBox( x + w - 15, y + 3 );
	text( x + 10, y + 20, "PICK ONE TO LOAD IT. TAKE IT APART AND REMIX IT!", COL.dim );
	TEMPLATES.forEach( ( tpl, i ) => {
		const by = y + 34 + i * 34;
		if( ui.button( "demo" + i, x + 10, by, w - 20, 30, "" ) ) {
			const song = tpl.build();
			loadSong( song, tpl.name + " LOADED - UNDO GOES BACK TO YOUR SONG" );
			if( tpl.id !== "blank" ) {
				app.player.play( 0 );
			}
		}
		text( x + 18, by + 6, tpl.name, PAL.yellow );
		text( x + 18, by + 17, tpl.desc, COL.dim );
	} );
}

// ---------------------------------------------------------------------------------------------
// WAV export

function songSeconds() {
	return totalSteps( app.song ) * 60 / app.song.tempo / 4;
}

function fmtTime( s ) {
	const m = Math.floor( s / 60 );
	const r = Math.round( s % 60 );
	return m + ":" + String( r ).padStart( 2, "0" );
}

function drawWav() {
	const ov = app.overlay;
	ov.stage = ov.stage || "setup";
	ov.loops = ov.loops || 1;
	const x = 90;
	const y = 50;
	const w = 300;
	const h = 170;
	panel( x, y, w, h, "EXPORT WAV FILE", PAL.red );
	const cx = x + 12;
	if( ov.stage === "setup" ) {
		closeBox( x + w - 15, y + 3 );
		text( cx, y + 22, "RECORDS YOUR SONG AS IT PLAYS, THEN", COL.text );
		text( cx, y + 32, "SAVES IT AS A .WAV AUDIO FILE.", COL.text );
		text( cx, y + 50, "PLAY IT", COL.dim );
		[ 1, 2, 4 ].forEach( ( n, i ) => {
			if( ui.button( "loops" + n, cx + 50 + i * 42, y + 47, 38, 13, n + "X", { "on": ov.loops === n, "color": PAL.blue } ) ) {
				ov.loops = n;
			}
		} );
		const seconds = songSeconds() * ov.loops + ( app.song.fx.reverb || app.song.fx.echo ? 3 : 1 );
		text( cx, y + 68, "LENGTH: " + fmtTime( seconds ) + " (RECORDING TAKES AS LONG)", COL.dim );
		if( seconds > 590 ) {
			text( cx, y + 80, "TOO LONG - TRY FEWER LOOPS", PAL.orange );
		}
		text( cx, y + 92, "MUTED TRACKS ARE LEFT OUT.", COL.dim );
		if( ui.button( "rec-go", x + w - 110, y + h - 24, 98, 16, "RECORD", { "on": true, "color": PAL.red, "disabled": seconds > 590 } ) ) {
			ov.stage = "rec";
			ov.progress = 0;
			app.player.record( ov.loops, prog => {
				ov.progress = prog;
			} ).then( blob => {
				if( app.overlay !== ov ) {
					return;
				}
				if( blob ) {
					ov.blob = blob;
					ov.stage = "done";
				} else {
					ov.stage = "setup";
				}
			} ).catch( err => {
				ov.stage = "error";
				ov.error = String( err.message || err ).toUpperCase();
			} );
		}
	} else if( ov.stage === "rec" ) {
		const blink = Math.floor( app.time / 400 ) % 2;
		fill( cx, y + 24, 8, 8, blink ? PAL.red : shade( PAL.red, 0.4 ) );
		text( cx + 14, y + 24, "RECORDING... " + Math.round( ( ov.progress || 0 ) * 100 ) + "%", PAL.white );
		bevel( cx, y + 44, w - 24, 14, COL.lo, COL.lo, COL.hi );
		fill( cx + 2, y + 46, Math.round( ( w - 28 ) * ( ov.progress || 0 ) ), 10, PAL.red );
		text( cx, y + 70, "LISTEN ALONG! THE FILE IS READY WHEN", COL.dim );
		text( cx, y + 80, "THE BAR IS FULL.", COL.dim );
		if( ui.button( "rec-stop", x + w - 110, y + h - 24, 98, 16, "CANCEL" ) ) {
			app.player.cancelRecording();
		}
	} else if( ov.stage === "done" ) {
		closeBox( x + w - 15, y + 3 );
		text( cx, y + 24, "DONE! YOUR SONG IS READY.", PAL.lime );
		text( cx, y + 40, "SIZE: " + ( ov.blob.size / 1048576 ).toFixed( 1 ) + " MB (16-BIT STEREO WAV)", COL.dim );
		if( ui.button( "wav-save", cx, y + 60, 120, 20, "SAVE WAV FILE", { "on": true, "color": PAL.green } ) ) {
			$.saveRecording( ov.blob, fileName( app.song.title, ".wav" ) );
			toast( "SAVING " + fileName( app.song.title, ".wav" ) );
		}
		if( ui.button( "wav-again", cx + 128, y + 60, 90, 20, "RECORD AGAIN" ) ) {
			ov.stage = "setup";
			ov.blob = null;
		}
		if( ui.button( "wav-close", x + w - 70, y + h - 24, 58, 16, "CLOSE" ) ) {
			closeOverlay();
		}
	} else {
		closeBox( x + w - 15, y + 3 );
		text( cx, y + 24, "RECORDING FAILED:", PAL.orange );
		text( cx, y + 36, fit( ov.error || "UNKNOWN ERROR", 44 ), COL.text );
		text( cx, y + 56, "YOUR BROWSER MAY BLOCK AUDIO RECORDING.", COL.dim );
		if( ui.button( "wav-back", x + w - 70, y + h - 24, 58, 16, "BACK" ) ) {
			ov.stage = "setup";
		}
	}
}

// ---------------------------------------------------------------------------------------------
// Help

const HELP = [
	[ PAL.yellow, "MAKING MUSIC" ],
	[ COL.text, "1. PICK A TRACK ON THE LEFT: LEAD, BASS, DRUMS..." ],
	[ COL.text, "2. CLICK THE GRID TO ADD A NOTE. DRAG RIGHT TO MAKE IT LONGER." ],
	[ COL.text, "   CLICK A NOTE TO DELETE IT. DRAG A NOTE TO MOVE IT." ],
	[ COL.text, "   RIGHT-CLICK A NOTE TO MAKE IT SOFTER." ],
	[ COL.text, "3. LOCK SHOWS ONLY NOTES IN THE KEY, SO NOTHING SOUNDS WRONG." ],
	[ COL.text, "   BRIGHT ROWS ARE THE NOTES OF EACH BAR'S CHORD - SAFE BETS!" ],
	[ COL.text, "4. STUCK? MAGIC WRITES A MELODY, CHORDS, BASS OR BEAT FOR YOU." ],
	[ COL.text, "5. CLICK A CHORD NAME ABOVE THE GRID TO CHANGE THAT BAR'S CHORD." ],
	[ COL.text, "6. CHANGE THE SOUND WITH THE ARROWS, OR SHAPE IT WITH EDIT." ],
	[ COL.text, "7. ADD SPACE WITH REV (REVERB), ECHO, CHOR (CHORUS), CRSH (CRUSH)." ],
	[ PAL.yellow, "KEYS" ],
	[ COL.text, "SPACE PLAY/STOP    CTRL+Z UNDO    CTRL+Y REDO    ESC CLOSE" ],
	[ COL.text, "Z-M AND Q-U PLAY THE SELECTED TRACK LIKE A PIANO." ],
	[ COL.text, "TURN ON REC, PRESS PLAY, AND TYPE NOTES TO RECORD THEM." ],
	[ COL.text, "ARROWS SCROLL THE GRID. MOUSE WHEEL SCROLLS NOTES." ],
	[ PAL.yellow, "YOUR SONG IS CODE" ],
	[ COL.text, "CODE SHOWS YOUR SONG AS PI.JS PLAY() COMMANDS. SAVE WRITES IT TO" ],
	[ COL.text, "A .JS FILE AND LOAD READS IT BACK. PASTE ANY PI.JS PLAY() CODE" ],
	[ COL.text, "(CTRL+V) TO IMPORT IT. WAV RECORDS AN AUDIO FILE." ],
	[ COL.dim, "YOUR WORK IS SAVED IN THIS BROWSER AUTOMATICALLY." ]
];

function drawHelp() {
	const x = 16;
	const y = 12;
	const w = 448;
	const h = 246;
	panel( x, y, w, h, "HOW TO USE PI.JS TRACKS", PAL.sky );
	closeBox( x + w - 15, y + 3 );
	let ly = y + 20;
	for( const [ color, line ] of HELP ) {
		if( color === PAL.yellow && ly > y + 20 ) {
			ly += 4;
		}
		text( x + 10, ly, line, color );
		ly += 10;
	}
	if( ui.button( "help-ok", x + w - 70, y + h - 20, 56, 14, "GOT IT", { "on": true, "color": PAL.green } ) ) {
		closeOverlay();
	}
}
