/**
 * Pi.js - Bezier Drawing Module
 * 
 * Low-level drawing operations: bezier drawing.
 * 
 * drawBezierPenPixel, drawBezierPenSquare, drawBezierPenCircle
 * 
 * @module renderer/draw/bezier
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_textures from "../textures.js";
import * as g_utils from "../../core/utils.js";

/**
 * Draw bezier curve with adaptive tessellation
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} p0x - Control point 0 X
 * @param {number} p0y - Control point 0 Y
 * @param {number} p1x - Control point 1 X
 * @param {number} p1y - Control point 1 Y
 * @param {number} p2x - Control point 2 X
 * @param {number} p2y - Control point 2 Y
 * @param {number} p3x - Control point 3 X
 * @param {number} p3y - Control point 3 Y
 * @param {number} color - Color value
 * @param {Function} penFn - Pen function for drawing pixels
 * @returns {void}
 */
export function drawBezier( 
	screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color, penFn 
) {

	// TODO: Implement drawBezier with adaptive tessellation
}
