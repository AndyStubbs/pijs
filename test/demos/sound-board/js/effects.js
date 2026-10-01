// Bus effect schema for setBusEffect() on the "sfx" bus. Ranges follow sound-advanced.d.ts.

export const MAX_CHAIN = 4;

// Listed in chain order
export const EFFECTS = [
	{
		"name": "distortion", "label": "DISTORT",
		"params": [
			{ "key": "drive", "label": "DRIVE", "min": 0, "max": 1, "def": 0.5, "fmt": "pct" },
			{ "key": "tone", "label": "TONE", "min": 200, "max": 20000, "curve": "exp", "def": 4000, "fmt": "hz" },
			{ "key": "mix", "label": "MIX", "min": 0, "max": 1, "def": 1, "fmt": "pct" }
		]
	},
	{
		"name": "bitcrush", "label": "CRUSH",
		"params": [
			{ "key": "bits", "label": "BITS", "min": 1, "max": 16, "def": 8, "int": true, "fmt": "int" },
			{ "key": "rate", "label": "HOLD", "min": 1, "max": 64, "curve": "exp", "def": 1, "int": true, "fmt": "int" },
			{ "key": "mix", "label": "MIX", "min": 0, "max": 1, "def": 1, "fmt": "pct" }
		]
	},
	{
		"name": "filter", "label": "FILTER",
		"choice": { "key": "type", "options": [ "lowpass", "highpass", "bandpass" ], "def": "lowpass" },
		"params": [
			{ "key": "cutoff", "label": "CUTOFF", "min": 20, "max": 20000, "curve": "exp", "def": 1000, "fmt": "hz" },
			{ "key": "q", "label": "RESO", "min": 0.1, "max": 30, "curve": "exp", "def": 1, "fmt": "num" }
		]
	},
	{
		"name": "chorus", "label": "CHORUS",
		"params": [
			{ "key": "rate", "label": "RATE", "min": 0.1, "max": 10, "curve": "exp", "def": 1.5, "fmt": "rate" },
			{ "key": "depth", "label": "DEPTH", "min": 0, "max": 10, "def": 3, "fmt": "num" },
			{ "key": "mix", "label": "MIX", "min": 0, "max": 1, "def": 0.5, "fmt": "pct" }
		]
	},
	{
		"name": "delay", "label": "DELAY",
		"params": [
			{ "key": "time", "label": "TIME", "min": 0.01, "max": 2, "curve": "exp", "def": 0.25, "fmt": "s" },
			{ "key": "feedback", "label": "FEEDBK", "min": 0, "max": 0.95, "def": 0.4, "fmt": "pct" },
			{ "key": "mix", "label": "MIX", "min": 0, "max": 1, "def": 0.3, "fmt": "pct" }
		]
	},
	{
		"name": "reverb", "label": "REVERB",
		"params": [
			{ "key": "time", "label": "TIME", "min": 0.1, "max": 10, "curve": "exp", "def": 2, "fmt": "s" },
			{ "key": "decay", "label": "DECAY", "min": 0.1, "max": 20, "curve": "exp", "def": 3, "fmt": "num" },
			{ "key": "mix", "label": "MIX", "min": 0, "max": 1, "def": 0.3, "fmt": "pct" }
		]
	}
];

export function defaultEffects() {
	const state = {};
	for( const fx of EFFECTS ) {
		const values = { "on": false };
		if( fx.choice ) {
			values[ fx.choice.key ] = fx.choice.def;
		}
		for( const p of fx.params ) {
			values[ p.key ] = p.def;
		}
		state[ fx.name ] = values;
	}
	return state;
}

// Merges saved effect settings over the defaults, ignoring unknown keys
export function restoreEffects( saved ) {
	const state = defaultEffects();
	if( !saved || typeof saved !== "object" ) {
		return state;
	}
	for( const fx of EFFECTS ) {
		const src = saved[ fx.name ];
		if( !src ) {
			continue;
		}
		const dst = state[ fx.name ];
		dst.on = src.on === true;
		if( fx.choice && fx.choice.options.indexOf( src[ fx.choice.key ] ) !== -1 ) {
			dst[ fx.choice.key ] = src[ fx.choice.key ];
		}
		for( const p of fx.params ) {
			if( Number.isFinite( src[ p.key ] ) ) {
				dst[ p.key ] = Math.min( p.max, Math.max( p.min, src[ p.key ] ) );
			}
		}
	}
	return state;
}

export function countEnabled( state ) {
	return EFFECTS.filter( fx => state[ fx.name ].on ).length;
}

// The setBusEffect() chain: an array of { effect, ...options } in chain order
export function buildChain( state ) {
	const chain = [];
	for( const fx of EFFECTS ) {
		const values = state[ fx.name ];
		if( !values.on ) {
			continue;
		}
		const entry = { "effect": fx.name };
		if( fx.choice ) {
			entry[ fx.choice.key ] = values[ fx.choice.key ];
		}
		for( const p of fx.params ) {
			entry[ p.key ] = values[ p.key ];
		}
		chain.push( entry );
	}
	return chain;
}

export function applyEffects( state ) {
	const chain = buildChain( state );
	$.setBusEffect( "sfx", chain.length > 0 ? chain : null );
}

// Seconds the effects keep sounding after the dry sound ends
export function effectTail( state ) {
	let tail = 0;
	if( state.reverb.on ) {
		tail = Math.max( tail, state.reverb.time );
	}
	if( state.delay.on ) {
		const fb = state.delay.feedback;
		// Echoes until they fall below -60 dB
		const repeats = fb > 0 ? Math.ceil( Math.log( 0.001 ) / Math.log( fb ) ) : 1;
		tail = Math.max( tail, state.delay.time * Math.min( repeats, 60 ) );
	}
	if( state.chorus.on ) {
		tail = Math.max( tail, 0.05 );
	}
	return Math.min( tail, 12 );
}
