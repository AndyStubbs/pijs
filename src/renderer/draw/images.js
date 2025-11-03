/**
 * Pi.js - Images Drawing Module
 * 
 * Low-level drawing operations: image drawing.
 * 
 * @module renderer/draw/images
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_textures from "../textures.js";
import * as g_utils from "../../core/utils.js";


/**
 * Draw image as textured quad with optional transform
 * 
 * @param {Object} screenData - Screen data object
 * @param {Image|Canvas|WebGLTexture} img - Image, Canvas, or Texture
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} anchorX - Anchor point X (0-1)
 * @param {number} anchorY - Anchor point Y (0-1)
 * @param {number} color - Color value with {r, g, b, a}
 * @param {number} scaleX - Scale X factor
 * @param {number} scaleY - Scale Y factor
 * @param {number} angleRad - Rotation angle in radians
 * @returns {void}
 */
export function drawImage( 
	screenData, img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad
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

	// Calculate corner positions relative to anchor point
	// (top-left at -anchor, bottom-right at size-anchor)
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

	const batchVertices = batch.vertices;
	const batchColors = batch.colors;
	const batchTexCoords = batch.texCoords;

	// Color with alpha
	const r = color.r;
	const g = color.g;
	const b = color.b;
	const a = color.a;

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
	batchVertices[ vIdx++ ] = corners[ 0 ].x;
	batchVertices[ vIdx++ ] = corners[ 0 ].y;
	batchColors[ cIdx++ ] = r;
	batchColors[ cIdx++ ] = g;
	batchColors[ cIdx++ ] = b;
	batchColors[ cIdx++ ] = a;
	batchTexCoords[ tIdx++ ] = texCoords[ 0 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 1 ];

	// Vertex 1: Top-right
	batchVertices[ vIdx++ ] = corners[ 1 ].x;
	batchVertices[ vIdx++ ] = corners[ 1 ].y;
	batchColors[ cIdx++ ] = r;
	batchColors[ cIdx++ ] = g;
	batchColors[ cIdx++ ] = b;
	batchColors[ cIdx++ ] = a;
	batchTexCoords[ tIdx++ ] = texCoords[ 2 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 3 ];

	// Vertex 2: Bottom-left
	batchVertices[ vIdx++ ] = corners[ 2 ].x;
	batchVertices[ vIdx++ ] = corners[ 2 ].y;
	batchColors[ cIdx++ ] = r;
	batchColors[ cIdx++ ] = g;
	batchColors[ cIdx++ ] = b;
	batchColors[ cIdx++ ] = a;
	batchTexCoords[ tIdx++ ] = texCoords[ 4 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 5 ];

	// Triangle 2: Top-right, Bottom-right, Bottom-left
	// Vertex 3: Top-right
	batchVertices[ vIdx++ ] = corners[ 1 ].x;
	batchVertices[ vIdx++ ] = corners[ 1 ].y;
	batchColors[ cIdx++ ] = r;
	batchColors[ cIdx++ ] = g;
	batchColors[ cIdx++ ] = b;
	batchColors[ cIdx++ ] = a;
	batchTexCoords[ tIdx++ ] = texCoords[ 6 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 7 ];

	// Vertex 4: Bottom-right
	batchVertices[ vIdx++ ] = corners[ 3 ].x;
	batchVertices[ vIdx++ ] = corners[ 3 ].y;
	batchColors[ cIdx++ ] = r;
	batchColors[ cIdx++ ] = g;
	batchColors[ cIdx++ ] = b;
	batchColors[ cIdx++ ] = a;
	batchTexCoords[ tIdx++ ] = texCoords[ 8 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 9 ];

	// Vertex 5: Bottom-left
	batchVertices[ vIdx++ ] = corners[ 2 ].x;
	batchVertices[ vIdx++ ] = corners[ 2 ].y;
	batchColors[ cIdx++ ] = r;
	batchColors[ cIdx++ ] = g;
	batchColors[ cIdx++ ] = b;
	batchColors[ cIdx++ ] = a;
	batchTexCoords[ tIdx++ ] = texCoords[ 10 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 11 ];

	// Update batch count
	batch.count += 6;
}

