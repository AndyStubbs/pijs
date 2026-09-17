/** One local readiness pass: correctness, compatibility, one primary campaign and four smokes. */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_cp from "node:child_process";
import * as g_artifacts from "./artifacts.js";
import * as g_inputs from "./qualification-inputs.js";
import * as g_readiness from "./readiness.js";
import * as g_run from "./run.js";
import * as g_target from "./target.js";
import * as g_compatibility from "./compatibility.js";

/** Limit generated evidence to an explicitly selected, fresh ignored campaign directory. */
function parseArgs( args ) {
	const values = {};
	for( const arg of args ) {
		const match = /^--(out|baseline|archive-directory)=(.+)$/.exec( arg );
		if( !match || values[ match[ 1 ] ] ) { throw new Error( `Invalid option: ${arg}` ); }
		values[ match[ 1 ] ] = g_path.resolve( match[ 2 ] );
	}
	const campaigns = g_path.join( g_artifacts.ROOT, "test/performance/campaigns" );
	let relative = "";
	if( values.out ) { relative = g_path.relative( campaigns, values.out ); }
	if( !relative || relative === ".." || relative.startsWith( ".." + g_path.sep ) ||
		g_path.isAbsolute( relative ) ) {
		throw new Error( "Supply a fresh --out directory inside test/performance/campaigns" );
	}
	if( g_fs.existsSync( values.out ) ) { throw new Error( "Qualification output already exists" ); }
	return values;
}

/** Capture complete child output without shell parsing or release-building commands. */
function correctness( root, log ) {
	return new Promise( resolve => {
		const fd = g_fs.openSync( log, "w" );
		const child = g_cp.spawn( process.execPath, [ "scripts/test.js", "all" ], {
			"cwd": root, "env": process.env, "windowsHide": true,
			"stdio": [ "ignore", fd, fd ]
		} );
		child.once( "error", error => {
			g_fs.closeSync( fd );
			resolve( { "status": "failed", log, "error": String( error ) } );
		} );
		child.once( "exit", code => {
			g_fs.closeSync( fd );
			let status = "failed";
			if( code === 0 ) { status = "passed"; }
			resolve( { status, log, code } );
		} );
	} );
}

/** Unavailable runtimes are pending; test and rendering failures remain failures. */
function failure( error ) {
	let status = "failed";
	if( error.unavailable ||
		/Executable doesn't exist|Hardware renderer unavailable|spawn EPERM|spawn EACCES/.test(
		String( error ) ) ) { status = "pending"; }
	return { status, "error": String( error ) };
}

/** Execute a fresh pass. Existing campaigns can only be resumed through the benchmark CLI. */
async function qualify( options ) {
	const out = options.out;
	g_fs.mkdirSync( out, { "recursive": true } );
	const report = {
		"created": new Date().toISOString(), "scope": "local-readiness", "complete": false,
		"checks": [], "primary": { "status": "pending" }, "secondary": [],
		"limitations": [ "Smoke runs cannot establish a performance pass or application FPS gain." ]
	};
	const save = () => {
		report.readiness = g_readiness.assessReadiness(
			report.checks, report.primary, report.secondary
		);
		g_artifacts.writeJson( g_path.join( out, "readiness.json" ), report );
	};
	save();
	try {
		const candidate = g_path.join( out, "candidate" );
		console.log( "Snapshotting current source and qualification inputs" );
		const candidateFiles = g_inputs.snapshot( g_artifacts.ROOT, candidate );
		g_artifacts.writeJson( g_path.join( out, "candidate-files.json" ), candidateFiles );
		let baseline;
		try {
			if( options.baseline ) {
				report.baseline = { "directory": options.baseline, "origin": "explicit supplied tree" };
			} else {
				report.baseline = g_inputs.restoreBaseline( out, options[ "archive-directory" ] );
			}
			baseline = g_path.join( out, "baseline" );
			const baselineFiles = g_inputs.snapshot( report.baseline.directory, baseline );
			g_artifacts.writeJson( g_path.join( out, "baseline-files.json" ), baselineFiles );
			report.sourceDifferences = g_inputs.sourceDifferences( baselineFiles, candidateFiles );
		} catch( error ) {
			report.baseline = { "status": "pending", "error": String( error ) };
			baseline = null;
		}
		report.rollback = { "action": "identification only; no production rollback performed",
			"p1p3": report.baseline.patches ?? "Phase 2 archive: p1.patch and p3.patch",
			"p2": "docs/patches/upgrade-2.2-phase4-p2.patch" };
		save();
		console.log( "Running complete correctness workflow in isolated candidate" );
		report.checks.push( { "name": "correctness", ...await correctness( candidate,
			g_path.join( out, "correctness.log" ) ) } );
		save();
		const variants = [ "pi.js", "pi.min.js", "pi.lite.js", "pi.lite.min.js",
			"pi.esm.js", "pi.esm.min.js", "pi.lite.esm.js", "pi.lite.esm.min.js" ];
		const compatibility = async ( name, config, files, app ) => {
			const dir = g_path.join( out, name );
			g_fs.mkdirSync( dir );
			console.log( `Checking ${name}` );
			let result;
			try { result = await g_compatibility.check( candidate, dir, config, files, app ); }
			catch( error ) { result = failure( error ); }
			g_artifacts.writeJson( g_path.join( dir, "result.json" ), result );
			return { name, "evidence": dir, ...result };
		};
		report.checks.push( await compatibility( "builds-and-galaga", {}, variants, true ) );
		save();
		const canMeasure = baseline && report.checks.every( item => item.status === "passed" );
		const campaign = async ( name, flags, primary ) => {
			const dir = g_path.join( out, name );
			if( !canMeasure ) {
				return { "status": "pending", "reason": "Requires baseline and passing correctness" };
			}
			const config = g_run.parseArgs( [ `--source=baseline=${baseline}`,
				`--source=candidate=${candidate}`, `--plugin-source=${candidate}/plugins/polygons`,
				`--out=${dir}`, ...flags ] );
			try { await g_run.campaign( config ); }
			catch( error ) {
				return { ...failure( error ), "campaign": dir,
					"performance": { "status": "inconclusive" } };
			}
			const manifest = JSON.parse( g_fs.readFileSync( g_path.join( dir, "manifest.json" ) ) );
			const summary = JSON.parse( g_fs.readFileSync( g_path.join( dir, "summary.json" ) ) );
			const performance = g_readiness.assessPerformance( summary, primary );
			let status = "passed";
			if( primary ) { status = performance.status; }
			return { status, performance, "campaign": dir, "environment": manifest.environment,
				"interruptions": manifest.interruptions, "fingerprint": manifest.fingerprint };
		};
		report.primary = await campaign( "primary", [], true );
		save();
		const secondary = [
			{ "name": "firefox", "config": { "browser": "firefox" }, "flags": [ "--browser=firefox" ] },
			{ "name": "opengl", "config": { "backend": "opengl" }, "flags": [ "--backend=opengl" ] },
			{ "name": "lite", "config": {}, "flags": [ "--build=lite" ], "file": "pi.lite.js" },
			{ "name": "minified", "config": {}, "flags": [ "--minify" ], "file": "pi.min.js" }
		];
		for( const item of secondary ) {
			const check = await compatibility( `${item.name}-render`, item.config,
				[ item.file || "pi.js" ], false );
			let smoke = { "status": "pending", "reason": "Load/render check did not pass" };
			if( check.status === "passed" ) {
				smoke = await campaign( `${item.name}-smoke`, [ ...item.flags, "--smoke",
					"--cases=line,images,sprites,circle-filled" ], false );
			}
			const result = { "name": item.name, "correctness": check, "smoke": smoke,
				"status": check.status, "performance": smoke.performance ?? { "status": "inconclusive" } };
			if( smoke.status === "failed" ) { result.status = "failed"; }
			if( smoke.status === "pending" && result.status === "passed" ) { result.status = "pending"; }
			if( item.name === "opengl" ) {
				result.additionalBackend = g_target.additionalBackend(
					report.primary.environment?.browserState.renderer,
					smoke.environment?.browserState.renderer );
				if( !result.additionalBackend && result.status === "passed" ) {
					result.status = "pending";
					result.reason = "Distinct hardware backend not established";
				}
			}
			report.secondary.push( result );
			save();
		}
		report.complete = true;
	} catch( error ) {
		report.error = String( error );
		throw error;
	} finally {
		report.updated = new Date().toISOString();
		save();
		const files = g_inputs.inventory( out ).filter( item => item.file !== "evidence-files.json" );
		g_artifacts.writeJson( g_path.join( out, "evidence-files.json" ), files );
	}
	return report;
}

export { parseArgs, qualify, failure };

if( process.argv[ 1 ] && g_path.resolve( process.argv[ 1 ] ).toLowerCase() ===
	g_url.fileURLToPath( import.meta.url ).toLowerCase() ) {
	qualify( parseArgs( process.argv.slice( 2 ) ) ).then( report => {
		console.log( JSON.stringify( report.readiness ) );
		if( report.readiness.local !== "passed" ) { process.exitCode = 1; }
	} ).catch( error => { console.error( error ); process.exitCode = 1; } );
}
