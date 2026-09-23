/**
 * Sample fixtures and references for offline-render tests of decoded audio.
 *
 * Fixtures are 16-bit PCM WAV files generated here and loaded in the page through a blob:
 * URL. The content is a rising chirp, which is smooth enough for interpolation to stay exact
 * at rates other than 1 and never repeats, so a position error cannot hide behind a period.
 * References are built independently of plugins/sound/samples.js: the expected content
 * position is integrated per frame from the rate schedule, as the engine does.
 */

const SAMPLE_RATE = 48000;

/**
 * Chirp content as 16-bit samples, one array per channel
 *
 * @param {number} seconds - Length in seconds
 * @param {number} [channels=1] - Channel count; channel c is scaled by 1 - 0.25 c
 * @returns {Array<Int16Array>} Samples per channel
 */
function chirp( seconds, channels = 1 ) {
	const frames = Math.round( seconds * SAMPLE_RATE );
	const data = [];
	for( let c = 0; c < channels; c++ ) {
		const samples = new Int16Array( frames );
		for( let i = 0; i < frames; i++ ) {
			const t = i / SAMPLE_RATE;
			const phase = 2 * Math.PI * ( 60 * t + 40 * t * t );
			samples[ i ] = Math.round( 0.5 * ( 1 - 0.25 * c ) * Math.sin( phase ) * 32767 );
		}
		data.push( samples );
	}
	return data;
}

/**
 * Encode 16-bit channels as a base64 WAV file
 *
 * @param {Array<Int16Array>} data - Samples per channel
 * @returns {string} Base64 WAV bytes
 */
function wavBase64( data ) {
	const channels = data.length;
	const frames = data[ 0 ].length;
	const bytes = Buffer.alloc( 44 + frames * channels * 2 );
	bytes.write( "RIFF", 0 );
	bytes.writeUInt32LE( 36 + frames * channels * 2, 4 );
	bytes.write( "WAVEfmt ", 8 );
	bytes.writeUInt32LE( 16, 16 );
	bytes.writeUInt16LE( 1, 20 );
	bytes.writeUInt16LE( channels, 22 );
	bytes.writeUInt32LE( SAMPLE_RATE, 24 );
	bytes.writeUInt32LE( SAMPLE_RATE * channels * 2, 28 );
	bytes.writeUInt16LE( channels * 2, 32 );
	bytes.writeUInt16LE( 16, 34 );
	bytes.write( "data", 36 );
	bytes.writeUInt32LE( frames * channels * 2, 40 );
	for( let i = 0; i < frames; i++ ) {
		for( let c = 0; c < channels; c++ ) {
			bytes.writeInt16LE( data[ c ][ i ], 44 + ( i * channels + c ) * 2 );
		}
	}
	return bytes.toString( "base64" );
}

/**
 * Decoded float values of 16-bit samples, as the engines decode PCM
 *
 * @param {Int16Array} samples - 16-bit samples
 * @returns {Float32Array} Float samples
 */
function toFloat( samples ) {
	const data = new Float32Array( samples.length );
	for( let i = 0; i < samples.length; i++ ) {
		data[ i ] = samples[ i ] / 32768;
	}
	return data;
}

/**
 * Content a sample instance plays, frame by frame, before gain
 *
 * The position starts at `offset` seconds at the start frame and advances by the rate in
 * effect at each frame. Positions between samples interpolate linearly. Frames before the
 * start, and after `budget` seconds of content, are zero.
 *
 * @param {Float32Array} data - Decoded channel
 * @param {Object} spec - Playback spec
 * @param {number} spec.start - Start in seconds (on a frame)
 * @param {number} spec.offset - File position at the start, in seconds
 * @param {Array<Object>} spec.rates - [ { time, rate } ]; the first applies from the start
 * @param {boolean} [spec.loop] - Wrap at the file end
 * @param {number} [spec.budget] - Content seconds to play; Infinity when omitted
 * @param {number} spec.frames - Output length in frames
 * @returns {Float32Array} Content per output frame
 */
function playedContent( data, spec ) {
	const output = new Float32Array( spec.frames );
	const length = data.length;
	const startFrame = Math.round( spec.start * SAMPLE_RATE );
	const budget = ( spec.budget ?? Infinity ) * SAMPLE_RATE;
	let position = spec.offset * SAMPLE_RATE;
	let consumed = 0;
	let rateIndex = 0;
	for( let i = startFrame; i < spec.frames; i++ ) {
		const t = i / SAMPLE_RATE;
		while(
			rateIndex + 1 < spec.rates.length && spec.rates[ rateIndex + 1 ].time <= t + 1e-9
		) {
			rateIndex += 1;
		}
		if( consumed >= budget - 1e-6 ) {
			break;
		}
		let index = position;
		if( spec.loop ) {
			index = ( ( index % length ) + length ) % length;
		} else if( index >= length ) {
			break;
		}
		const base = Math.floor( index );
		const fraction = index - base;
		let next = base + 1;
		if( next >= length ) {
			if( spec.loop ) {
				next = 0;
			} else {
				next = base;
			}
		}
		output[ i ] = data[ base ] * ( 1 - fraction ) + data[ next ] * fraction;
		const rate = spec.rates[ rateIndex ].rate;
		position += rate;
		consumed += rate;
	}
	return output;
}

/**
 * Piecewise-linear gain through points [ time, value ]; the first value holds before, the
 * last after
 *
 * @param {Array<Array<number>>} points - Points in time order
 * @returns {Function} gain( t )
 */
function gainPoints( points ) {
	return t => {
		if( t <= points[ 0 ][ 0 ] ) {
			return points[ 0 ][ 1 ];
		}
		for( let i = 1; i < points.length; i++ ) {
			const [ t1, v1 ] = points[ i ];
			if( t <= t1 ) {
				const [ t0, v0 ] = points[ i - 1 ];
				if( t1 === t0 ) {
					return v1;
				}
				return v0 + ( v1 - v0 ) * ( t - t0 ) / ( t1 - t0 );
			}
		}
		return points[ points.length - 1 ][ 1 ];
	};
}

/**
 * Page-side loader: decodes a base64 WAV into a blob: URL, loads it, and waits for ready
 *
 * Page functions call it as `await __loadWav( base64, stream )` after installing it with
 * `eval( arg.loader )`.
 */
const PAGE_LOADER = `window.__loadWav = async ( base64, stream ) => {
	const bytes = Uint8Array.from( atob( base64 ), c => c.charCodeAt( 0 ) );
	const url = URL.createObjectURL( new Blob( [ bytes ], { "type": "audio/wav" } ) );
	const id = $.loadAudio( url, null, stream === true );
	await __audioHarness.settle( $.ready(), 5000 );
	return id;
};`;

export { PAGE_LOADER, SAMPLE_RATE, chirp, gainPoints, playedContent, toFloat, wavBase64 };
