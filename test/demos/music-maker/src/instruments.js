// Instrument presets and drum kits. Instruments are stored in an editor-friendly form
// ("params") and turned into synth() options for defineInstrument() by toSynth().

export const WAVES = [ "sine", "triangle", "square", "sawtooth", "pulse25", "pulse12", "noise", "pink" ];
export const WAVE_NAMES = {
	"sine": "SINE", "triangle": "TRI", "square": "SQUARE", "sawtooth": "SAW",
	"pulse25": "PULSE25", "pulse12": "PULSE12", "noise": "NOISE", "pink": "PINK"
};
export const FILTERS = [ "off", "lowpass", "highpass", "bandpass" ];
export const FILTER_NAMES = { "off": "OFF", "lowpass": "LOW", "highpass": "HIGH", "bandpass": "BAND" };
export const ARPS = {
	"off": null,
	"major": [ 0, 4, 7, 12 ],
	"minor": [ 0, 3, 7, 12 ],
	"power": [ 0, 7, 12 ],
	"octave": [ 0, 12 ],
	"trill": [ 0, 2 ]
};
export const ARP_IDS = Object.keys( ARPS );
export const STYLES = [ "staccato", "normal", "legato" ];
export const STYLE_NAMES = { "staccato": "SHORT", "normal": "NORMAL", "legato": "SMOOTH" };
export const STYLE_MML = { "staccato": "MS", "normal": "MN", "legato": "ML" };

export const DEFAULT_PARAMS = {
	"wave": "triangle",
	"volume": 0.7,
	"attack": 0.005,
	"decay": 0.1,
	"sustain": 0.7,
	"release": 0.12,
	"filter": "off",
	"cutoff": 2000,
	"resonance": 1,
	"envAmount": 0,
	"envDecay": 0.2,
	"vibrato": 0,
	"vibratoRate": 5.5,
	"tremolo": 0,
	"tremoloRate": 5,
	"vibratoRandom": false,
	"tremoloRandom": false,
	"arp": "off",
	"arpRate": 16,
	"pitch": 0,
	"pitchEnd": 0,
	"ring": 2,
	"style": "normal"
};

function inst( id, name, cat, params ) {
	return { id, name, cat, "params": { ...DEFAULT_PARAMS, ...params } };
}

export const CATEGORIES = [ "LEAD", "KEYS", "PAD", "PLUCK", "BASS" ];

export const PRESETS = [
	inst( "chiplead", "CHIP LEAD", "LEAD", {
		"wave": "pulse25", "volume": 0.5, "attack": 0.003, "decay": 0.12, "sustain": 0.6,
		"release": 0.06, "vibrato": 12, "vibratoRate": 6
	} ),
	inst( "squarelead", "SQUARE LEAD", "LEAD", {
		"wave": "square", "volume": 0.4, "attack": 0.005, "decay": 0.2, "sustain": 0.6,
		"release": 0.1, "filter": "lowpass", "cutoff": 3000, "vibrato": 8
	} ),
	inst( "sawlead", "SAW LEAD", "LEAD", {
		"wave": "sawtooth", "volume": 0.4, "attack": 0.01, "decay": 0.3, "sustain": 0.7,
		"release": 0.2, "filter": "lowpass", "cutoff": 1400, "resonance": 3, "envAmount": 2,
		"envDecay": 0.25, "vibrato": 10
	} ),
	inst( "flute", "FLUTE", "LEAD", {
		"wave": "sine", "volume": 0.7, "attack": 0.06, "decay": 0.1, "sustain": 0.85,
		"release": 0.15, "vibrato": 18, "vibratoRate": 5, "tremolo": 0.1, "style": "legato"
	} ),
	inst( "epiano", "E.PIANO", "KEYS", {
		"wave": "triangle", "volume": 0.6, "attack": 0.002, "decay": 0.9, "sustain": 0.25,
		"release": 0.3, "filter": "lowpass", "cutoff": 2500, "tremolo": 0.2, "tremoloRate": 4
	} ),
	inst( "bells", "BELLS", "KEYS", {
		"wave": "sine", "volume": 0.6, "attack": 0.001, "decay": 1.2, "sustain": 0,
		"release": 0.8, "vibrato": 4
	} ),
	inst( "organ", "ORGAN", "KEYS", {
		"wave": "square", "volume": 0.35, "attack": 0.01, "decay": 0, "sustain": 1,
		"release": 0.08, "filter": "lowpass", "cutoff": 2200, "tremolo": 0.15, "tremoloRate": 6,
		"style": "legato"
	} ),
	inst( "chippiano", "CHIP PIANO", "KEYS", {
		"wave": "square", "volume": 0.35, "attack": 0.002, "decay": 0.25, "sustain": 0.2,
		"release": 0.1
	} ),
	inst( "warmpad", "WARM PAD", "PAD", {
		"wave": "sawtooth", "volume": 0.3, "attack": 0.35, "decay": 0.5, "sustain": 0.8,
		"release": 0.7, "filter": "lowpass", "cutoff": 900, "resonance": 1.5, "vibrato": 6,
		"vibratoRate": 4, "style": "legato"
	} ),
	inst( "glasspad", "GLASS PAD", "PAD", {
		"wave": "triangle", "volume": 0.5, "attack": 0.4, "decay": 0.3, "sustain": 0.8,
		"release": 0.9, "tremolo": 0.25, "tremoloRate": 3, "style": "legato"
	} ),
	inst( "strings", "STRINGS", "PAD", {
		"wave": "sawtooth", "volume": 0.3, "attack": 0.18, "decay": 0.2, "sustain": 0.85,
		"release": 0.35, "filter": "lowpass", "cutoff": 2200, "resonance": 0.8, "vibrato": 14,
		"style": "legato"
	} ),
	inst( "pluck", "PLUCK", "PLUCK", {
		"wave": "sawtooth", "volume": 0.45, "attack": 0.002, "decay": 0.35, "sustain": 0.1,
		"release": 0.15, "filter": "lowpass", "cutoff": 500, "resonance": 4, "envAmount": 3.5,
		"envDecay": 0.18
	} ),
	inst( "harp", "HARP", "PLUCK", {
		"wave": "triangle", "volume": 0.65, "attack": 0.001, "decay": 0.6, "sustain": 0,
		"release": 0.4, "filter": "lowpass", "cutoff": 3000, "envAmount": 1, "envDecay": 0.1
	} ),
	inst( "chiparp", "CHIP ARP MAJ", "PLUCK", {
		"wave": "pulse12", "volume": 0.35, "decay": 0.1, "sustain": 0.8, "arp": "major",
		"arpRate": 20
	} ),
	inst( "chiparpmin", "CHIP ARP MIN", "PLUCK", {
		"wave": "pulse12", "volume": 0.35, "decay": 0.1, "sustain": 0.8, "arp": "minor",
		"arpRate": 20
	} ),
	inst( "chipbass", "CHIP BASS", "BASS", {
		"wave": "triangle", "volume": 0.9, "attack": 0.002, "decay": 0, "sustain": 1,
		"release": 0.05
	} ),
	inst( "pluckbass", "PLUCK BASS", "BASS", {
		"wave": "sawtooth", "volume": 0.55, "attack": 0.002, "decay": 0.3, "sustain": 0.4,
		"release": 0.08, "filter": "lowpass", "cutoff": 350, "resonance": 5, "envAmount": 2.5,
		"envDecay": 0.15
	} ),
	inst( "subbass", "SUB BASS", "BASS", {
		"wave": "sine", "volume": 0.9, "attack": 0.005, "decay": 0, "sustain": 1, "release": 0.1
	} ),
	inst( "acidbass", "ACID BASS", "BASS", {
		"wave": "sawtooth", "volume": 0.4, "attack": 0.002, "decay": 0.2, "sustain": 0.5,
		"release": 0.05, "filter": "lowpass", "cutoff": 300, "resonance": 14, "envAmount": 3.5,
		"envDecay": 0.12, "style": "staccato"
	} ),
	inst( "squarebass", "SQUARE BASS", "BASS", {
		"wave": "pulse25", "volume": 0.45, "attack": 0.002, "decay": 0.2, "sustain": 0.5,
		"release": 0.06, "filter": "lowpass", "cutoff": 900
	} )
];

export function getPreset( id ) {
	return PRESETS.find( p => p.id === id ) || PRESETS[ 0 ];
}

// Drum rows are stored by index; the grid shows them in DRUM_ORDER, kick at the bottom.
export const DRUM_NAMES = [ "KICK", "SNARE", "CLAP", "HAT", "OPEN HAT", "TOM LO", "TOM HI", "PERC" ];
export const DRUM_SHORT = [ "KIK", "SNR", "CLP", "HAT", "OHT", "TML", "TMH", "PRC" ];
export const DRUM_ORDER = [ 7, 6, 5, 4, 3, 2, 1, 0 ];
export const DRUM_COUNT = DRUM_NAMES.length;

function drum( params ) {
	return { ...DEFAULT_PARAMS, "sustain": 0, "attack": 0.001, "style": "legato", ...params };
}

export const KITS = [
	{
		"id": "electro", "name": "ELECTRO KIT", "drums": [
			drum( { "wave": "sine", "pitch": 160, "pitchEnd": 42, "decay": 0.35, "release": 0.08, "volume": 1, "ring": 1 } ),
			drum( { "wave": "noise", "filter": "bandpass", "cutoff": 1800, "resonance": 0.7, "decay": 0.18, "release": 0.08, "volume": 0.7, "ring": 2 } ),
			drum( { "wave": "noise", "filter": "bandpass", "cutoff": 1300, "resonance": 2, "tremolo": 0.9, "tremoloRate": 50, "decay": 0.2, "release": 0.08, "volume": 0.8, "ring": 2 } ),
			drum( { "wave": "noise", "filter": "highpass", "cutoff": 8000, "decay": 0.04, "release": 0.03, "volume": 0.45, "ring": 1 } ),
			drum( { "wave": "noise", "filter": "highpass", "cutoff": 7000, "decay": 0.3, "release": 0.15, "volume": 0.35, "ring": 4 } ),
			drum( { "wave": "sine", "pitch": 140, "pitchEnd": 80, "decay": 0.3, "release": 0.1, "volume": 0.9, "ring": 2 } ),
			drum( { "wave": "sine", "pitch": 220, "pitchEnd": 130, "decay": 0.25, "release": 0.1, "volume": 0.8, "ring": 2 } ),
			drum( { "wave": "square", "pitch": 800, "filter": "bandpass", "cutoff": 1000, "resonance": 3, "decay": 0.15, "release": 0.05, "volume": 0.35, "ring": 2 } )
		]
	},
	{
		"id": "chip", "name": "CHIP KIT", "drums": [
			drum( { "wave": "triangle", "pitch": 200, "pitchEnd": 50, "decay": 0.15, "release": 0.05, "volume": 1, "ring": 1 } ),
			drum( { "wave": "noise", "decay": 0.12, "release": 0.05, "volume": 0.5, "ring": 1 } ),
			drum( { "wave": "pink", "decay": 0.1, "release": 0.05, "volume": 0.6, "ring": 1 } ),
			drum( { "wave": "noise", "filter": "highpass", "cutoff": 9000, "decay": 0.02, "release": 0.02, "volume": 0.4, "ring": 1 } ),
			drum( { "wave": "noise", "filter": "highpass", "cutoff": 6000, "decay": 0.15, "release": 0.08, "volume": 0.3, "ring": 2 } ),
			drum( { "wave": "pulse25", "pitch": 300, "pitchEnd": 100, "decay": 0.15, "release": 0.05, "volume": 0.4, "ring": 2 } ),
			drum( { "wave": "pulse25", "pitch": 500, "pitchEnd": 200, "decay": 0.12, "release": 0.05, "volume": 0.4, "ring": 2 } ),
			drum( { "wave": "pulse12", "pitch": 1500, "decay": 0.05, "release": 0.03, "volume": 0.3, "ring": 1 } )
		]
	},
	{
		"id": "boom", "name": "BOOM KIT", "drums": [
			drum( { "wave": "sine", "pitch": 110, "pitchEnd": 45, "decay": 0.6, "release": 0.15, "volume": 1, "ring": 4 } ),
			drum( { "wave": "noise", "filter": "lowpass", "cutoff": 5000, "decay": 0.2, "release": 0.1, "volume": 0.6, "ring": 2 } ),
			drum( { "wave": "noise", "filter": "bandpass", "cutoff": 1100, "resonance": 1.5, "tremolo": 0.8, "tremoloRate": 40, "decay": 0.25, "release": 0.1, "volume": 0.8, "ring": 2 } ),
			drum( { "wave": "noise", "filter": "highpass", "cutoff": 6500, "decay": 0.05, "release": 0.03, "volume": 0.35, "ring": 1 } ),
			drum( { "wave": "noise", "filter": "highpass", "cutoff": 5500, "decay": 0.4, "release": 0.2, "volume": 0.3, "ring": 4 } ),
			drum( { "wave": "sine", "pitch": 100, "pitchEnd": 60, "decay": 0.4, "release": 0.1, "volume": 0.9, "ring": 4 } ),
			drum( { "wave": "sine", "pitch": 160, "pitchEnd": 95, "decay": 0.35, "release": 0.1, "volume": 0.8, "ring": 4 } ),
			drum( { "wave": "triangle", "pitch": 1700, "decay": 0.03, "release": 0.02, "volume": 0.5, "ring": 1 } )
		]
	}
];

export function getKit( id ) {
	return KITS.find( k => k.id === id ) || KITS[ 0 ];
}

function round( n ) {
	return Math.round( n * 1000 ) / 1000;
}

// Editor params -> synth() options for defineInstrument().
export function toSynth( p ) {
	const o = {};
	if( p.wave === "pulse25" || p.wave === "pulse12" ) {
		o.oType = "pulse";
		o.duty = p.wave === "pulse25" ? 0.25 : 0.125;
	} else if( p.wave === "noise" ) {
		o.oType = "white";
	} else {
		o.oType = p.wave;
	}
	o.volume = round( p.volume );
	o.attackTime = round( p.attack );
	o.decayTime = round( p.decay );
	o.sustainLevel = round( p.sustain );
	o.releaseTime = round( p.release );
	if( p.pitch > 0 ) {
		o.frequency = round( p.pitch );
		if( p.pitchEnd > 0 ) {
			o.frequencyEnd = round( p.pitchEnd );
		}
	}
	if( p.filter !== "off" ) {
		o.filterType = p.filter;
		o.filterCutoff = round( p.cutoff );
		o.filterQ = round( p.resonance );
		if( p.envAmount !== 0 ) {
			o.filterAmount = round( p.envAmount );
			o.filterAttackTime = 0;
			o.filterDecayTime = round( p.envDecay );
			o.filterSustainLevel = 0;
			o.filterReleaseTime = round( p.release );
		}
	}
	if( p.vibrato > 0 ) {
		o.vibratoDepth = round( p.vibrato );
		o.vibratoRate = round( p.vibratoRate );
		if( p.vibratoRandom ) {
			o.vibratoShape = "random";
		}
	}
	if( p.tremolo > 0 ) {
		o.tremoloDepth = round( p.tremolo );
		o.tremoloRate = round( p.tremoloRate );
		if( p.tremoloRandom ) {
			o.tremoloShape = "random";
		}
	}
	if( ARPS[ p.arp ] ) {
		o.arpeggio = ARPS[ p.arp ].slice();
		o.arpeggioRate = round( p.arpRate );
	}
	return o;
}

// synth() options -> editor params (used when importing code).
export function fromSynth( o ) {
	const p = { ...DEFAULT_PARAMS };
	if( o.oType === "pulse" ) {
		p.wave = ( o.duty || 0.5 ) <= 0.18 ? "pulse12" : ( o.duty || 0.5 ) < 0.4 ? "pulse25" : "square";
	} else if( o.oType === "white" ) {
		p.wave = "noise";
	} else if( WAVES.includes( o.oType ) ) {
		p.wave = o.oType;
	}
	const num = ( v, d ) => typeof v === "number" && isFinite( v ) ? v : d;
	p.volume = num( o.volume, 1 );
	p.attack = num( o.attackTime, 0 );
	p.decay = num( o.decayTime, 0 );
	p.sustain = num( o.sustainLevel, 1 );
	p.release = num( o.releaseTime, 0.1 );
	p.pitch = num( o.frequency, 0 );
	p.pitchEnd = num( o.frequencyEnd, 0 );
	if( FILTERS.includes( o.filterType ) ) {
		p.filter = o.filterType;
		p.cutoff = num( o.filterCutoff, 1000 );
		p.resonance = num( o.filterQ, 1 );
		p.envAmount = num( o.filterAmount, 0 );
		p.envDecay = num( o.filterDecayTime, 0.2 );
	}
	p.vibrato = num( o.vibratoDepth, 0 );
	p.vibratoRate = num( o.vibratoRate, 5 );
	p.tremolo = num( o.tremoloDepth, 0 );
	p.tremoloRate = num( o.tremoloRate, 5 );
	p.vibratoRandom = o.vibratoShape === "random";
	p.tremoloRandom = o.tremoloShape === "random";
	if( Array.isArray( o.arpeggio ) ) {
		const key = ARP_IDS.find( id => ARPS[ id ] && ARPS[ id ].join() === o.arpeggio.join() );
		p.arp = key || "major";
		p.arpRate = num( o.arpeggioRate, 12 );
	}
	return p;
}
