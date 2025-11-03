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

	// Special geometries for small circle sizes
	// size 1: single pixel as 1x1 quad centered at origin covering [0,0]-[1,1]
	const circle1 = generateSinglePixelGeometry();
	m_geometryCache.set( "circle:1", circle1 );

	// size 2: cross (5 pixels): center + 4-neighbors
	const circle2 = generateCrossGeometry();
	m_geometryCache.set( "circle:2", circle2 );

	// Pre-generate circles for sizes 3-30
	for( let size = 3; size <= 30; size++ ) {
		const cacheKey = `circle:${size}`;
		
		// Use Alpha 2's radius threshold: (half - 0.5)^2
		const radiusThresholdSq = ( size - 0.5 ) * ( size - 0.5 );
		const geometry = generateCircleGeometry( radiusThresholdSq );
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
 * Generate circle geometry data using Alpha 2 algorithm for better appearance
 * Fill points in an array first, then generate scanlines for pixel-perfect results
 * 
 * @param {number} radiusThresholdSq - Squared radius threshold (e.g., (size - 0.5)^2)
 * @returns {Object} Geometry data with vertexCount and vertices array
 */
function generateCircleGeometry( radiusThresholdSq ) {

	// Fill points in an array first (relative to center at 0,0)
	const filledPixels = new Map(); // Map<y, Set<x>>

	// Use Alpha 2's pixel-by-pixel fill algorithm with radius threshold
	const radius = Math.ceil( Math.sqrt( radiusThresholdSq ) );
	for( let dy = -radius; dy <= radius; dy++ ) {
		for( let dx = -radius; dx <= radius; dx++ ) {
			const distSq = dx * dx + dy * dy;
			if( distSq < radiusThresholdSq ) {
				const y = dy;
				const x = dx;
				if( !filledPixels.has( y ) ) {
					filledPixels.set( y, new Set() );
				}
				filledPixels.get( y ).add( x );
			}
		}
	}

	// Generate scanlines from filled pixels
	const scanlineMinMax = new Map();
	for( const [ y, xSet ] of filledPixels.entries() ) {
		const xArray = Array.from( xSet );
		scanlineMinMax.set( y, { "min": Math.min( ...xArray ), "max": Math.max( ...xArray ) } );
	}


	// Count quads and build vertex array
	let vertexCount = 0;
	const sortedYCoords = [];
	for( const [ y, mm ] of scanlineMinMax.entries() ) {
		vertexCount += 6;
		sortedYCoords.push( y );
	}

	sortedYCoords.sort( ( a, b ) => a - b );

	const vertices = new Float32Array( vertexCount * 2 );
	let vIdx = 0;

	// Generate quads for each scanline
	for( const currentY of sortedYCoords ) {

		const mm = scanlineMinMax.get( currentY );
		const xStart = mm.min;
		const xEnd = mm.max;

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

/**
 * Generate geometry for a cross shape of 5 pixels: center and 4-neighbors.
 * Pixels are 1x1 quads at (-1,0), (1,0), (0,0), (0,-1), (0,1)
 * @returns {Object}
 */
function generateCrossGeometry() {

	// Optimize to 3 quads:
	// - Vertical bar: 3 pixels tall at x=0 covering y in [-1, 2)
	// - Left pixel at x=-1, y=0
	// - Right pixel at x=1, y=0

	const vertexCount = 3 * 6;
	const vertices = new Float32Array( vertexCount * 2 );
	let vIdx = 0;

	// Vertical 3-pixel bar centered at origin
	vIdx = addQuad( vertices, vIdx, 0, -1, 1, 2 );

	// Left pixel
	vIdx = addQuad( vertices, vIdx, -1, 0, 0, 1 );

	// Right pixel
	vIdx = addQuad( vertices, vIdx, 1, 0, 2, 1 );

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
function getCachedGeometry( cacheKey ) {

	if( m_geometryCache.has( cacheKey ) ) {
		return m_geometryCache.get( cacheKey );
	}

	// Parse cache key to determine what to generate
	const [ type, ...params ] = cacheKey.split( ":" );
	let geometry;

	if( type === "circle" ) {

		const size = parseInt( params[ 0 ], 10 );
		
		// Use Alpha 2's radius threshold: (half - 0.5)^2
		const radiusThresholdSq = ( size - 0.5 ) * ( size - 0.5 );
		geometry = generateCircleGeometry( radiusThresholdSq );
	} else {
		throw new Error( `Unknown geometry type: ${type}` );
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
export function drawCachedGeometry( screenData, cacheKey, x, y, color ) {

	// Get cached geometry
	const geometry = getCachedGeometry( cacheKey );
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

