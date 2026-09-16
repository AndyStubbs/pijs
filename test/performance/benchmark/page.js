/** Fixed-work browser harness. Timed loops contain only workload submission and clock reads. */
import * as g_graphics from "../src/tests/graphics.js";
import * as g_poly from "../src/tests/poly.js";
import * as g_images from "../src/tests/images2.js";
import * as g_loader from "../src/image-loader.js";
import * as g_specs from "./cases.json";

let m_screen;
let m_child;
const WARMUP_FRAMES = 16;
const SAMPLE_FRAMES = 32;

function frame() {
	return new Promise( resolve => requestAnimationFrame( resolve ) );
}

/** Initialize assets before timing, and return independent deterministic seed-check streams. */
export async function init() {
	await $.ready();
	m_screen = $.screen( { "aspect": "800x600", "willReadFrequently": true } );
	$.setFont( 4 );
	g_loader.init( { "strict": true, "explicitSpritesOnly": true } );
	await $.ready();
	for( const name of g_loader.images ) {
		$.getImage( name );
	}
	for( const name of g_loader.sprites ) {
		$.getSpritesheetData( name );
	}
	const proof = {};
	for( const seed of [ "graphics", "poly", "blit-images" ] ) {
		const first = new Math.seedrandom( seed, { "entropy": false } );
		const second = new Math.seedrandom( seed, { "entropy": false } );
		proof[ seed ] = Array.from( { "length": 8 }, () => [ first(), second() ] );
		if( proof[ seed ].some( pair => pair[ 0 ] !== pair[ 1 ] ) ) {
			throw new Error( `Seed streams differ: ${seed}` );
		}
	}
	return proof;
}

function configure( spec ) {
	let config;
	if( spec.type === "graphics" ) {
		let options;
		if( spec.option ) {
			options = [ spec.option ];
		}
		config = g_graphics.getConfig( options );
	} else if( spec.type === "poly" ) {
		config = g_poly.getConfig( [ spec.option ] );
	} else if( spec.type === "images" ) {
		config = g_images.getConfig( [ spec.option ] );
	} else {
		config = {
			"init": () => {}, "cleanUp": () => {},
			"run": count => runSynthetic( spec.name, count )
		};
	}
	config.seedOptions = { "entropy": false };
	return config;
}

function runSynthetic( name, count ) {
	m_screen.cls();
	if( name === "nested-view" ) {
		m_screen.pushView( 20, 20, 600, 400 );
		m_screen.pushView( 10, 10, 500, 300 );
	}
	for( let i = 0; i < count; i++ ) {
		const x = ( i * 17 ) % 700;
		const y = ( i * 23 ) % 500;
		if( name === "text" ) {
			m_screen.setPosPx( x, y );
			m_screen.print( "Pi.js performance 0123456789" );
		} else if( name === "shared-screen" ) {
			m_child.pset( x % 128, y % 128 );
			m_screen.drawImage( m_child, x, y );
		} else if( name === "short-lines" ) {
			m_screen.line( x, y, x + 3, y + 2 );
		} else {
			m_screen.line( x, y, x + 100, y + 40 );
		}
	}
	if( name === "nested-view" ) {
		m_screen.popView();
		m_screen.popView();
	}
}

/** Measure fixed-work CPU queue/submission time and frame spacing. */
export async function runCase( name, options = {} ) {
	const warmupFrames = options.warmupFrames ?? WARMUP_FRAMES;
	if( ![ 16, 120 ].includes( warmupFrames ) ) {
		throw new Error( "Warm-up frames must be 16 or 120" );
	}
	const spec = g_specs.default.find( item => item.name === name );
	if( !spec ) {
		throw new Error( `Unknown case: ${name}` );
	}
	if( ( name === "nested-view" || name === "shared-screen" ) && !m_screen.pushView ) {
		return { "name": name, "supported": false, "reason": "Feature absent before 2.1" };
	}
	if( name === "shared-screen" && !m_child ) {
		m_child = $.screen( {
			"aspect": "128x128", "isOffscreen": true, "parent": m_screen
		} );
		$.setScreen( m_screen );
	}
	const config = configure( spec );
	if( options.diagnostic?.precomputed ) {
		if( name !== "line" ) {
			throw new Error( "Precomputed diagnostics support only lines" );
		}
		const initialize = config.init;
		let inputs;
		let frameIndex;
		config.init = async () => {
			await initialize( config );
			inputs = g_graphics.precomputeLineFrames( spec.count, warmupFrames + SAMPLE_FRAMES );
			frameIndex = 0;
		};
		config.run = () => {
			$.cls();
			for( const input of inputs[ frameIndex++ ] ) {
				$.setColor( input[ 0 ] );
				$.line( input[ 1 ], input[ 2 ], input[ 3 ], input[ 4 ] );
			}
		};
	}
	const setPhase = phase => {
		if( options.diagnostic ) {
			globalThis.piBenchmarkPhase = phase;
			performance.mark( `pi-benchmark:${name}:${phase}` );
		}
	};
	const records = [];
	let previous = null;
	try {
		setPhase( "initialization" );
		await config.init( config );
		if( warmupFrames > WARMUP_FRAMES ) {
			setPhase( "preliminary" );
			for( let i = 0; i < warmupFrames - WARMUP_FRAMES; i++ ) {
				await frame();
				config.run( spec.count, config.data );
			}
			await frame();
			setPhase( "reinitialize" );
			config.cleanUp();
			await config.init( config );
		}
		setPhase( "warmup" );
		for( let i = 0; i < WARMUP_FRAMES; i++ ) {
			await frame();
			config.run( spec.count, config.data );
		}
		await frame();
		setPhase( "measurement" );
		for( let i = 0; i < SAMPLE_FRAMES; i++ ) {
			const timestamp = await frame();
			const start = performance.now();
			config.run( spec.count, config.data );
			const queueEnd = performance.now();
			await Promise.resolve();
			const submitEnd = performance.now();
			let frameMs = null;
			if( previous !== null ) {
				frameMs = timestamp - previous;
			}
			records.push( {
				"queueMs": queueEnd - start, "submitMs": submitEnd - start,
				"frameMs": frameMs, "visibility": document.visibilityState
			} );
			previous = timestamp;
		}
		await frame();
		setPhase( "validation" );
		const gl = m_screen.canvas().getContext( "webgl2" );
		if( gl.isContextLost() || gl.getError() ) {
			throw new Error( `WebGL failure: ${name}` );
		}
	} finally {
		config.cleanUp();
	}
	return {
		"name": name, "supported": true, "count": spec.count,
		"warmupFrames": warmupFrames, "samples": records
	};
}
