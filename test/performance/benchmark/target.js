/** Browser launch identity and conservative hardware-backend classification. */
import * as g_fs from "node:fs";
import * as g_crypto from "node:crypto";
import * as g_playwright from "@playwright/test";

/** Resolve supported targets without silently substituting another browser or backend. */
function target( config = {} ) {
	const browser = config.browser ?? "chromium";
	const backend = config.backend ?? "default";
	if( ![ "chromium", "firefox" ].includes( browser ) ||
		![ "default", "d3d11", "opengl" ].includes( backend ) ||
		( browser === "firefox" && backend !== "default" ) ) {
		throw new Error( "Invalid browser/backend combination" );
	}
	const options = { "headless": false, "timeout": 30000 };
	if( backend !== "default" ) {
		let angle = backend;
		if( backend === "opengl" ) { angle = "gl"; }
		options.args = [ `--use-angle=${angle}` ];
	}
	const executable = g_playwright[ browser ].executablePath();
	let sha256 = null;
	if( g_fs.existsSync( executable ) ) {
		sha256 = g_crypto.createHash( "sha256" ).update(
			g_fs.readFileSync( executable )
		).digest( "hex" );
	}
	return { browser, backend, options, executable, sha256 };
}

/** Launch the exact Playwright target recorded in the campaign identity. */
async function launch( selected ) {
	try {
		return await g_playwright[ selected.browser ].launch( selected.options );
	} catch( error ) {
		if( /Timeout|Executable doesn't exist|spawn EPERM|spawn EACCES/.test( String( error ) ) ) {
			error.unavailable = true;
		}
		throw error;
	}
}

/** Unknown and software backends never establish additional hardware coverage. */
function backendOf( renderer ) {
	if( !renderer || /swiftshader|software|llvmpipe|lavapipe|basic render/i.test( renderer ) ) {
		return null;
	}
	if( /Direct3D11|D3D11/i.test( renderer ) ) { return "d3d11"; }
	if( /OpenGL/i.test( renderer ) ) { return "opengl"; }
	if( /Vulkan/i.test( renderer ) ) { return "vulkan"; }
	if( /Metal/i.test( renderer ) ) { return "metal"; }
	return null;
}

/** Compare observed backends, never the requested launch flags alone. */
function additionalBackend( primary, secondary ) {
	const before = backendOf( primary );
	const after = backendOf( secondary );
	return before !== null && after !== null && before !== after;
}

export { target, launch, backendOf, additionalBackend };
