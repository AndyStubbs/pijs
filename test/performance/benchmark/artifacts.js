/** Isolated benchmark builds, content inventories, and portable campaign input identity. */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_crypto from "node:crypto";
import * as g_url from "node:url";
import * as g_esbuild from "esbuild";

const DIRNAME = g_path.dirname( g_url.fileURLToPath( import.meta.url ) );
const ROOT = g_path.resolve( DIRNAME, "../../.." );
const BUILD = {
	"format": "iife", "target": "es2020", "platform": "browser", "minify": false,
	"legalComments": "none", "charset": "utf8"
};
const RUNNER_FILES = [ "artifacts.js", "browser.js", "statistics.js", "run.js" ];

/** SHA-256 over the exact bytes used or persisted. */
function hash( value ) {
	return g_crypto.createHash( "sha256" ).update( value ).digest( "hex" );
}

function relative( root, file ) {
	return g_path.relative( root, file ).replaceAll( "\\", "/" );
}

function inventory( inputs ) {
	return Object.keys( inputs ).sort().map( file => ( {
		"file": file, "sha256": hash( inputs[ file ] )
	} ) );
}

async function bundle( root, entry, version, globalName ) {
	const inputs = {};
	const options = {
		...BUILD, "absWorkingDir": root, "entryPoints": [ entry ], "bundle": true,
		"write": false, "plugins": [ {
			"name": "benchmark-inputs",
			"setup": builder => {
				builder.onLoad( { "filter": /\.(js|json|webp|vert|frag)$/ }, args => {
					const bytes = g_fs.readFileSync( args.path );
					inputs[ relative( root, args.path ) ] = bytes;
					const extension = g_path.extname( args.path );
					if( extension === ".webp" ) {
						const data = { "data": "data:image/webp;base64," + bytes.toString( "base64" ) };
						return { "contents": "export default " + JSON.stringify( data ), "loader": "js" };
					}
					if( extension === ".vert" || extension === ".frag" ) {
						return { "contents": bytes.toString( "utf8" ), "loader": "text" };
					}
					if( extension === ".json" ) {
						return { "contents": bytes.toString( "utf8" ), "loader": "json" };
					}
					return {
						"contents": bytes.toString( "utf8" ).replaceAll(
							"__VERSION__", JSON.stringify( version )
						), "loader": "js"
					};
				} );
			}
		} ]
	};
	if( globalName ) {
		options.globalName = globalName;
	}
	const result = await g_esbuild.build( options );
	return { "bytes": result.outputFiles[ 0 ].contents, "inputs": inputs };
}

/** Bundle the ESM seed helper as a classic script that sets Math.seedrandom. */
async function bundleSeedrandom() {
	const result = await g_esbuild.build( {
		"entryPoints": [ g_path.join( ROOT, "test/libs/seedrandom.js" ) ],
		"bundle": true, "write": false, "format": "iife",
		"target": "es2020", "platform": "browser", "legalComments": "none"
	} );
	return result.outputFiles[ 0 ].text;
}

function collectMedia( dir, files, prefix ) {
	for( const entry of g_fs.readdirSync( dir, { "withFileTypes": true } ) ) {
		const file = g_path.join( dir, entry.name );
		const key = `${prefix}/${entry.name}`;
		if( entry.isDirectory() ) {
			collectMedia( file, files, key );
		} else if( entry.isFile() ) {
			files[ key ] = g_fs.readFileSync( file );
		}
	}
}

/** Build sources and the fixed plugin in memory, returning bytes to persist only for a new run. */
async function prepare( config ) {
	const files = {};
	const artifacts = [];
	for( const source of config.sources ) {
		const packageBytes = g_fs.readFileSync( g_path.join( source.directory, "package.json" ) );
		const version = JSON.parse( packageBytes ).version;
		if( !/^2\./.test( version ) ) {
			throw new Error( `Only Pi.js 2.x sources are supported: ${source.label}` );
		}
		const built = await bundle( source.directory, "src/index-full.js", version );
		built.inputs[ "package.json" ] = packageBytes;
		const file = `artifacts/core-${source.label}.js`;
		files[ file ] = built.bytes;
		artifacts.push( {
			"label": source.label, "version": version, "file": file,
			"sha256": hash( built.bytes ), "inputs": inventory( built.inputs )
		} );
	}
	const plugin = await bundle( config.pluginSource, "index.js", "" );
	files[ "artifacts/polygons.js" ] = plugin.bytes;
	const harness = await bundle( ROOT, "test/performance/benchmark/page.js", "", "benchmark" );
	files[ "harness.js" ] = harness.bytes;
	files[ "seedrandom.js" ] = await bundleSeedrandom();
	collectMedia( g_path.join( ROOT, "test/media" ), files, "test/media" );
	const runnerInputs = {};
	for( const name of RUNNER_FILES ) {
		runnerInputs[ name ] = g_fs.readFileSync( g_path.join( DIRNAME, name ) );
	}
	const playwrightPkg = JSON.parse( g_fs.readFileSync(
		g_path.join( ROOT, "node_modules/@playwright/test/package.json" ), "utf8"
	) );
	const identity = {
		"schemaVersion": 1, "sources": config.sources, "pluginSource": config.pluginSource,
		"cases": config.cases, "smoke": config.smoke,
		"warmupFrames": 16, "sampleFrames": 32, "rounds": [ 7, 14 ],
		"seedOptions": { "entropy": false }, "build": BUILD,
		"node": process.version, "esbuild": g_esbuild.version,
		"playwright": playwrightPkg.version,
		"artifacts": artifacts,
		"plugin": { "sha256": hash( plugin.bytes ), "inputs": inventory( plugin.inputs ) },
		"harness": { "sha256": hash( harness.bytes ), "inputs": inventory( harness.inputs ) },
		"runner": inventory( runnerInputs ), "files": inventory( files )
	};
	return { identity, "fingerprint": hash( JSON.stringify( identity ) ), files };
}

/** Write JSON by rename so interrupted writes cannot masquerade as complete files. */
function writeJson( file, data ) {
	g_fs.writeFileSync( `${file}.tmp`, JSON.stringify( data, null, 2 ) + "\n" );
	g_fs.renameSync( `${file}.tmp`, file );
}

/** Verify saved input bytes rather than trusting just their recorded hashes. */
function verifyFiles( out, entries ) {
	for( const entry of entries ) {
		const file = g_path.join( out, entry.file );
		if( !g_fs.existsSync( file ) || hash( g_fs.readFileSync( file ) ) !== entry.sha256 ) {
			throw new Error( `Changed or missing campaign file: ${entry.file}` );
		}
	}
}

export { ROOT, hash, prepare, writeJson, verifyFiles, bundleSeedrandom };
