// Graphs drawn with Pi.js: the envelope and pitch plot, oscilloscope, spectrum, and level meter

import { C } from "./theme.js";
import { box, text, textRight, hline } from "./gui.js";
import { isNoise, soundLength, formatValue } from "./params.js";

const PITCH_MIN = 40;
const PITCH_MAX = 8000;
const SPECTRUM_BARS = 64;
const SPECTRUM_MIN_HZ = 30;
const SPECTRUM_MAX_HZ = 20000;
const DB_FLOOR = -100;

// The analyser does not report its sample rate; 48 kHz is the common rate
const ASSUMED_SAMPLE_RATE = 48000;

// ADSR level at time t, the same shape synth() plays
function envelopeAt( t, duration, attack, decay, sustain, release ) {
	const gate = Math.min( t, duration );
	let level;
	if( gate < attack ) {
		level = gate / attack;
	} else if( gate < attack + decay ) {
		level = 1 - ( 1 - sustain ) * ( ( gate - attack ) / decay );
	} else {
		level = sustain;
	}
	if( t > duration ) {
		level *= release > 0 ? Math.max( 0, 1 - ( t - duration ) / release ) : 0;
	}
	return level;
}

function amplitudeAt( p, t ) {
	let level = envelopeAt( t, p.duration, p.attackTime, p.decayTime, p.sustainLevel, p.releaseTime );
	if( p.tremoloDepth > 0 ) {
		level *= 1 - p.tremoloDepth * ( 0.5 - 0.5 * Math.cos( 2 * Math.PI * p.tremoloRate * t ) );
	}
	return level * p.volume;
}

function pitchAt( p, t ) {
	let f = p.frequency;
	if( p.frequencyEnd !== null ) {
		f *= Math.pow( p.frequencyEnd / p.frequency, Math.min( t, p.duration ) / p.duration );
	}
	if( p.arpeggio ) {
		const step = Math.floor( t * p.arpeggioRate ) % p.arpeggio.length;
		f *= Math.pow( 2, p.arpeggio[ step ] / 12 );
	}
	if( p.vibratoDepth > 0 ) {
		f *= Math.pow( 2, p.vibratoDepth / 1200 * Math.sin( 2 * Math.PI * p.vibratoRate * t ) );
	}
	return f;
}

function cutoffAt( p, t ) {
	const env = envelopeAt(
		t, p.duration, p.filterAttackTime, p.filterDecayTime, p.filterSustainLevel,
		p.filterReleaseTime
	);
	return p.filterCutoff * Math.pow( 2, p.filterAmount * env );
}

function freqToY( f, y, h ) {
	const n = Math.log( Math.max( PITCH_MIN, Math.min( PITCH_MAX, f ) ) / PITCH_MIN ) /
		Math.log( PITCH_MAX / PITCH_MIN );
	return Math.round( y + h - 1 - n * ( h - 1 ) );
}

// Plots volume (filled), pitch (yellow), and filter cutoff (pink) over the sound's length.
// progress is the playhead position from 0 to 1, or a negative number for none.
export function drawEnvelope( x, y, w, h, p, progress ) {
	box( x, y, w, h, C.track, C.grid );
	const total = Math.max( 0.05, soundLength( p ) );
	const innerW = w - 2;
	const innerH = h - 2;
	const x0 = x + 1;
	const y0 = y + 1;

	// Grid: gate end and octave lines
	for( let f = 100; f <= PITCH_MAX; f *= 10 ) {
		hline( x0, x0 + innerW - 1, freqToY( f, y0, innerH ), C.grid );
	}
	const gateX = x0 + Math.round( p.duration / total * ( innerW - 1 ) );
	$.setColor( C.grid );
	$.line( gateX, y0, gateX, y0 + innerH - 1 );

	const noise = isNoise( p );
	let lastPitchY = null;
	let lastCutY = null;
	for( let i = 0; i < innerW; i++ ) {
		const t = i / ( innerW - 1 ) * total;
		const amp = amplitudeAt( p, t );
		const ampH = Math.round( amp * ( innerH - 1 ) );
		if( ampH > 0 ) {
			$.setColor( C.envFill );
			$.line( x0 + i, y0 + innerH - 1, x0 + i, y0 + innerH - ampH );
			$.setColor( C.env );
			$.pset( x0 + i, y0 + innerH - ampH );
		}
		if( p.filterType ) {
			const cy = freqToY( cutoffAt( p, t ), y0, innerH );
			$.setColor( C.cutoff );
			if( lastCutY === null ) {
				$.pset( x0 + i, cy );
			} else {
				$.line( x0 + i - 1, lastCutY, x0 + i, cy );
			}
			lastCutY = cy;
		}
		if( !noise ) {
			const py = freqToY( pitchAt( p, t ), y0, innerH );
			$.setColor( C.pitch );
			if( lastPitchY === null ) {
				$.pset( x0 + i, py );
			} else {
				$.line( x0 + i - 1, lastPitchY, x0 + i, py );
			}
			lastPitchY = py;
		}
	}

	if( progress >= 0 && progress <= 1 ) {
		const px = x0 + Math.round( progress * ( innerW - 1 ) );
		$.setColor( C.knob );
		$.line( px, y0, px, y0 + innerH - 1 );
	}

	text( "VOL", x + 4, y + 3, C.env );
	text( noise ? "NOISE" : "PITCH", x + 28, y + 3, noise ? C.dim : C.pitch );
	if( p.filterType ) {
		text( "CUTOFF", x + 64, y + 3, C.cutoff );
	}
	textRight( formatValue( "s", total ), x + w - 4, y + 3, C.dim );
}

// Draws the waveform, triggered on a rising zero crossing so periodic sounds stand still
export function drawScope( x, y, w, h, waveform ) {
	box( x, y, w, h, C.track, C.grid );
	const mid = y + Math.floor( h / 2 );
	hline( x + 1, x + w - 2, mid, C.grid );
	text( "SCOPE", x + 4, y + 3, C.dim );
	if( !waveform ) {
		return;
	}
	const span = 1024;
	let start = 0;
	for( let i = 1; i < waveform.length - span; i++ ) {
		if( waveform[ i - 1 ] <= 0 && waveform[ i ] > 0 ) {
			start = i;
			break;
		}
	}
	const innerW = w - 2;
	const half = ( h - 4 ) / 2;
	$.setColor( C.scope );
	let lastY = null;
	for( let i = 0; i < innerW; i++ ) {
		const sample = waveform[ start + Math.floor( i / innerW * span ) ];
		const sy = Math.round( mid - Math.max( -1, Math.min( 1, sample ) ) * half );
		if( lastY === null ) {
			$.pset( x + 1 + i, sy );
		} else {
			$.line( x + i, lastY, x + 1 + i, sy );
		}
		lastY = sy;
	}
}

// Log-frequency bars from the analyser's decibel bands
export function drawSpectrum( x, y, w, h, spectrum ) {
	box( x, y, w, h, C.track, C.grid );
	text( "SPECTRUM", x + 4, y + 3, C.dim );
	if( !spectrum ) {
		return;
	}
	const nyquist = ASSUMED_SAMPLE_RATE / 2;
	const binHz = nyquist / spectrum.length;
	const barW = ( w - 2 ) / SPECTRUM_BARS;
	const ratio = SPECTRUM_MAX_HZ / SPECTRUM_MIN_HZ;
	for( let b = 0; b < SPECTRUM_BARS; b++ ) {
		const f1 = SPECTRUM_MIN_HZ * Math.pow( ratio, b / SPECTRUM_BARS );
		const f2 = SPECTRUM_MIN_HZ * Math.pow( ratio, ( b + 1 ) / SPECTRUM_BARS );
		const i1 = Math.max( 0, Math.floor( f1 / binHz ) );
		const i2 = Math.min( spectrum.length - 1, Math.max( i1, Math.floor( f2 / binHz ) ) );
		let db = -Infinity;
		for( let i = i1; i <= i2; i++ ) {
			db = Math.max( db, spectrum[ i ] );
		}
		const n = Math.max( 0, Math.min( 1, ( db - DB_FLOOR ) / -DB_FLOOR ) );
		const barH = Math.round( n * ( h - 2 ) );
		if( barH > 0 ) {
			const bx = x + 1 + Math.floor( b * barW );
			const bw = Math.max( 1, Math.floor( ( b + 1 ) * barW ) - Math.floor( b * barW ) - 1 );
			const color = n > 0.85 ? C.meterHigh : n > 0.6 ? C.meterMid : C.fill;
			box( bx, y + h - 1 - barH, bw, barH, color );
		}
	}
}

// Horizontal peak meter with a held peak marker
export function drawMeter( x, y, w, h, peak, held ) {
	box( x, y, w, h, C.track, C.grid );
	const innerW = w - 2;
	const level = Math.min( 1, peak );
	const lw = Math.round( level * innerW );
	if( lw > 0 ) {
		const color = level > 0.9 ? C.meterHigh : level > 0.6 ? C.meterMid : C.meterLow;
		box( x + 1, y + 1, lw, h - 2, color );
	}
	const hx = x + 1 + Math.round( Math.min( 1, held ) * ( innerW - 1 ) );
	$.setColor( held >= 1 ? C.meterHigh : C.text );
	$.line( hx, y + 1, hx, y + h - 2 );
}
