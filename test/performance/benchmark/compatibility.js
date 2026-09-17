/** Short load/render and Galaga interaction checks against actual isolated build artifacts. */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_png from "pngjs";
import * as g_target from "./target.js";
import * as g_browser from "./browser.js";
import * as g_server from "../../scripts/test-server.js";
import * as g_artifacts from "./artifacts.js";

/** Reject blank screenshots without introducing cross-browser pixel baselines. */
function nonblank( bytes ) {
	const png = g_png.PNG.sync.read( bytes );
	const colors = new Set();
	for( let i = 0; i < png.data.length; i += 4 ) {
		colors.add( `${png.data[ i ]},${png.data[ i + 1 ]},${png.data[ i + 2 ]}` );
		if( colors.size >= 3 ) { return true; }
	}
	return false;
}

/** Check core loading and optionally exercise the unchanged demo with real input plugins. */
async function check( root, out, config, files, applications = false ) {
	for( const file of files ) {
		if( !g_fs.existsSync( g_path.join( root, "build", file ) ) ) {
			throw new Error( `Build artifact missing: ${file}` );
		}
	}
	const selected = g_target.target( config );
	const browser = await g_target.launch( selected );
	let server;
	const results = [];
	try {
		server = await g_server.startTestServer( root );
		for( const file of files ) {
			const context = await browser.newContext();
			try {
				const page = await context.newPage();
				page.setDefaultTimeout( 15000 );
				const errors = [];
				page.on( "pageerror", error => errors.push( String( error ) ) );
				page.on( "requestfailed", request => errors.push( request.url() ) );
				page.on( "response", response => {
					if( response.status() >= 400 ) { errors.push( response.url() ); }
				} );
				await page.route( "**/favicon.ico", route => route.fulfill( { "status": 204 } ) );
				let html = `<!doctype html><body><script src="/build/${file}"></script>`;
				if( file.includes( ".esm." ) ) {
					html = `<!doctype html><body><script type="module">
						import pi from "/build/${file}"; window.loadedPi = pi;</script>`;
				}
				await page.route( "**/qualification.html", route => route.fulfill( {
					"contentType": "text/html", "body": html
				} ) );
				await page.goto( `${server.url}/qualification.html` );
				await page.waitForFunction( () => !!window.$ );
				await g_browser.bounded( page.evaluate( async () => {
					await $.ready();
					$.screen( "160x120" );
					$.setColor( "#ff0000" );
					$.rect( 5, 5, 40, 40, "#ff0000" );
					$.setColor( "#00ff00" );
					$.line( 0, 0, 159, 119 );
					await new Promise( resolve => requestAnimationFrame( resolve ) );
				} ), 15000, "Build initialization and rendering" );
				if( file.includes( ".esm." ) && !await page.evaluate( () => window.loadedPi === $ ) ) {
					throw new Error( "ESM default export does not match the browser API" );
				}
				const environment = await g_browser.environment( browser, page );
				const screenshot = `${file}.png`;
				const bytes = await page.locator( "canvas" ).first().screenshot();
				g_fs.writeFileSync( g_path.join( out, screenshot ), bytes );
				if( !nonblank( bytes ) || errors.length ) {
					throw new Error( `Load/render failed: ${file}: ${errors.join( "; " )}` );
				}
				results.push( { file, "status": "passed", environment, screenshot,
					"sha256": g_artifacts.hash( g_fs.readFileSync( g_path.join( root, "build", file ) ) )
				} );
			} finally { await context.close(); }
		}
		if( applications ) {
			for( const lite of [ false, true ] ) {
				const page = await browser.newPage();
				page.setDefaultTimeout( 15000 );
				try {
					const errors = [];
					page.on( "pageerror", error => errors.push( String( error ) ) );
					page.on( "requestfailed", request => errors.push( request.url() ) );
					page.on( "response", response => {
						if( response.status() >= 400 ) { errors.push( response.url() ); }
					} );
					await page.route( "**/favicon.ico", route => route.fulfill( { "status": 204 } ) );
					if( lite ) {
						const demo = g_fs.readFileSync( g_path.join( root, "test/demos/galaga.html" ), "utf8" );
						const tags = [ "pi.lite.js", ...[ "keyboard", "pointer", "sound" ].map(
							name => `plugins/${name}/${name}.js` ) ].map(
							name => `<script src="../../build/${name}"></script>` ).join( "\n" );
						await page.route( "**/test/demos/galaga.html", route => route.fulfill( {
							"contentType": "text/html", "body": demo.replace(
								"<script src=\"../../build/pi.js\"></script>", tags )
						} ) );
					}
					await page.goto( `${server.url}/test/demos/galaga.html` );
					await page.waitForFunction( () => !!window.$ && !!document.querySelector( "canvas" ) );
					await g_browser.bounded( page.evaluate( () => $.ready() ), 15000, "Galaga ready" );
					await page.keyboard.press( "Enter" );
					await page.keyboard.down( "ArrowRight" );
					await page.keyboard.down( "Space" );
					await g_browser.bounded( page.evaluate( () => new Promise( resolve => {
						let frames = 0;
						function step() {
							if( ++frames === 60 ) { resolve(); } else { requestAnimationFrame( step ); }
						}
						requestAnimationFrame( step );
					} ) ), 15000, "Galaga interaction" );
					await page.keyboard.up( "ArrowRight" );
					await page.keyboard.up( "Space" );
					const screenshot = `galaga-lite-${lite}.png`;
					const bytes = await page.locator( "canvas" ).first().screenshot();
					g_fs.writeFileSync( g_path.join( out, screenshot ), bytes );
					if( !nonblank( bytes ) || errors.length ) {
						throw new Error( `Galaga failed: ${errors.join( "; " )}` );
					}
					results.push( { "application": "Galaga", lite, "status": "passed", screenshot } );
				} finally { await page.close(); }
			}
		}
		return { "status": "passed", "target": selected, results };
	} finally {
		await browser.close();
		await server?.close();
	}
}

export { check, nonblank };
