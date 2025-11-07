/**
 * Pi.js - Geometry Cache Module
 * 
 * Cached geometry for commonly used shapes.
 * Stores pre-computed vertex data for efficient rendering.
 * 
 * @module renderer/draw/geometry
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_batchHelpers from "./batch-helpers.js";

export const FILLED_CIRCLE = 0;
export const FILLED_ELLIPSE = 1;

/***************************************************************************************************
 * Geometry Cache
 ***************************************************************************************************/



// Cache key format: "type:radius"
// Example: "circle:32" for a circle of radius 32
const m_geometryCache = new Map();

// Cached vertex data structure:
// {
//   "vertexCount": number,
//   "vertices": Float32Array,  // Raw x,y positions
// }


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/

export { m_geometryCache as geometryCache };

/**
 * Initialize geometry module
 * 
 * @returns {void}
 */
export function init() {

	// Pre-populate cache with a couple circles
	prepopulateCache();
}

/**
 * Pre-populate cache with commonly used geometry
 * 
 * @returns {void}
 */
function prepopulateCache() {

	// Special geometries for small circle radius
	// radius 1: single pixel as 1x1 quad centered at origin covering [0,0]-[1,1]
	const circle1 = generateSinglePixelGeometry();
	m_geometryCache.set( `${FILLED_CIRCLE}:1`, circle1 );

	// Pre-generate circles for sizes 1-10
	for( let radius = 1; radius <= 10; radius++ ) {
		const cacheKey = `${FILLED_CIRCLE}:${radius}`;
		
		// Use Alpha 2's radius threshold: (half - 0.5)^2
		const geometry = generateCircleGeometry( radius );
		m_geometryCache.set( cacheKey, geometry );
	}
}


/***************************************************************************************************
 * Geometry Building Helpers
 ***************************************************************************************************/


/**
 * Add a single vertex to a geometry vertices array
 * 
 * @param {Float32Array} vertices - Vertices array
 * @param {number} vIdx - Current index into vertices array (will be modified)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} New index after adding vertex
 */
function addVertex( vertices, vIdx, x, y ) {

	vertices[ vIdx++ ] = x;
	vertices[ vIdx++ ] = y;
	return vIdx;
}

/**
 * Add a triangle (3 vertices) to a geometry vertices array
 * 
 * @param {Float32Array} vertices - Vertices array
 * @param {number} vIdx - Current index into vertices array (will be modified)
 * @param {number} x1 - First vertex X coordinate
 * @param {number} y1 - First vertex Y coordinate
 * @param {number} x2 - Second vertex X coordinate
 * @param {number} y2 - Second vertex Y coordinate
 * @param {number} x3 - Third vertex X coordinate
 * @param {number} y3 - Third vertex Y coordinate
 * @returns {number} New index after adding triangle
 */
function addTriangle( vertices, vIdx, x1, y1, x2, y2, x3, y3 ) {

	vIdx = addVertex( vertices, vIdx, x1, y1 );
	vIdx = addVertex( vertices, vIdx, x2, y2 );
	vIdx = addVertex( vertices, vIdx, x3, y3 );
	return vIdx;
}

/**
 * Add a quad (rectangle as two triangles) to a geometry vertices array
 * The quad is defined by two corner points (x1,y1) and (x2,y2) forming a rectangle
 * 
 * @param {Float32Array} vertices - Vertices array
 * @param {number} vIdx - Current index into vertices array (will be modified)
 * @param {number} x1 - Left/bottom-left X coordinate
 * @param {number} y1 - Left/bottom-left Y coordinate
 * @param {number} x2 - Right/top-right X coordinate
 * @param {number} y2 - Right/top-right Y coordinate
 * @returns {number} New index after adding quad
 */
function addQuad( vertices, vIdx, x1, y1, x2, y2 ) {

	// First triangle: (x1,y1), (x2,y1), (x1,y2)
	vIdx = addTriangle( vertices, vIdx, x1, y1, x2, y1, x1, y2 );

	// Second triangle: (x2,y1), (x2,y2), (x1,y2)
	vIdx = addTriangle( vertices, vIdx, x2, y1, x2, y2, x1, y2 );
	return vIdx;
}


/***************************************************************************************************
 * Geometry Generation
 ***************************************************************************************************/


/**
 * Fill points in an array first, then generate scanlines for pixel-perfect results
 * 
 * @param {number} radius - Radius of the circle
 * @returns {Object} Geometry data with vertexCount and vertices array
 */
function generateCircleGeometry( radius ) {

	if( radius <= 0 ) {
		return { "vertexCount": 0, "vertices": null };
	}
	
	// Store min/max X for each Y scanline as we discover them during MCA
	const scanlineMinMax = new Map(); // Map<y, {min: x, max: x}>

	// --- Midpoint Circle Algorithm to find outline pixels ---
	let x = radius - 1;  // Radius adjustment - due to integer rounding it looks better this way
	let y = 0;
	let err = 1 - x;

	// Helper to update min/max X for a specific Y scanline
	const updateScanline = ( px, py ) => {

		const pixelY = py | 0; // Fast Math.floor
		const pixelX = px | 0;

		if( !scanlineMinMax.has( pixelY ) ) {
			if( pixelX < 0 ) {
				scanlineMinMax.set( pixelY, { "left": pixelX, "right": Infinity } );
			} else if( pixelX > 0 ) {
				scanlineMinMax.set( pixelY, { "left": -Infinity, "right": pixelX } );	
			} else {
				scanlineMinMax.set( pixelY, { "left": pixelX, "right": pixelX } );
			}
		} else {
			const limits = scanlineMinMax.get( pixelY );

			// We want to find interior pixels only not border pixels so we are looking for the
			// closest interior pixel. We need to account for two horizontal border pixels in a row.

			if( pixelX < 0 && pixelX > limits.left ) {
				limits.left = pixelX;
			}
			if( pixelX > 0 && pixelX < limits.right ) {
				limits.right = pixelX;
			}
		}
	};

	while( x >= y ) {

		// Apply 8-way symmetry to update scanlines
		updateScanline(  x,  y ); // Quadrant 1
		updateScanline(  y,  x ); // Quadrant 2
		updateScanline( -y,  x ); // Quadrant 3
		updateScanline( -x,  y ); // Quadrant 4
		updateScanline( -x, -y ); // Quadrant 5
		updateScanline( -y, -x ); // Quadrant 6
		updateScanline(  y, -x ); // Quadrant 7
		updateScanline(  x, -y ); // Quadrant 8

		y++;
		if( err < 0 ) {
			err += 2 * y + 1;
		} else {
			x--;
			err += 2 * ( y - x ) + 1;
		}
	}

	// Count valid scanlines for batch preparation
	let vertexCount = 0;
	const sortedYCoords = [];
	for( const [ currentY, mm ] of scanlineMinMax.entries() ) {
		vertexCount += 6;
		sortedYCoords.push( currentY );
	}

	sortedYCoords.sort( ( a, b ) => a - b );

	const vertices = new Float32Array( vertexCount * 2 );
	let vIdx = 0;

	// Generate quads for each scanline -- skip the top row as it's border
	for(let row = 1; row < sortedYCoords.length - 1; row += 1 ) {
		const currentY = sortedYCoords[ row ];
		const limits = scanlineMinMax.get( currentY );

		// Get the interior starts by moving over 1 pixel from border
		const xStart = limits.left + 1;
		const xEnd = limits.right - 1;

		// Quad from (xStart, currentY) to (xEnd+1, currentY+1)
		vIdx = addQuad( vertices, vIdx, xStart, currentY, xEnd + 1, currentY + 1 );
	}

	return { "vertexCount": vertexCount, "vertices": vertices };
}


/**
 * Generate geometry for a single pixel 1x1 quad at origin.
 * @returns {Object}
 */
function generateSinglePixelGeometry() {

	// Two triangles forming a 1x1 quad with corners (0,0)-(1,1)
	const vertexCount = 6;
	const vertices = new Float32Array( vertexCount * 2 );
	let vIdx = 0;

	// Quad from (0,0) to (1,1)
	vIdx = addQuad( vertices, vIdx, 0, 0, 1, 1 );

	return { "vertexCount": vertexCount, "vertices": vertices };
}


/***************************************************************************************************
 * Cache Management
 ***************************************************************************************************/


/**
 * Get cached geometry or generate and cache it
 * 
 * @param {string} cacheKey - Geometry cache key (e.g., "circle:32")
 * @returns {Object} Geometry data with vertexCount and vertices array
 */
function getCachedGeometry( cacheType, unit ) {

	const cacheKey = `${cacheType}:${unit}`;
	if( m_geometryCache.has( cacheKey ) ) {
		return m_geometryCache.get( cacheKey );
	}

	// Parse cache key to determine what to generate
	let geometry;

	if( cacheType === FILLED_CIRCLE ) {
		geometry = generateCircleGeometry( unit );
	} else {
		throw new Error( `Unknown geometry cache type: ${cacheType}` );
	}

	// Cache the geometry
	m_geometryCache.set( cacheKey, geometry );

	return geometry;
}


/***************************************************************************************************
 * Drawing Functions
 ***************************************************************************************************/


/**
 * Draw cached geometry with specified color
 * 
 * @param {Object} screenData - Screen data object
 * @param {string} cacheKey - Geometry cache key (e.g., "circle:32")
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawCachedGeometry( screenData, cacheType, unit, x, y, color ) {

	// Get cached geometry
	const geometry = getCachedGeometry( cacheType, unit );
	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];

	// Prepare batch for vertices
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, geometry.vertexCount );

	// Copy vertices to batch with offset and generate colors
	const vertices = geometry.vertices;
	let vIdx = 0;

	for( let i = 0; i < geometry.vertexCount; i++ ) {

		const vx = vertices[ vIdx++ ] + x;
		const vy = vertices[ vIdx++ ] + y;
		g_batchHelpers.addVertexToBatch( batch, vx, vy, color );
	}
}

