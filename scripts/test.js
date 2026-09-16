/** Cross-platform correctness workflow; performance measurements run separately. */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";
import * as g_childProcess from "node:child_process";
import * as g_server from "../test/scripts/test-server.js";

const ROOT = g_path.resolve( g_url.fileURLToPath( new URL( "..", import.meta.url ) ) );
const PLAYWRIGHT = g_path.join( ROOT, "node_modules/playwright/cli.js" );

/** Discover only immediate maintained files and assign every test exactly once. */
export function discoverTests( root = ROOT ) {
	const groups = { "unit": [], "browser": [], "types": [] };
	for( const directory of [ "test/unit", "test/scripts" ] ) {
		for( const entry of g_fs.readdirSync( g_path.join( root, directory ), {
			"withFileTypes": true
		} ) ) {
			if( !entry.isFile() || !entry.name.endsWith( ".test.js" ) ) { continue; }
			let group = "unit";
			if( entry.name === "package-types-consumer.test.js" ) {
				group = "types";
			} else if( entry.name.endsWith( "-browser.test.js" ) ) {
				group = "browser";
			}
			groups[ group ].push( `${directory}/${entry.name}` );
		}
	}
	for( const files of Object.values( groups ) ) { files.sort(); }
	return groups;
}

/** Run a Node entry point without shell parsing on Windows or POSIX. */
export function runNode( args, env = {}, spawn = g_childProcess.spawn ) {
	return new Promise( ( resolve, reject ) => {
		const child = spawn( process.execPath, args, {
			"cwd": ROOT, "stdio": "inherit", "shell": false,
			"env": {
				...process.env, "PI_TEST_TYPE": "core", "PI_TEST_LITE": "false",
				"PI_TEST_MODE": "full", "PI_TEST_STRICT": "false", "PI_TEST_BASE_URL": "", ...env
			}
		} );
		let interrupted = false;
		const interrupt = () => {
			interrupted = true;
			child.kill( "SIGTERM" );
		};
		process.on( "SIGINT", interrupt );
		process.on( "SIGTERM", interrupt );
		const cleanup = () => {
			process.off( "SIGINT", interrupt );
			process.off( "SIGTERM", interrupt );
		};
		child.once( "error", error => { cleanup(); reject( error ); } );
		child.once( "close", ( code, signal ) => {
			cleanup();
			if( code === 0 && !interrupted ) {
				resolve();
			} else {
				reject( new Error( `Command failed (${signal || code}): node ${args.join( " " )}` ) );
			}
		} );
	} );
}

/** Execute stages sequentially and retain the name of the failing stage. */
export async function runStages( stages ) {
	for( const [ name, run ] of stages ) {
		console.log( `\n=== ${name} ===` );
		try {
			await run();
		} catch( error ) {
			throw new Error( `${name}: ${error.message}`, { "cause": error } );
		}
	}
}

/** Parse orchestration options; visual filters are forwarded as individual arguments. */
export function parseOptions( args ) {
	const [ command = "all", ...rest ] = args;
	const commands = [ "all", "unit", "browser", "types", "visual", "patch",
		"benchmark", "performance-ui", "metadata" ];
	if( !commands.includes( command ) ) { throw new Error( `Unknown suite: ${command}` ); }
	const modes = [];
	const forwarded = [];
	for( const arg of rest ) {
		if( arg.startsWith( "--mode=" ) ) {
			const mode = arg.slice( 7 );
			if( ![ "full", "lite", "plugins" ].includes( mode ) || modes.length ) {
				throw new Error( "Choose one mode: full, lite, or plugins." );
			}
			modes.push( mode );
		} else {
			forwarded.push( arg );
		}
	}
	if( command !== "visual" && rest.length ) {
		throw new Error( "Filters and modes require test:visual (or a visual alias)." );
	}
	if( !modes.length ) { modes.push( "full", "lite", "plugins" ); }
	return { "command": command, "modes": modes, "forwarded": forwarded };
}

/** Execute a selected correctness workflow with fresh artifacts where required. */
export async function main( args = process.argv.slice( 2 ) ) {
	const { command, modes, forwarded } = parseOptions( args );
	const groups = discoverTests();
	const stages = [];
	const add = ( name, run ) => stages.push( [ name, run ] );
	const nodeTests = files => {
		if( !files.length ) { throw new Error( "No maintained tests found for this stage." ); }
		return runNode( [ "--test", "--test-concurrency=1", ...files ] );
	};
	const isList = command === "visual" && forwarded.includes( "--list" );
	if( [ "all", "patch", "visual" ].includes( command ) && !isList ) {
		add( "Test artifact build", () => runNode( [ "scripts/build.js", "--test-only" ] ) );
	}
	if( [ "all", "patch", "unit" ].includes( command ) ) {
		add( "Node tests", () => nodeTests( groups.unit ) );
	}
	if( [ "all", "patch", "browser" ].includes( command ) ) {
		add( "Browser regressions", () => nodeTests( groups.browser ) );
	}
	if( [ "all", "types" ].includes( command ) ) {
		add( "Metadata and types", async () => {
			await runNode( [ "scripts/generate-metadata.js", "--test-only" ] );
			await runNode( [ "scripts/validate-metadata-output.js" ] );
			await runNode( [ "scripts/validate-type-definitions.js" ] );
			await nodeTests( groups.types );
		} );
	}
	if( command === "benchmark" ) {
		add( "Benchmark correctness", () => nodeTests(
			[ ...groups.unit, ...groups.browser ].filter( file => /\/benchmark[^/]*\.test.js$/.test( file ) )
		) );
	}
	if( command === "performance-ui" ) {
		add( "Performance UI", () => nodeTests(
			[ "test/unit/performance-report-browser.test.js" ]
		) );
	}
	if( command === "metadata" ) {
		add( "Metadata regressions", () => nodeTests( [ "test/scripts/generate-metadata.test.js" ] ) );
	}
	if( [ "all", "visual" ].includes( command ) ) {
		for( const mode of modes ) {
			add( `Visual ${mode}`, async () => {
				const env = { "PI_TEST_MODE": mode, "PI_TEST_STRICT": "false" };
				if( command === "all" ) { env.PI_TEST_STRICT = "true"; }
				const args = [ PLAYWRIGHT, "test", ...forwarded ];
				if( isList ) {
					if( !forwarded.some( arg => arg.startsWith( "--reporter" ) ) ) {
						args.push( "--reporter=list" );
					}
					await runNode( args, env );
					return;
				}
				await g_server.withTestServer( ROOT, url => runNode( args, {
					...env, "PI_TEST_BASE_URL": url
				} ) );
			} );
		}
	}
	await runStages( stages );
}

if( process.argv[ 1 ] && g_url.pathToFileURL( g_path.resolve( process.argv[ 1 ] ) ).href ===
	import.meta.url ) {
	main().catch( error => { console.error( error.message ); process.exitCode = 1; } );
}
