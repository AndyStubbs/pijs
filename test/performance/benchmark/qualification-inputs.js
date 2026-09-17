/** Isolated local qualification snapshots and verified historical baseline restoration. */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_cp from "node:child_process";
import * as g_artifacts from "./artifacts.js";

/** Inventory regular files without following links into dependency or external directories. */
function inventory( root, prefix = "" ) {
	const entries = [];
	for( const entry of g_fs.readdirSync( g_path.join( root, prefix ), { "withFileTypes": true } ) ) {
		const file = g_path.posix.join( prefix, entry.name );
		if( entry.isDirectory() ) { entries.push( ...inventory( root, file ) ); }
		if( entry.isFile() ) {
			const bytes = g_fs.readFileSync( g_path.join( root, file ) );
			entries.push( { file, "bytes": bytes.length, "sha256": g_artifacts.hash( bytes ) } );
		}
	}
	return entries.sort( ( a, b ) => a.file.localeCompare( b.file ) );
}

/** Copy required source, fixtures and tooling, excluding generated and archived campaign files. */
function snapshot( root, destination ) {
	const excluded = new RegExp( "^(build|node_modules|\\.git|\\.codex|\\.agents|releases)(/|$)|" +
		"^test/(performance/(campaigns|investigation|data)|test-results|playwright-report|" +
		"tests/(logs|screenshots/new))(/|$)|(^|/)dist(/|$)|\\.log$" );
	const names = [ "src", "plugins", "scripts", "test", "tools", "docs", "metadata", "package.json",
		"package-lock.json", "playwright.config.js", "server.js", ".editorconfig", ".gitignore" ];
	g_fs.mkdirSync( destination, { "recursive": true } );
	const copy = file => {
		const relative = g_path.relative( root, file ).replaceAll( "\\", "/" );
		const stat = g_fs.lstatSync( file );
		if( excluded.test( relative ) || stat.isSymbolicLink() ) { return; }
		const to = g_path.join( destination, relative );
		if( stat.isDirectory() ) {
			g_fs.mkdirSync( to, { "recursive": true } );
			for( const name of g_fs.readdirSync( file ) ) { copy( g_path.join( file, name ) ); }
		} else if( stat.isFile() ) {
			g_fs.copyFileSync( file, to );
		}
	};
	for( const name of names ) {
		const from = g_path.join( root, name );
		if( !g_fs.existsSync( from ) ) { continue; }
		copy( from );
	}
	// The package consumer tests read this existing input; release generation is never invoked.
	const base = g_path.join( root, "releases/base-package.json" );
	if( g_fs.existsSync( base ) ) {
		g_fs.mkdirSync( g_path.join( destination, "releases" ) );
		g_fs.copyFileSync( base, g_path.join( destination, "releases/base-package.json" ) );
	}
	const files = inventory( destination );
	g_fs.symlinkSync( g_path.join( g_artifacts.ROOT, "node_modules" ),
		g_path.join( destination, "node_modules" ), "junction" );
	return files;
}

/** Restore and verify every archived file before selecting the pre-optimization baseline. */
function restoreBaseline( out, directory ) {
	const evidence = g_path.join( g_artifacts.ROOT, "test/performance/evidence" );
	const index = JSON.parse( g_fs.readFileSync( g_path.join( evidence, "index.json" ) ) );
	const entry = index.campaigns.find( item => item.campaign === "phase2-20260916" );
	const archive = g_path.join( directory || index.archiveDirectory, entry.archive );
	if( !g_fs.existsSync( archive ) ) {
		throw new Error( `Archive unavailable: ${archive}; ` +
			"supply --baseline=known-pre-optimization-tree" );
	}
	if( g_artifacts.hash( g_fs.readFileSync( archive ) ) !== entry.sha256 ) {
		throw new Error( "Phase 2 archive checksum mismatch" );
	}
	const destination = g_path.join( out, "archive-phase2" );
	const quote = value => "'" + value.replaceAll( "'", "''" ) + "'";
	if( process.platform !== "win32" ) {
		throw new Error( "Supply --baseline on this platform after verifying the archive inventory" );
	}
	g_cp.execFileSync( "powershell.exe", [ "-NoProfile", "-NonInteractive", "-Command",
		`Expand-Archive -LiteralPath ${quote( archive )} -DestinationPath ${quote( destination )}`
	], { "windowsHide": true, "timeout": 120000, "stdio": "pipe" } );
	const expected = JSON.parse( g_fs.readFileSync( g_path.join( evidence, entry.inventory ) ) );
	const actual = inventory( destination );
	const expectedMap = new Map( expected.map( item => [ item.path, item ] ) );
	if( actual.length !== expected.length || actual.some( item => {
		const saved = expectedMap.get( item.file );
		return !saved || saved.bytes !== item.bytes || saved.sha256 !== item.sha256;
	} ) ) { throw new Error( "Restored Phase 2 inventory mismatch" ); }
	return { "directory": g_path.join( destination, "sources/baseline" ), archive,
		"sha256": entry.sha256, "inventory": entry.inventory, "verifiedFiles": actual.length,
		"patches": [ "p1.patch", "p3.patch" ].map( name => ( {
			"file": g_path.join( destination, name ),
			"sha256": g_artifacts.hash( g_fs.readFileSync( g_path.join( destination, name ) ) )
		} ) ) };
}

/** Record every runtime source difference, including unrelated changes, without invoking Git. */
function sourceDifferences( before, after ) {
	const relevant = item => /^(src\/|plugins\/|package\.json$)/.test( item.file );
	const left = new Map( before.filter( relevant ).map( item => [ item.file, item.sha256 ] ) );
	const right = new Map( after.filter( relevant ).map( item => [ item.file, item.sha256 ] ) );
	return Array.from( new Set( [ ...left.keys(), ...right.keys() ] ) ).sort().filter(
		file => left.get( file ) !== right.get( file ) ).map( file => ( {
			file, "baseline": left.get( file ) ?? null, "candidate": right.get( file ) ?? null
		} ) );
}

export { inventory, snapshot, restoreBaseline, sourceDifferences };
