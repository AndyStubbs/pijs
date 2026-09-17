/** Resolve mode-specific candidates for explicit development-server review actions. */
import * as g_path from "node:path";

/** Redirect old report bookmarks before the server can serve obsolete result files. */
export function redirectLegacyReport( req, res ) {
	if( ![ "GET", "HEAD" ].includes( req.method ) ) { return false; }
	const pathname = new URL( req.url, "http://localhost" ).pathname;
	const targets = {
		"/test/results.html": "/test/test-results/full/results.html",
		"/test/results-plugins.html": "/test/test-results/plugins/results.html",
		"/test/playwright-report": "/test/playwright-report/full/",
		"/test/playwright-report/": "/test/playwright-report/full/",
		"/test/playwright-report/index.html": "/test/playwright-report/full/"
	};
	const target = targets[ pathname ];
	if( !target ) { return false; }
	res.writeHead( 302, { "Location": target, "Cache-Control": "no-store" } );
	res.end();
	return true;
}

/** Return the candidate and shared approved PNG paths, rejecting invalid selectors. */
export function reviewPaths( root, mode, baseName ) {
	if( ![ "full", "lite", "plugins" ].includes( mode ) ) {
		throw new Error( "Invalid test mode" );
	}
	if( typeof baseName !== "string" || !/^[\w-]+$/.test( baseName ) ) {
		throw new Error( "Invalid base name" );
	}
	return {
		"sourcePath": g_path.join( root, "test/test-results", mode,
			"screenshots", `${baseName}.png` ),
		"destPath": g_path.join( root, "test/tests/screenshots", `${baseName}.png` )
	};
}
