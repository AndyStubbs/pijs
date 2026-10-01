// Exports: WAV recording through the sound-advanced recorder, and Pi.js code or JSON text

import { toSynthOptions, soundLength } from "./params.js";
import { buildChain, effectTail } from "./effects.js";
import { trimWav } from "./wav.js";

// Formats a value the way the Pi.js docs write options: quoted keys, tabs, spaced brackets
function formatJs( value, indent ) {
	if( Array.isArray( value ) ) {
		return value.length === 0 ? "[]" : "[ " + value.map( v => formatJs( v, indent ) ).join( ", " ) + " ]";
	}
	if( value !== null && typeof value === "object" ) {
		const keys = Object.keys( value );
		if( keys.length === 0 ) {
			return "{}";
		}
		const inner = indent + "\t";
		const lines = keys.map( k => inner + JSON.stringify( k ) + ": " + formatJs( value[ k ], inner ) );
		return "{\n" + lines.join( ",\n" ) + "\n" + indent + "}";
	}
	return JSON.stringify( value );
}

function effectsCode( effects ) {
	const chain = buildChain( effects );
	if( chain.length === 0 ) {
		return "";
	}
	return "// Bus effects used while designing this sound\n" +
		"$.setBusEffect( \"sfx\", " + formatJs( chain, "" ) + " );\n\n";
}

export function synthCode( params, effects ) {
	return effectsCode( effects ) + "$.synth( " + formatJs( toSynthOptions( params ), "" ) + " );\n";
}

export function presetCode( name, params, effects ) {
	const key = JSON.stringify( name );
	return effectsCode( effects ) +
		"$.definePreset( " + key + ", " + formatJs( toSynthOptions( params ), "" ) + " );\n" +
		"$.sfx( " + key + " );\n";
}

export function jsonText( params, effects ) {
	return JSON.stringify( {
		"synth": toSynthOptions( params ),
		"busEffects": buildChain( effects )
	}, null, "\t" ) + "\n";
}

export function fileName( name ) {
	return ( name || "sound" ).toLowerCase().replace( /[^a-z0-9_-]+/g, "-" ).replace( /^-+|-+$/g, "" ) ||
		"sound";
}

function wait( ms ) {
	return new Promise( resolve => setTimeout( resolve, ms ) );
}

// Records one playback of the sound on the sfx bus (after its effects) and downloads it.
// Resolves with the saved file's size in bytes, or 0 when the recording was silent.
export async function exportWav( params, effects, name, trim ) {
	const seconds = soundLength( params ) + effectTail( effects ) + 0.25;
	await $.startRecording( "sfx", Math.min( 600, Math.max( 1, Math.ceil( seconds + 0.5 ) ) ), 16 );
	let blob;
	try {
		$.synth( toSynthOptions( params ) );
		await wait( seconds * 1000 );
	} finally {
		blob = await $.stopRecording();
	}
	if( trim ) {
		blob = await trimWav( blob );
		if( blob === null ) {
			return 0;
		}
	}
	$.saveRecording( blob, fileName( name ) + ".wav" );
	return blob.size;
}
