/**
 * Pi.js - Ellipses Drawing Module
 * 
 * Low-level drawing operations: ellipse drawing.
 * 
 * drawEllipse, drawEllipseSquare, drawEllipseCircle
 * 
 * @module renderer/draw/ellipses
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_textures from "../textures.js";
import * as g_utils from "../../core/utils.js";


/**
 * Draw ellipse outline or filled
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} rx - Radius X
 * @param {number} ry - Radius Y
 * @param {number} color - Outline color
 * @param {number} fillColor - Fill color (or null for outline only)
 * @param {Function} penFn - Pen function for outline pixels
 * @param {Function} blendFn - Blend function for fill pixels
 * @returns {void}
 */
export function drawEllipse( screenData, cx, cy, rx, ry, color, fillColor, penFn, blendFn ) {

	// TODO: Implement drawEllipse
}

