/**
 * Polygons Plugin for Pi.js
 *
 * Draws outlined and optionally filled simple polygons using Pi.js WebGL batches.
 *
 * @module plugins/polygons
 * @version 1.0.0
 */

"use strict";

import * as g_colors from "../../src/api/colors.js";
import * as g_batches from "../../src/renderer/batches.js";
import * as g_batchHelpers from "../../src/renderer/draw/batch-helpers.js";

const m_polygonCache = new WeakMap();


/***************************************************************************************************
 * Plugin Initialization
 **************************************************************************************************/


/**
 * Initialize the polygons plugin.
 *
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 * @returns {void}
 */
export default function polygonsPlugin( pluginApi ) {

	pluginApi.addCommand( "polygon", polygon, true, [ "points", "fillColor" ] );

	/**
	 * Draw a polygon outline and optional fill.
	 *
	 * @param {Object} screenData - Active Pi.js screen data
	 * @param {Object} options - Command options
	 * @param {Array|TypedArray} options.points - Polygon coordinates
	 * @param {*} options.fillColor - Optional fill color
	 * @returns {void}
	 */
	function polygon( screenData, options ) {
		const polygonData = getPolygonData( options.points, pluginApi.utils.getInt );

		if( options.fillColor != null ) {
			const fillColor = g_colors.getColorValueByRawInput(
				screenData, options.fillColor
			);
			if( fillColor == null ) {
				throw createParameterError(
					"polygon: Parameter 'fillColor' must be a valid color."
				);
			}
			if( polygonData.spans === null ) {
				polygonData.spans = generateSpans( polygonData.coordinates );
			}
			drawFill( screenData, polygonData, fillColor );
		}

		drawOutline( screenData, polygonData.coordinates );
	}
}


/***************************************************************************************************
 * Input and Validation
 **************************************************************************************************/


/**
 * Return cached polygon data or normalize a new points array.
 *
 * @param {Array|TypedArray} points - Raw polygon points
 * @param {Function} getInt - Pi.js integer parser
 * @returns {{ coordinates: Float64Array, spans: Int32Array|null }} Polygon data
 */
function getPolygonData( points, getInt ) {
	if( !isPointCollection( points ) ) {
		throw createParameterError(
			"polygon: Parameter 'points' must be an array or typed array."
		);
	}

	const cached = m_polygonCache.get( points );
	if( cached ) {
		return cached;
	}

	const coordinates = normalizePoints( points, getInt );
	validateSimplePolygon( coordinates );
	const polygonData = {
		"coordinates": coordinates,
		"spans": null
	};
	m_polygonCache.set( points, polygonData );
	return polygonData;
}

/**
 * Determine whether a value is a supported point collection.
 *
 * @param {*} value - Value to inspect
 * @returns {boolean} True for arrays and typed arrays
 */
function isPointCollection( value ) {
	return Array.isArray( value ) || (
		ArrayBuffer.isView( value ) && !( value instanceof DataView )
	);
}

/**
 * Normalize supported point formats into a flat coordinate array.
 *
 * @param {Array|TypedArray} points - Raw polygon points
 * @param {Function} getInt - Pi.js integer parser
 * @returns {Float64Array} Normalized coordinates
 */
function normalizePoints( points, getInt ) {
	const coordinates = [];
	const usesPointObjects = Array.isArray( points ) && points.length > 0 &&
		typeof points[ 0 ] === "object" && points[ 0 ] !== null;

	if( usesPointObjects ) {
		for( let i = 0; i < points.length; i++ ) {
			const point = points[ i ];
			if( !point || typeof point !== "object" || Array.isArray( point ) ) {
				throw createParameterError(
					"polygon: Point objects must contain valid x and y coordinates."
				);
			}
			appendCoordinate( coordinates, point.x, point.y, getInt );
		}
	} else {
		if( points.length % 2 !== 0 ) {
			throw createParameterError(
				"polygon: A flat points array must contain an even number of values."
			);
		}
		for( let i = 0; i < points.length; i += 2 ) {
			appendCoordinate( coordinates, points[ i ], points[ i + 1 ], getInt );
		}
	}

	removeConsecutiveDuplicates( coordinates );
	removeClosingDuplicate( coordinates );
	removeRedundantCollinearPoints( coordinates );

	if( coordinates.length < 6 ) {
		throw createPolygonError(
			"polygon: At least three distinct, non-collinear points are required."
		);
	}

	return new Float64Array( coordinates );
}

/**
 * Parse and append one coordinate pair.
 *
 * @param {number[]} coordinates - Destination coordinates
 * @param {*} x - Raw x coordinate
 * @param {*} y - Raw y coordinate
 * @param {Function} getInt - Pi.js integer parser
 * @returns {void}
 */
function appendCoordinate( coordinates, x, y, getInt ) {
	const parsedX = getInt( x, null );
	const parsedY = getInt( y, null );
	if(
		parsedX === null || parsedY === null ||
		!Number.isSafeInteger( parsedX ) || !Number.isSafeInteger( parsedY )
	) {
		throw createParameterError(
			"polygon: Point coordinates must be finite numbers that round to safe integers."
		);
	}
	coordinates.push( parsedX, parsedY );
}

/**
 * Remove adjacent duplicate points in place.
 *
 * @param {number[]} coordinates - Flat coordinate array
 * @returns {void}
 */
function removeConsecutiveDuplicates( coordinates ) {
	for( let i = coordinates.length - 2; i >= 2; i -= 2 ) {
		if(
			coordinates[ i ] === coordinates[ i - 2 ] &&
			coordinates[ i + 1 ] === coordinates[ i - 1 ]
		) {
			coordinates.splice( i, 2 );
		}
	}
}

/**
 * Remove a repeated closing point in place.
 *
 * @param {number[]} coordinates - Flat coordinate array
 * @returns {void}
 */
function removeClosingDuplicate( coordinates ) {
	if( coordinates.length < 4 ) {
		return;
	}
	const last = coordinates.length - 2;
	if(
		coordinates[ 0 ] === coordinates[ last ] &&
		coordinates[ 1 ] === coordinates[ last + 1 ]
	) {
		coordinates.splice( last, 2 );
	}
}

/**
 * Remove collinear points that lie between their neighbors.
 *
 * @param {number[]} coordinates - Flat coordinate array
 * @returns {void}
 */
function removeRedundantCollinearPoints( coordinates ) {
	let changed = true;
	while( changed && coordinates.length >= 6 ) {
		changed = false;
		const pointCount = coordinates.length / 2;
		for( let i = 0; i < pointCount; i++ ) {
			const previous = ( i + pointCount - 1 ) % pointCount;
			const next = ( i + 1 ) % pointCount;
			if(
				crossAt( coordinates, previous, i, next ) === 0 &&
				isPointBetween( coordinates, previous, i, next )
			) {
				coordinates.splice( i * 2, 2 );
				changed = true;
				break;
			}
		}
	}
}

/**
 * Validate polygon area and segment intersections.
 *
 * @param {Float64Array} coordinates - Normalized polygon coordinates
 * @returns {void}
 */
function validateSimplePolygon( coordinates ) {
	const pointCount = coordinates.length / 2;
	if( signedDoubleArea( coordinates ) === 0 ) {
		throw createPolygonError( "polygon: Polygon area must be greater than zero." );
	}

	for( let i = 0; i < pointCount; i++ ) {
		const previous = ( i + pointCount - 1 ) % pointCount;
		const next = ( i + 1 ) % pointCount;
		if( crossAt( coordinates, previous, i, next ) === 0 ) {
			const ax = getX( coordinates, previous ) - getX( coordinates, i );
			const ay = getY( coordinates, previous ) - getY( coordinates, i );
			const bx = getX( coordinates, next ) - getX( coordinates, i );
			const by = getY( coordinates, next ) - getY( coordinates, i );
			if( ax * bx + ay * by > 0 ) {
				throw createPolygonError( "polygon: Polygon edges must not overlap." );
			}
		}
	}

	for( let i = 0; i < pointCount; i++ ) {
		const iNext = ( i + 1 ) % pointCount;
		for( let j = i + 1; j < pointCount; j++ ) {
			const jNext = ( j + 1 ) % pointCount;
			if( iNext === j || jNext === i ) {
				continue;
			}
			if( segmentsIntersect( coordinates, i, iNext, j, jNext ) ) {
				throw createPolygonError(
					"polygon: Self-intersecting polygons are not supported."
				);
			}
		}
	}
}


/***************************************************************************************************
 * Scanline Span Generation
 **************************************************************************************************/


/**
 * Generate boundary-exclusive integer fill spans using Bresenham edge pixels.
 *
 * @param {Float64Array} coordinates - Normalized polygon coordinates
 * @returns {Int32Array} Inclusive spans stored as y, xStart, xEnd triplets
 */
function generateSpans( coordinates ) {
	const scanlines = new Map();
	const pointCount = coordinates.length / 2;

	for( let edgeIndex = 0; edgeIndex < pointCount; edgeIndex++ ) {
		const nextIndex = ( edgeIndex + 1 ) % pointCount;
		const x1 = getX( coordinates, edgeIndex );
		const y1 = getY( coordinates, edgeIndex );
		const x2 = getX( coordinates, nextIndex );
		const y2 = getY( coordinates, nextIndex );
		const edgeRows = rasterizeEdgeRows( x1, y1, x2, y2 );

		for( const [ y, edgeRun ] of edgeRows ) {
			const scanline = getOrCreateScanline( scanlines, y );
			scanline.boundaries.push( edgeRun );

			// Horizontal edges are boundaries, but never parity crossings.
			if( y1 !== y2 && y >= Math.min( y1, y2 ) && y < Math.max( y1, y2 ) ) {
				scanline.crossings.push( edgeRun );
			}
		}
	}

	const spans = [];
	const sortedY = Array.from( scanlines.keys() );
	sortedY.sort( function( a, b ) { return a - b; } );

	for( let rowIndex = 0; rowIndex < sortedY.length; rowIndex++ ) {
		const y = sortedY[ rowIndex ];
		const scanline = scanlines.get( y );
		if( scanline.crossings.length === 0 ) {
			continue;
		}

		scanline.crossings.sort( compareEdgeRuns );
		if( scanline.crossings.length % 2 !== 0 ) {
			throw createPolygonError( "polygon: Unable to generate even-odd fill spans." );
		}

		const boundaries = mergeEdgeRuns( scanline.boundaries );
		for(
			let crossingIndex = 0;
			crossingIndex < scanline.crossings.length;
			crossingIndex += 2
		) {
			const left = scanline.crossings[ crossingIndex ];
			const right = scanline.crossings[ crossingIndex + 1 ];
			appendSpanWithoutBoundaries(
				spans, y, left.maxX + 1, right.minX - 1, boundaries
			);
		}
	}

	return new Int32Array( spans );
}

/**
 * Rasterize one edge with the same integer Bresenham stepping as Pi.js lines.
 *
 * @param {number} x1 - First x coordinate
 * @param {number} y1 - First y coordinate
 * @param {number} x2 - Second x coordinate
 * @param {number} y2 - Second y coordinate
 * @returns {Map<number, { minX: number, maxX: number }>} Pixel runs keyed by y
 */
function rasterizeEdgeRows( x1, y1, x2, y2 ) {
	const rows = new Map();
	const dx = Math.abs( x2 - x1 );
	const dy = Math.abs( y2 - y1 );
	const sx = x1 < x2 ? 1 : -1;
	const sy = y1 < y2 ? 1 : -1;
	let err = dx - dy;
	let x = x1;
	let y = y1;

	while( true ) {
		addPixelToEdgeRows( rows, x, y );
		if( x === x2 && y === y2 ) {
			break;
		}

		const e2 = err * 2;
		if( e2 > -dy ) {
			err -= dy;
			x += sx;
		}
		if( e2 < dx ) {
			err += dx;
			y += sy;
		}
	}

	return rows;
}

/**
 * Add a Bresenham pixel to an edge's row range.
 *
 * @param {Map} rows - Edge rows
 * @param {number} x - Pixel x coordinate
 * @param {number} y - Pixel y coordinate
 * @returns {void}
 */
function addPixelToEdgeRows( rows, x, y ) {
	const row = rows.get( y );
	if( row ) {
		row.minX = Math.min( row.minX, x );
		row.maxX = Math.max( row.maxX, x );
	} else {
		rows.set( y, { "minX": x, "maxX": x } );
	}
}

/**
 * Get the accumulator for one polygon scanline.
 *
 * @param {Map} scanlines - Polygon scanline map
 * @param {number} y - Scanline y coordinate
 * @returns {{ boundaries: Object[], crossings: Object[] }} Scanline accumulator
 */
function getOrCreateScanline( scanlines, y ) {
	let scanline = scanlines.get( y );
	if( !scanline ) {
		scanline = { "boundaries": [], "crossings": [] };
		scanlines.set( y, scanline );
	}
	return scanline;
}

/**
 * Sort boundary runs from left to right.
 *
 * @param {Object} a - First edge run
 * @param {Object} b - Second edge run
 * @returns {number} Sort comparison
 */
function compareEdgeRuns( a, b ) {
	const centerComparison = ( a.minX + a.maxX ) - ( b.minX + b.maxX );
	if( centerComparison !== 0 ) {
		return centerComparison;
	}
	if( a.minX !== b.minX ) {
		return a.minX - b.minX;
	}
	return a.maxX - b.maxX;
}

/**
 * Sort and merge touching boundary runs.
 *
 * @param {Object[]} runs - Unordered boundary runs
 * @returns {Object[]} Merged boundary runs
 */
function mergeEdgeRuns( runs ) {
	const sortedRuns = runs.slice();
	sortedRuns.sort( function( a, b ) {
		if( a.minX !== b.minX ) {
			return a.minX - b.minX;
		}
		return a.maxX - b.maxX;
	} );

	const merged = [];
	for( let i = 0; i < sortedRuns.length; i++ ) {
		const run = sortedRuns[ i ];
		const previous = merged[ merged.length - 1 ];
		if( previous && run.minX <= previous.maxX + 1 ) {
			previous.maxX = Math.max( previous.maxX, run.maxX );
		} else {
			merged.push( { "minX": run.minX, "maxX": run.maxX } );
		}
	}
	return merged;
}

/**
 * Append portions of a candidate span that do not overlap outline pixels.
 *
 * @param {number[]} spans - Destination span values
 * @param {number} y - Scanline y coordinate
 * @param {number} xStart - Inclusive candidate start
 * @param {number} xEnd - Inclusive candidate end
 * @param {Object[]} boundaries - Merged outline runs
 * @returns {void}
 */
function appendSpanWithoutBoundaries( spans, y, xStart, xEnd, boundaries ) {
	if( xStart > xEnd ) {
		return;
	}

	let cursor = xStart;
	for( let i = 0; i < boundaries.length && cursor <= xEnd; i++ ) {
		const boundary = boundaries[ i ];
		if( boundary.maxX < cursor ) {
			continue;
		}
		if( boundary.minX > xEnd ) {
			break;
		}
		if( boundary.minX > cursor ) {
			spans.push( y, cursor, Math.min( xEnd, boundary.minX - 1 ) );
		}
		cursor = Math.max( cursor, boundary.maxX + 1 );
	}

	if( cursor <= xEnd ) {
		spans.push( y, cursor, xEnd );
	}
}


/***************************************************************************************************
 * Rendering
 **************************************************************************************************/


/**
 * Add polygon scanline spans to the WebGL geometry batch.
 *
 * @param {Object} screenData - Active Pi.js screen data
 * @param {Object} polygonData - Cached polygon data
 * @param {Object} color - Pi.js color value
 * @returns {void}
 */
function drawFill( screenData, polygonData, color ) {
	const spans = polygonData.spans;
	let spanOffset = 0;

	while( spanOffset < spans.length ) {
		const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];
		const maxSpansPerChunk = Math.floor( batch.maxCapacity / 6 );
		const remainingSpans = ( spans.length - spanOffset ) / 3;
		const chunkSpanCount = Math.min( remainingSpans, maxSpansPerChunk );
		g_batches.prepareBatch(
			screenData, g_batches.GEOMETRY_BATCH, chunkSpanCount * 6
		);

		const chunkEnd = spanOffset + chunkSpanCount * 3;
		for( let i = spanOffset; i < chunkEnd; i += 3 ) {
			const y = spans[ i ];
			const x1 = spans[ i + 1 ];
			const x2 = spans[ i + 2 ] + 1;
			g_batchHelpers.addTriangleToBatch(
				batch,
				x1, y, x2, y, x1, y + 1,
				color
			);
			g_batchHelpers.addTriangleToBatch(
				batch,
				x2, y, x2, y + 1, x1, y + 1,
				color
			);
		}
		spanOffset = chunkEnd;
	}
}

/**
 * Draw a closed polygon outline with the current Pi.js color.
 *
 * @param {Object} screenData - Active Pi.js screen data
 * @param {Float64Array} coordinates - Polygon coordinates
 * @returns {void}
 */
function drawOutline( screenData, coordinates ) {
	const pointCount = coordinates.length / 2;
	for( let i = 0; i < pointCount; i++ ) {
		const next = ( i + 1 ) % pointCount;
		screenData.api.line(
			getX( coordinates, i ), getY( coordinates, i ),
			getX( coordinates, next ), getY( coordinates, next )
		);
	}
}


/***************************************************************************************************
 * Geometry Helpers
 **************************************************************************************************/


function getX( coordinates, pointIndex ) {
	return coordinates[ pointIndex * 2 ];
}

function getY( coordinates, pointIndex ) {
	return coordinates[ pointIndex * 2 + 1 ];
}

function crossAt( coordinates, a, b, c ) {
	return (
		( getX( coordinates, b ) - getX( coordinates, a ) ) *
		( getY( coordinates, c ) - getY( coordinates, a ) ) -
		( getY( coordinates, b ) - getY( coordinates, a ) ) *
		( getX( coordinates, c ) - getX( coordinates, a ) )
	);
}

function signedDoubleArea( coordinates ) {
	let area = 0;
	const pointCount = coordinates.length / 2;
	for( let i = 0; i < pointCount; i++ ) {
		const next = ( i + 1 ) % pointCount;
		area += getX( coordinates, i ) * getY( coordinates, next ) -
			getX( coordinates, next ) * getY( coordinates, i );
	}
	return area;
}

function isPointBetween( coordinates, a, b, c ) {
	const bax = getX( coordinates, b ) - getX( coordinates, a );
	const bay = getY( coordinates, b ) - getY( coordinates, a );
	const bcx = getX( coordinates, b ) - getX( coordinates, c );
	const bcy = getY( coordinates, b ) - getY( coordinates, c );
	return bax * bcx + bay * bcy <= 0;
}

function segmentsIntersect( coordinates, a, b, c, d ) {
	const abc = crossAt( coordinates, a, b, c );
	const abd = crossAt( coordinates, a, b, d );
	const cda = crossAt( coordinates, c, d, a );
	const cdb = crossAt( coordinates, c, d, b );

	if(
		Math.sign( abc ) !== Math.sign( abd ) &&
		Math.sign( cda ) !== Math.sign( cdb )
	) {
		return true;
	}
	if( abc === 0 && pointOnSegment( coordinates, a, c, b ) ) return true;
	if( abd === 0 && pointOnSegment( coordinates, a, d, b ) ) return true;
	if( cda === 0 && pointOnSegment( coordinates, c, a, d ) ) return true;
	if( cdb === 0 && pointOnSegment( coordinates, c, b, d ) ) return true;
	return false;
}

function pointOnSegment( coordinates, a, point, b ) {
	const px = getX( coordinates, point );
	const py = getY( coordinates, point );
	return px >= Math.min( getX( coordinates, a ), getX( coordinates, b ) ) &&
		px <= Math.max( getX( coordinates, a ), getX( coordinates, b ) ) &&
		py >= Math.min( getY( coordinates, a ), getY( coordinates, b ) ) &&
		py <= Math.max( getY( coordinates, a ), getY( coordinates, b ) );
}

/***************************************************************************************************
 * Errors
 **************************************************************************************************/


function createParameterError( message ) {
	const error = new TypeError( message );
	error.code = "INVALID_PARAMETER";
	return error;
}

function createPolygonError( message ) {
	const error = new RangeError( message );
	error.code = "INVALID_POLYGON";
	return error;
}


// Auto-register in IIFE mode when Pi.js is already available.
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "polygons",
		"version": "1.0.0",
		"description": "WebGL-accelerated outlined and filled simple polygons",
		"init": polygonsPlugin
	} );
}
