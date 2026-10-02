// Engine sounds: compound sounds of noise and tone layers that burn up, burn, and burn down.
// generateSfx() makes single sounds, so the lab builds engines itself, from a seed. The seed
// also picks the style, so a seed always gives the same engine.

import { fromSynthOptions, roundSig } from "./params.js";
import { defaultEffects } from "./effects.js";

export const ENGINE_STYLES = [ "rocket", "jet", "retro", "hum" ];

// A small seeded random number generator (mulberry32)
function random( seed ) {
	let state = seed >>> 0;
	return () => {
		state = ( state + 0x6D2B79F5 ) >>> 0;
		let t = state;
		t = Math.imul( t ^ ( t >>> 15 ), t | 1 );
		t ^= t + Math.imul( t ^ ( t >>> 7 ), t | 61 );
		return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
	};
}

// Envelope times shared by the layers of an engine: volume and filter rise over `up` and fall
// over `down`. `close` is the share of `down` the filter takes to close, so a layer can lose
// its brightness before it fades.
function burn( up, down, close = 1 ) {
	return {
		"duration": roundSig( up + 1, 3 ),
		"attackTime": up,
		"releaseTime": down,
		"filterAttackTime": up,
		"filterReleaseTime": roundSig( down * close, 3 )
	};
}

// Bus effects for an engine: the defaults with some effects switched on
function effects( changes ) {
	const state = defaultEffects();
	for( const name of Object.keys( changes ) ) {
		Object.assign( state[ name ], changes[ name ], { "on": true } );
	}
	return state;
}

// Each style returns { layers, effects }. Layer 1 carries the burn times the lab's burn
// sliders show.
const BUILDERS = {

	// A thruster: a deep rumble that trails off, a roar that closes quickly, a sub tone, and
	// an ignition burst. A layer with no sustain plays once at the start, even when held. The
	// random tremolo on each layer, at its own rate, makes the burn uneven.
	"rocket": range => {
		const up = range( 0.35, 1 );
		const down = range( 0.9, 1.8 );
		return {
			"layers": [
				{
					...burn( up, roundSig( down * 1.3, 3 ), 0.6 ),
					"oType": "pink", "volume": range( 0.7, 0.85 ), "pan": -0.3,
					"filterType": "lowpass", "filterCutoff": range( 120, 220 ),
					"filterQ": range( 0.5, 0.9 ), "filterAmount": range( 2, 3 ),
					"tremoloDepth": range( 0.35, 0.5 ), "tremoloRate": range( 12, 20 ),
					"tremoloShape": "random"
				},
				{
					...burn( up, roundSig( down * 0.6, 3 ), 0.4 ),
					"oType": "white", "volume": range( 0.25, 0.4 ), "pan": 0.3,
					"filterType": "bandpass", "filterCutoff": range( 500, 900 ),
					"filterQ": range( 0.4, 0.8 ), "filterAmount": range( 1.5, 2.5 ),
					"tremoloDepth": range( 0.25, 0.4 ), "tremoloRate": range( 22, 36 ),
					"tremoloShape": "random"
				},
				{
					...burn( up, down ),
					"oType": "sine", "frequency": range( 38, 55 ), "volume": range( 0.35, 0.5 ),
					"tremoloDepth": range( 0.3, 0.45 ), "tremoloRate": range( 6, 10 ),
					"tremoloShape": "random"
				},
				{
					"oType": "white", "volume": range( 0.5, 0.7 ), "duration": 0.4,
					"attackTime": 0.005, "decayTime": range( 0.25, 0.45 ), "sustainLevel": 0,
					"filterType": "bandpass", "filterCutoff": range( 300, 500 ), "filterQ": 1,
					"filterAmount": 2.5, "filterDecayTime": 0.35, "filterSustainLevel": 0
				}
			],
			"effects": effects( {
				"distortion": { "drive": range( 0.35, 0.5 ), "tone": range( 2500, 4000 ), "mix": 0.6 },
				"reverb": { "time": range( 1.2, 2 ), "decay": 3, "mix": 0.2 }
			} )
		};
	},

	// A turbine: a high whine and its partner a fifth above, a hiss, and a soft rumble
	"jet": range => {
		const up = range( 0.8, 1.8 );
		const down = range( 1.2, 2.4 );
		const whine = range( 1800, 3200 );
		return {
			"layers": [
				{
					...burn( up, down ),
					"oType": "pink", "volume": range( 0.45, 0.6 ),
					"filterType": "lowpass", "filterCutoff": range( 200, 350 ),
					"filterQ": 0.7, "filterAmount": range( 1, 2 ),
					"tremoloDepth": range( 0.2, 0.3 ), "tremoloRate": range( 10, 16 ),
					"tremoloShape": "random"
				},
				{
					...burn( up, roundSig( down * 0.7, 3 ) ),
					"oType": "white", "volume": range( 0.18, 0.28 ),
					"filterType": "highpass", "filterCutoff": range( 1500, 3000 ),
					"filterQ": 0.5, "filterAmount": range( 0.5, 1.5 )
				},
				{
					...burn( roundSig( up * 1.3, 3 ), down ),
					"oType": "sine", "frequency": whine, "volume": range( 0.07, 0.12 ),
					"pan": -0.4, "vibratoDepth": range( 6, 14 ), "vibratoRate": range( 4, 7 )
				},
				{
					...burn( roundSig( up * 1.3, 3 ), down ),
					"oType": "triangle", "frequency": roundSig( whine * 1.5 + range( 3, 9 ), 4 ),
					"volume": range( 0.04, 0.07 ), "pan": 0.4
				}
			],
			"effects": effects( {
				"reverb": { "time": range( 1.2, 2 ), "decay": 3, "mix": 0.25 }
			} )
		};
	},

	// An arcade ship, after the thrust of early consoles: their noise was stepped at a low
	// rate, which is what the bitcrusher does to white noise when it holds each sample for
	// many frames. A plain triangle under it gives the body.
	"retro": range => {
		const up = range( 0.05, 0.2 );
		const down = range( 0.15, 0.4 );
		return {
			"layers": [
				{
					...burn( up, down ),
					"oType": "white", "volume": range( 0.5, 0.65 ),
					"filterType": "lowpass", "filterCutoff": range( 1500, 3000 ), "filterQ": 0.7
				},
				{
					...burn( up, down ),
					"oType": "triangle", "frequency": range( 50, 75 ), "volume": range( 0.35, 0.5 )
				}
			],
			"effects": effects( {
				"bitcrush": {
					"bits": Math.round( range( 4, 5 ) ), "rate": Math.round( range( 24, 48 ) ), "mix": 1
				}
			} )
		};
	},

	// A spaceship hum: two triangles that beat slowly, a buzz an octave up, and a little air.
	// The tones sit high enough, and have enough harmonics, to carry on small speakers. An
	// effect at a partial mix lowers the level, so the mixes are low and the distortion, which
	// raises it, is at full mix.
	"hum": range => {
		const up = range( 0.8, 2 );
		const down = range( 1.5, 3 );
		const tone = range( 70, 100 );
		return {
			"layers": [
				{
					...burn( up, down ),
					"oType": "triangle", "frequency": tone, "volume": range( 0.7, 0.8 ),
					"pan": -0.4
				},
				{
					...burn( up, down ),
					"oType": "triangle", "frequency": roundSig( tone + range( 1.5, 4 ), 4 ),
					"volume": range( 0.7, 0.8 ), "pan": 0.4
				},
				{
					...burn( up, down ),
					"oType": "sawtooth", "frequency": roundSig( tone * 2 + range( 0.4, 1.2 ), 4 ),
					"volume": range( 0.25, 0.35 ),
					"filterType": "lowpass", "filterCutoff": range( 400, 700 ),
					"filterQ": 1.5, "filterAmount": range( 0.5, 1.5 )
				},
				{
					...burn( up, down ),
					"oType": "pink", "volume": range( 0.2, 0.3 ),
					"filterType": "lowpass", "filterCutoff": range( 300, 500 ), "filterQ": 0.7
				}
			],
			"effects": effects( {
				"distortion": { "drive": range( 0.45, 0.55 ), "tone": 3000, "mix": 1 },
				"chorus": { "rate": range( 0.4, 1 ), "depth": range( 4, 6 ), "mix": 0.3 },
				"reverb": { "time": range( 2.5, 3.5 ), "decay": 3, "mix": 0.2 }
			} )
		};
	}
};

// Builds an engine from a seed: { style, layers, effects }. The style is the seed's remainder
// when divided by the number of styles.
export function generateEngine( seed ) {
	const next = random( seed );
	const range = ( min, max ) => roundSig( min + next() * ( max - min ), 3 );
	const style = ENGINE_STYLES[ seed % ENGINE_STYLES.length ];
	const engine = BUILDERS[ style ]( range );
	return { style, "layers": engine.layers.map( fromSynthOptions ), "effects": engine.effects };
}
