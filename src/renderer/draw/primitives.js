/**
 * Pi.js - Low-Level Drawing Module
 * 
 * Low-level drawing operations: pixel writes
 * 
 * @module renderer/draw/primitives
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_textures from "../textures.js";
import * as g_utils from "../../core/utils.js";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize draw module
 * 
 * @returns {void}
 */
export function init() {

	// Nothing to initialize yet
}

/**
 * Fast path for single pixel write (unsafe - no bounds checking)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawPixel( screenData, x, y, color ) {

	// Add directly to point batch
	const batch = screenData.batches[ g_batches.POINTS_BATCH ];
	const idx = batch.count * batch.vertexComps;
	const cidx = batch.count * batch.colorComps;
	
	batch.vertices[ idx     ] = x;
	batch.vertices[ idx + 1 ] = y;
	batch.colors[ cidx     ] = color.r;
	batch.colors[ cidx + 1 ] = color.g;
	batch.colors[ cidx + 2 ] = color.b;
	batch.colors[ cidx + 3 ] = color.a;

	batch.count++;
}

/**
 * Write a pixel where blending is always disabled regardless of blend mode. This is needed for the
 * put command because it allows writing of 0 - fully transparent pixel even when pen is set to
 * alpha.
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawPixelReplace( screenData, x, y, color ) {

	// Add directly to point batch
	const batch = screenData.batches[ g_batches.POINTS_REPLACE_BATCH ];
	const idx = batch.count * batch.vertexComps;
	const cidx = batch.count * batch.colorComps;
	
	batch.vertices[ idx     ] = x;
	batch.vertices[ idx + 1 ] = y;
	batch.colors[ cidx     ] = color.r;
	batch.colors[ cidx + 1 ] = color.g;
	batch.colors[ cidx + 2 ] = color.b;
	batch.colors[ cidx + 3 ] = color.a;

	batch.count++;
}
