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

		// Quad as two triangles: (xStart,y), (xEnd+1,y), (xStart,y+1) and (xEnd+1,y), (xEnd+1,y+1), 
		// (xStart,y+1)
		vertices[ vIdx++ ] = xStart;
		vertices[ vIdx++ ] = currentY;
		vertices[ vIdx++ ] = xEnd + 1;
		vertices[ vIdx++ ] = currentY;
		vertices[ vIdx++ ] = xStart;
		vertices[ vIdx++ ] = currentY + 1;

		vertices[ vIdx++ ] = xEnd + 1;
		vertices[ vIdx++ ] = currentY;
		vertices[ vIdx++ ] = xEnd + 1;
		vertices[ vIdx++ ] = currentY + 1;
		vertices[ vIdx++ ] = xStart;
		vertices[ vIdx++ ] = currentY + 1;
	}

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

