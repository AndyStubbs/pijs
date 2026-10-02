// Exports: WAV recording through the sound-advanced recorder, and Pi.js code or JSON text

import { toSynthOptions, toOneShotOptions, soundLength } from "./params.js";
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

// Code that plays every call at once. A held sound keeps its sound IDs and shows how to
// release them.
function playCode( calls, hold ) {
	if( !hold ) {
		return calls.map( call => call + ";\n" ).join( "" );
	}
	return "// Start the sound. It plays until it is released\n" +
		"const sound = [\n" + calls.map( call => "\t" + call ).join( ",\n" ) + "\n];\n\n" +
		"// Later, release it, for example when the key comes up\n" +
		"sound.forEach( id => $.releaseSound( id ) );\n";
}

export function synthCode( layers, hold, effects ) {
	const indent = hold ? "\t" : "";
	const calls = layers.map(
		params => "$.synth( " + formatJs( toSynthOptions( params, hold ), indent ) + " )"
	);
	return effectsCode( effects ) + playCode( calls, hold );
}

// One preset per layer: a preset holds one set of synth() options
export function presetCode( name, layers, hold, effects ) {
	const keys = layers.map(
		( params, i ) => JSON.stringify( layers.length > 1 ? name + "-" + ( i + 1 ) : name )
	);
	const defines = layers.map( ( params, i ) => {
		return "$.definePreset( " + keys[ i ] + ", " + formatJs( toSynthOptions( params, hold ), "" ) +
			" );\n";
	} );
	return effectsCode( effects ) + defines.join( "" ) + "\n" +
		playCode( keys.map( key => "$.sfx( " + key + " )" ), hold );
}

export function jsonText( layers, hold, effects ) {
	const options = layers.map( params => toSynthOptions( params, hold ) );
	const data = options.length === 1 ? { "synth": options[ 0 ] } : { "layers": options };
	data.busEffects = buildChain( effects );
	return JSON.stringify( data, null, "\t" ) + "\n";
}

export function fileName( name ) {
	return ( name || "sound" ).toLowerCase().replace( /[^a-z0-9_-]+/g, "-" ).replace( /^-+|-+$/g, "" ) ||
		"sound";
}

function wait( ms ) {
	return new Promise( resolve => setTimeout( resolve, ms ) );
}

// Records one playback of the sound's layers on the sfx bus (after its effects) and downloads
// it. Each layer plays for its own length, so a held sound is recorded as one full burn.
// Resolves with the saved file's size in bytes, or 0 when the recording was silent.
export async function exportWav( layers, hold, effects, name, trim ) {
	const seconds = Math.max( ...layers.map( soundLength ) ) + effectTail( effects ) + 0.25;
	await $.startRecording( "sfx", Math.min( 600, Math.max( 1, Math.ceil( seconds + 0.5 ) ) ), 16 );
	let blob;
	try {
		for( const params of layers ) {
			$.synth( toOneShotOptions( params, hold ) );
		}
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
