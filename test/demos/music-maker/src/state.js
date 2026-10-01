// Shared application state and the actions that change the song (with undo and autosave).

import { Player } from "./player.js";
import { buildTemplate } from "./song.js";
import { codeToSong } from "./codegen.js";
import { saveLocal, loadLocal } from "./storage.js";

export const TRACK_COLORS = [ "#73eff7", "#a7f070", "#ffcd75", "#ef7d57", "#ff77a8", "#41a6f6", "#e04e6a", "#38b764" ];

export const app = {
	"mode": "splash",
	"song": null,
	"player": null,
	"sel": 0,
	"page": 0,
	"noteLen": 2,
	"lock": true,
	"rec": false,
	"overlay": null,
	"menu": null,
	"drag": null,
	"toast": null,
	"textEdit": null,
	"keys": [],
	"pianoHeld": {}, // key code -> pitch, for piano keys typed and still held down
	"undoStack": [],
	"redoStack": [],
	"seed": 1,
	"time": 0
};

let saveTimer = null;

export function initState() {
	app.player = new Player();
	const saved = loadLocal();
	app.song = saved || buildTemplate( "chip" );
	app.seed = Math.floor( Math.random() * 100000 );
	app.player.setSong( app.song );
	return !!saved;
}

export function track() {
	return app.song.tracks[ app.sel ];
}

export function trackColor( index ) {
	return TRACK_COLORS[ index % TRACK_COLORS.length ];
}

// A pitch that suits a track, for previews: the middle of its notes, or near its view.
export function samplePitch( t ) {
	if( t.type === "drums" ) {
		return 0;
	}
	if( t.notes.length ) {
		const pitches = t.notes.map( n => n.p ).sort( ( a, b ) => a - b );
		return pitches[ Math.floor( pitches.length / 2 ) ];
	}
	return Math.max( 24, t.view - 10 );
}

export function toast( text, ms = 2600 ) {
	app.toast = { "text": text.toUpperCase(), "until": performance.now() + ms };
}

export function pushUndo() {
	app.undoStack.push( JSON.stringify( app.song ) );
	if( app.undoStack.length > 100 ) {
		app.undoStack.shift();
	}
	app.redoStack = [];
}

// Call after changing app.song.
export function changed() {
	if( app.sel >= app.song.tracks.length ) {
		app.sel = Math.max( 0, app.song.tracks.length - 1 );
	}
	app.player.setSong( app.song );
	clearTimeout( saveTimer );
	saveTimer = setTimeout( () => saveLocal( app.song ), 400 );
}

// Runs fn as one undoable edit.
export function edit( fn ) {
	pushUndo();
	fn( app.song );
	changed();
}

export function undo() {
	if( !app.undoStack.length ) {
		toast( "NOTHING TO UNDO" );
		return;
	}
	app.redoStack.push( JSON.stringify( app.song ) );
	app.song = JSON.parse( app.undoStack.pop() );
	changed();
	toast( "UNDO", 900 );
}

export function redo() {
	if( !app.redoStack.length ) {
		toast( "NOTHING TO REDO" );
		return;
	}
	app.undoStack.push( JSON.stringify( app.song ) );
	app.song = JSON.parse( app.redoStack.pop() );
	changed();
	toast( "REDO", 900 );
}

export function loadSong( song, message ) {
	pushUndo();
	app.song = song;
	app.sel = 0;
	app.page = 0;
	app.overlay = null;
	changed();
	if( app.player.playing ) {
		app.player.play( 0 );
	}
	if( message ) {
		toast( message, 3500 );
	}
}

export function importCode( text ) {
	try {
		const { song, source } = codeToSong( text );
		const how = {
			"data": "LOADED " + song.title,
			"edited": "LOADED " + song.title + " WITH YOUR CODE EDITS",
			"play": "IMPORTED " + song.tracks.length + ( song.tracks.length === 1 ? " TRACK" : " TRACKS" ) + " FROM PLAY() CODE"
		}[ source ];
		loadSong( song, how + " - UNDO GOES BACK" );
		return true;
	} catch( err ) {
		toast( "COULD NOT READ THAT CODE: " + String( err.message || err ).slice( 0, 40 ), 4000 );
		return false;
	}
}

export function togglePlay() {
	if( app.player.recording ) {
		return;
	}
	if( app.player.playing ) {
		app.player.stop();
	} else {
		app.player.play( 0 );
	}
}
