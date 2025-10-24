/**
 * Pi.js Development Server
 * 
 * Simple HTTP server for local development and testing.
 */

const http = require( "http" );
const fs = require( "fs" );
const path = require( "path" );
const os = require( "os" );

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

function getFormattedDate( date ) {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");

	let hours = date.getHours();
	const minutes = date.getMinutes().toString().padStart(2, "0");
	const ampm = hours >= 12 ? "PM" : "AM";

	hours = hours % 12;
	hours = hours ? hours : 12; // the hour "0" should be "12"
	const formattedHours = hours.toString().padStart(2, "0");

	return `${year}-${month}-${day}_${formattedHours}-${minutes}-${ampm}`;
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

	// Add CORS headers to all responses
	res.setHeader( "Access-Control-Allow-Origin", "*" );
	res.setHeader( "Access-Control-Allow-Methods", "POST, GET, OPTIONS" );
	res.setHeader( "Access-Control-Allow-Headers", "Content-Type" );

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
				const testType = data.testType || "core";
				
				// Validate baseName to prevent path traversal
				if( !baseName || baseName.includes( ".." ) || baseName.includes( "/" ) || baseName.includes( "\\" ) ) {
					res.writeHead( 400, { "Content-Type": "application/json" } );
					res.end( JSON.stringify( { "error": "Invalid base name" } ) );
					return;
				}
				
				// Determine paths based on test type
				const testsDir = testType === "plugins" ? "tests-plugins" : "tests";
				const sourcePath = path.join( __dirname, "test", testsDir, "screenshots", "new", `${baseName}.png` );
				const destPath = path.join( __dirname, "test", testsDir, "screenshots", `${baseName}.png` );
				
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

	// Handle POST request to save performance test results
	if( req.method === "POST" && req.url === "/api/post-results" ) {
		let body = "";
		
		req.on( "data", chunk => {
			body += chunk.toString();
		} );
		
		req.on( "end", () => {
			try {
				const data = JSON.parse( body );
				
				// Add system information to the results
				const systemInfo = {
					"os": {
						"platform": os.platform(),
						"type": os.type(),
						"release": os.release(),
						"arch": os.arch(),
						"cpus": os.cpus().length,
						"cpuModel": os.cpus()[0]?.model || "Unknown",
						"totalMemory": Math.round( os.totalmem() / 1024 / 1024 / 1024 ) + " GB",
						"freeMemory": Math.round( os.freemem() / 1024 / 1024 / 1024 ) + " GB"
					},
					"browser": {
						"userAgent": req.headers[ "user-agent" ] || "Unknown",
						"language": req.headers[ "accept-language" ] || "Unknown"
					},
					"timestamp": new Date().toLocaleString()
				};
				
				// Merge system info with results and mark as posted
				const resultsWithSystemInfo = {
					...data,
					"systemInfo": systemInfo,
					"posted": true
				};
				
				// Create results directory if it doesn't exist
				const resultsDir = path.join( __dirname, "test", "performance", "data" );
				if( !fs.existsSync( resultsDir ) ) {
					fs.mkdirSync( resultsDir, { recursive: true } );
				}
				
				// Generate filename with timestamp
				const timestamp = getFormattedDate( new Date( data.date ) );
				const filename = `results-${timestamp}.json`;
				const filepath = path.join( resultsDir, filename );
				
				// Write results to file
				fs.writeFileSync( filepath, JSON.stringify( resultsWithSystemInfo, null, 2 ) );
				
				// Update stats.json file
				const statsFilePath = path.join( resultsDir, "stats.json" );
				let stats = [];
				
				// Load existing stats if file exists
				if( fs.existsSync( statsFilePath ) ) {
					try {
						const statsContent = fs.readFileSync( statsFilePath, "utf8" );
						stats = JSON.parse( statsContent );
					} catch( err ) {
						console.error( "Error loading stats.json:", err );
						stats = [];
					}
				}
				
				// Add new entry to stats
				stats.push( {
					"filename": filename,
					"version": data.version || "Unknown",
					"date": data.date,
					"targetFps": data.targetFps || 0
				} );
				
				// Save updated stats
				fs.writeFileSync( statsFilePath, JSON.stringify( stats, null, 2 ) );
				
				console.log( `Performance test results saved: ${filename}` );
				
				res.writeHead( 200, { "Content-Type": "application/json" } );
				res.end( JSON.stringify( { 
					"success": true, 
					"message": `Results saved to ${filename}`,
					"filename": filename
				} ) );
			} catch( err ) {
				console.error( "Error saving performance results:", err );
				res.writeHead( 500, { "Content-Type": "application/json" } );
				res.end( JSON.stringify( { "error": err.message } ) );
			}
		} );
		
		return;
	}

	// Handle POST request to approve new test
	if( req.method === "POST" && req.url === "/api/approve-new-test" ) {
		console.log( "Approve new test endpoint hit" );
		let body = "";
		
		req.on( "data", chunk => {
			body += chunk.toString();
		} );
		
		req.on( "end", () => {
			try {
				console.log( "Request body:", body );
				const data = JSON.parse( body );
				const baseName = data.baseName;
				const testType = data.testType || "core";
				console.log( "Base name:", baseName );
				console.log( "Test type:", testType );
				
				// Validate baseName to prevent path traversal
				if( !baseName || baseName.includes( ".." ) || baseName.includes( "/" ) || baseName.includes( "\\" ) ) {
					console.log( "Invalid base name" );
					res.writeHead( 400, { "Content-Type": "application/json" } );
					res.end( JSON.stringify( { "error": "Invalid base name" } ) );
					return;
				}
				
				// Determine paths based on test type
				const testsDir = testType === "plugins" ? "tests-plugins" : "tests";
				const sourcePath = path.join( __dirname, "test", testsDir, "screenshots", "new", `${baseName}.png` );
				const destPath = path.join( __dirname, "test", testsDir, "screenshots", `${baseName}.png` );
				
				console.log( "Source path:", sourcePath );
				console.log( "Dest path:", destPath );
				console.log( "Source exists:", fs.existsSync( sourcePath ) );
				
				// Check if source exists
				if( !fs.existsSync( sourcePath ) ) {
					res.writeHead( 404, { "Content-Type": "application/json" } );
					res.end( JSON.stringify( { "error": "New screenshot not found", "path": sourcePath } ) );
					return;
				}
				
				// Copy file to set as reference
				fs.copyFileSync( sourcePath, destPath );
				
				// Delete the new image after copying
				fs.unlinkSync( sourcePath );
				
				console.log( `Approved new test: ${baseName}.png (set as reference)` );
				
				res.writeHead( 200, { "Content-Type": "application/json" } );
				res.end( JSON.stringify( { "success": true, "message": `New test approved: ${baseName}.png` } ) );
			} catch( err ) {
				console.error( "Error approving new test:", err );
				res.writeHead( 500, { "Content-Type": "application/json" } );
				res.end( JSON.stringify( { "error": err.message } ) );
			}
		} );
		
		return;
	}

	// Handle GET request to list performance test results
	if( req.method === "GET" && req.url === "/api/list-results" ) {
		try {
			const resultsDir = path.join( __dirname, "test", "performance", "data" );
			
			if( !fs.existsSync( resultsDir ) ) {
				res.writeHead( 200, { "Content-Type": "application/json" } );
				res.end( JSON.stringify( { "success": true, "files": [] } ) );
				return;
			}
			
			// Load stats from stats.json file
			const statsFilePath = path.join( resultsDir, "stats.json" );
			let files = [];
			
			if( fs.existsSync( statsFilePath ) ) {
				try {
					const statsContent = fs.readFileSync( statsFilePath, "utf8" );
					const stats = JSON.parse( statsContent );
					
					// Convert stats to files array with additional info, filtering out missing files
					const validStats = [];
					files = stats.map( stat => {
						const filePath = path.join( resultsDir, stat.filename );
						
						// Check if file actually exists
						if( fs.existsSync( filePath ) ) {
							const fileStats = fs.statSync( filePath );
							validStats.push( stat ); // Keep this stat entry
							return {
								"name": stat.filename,
								"date": stat.date,
								"version": stat.version,
								"targetFps": stat.targetFps,
								"size": fileStats.size
							};
						} else {
							
							// File is missing, don't include it in results
							return null;
						}
					} ).filter( file => file !== null ); // Remove null entries
					
					// Update stats.json if any files were missing
					if( validStats.length !== stats.length ) {
						fs.writeFileSync( statsFilePath, JSON.stringify( validStats, null, 2 ) );
						console.log(
							`Updated stats.json: removed ${stats.length - validStats.length} ` +
							`missing files`
						);
					}
				} catch( err ) {
					console.error( "Error loading stats.json:", err );
					files = [];
				}
			}
			
			// Sort by date, newest first
			files.sort( ( a, b ) => new Date( b.date ) - new Date( a.date ) );
			
			res.writeHead( 200, { "Content-Type": "application/json" } );
			res.end( JSON.stringify( { "success": true, "files": files } ) );
		} catch( err ) {
			console.error( "Error listing results:", err );
			res.writeHead( 500, { "Content-Type": "application/json" } );
			res.end( JSON.stringify( { "error": err.message } ) );
		}
		return;
	}

	// Handle GET request to get a specific result file
	if( req.method === "GET" && req.url.startsWith( "/api/get-result/" ) ) {
		try {
			const filename = decodeURIComponent( req.url.substring( "/api/get-result/".length ) );
			
			// Validate filename to prevent path traversal
			if(
				filename.includes( ".." ) || filename.includes( "/" ) || filename.includes( "\\" )
			) {
				res.writeHead( 400, { "Content-Type": "application/json" } );
				res.end( JSON.stringify( { "error": "Invalid filename" } ) );
				return;
			}
			
			const resultsDir = path.join( __dirname, "test", "performance", "data" );
			const filePath = path.join( resultsDir, filename );
			
			if( !fs.existsSync( filePath ) ) {
				res.writeHead( 404, { "Content-Type": "application/json" } );
				res.end( JSON.stringify( { "error": "File not found" } ) );
				return;
			}
			
			const fileContent = fs.readFileSync( filePath, "utf8" );
			const data = JSON.parse( fileContent );
			
			res.writeHead( 200, { "Content-Type": "application/json" } );
			res.end( JSON.stringify( { "success": true, "data": data } ) );
		} catch( err ) {
			console.error( "Error getting result:", err );
			res.writeHead( 500, { "Content-Type": "application/json" } );
			res.end( JSON.stringify( { "error": err.message } ) );
		}
		return;
	}

	// Handle POST request to reset/rebuild stats.json
	if( req.method === "POST" && req.url === "/api/reset-stats" ) {
		try {
			const resultsDir = path.join( __dirname, "test", "performance", "data" );
			let stats = [];
			let addedCount = 0;
			let removedCount = 0;
			
			if( fs.existsSync( resultsDir ) ) {
				const statsFilePath = path.join( resultsDir, "stats.json" );
				
				// Load existing stats if file exists
				if( fs.existsSync( statsFilePath ) ) {
					try {
						const statsContent = fs.readFileSync( statsFilePath, "utf8" );
						stats = JSON.parse( statsContent );
					} catch( err ) {
						console.error( "Error loading existing stats.json:", err );
						stats = [];
					}
				}
				
				// Create a map of existing stats for quick lookup
				const existingStatsMap = new Map();
				stats.forEach( stat => existingStatsMap.set( stat.filename, stat ) );
				
				// Find all results-*.json files
				const resultFiles = fs.readdirSync( resultsDir )
					.filter(
						file => file.startsWith( "results-" ) && file.endsWith( ".json" ) &&
						file !== "stats.json"
					);
				
				// Process each result file
				const newStats = [];
				for( const filename of resultFiles ) {
					const filePath = path.join( resultsDir, filename );
					
					// Check if file exists on disk
					if( fs.existsSync( filePath ) ) {

						// Check if we already have this file in stats
						if( existingStatsMap.has( filename ) ) {

							// File exists and is already in stats, keep it
							newStats.push( existingStatsMap.get( filename ) );
						} else {

							// File exists but not in stats, read it and add metadata
							try {
								const fileContent = fs.readFileSync( filePath, "utf8" );
								const data = JSON.parse( fileContent );
								
								const newStat = {
									"filename": filename,
									"version": data.version || "Unknown",
									"date": data.date || new Date().toISOString(),
									"targetFps": data.targetFps || 0
								};
								
								newStats.push( newStat );
								addedCount++;
							} catch( err ) {
								
								// Skip this file if it can't be read
								console.error( `Error reading result file ${filename}:`, err );
							}
						}
					} else {

						// File doesn't exist on disk, remove from stats
						removedCount++;
					}
				}
				
				// Count removed files (files in stats but not on disk)
				removedCount = stats.length - newStats.length + addedCount;
				
				// Sort by date, newest first
				newStats.sort( ( a, b ) => new Date( b.date ) - new Date( a.date ) );
				
				// Write the updated stats.json file
				fs.writeFileSync( statsFilePath, JSON.stringify( newStats, null, 2 ) );
				
				console.log(
					`Updated stats.json: added ${addedCount} files, removed ${removedCount} ` +
					`files, total ${newStats.length} files`
				);
				
				res.writeHead( 200, { "Content-Type": "application/json" } );
				res.end( JSON.stringify( { 
					"success": true, 
					"message": `Updated stats.json: added ${addedCount} files, removed ` +
						`${removedCount} files`,
					"added": addedCount,
					"removed": removedCount,
					"total": newStats.length
				} ) );
			} else {
				res.writeHead( 200, { "Content-Type": "application/json" } );
				res.end( JSON.stringify( { 
					"success": true, 
					"message": "Results directory does not exist",
					"added": 0,
					"removed": 0,
					"total": 0
				} ) );
			}
		} catch( err ) {
			console.error( "Error rebuilding stats:", err );
			res.writeHead( 500, { "Content-Type": "application/json" } );
			res.end( JSON.stringify( { "error": err.message } ) );
		}
		return;
	}

	// Handle POST request to delete all result files
	if( req.method === "POST" && req.url === "/api/delete-all-results" ) {
		try {
			const resultsDir = path.join( __dirname, "test", "performance", "data" );
			let deletedCount = 0;
			
			if( fs.existsSync( resultsDir ) ) {
				const files = fs.readdirSync( resultsDir ).filter( file => file.endsWith( ".json" ) );
				
				for( const file of files ) {
					const filePath = path.join( resultsDir, file );
					fs.unlinkSync( filePath );
					deletedCount++;
				}
				
				// Also delete stats.json if it exists
				const statsFilePath = path.join( resultsDir, "stats.json" );
				if( fs.existsSync( statsFilePath ) ) {
					fs.unlinkSync( statsFilePath );
				}
			}
			
			res.writeHead( 200, { "Content-Type": "application/json" } );
			res.end( JSON.stringify( { "success": true, "deletedCount": deletedCount } ) );
		} catch( err ) {
			console.error( "Error deleting results:", err );
			res.writeHead( 500, { "Content-Type": "application/json" } );
			res.end( JSON.stringify( { "error": err.message } ) );
		}
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

