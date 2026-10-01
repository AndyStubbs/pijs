// Autosave in localStorage, plus downloads, file picking and the clipboard.

import { normalizeSong } from "./song.js";

const KEY = "pixeltracks.song.v1";

export function saveLocal( song ) {
	try {
		localStorage.setItem( KEY, JSON.stringify( song ) );
	} catch( e ) {
		// Storage can be full or blocked; autosave is only a convenience
	}
}

export function loadLocal() {
	try {
		const text = localStorage.getItem( KEY );
		return text ? normalizeSong( JSON.parse( text ) ) : null;
	} catch( e ) {
		return null;
	}
}

export function fileName( title, ext ) {
	const base = title.toLowerCase().replace( /[^a-z0-9]+/g, "-" ).replace( /^-|-$/g, "" ) || "song";
	return base + ext;
}

export function downloadText( name, text, type = "text/javascript" ) {
	const url = URL.createObjectURL( new Blob( [ text ], { type } ) );
	const a = document.createElement( "a" );
	a.href = url;
	a.download = name;
	document.body.appendChild( a );
	a.click();
	a.remove();
	setTimeout( () => URL.revokeObjectURL( url ), 1000 );
}

// Opens the browser's file picker and resolves with the chosen file's text.
export function pickTextFile() {
	return new Promise( ( resolve, reject ) => {
		const input = document.createElement( "input" );
		input.type = "file";
		input.accept = ".js,.txt,.json,.bas,text/*";
		input.style.display = "none";
		input.addEventListener( "change", () => {
			const file = input.files && input.files[ 0 ];
			input.remove();
			if( !file ) {
				reject( new Error( "NO FILE" ) );
				return;
			}
			file.text().then( resolve, reject );
		} );
		document.body.appendChild( input );
		input.click();
	} );
}

export async function copyText( text ) {
	await navigator.clipboard.writeText( text );
}

export async function readClipboard() {
	return navigator.clipboard.readText();
}
