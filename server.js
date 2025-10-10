/**
 * Pi.js Development Server
 * 
 * Simple HTTP server for local development and testing.
 */

const http = require( "http" );
const fs = require( "fs" );
const path = require( "path" );

const PORT = 8080;

const mimeTypes = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".wav": "audio/wav",
	".mp3": "audio/mpeg",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".toml": "text/plain"
};

const server = http.createServer( ( req, res ) => {
	console.log( `${req.method} ${req.url}` );

	let filePath = "." + req.url;
	if( filePath === "./" ) {
		filePath = "./index.html";
	}

	const extname = String( path.extname( filePath ) ).toLowerCase();
	const contentType = mimeTypes[ extname ] || "application/octet-stream";

	fs.readFile( filePath, ( error, content ) => {
		if( error ) {
			if( error.code === "ENOENT" ) {
				res.writeHead( 404, { "Content-Type": "text/html" } );
				res.end( "<h1>404 Not Found</h1>", "utf-8" );
			} else {
				res.writeHead( 500 );
				res.end( `Server Error: ${error.code}`, "utf-8" );
			}
		} else {
			res.writeHead( 200, { 
				"Content-Type": contentType,
				"Access-Control-Allow-Origin": "*"
			} );
			res.end( content, "utf-8" );
		}
	} );
} );

server.listen( PORT, () => {
	console.log( `Pi.js development server running at http://localhost:${PORT}/` );
	console.log( `Press Ctrl+C to stop` );
} );

