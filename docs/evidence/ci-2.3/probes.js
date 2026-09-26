/**
 * CI/CD exploration probes (docs/plans/CI-V2.3-EXPLORATION.md).
 *
 * Run from the repository root:
 *
 *   node docs/evidence/ci-2.3/probes.js renderer
 *   node docs/evidence/ci-2.3/probes.js pixels
 *   node docs/evidence/ci-2.3/probes.js paths
 *
 * `renderer` reports the WebGL renderer each Playwright engine uses, with and without explicit
 * ANGLE flags. `pixels` compares the latest visual captures in test/test-results/ with the
 * approved baselines and reports exact differences, not only the pass/fail tolerance. `paths`
 * finds tracked files whose name case differs from the working tree, and file references whose
 * case differs from the tracked name. Output is JSON on stdout.
 */
import * as g_childProcess from "node:child_process";
import * as g_fs from "node:fs";
import * as g_os from "node:os";
import * as g_path from "node:path";
import * as g_playwright from "@playwright/test";
import * as g_pngjs from "pngjs";

const MODES = [ "full", "lite", "plugins" ];
const BASELINE_DIR = "test/tests/screenshots";

// The visual runner counts a pixel as different when its RGB channel differences sum to more
// than this value (test/scripts/run-visual-tests.js).
const PIXEL_TOLERANCE = 6;

const REFERENCE_PATTERN = new RegExp(
	"[\"'`(]([^\"'`()\\s<>]*?\\.(?:png|jpe?g|gif|webp|js|mjs|wav|mp3|ogg|json|glsl|vert|frag|" +
	"css|html|ttf|fnt|md|txt|bmp))(?:[?#][^\"'`]*)?[\"'`)]", "gi"
);

/** Environment fields recorded with every probe. */
function environment() {
	const packageJson = JSON.parse( g_fs.readFileSync(
		"node_modules/@playwright/test/package.json", "utf8"
	) );
	return {
		"platform": `${g_os.type()} ${g_os.release()} ${g_os.arch()}`,
		"cpus": g_os.cpus().length,
		"node": process.version,
		"playwright": packageJson.version,
		"revision": g_childProcess.execSync( "git rev-parse --short HEAD" ).toString().trim()
	};
}

/** Report the WebGL renderer string and browser version for each engine and flag set. */
async function probeRenderer() {
	const cases = [
		{ "engine": "chromium", "args": [] },
		{ "engine": "chromium", "args": [ "--use-angle=swiftshader" ] },
		{
			"engine": "chromium",
			"args": [ "--use-angle=swiftshader", "--enable-unsafe-swiftshader" ]
		},
		{ "engine": "firefox", "args": [] },
		{ "engine": "webkit", "args": [] }
	];
	const results = [];
	for( const item of cases ) {
		const result = { "engine": item.engine, "args": item.args };
		try {
			const browser = await g_playwright[ item.engine ].launch( { "args": item.args } );
			const page = await browser.newPage();
			result.version = browser.version();
			const info = await page.evaluate( () => {
				const gl = document.createElement( "canvas" ).getContext( "webgl2" );
				if( !gl ) {
					return { "webgl2": false };
				}
				const debug = gl.getExtension( "WEBGL_debug_renderer_info" );
				let renderer = gl.getParameter( gl.RENDERER );
				if( debug ) {
					renderer = gl.getParameter( debug.UNMASKED_RENDERER_WEBGL );
				}
				return {
					"webgl2": true,
					"renderer": renderer,
					"audioContext": typeof AudioContext === "function",
					"offlineAudioContext": typeof OfflineAudioContext === "function"
				};
			} );
			Object.assign( result, info );
			await browser.close();
		} catch( error ) {
			result.error = error.message.split( "\n" )[ 0 ];
		}
		results.push( result );
	}
	return results;
}

/** Compare one capture with its baseline, pixel by pixel. */
function comparePng( baselinePath, capturePath ) {
	const baseline = g_pngjs.PNG.sync.read( g_fs.readFileSync( baselinePath ) );
	const capture = g_pngjs.PNG.sync.read( g_fs.readFileSync( capturePath ) );
	if( baseline.width !== capture.width || baseline.height !== capture.height ) {
		return { "sizeMismatch": true };
	}
	let changed = 0;
	let overTolerance = 0;
	let maxDifference = 0;
	for( let i = 0; i < baseline.data.length; i += 4 ) {
		const difference = Math.abs( baseline.data[ i ] - capture.data[ i ] ) +
			Math.abs( baseline.data[ i + 1 ] - capture.data[ i + 1 ] ) +
			Math.abs( baseline.data[ i + 2 ] - capture.data[ i + 2 ] );
		if( difference > 0 ) {
			changed += 1;
		}
		if( difference > PIXEL_TOLERANCE ) {
			overTolerance += 1;
		}
		if( difference > maxDifference ) {
			maxDifference = difference;
		}
	}
	const total = baseline.width * baseline.height;
	return {
		"changedPixels": changed,
		"overTolerancePixels": overTolerance,
		"overTolerancePercent": Number( ( overTolerance / total * 100 ).toFixed( 4 ) ),
		"maxChannelSum": maxDifference
	};
}

/** Compare every capture from the last visual run with the approved baselines. */
function probePixels() {
	const rows = [];
	for( const mode of MODES ) {
		const directory = g_path.join( "test/test-results", mode, "screenshots" );
		if( !g_fs.existsSync( directory ) ) {
			continue;
		}
		const captures = g_fs.readdirSync( directory ).filter( name => name.endsWith( ".png" ) );
		for( const file of captures ) {
			const baselinePath = g_path.join( BASELINE_DIR, file );
			const row = { "mode": mode, "capture": file };
			if( g_fs.existsSync( baselinePath ) ) {
				Object.assign( row, comparePng( baselinePath, g_path.join( directory, file ) ) );
			} else {
				row.baseline = "none (assertion fixture)";
			}
			rows.push( row );
		}
	}
	const compared = rows.filter( row => row.baseline === undefined );
	return {
		"captures": rows.length,
		"compared": compared.length,
		"identical": compared.filter( row => row.changedPixels === 0 ).length,
		"differing": compared.filter( row => row.changedPixels !== 0 )
	};
}

/** List the tracked files with git. */
function trackedFiles() {
	return g_childProcess.execSync( "git ls-files -z", { "maxBuffer": 1e8 } ).toString()
		.split( "\0" ).filter( Boolean );
}

/** Find name-case differences between git, the working tree, and file references. */
function probePaths() {
	const files = trackedFiles();
	const listings = new Map();
	const treeMismatches = new Set();
	for( const file of files ) {
		let directory = ".";
		for( const part of file.split( "/" ) ) {
			if( !listings.has( directory ) ) {
				let names = [];
				try {
					names = g_fs.readdirSync( directory );
				} catch( _error ) {}
				listings.set( directory, names );
			}
			const names = listings.get( directory );
			if( !names.includes( part ) ) {
				const onDisk = names.find( name => name.toLowerCase() === part.toLowerCase() );
				treeMismatches.add( `${directory}/${part} is ${onDisk} in the working tree` );
			}
			directory = `${directory}/${part}`;
		}
	}
	const exact = new Set( files );
	const byLowerCase = new Map( files.map( file => [ file.toLowerCase(), file ] ) );
	const referenceMismatches = [];
	let referencesChecked = 0;
	for( const file of files ) {
		if( !/\.(html|js|mjs|md|json|css)$/.test( file ) ) {
			continue;
		}
		if( /^(docs\/archive|docs\/evidence|releases\/pi-[0-9])/.test( file ) ) {
			continue;
		}
		const text = g_fs.readFileSync( file, "utf8" );
		for( const match of text.matchAll( REFERENCE_PATTERN ) ) {
			const reference = match[ 1 ];
			if( /^(https?:|data:|blob:|\/\/)/.test( reference ) || reference.includes( "${" ) ) {
				continue;
			}
			let target = g_path.posix.normalize(
				g_path.posix.join( g_path.posix.dirname( file ), reference )
			);
			if( reference.startsWith( "/" ) ) {
				target = reference.slice( 1 );
			}
			referencesChecked += 1;
			if( !exact.has( target ) && byLowerCase.has( target.toLowerCase() ) ) {
				referenceMismatches.push( {
					"file": file,
					"reference": reference,
					"tracked": byLowerCase.get( target.toLowerCase() )
				} );
			}
		}
	}
	return {
		"trackedFiles": files.length,
		"treeCaseMismatches": [ ...treeMismatches ],
		"referencesChecked": referencesChecked,
		"referenceCaseMismatches": referenceMismatches
	};
}

/** Run the probe named on the command line and print JSON. */
async function main() {
	const probe = process.argv[ 2 ];
	const output = {
		"probe": probe,
		"date": new Date().toISOString(),
		"environment": environment()
	};
	if( probe === "renderer" ) {
		output.results = await probeRenderer();
	} else if( probe === "pixels" ) {
		output.results = probePixels();
	} else if( probe === "paths" ) {
		output.results = probePaths();
	} else {
		throw new Error( "Choose a probe: renderer, pixels, or paths." );
	}
	console.log( JSON.stringify( output, null, "\t" ) );
}

main().catch( error => {
	console.error( error.message );
	process.exitCode = 1;
} );
