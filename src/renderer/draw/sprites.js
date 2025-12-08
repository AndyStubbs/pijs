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

// Color array map to speed up copying of colors to vertices
const MAX_QUAD_COLOR_MAP_SIZE = 1000;
const m_quadColorMap = new Map();

/**
 * Calculate transformed corner positions for a quad
 * 
 * @param {number} width - Quad width
 * @param {number} height - Quad height
 * @param {number} anchorX - Anchor point X (0-1)
 * @param {number} anchorY - Anchor point Y (0-1)
 * @param {number} scaleX - Scale X factor
 * @param {number} scaleY - Scale Y factor
 * @param {number} angleRad - Rotation angle in radians
 * @param {number} x - Translation X
 * @param {number} y - Translation Y
 * @returns {Array<Object>} Array of 4 corner objects with x, y properties
 */
function calculateTransformedCorners(
	width, height, anchorX, anchorY, scaleX, scaleY, angleRad, x, y
) {

	// Calculate scaled dimensions first
	const scaledWidth = width * scaleX;
	const scaledHeight = height * scaleY;

	// Calculate anchor position in pixels from scaled dimensions
	const anchorXPx = Math.round( scaledWidth * anchorX );
	const anchorYPx = Math.round( scaledHeight * anchorY );

	// Calculate corner positions relative to anchor point
	const corners = [
		{ "x": -anchorXPx, "y": -anchorYPx },								// Top-left
		{ "x": scaledWidth - anchorXPx, "y": -anchorYPx },					// Top-right
		{ "x": -anchorXPx, "y": scaledHeight - anchorYPx },					// Bottom-left
		{ "x": scaledWidth - anchorXPx, "y": scaledHeight - anchorYPx }		// Bottom-right
	];

	// Rotate corners around (0,0) then translate to (x,y)
	if( angleRad !== 0 ) {
		const cos = Math.cos( angleRad );
		const sin = Math.sin( angleRad );
		for( let i = 0; i < corners.length; i++ ) {
			const corner = corners[ i ];
			const rx = corner.x * cos - corner.y * sin;
			const ry = corner.x * sin + corner.y * cos;
			corner.x = rx + x;
			corner.y = ry + y;
		}
	} else {
		
		// No rotation, just translate
		for( let i = 0; i < corners.length; i++ ) {
			corners[ i ].x += x;
			corners[ i ].y += y;
		}
	}

	return corners;
}

/**
 * Add a textured quad (2 triangles, 6 vertices) to IMAGE_BATCH
 * 
 * TODO-LATER: Move to batch helpers and call addQuadToBatch
 * 
 * @param {Object} screenData - Screen data object
 * @param {WebGLTexture} texture - WebGL texture
 * @param {Array<Object>} corners - Array of 4 corner objects with x, y properties
 * @param {Array<number>} texCoords - Array of 12 texture coordinates (2 per vertex for 6 vertices)
 * @param {Uint8Array} colorQuadArray - Color array with 6 sets of 4 color values (24 values)
 * @returns {void}
 */
function addTexturedQuadToBatch(
	screenData, texture, corners, texCoords, colorQuadArray, batchType
) {

	// Prepare batch for 6 vertices (2 triangles)
	const batch = screenData.batches[ batchType ];
	g_batches.prepareBatch( screenData, batchType, 6, texture );

	const batchVertices = batch.vertices;
	const batchTexCoords = batch.texCoords;
	const batchColors = batch.colors;

	// Add two triangles (6 vertices)
	const baseIdx = batch.count;
	const vertexBase = baseIdx * batch.vertexComps;
	const texBase = baseIdx * batch.texCoordComps;
	const colorBase = baseIdx * batch.colorComps;

	// Triangle 1: Top-left, Top-right, Bottom-left
	let vIdx = vertexBase;
	let tIdx = texBase;

	// Vertex 0: Top-left
	batchVertices[ vIdx++ ] = corners[ 0 ].x;
	batchVertices[ vIdx++ ] = corners[ 0 ].y;
	batchTexCoords[ tIdx++ ] = texCoords[ 0 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 1 ];

	// Vertex 1: Top-right
	batchVertices[ vIdx++ ] = corners[ 1 ].x;
	batchVertices[ vIdx++ ] = corners[ 1 ].y;
	batchTexCoords[ tIdx++ ] = texCoords[ 2 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 3 ];

	// Vertex 2: Bottom-left
	batchVertices[ vIdx++ ] = corners[ 2 ].x;
	batchVertices[ vIdx++ ] = corners[ 2 ].y;
	batchTexCoords[ tIdx++ ] = texCoords[ 4 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 5 ];

	// Triangle 2: Top-right, Bottom-right, Bottom-left
	// Vertex 3: Top-right
	batchVertices[ vIdx++ ] = corners[ 1 ].x;
	batchVertices[ vIdx++ ] = corners[ 1 ].y;
	batchTexCoords[ tIdx++ ] = texCoords[ 6 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 7 ];

	// Vertex 4: Bottom-right
	batchVertices[ vIdx++ ] = corners[ 3 ].x;
	batchVertices[ vIdx++ ] = corners[ 3 ].y;
	batchTexCoords[ tIdx++ ] = texCoords[ 8 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 9 ];

	// Vertex 5: Bottom-left
	batchVertices[ vIdx++ ] = corners[ 2 ].x;
	batchVertices[ vIdx++ ] = corners[ 2 ].y;
	batchTexCoords[ tIdx++ ] = texCoords[ 10 ];
	batchTexCoords[ tIdx++ ] = texCoords[ 11 ];

	batchColors.set( colorQuadArray, colorBase );

	// Update batch count
	batch.count += 6;
}

function getQuadColorArray( color ) {
	let quadColorArray = m_quadColorMap.get( color.key );

	if( quadColorArray === undefined ) {

		// Simple approach: Clear the entire map. Aggressive but easy.
		if( m_quadColorMap.size >= MAX_QUAD_COLOR_MAP_SIZE ) {
			m_quadColorMap.clear();
		}
		
		const r = color.r;
		const g = color.g;
		const b = color.b;
		const a = color.a;

		// Create the quad color array
		quadColorArray = new Uint8Array( 24 );
		quadColorArray[ 0 ] = r;
		quadColorArray[ 1 ] = g;
		quadColorArray[ 2 ] = b;
		quadColorArray[ 3 ] = a;
		quadColorArray[ 4 ] = r;
		quadColorArray[ 5 ] = g;
		quadColorArray[ 6 ] = b;
		quadColorArray[ 7 ] = a;
		quadColorArray[ 8 ] = r;
		quadColorArray[ 9 ] = g;
		quadColorArray[ 10 ] = b;
		quadColorArray[ 11 ] = a;
		quadColorArray[ 12 ] = r;
		quadColorArray[ 13 ] = g;
		quadColorArray[ 14 ] = b;
		quadColorArray[ 15 ] = a;
		quadColorArray[ 16 ] = r;
		quadColorArray[ 17 ] = g;
		quadColorArray[ 18 ] = b;
		quadColorArray[ 19 ] = a;
		quadColorArray[ 20 ] = r;
		quadColorArray[ 21 ] = g;
		quadColorArray[ 22 ] = b;
		quadColorArray[ 23 ] = a;

		// Add the key to map
		m_quadColorMap.set( color.key, quadColorArray );
	}
	return quadColorArray;
}

/**
 * Draw image as textured quad with optional transform
 * 
 * @param {Object} screenData - Screen data object
 * @param {Image|Canvas|WebGLTexture} img - Image, Canvas, or Texture
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} anchorX - Anchor point X (0-1)
 * @param {number} anchorY - Anchor point Y (0-1)
 * @param {Object} color - Color value object with rgba and key for map lookups
 * @param {number} scaleX - Scale X factor
 * @param {number} scaleY - Scale Y factor
 * @param {number} angleRad - Rotation angle in radians
 * @returns {void}
 */
export function drawImage( 
	screenData, img, x, y, color, anchorX, anchorY, scaleX, scaleY, angleRad,
	batchType = g_batches.IMAGE_BATCH
) {

	// Get or create texture
	const texture = g_textures.getWebGL2Texture( screenData, img );

	// Calculate image dimensions
	const imgWidth = img.width;
	const imgHeight = img.height;

	// Calculate transformed corners
	const corners = calculateTransformedCorners(
		imgWidth, imgHeight, anchorX, anchorY, scaleX, scaleY, angleRad, x, y
	);

	// Texture coordinates (full image)
	const texCoords = [
		0, 0,  // Top-left
		1, 0,  // Top-right
		0, 1,  // Bottom-left
		1, 0,  // Top-right (repeat for second triangle)
		1, 1,  // Bottom-right
		0, 1   // Bottom-left (repeat for second triangle)
	];

	// Add textured quad to batch
	addTexturedQuadToBatch(
		screenData, texture, corners, texCoords, getQuadColorArray( color ), batchType
	);
}

/**
 * Draw sprite (sub-region) from texture atlas
 * 
 * @param {Object} screenData - Screen data object
 * @param {Image|Canvas|WebGLTexture} img - Image, Canvas, or Texture
 * @param {number} sx - Source X in texture
 * @param {number} sy - Source Y in texture
 * @param {number} sw - Source width
 * @param {number} sh - Source height
 * @param {number} x - Destination X position
 * @param {number} y - Destination Y position
 * @param {number} width - Destination width
 * @param {number} height - Destination height
 * @param {Object} color - Color object with rgba and key for map lookups
 * @param {number} [anchorX=0] - Anchor point X (0-1)
 * @param {number} [anchorY=0] - Anchor point Y (0-1)
 * @param {number} [scaleX=1] - Scale X factor
 * @param {number} [scaleY=1] - Scale Y factor
 * @param {number} [angleRad=0] - Rotation angle in radians
 * @returns {void}
 */
export function drawSprite(
	screenData, img, sx, sy, sw, sh, x, y, width, height, color,
	anchorX = 0, anchorY = 0, scaleX = 1, scaleY = 1, angleRad = 0,
	batchType = g_batches.IMAGE_BATCH
) {

	// Get or create texture
	const texture = g_textures.getWebGL2Texture( screenData, img );

	// Get texture dimensions for coordinate conversion
	const texWidth = img.width;
	const texHeight = img.height;

	// Convert pixel coordinates to normalized texture coordinates (0-1)
	const u0 = sx / texWidth;
	const v0 = sy / texHeight;
	const u1 = ( sx + sw ) / texWidth;
	const v1 = ( sy + sh ) / texHeight;

	// Calculate transformed corners
	const corners = calculateTransformedCorners(
		width, height, anchorX, anchorY, scaleX, scaleY, angleRad, x, y
	);

	// Texture coordinates for sub-region
	const texCoords = [
		u0, v0,  // Top-left
		u1, v0,  // Top-right
		u0, v1,  // Bottom-left
		u1, v0,  // Top-right (repeat for second triangle)
		u1, v1,  // Bottom-right
		u0, v1   // Bottom-left (repeat for second triangle)
	];

	// Add textured quad to batch
	addTexturedQuadToBatch(
		screenData, texture, corners, texCoords, getQuadColorArray( color ), batchType
	);
}

