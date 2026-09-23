/** Read-only loopback server owned by a visual test run. */
import * as g_http from "node:http";
import * as g_fs from "node:fs/promises";
import * as g_path from "node:path";

/** Start an isolated server; callers must await close() in a finally block. */
export async function startTestServer( root ) {
	const resolvedRoot = await g_fs.realpath( root );
	const types = {
		".html": "text/html", ".js": "application/javascript", ".json": "application/json",
		".css": "text/css", ".png": "image/png", ".webp": "image/webp",
		".jpg": "image/jpeg", ".svg": "image/svg+xml", ".wav": "audio/wav",
		".mp3": "audio/mpeg", ".woff": "font/woff", ".woff2": "font/woff2"
	};
	const server = g_http.createServer( async ( request, response ) => {
		try {
			if( ![ "GET", "HEAD" ].includes( request.method ) ) {
				response.writeHead( 405 ).end();
				return;
			}
			const url = new URL( request.url, "http://localhost" );
			const file = g_path.resolve( resolvedRoot, "." + decodeURIComponent( url.pathname ) );
			const realFile = await g_fs.realpath( file );
			if( !realFile.startsWith( resolvedRoot + g_path.sep ) ) {
				response.writeHead( 403 ).end();
				return;
			}
			let body = await g_fs.readFile( realFile );
			const headers = {
				"Content-Type": types[ g_path.extname( realFile ) ] || "application/octet-stream",
				"Accept-Ranges": "bytes"
			};

			// Single byte ranges, which media elements need to seek
			let status = 200;
			const range = /^bytes=(\d*)-(\d*)$/.exec( request.headers.range || "" );
			if( range && ( range[ 1 ] !== "" || range[ 2 ] !== "" ) ) {
				let start = Number( range[ 1 ] );
				let end = body.length - 1;
				if( range[ 1 ] === "" ) {
					start = Math.max( body.length - Number( range[ 2 ] ), 0 );
				} else if( range[ 2 ] !== "" ) {
					end = Math.min( Number( range[ 2 ] ), end );
				}
				if( start > end ) {
					response.writeHead( 416, { "Content-Range": `bytes */${body.length}` } ).end();
					return;
				}
				headers[ "Content-Range" ] = `bytes ${start}-${end}/${body.length}`;
				body = body.subarray( start, end + 1 );
				status = 206;
			}
			headers[ "Content-Length" ] = body.length;
			response.writeHead( status, headers );
			if( request.method === "HEAD" ) {
				response.end();
			} else {
				response.end( body );
			}
		} catch( error ) {
			let status = 500;
			if( [ "ENOENT", "ENOTDIR", "EISDIR" ].includes( error.code ) ) {
				status = 404;
			} else if( error instanceof URIError ) {
				status = 400;
			}
			response.writeHead( status ).end();
		}
	} );
	await new Promise( ( resolve, reject ) => {
		server.once( "error", reject );
		server.listen( 0, "127.0.0.1", resolve );
	} );
	return {
		"url": `http://127.0.0.1:${server.address().port}`,
		"close": () => new Promise( ( resolve, reject ) => {
			server.close( error => {
				if( error ) { reject( error ); } else { resolve(); }
			} );
			server.closeAllConnections();
		} )
	};
}

/** Always release the server, including when a child test process fails. */
export async function withTestServer( root, run ) {
	const server = await startTestServer( root );
	try {
		return await run( server.url );
	} finally {
		await server.close();
	}
}
