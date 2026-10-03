// Compound sounds for the second and third pages of generators. Like the engines, each is
// built by the lab from a seed: one to four layers, held or played once, with its own bus
// effects. A layer's delay makes it follow the others, as in a heartbeat or a footstep.

import { fromSynthOptions, roundSig } from "./params.js";
import { random, burn, effects } from "./engine.js";

// Each recipe returns { layers, hold, effects }; effects may be left out for none
const RECIPES = {

	// A beam weapon that fires for as long as it is held: a buzzing saw, a pulse an octave up
	// that beats against it, and a sizzle of noise
	"beam": range => {
		const tone = range( 180, 400 );
		const times = burn( 0.03, range( 0.12, 0.25 ) );
		return {
			"hold": true,
			"layers": [
				{
					...times,
					"oType": "sawtooth", "frequency": tone, "volume": range( 0.3, 0.4 ),
					"vibratoDepth": range( 20, 60 ), "vibratoRate": range( 18, 40 ),
					"filterType": "lowpass", "filterCutoff": range( 1500, 3000 ),
					"filterQ": range( 2, 6 ), "filterAmount": 1, "filterAttackTime": 0.15
				},
				{
					...times,
					"oType": "pulse", "duty": 0.25, "frequency": roundSig( tone * 2 + range( 3, 8 ), 4 ),
					"volume": range( 0.15, 0.22 ),
					"tremoloDepth": range( 0.3, 0.5 ), "tremoloRate": range( 25, 45 )
				},
				{
					...times,
					"oType": "white", "volume": range( 0.06, 0.1 ),
					"filterType": "highpass", "filterCutoff": range( 3000, 5000 ), "filterQ": 0.7,
					"tremoloDepth": 0.6, "tremoloRate": range( 30, 50 ), "tremoloShape": "random"
				}
			],
			"effects": effects( { "distortion": { "drive": range( 0.25, 0.4 ), "tone": 5000, "mix": 1 } } )
		};
	},

	// A siren that sounds until it is released: two tones that swap, or one that wails
	"alarm": ( range, next ) => {
		const tone = range( 600, 900 );
		const times = burn( 0.02, 0.15 );
		const isWail = next() < 0.5;
		const move = isWail ?
			{ "vibratoDepth": range( 400, 700 ), "vibratoRate": range( 0.5, 2 ) } :
			{ "arpeggio": [ 0, Math.round( range( 3, 7 ) ) ], "arpeggioRate": range( 2, 6 ) };
		return {
			"hold": true,
			"layers": [
				{
					...times, ...move,
					"oType": isWail ? "sawtooth" : "square", "frequency": tone,
					"volume": range( 0.3, 0.4 ),
					"filterType": "lowpass", "filterCutoff": range( 2500, 4000 ), "filterQ": 1
				},
				{
					...times, ...move,
					"oType": "triangle", "frequency": roundSig( tone / 2, 4 ),
					"volume": range( 0.25, 0.35 )
				}
			]
		};
	},

	// A flying saucer: a tone that warbles, a throb under it, and a shimmer on top
	"ufo": range => {
		const tone = range( 400, 900 );
		const times = burn( range( 0.1, 0.4 ), range( 0.3, 0.8 ) );
		return {
			"hold": true,
			"layers": [
				{
					...times,
					"oType": "sine", "frequency": tone, "volume": range( 0.35, 0.45 ),
					"vibratoDepth": range( 300, 700 ), "vibratoRate": range( 5, 9 )
				},
				{
					...times,
					"oType": "triangle", "frequency": roundSig( tone / 2, 4 ),
					"volume": range( 0.3, 0.4 ),
					"tremoloDepth": range( 0.5, 0.7 ), "tremoloRate": range( 8, 16 )
				},
				{
					...times,
					"oType": "sine", "frequency": roundSig( tone * 1.5, 4 ), "volume": range( 0.1, 0.18 ),
					"arpeggio": [ 0, 7, 12, 7 ], "arpeggioRate": range( 10, 18 )
				}
			],
			"effects": effects( {
				"chorus": { "rate": range( 0.5, 1.5 ), "depth": range( 3, 5 ), "mix": 0.3 },
				"reverb": { "time": range( 1.2, 2 ), "decay": 3, "mix": 0.2 }
			} )
		};
	},

	// A weapon or power charging up: a swelling sweep with a flutter, and its octave
	"charge": range => {
		const length = range( 1, 2 );
		const tone = range( 80, 160 );
		const rise = range( 6, 10 );
		const times = {
			"duration": length, "attackTime": roundSig( length * 0.9, 3 ), "releaseTime": 0.08
		};
		return {
			"hold": false,
			"layers": [
				{
					...times,
					"oType": "sawtooth", "frequency": tone, "frequencyEnd": roundSig( tone * rise, 4 ),
					"volume": range( 0.4, 0.5 ),
					"filterType": "lowpass", "filterCutoff": 400, "filterQ": range( 2, 5 ),
					"filterAmount": 4, "filterAttackTime": length,
					"tremoloDepth": range( 0.4, 0.6 ), "tremoloRate": range( 12, 25 )
				},
				{
					...times,
					"oType": "sine", "frequency": roundSig( tone * 2, 4 ),
					"frequencyEnd": roundSig( tone * 2 * rise, 4 ), "volume": range( 0.18, 0.25 ),
					"arpeggio": [ 0, 12 ], "arpeggioRate": range( 20, 30 )
				}
			]
		};
	},

	// A teleport: a rising shimmer, a falling whistle, and a whoosh of noise
	"warp": range => {
		const length = range( 0.6, 1.1 );
		const tone = range( 200, 400 );
		return {
			"hold": false,
			"layers": [
				{
					"duration": length, "attackTime": 0.05, "releaseTime": 0.3,
					"oType": "sine", "frequency": tone,
					"frequencyEnd": roundSig( tone * range( 8, 12 ), 4 ), "volume": range( 0.3, 0.4 ),
					"arpeggio": [ 0, 12, 24, 12 ], "arpeggioRate": range( 30, 50 )
				},
				{
					"duration": length, "attackTime": 0.05, "releaseTime": 0.2,
					"oType": "sawtooth", "frequency": range( 1200, 2000 ), "frequencyEnd": range( 200, 330 ),
					"volume": range( 0.15, 0.22 ),
					"filterType": "lowpass", "filterCutoff": 2500, "filterQ": range( 4, 8 )
				},
				{
					"duration": length, "attackTime": roundSig( length * 0.8, 3 ), "releaseTime": 0.25,
					"oType": "white", "volume": range( 0.18, 0.25 ),
					"filterType": "bandpass", "filterCutoff": range( 600, 1000 ), "filterQ": 4,
					"filterAmount": 3, "filterAttackTime": length
				}
			],
			"effects": effects( {
				"delay": { "time": range( 0.09, 0.15 ), "feedback": 0.5, "mix": 0.3 },
				"reverb": { "time": range( 1.2, 2 ), "decay": 3, "mix": 0.2 }
			} )
		};
	},

	// Wind that blows until it is released: two whistling bands that gust at their own pace,
	// over a low rush. A narrow band of noise is quiet, so the bands play near full volume.
	"wind": range => {
		const up = range( 0.8, 1.5 );
		const down = range( 1.5, 2.5 );
		const gust = ( min, max ) => ( {
			"tremoloDepth": range( 0.5, 0.7 ), "tremoloRate": range( min, max ),
			"tremoloShape": "random"
		} );
		return {
			"hold": true,
			"layers": [
				{
					...burn( up, down ), ...gust( 1.5, 4 ),
					"oType": "white", "volume": range( 0.9, 1 ), "pan": -0.3,
					"filterType": "bandpass", "filterCutoff": range( 400, 900 ), "filterQ": range( 2, 5 )
				},
				{
					...burn( up, down ), ...gust( 2, 5 ),
					"oType": "white", "volume": range( 0.7, 0.85 ), "pan": 0.3,
					"filterType": "bandpass", "filterCutoff": range( 900, 1800 ),
					"filterQ": range( 3, 6 )
				},
				{
					...burn( up, down ), ...gust( 0.8, 2 ),
					"oType": "pink", "volume": range( 0.55, 0.7 ),
					"filterType": "lowpass", "filterCutoff": range( 250, 400 ), "filterQ": 0.7
				}
			],
			"effects": effects( { "reverb": { "time": range( 1.5, 2.5 ), "decay": 3, "mix": 0.2 } } )
		};
	},

	// A fire that burns until it is released: a flickering roar, a crackle, and a low body
	"fire": range => {
		const up = range( 0.3, 0.6 );
		const down = range( 0.6, 1 );
		return {
			"hold": true,
			"layers": [
				{
					...burn( up, down ),
					"oType": "pink", "volume": range( 0.45, 0.55 ),
					"filterType": "lowpass", "filterCutoff": range( 500, 900 ), "filterQ": 0.7,
					"tremoloDepth": range( 0.4, 0.6 ), "tremoloRate": range( 8, 14 ),
					"tremoloShape": "random"
				},
				{
					...burn( up, down ),
					"oType": "white", "volume": range( 0.25, 0.4 ),
					"filterType": "highpass", "filterCutoff": range( 2500, 4500 ), "filterQ": 0.7,
					"tremoloDepth": 1, "tremoloRate": range( 30, 60 ), "tremoloShape": "random"
				},
				{
					...burn( up, down ),
					"oType": "pink", "volume": range( 0.45, 0.55 ),
					"filterType": "lowpass", "filterCutoff": range( 120, 200 ), "filterQ": 0.7,
					"tremoloDepth": range( 0.3, 0.5 ), "tremoloRate": range( 3, 6 ),
					"tremoloShape": "random"
				}
			]
		};
	},

	// Thunder: a crack, then a rumble that rolls and darkens as it dies away, over a sub tone
	"thunder": range => {
		const roll = range( 1, 2 );
		const tail = range( 1.5, 2.5 );
		return {
			"hold": false,
			"layers": [
				{
					"duration": roundSig( roll + 0.3, 3 ), "attackTime": 0.01, "decayTime": roll,
					"sustainLevel": 0.15, "releaseTime": tail,
					"oType": "pink", "volume": range( 0.8, 0.9 ),
					"filterType": "lowpass", "filterCutoff": range( 900, 1400 ), "filterQ": 0.7,
					"filterAmount": -3, "filterAttackTime": roundSig( roll + 0.3, 3 ),
					"filterReleaseTime": tail,
					"tremoloDepth": range( 0.5, 0.7 ), "tremoloRate": range( 6, 12 ),
					"tremoloShape": "random"
				},
				{
					"duration": 0.3, "attackTime": 0.002, "decayTime": range( 0.12, 0.25 ),
					"sustainLevel": 0, "releaseTime": 0.1,
					"oType": "white", "volume": range( 0.5, 0.65 ),
					"filterType": "bandpass", "filterCutoff": range( 1200, 2000 ), "filterQ": 0.6
				},
				{
					"duration": roll, "attackTime": 0.02, "decayTime": roll, "sustainLevel": 0,
					"releaseTime": 0.3,
					"oType": "sine", "frequency": range( 40, 55 ), "volume": range( 0.45, 0.55 ),
					"tremoloDepth": range( 0.4, 0.6 ), "tremoloRate": range( 5, 9 ),
					"tremoloShape": "random"
				}
			],
			"effects": effects( {
				"distortion": { "drive": range( 0.25, 0.35 ), "tone": 3000, "mix": 1 },
				"reverb": { "time": range( 3, 4 ), "decay": 3, "mix": 0.3 }
			} )
		};
	},

	// One beat of a heart: a thump and its body, then a second, softer pair after a delay.
	// A heartbeat is mostly below what small speakers play, so the thumps are triangles,
	// whose harmonics carry, and distortion adds more.
	"heartbeat": range => {
		const gap = range( 0.22, 0.3 );
		const thump = ( frequency, volume, delay ) => ( {
			"duration": 0.15, "attackTime": 0.005, "decayTime": range( 0.11, 0.15 ),
			"sustainLevel": 0, "releaseTime": 0.05, "delay": delay,
			"oType": "triangle", "frequency": frequency,
			"frequencyEnd": roundSig( frequency * 0.55, 3 ), "volume": volume,
			"filterType": "lowpass", "filterCutoff": range( 450, 650 ), "filterQ": 1
		} );
		const body = ( volume, delay ) => ( {
			"duration": 0.1, "attackTime": 0.004, "decayTime": 0.09, "sustainLevel": 0,
			"releaseTime": 0.05, "delay": delay,
			"oType": "pink", "volume": volume,
			"filterType": "lowpass", "filterCutoff": range( 220, 320 ), "filterQ": 1
		} );
		return {
			"hold": false,
			"layers": [
				thump( range( 70, 90 ), range( 0.9, 1 ), 0 ),
				body( range( 0.7, 0.8 ), 0 ),
				thump( range( 80, 100 ), range( 0.7, 0.8 ), gap ),
				body( range( 0.5, 0.6 ), gap )
			],
			"effects": effects( {
				"distortion": { "drive": range( 0.45, 0.6 ), "tone": 1500, "mix": 1 }
			} )
		};
	},

	// A footstep: the heel lands, then the toe and a scuff follow after a delay
	"footstep": range => {
		const toe = range( 0.08, 0.14 );
		const hit = decay => ( {
			"duration": 0.1, "attackTime": 0.002, "decayTime": decay, "sustainLevel": 0,
			"releaseTime": 0.03
		} );
		return {
			"hold": false,
			"layers": [
				{
					...hit( range( 0.05, 0.09 ) ),
					"oType": "pink", "volume": range( 0.8, 0.9 ),
					"filterType": "lowpass", "filterCutoff": range( 300, 600 ), "filterQ": 1
				},
				{
					...hit( range( 0.03, 0.06 ) ), "delay": toe,
					"oType": "white", "volume": range( 0.4, 0.5 ),
					"filterType": "bandpass", "filterCutoff": range( 800, 1600 ), "filterQ": 1
				},
				{
					...hit( 0.08 ), "delay": toe,
					"oType": "white", "volume": range( 0.1, 0.16 ),
					"filterType": "highpass", "filterCutoff": 2500, "filterQ": 0.7
				}
			]
		};
	},

	// A robot voice: a pulse that jumps through a run of notes, through a narrow filter, with
	// a thinner pulse an octave down
	"robot": ( range, next ) => {
		const tone = range( 200, 500 );
		const notes = [];
		for( let i = 0; i < 8; i++ ) {
			notes.push( Math.floor( next() * 15 ) );
		}
		const times = { "duration": range( 0.5, 0.9 ), "attackTime": 0.01, "releaseTime": 0.05 };
		const speech = { "arpeggio": notes, "arpeggioRate": range( 10, 18 ) };
		return {
			"hold": false,
			"layers": [
				{
					...times, ...speech,
					"oType": "square", "frequency": tone, "volume": range( 0.45, 0.55 ),
					"vibratoDepth": range( 20, 40 ), "vibratoRate": range( 25, 40 ),
					"filterType": "bandpass", "filterCutoff": range( 900, 1600 ),
					"filterQ": range( 2, 4 )
				},
				{
					...times, ...speech,
					"oType": "pulse", "duty": 0.125, "frequency": roundSig( tone / 2, 4 ),
					"volume": range( 0.18, 0.25 )
				}
			],
			"effects": effects( {
				"bitcrush": { "bits": 6, "rate": Math.round( range( 3, 6 ) ), "mix": 0.7 }
			} )
		};
	},

	// Bubbles: four short rising blips, each starting a little after the one before
	"bubbles": range => {
		const layers = [];
		let delay = 0;
		for( let i = 0; i < 4; i++ ) {
			const tone = range( 300, 700 );
			layers.push( {
				"duration": range( 0.06, 0.1 ), "attackTime": 0.005, "releaseTime": 0.03,
				"delay": roundSig( delay, 3 ),
				"oType": "sine", "frequency": tone,
				"frequencyEnd": roundSig( tone * range( 1.8, 2.5 ), 4 ), "volume": range( 0.5, 0.6 )
			} );
			delay += range( 0.09, 0.16 );
		}
		return { "hold": false, "layers": layers };
	},

	// A motor that whirs until it is released: a buzzing saw, a fluttering pulse, and a hiss
	"servo": range => {
		const tone = range( 120, 260 );
		const times = burn( range( 0.08, 0.2 ), range( 0.1, 0.25 ) );
		return {
			"hold": true,
			"layers": [
				{
					...times,
					"oType": "sawtooth", "frequency": tone, "volume": range( 0.3, 0.4 ),
					"vibratoDepth": range( 10, 20 ), "vibratoRate": range( 30, 60 ),
					"filterType": "lowpass", "filterCutoff": range( 900, 1500 ),
					"filterQ": range( 3, 5 ), "filterAmount": 1.5
				},
				{
					...times,
					"oType": "pulse", "duty": 0.25, "frequency": roundSig( tone * 1.5 + range( 2, 6 ), 4 ),
					"volume": range( 0.15, 0.22 ),
					"tremoloDepth": range( 0.3, 0.5 ), "tremoloRate": range( 40, 70 )
				},
				{
					...times,
					"oType": "white", "volume": range( 0.2, 0.3 ),
					"filterType": "bandpass", "filterCutoff": range( 2000, 3000 ), "filterQ": 3
				}
			]
		};
	},

	// An airlock: a whoosh that opens up and a hiss of air, then a thunk when it seals
	"airlock": range => {
		const slide = range( 0.35, 0.6 );
		const thunk = {
			"duration": 0.15, "attackTime": 0.003, "sustainLevel": 0, "releaseTime": 0.05,
			"delay": slide
		};
		return {
			"hold": false,
			"layers": [
				{
					"duration": slide, "attackTime": roundSig( slide * 0.6, 3 ), "releaseTime": 0.1,
					"oType": "white", "volume": range( 0.6, 0.75 ),
					"filterType": "bandpass", "filterCutoff": range( 350, 500 ), "filterQ": 3,
					"filterAmount": 3, "filterAttackTime": slide
				},
				{
					"duration": 0.3, "attackTime": 0.01, "decayTime": range( 0.2, 0.3 ),
					"sustainLevel": 0, "releaseTime": 0.05,
					"oType": "white", "volume": range( 0.2, 0.3 ),
					"filterType": "highpass", "filterCutoff": range( 3500, 5000 ), "filterQ": 0.7
				},
				{
					...thunk, "decayTime": 0.12,
					"oType": "sine", "frequency": range( 60, 80 ), "frequencyEnd": 40,
					"volume": range( 0.75, 0.85 )
				},
				{
					...thunk, "decayTime": 0.08,
					"oType": "pink", "volume": range( 0.5, 0.6 ),
					"filterType": "lowpass", "filterCutoff": range( 250, 400 ), "filterQ": 1
				}
			]
		};
	},

	// A level-up jingle: a quick run up a major chord on a pulse, then the octave held with a
	// little vibrato, all doubled an octave down on a triangle
	"levelup": range => {
		const tone = range( 440, 660 );
		const rate = range( 14, 18 );
		const run = roundSig( 3 / rate - 0.005, 3 );
		const steps = { "arpeggio": [ 0, 4, 7 ], "arpeggioRate": rate };
		const top = {
			"delay": run, "duration": range( 0.3, 0.4 ), "attackTime": 0.005, "decayTime": 0.1,
			"sustainLevel": 0.7, "releaseTime": 0.25
		};
		return {
			"hold": false,
			"layers": [
				{
					...steps, "duration": run, "attackTime": 0.003, "releaseTime": 0.02,
					"oType": "pulse", "duty": 0.25, "frequency": tone, "volume": range( 0.35, 0.45 )
				},
				{
					...top, "vibratoDepth": 12, "vibratoRate": 6,
					"oType": "pulse", "duty": 0.25, "frequency": roundSig( tone * 2, 4 ),
					"volume": range( 0.35, 0.45 )
				},
				{
					...steps, "duration": run, "attackTime": 0.003, "releaseTime": 0.02,
					"oType": "triangle", "frequency": roundSig( tone / 2, 4 ),
					"volume": range( 0.4, 0.5 )
				},
				{
					...top,
					"oType": "triangle", "frequency": tone, "volume": range( 0.4, 0.5 )
				}
			]
		};
	},

	// A chime: a sine with two quieter partials at a bell's uneven ratios, each fading at its
	// own pace, and a copy a hair out of tune that shimmers against it
	"chime": range => {
		const tone = range( 700, 1100 );
		const ring = ( ratio, volume, decay, pan ) => ( {
			"duration": decay, "attackTime": 0.002, "decayTime": decay, "sustainLevel": 0,
			"releaseTime": 0.3, "pan": pan,
			"oType": "sine", "frequency": roundSig( tone * ratio, 4 ), "volume": volume
		} );
		return {
			"hold": false,
			"layers": [
				ring( 1, range( 0.45, 0.55 ), range( 1.2, 1.6 ), -0.2 ),
				ring( 1.003, range( 0.25, 0.35 ), range( 1.4, 1.8 ), 0.2 ),
				ring( 2.76, range( 0.18, 0.25 ), range( 0.6, 0.8 ), 0 ),
				ring( 5.4, range( 0.08, 0.12 ), range( 0.25, 0.4 ), 0 )
			],
			"effects": effects( { "reverb": { "time": range( 1.5, 2.5 ), "decay": 3, "mix": 0.25 } } )
		};
	},

	// A countdown: three short beeps a beat apart, then a higher, longer one for go
	"countdown": range => {
		const tone = range( 660, 880 );
		const beat = range( 0.5, 0.7 );
		const beep = ( delay, frequency, duration, volume ) => ( {
			"delay": roundSig( delay, 3 ), "duration": duration, "attackTime": 0.003,
			"releaseTime": 0.05,
			"oType": "square", "frequency": roundSig( frequency, 4 ), "volume": volume,
			"filterType": "lowpass", "filterCutoff": 3000, "filterQ": 0.7
		} );
		return {
			"hold": false,
			"layers": [
				beep( 0, tone, 0.12, 0.35 ),
				beep( beat, tone, 0.12, 0.35 ),
				beep( beat * 2, tone, 0.12, 0.35 ),
				{ ...beep( beat * 3, tone * 2, 0.45, 0.4 ), "releaseTime": 0.2 }
			]
		};
	}
};

export const RECIPE_NAMES = Object.keys( RECIPES );

// The recipes in pages of buttons. The first page leaves a place for the engine.
export const RECIPE_PAGES = [ RECIPE_NAMES.slice( 0, 8 ), RECIPE_NAMES.slice( 8 ) ];

// Builds a compound sound from a seed: { layers, hold, effects }, where effects is null for
// none
export function generateRecipe( name, seed ) {
	const next = random( seed );
	const range = ( min, max ) => roundSig( min + next() * ( max - min ), 3 );
	const sound = RECIPES[ name ]( range, next );
	return {
		"layers": sound.layers.map( fromSynthOptions ),
		"hold": sound.hold,
		"effects": sound.effects || null
	};
}
