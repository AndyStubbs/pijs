/**
 * Pi.js - Blends Module
 * 
 * Manages the api for blending in WebGL2.
 * 
 * @module api/blends
 */

"use strict";

// Import modules directly
import * as g_screenManager from "../core/screen-manager.js";
import * as g_commands from "../core/commands.js";
import * as g_utils from "../core/utils.js";
import * as g_renderer from "../renderer/renderer.js";

// Blends
export const BLEND_REPLACE = "replace";
export const BLEND_ALPHA = "alpha";
export const BLENDS = new Set( [ BLEND_REPLACE, BLEND_ALPHA ] );


/***************************************************************************************************
 * Module Commands
 ***************************************************************************************************/


// Initialize the blends
export function init( api ) {
	
	// Add Render Screen Data - Store pen and blend configuration only
	g_screenManager.addScreenDataItem( "blends", {
		"blend": BLEND_REPLACE, "noise": null, "noiseSeed": null, "noiseData": []
	} );

	registerCommands();
}


function registerCommands() {
	g_commands.addCommand( "setBlend", setBlend, true, [ "blend" ] );
	g_commands.addCommand( "setNoise", setNoise, true, [ "noise", "seed" ] );
}


/***************************************************************************************************
 * External API Commands
 ***************************************************************************************************/


// Set Blend Command
function setBlend( screenData, options ) {
	let blend = options.blend ?? screenData.blends.blend;

	if( !BLENDS.has( blend ) ) {
		const error = new TypeError(
			`setBlend: Parameter blend is not a valid blend. Valid blends are (` +
			`${Array.from( BLENDS ).join( ", " )}).`
		);
		error.code = "INVALID_BLEND_MODE";
		throw error;
	}

	// Set blend data on screen
	const previousBlend = screenData.blends.blend;
	const previousBlends = structuredClone( screenData.blends );
	screenData.blends.blend = blend;

	// Notify renderer that blend mode has changed
	if( previousBlend !== blend ) {
		g_renderer.blendModeChanged( screenData, previousBlends );
	}
}


// Set Noise Command
function setNoise( screenData, options ) {
	let noise = options.noise;
	let seed = options.seed;

	const noiseErrorMsg = "setNoise: Parameter noise must either be a number ie: 32, a 1d array " +
		"with numbers ie: [23, 13, 15, 0], or a 2d array where the inner array is two arrays " +
		"first array is min values second array is max values for each ie: " +
		"[[23, 15, 18, 0], [32,18, 12, 0]]. The order of items in the inner array is " +
		"[red, green, blue, alpha].";

	let noiseResult = null;

	// Only process noise if it's provided
	if( noise !== null ) {

		// Validate the noise option
		const validateNoiseValFn = ( noiseVal ) => {
			if( noiseVal === null ) {
				const error = new TypeError( noiseErrorMsg );
				error.code = "INVALID_NOISE_VALUE";
				throw error;
			}
		};

		// First validate noise if it's an array
		if( Array.isArray( noise ) ) {

			// Create a blank noise result
			noiseResult = [
				new Float32Array( [ 0, 0, 0, 0 ] ), new Float32Array( [ 0, 0, 0, 0 ] )
			];

			// Loop through the array max of 4 items
			for( let i = 0; i < noise.length && i < 4; i += 1 ) {

				const noiseRow = noise[ i ];
		
				// Validate if 2d array
				if( Array.isArray( noiseRow ) ) {

					// If 2d array ignore any result after 2nd item
					if( i >= 2 ) {
						continue;
					}

					// Loop through inner array max of 4 items
					for( let j = 0; j < noiseRow.length && j < 4; j += 1 ) {
						const noiseVal = g_utils.getInt( noiseRow[ j ], null );
						validateNoiseValFn( noiseVal );
						noiseResult[ i ][ j ] = noiseVal / 255;
					}
				} else {
					const noiseVal = g_utils.getInt( noiseRow, null );
					validateNoiseValFn( noiseVal );

					// Update min and max values based on parallel values
					noiseResult[ 0 ][ i ] = -noiseVal / 255;
					noiseResult[ 1 ][ i ] = noiseVal / 255;
				}
			}
		} else {

			// Validate if noise is an integer
			const noiseVal = g_utils.getInt( noise, null );

			// If noise is an integer it will not be null
			if( noiseVal !== null ) {
				const val = noiseVal / 255;
				noiseResult = [
					new Float32Array( [ -val, -val, -val, -val ] ),
					new Float32Array( [  val,  val,  val,  val ] ),
				];
			}
		}
	}

	// Set seed - if null, use time
	let noiseSeed = g_utils.getFloat( seed, null );

	// Set noise data on screen
	const previousNoise = screenData.blends.noise;
	const previousSeed = screenData.blends.noiseSeed;
	const previousBlends = structuredClone( screenData.blends );

	screenData.blends.noise = noiseResult;
	screenData.blends.noiseSeed = noiseSeed;

	// Check if noise has changed
	let isNoiseChanged = false;
	if( previousNoise === null && noiseResult === null ) {
		isNoiseChanged = false;
	} else if(
		previousNoise === null && noiseResult !== null ||
		previousNoise !== null && noiseResult === null
	) {
		isNoiseChanged = true;
	} else {
		isNoiseChanged = JSON.stringify( previousNoise ) !== JSON.stringify( noiseResult );
	}

	// Check if seed has changed
	const isSeedChanged = previousSeed !== noiseSeed;

	// Notify renderer that noise or seed has changed
	if( isNoiseChanged || isSeedChanged ) {
		g_renderer.blendModeChanged( screenData, previousBlends );
	}
}
