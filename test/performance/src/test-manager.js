/**
 * Test Manager Module
 * 
 * Handles test registration, execution, and result management for performance tests.
 * 
 * @module test-manager
 */

/**
 * Test List:
 * Line (implemented)
 * Graphics Pixel (implemented)
 * Graphics Canvas
 * Images
 * Draw
 * Get/Put
 * Graphics and Images
 * Print Pixel
 * Print Canvas
 * Print Bitmap
 * Colors
 */

export { init, startTests, getTargetFps, calculateTargetFPS };

"use strict";

// Import all available tests
import * as g_psetTest from "./tests/pset.js";
import * as g_lineTest from "./tests/line.js";
import * as g_graphicsPixelTest from "./tests/graphicsPixel.js";
import * as g_bezierTest from "./tests/bezier.js";
import * as g_reportManager from "./report-manager.js";

const REDUCED_FLASHING_OPACITY = "0.2";

// Get all test config data
let m_tests = [];
m_tests.push( g_psetTest.getConfig() );
m_tests.push( g_lineTest.getConfig() );
m_tests.push( g_graphicsPixelTest.getConfig() );
m_tests.push( g_bezierTest.getConfig() );

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
}

/**
 * Starts the test suite from the beginning
 * 
 * @returns {void}
 */
function startTests() {

	// Update screen opacity based on setting
	if( localStorage.getItem( "reducedFlashing" ) === "true" ) {
		$.canvas().style.opacity = REDUCED_FLASHING_OPACITY;
	} else {
		$.canvas().style.opacity = "";
	}
	
	m_testIndex = -1;
	m_results = [];
	runNextTest();
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
 * @returns {void}
 */
function runNextTest() {
	const WARMUP_TIME = 5000;
	const MAX_TIME = 30000;
	const EXTRA_TIME = 5000;
	const MAX_INSTABILITY = 0.5;
	const SLOPE_CALC_SIZE = 35;

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
					( score, result ) => score + Math.round( result.itemCountPerSecond / 100 ), 0
				) / m_results.length
			)
		};
		$.canvas().style.opacity = "";
		g_reportManager.showResults( resultsObject );
		return;
	}

	let test = m_tests[ m_testIndex ];
	let itemCount = test.itemCountStart;
	let startTime = 0;
	let lt = 0;
	let extraTime = 0;

	// Most recent item counts
	let recentItemCounts = [];

	// Initialize the test
	test.init();

	// Start the test loop
	requestAnimationFrame( loop );

	// Test Loop Function
	function loop( t ) {
		if( !startTime ) {
			startTime = t;
		}

		// Compute Times
		let dt = t - lt;
		let fps = calcFpsFromMs( dt );
		let elapsed = t - startTime;

		// Track the recent frame counts to calculate stability
		if( recentItemCounts.length >= SLOPE_CALC_SIZE ) {
			recentItemCounts.shift();
		}
		recentItemCounts.push( itemCount );
		let instability = Math.abs( calcSlope( recentItemCounts ) );

		if( elapsed > WARMUP_TIME ) {

			// Extend extra time because the calculation are stable
			if( instability > MAX_INSTABILITY ) {
				extraTime = elapsed + EXTRA_TIME;
			}

			if(
				// If we have reached the MAX_TIME - end test incomplete
				( elapsed > MAX_TIME ) ||

				// If item count is stable and extra time has been hit then complete the test
				( instability <= MAX_INSTABILITY && elapsed > extraTime )
			) {
				let status = "complete";
				if( instability > MAX_INSTABILITY ) {
					status = "incomplete";
				}
				const itemCountAvg = calcAvg( recentItemCounts );
				m_results.push( {
					"name": test.name,
					"status": status,
					"itemCountAvg": itemCountAvg,
					"itemCountPerSecond": itemCountAvg * m_targetFps,
					"testTime": elapsed,
					"score": Math.round( ( itemCountAvg * m_targetFps ) / 100 )
				} );
				
				// Call the test cleanup
				test.cleanUp();

				// Run the next test
				return runNextTest();
			}
		} else {

			// Ensure a minimum of extra time after warm up
			extraTime = elapsed + EXTRA_TIME;
		}

		if( fps < m_targetFps * 0.95 ) {

			if( elapsed > WARMUP_TIME ) {

				// After warmup time decrement slowly
				itemCount = Math.max( itemCount - 1, 1 );

				// We have passed the warmup time and have hit a item count maximum
				if( extraTime === 0 ) {
					extraTime = elapsed + EXTRA_TIME;
				}
			} else {

				// During warmup time decrement quicker

				// If a big miss decrement even quicker
				if( fps < m_targetFps * 0.3 ) {
					itemCount = Math.max( itemCount - 30, 1 );
				} else {
					itemCount = Math.max( itemCount - 10, 1 );
				}
			}
		} else {

			// Running at framerate

			// During warmup time increment quicker
			if( elapsed > WARMUP_TIME ) {
				itemCount += 1;
			} else {
				itemCount += 10;
			}
		}

		test.run( itemCount, test.data );

		//$.cls( 0, 0, 155, 65 );
		$.setColor( "black" );
		$.rect( 0, 0, 155, 65, "black" );
		$.setColor( 15 );
		$.print( "Item Count:  " + itemCount.toFixed( 0 ).padStart( 6, " " ) );
		$.print( "Target FPS:  " + m_targetFps.toFixed( 0 ).padStart( 6, " " ) );
		$.print( "FPS:         " + fps.toFixed( 0 ).padStart( 6, " " ) );
		if( instability !== null ) {
			if( extraTime === elapsed + EXTRA_TIME ) {
				$.setColor( 4 );
			}
			$.print( "Instability: " + instability.toFixed( 2 ).padStart( 6, " " ) );
		}

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


