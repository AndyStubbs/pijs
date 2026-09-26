/**
 * Pi.js Size Diff
 *
 * Compares two size reports written by `npm run size` and prints a Markdown table of the byte
 * and gzip changes for each main bundle and plugin. CI appends the table to the job summary.
 *
 * Usage: npm run size:diff -- <base-report.json> <head-report.json>
 */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_url from "node:url";

/**
 * Validates that a parsed value is a size report with bundle and plugin sizes.
 *
 * @param {Object} report - Parsed size report
 * @param {string} label - Report name for error messages
 * @returns {Object} The report
 */
function checkReport( report, label ) {
	const isObject = value => {
		return value !== null && typeof value === "object" && !Array.isArray( value );
	};
	if( !isObject( report ) || !isObject( report.bundles ) || !isObject( report.plugins ) ) {
		throw new TypeError( `size diff: ${label} is not a size report (bundles and plugins).` );
	}
	for( const group of [ "bundles", "plugins" ] ) {
		for( const [ name, size ] of Object.entries( report[ group ] ) ) {
			if( !isObject( size ) || !Number.isFinite( size.bytes ) ||
				!Number.isFinite( size.gzip )
			) {
				throw new TypeError( `size diff: ${label} ${group}.${name} has no byte sizes.` );
			}
		}
	}
	return report;
}

/**
 * Lists the size changes between two reports, bundles first, then plugins.
 *
 * Names keep the head report's order, followed by names only the base report has. A size is
 * null where a report lacks the file.
 *
 * @param {Object} base - Base size report
 * @param {Object} head - Head size report
 * @returns {Object[]} Rows of { name, base, head } where base and head are sizes or null
 */
function diffSizeReports( base, head ) {
	checkReport( base, "base report" );
	checkReport( head, "head report" );
	const rows = [];
	for( const [ group, prefix ] of [ [ "bundles", "" ], [ "plugins", "plugins/" ] ] ) {
		const names = Object.keys( head[ group ] );
		for( const name of Object.keys( base[ group ] ) ) {
			if( !names.includes( name ) ) {
				names.push( name );
			}
		}
		for( const name of names ) {
			rows.push( {
				"name": prefix + name,
				"base": base[ group ][ name ] || null,
				"head": head[ group ][ name ] || null
			} );
		}
	}
	return rows;
}

function formatBytes( bytes ) {
	return bytes.toLocaleString( "en-US" );
}

/**
 * Formats a signed change with its percentage of the base size.
 *
 * @param {number} from - Base size in bytes
 * @param {number} to - Head size in bytes
 * @returns {string} Change such as "+134 (+0.06%)", or "0"
 */
function formatChange( from, to ) {
	const change = to - from;
	if( change === 0 ) {
		return "0";
	}
	let sign = "-";
	if( change > 0 ) {
		sign = "+";
	}
	if( from === 0 ) {
		return `${sign}${formatBytes( Math.abs( change ) )}`;
	}
	const percent = ( Math.abs( change ) / from * 100 ).toFixed( 2 );
	return `${sign}${formatBytes( Math.abs( change ) )} (${sign}${percent}%)`;
}

/**
 * Formats the size changes between two reports as Markdown.
 *
 * @param {Object} base - Base size report
 * @param {Object} head - Head size report
 * @returns {string} Markdown with a heading, a summary line, and one table row per file
 */
function formatSizeDiff( base, head ) {
	const rows = diffSizeReports( base, head );
	const lines = [
		"### Size diff",
		"",
		"Minified IIFE bytes and gzip level 9. Changes are head minus base.",
		""
	];
	const changed = rows.filter( row => {
		return !row.base || !row.head || row.base.bytes !== row.head.bytes ||
			row.base.gzip !== row.head.gzip;
	} );
	if( changed.length === 0 ) {
		lines.push( "No size changes.", "" );
	} else {
		lines.push( `${changed.length} of ${rows.length} files changed.`, "" );
	}
	lines.push( "| File | Bytes | Change | Gzip | Change |" );
	lines.push( "| --- | ---: | ---: | ---: | ---: |" );
	for( const row of rows ) {
		if( !row.base ) {
			lines.push( `| ${row.name} | ${formatBytes( row.head.bytes )} | new | ` +
				`${formatBytes( row.head.gzip )} | new |` );
		} else if( !row.head ) {
			lines.push( `| ${row.name} | removed | -${formatBytes( row.base.bytes )} | ` +
				`removed | -${formatBytes( row.base.gzip )} |` );
		} else {
			lines.push( `| ${row.name} | ${formatBytes( row.head.bytes )} | ` +
				`${formatChange( row.base.bytes, row.head.bytes )} | ` +
				`${formatBytes( row.head.gzip )} | ` +
				`${formatChange( row.base.gzip, row.head.gzip )} |` );
		}
	}
	return lines.join( "\n" ) + "\n";
}

function readReport( file, label ) {
	let text;
	try {
		text = g_fs.readFileSync( file, "utf8" );
	} catch( error ) {
		throw new Error( `size diff: cannot read ${label} ${file}: ${error.message}` );
	}
	try {
		return JSON.parse( text );
	} catch( error ) {
		throw new Error( `size diff: ${label} ${file} is not JSON: ${error.message}` );
	}
}

function isMainModule() {
	const entry = process.argv[ 1 ];
	if( !entry ) {
		return false;
	}
	return g_url.pathToFileURL( g_path.resolve( entry ) ).href === import.meta.url;
}

if( isMainModule() ) {
	const files = process.argv.slice( 2 );
	try {
		if( files.length !== 2 ) {
			throw new Error(
				"Usage: npm run size:diff -- <base-report.json> <head-report.json>"
			);
		}
		const base = readReport( files[ 0 ], "base report" );
		const head = readReport( files[ 1 ], "head report" );
		process.stdout.write( formatSizeDiff( base, head ) );
	} catch( error ) {
		console.error( `✗ ${error.message}` );
		process.exit( 1 );
	}
}

export { diffSizeReports, formatSizeDiff };
