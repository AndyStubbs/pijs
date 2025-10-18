/**
 * Pi.js Visual Regression Test Runner
 * 
 * Runs all visual tests, compares screenshots, and generates results page
 * 
 * Command String Support:
 * Tests can include a "commands" string in the TOML metadata to simulate user interactions
 * before capturing the screenshot.
 * 
 * Supported commands:
 * - KD "key" - Key down (e.g., KD "Control", KD "a")
 * - KU "key" - Key up
 * - KP "key" - Key press
 * - KT "text" - Type text
 * - MD [button] - Mouse down (left/right/middle)
 * - MU [button] - Mouse up
 * - MC [button] - Mouse click
 * - MV x,y - Mouse move to position
 * - MV x,y,steps - Mouse move with steps
 * - TS x,y - Touch start
 * - TM x,y - Touch move
 * - TM x,y,steps - Touch move with steps
 * - TE - Touch end
 * - DL ms - Delay in milliseconds
 * - SL "selector" - Select element (focus target for subsequent events)
 * 
 * Example:
 * commands = """
 *   KD "Control"
 *   DL 100
 *   KD "s"
 *   DL 100
 *   KU "s"
 *   KU "Control"
 * """
 */

const { test, expect } = require( "@playwright/test" );
const fs = require( "fs" );
const path = require( "path" );
const { PNG } = require( "pngjs" );

// Command execution context
let cmdContext = {
	"mouse": { "x": 0, "y": 0, "buttons": 0 },
	"touch": { "x": 0, "y": 0, "id": 0 },
	"target": ""
};

// Optional verbose movement logging (set PI_LOG_MOVES=1)
const LOG_MOVES = process.env.PI_LOG_MOVES === "1";
let LOG_FILE_PATH = process.env.PI_LOG_MOVES_FILE || null;
let LOG_FILE_READY = false;
let LOG_START_TIME = 0;

function setLogFileForTest( testBaseName ) {
	if( !LOG_MOVES ) {
		return;
	}
	try {
		const logsDir = path.join( __dirname, "logs" );
		if( !fs.existsSync( logsDir ) ) {
			fs.mkdirSync( logsDir, { "recursive": true } );
		}
		LOG_FILE_PATH = path.join( logsDir, `${testBaseName}.log` );
		const time = new Date().toLocaleString();
		fs.writeFileSync( LOG_FILE_PATH, `# "${testBaseName}" movement log - ${time}\n` );
		LOG_FILE_READY = true;
	} catch( _e ) {}
}

function logMove( type, details ) {
	if( !LOG_MOVES ) {
		return;
	}
	try {
		const elapsed = Date.now() - LOG_START_TIME;
		const line = `[${elapsed}] ${type}: ${JSON.stringify( details )}\n`;
		fs.appendFileSync( LOG_FILE_PATH, line );
	} catch( _e ) {}
}

// Test configuration - can be overridden by environment variable
const TEST_TYPE = process.env.PI_TEST_TYPE || "core";
const TEST_CONFIG = {
	"core": {
		"testsDir": "tests/html",
		"screenshotsDir": "tests/screenshots",
		"newScreenshotsDir": "tests/screenshots/new",
		"urlPrefix": "/test/tests/html",
		"description": "Pi.js Visual Regression Tests"
	},
	"plugins": {
		"testsDir": "tests-plugins/html",
		"screenshotsDir": "tests-plugins/screenshots",
		"newScreenshotsDir": "tests-plugins/screenshots/new",
		"urlPrefix": "/test/tests-plugins/html",
		"description": "Pi.js Plugin Visual Regression Tests"
	}
};

const config = TEST_CONFIG[ TEST_TYPE ];

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
		"delay": 0,
		"commands": null
	};

	// Simple TOML parser for our needs
	const lines = tomlStr.trim().split( /\r?\n/ );
	let inMultiline = false;
	let multilineKey = null;
	let multilineValue = "";

	for( const line of lines ) {
		const trimmedLine = line.trim();

		// Handle multiline strings (""")
		if( inMultiline ) {
			if( trimmedLine.endsWith( '"""' ) ) {
				multilineValue += trimmedLine.slice( 0, -3 );
				metadata[ multilineKey ] = multilineValue.trim();
				inMultiline = false;
				multilineKey = null;
				multilineValue = "";
			} else {
				multilineValue += line + "\n";
			}
			continue;
		}

		const match = trimmedLine.match( /^(\w+)\s*=\s*(.+)$/ );
		if( match ) {
			const key = match[ 1 ];
			let value = match[ 2 ].trim();

			// Check for multiline string start
			if( value === '"""' ) {
				inMultiline = true;
				multilineKey = key;
				multilineValue = "";
				continue;
			}

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

/**
 * Parse command string into command objects
 * 
 * @param {string} commandString - Command string to parse
 * @returns {Array} Array of command objects
 */
function parseCommands( commandString ) {
	if( !commandString || commandString.trim() === "" ) {
		return [];
	}

	// Remove potential conflicts (quoted strings)
	const conflicts = removeQuotes( commandString );

	// Remove spaces and convert to upper case
	const cleanedString = conflicts.str.split( /\s+/ ).join( "" ).toUpperCase();

	// Regex to match command patterns
	const regString = "(?=" +
		"MD|" +
		"MD\\d+|" +
		"MV\\d+\\,\\d+|" +
		"MV\\d+\\,\\d+,\\d+|" +
		"MU|" +
		"MU\\d+|" +
		"MC|" +
		"MC\\d+|" +
		"TS|" +
		"TM\\d+\\,\\d+|" +
		"TM\\d+\\,\\d+,\\d+|" +
		"TE|" +
		"KD\\d+|" +
		"KU\\d+|" +
		"KP\\d+|" +
		"KT\\d+|" +
		"DL\\d+|" +
		"SL\\d+" +
	")";

	const reg = new RegExp( regString );

	// Split the commands
	const commands = cleanedString.split( reg );

	// Process commands into structured format
	return processCommands( commands, conflicts.data );
}

/**
 * Remove quotes from command string and store quoted values
 * 
 * @param {string} commandString - Command string with quotes
 * @returns {Object} Object with str (cleaned string) and data (quoted values)
 */
function removeQuotes( commandString ) {
	const quotes = [];
	let start = commandString.indexOf( '"' );

	while( start !== -1 ) {
		const end = commandString.indexOf( '"', start + 1 );

		if( start >= end || end === -1 ) {
			console.error( "Unmatched quotes in command string!" );
			break;
		}

		// Add to the quotes array
		quotes.push( commandString.substring( start + 1, end ) );

		// Remove the quoted item from the string
		commandString = commandString.substring( 0, start ) +
			( quotes.length - 1 ) + commandString.substring( end + 1 );

		// Find the next quote
		start = commandString.indexOf( '"' );
	}

	return {
		"data": quotes,
		"str": commandString
	};
}

/**
 * Process commands into structured format
 * 
 * @param {Array} commands - Array of command strings
 * @param {Array} conflictData - Array of quoted string values
 * @returns {Array} Array of processed command objects
 */
function processCommands( commands, conflictData ) {
	const conflictItems = [ "KD", "KU", "KP", "KT", "SL", "MC", "MD", "MU" ];
	const processedCommands = [];

	for( let i = 0; i < commands.length; i++ ) {
		if( commands[ i ].length === 0 ) continue;

		const cmd = commands[ i ].substring( 0, 2 );
		let data = commands[ i ].substr( 2 ).split( "," );

		if( data.length === 1 ) {
			data = data[ 0 ];
		}

		// Grab the data from the conflictData (quoted strings)
		if( conflictItems.indexOf( cmd ) > -1 && data !== "" ) {
			data = conflictData[ parseInt( data ) ];
		}

		processedCommands.push( {
			"cmd": cmd,
			"data": data
		} );
	}

	return processedCommands;
}

/**
 * Execute a single command
 * 
 * @param {Object} page - Playwright page object
 * @param {Object} command - Command object with cmd and data properties
 * @returns {Promise<Object|null>} Result object or null
 */
async function executeCommand( page, command ) {
	const cmd = command.cmd;
	const data = command.data;

	switch( cmd ) {

		// Delay - return the delay value to be handled by caller
		case "DL":
			logMove( "DL", { "ms": parseInt( data ) } );
			return { "delay": parseInt( data ) };

		// Select element
		case "SL":
			cmdContext.target = data;
			logMove( "SL", { "selector": data } );
			if( data && data !== "" ) {
				await page.focus( data );
			}
			break;

		// Mouse move
		case "MV":
			if( Array.isArray( data ) && data.length === 3 ) {

				// Move with steps
				const x2 = parseInt( data[ 0 ] );
				const y2 = parseInt( data[ 1 ] );
				const steps = parseInt( data[ 2 ] );
				const dx = ( x2 - cmdContext.mouse.x ) / steps;
				const dy = ( y2 - cmdContext.mouse.y ) / steps;

				for( let i = 0; i < steps; i++ ) {
					cmdContext.mouse.x += dx;
					cmdContext.mouse.y += dy;
					logMove( "MV-step", {
						"x": Math.round( cmdContext.mouse.x ),
						"y": Math.round( cmdContext.mouse.y )
					} );
					await page.mouse.move(
						Math.round( cmdContext.mouse.x ),
						Math.round( cmdContext.mouse.y )
					);
					await page.waitForTimeout( 10 );
				}
			} else if( Array.isArray( data ) ) {
				cmdContext.mouse.x = parseInt( data[ 0 ] );
				cmdContext.mouse.y = parseInt( data[ 1 ] );
				logMove( "MV", { "x": cmdContext.mouse.x, "y": cmdContext.mouse.y } );
				await page.mouse.move( cmdContext.mouse.x, cmdContext.mouse.y );
			}
			break;

		// Mouse down
		case "MD":
			cmdContext.mouse.buttons = 1;
			logMove( "MD", { "button": data || "left" } );
			await page.mouse.down( { "button": data || "left" } );
			break;

		// Mouse up
		case "MU":
			cmdContext.mouse.buttons = 0;
			logMove( "MU", { "button": data || "left" } );
			await page.mouse.up( { "button": data || "left" } );
			break;

		// Mouse click
		case "MC":
			if( cmdContext.target ) {
				logMove( "MC-target", {
					"selector": cmdContext.target,
					"button": data || "left"
				} );
				await page.click( cmdContext.target, { "button": data || "left" } );
			} else {
				logMove( "MC", {
					"x": cmdContext.mouse.x,
					"y": cmdContext.mouse.y,
					"button": data || "left"
				} );
				await page.mouse.click(
					cmdContext.mouse.x,
					cmdContext.mouse.y,
					{ "button": data || "left" }
				);
			}
			break;

		// Type text
		case "KT":
			logMove( "KT", { "text": data } );
			if( cmdContext.target ) {
				await page.type( cmdContext.target, data );
			} else {
				await page.keyboard.type( data );
			}
			break;

		// Key down
		case "KD":
			logMove( "KD", { "key": data } );
			await page.keyboard.down( data );
			break;

		// Key up
		case "KU":
			logMove( "KU", { "key": data } );
			await page.keyboard.up( data );
			break;

		// Key press
		case "KP":
			logMove( "KP", { "key": data } );
			await page.keyboard.press( data );
			break;

		// Touch start
		case "TS":
			if( Array.isArray( data ) ) {
				cmdContext.touch.x = parseInt( data[ 0 ] );
				cmdContext.touch.y = parseInt( data[ 1 ] );
				logMove( "TS", { "x": cmdContext.touch.x, "y": cmdContext.touch.y, "id": cmdContext.touch.id } );
				await dispatchTouch(
					page,
					cmdContext.target,
					"touchstart",
					data,
					cmdContext.touch.id
				);
			}
			break;

		// Touch move
		case "TM":
			if( Array.isArray( data ) && data.length === 3 ) {

				// Move with steps
				const x2 = parseInt( data[ 0 ] );
				const y2 = parseInt( data[ 1 ] );
				const steps = parseInt( data[ 2 ] );
				const dx = ( x2 - cmdContext.touch.x ) / steps;
				const dy = ( y2 - cmdContext.touch.y ) / steps;

				for( let i = 0; i < steps; i++ ) {
					cmdContext.touch.x += dx;
					cmdContext.touch.y += dy;
					logMove( "TM-step", {
						"x": Math.round( cmdContext.touch.x ),
						"y": Math.round( cmdContext.touch.y ),
						"id": cmdContext.touch.id
					} );
					await dispatchTouch(
						page,
						cmdContext.target,
						"touchmove",
						[ Math.round( cmdContext.touch.x ), Math.round( cmdContext.touch.y ) ],
						cmdContext.touch.id
					);
					await page.waitForTimeout( 10 );
				}
			} else if( Array.isArray( data ) ) {
				cmdContext.touch.x = parseInt( data[ 0 ] );
				cmdContext.touch.y = parseInt( data[ 1 ] );
				logMove( "TM", {
					"x": cmdContext.touch.x,
					"y": cmdContext.touch.y,
					"id": cmdContext.touch.id
				} );
				await dispatchTouch(
					page,
					cmdContext.target,
					"touchmove",
					data,
					cmdContext.touch.id
				);
			}
			break;

		// Touch end
		case "TE":
			logMove( "TE", { "id": cmdContext.touch.id } );
			await dispatchTouch(
				page,
				cmdContext.target,
				"touchend",
				[],
				cmdContext.touch.id
			);
			cmdContext.touch.id += 1;
			break;
	}

	return null;
}

/**
 * Dispatch touch event to page
 * 
 * @param {Object} page - Playwright page object
 * @param {string} target - CSS selector for target element
 * @param {string} name - Touch event name
 * @param {Array} data - Touch coordinates [x, y]
 * @param {number} id - Touch identifier
 * @returns {Promise<void>}
 */
async function dispatchTouch( page, target, name, data, id ) {
	const coords = Array.isArray( data ) && data.length >= 2 ? 
		[ parseInt( data[ 0 ] ), parseInt( data[ 1 ] ) ] : 
		[];

	await page.evaluate(
		( { selector, eventName, coordinates, touchId } ) => {
			const targetElement = selector ? 
				document.querySelector( selector ) : 
				document.body;

			const touchConfig = {
				"cancelable": true,
				"bubbles": true,
				"touches": [],
				"targetTouches": [],
				"changedTouches": [],
				"shiftKey": false
			};

			if( coordinates.length >= 2 ) {
				const touch = new Touch( {
					"identifier": touchId,
					"target": targetElement,
					"clientX": coordinates[ 0 ],
					"clientY": coordinates[ 1 ],
					"pageX": coordinates[ 0 ],
					"pageY": coordinates[ 1 ],
					"radiusX": 2.5,
					"radiusY": 2.5,
					"rotationAngle": 10,
					"force": 0.5
				} );
				touchConfig.touches.push( touch );
				touchConfig.changedTouches.push( touch );
			}

			const event = new TouchEvent( eventName, touchConfig );
			targetElement.dispatchEvent( event );
		},
		{ 
			"selector": target, 
			"eventName": name, 
			"coordinates": coords, 
			"touchId": id 
		}
	);
}

/**
 * Execute all commands from a command string
 * 
 * @param {Object} page - Playwright page object
 * @param {string} commandString - Command string to execute
 * @returns {Promise<void>}
 */
async function executeCommands( page, commandString ) {
	if( !commandString ) {
		return;
	}

	// Reset command context
	cmdContext = {
		"mouse": { "x": 0, "y": 0, "buttons": 0 },
		"touch": { "x": 0, "y": 0, "id": 0 },
		"target": ""
	};

	const commands = parseCommands( commandString );

	LOG_START_TIME = Date.now();
	for( const command of commands ) {
		const result = await executeCommand( page, command );

		// Handle delay
		if( result && result.delay ) {
			await page.waitForTimeout( result.delay );
		}
	}
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
		"match": diffPercent < ( threshold * 100 ),
		"diffPixels": diffPixels,
		"diffPercent": diffPercent.toFixed( 2 )
	};
}

// Find all test HTML files
function findTestFiles() {
	const testsDir = path.join( __dirname, config.testsDir );
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
					"url": `${config.urlPrefix}/${file}`,
					"metadata": metadata
				} );
			}
		}
	}

	return testFiles.sort( ( a, b ) => a.file.localeCompare( b.file ) );
}

// Run visual regression tests
const testFiles = findTestFiles();

console.log( `\nFound ${testFiles.length} ${TEST_TYPE} tests` );
console.log( `Running ${TEST_TYPE} tests...\n` );

test.describe( config.description, () => {
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

			// Check if reference exists before running test
			const referencePath = path.join(
				__dirname,
				config.screenshotsDir,
				`${testName}.png`
			);

			const isNewTest = !fs.existsSync( referencePath );

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

				// Prepare per-test log file named after the screenshot base
				if( LOG_MOVES ) {
					const baseName = ( testName || testFile.file ).replace( /\.html$/, "" );
					setLogFileForTest( baseName );
				}

				// Wait for delay if specified
				if( metadata.delay > 0 ) {
					await page.waitForTimeout( metadata.delay );
				}

				// Execute commands if specified
				if( metadata.commands ) {
					await executeCommands( page, metadata.commands );
				}

				// Wait for render
				await page.waitForTimeout( 100 );

				// Take screenshot
				const screenshotPath = path.join(
					__dirname,
					config.newScreenshotsDir,
					`${testName}.png`
				);

				await page.screenshot( {
					"path": screenshotPath,
					"fullPage": false
				} );

				// If new test, mark as skipped after taking screenshot
				if( isNewTest ) {
					results.skipped++;
					results.tests.push( {
						"name": metadata.name,
						"file": testFile.file,
						"url": testFile.url,
						"status": "skipped",
						"error": "No reference screenshot",
						"screenshotName": testName
					} );

					// Add annotation for skip reason so reporter can pick it up
					test.info().annotations.push( {
						"type": "skip-reason",
						"description": "No reference screenshot"
					} );

					// Skip the test after screenshot is taken
					test.skip( true, "No reference screenshot - new test needs approval" );
					return;
				}

				// Compare with reference
				const comparison = compareImages( referencePath, screenshotPath );

				if( comparison.match ) {
					results.passed++;
					results.tests.push( {
						"name": metadata.name,
						"file": testFile.file,
						"url": testFile.url,
						"status": "passed",
						"screenshotName": testName
					} );
				} else {
					results.failed++;
					results.tests.push( {
						"name": metadata.name,
						"file": testFile.file,
						"url": testFile.url,
						"status": "failed",
						"error": comparison.error || 
							`${comparison.diffPercent}% pixels different`,
						"screenshotName": testName
					} );

					// Fail the test
					throw new Error(
						`Screenshot mismatch: ${comparison.diffPercent}% different`
					);
				}
			} catch( error ) {

				// Check if this is a skip error (thrown by test.skip())
				const isSkipError = error.message && 
					( error.message.includes( "skipped" ) || error.message.includes( "Test is skipped" ) );
				const alreadyRecorded = results.tests.find( t => t.file === testFile.file );
				
				if( !alreadyRecorded && !isSkipError ) {
					const testName = metadata.file || metadata.name;
					results.failed++;
					results.tests.push( {
						"name": metadata.name,
						"file": testFile.file,
						"url": testFile.url,
						"status": "failed",
						"error": error.message,
						"screenshotName": testName
					} );
				}

				// Re-throw all errors including skip errors for Playwright to handle
				throw error;
			}
		} );
	}
} );

// After all tests, generate results page
// Note: This is now handled by the reporter to have access to all worker results
test.afterAll( async () => {
	// Results page generation moved to reporter
} );

