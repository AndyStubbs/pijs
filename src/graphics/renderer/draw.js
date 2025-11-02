/**
 * Pi.js - Low-Level Drawing Module
 * 
 * Low-level drawing operations: pixel writes and image drawing.
 * 
 * @module graphics/renderer/draw
 */

"use strict";

import * as g_batches from "./batches.js";
import * as g_textures from "./textures.js";
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
export function drawPixelUnsafe( screenData, x, y, color ) {

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
 * Fast path for single pixel write with batch preparation
 * Used when you need to ensure batch capacity before drawing
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawPixelUnsafeWithPrepare( screenData, x, y, color ) {

	// Prepare batch for 1 vertex
	g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, 1 );

	// Draw pixel
	drawPixelUnsafe( screenData, x, y, color );
}

/**
 * Draw image as textured quad with optional transform
 * 
 * @param {Object} screenData - Screen data object
 * @param {Image|Canvas|WebGLTexture} img - Image, Canvas, or Texture
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} angleRad - Rotation angle in radians
 * @param {number} anchorX - Anchor point X (0-1)
 * @param {number} anchorY - Anchor point Y (0-1)
 * @param {number} alpha - Alpha value (0-1)
 * @param {number} scaleX - Scale X factor
 * @param {number} scaleY - Scale Y factor
 * @returns {void}
 */
export function drawImage( 
	screenData, img, x, y, angleRad, anchorX, anchorY, alpha, scaleX, scaleY 
) {

	// Get or create texture
	const texture = g_textures.getWebGL2Texture( screenData, img );
	if( !texture ) {
		console.error( "Failed to get/create texture for image" );
		return;
	}

	// Calculate image dimensions
	const imgWidth = img.width;
	const imgHeight = img.height;

	// Calculate anchor position in pixels
	const anchorXPx = Math.round( imgWidth * anchorX );
	const anchorYPx = Math.round( imgHeight * anchorY );

	// Calculate scaled dimensions
	const scaledWidth = imgWidth * scaleX;
	const scaledHeight = imgHeight * scaleY;

	// Calculate corner positions relative to anchor point (top-left at -anchor, bottom-right at size-anchor)
	const corners = [
		{ "x": -anchorXPx, "y": -anchorYPx },                    // Top-left
		{ "x": scaledWidth - anchorXPx, "y": -anchorYPx },      // Top-right
		{ "x": -anchorXPx, "y": scaledHeight - anchorYPx },     // Bottom-left
		{ "x": scaledWidth - anchorXPx, "y": scaledHeight - anchorYPx } // Bottom-right
	];

	// Rotate corners around (0,0) then translate to (x,y)
	const cos = Math.cos( angleRad );
	const sin = Math.sin( angleRad );
	for( let i = 0; i < corners.length; i++ ) {
		const corner = corners[ i ];
		const rx = corner.x * cos - corner.y * sin;
		const ry = corner.x * sin + corner.y * cos;
		corner.x = rx + x;
		corner.y = ry + y;
	}

	// Texture coordinates (full image)
	const texCoords = [
		0, 0,  // Top-left
		1, 0,  // Top-right
		0, 1,  // Bottom-left
		1, 0,  // Top-right (repeat for second triangle)
		1, 1,  // Bottom-right
		0, 1   // Bottom-left (repeat for second triangle)
	];

	// Prepare batch for 6 vertices (2 triangles)
	// prepareBatch will handle texture change detection and segment creation
	const batch = screenData.batches[ g_batches.IMAGE_BATCH ];
	g_batches.prepareBatch( screenData, g_batches.IMAGE_BATCH, 6, img, texture );

	// Color with alpha
	const r = Math.round( 255 );
	const g = Math.round( 255 );
	const b = Math.round( 255 );
	const a = Math.round( alpha );

	// Add two triangles (6 vertices)
	const baseIdx = batch.count;
	const vertexBase = baseIdx * batch.vertexComps;
	const colorBase = baseIdx * batch.colorComps;
	const texBase = baseIdx * batch.texCoordComps;

	// Triangle 1: Top-left, Top-right, Bottom-left
	let vIdx = vertexBase;
	let cIdx = colorBase;
	let tIdx = texBase;

	// Vertex 0: Top-left
	batch.vertices[ vIdx++ ] = corners[ 0 ].x;
	batch.vertices[ vIdx++ ] = corners[ 0 ].y;
	batch.colors[ cIdx++ ] = r;
	batch.colors[ cIdx++ ] = g;
	batch.colors[ cIdx++ ] = b;
	batch.colors[ cIdx++ ] = a;
	batch.texCoords[ tIdx++ ] = texCoords[ 0 ];
	batch.texCoords[ tIdx++ ] = texCoords[ 1 ];

	// Vertex 1: Top-right
	batch.vertices[ vIdx++ ] = corners[ 1 ].x;
	batch.vertices[ vIdx++ ] = corners[ 1 ].y;
	batch.colors[ cIdx++ ] = r;
	batch.colors[ cIdx++ ] = g;
	batch.colors[ cIdx++ ] = b;
	batch.colors[ cIdx++ ] = a;
	batch.texCoords[ tIdx++ ] = texCoords[ 2 ];
	batch.texCoords[ tIdx++ ] = texCoords[ 3 ];

	// Vertex 2: Bottom-left
	batch.vertices[ vIdx++ ] = corners[ 2 ].x;
	batch.vertices[ vIdx++ ] = corners[ 2 ].y;
	batch.colors[ cIdx++ ] = r;
	batch.colors[ cIdx++ ] = g;
	batch.colors[ cIdx++ ] = b;
	batch.colors[ cIdx++ ] = a;
	batch.texCoords[ tIdx++ ] = texCoords[ 4 ];
	batch.texCoords[ tIdx++ ] = texCoords[ 5 ];

	// Triangle 2: Top-right, Bottom-right, Bottom-left
	// Vertex 3: Top-right
	batch.vertices[ vIdx++ ] = corners[ 1 ].x;
	batch.vertices[ vIdx++ ] = corners[ 1 ].y;
	batch.colors[ cIdx++ ] = r;
	batch.colors[ cIdx++ ] = g;
	batch.colors[ cIdx++ ] = b;
	batch.colors[ cIdx++ ] = a;
	batch.texCoords[ tIdx++ ] = texCoords[ 6 ];
	batch.texCoords[ tIdx++ ] = texCoords[ 7 ];

	// Vertex 4: Bottom-right
	batch.vertices[ vIdx++ ] = corners[ 3 ].x;
	batch.vertices[ vIdx++ ] = corners[ 3 ].y;
	batch.colors[ cIdx++ ] = r;
	batch.colors[ cIdx++ ] = g;
	batch.colors[ cIdx++ ] = b;
	batch.colors[ cIdx++ ] = a;
	batch.texCoords[ tIdx++ ] = texCoords[ 8 ];
	batch.texCoords[ tIdx++ ] = texCoords[ 9 ];

	// Vertex 5: Bottom-left
	batch.vertices[ vIdx++ ] = corners[ 2 ].x;
	batch.vertices[ vIdx++ ] = corners[ 2 ].y;
	batch.colors[ cIdx++ ] = r;
	batch.colors[ cIdx++ ] = g;
	batch.colors[ cIdx++ ] = b;
	batch.colors[ cIdx++ ] = a;
	batch.texCoords[ tIdx++ ] = texCoords[ 10 ];
	batch.texCoords[ tIdx++ ] = texCoords[ 11 ];

	// Update batch count
	batch.count += 6;
}

