/** Read-only campaign server and bounded browser measurement with startup diagnostics. */
import * as g_fs from "node:fs";
import * as g_path from "node:path";
import * as g_http from "node:http";
import * as g_os from "node:os";
import * as g_cp from "node:child_process";

/** Serve only snapshotted benchmark files over loopback. */
async function serve( out, entries ) {
	const allowed = new Set( entries.map( entry => `/${entry.file}` ) );
	const server = g_http.createServer( ( req, res ) => {
		let pathname;
		try {
			pathname = decodeURIComponent( new URL( req.url, "http://localhost" ).pathname );
		} catch {
			res.writeHead( 400 );
			res.end();
			return;
		}
		if( req.method !== "GET" || !allowed.has( pathname ) ) {
			res.writeHead( 404 );
			res.end();
			return;
		}
		const file = g_path.resolve( out, `.${pathname}` );
		if( !file.startsWith( out + g_path.sep ) ) {
			res.writeHead( 404 );
			res.end();
			return;
		}
		const types = {
			".js": "text/javascript", ".png": "image/png", ".webp": "image/webp",
			".jpg": "image/jpeg", ".json": "application/json"
		};
		res.setHeader( "Content-Type", types[ g_path.extname( file ) ] || "application/octet-stream" );
		res.setHeader( "Cache-Control", "no-store" );
		const stream = g_fs.createReadStream( file );
		stream.on( "error", () => { res.destroy(); } );
		stream.pipe( res );
	} );
	await new Promise( ( resolve, reject ) => {
		server.once( "error", reject );
		server.listen( 0, "127.0.0.1", resolve );
	} );
	return { server, "url": `http://127.0.0.1:${server.address().port}` };
}

/** Bound async page work, including ready promises and animation loops. */
async function bounded( promise, timeoutMs, stage ) {
	let timer;
	try {
		return await Promise.race( [ promise, new Promise( ( resolve, reject ) => {
			timer = setTimeout( () => reject( new Error( `Timed out: ${stage}` ) ), timeoutMs );
		} ) ] );
	} finally {
		clearTimeout( timer );
	}
}

/** Capture stable environment fields separately from each run's timestamp. */
async function environment( browser, page ) {
	let power = null;
	if( process.platform === "win32" ) {
		try {
			power = g_cp.execFileSync( "powercfg", [ "/getactivescheme" ], {
				"windowsHide": true, "timeout": 5000, "stdio": [ "ignore", "pipe", "pipe" ]
			} ).toString().trim();
		} catch {
			power = null;
		}
	}
	return {
		"browser": browser.version(), "platform": process.platform, "os": g_os.release(),
		"cpu": g_os.cpus()[ 0 ]?.model, "logicalCpus": g_os.cpus().length,
		"memory": g_os.totalmem(), "power": power,
		"browserState": await page.evaluate( () => {
			const gl = $.getScreen( 0 ).canvas().getContext( "webgl2" );
			const info = gl.getExtension( "WEBGL_debug_renderer_info" );
			return {
				"visibility": document.visibilityState, "dpr": devicePixelRatio,
				"screen": [ screen.width, screen.height ], "viewport": [ innerWidth, innerHeight ],
				"renderer": info && gl.getParameter( info.UNMASKED_RENDERER_WEBGL ),
				"vendor": info && gl.getParameter( info.UNMASKED_VENDOR_WEBGL )
			};
		} )
	};
}

/** Reject non-hardware or background measurements; software is allowed only by test callers. */
function validateEnvironment( env, allowSoftware = false ) {
	if( env.browserState.visibility !== "visible" ) {
		throw new Error( "Benchmark page is hidden" );
	}
	if( !allowSoftware && ( !env.browserState.renderer ||
		/swiftshader|software|llvmpipe|lavapipe|basic render/i.test( env.browserState.renderer ) ) ) {
		throw new Error( "Hardware renderer unavailable" );
	}
}

/** Run a complete artifact/round; failed calls carry structured interruption details. */
async function measure( browser, url, artifact, cases, options = {} ) {
	const context = await browser.newContext( {
		"viewport": { "width": 1000, "height": 680 },
		"screen": { "width": 1000, "height": 680 }, "deviceScaleFactor": 1
	} );
	const page = await context.newPage();
	const errors = [];
	const requests = [];
	const timeoutMs = options.timeoutMs ?? 30000;
	let stage = "navigation";
	let env = null;
	page.on( "pageerror", error => errors.push( String( error ) ) );
	page.on( "requestfailed", request => requests.push( {
		"url": request.url(), "error": request.failure()?.errorText
	} ) );
	page.on( "response", response => {
		if( response.status() >= 400 ) {
			requests.push( { "url": response.url(), "status": response.status() } );
		}
	} );
	try {
		await page.addInitScript( () => {
			window.benchmarkHidden = false;
			document.addEventListener( "visibilitychange", () => {
				if( document.visibilityState !== "visible" ) {
					window.benchmarkHidden = true;
				}
			} );
		} );
		await page.route( "**/test/performance/index.html", route => route.fulfill( {
			"contentType": "text/html", "body": `<!doctype html><html><head>
			<link rel="icon" href="data:,"></head><body>
			<script src="/seedrandom.js"></script>
			<script src="/${artifact.file}"></script>
			<script src="/artifacts/polygons.js"></script>
			<script src="/harness.js"></script></body></html>`
		} ) );
		if( options.beforeNavigate ) {
			await options.beforeNavigate( page );
		}
		await page.goto( `${url}/test/performance/index.html`, { "timeout": timeoutMs } );
		await page.bringToFront();
		stage = "initialization";
		const proof = await bounded( page.evaluate( () => benchmark.init() ), timeoutMs, stage );
		env = await environment( browser, page );
		validateEnvironment( env, options.allowSoftware );
		if( options.expectedEnvironment &&
			JSON.stringify( env ) !== JSON.stringify( options.expectedEnvironment ) ) {
			throw new Error( "Campaign environment changed; start a new campaign" );
		}
		if( errors.length || requests.length ) {
			throw new Error( "Initialization produced browser or asset errors" );
		}
		const tests = [];
		for( const name of cases ) {
			stage = `case:${name}`;
			tests.push( await bounded( page.evaluate( name => benchmark.runCase( name ), name ),
				timeoutMs, stage ) );
			if( errors.length || requests.length ) {
				throw new Error( `Browser or asset errors during ${name}` );
			}
		}
		if( await page.evaluate( () => window.benchmarkHidden ) || tests.some( test =>
			test.samples?.some( sample => sample.visibility !== "visible" ) ) ) {
			throw new Error( "Benchmark page became hidden" );
		}
		return { "environment": env, "seedProof": proof, "tests": tests };
	} catch( error ) {
		error.interruption = {
			"stage": stage, "error": String( error ), "pageErrors": errors,
			"failedRequests": requests, "environment": env
		};
		throw error;
	} finally {
		await context.close();
	}
}

export { serve, bounded, environment, validateEnvironment, measure };
