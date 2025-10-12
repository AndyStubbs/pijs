/**
 * Pi.js Visual Regression Test Runner
 * 
 * Runs all visual tests, compares screenshots, and generates results page
 */

const { test, expect } = require( "@playwright/test" );
const fs = require( "fs" );
const path = require( "path" );
const { PNG } = require( "pngjs" );

// Test results storage
const results = {
	"total": 0,
	"passed": 0,
	"failed": 0,
	"skipped": 0,
	"tests": []
};

// Parse TOML metadata from test file
function parseTOML( content ) {
	const tomlMatch = content.match( /\[\[TOML_START\]\]([\s\S]*?)\[\[TOML_END\]\]/ );
	if( !tomlMatch ) {
		return null;
	}

	const tomlStr = tomlMatch[ 1 ];
	const metadata = {
		"test": "screenshot.js",
		"file": null,
		"name": null,
		"width": 320,
		"height": 200,
		"delay": 0
	};

	// Simple TOML parser for our needs
	const lines = tomlStr.trim().split( /\r?\n/ );
	for( const line of lines ) {
		const trimmedLine = line.trim();
		const match = trimmedLine.match( /^(\w+)\s*=\s*(.+)$/ );
		if( match ) {
			const key = match[ 1 ];
			let value = match[ 2 ].trim();

			// Remove quotes
			if( value.startsWith( '"' ) && value.endsWith( '"' ) ) {
				value = value.slice( 1, -1 );
			}

			// Convert numbers
			if( key === "width" || key === "height" || key === "delay" ) {
				value = parseInt( value );
			}

			metadata[ key ] = value;
		}
	}

	return metadata;
}

// Compare two PNG images
function compareImages( img1Path, img2Path, threshold = 0.1 ) {
	if( !fs.existsSync( img1Path ) || !fs.existsSync( img2Path ) ) {
		return { "match": false, "error": "Missing image file" };
	}

	const img1 = PNG.sync.read( fs.readFileSync( img1Path ) );
	const img2 = PNG.sync.read( fs.readFileSync( img2Path ) );

	if( img1.width !== img2.width || img1.height !== img2.height ) {
		return {
			"match": false,
			"error": `Size mismatch: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}`
		};
	}

	let diffPixels = 0;
	const totalPixels = img1.width * img1.height;

	for( let y = 0; y < img1.height; y++ ) {
		for( let x = 0; x < img1.width; x++ ) {
			const idx = ( img1.width * y + x ) * 4;

			const r1 = img1.data[ idx ];
			const g1 = img1.data[ idx + 1 ];
			const b1 = img1.data[ idx + 2 ];
			const a1 = img1.data[ idx + 3 ];

			const r2 = img2.data[ idx ];
			const g2 = img2.data[ idx + 1 ];
			const b2 = img2.data[ idx + 2 ];
			const a2 = img2.data[ idx + 3 ];

			const diff = Math.abs( r1 - r2 ) + Math.abs( g1 - g2 ) + 
				Math.abs( b1 - b2 ) + Math.abs( a1 - a2 );

			if( diff > threshold * 255 * 4 ) {
				diffPixels++;
			}
		}
	}

	const diffPercent = ( diffPixels / totalPixels ) * 100;

	return {
		"match": diffPercent < 1,
		"diffPixels": diffPixels,
		"diffPercent": diffPercent.toFixed( 2 )
	};
}

// Generate results HTML page
function generateResultsPage( results ) {
	const passed = results.tests.filter( t => t.status === "passed" );
	const failed = results.tests.filter( t => t.status === "failed" );
	const skipped = results.tests.filter( t => t.status === "skipped" );

	const passRate = ( ( results.passed / results.total ) * 100 ).toFixed( 1 );

	let html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Pi.js Test Results</title>
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
		}
		.summary {
			background: #333;
			padding: 20px;
			border-radius: 5px;
			margin: 20px 0;
		}
		.summary h2 {
			margin-top: 0;
			color: #FFC107;
		}
		.stats {
			display: flex;
			gap: 20px;
			margin: 20px 0;
		}
		.stat {
			background: #1a1a1a;
			padding: 15px 25px;
			border-radius: 5px;
			text-align: center;
		}
		.stat-value {
			font-size: 32px;
			font-weight: bold;
		}
		.stat-passed { color: #4CAF50; }
		.stat-failed { color: #f44336; }
		.stat-skipped { color: #FFC107; }
		.test-list {
			background: #1a1a1a;
			padding: 15px;
			border-radius: 5px;
			max-height: 600px;
			overflow-y: auto;
		}
		.test-item {
			padding: 10px;
			margin: 5px 0;
			background: #333;
			border-radius: 3px;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.test-item.passed {
			border-left: 4px solid #4CAF50;
		}
		.test-item.failed {
			border-left: 4px solid #f44336;
		}
		.test-item.skipped {
			border-left: 4px solid #FFC107;
		}
		.test-name {
			flex: 1;
		}
		.test-status {
			padding: 4px 12px;
			border-radius: 3px;
			font-weight: bold;
		}
		.status-passed {
			background: #4CAF50;
			color: #000;
		}
		.status-failed {
			background: #f44336;
			color: #fff;
		}
		.status-skipped {
			background: #FFC107;
			color: #000;
		}
		.test-details {
			font-size: 0.9em;
			color: #888;
			margin-top: 5px;
		}
		.error-msg {
			color: #f44336;
			margin-top: 5px;
			font-size: 0.9em;
		}
		a {
			color: #4CAF50;
			text-decoration: none;
		}
		a:hover {
			text-decoration: underline;
		}
	</style>
</head>
<body>
	<h1>Pi.js v2.0 Visual Regression Test Results</h1>
	
	<div class="summary">
		<h2>Test Summary</h2>
		<div class="stats">
			<div class="stat">
				<div class="stat-value">${results.total}</div>
				<div>Total Tests</div>
			</div>
			<div class="stat">
				<div class="stat-value stat-passed">${results.passed}</div>
				<div>Passed</div>
			</div>
			<div class="stat">
				<div class="stat-value stat-failed">${results.failed}</div>
				<div>Failed</div>
			</div>
			<div class="stat">
				<div class="stat-value stat-skipped">${results.skipped}</div>
				<div>Skipped</div>
			</div>
			<div class="stat">
				<div class="stat-value" style="color: ${passRate >= 90 ? '#4CAF50' : passRate >= 70 ? '#FFC107' : '#f44336'}">${passRate}%</div>
				<div>Pass Rate</div>
			</div>
		</div>
	</div>`;

	// Failed tests
	if( failed.length > 0 ) {
		html += `
	<div class="summary">
		<h2 style="color: #f44336;">Failed Tests (${failed.length})</h2>
		<div class="test-list">`;

		for( const test of failed ) {
			html += `
			<div class="test-item failed">
				<div class="test-name">
					<a href="${test.url}" target="_blank">${test.name}</a>
					<div class="test-details">${test.file}</div>
					${test.error ? `<div class="error-msg">${test.error}</div>` : ""}
				</div>
				<div class="test-status status-failed">FAILED</div>
			</div>`;
		}

		html += `
		</div>
	</div>`;
	}

	// Passed tests
	if( passed.length > 0 ) {
		html += `
	<div class="summary">
		<h2 style="color: #4CAF50;">Passed Tests (${passed.length})</h2>
		<div class="test-list">`;

		for( const test of passed ) {
			html += `
			<div class="test-item passed">
				<div class="test-name">
					<a href="${test.url}" target="_blank">${test.name}</a>
					<div class="test-details">${test.file}</div>
				</div>
				<div class="test-status status-passed">PASSED</div>
			</div>`;
		}

		html += `
		</div>
	</div>`;
	}

	// Skipped tests
	if( skipped.length > 0 ) {
		html += `
	<div class="summary">
		<h2 style="color: #FFC107;">Skipped Tests (${skipped.length})</h2>
		<div class="test-list">`;

		for( const test of skipped ) {
			html += `
			<div class="test-item skipped">
				<div class="test-name">
					<a href="${test.url}" target="_blank">${test.name}</a>
					<div class="test-details">${test.file}</div>
					${test.error ? `<div class="error-msg">${test.error}</div>` : ""}
				</div>
				<div class="test-status status-skipped">SKIPPED</div>
			</div>`;
		}

		html += `
		</div>
	</div>`;
	}

	html += `
</body>
</html>`;

	return html;
}

// Find all test HTML files
function findTestFiles() {
	const testsDir = path.join( __dirname, "tests" );
	const testFiles = [];

	if( !fs.existsSync( testsDir ) ) {
		return testFiles;
	}

	const files = fs.readdirSync( testsDir );

	for( const file of files ) {
		if( file.endsWith( ".html" ) ) {
			const filePath = path.join( testsDir, file );
			const content = fs.readFileSync( filePath, "utf8" );
			const metadata = parseTOML( content );

			if( metadata && metadata.test === "screenshot.js" ) {
				testFiles.push( {
					"file": file,
					"path": filePath,
					"url": `/test/tests/${file}`,
					"metadata": metadata
				} );
			}
		}
	}

	return testFiles.sort( ( a, b ) => a.file.localeCompare( b.file ) );
}

// Run visual regression tests
const testFiles = findTestFiles();

console.log( `\nFound ${testFiles.length} visual regression tests` );
console.log( "Running tests...\n" );

test.describe( "Pi.js Visual Regression Tests", () => {
	test.describe.configure( { "mode": "parallel" } );

	for( const testFile of testFiles ) {
		test( testFile.metadata.name || testFile.file, async ( { page } ) => {
			const metadata = testFile.metadata;
			const testName = metadata.file || metadata.name;

			results.total++;

			try {
				// Set viewport size
				await page.setViewportSize( {
					"width": metadata.width,
					"height": metadata.height
				} );

				// Navigate to test
				await page.goto( testFile.url, {
					"waitUntil": "networkidle",
					"timeout": 30000
				} );

				// Wait for delay if specified
				if( metadata.delay > 0 ) {
					await page.waitForTimeout( metadata.delay );
				}

				// Wait for render
				await page.waitForTimeout( 100 );

				// Take screenshot
				const screenshotPath = path.join(
					__dirname,
					"tests/screenshots",
					`${testName}_new.png`
				);

				await page.screenshot( {
					"path": screenshotPath,
					"fullPage": false
				} );

				// Compare with reference
				const referencePath = path.join(
					__dirname,
					"tests/screenshots",
					`${testName}.png`
				);

				if( fs.existsSync( referencePath ) ) {
					const comparison = compareImages( referencePath, screenshotPath );

					if( comparison.match ) {
						results.passed++;
						results.tests.push( {
							"name": metadata.name,
							"file": testFile.file,
							"url": testFile.url,
							"status": "passed"
						} );
					} else {
						results.failed++;
						results.tests.push( {
							"name": metadata.name,
							"file": testFile.file,
							"url": testFile.url,
							"status": "failed",
							"error": comparison.error || 
								`${comparison.diffPercent}% pixels different`
						} );

						// Fail the test
						throw new Error(
							`Screenshot mismatch: ${comparison.diffPercent}% different`
						);
					}
				} else {
					// No reference image - skip
					results.skipped++;
					results.tests.push( {
						"name": metadata.name,
						"file": testFile.file,
						"url": testFile.url,
						"status": "skipped",
						"error": "No reference screenshot"
					} );

					test.skip();
				}
			} catch( error ) {
				if( !results.tests.find( t => t.file === testFile.file ) ) {
					results.failed++;
					results.tests.push( {
						"name": metadata.name,
						"file": testFile.file,
						"url": testFile.url,
						"status": "failed",
						"error": error.message
					} );
				}

				// Fail with minimal error (details shown in our summary)
				throw new Error( error.message );
			}
		} );
	}
} );

// After all tests, generate results page
// Note: This is now handled by the reporter to have access to all worker results
test.afterAll( async () => {
	// Results page generation moved to reporter
} );

