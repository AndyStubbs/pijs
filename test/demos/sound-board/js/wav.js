// WAV parsing, silence trimming, and encoding for the files stopRecording() returns
// (16-bit PCM or 32-bit float, any channel count).

const THRESHOLD = 0.0005;
const PAD_START = 0.002;
const PAD_END = 0.01;

function readString( view, offset, length ) {
	let s = "";
	for( let i = 0; i < length; i++ ) {
		s += String.fromCharCode( view.getUint8( offset + i ) );
	}
	return s;
}

function writeString( view, offset, s ) {
	for( let i = 0; i < s.length; i++ ) {
		view.setUint8( offset + i, s.charCodeAt( i ) );
	}
}

export function parseWav( buffer ) {
	const view = new DataView( buffer );
	if( readString( view, 0, 4 ) !== "RIFF" || readString( view, 8, 4 ) !== "WAVE" ) {
		throw new Error( "Not a WAV file" );
	}
	let format = null;
	let data = null;
	let offset = 12;
	while( offset + 8 <= view.byteLength ) {
		const id = readString( view, offset, 4 );
		const size = view.getUint32( offset + 4, true );
		const body = offset + 8;
		if( id === "fmt " ) {
			format = {
				"audioFormat": view.getUint16( body, true ),
				"channels": view.getUint16( body + 2, true ),
				"sampleRate": view.getUint32( body + 4, true ),
				"bitsPerSample": view.getUint16( body + 14, true )
			};
		} else if( id === "data" ) {
			data = { "offset": body, "size": Math.min( size, view.byteLength - body ) };
		}
		offset = body + size + ( size % 2 );
	}
	if( !format || !data ) {
		throw new Error( "WAV file is missing its fmt or data chunk" );
	}
	return { format, data, view };
}

// Removes silence from the start and end, keeping a few milliseconds of padding
export async function trimWav( blob ) {
	const buffer = await blob.arrayBuffer();
	const { format, data, view } = parseWav( buffer );
	const bytes = format.bitsPerSample / 8;
	const frameBytes = bytes * format.channels;
	const frames = Math.floor( data.size / frameBytes );
	const isFloat = format.audioFormat === 3;
	if( !isFloat && format.bitsPerSample !== 16 ) {
		return blob;
	}

	function isLoud( frame ) {
		const base = data.offset + frame * frameBytes;
		for( let c = 0; c < format.channels; c++ ) {
			const sample = isFloat ?
				view.getFloat32( base + c * bytes, true ) :
				view.getInt16( base + c * bytes, true ) / 32768;
			if( Math.abs( sample ) > THRESHOLD ) {
				return true;
			}
		}
		return false;
	}

	let first = 0;
	while( first < frames && !isLoud( first ) ) {
		first++;
	}
	if( first === frames ) {
		return null;
	}
	let last = frames - 1;
	while( last > first && !isLoud( last ) ) {
		last--;
	}
	first = Math.max( 0, first - Math.round( PAD_START * format.sampleRate ) );
	last = Math.min( frames - 1, last + Math.round( PAD_END * format.sampleRate ) );

	const pcm = new Uint8Array( buffer, data.offset + first * frameBytes, ( last - first + 1 ) * frameBytes );
	return encodeWav( format, pcm );
}

export function encodeWav( format, pcm ) {
	const header = new ArrayBuffer( 44 );
	const view = new DataView( header );
	const blockAlign = format.channels * format.bitsPerSample / 8;
	writeString( view, 0, "RIFF" );
	view.setUint32( 4, 36 + pcm.byteLength, true );
	writeString( view, 8, "WAVE" );
	writeString( view, 12, "fmt " );
	view.setUint32( 16, 16, true );
	view.setUint16( 20, format.audioFormat, true );
	view.setUint16( 22, format.channels, true );
	view.setUint32( 24, format.sampleRate, true );
	view.setUint32( 28, format.sampleRate * blockAlign, true );
	view.setUint16( 32, blockAlign, true );
	view.setUint16( 34, format.bitsPerSample, true );
	writeString( view, 36, "data" );
	view.setUint32( 40, pcm.byteLength, true );
	return new Blob( [ header, pcm ], { "type": "audio/wav" } );
}
