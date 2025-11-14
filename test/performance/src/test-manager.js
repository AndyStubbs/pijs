/**
 * Test Manager Module
 * 
 * Handles test registration, execution, and result management for performance tests.
 * 
 * @module test-manager
 */

const TEST_DURATION = 15000;

export { init, startTests, getTargetFps, calculateTargetFPS };

"use strict";

import * as g_imageLoader from "./image-loader.js";

// Import all available tests
import * as g_psetTest from "./tests/pset.js";
import * as g_lineTest from "./tests/line.js";
import * as g_graphicsTest from "./tests/graphics.js";
import * as g_imagesTest from "./tests/images.js";
import * as g_imagesTest2 from "./tests/images2.js";
import * as g_bezierTest from "./tests/bezier.js";
import * as g_reportManager from "./report-manager.js";


const REDUCED_FLASHING_OPACITY = "0.2";

// Get all test config data
let m_tests = [];
//m_tests.push( g_psetTest.getConfig() );
//m_tests.push( g_lineTest.getConfig() );
//m_tests.push( g_graphicsTest.getConfig() );

// m_tests.push( g_imagesTest.getConfig( false, false ) );
// m_tests.push( g_imagesTest.getConfig( true, false ) );
// m_tests.push( g_imagesTest.getConfig( false, true ) );
// m_tests.push( g_imagesTest.getConfig( true, true ) );

// // Blit Images
// m_tests.push( g_imagesTest2.getConfig( true, false, true ) );
// m_tests.push( g_imagesTest2.getConfig( true, false, false ) );

// // Draw Images
// m_tests.push( g_imagesTest2.getConfig( false, false, true ) );
// m_tests.push( g_imagesTest2.getConfig( false, false, false ) );

// Images Advanced Test - All 8 combinations
const allImageTestOptions = [
	"blit-images",
	"blit-images-colors",
	"blit-sprites",
	"blit-sprites-colors",
	"draw-images",
	"draw-images-colors",
	"draw-sprites",
	"draw-sprites-colors"
];

m_tests.push( g_imagesTest2.getConfig( [ "draw-images" ] ) );
// Generate separate test for each combination
// for( let i = 0; i < allImageTestOptions.length; i++ ) {
// 	m_tests.push( g_imagesTest2.getConfig( [ allImageTestOptions[ i ] ] ) );
// }

// Or use a single mixed test with all options:
// m_tests.push( g_imagesTest2.getConfig( allImageTestOptions ) );
//m_tests.push( g_bezierTest.getConfig() );

// Global state for the test manager
let m_results = [];
let m_testIndex = -1;
let m_targetFps = 60;
let m_api = null;

/*
 * Initializes the test manager
 * 
 * @param {Object} api - API object with showMainMenu and other functions
 * @returns {void}
 */
async function init( api ) {
	m_api = api;
	await calculateTargetFPS();
	g_imageLoader.init();
}

/**
 * Starts the test suite from the beginning
 * 
 * @returns {Promise<void>}
 */
async function startTests() {

	// Update screen opacity based on setting
	if( localStorage.getItem( "reducedFlashing" ) === "true" ) {
		$.canvas().style.opacity = REDUCED_FLASHING_OPACITY;
	} else {
		$.canvas().style.opacity = "";
	}
	
	m_testIndex = -1;
	m_results = [];
	await runNextTest();
}

/**
 * Gets the current target FPS
 * 
 * @returns {number} The target FPS value
 */
function getTargetFps() {
	return m_targetFps;
}


/**
 * Calculates the target FPS for the current system
 * 
 * @returns {Promise<number>} The calculated target FPS
 */
async function calculateTargetFPS() {
	const CALC_TIME = 3000;
	let lt = 0;
	
	return new Promise( ( resolve ) => {
		requestAnimationFrame( loop );
		
		let duration = 0;
		let samples = [];
		function loop( t ) {
			if( lt > 0 ) {
				let dt = t - lt;
				samples.push( dt );
				duration += dt;
				frames += 1;
			}
			lt = t;
			if( duration < CALC_TIME ) {
				requestAnimationFrame( loop );
			} else {
				if( samples.length === 0 ) {
					return 60;
				}

				// Remove outliers
				let originalLength = samples.length;
				const sum = samples.reduce( ( sum, sample ) => sum += sample, 0 );
				const avg = sum / samples.length;
				let minAvg = avg * 0.95;
				let maxAvg = avg * 1.05;
				samples = samples.filter( sample => {
					return sample > minAvg && sample < maxAvg
				} );
				const sum2 = samples.reduce( ( sum, sample ) => sum += sample, 0 );
				
				let rawFps;
				if( samples.length === 0 ) {
					rawFps = calcFpsFromMs( sum / originalLength );
				} else {
					rawFps = calcFpsFromMs( sum2 / samples.length );
				}
				const fps = Math.round( rawFps * 100 ) / 100;
				m_targetFps = fps;
				resolve( fps );
			}
		}
	} );
}

/**
 * Runs the next test in the queue
 * 
 * @returns {Promise<void>}
 */
async function runNextTest() {
	const SAMPLES_COUNT = 500;

	m_testIndex += 1;
	if( m_testIndex >= m_tests.length ) {
		if( m_results.length === 0 ) {
			throw new Error( "Error, no results found after tests completed." );
		}
		const resultsObject = {
			"version": $.version || "Unknown",
			"date": new Date().toLocaleString(),
			"targetFps": m_targetFps,
			"tests": m_results,
			"score": Math.round(
				m_results.reduce(
					( score, result ) => score + Math.round( result.score ), 0
				) / m_results.length
			)
		};
		$.canvas().style.opacity = "";
		g_reportManager.showResults( resultsObject );
		return;
	}

	let test = m_tests[ m_testIndex ];

	if( test.exludeVersions.includes( $.version ) ) {
		m_results.push( {
			"name": test.name,
			"avgFps": 0,
			"itemCountAvg": 0,
			"itemCountPerSecond": 0,
			"testTime": 0,
			"score": 0
		} );
		return await runNextTest();
	}

	let itemCount = test.itemCountStart;
	let startTime = 0;
	let lt = 0;

	// Most recent item counts
	let recentItemCounts = [];
	let recentFps = [];

	// Initialize the test
	await test.init( test );

	// Start the test loop
	requestAnimationFrame( loop );

	// Test Loop Function
	async function loop( t ) {
		if( !startTime ) {
			startTime = t;
		}

		// Compute Times
		let elapsed = t - startTime;

		if( TEST_DURATION - elapsed <= 0 ) {
			const itemCountAvg = calcAvg( recentItemCounts );
			const avgFps = calcAvg( recentFps );
			let score = Math.round( ( itemCountAvg * avgFps ) / 100 );
			m_results.push( {
				"name": test.name,
				"avgFps": avgFps.toFixed( 2 ),
				"itemCountAvg": itemCountAvg,
				"itemCountPerSecond": itemCountAvg * m_targetFps,
				"testTime": elapsed,
				"score": score
			} );
			
			// Call the test cleanup
			test.cleanUp();

			// Run the next test
			return await runNextTest();
		}

		let frameStartTime = performance.now();
		test.run( itemCount, test.data );
		let frameEndTime = performance.now();
		let frameDuration = ( frameEndTime - frameStartTime );
		let currentFps = calcFpsFromMs( frameDuration );
		
		// Track the recent frame counts to calculate stability
		if( recentItemCounts.length >= SAMPLES_COUNT ) {
			recentItemCounts.shift();
		}
		recentItemCounts.push( itemCount );

		// Track the recnet FPS
		if( recentFps.length >= SAMPLES_COUNT ) {
			recentFps.shift();
		}
		recentFps.push( currentFps );
		
		// Adjust item count based on how much we beat target fps
		if( currentFps > m_targetFps * 1.1 ) {

			// Speed up
			let increment = 1;
			if( currentFps > m_targetFps * 1.125 ) increment = 5;
			if( currentFps > m_targetFps * 1.15 )  increment = 15;
			if( currentFps > m_targetFps * 1.25 )  increment = 25;
			if( currentFps > m_targetFps * 1.5 )   increment = 50;
			if( currentFps > m_targetFps * 2 )     increment = 100;
			if( currentFps > m_targetFps * 3 )     increment = 200;

			if( itemCount < 100 ) {
				increment = 1;
			} else if( itemCount < 200 ) {
				increment = Math.min( increment, 50 );
			}

			// Speed up faster in first half of test
			if( elapsed < TEST_DURATION / 2 ) {
				increment *= 5;
			}
			itemCount += increment;
		} else if( currentFps < m_targetFps ) {

			// Slow down
			let decrement = 1;
			if( currentFps < m_targetFps * 0.95 ) decrement = 5;
			if( currentFps < m_targetFps * 0.90 ) decrement = 15;
			if( currentFps < m_targetFps * 0.85 ) decrement = 25;
			if( currentFps < m_targetFps * 0.50 ) decrement = 50;
			if( currentFps < m_targetFps * 0.30 ) decrement = 100;
			if( currentFps < m_targetFps * 0.20 ) decrement = 200;
			if( itemCount < 100 ) {
				decrement = 1;
			} else if( itemCount < 200 ) {
				decrement = Math.min( decrement, 50 );
			}

			// Slow down faster in first half of test
			if( elapsed < TEST_DURATION / 2 ) {
				decrement *= 5;
			}
			itemCount = Math.max( itemCount - decrement, 1 );
		}

		//$.cls( 0, 0, 155, 65 );
		$.setColor( "black" );
		$.rect( 0, 0, 200, 82, "black" );
		$.setColor( 14 );
		$.setPos( 0, 0 );
		$.print( test.name );
		$.setColor( 15 );
		$.print( "Item Count:" + itemCount.toFixed( 0 ).padStart( 13, " " ) );
		$.print( "Target FPS:" + m_targetFps.toFixed( 0 ).padStart( 13, " " ) );
		$.print( "Frame FPS:" + currentFps.toFixed( 0 ).padStart( 14, " " ) );
		$.print(
			"Test Time:" + ( ( TEST_DURATION - elapsed ) / 1000 ).toFixed( 2 ).padStart( 14, " " )
		);

		lt = t;
		requestAnimationFrame( loop );
	};
}

/**
 * Calculates the average of an array of numbers
 * 
 * @param {Array<number>} data - Array of numbers
 * @returns {number} The average value
 */
function calcAvg( data ) {
	if( data.length === 0 ) {
		return 0;
	}
	return data.reduce( ( sum, item ) => sum + item, 0 ) / data.length;
}

/**
 * Calculates FPS from milliseconds
 * 
 * @param {number} ms - Milliseconds per frame
 * @returns {number} FPS value
 */
function calcFpsFromMs( ms ) {
	if( ms <= 0 ) return 0;
	return 1000 / ms;
}

/**
 * Calculates slope from a queue of data points
 * 
 * @param {Array<number>} dataPoints - Array of data points
 * @returns {number|null} The calculated slope or null if insufficient data
 */
function calcSlope( dataPoints ) {
	const n = dataPoints.length;

	// Need at least 2 points to calculate a slope
	if( n < 2 ) {
		return null;
	}

	let sum_x = 0;     // Sum of x-coordinates (indices)
	let sum_y = 0;     // Sum of y-coordinates (data values)
	let sum_xy = 0;    // Sum of (x * y)
	let sum_xx = 0;    // Sum of (x * x)

	for( let i = 0; i < n; i++ ) {
		const x = i;          		// x-coordinate is the index
		const y = dataPoints[ i ]; 	// y-coordinate is the data point value

		sum_x += x;
		sum_y += y;
		sum_xy += ( x * y );
		sum_xx += ( x * x );
	}

	// Calculate the numerator and denominator for the slope formula:
	// m = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x)
	const numerator = n * sum_xy - sum_x * sum_y;
	const denominator = n * sum_xx - sum_x * sum_x;

	return numerator / denominator;
}


