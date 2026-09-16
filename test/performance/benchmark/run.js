/** Maintained fixed-work benchmark CLI. Does not invoke Git or release-writing scripts. */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_playwright from "@playwright/test";
import * as g_artifacts from "./artifacts.js";
import * as g_browser from "./browser.js";
import * as g_statistics from "./statistics.js";
import * as g_seedrandom from "../../libs/seedrandom.js";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const g_specs = JSON.parse(
	g_fs.readFileSync( g_path.join( DIRNAME, "cases.json" ), "utf8" )
);

const HELP = `Usage: npm run benchmark -- --source=baseline=C:/sources/before
  --source=candidate=C:/sources/after [--plugin-source=C:/sources/before/plugins/polygons]
  [--cases=line,images] [--out=directory] [--resume] [--smoke]
Sources are Pi.js 2.x directories. The first is the baseline; labels must be unique.
The plugin defaults to the first source's plugins/polygons directory.
Normal campaigns run 7 rounds, extending to 14 above 5% MAD. Smoke runs one round.
Resume requires the same sources, cases, mode, files, and environment, plus --out.
Keep Chromium visible and run only one benchmark process at a time.`;

/** Parse explicit inputs; reject typos rather than silently running the wrong comparison. */
function parseArgs( args ) {
	const values = {};
	const sources = [];
	for( const arg of args ) {
		if( [ "--resume", "--smoke", "--help" ].includes( arg ) ) {
			values[ arg.slice( 2 ) ] = true;
			continue;
		}
		const match = /^--(source|plugin-source|cases|out)=(.+)$/.exec( arg );
		if( !match ) {
			throw new Error( `Unknown or empty option: ${arg}` );
		}
		if( match[ 1 ] === "source" ) {
			const source = /^([a-zA-Z0-9][a-zA-Z0-9._-]*)=(.+)$/.exec( match[ 2 ] );
			if( !source || sources.some( item =>
				item.label.toLowerCase() === source[ 1 ].toLowerCase() ) ) {
				throw new Error( "Sources require unique label=directory values" );
			}
			sources.push( { "label": source[ 1 ], "directory": g_path.resolve( source[ 2 ] ) } );
		} else {
			if( values[ match[ 1 ] ] !== undefined ) {
				throw new Error( `Repeated option: ${match[ 1 ]}` );
			}
			values[ match[ 1 ] ] = match[ 2 ];
		}
	}
	if( values.help ) {
		return { "help": true };
	}
	if( !sources.length || ( values.resume && !values.out ) ) {
		throw new Error( "Supply --source; resuming also requires --out" );
	}
	let cases = g_specs.map( spec => spec.name );
	if( values.cases ) {
		cases = values.cases.split( "," );
	}
	if( new Set( cases ).size !== cases.length || cases.some( name =>
		!g_specs.some( spec => spec.name === name ) ) ) {
		throw new Error( "Unknown or duplicate cases" );
	}
	let out = values.out;
	if( !out ) {
		out = g_path.join( g_artifacts.ROOT, "test/performance/campaigns",
			new Date().toISOString().replaceAll( ":", "-" ) );
	}
	return {
		"sources": sources, "cases": cases, "out": g_path.resolve( out ),
		"pluginSource": g_path.resolve( values[ "plugin-source" ] ||
			g_path.join( sources[ 0 ].directory, "plugins/polygons" ) ),
		"resume": !!values.resume, "smoke": !!values.smoke
	};
}

/** Preserve actual A/B alternation; reversal must not cancel a two-source rotation. */
function orderForRound( labels, round ) {
	let order = labels.slice( round % labels.length ).concat(
		labels.slice( 0, round % labels.length )
	);
	if( labels.length !== 2 && round % 2 ) {
		order = order.reverse();
	}
	return order;
}

/** Recreate the saved seed proof independently of the browser and workload generators. */
function expectedProof() {
	const proof = {};
	for( const seed of [ "graphics", "poly", "blit-images" ] ) {
		const random = new g_seedrandom.default( seed, { "entropy": false } );
		proof[ seed ] = Array.from( { "length": 8 }, () => {
			const value = random();
			return [ value, value ];
		} );
	}
	return proof;
}

/** Validate complete samples and identity before accepting new or resumed results. */
function validateRun( run, identity, fingerprint, env ) {
	if( run.fingerprint !== fingerprint || !identity.artifacts.some( item =>
		item.label === run.artifact && item.sha256 === run.sha256 ) ||
		JSON.stringify( run.environment ) !== JSON.stringify( env ) ||
		JSON.stringify( run.seedProof ) !== JSON.stringify( expectedProof() ) ||
		JSON.stringify( run.tests?.map( test => test.name ) ) !== JSON.stringify( identity.cases ) ) {
		throw new Error( "Run identity, environment, cases, or seed proof mismatch" );
	}
	for( const test of run.tests ) {
		if( test.supported === false ) {
			if( ![ "nested-view", "shared-screen" ].includes( test.name ) || !test.reason ) {
				throw new Error( `Invalid unsupported case: ${test.name}` );
			}
			continue;
		}
		const spec = g_specs.find( item => item.name === test.name );
		if( test.supported !== true || test.count !== spec.count || test.warmupFrames !== 16 ||
			test.samples?.length !== 32 || test.samples.some( ( sample, i ) =>
				!Number.isFinite( sample.queueMs ) || sample.queueMs < 0 ||
				!Number.isFinite( sample.submitMs ) || sample.submitMs < sample.queueMs ||
				sample.visibility !== "visible" || ( i === 0 && sample.frameMs !== null ) ||
				( i > 0 && ( !Number.isFinite( sample.frameMs ) || sample.frameMs <= 0 ) ) ) ) {
			throw new Error( `Invalid samples: ${test.name}` );
		}
	}
}

/** Validate hashes, ordering, and complete results before skipping completed work. */
function readCompleted( out, manifest, prepared ) {
	if( manifest.fingerprint !== prepared.fingerprint ||
		g_artifacts.hash( JSON.stringify( manifest.identity ) ) !== prepared.fingerprint ) {
		throw new Error( "Campaign inputs changed; use a new output directory" );
	}
	g_artifacts.verifyFiles( out, manifest.identity.files );
	const labels = manifest.identity.sources.map( source => source.label );
	const runs = [];
	for( const [ index, entry ] of manifest.completed.entries() ) {
		const round = Math.floor( index / labels.length );
		const order = orderForRound( labels, round );
		const label = order[ index % labels.length ];
		const expectedFile = `runs/${round + 1}-${label}.json`;
		if( entry.file !== expectedFile || round >= g_statistics.roundLimit(
			runs, labels, manifest.identity.smoke ) ) {
			throw new Error( "Invalid campaign execution order" );
		}
		g_artifacts.verifyFiles( out, [ entry ] );
		const run = JSON.parse( g_fs.readFileSync( g_path.join( out, entry.file ), "utf8" ) );
		if( run.round !== round + 1 || run.artifact !== label ||
			JSON.stringify( run.order ) !== JSON.stringify( order ) || run.sequence !== index + 1 ) {
			throw new Error( "Invalid run sequence" );
		}
		validateRun( run, manifest.identity, manifest.fingerprint, manifest.environment );
		runs.push( run );
	}
	const indexed = new Set( manifest.completed.map( entry => g_path.basename( entry.file ) ) );
	if( g_fs.readdirSync( g_path.join( out, "runs" ) ).some( name =>
		name.endsWith( ".json" ) && !indexed.has( name ) ) ) {
		throw new Error( "Unindexed run file; inspect interrupted writes before resuming" );
	}
	return runs;
}

function acquireLock( out ) {
	const file = g_path.join( out, "campaign.lock" );
	if( g_fs.existsSync( file ) ) {
		const pid = Number( g_fs.readFileSync( file, "utf8" ) );
		if( !Number.isInteger( pid ) || pid <= 0 ) {
			throw new Error( "Invalid campaign lock; inspect it before resuming" );
		}
		try {
			process.kill( pid, 0 );
		} catch( error ) {
			if( error.code === "ESRCH" ) {
				g_fs.unlinkSync( file );
			} else {
				throw error;
			}
		}
	}
	const fd = g_fs.openSync( file, "wx" );
	g_fs.writeFileSync( fd, String( process.pid ) );
	g_fs.closeSync( fd );
	return () => g_fs.unlinkSync( file );
}

/** Execute a campaign. Dependency hooks are internal to automated tests, never CLI options. */
async function campaign( config, hooks = {} ) {
	const prepared = await g_artifacts.prepare( config );
	const out = config.out;
	const manifestFile = g_path.join( out, "manifest.json" );
	if( !config.resume && g_fs.existsSync( out ) && g_fs.readdirSync( out ).length ) {
		throw new Error( "Output directory is not empty; use --resume or a new directory" );
	}
	if( config.resume && !g_fs.existsSync( manifestFile ) ) {
		throw new Error( "No campaign manifest to resume" );
	}
	g_fs.mkdirSync( out, { "recursive": true } );
	const unlock = acquireLock( out );
	let browser;
	let server;
	let manifest;
	let runs = [];
	try {
		if( config.resume ) {
			manifest = JSON.parse( g_fs.readFileSync( manifestFile, "utf8" ) );
			runs = readCompleted( out, manifest, prepared );
		} else {
			for( const [ name, bytes ] of Object.entries( prepared.files ) ) {
				const file = g_path.join( out, name );
				g_fs.mkdirSync( g_path.dirname( file ), { "recursive": true } );
				g_fs.writeFileSync( file, bytes );
			}
			g_fs.mkdirSync( g_path.join( out, "runs" ) );
			manifest = {
				"created": new Date().toISOString(), "identity": prepared.identity,
				"fingerprint": prepared.fingerprint, "environment": null,
				"completed": [], "interruptions": [], "complete": false
			};
			g_artifacts.writeJson( manifestFile, manifest );
		}
		const served = await g_browser.serve( out, prepared.identity.files );
		server = served.server;
		const launch = hooks.launch || ( () => g_playwright.chromium.launch( { "headless": false } ) );
		browser = await launch();
		const labels = config.sources.map( source => source.label );
		for( let round = 0; round < g_statistics.roundLimit( runs, labels, config.smoke ); round++ ) {
			const order = orderForRound( labels, round );
			for( const label of order ) {
				if( runs.some( run => run.artifact === label && run.round === round + 1 ) ) {
					continue;
				}
				const artifact = prepared.identity.artifacts.find( item => item.label === label );
				console.log( `Benchmark ${label}, round ${round + 1}` );
				try {
					const measure = hooks.measure || g_browser.measure;
					const result = await measure( browser, served.url, artifact, config.cases, {
						"expectedEnvironment": manifest.environment
					} );
					const run = {
						"artifact": label, "sha256": artifact.sha256, "round": round + 1,
						"order": order, "sequence": runs.length + 1,
						"date": new Date().toISOString(), "fingerprint": prepared.fingerprint, ...result
					};
					const env = manifest.environment || result.environment;
					validateRun( run, prepared.identity, prepared.fingerprint, env );
					const file = `runs/${round + 1}-${label}.json`;
					g_artifacts.writeJson( g_path.join( out, file ), run );
					manifest.environment = env;
					manifest.completed.push( {
						"file": file, "sha256": g_artifacts.hash( g_fs.readFileSync( g_path.join( out, file ) ) )
					} );
					g_artifacts.writeJson( manifestFile, manifest );
					runs.push( run );
				} catch( error ) {
					const interruption = {
						"date": new Date().toISOString(), "artifact": label, "round": round + 1,
						"order": order, "stage": "measurement", "error": String( error ),
						...error.interruption
					};
					manifest.interruptions.push( interruption );
					g_artifacts.writeJson( manifestFile, manifest );
					g_artifacts.writeJson( g_path.join( out, "summary.json" ),
						g_statistics.campaignSummary( runs, labels, config.smoke, false ) );
					throw error;
				}
			}
		}
		manifest.complete = true;
		g_artifacts.writeJson( manifestFile, manifest );
		g_artifacts.writeJson( g_path.join( out, "summary.json" ),
			g_statistics.campaignSummary( runs, labels, config.smoke, true ) );
		console.log( `Campaign saved: ${out}` );
		return manifest;
	} finally {
		try {
			await browser?.close();
		} finally {
			if( server ) {
				await new Promise( resolve => server.close( resolve ) );
			}
			unlock();
		}
	}
}

export { parseArgs, orderForRound, validateRun, readCompleted, campaign, expectedProof };

// Run when invoked as the CLI entry, not when imported by tests.
function isMain() {
	if( !process.argv[ 1 ] ) {
		return false;
	}
	const argvPath = g_path.normalize( g_path.resolve( process.argv[ 1 ] ) );
	const selfPath = g_path.normalize( g_url.fileURLToPath( import.meta.url ) );
	return argvPath.toLowerCase() === selfPath.toLowerCase();
}

if( isMain() ) {
	Promise.resolve().then( async () => {
		const config = parseArgs( process.argv.slice( 2 ) );
		if( config.help ) {
			console.log( HELP );
		} else {
			await campaign( config );
		}
	} ).catch( error => { console.error( error ); process.exitCode = 1; } );
}
