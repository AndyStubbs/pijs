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

function generateDirectoryListing( dirPath, urlPath ) {
	const items = fs.readdirSync( dirPath );
	
	// Filter out hidden files and sort
	const files = [];
	const dirs = [];
	
	for( const item of items ) {
		if( item.startsWith( "." ) || item === "node_modules" ) {
			continue;
		}
		
		const itemPath = path.join( dirPath, item );
		const stat = fs.statSync( itemPath );
		
		if( stat.isDirectory() ) {
			dirs.push( item );
		} else {
			files.push( { "name": item, "size": stat.size } );
		}
	}
	
	dirs.sort();
	files.sort( ( a, b ) => a.name.localeCompare( b.name ) );
	
	// Ensure urlPath has trailing slash
	if( !urlPath.endsWith( "/" ) ) {
		urlPath += "/";
	}
	
	// Generate HTML
	const parentLink = urlPath !== "/" ? 
		`<li><a href="${path.dirname( urlPath )}/">📁 ..</a></li>` : "";
	
	const dirLinks = dirs.map( dir => 
		`<li><a href="${urlPath}${dir}/">📁 ${dir}/</a></li>`
	).join( "\n\t\t\t" );
	
	const fileLinks = files.map( file => {
		const sizeKB = ( file.size / 1024 ).toFixed( 2 );
		return `<li><a href="${urlPath}${file.name}" target="_blank">📄 ${file.name}</a> <span class="size">${sizeKB} KB</span></li>`;
	} ).join( "\n\t\t\t" );
	
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Index of ${urlPath}</title>
	<style>
		body {
			font-family: monospace;
			background: #222;
			color: #fff;
			padding: 20px;
			margin: 0;
		}
		h1 {
			color: #4CAF50;
			border-bottom: 2px solid #4CAF50;
			padding-bottom: 10px;
		}
		ul {
			list-style: none;
			padding: 0;
		}
		li {
			padding: 8px;
			margin: 4px 0;
			background: #333;
			border-radius: 4px;
		}
		li:hover {
			background: #444;
		}
		a {
			color: #4CAF50;
			text-decoration: none;
		}
		a:hover {
			text-decoration: underline;
		}
		.size {
			float: right;
			color: #888;
		}
		.info {
			background: #1a1a1a;
			padding: 15px;
			border-radius: 5px;
			margin: 20px 0;
			color: #FFC107;
		}
	</style>
</head>
<body>
	<h1>Index of ${urlPath}</h1>
	<div class="info">
		Pi.js Development Server - Directory Listing
	</div>
	<ul>
		${parentLink}
		${dirLinks}
		${fileLinks}
	</ul>
</body>
</html>`;
}

const server = http.createServer( ( req, res ) => {
	console.log( `${req.method} ${req.url}` );

	// Handle CORS preflight
	if( req.method === "OPTIONS" ) {
		res.writeHead( 200, {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type"
		} );
		res.end();
		return;
	}

	// Handle POST request to reset base image
	if( req.method === "POST" && req.url === "/api/reset-base-image" ) {
		let body = "";
		
		req.on( "data", chunk => {
			body += chunk.toString();
		} );
		
		req.on( "end", () => {
			try {
				const data = JSON.parse( body );
				const baseName = data.baseName;
				
				// Validate baseName to prevent path traversal
				if( !baseName || baseName.includes( ".." ) || baseName.includes( "/" ) || baseName.includes( "\\" ) ) {
					res.writeHead( 400, { "Content-Type": "application/json" } );
					res.end( JSON.stringify( { "error": "Invalid base name" } ) );
					return;
				}
				
				const sourcePath = path.join( __dirname, "test", "tests", "screenshots", "new", `${baseName}.png` );
				const destPath = path.join( __dirname, "test", "tests", "screenshots", `${baseName}.png` );
				
				// Check if source exists
				if( !fs.existsSync( sourcePath ) ) {
					res.writeHead( 404, { "Content-Type": "application/json" } );
					res.end( JSON.stringify( { "error": "Source screenshot not found" } ) );
					return;
				}
				
				// Copy file
				fs.copyFileSync( sourcePath, destPath );
				
				// Delete the new image after copying
				fs.unlinkSync( sourcePath );
				
				console.log( `Reset base image: ${baseName}.png (new image deleted)` );
				
				res.writeHead( 200, { 
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*"
				} );
				res.end( JSON.stringify( { "success": true, "message": `Base image reset: ${baseName}.png` } ) );
			} catch( err ) {
				console.error( "Error resetting base image:", err );
				res.writeHead( 500, { "Content-Type": "application/json" } );
				res.end( JSON.stringify( { "error": err.message } ) );
			}
		} );
		
		return;
	}

	let urlPath = req.url;
	
	// Decode URL and strip query string for file path
	let filePath = "." + decodeURIComponent( req.url.split( "?" )[0] );
	
	// Check if path exists
	fs.stat( filePath, ( error, stats ) => {
		if( error ) {
			res.writeHead( 404, { "Content-Type": "text/html" } );
			res.end( "<h1>404 Not Found</h1>", "utf-8" );
			return;
		}
		
		// If directory, show listing or look for index.html
		if( stats.isDirectory() ) {
			const indexPath = path.join( filePath, "index.html" );
			
			// Check if index.html exists
			if( fs.existsSync( indexPath ) ) {
				fs.readFile( indexPath, ( err, content ) => {
					if( err ) {
						res.writeHead( 500 );
						res.end( `Server Error: ${err.code}`, "utf-8" );
					} else {
						res.writeHead( 200, { 
							"Content-Type": "text/html",
							"Access-Control-Allow-Origin": "*"
						} );
						res.end( content, "utf-8" );
					}
				} );
			} else {
				// Show directory listing
				try {
					const listing = generateDirectoryListing( filePath, urlPath );
					res.writeHead( 200, { 
						"Content-Type": "text/html",
						"Access-Control-Allow-Origin": "*"
					} );
					res.end( listing, "utf-8" );
				} catch( err ) {
					res.writeHead( 500 );
					res.end( `Server Error: ${err.message}`, "utf-8" );
				}
			}
			return;
		}
		
		// If file, serve it
		const extname = String( path.extname( filePath ) ).toLowerCase();
		const contentType = mimeTypes[ extname ] || "application/octet-stream";
		
		fs.readFile( filePath, ( err, content ) => {
			if( err ) {
				res.writeHead( 500 );
				res.end( `Server Error: ${err.code}`, "utf-8" );
			} else {
				res.writeHead( 200, { 
					"Content-Type": contentType,
					"Access-Control-Allow-Origin": "*"
				} );
				res.end( content, "utf-8" );
			}
		} );
	} );
} );

server.listen( PORT, () => {
	console.log( `Pi.js development server running at http://localhost:${PORT}/` );
	console.log( `Press Ctrl+C to stop` );
} );

