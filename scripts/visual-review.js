/** Resolve mode-specific candidates for explicit development-server review actions. */
import * as g_path from "node:path";

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
