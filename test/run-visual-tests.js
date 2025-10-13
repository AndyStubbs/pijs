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
function compareImages( img1Path, img2Path, threshold = 0.001 ) {
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

			// Account for browser fingerprinting protection (typically 1-2 pixel noise)
			if( diff > 6 ) {
				diffPixels++;
			}
		}
	}

	const diffPercent = ( diffPixels / totalPixels ) * 100;

	return {
		"match": diffPercent < (threshold * 100),
		"diffPixels": diffPixels,
		"diffPercent": diffPercent.toFixed( 2 )
	};
}

// Find all test HTML files
function findTestFiles() {
	const testsDir = path.join( __dirname, "tests", "html" );
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
					"url": `/test/tests/html/${file}`,
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
		test( testFile.metadata.name || testFile.file, {
			"annotation": {
				"type": "screenshot-name",
				"description": testFile.metadata.file || testFile.file.replace( ".html", "" )
			}
		}, async ( { page } ) => {
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
					"tests/screenshots/new",
					`${testName}.png`
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

