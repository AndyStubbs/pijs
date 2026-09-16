/** Separate, fixed-length line experiments. These outputs never qualify a renderer candidate. */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_playwright from "@playwright/test";
import * as g_artifacts from "./artifacts.js";
import * as g_browser from "./browser.js";
import * as g_run from "./run.js";
import * as g_statistics from "./statistics.js";

/** Build the same balanced schedule for each independent diagnostic mode. */
export function schedule( labels ) {
	const entries = [];
	for( let round = 0; round < 7; round++ ) {
		let settings = [ 16, 120 ];
		if( round % 2 ) {
			settings = settings.slice().reverse();
		}
		for( const warmupFrames of settings ) {
			for( const label of g_run.orderForRound( labels, round ) ) {
				entries.push( { "round": round + 1, "label": label, "warmupFrames": warmupFrames } );
			}
		}
	}
	return entries;
}

/** Instrument only isolated esbuild output, failing closed when expected sites change. */
export function instrument( bytes ) {
	let source = Buffer.from( bytes ).toString( "utf8" );
	const sites = [
		[ "function resizeBatch(batch, newCapacity) {",
			"resize", "{ oldCapacity: batch.capacity, newCapacity, batchType: batch.type }" ],
		[ "if (requiredCount > batch.maxCapacity) {\n      flushBatches(screenData);",
			"forcedFlush", "{ batchType: batch.type }" ]
	];
	for( const [ needle, event, details ] of sites ) {
		if( source.split( needle ).length !== 2 ) {
			throw new Error( `Diagnostic instrumentation site changed: ${event}` );
		}
		const call = `globalThis.piBenchmarkEvent("${event}", ${details});`;
		let replacement = needle + "\n    " + call;
		if( event === "forcedFlush" ) {
			replacement = needle.replace( "flushBatches(screenData);",
				call + "\n      flushBatches(screenData);" );
		}
		source = source.replace( needle, replacement );
	}
	return source;
}

/** Start one CDP capture; always save available evidence before the browser context closes. */
export async function capture( context, page, mode, save ) {
	const session = await context.newCDPSession( page );
	await page.addInitScript( () => {
		globalThis.piBenchmarkEvents = [];
		globalThis.piBenchmarkEvent = ( event, details ) => {
			piBenchmarkEvents.push( { "event": event, "details": details,
				"phase": globalThis.piBenchmarkPhase ?? "startup", "time": performance.now() } );
		};
	} );
	let traceDone;
	if( mode === "execution" ) {
		traceDone = new Promise( resolve => session.once( "Tracing.tracingComplete", resolve ) );
		await session.send( "Profiler.enable" );
		await session.send( "Profiler.start" );
		await session.send( "Tracing.start", {
			"categories": "devtools.timeline,v8,v8.execute,blink.user_timing," +
				"disabled-by-default-v8.compile,disabled-by-default-v8.gc",
			"transferMode": "ReturnAsStream"
		} );
	} else {
		await session.send( "HeapProfiler.enable" );
		await session.send( "HeapProfiler.startSampling", {
			"samplingInterval": 32768, "includeObjectsCollectedByMajorGC": true,
			"includeObjectsCollectedByMinorGC": true
		} );
	}
	return async () => {
		try {
			save( "events.json", await page.evaluate( () => globalThis.piBenchmarkEvents ?? [] ) );
			if( mode === "execution" ) {
				save( "cpu.json", await session.send( "Profiler.stop" ) );
				await session.send( "Tracing.end" );
				const { stream } = await g_browser.bounded( traceDone, 30000, "trace completion" );
				const parts = [];
				while( true ) {
					const chunk = await session.send( "IO.read", { "handle": stream } );
					let bytes = Buffer.from( chunk.data );
					if( chunk.base64Encoded ) {
						bytes = Buffer.from( chunk.data, "base64" );
					}
					parts.push( bytes );
					if( chunk.eof ) {
						break;
					}
				}
				await session.send( "IO.close", { "handle": stream } );
				save( "trace.json", JSON.parse( Buffer.concat( parts ).toString( "utf8" ) ) );
			} else {
				save( "heap.json", await session.send( "HeapProfiler.stopSampling" ) );
			}
		} finally {
			await session.detach();
		}
	};
}

/** Save summaries separately by mode and warm-up; retain fastest and slowest run identifiers. */
export function summarize( runs, labels, complete ) {
	const groups = [];
	for( const mode of [ "representative", "precomputed", "execution", "allocation" ] ) {
		for( const warmupFrames of [ 16, 120 ] ) {
			const matches = runs.filter( run => run.mode === mode &&
				run.warmupFrames === warmupFrames );
			if( !matches.length ) {
				continue;
			}
			const extrema = {};
			for( const label of labels ) {
				const ordered = matches.filter( run => run.artifact === label ).sort( ( a, b ) =>
					g_statistics.percentile( a.tests[ 0 ].samples.map( x => x.submitMs ), 0.5 ) -
					g_statistics.percentile( b.tests[ 0 ].samples.map( x => x.submitMs ), 0.5 ) );
				extrema[ label ] = { "fast": ordered[ 0 ]?.id, "slow": ordered.at( -1 )?.id };
			}
			groups.push( { mode, warmupFrames, extrema,
				...g_statistics.campaignSummary( matches, labels, false, complete ) } );
		}
	}
	return { "diagnostic": true, "qualificationEligible": false, "complete": complete, groups };
}

/** Run seven rounds per setting and mode, with no retries, extension, or historical inputs. */
export async function experiment( config, mode, hooks = {} ) {
	if( ![ "representative", "precomputed", "execution", "allocation" ].includes( mode ) ||
		config.resume || config.smoke || config.cases.join( "," ) !== "line" ) {
		throw new Error( "Diagnostics require --cases=line, a valid mode, and a fresh output" );
	}
	const out = config.out;
	if( g_fs.existsSync( out ) && g_fs.readdirSync( out ).length ) {
		throw new Error( "Diagnostic output must be empty" );
	}
	const prepared = await g_artifacts.prepare( config );
	const instrumented = [ "execution", "allocation" ].includes( mode );
	if( instrumented ) {
		for( const artifact of prepared.identity.artifacts ) {
			prepared.files[ artifact.file ] = instrument( prepared.files[ artifact.file ] );
			artifact.uninstrumentedSha256 = artifact.sha256;
			artifact.sha256 = g_artifacts.hash( prepared.files[ artifact.file ] );
		}
	}
	prepared.identity.diagnostic = { mode, "warmupFrames": [ 16, 120 ], "rounds": 7 };
	prepared.identity.diagnosticRunnerSha256 = g_artifacts.hash(
		g_fs.readFileSync( g_url.fileURLToPath( import.meta.url ) ) );
	for( const entry of prepared.identity.files ) {
		entry.sha256 = g_artifacts.hash( prepared.files[ entry.file ] );
	}
	for( const [ name, bytes ] of Object.entries( prepared.files ) ) {
		const file = g_path.join( out, name );
		g_fs.mkdirSync( g_path.dirname( file ), { "recursive": true } );
		g_fs.writeFileSync( file, bytes );
	}
	const labels = config.sources.map( source => source.label );
	const entries = schedule( labels );
	const manifest = { "diagnostic": true, "qualificationEligible": false,
		"identity": prepared.identity, "fingerprint": g_artifacts.hash(
			JSON.stringify( prepared.identity ) ), "schedule": entries,
		"complete": false, "completed": [], "evidence": [], "interruptions": [],
		"environment": null, "created": new Date().toISOString() };
	const saveManifest = () => g_artifacts.writeJson( g_path.join( out, "manifest.json" ), manifest );
	const save = ( name, value ) => {
		const file = g_path.join( out, name );
		g_fs.mkdirSync( g_path.dirname( file ), { "recursive": true } );
		g_artifacts.writeJson( file, value );
		manifest.evidence.push( { "file": name,
			"sha256": g_artifacts.hash( g_fs.readFileSync( file ) ) } );
		saveManifest();
	};
	saveManifest();
	let browser;
	let server;
	let active;
	const runs = [];
	try {
		const served = await g_browser.serve( out, prepared.identity.files );
		server = served.server;
		const launch = hooks.launch ?? ( () =>
			g_playwright.chromium.launch( { "headless": false } ) );
		browser = await launch();
		for( const entry of entries ) {
			active = entry;
			const id = `${entry.round}-${entry.warmupFrames}-${entry.label}`;
			console.log( `Diagnostic ${mode} ${id}` );
			const artifact = prepared.identity.artifacts.find( item => item.label === entry.label );
			const options = { "warmupFrames": entry.warmupFrames,
				"expectedEnvironment": manifest.environment };
			if( mode !== "representative" ) {
				options.diagnostic = { "precomputed": mode === "precomputed" };
			}
			if( instrumented ) {
				options.startDiagnostic = ( context, page ) => capture( context, page, mode,
					( suffix, value ) => save( `profiles/${id}-${suffix}`, value ) );
			}
			const measure = hooks.measure ?? g_browser.measure;
			const result = await measure( browser, served.url, artifact, [ "line" ], options );
			const run = { ...result, ...entry, id, mode, "diagnostic": true,
				"artifact": entry.label, "sha256": artifact.sha256,
				"fingerprint": manifest.fingerprint, "date": new Date().toISOString() };
			save( `runs/${id}.json`, run );
			manifest.environment ??= result.environment;
			manifest.completed.push( id );
			runs.push( run );
			saveManifest();
		}
		manifest.complete = true;
	} catch( error ) {
		manifest.interruptions.push( { "entry": active, "error": String( error ),
			"date": new Date().toISOString(), ...error.interruption } );
		throw error;
	} finally {
		saveManifest();
		g_artifacts.writeJson( g_path.join( out, "summary.json" ),
			summarize( runs, labels, manifest.complete ) );
		await browser?.close();
		if( server ) {
			await new Promise( resolve => server.close( resolve ) );
		}
	}
	return manifest;
}

if( process.argv[ 1 ] && g_path.resolve( process.argv[ 1 ] ).toLowerCase() ===
	g_url.fileURLToPath( import.meta.url ).toLowerCase() ) {
	const args = process.argv.slice( 2 );
	const modes = args.filter( arg => arg.startsWith( "--mode=" ) );
	if( modes.length !== 1 ) {
		throw new Error( "Supply one --mode=representative|precomputed|execution|allocation" );
	}
	const config = g_run.parseArgs( args.filter( arg => !arg.startsWith( "--mode=" ) ) );
	experiment( config, modes[ 0 ].slice( 7 ) ).catch( error => {
		console.error( error );
		process.exitCode = 1;
	} );
}
