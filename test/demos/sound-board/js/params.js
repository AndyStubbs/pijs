// Parameter schema for synth() options: ranges, slider curves, defaults, and conversion helpers.
// Ranges are kept within the limits in build/plugins/sound-advanced/sound-advanced.d.ts.

export const CATEGORIES = [
	"coin", "laser", "jump", "hit", "explosion", "powerup", "blip", "select", "random"
];

// "periodic" is the plugin's looping noise; its frequency sets how fast the pattern steps
export const WAVES = [
	"sine", "triangle", "square", "sawtooth", "pulse", "white", "pink", "periodic"
];
export const NOISE_WAVES = [ "white", "pink" ];

// How vibrato and tremolo move: a steady wave, or a random wobble
export const LFO_SHAPES = [ "sine", "random" ];

// null means the filter is off
export const FILTER_TYPES = [ null, "lowpass", "highpass", "bandpass", "notch" ];

// null means the arpeggio is off
export const ARP_PATTERNS = [
	null,
	[ 0, 12 ], [ 0, 7 ], [ 0, 5 ], [ 0, 4 ], [ 0, 3 ],
	[ 0, 4, 7 ], [ 0, 3, 7 ], [ 0, 7, 12 ], [ 0, 4, 7, 12 ], [ 0, 5, 7, 12 ],
	[ 0, 12, 24 ], [ 12, 7, 4, 0 ], [ 0, -12 ], [ 0, 1 ]
];

// Defaults that synth() uses when an option is left out
export const SYNTH_DEFAULTS = {
	"frequency": 440,
	"duration": 1,
	"volume": 1,
	"oType": "triangle",
	"attackTime": 0,
	"decayTime": 0,
	"sustainLevel": 1,
	"releaseTime": 0.1,
	"pan": 0,
	"frequencyEnd": null,
	"filterType": null,
	"filterCutoff": 1000,
	"filterQ": 1,
	"filterAttackTime": 0,
	"filterDecayTime": 0,
	"filterSustainLevel": 1,
	"filterReleaseTime": 0.1,
	"filterAmount": 0,
	"vibratoRate": 5,
	"vibratoDepth": 0,
	"vibratoShape": "sine",
	"tremoloRate": 5,
	"tremoloDepth": 0,
	"tremoloShape": "sine",
	"duty": 0.5,
	"arpeggio": null,
	"arpeggioRate": 12
};

// Slider curves: "lin" is linear, "exp" is logarithmic (min must be above 0), "sq" gives more
// resolution near min.
export const SPECS = {
	"duty": { "label": "DUTY", "min": 0.02, "max": 0.98, "def": 0.5, "fmt": "pct" },
	"volume": { "label": "VOLUME", "min": 0, "max": 1, "def": 0.5, "fmt": "pct" },
	"pan": { "label": "PAN", "min": -1, "max": 1, "def": 0, "fmt": "pan" },
	"frequency": { "label": "FREQ", "min": 20, "max": 5000, "curve": "exp", "def": 440, "fmt": "hz" },
	"frequencyEnd": { "label": "END", "min": 20, "max": 5000, "curve": "exp", "def": 880, "fmt": "hz" },
	"duration": { "label": "LENGTH", "min": 0.01, "max": 2, "curve": "exp", "def": 0.3, "fmt": "s" },
	"attackTime": { "label": "ATTACK", "min": 0, "max": 1, "curve": "sq", "def": 0, "fmt": "s" },
	"decayTime": { "label": "DECAY", "min": 0, "max": 1, "curve": "sq", "def": 0, "fmt": "s" },
	"sustainLevel": { "label": "SUSTAIN", "min": 0, "max": 1, "def": 1, "fmt": "pct" },
	"releaseTime": { "label": "RELEASE", "min": 0, "max": 2, "curve": "sq", "def": 0.1, "fmt": "s" },
	"arpeggioRate": { "label": "SPEED", "min": 1, "max": 60, "curve": "exp", "def": 12, "fmt": "rate" },
	"filterCutoff": { "label": "CUTOFF", "min": 20, "max": 20000, "curve": "exp", "def": 1000, "fmt": "hz" },
	"filterQ": { "label": "RESO", "min": 0, "max": 30, "curve": "sq", "def": 1, "fmt": "num" },
	"filterAmount": { "label": "ENV AMT", "min": -8, "max": 8, "def": 0, "fmt": "oct" },
	"filterAttackTime": { "label": "F.ATTACK", "min": 0, "max": 1, "curve": "sq", "def": 0, "fmt": "s" },
	"filterDecayTime": { "label": "F.DECAY", "min": 0, "max": 2, "curve": "sq", "def": 0, "fmt": "s" },
	"filterSustainLevel": { "label": "F.SUSTAIN", "min": 0, "max": 1, "def": 1, "fmt": "pct" },
	"filterReleaseTime": { "label": "F.RELEASE", "min": 0, "max": 2, "curve": "sq", "def": 0.1, "fmt": "s" },
	"vibratoDepth": { "label": "DEPTH", "min": 0, "max": 1200, "curve": "sq", "def": 0, "fmt": "cents" },
	"vibratoRate": { "label": "RATE", "min": 0.1, "max": 40, "curve": "exp", "def": 5, "fmt": "rate" },
	"tremoloDepth": { "label": "DEPTH", "min": 0, "max": 1, "def": 0, "fmt": "pct" },
	"tremoloRate": { "label": "RATE", "min": 0.1, "max": 40, "curve": "exp", "def": 5, "fmt": "rate" }
};

// Hard limits synth() enforces, used when sanitizing values from outside the sliders
const LIMITS = {
	"frequency": [ 1, 24000 ],
	"frequencyEnd": [ 1, 24000 ],
	"duration": [ 0.001, 30 ],
	"volume": [ 0, 1 ],
	"attackTime": [ 0, 30 ],
	"decayTime": [ 0, 30 ],
	"sustainLevel": [ 0, 1 ],
	"releaseTime": [ 0, 30 ],
	"pan": [ -1, 1 ],
	"filterCutoff": [ 1, 24000 ],
	"filterQ": [ 0, 100 ],
	"filterAttackTime": [ 0, 30 ],
	"filterDecayTime": [ 0, 30 ],
	"filterSustainLevel": [ 0, 1 ],
	"filterReleaseTime": [ 0, 30 ],
	"filterAmount": [ -10, 10 ],
	"vibratoRate": [ 0.01, 100 ],
	"vibratoDepth": [ 0, 1200 ],
	"tremoloRate": [ 0.01, 100 ],
	"tremoloDepth": [ 0, 1 ],
	"duty": [ 0.01, 0.99 ],
	"arpeggioRate": [ 0.01, 100 ]
};

export function clamp( value, min, max ) {
	return Math.min( max, Math.max( min, value ) );
}

// Converts a value to a slider position from 0 to 1
export function specToT( spec, value ) {
	const v = clamp( value, spec.min, spec.max );
	if( spec.curve === "exp" ) {
		return Math.log( v / spec.min ) / Math.log( spec.max / spec.min );
	}
	const t = ( v - spec.min ) / ( spec.max - spec.min );
	if( spec.curve === "sq" ) {
		return Math.sqrt( t );
	}
	return t;
}

// Converts a slider position from 0 to 1 to a value
export function specFromT( spec, t ) {
	t = clamp( t, 0, 1 );
	let value;
	if( spec.curve === "exp" ) {
		value = spec.min * Math.pow( spec.max / spec.min, t );
	} else if( spec.curve === "sq" ) {
		value = spec.min + t * t * ( spec.max - spec.min );
	} else {
		value = spec.min + t * ( spec.max - spec.min );
	}
	if( spec.int ) {
		return Math.round( value );
	}
	return roundSig( value, 4 );
}

export function roundSig( value, digits ) {
	if( value === 0 || !Number.isFinite( value ) ) {
		return value;
	}
	const scale = Math.pow( 10, digits - Math.ceil( Math.log10( Math.abs( value ) ) ) );
	return Math.round( value * scale ) / scale;
}

export function formatValue( fmt, value ) {
	switch( fmt ) {
		case "hz":
			return value >= 1000 ? ( value / 1000 ).toFixed( value >= 10000 ? 1 : 2 ) + "k" : Math.round( value ) + "";
		case "s":
			return value < 1 ? Math.round( value * 1000 ) + "ms" : value.toFixed( 2 ) + "s";
		case "pct":
			return Math.round( value * 100 ) + "%";
		case "pan":
			if( Math.abs( value ) < 0.005 ) {
				return "C";
			}
			return ( value < 0 ? "L" : "R" ) + Math.round( Math.abs( value ) * 100 );
		case "oct":
			return ( value > 0 ? "+" : "" ) + value.toFixed( 1 );
		case "cents":
			return Math.round( value ) + "c";
		case "rate":
			return value < 10 ? value.toFixed( 1 ) : Math.round( value ) + "";
		case "int":
			return Math.round( value ) + "";
		default:
			return value < 10 ? value.toFixed( 2 ) : value.toFixed( 1 );
	}
}

export function isNoise( params ) {
	return NOISE_WAVES.indexOf( params.oType ) !== -1;
}

// Builds a full editable parameter set from synth() options (such as generateSfx() output)
export function fromSynthOptions( options ) {
	const params = { ...SYNTH_DEFAULTS };
	for( const key of Object.keys( SYNTH_DEFAULTS ) ) {
		if( options[ key ] !== undefined ) {
			params[ key ] = options[ key ];
		}
	}
	if( params.arpeggio ) {
		params.arpeggio = params.arpeggio.slice();
	}
	return sanitizeParams( params );
}

// Clamps every value into the range synth() accepts, so playback never throws
export function sanitizeParams( params ) {
	const clean = { ...params };
	for( const key of Object.keys( LIMITS ) ) {
		if( clean[ key ] === null ) {
			continue;
		}
		let value = Number( clean[ key ] );
		if( !Number.isFinite( value ) ) {
			value = SYNTH_DEFAULTS[ key ] ?? SPECS[ key ].def;
		}
		clean[ key ] = clamp( value, LIMITS[ key ][ 0 ], LIMITS[ key ][ 1 ] );
	}
	if( WAVES.indexOf( clean.oType ) === -1 ) {
		clean.oType = "square";
	}
	if( FILTER_TYPES.indexOf( clean.filterType ) === -1 ) {
		clean.filterType = null;
	}
	for( const key of [ "vibratoShape", "tremoloShape" ] ) {
		if( LFO_SHAPES.indexOf( clean[ key ] ) === -1 ) {
			clean[ key ] = "sine";
		}
	}
	if( clean.arpeggio !== null ) {
		const arp = Array.isArray( clean.arpeggio ) ?
			clean.arpeggio.map( Number ).filter( Number.isFinite ).slice( 0, 32 )
				.map( n => clamp( Math.round( n ), -48, 48 ) ) :
			[];
		clean.arpeggio = arp.length > 0 ? arp : null;
	}
	return clean;
}

// Builds the smallest synth() options object that plays the parameter set: options equal to
// synth()'s defaults, and options of switched-off features, are left out. With hold, the
// options are for a held sound, which ignores duration and frequencyEnd.
export function toSynthOptions( params, hold = false ) {
	const p = sanitizeParams( params );
	const options = {};
	const noise = isNoise( p );

	function add( key ) {
		const value = p[ key ];
		if( value === null || value === undefined ) {
			return;
		}
		if( typeof value === "number" ) {
			const rounded = roundSig( value, 4 );
			if( rounded !== SYNTH_DEFAULTS[ key ] ) {
				options[ key ] = rounded;
			}
		} else if( value !== SYNTH_DEFAULTS[ key ] ) {
			options[ key ] = Array.isArray( value ) ? value.slice() : value;
		}
	}

	add( "oType" );
	if( p.oType === "pulse" ) {
		add( "duty" );
	}
	if( !noise ) {
		add( "frequency" );
		if( !hold ) {
			add( "frequencyEnd" );
		}
	}
	if( hold ) {
		options.hold = true;
	} else {

		// duration is always written, even at its default, so exported code shows the length
		options.duration = roundSig( p.duration, 4 );
	}
	for( const key of [ "volume", "attackTime", "decayTime", "sustainLevel", "releaseTime", "pan" ] ) {
		add( key );
	}
	if( p.filterType ) {
		for( const key of [
			"filterType", "filterCutoff", "filterQ", "filterAmount", "filterAttackTime",
			"filterDecayTime", "filterSustainLevel", "filterReleaseTime"
		] ) {
			add( key );
		}
	}
	if( p.vibratoDepth > 0 && !noise ) {
		add( "vibratoDepth" );
		add( "vibratoRate" );
		add( "vibratoShape" );
	}
	if( p.tremoloDepth > 0 ) {
		add( "tremoloDepth" );
		add( "tremoloRate" );
		add( "tremoloShape" );
	}
	if( p.arpeggio && !noise ) {
		add( "arpeggio" );
		add( "arpeggioRate" );
	}
	return options;
}

// Options that play a sound once, for its own length. A held sound is gated at its duration
// and keeps the rest of its held options, so the preview and the WAV file match what it plays.
export function toOneShotOptions( params, hold ) {
	const options = toSynthOptions( params, hold );
	if( hold ) {
		delete options.hold;
		options.duration = roundSig( sanitizeParams( params ).duration, 4 );
	}
	return options;
}

// Seconds from the start of the sound to the end of its release
export function soundLength( params ) {
	return params.duration + params.releaseTime;
}

// Nudges every numeric slider by a small random amount, in slider space
export function mutateParams( params, amount ) {
	const next = { ...params };
	for( const key of Object.keys( SPECS ) ) {
		if( next[ key ] === null ) {
			continue;
		}
		// Leave switched-off features switched off
		if( ( key === "vibratoDepth" || key === "tremoloDepth" ) && next[ key ] === 0 ) {
			continue;
		}
		const spec = SPECS[ key ];
		const t = specToT( spec, next[ key ] ) + ( Math.random() * 2 - 1 ) * amount;
		next[ key ] = specFromT( spec, t );
	}
	return sanitizeParams( next );
}

export function arpLabel( arp ) {
	return arp ? arp.join( "," ) : "OFF";
}
