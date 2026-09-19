/**
 * Polygons Plugin for Pi.js
 *
 * Draws outlined and optionally filled complex polygons using the public Pi.js API.
 *
 * @module plugins/polygons
 * @version 1.0.0
 */

"use strict";

const m_polygonCache = new WeakMap();


/*************************************************************************************************
 * Plugin Initialization
 ************************************************************************************************/


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
		const outlineColor = screenData.api.getColor();

		if( options.fillColor != null ) {
			let fillColor;
			if( typeof options.fillColor === "number" ) {
				fillColor = screenData.api.getPalColor( options.fillColor );
			} else {
				fillColor = pluginApi.utils.convertToColor( options.fillColor );
			}
			if( fillColor == null ) {
				throw createParameterError(
					"polygon: Parameter 'fillColor' must be a valid color."
				);
			}
			if( polygonData.spans === null ) {
				polygonData.spans = generateSpans( polygonData.coordinates );
			}
			drawFill( screenData, polygonData, fillColor, outlineColor );
			if( fillColor.key === outlineColor.key ) {
				return;
			}
		}

		drawOutline( screenData, polygonData.coordinates );
	}
}


/*************************************************************************************************
 * Input and Validation
 ************************************************************************************************/


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
	validatePolygon( coordinates );
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
	let length = 0;
	for( let i = 0; i < coordinates.length; i += 2 ) {
		const x = coordinates[ i ];
		const y = coordinates[ i + 1 ];
		if(
			length === 0 || x !== coordinates[ length - 2 ] ||
			y !== coordinates[ length - 1 ]
		) {
			coordinates[ length++ ] = x;
			coordinates[ length++ ] = y;
		}
	}
	coordinates.length = length;
}

/**
 * Strip repeated starting points from the tail of a closed path.
 *
 * @param {number[]} coordinates - Flat coordinate array
 * @returns {void}
 */
function removeClosingDuplicate( coordinates ) {
	while( coordinates.length >= 4 ) {
		const last = coordinates.length - 2;
		if(
			coordinates[ 0 ] !== coordinates[ last ] ||
			coordinates[ 1 ] !== coordinates[ last + 1 ]
		) {
			break;
		}
		coordinates.length -= 2;
	}
}

/**
 * Require three distinct normalized points without restricting path topology.
 *
 * @param {Float64Array} coordinates - Normalized polygon coordinates
 * @returns {void}
 */
function validatePolygon( coordinates ) {
	const distinct = new Set();
	for( let i = 0; i < coordinates.length; i += 2 ) {
		distinct.add( coordinates[ i ] + "," + coordinates[ i + 1 ] );
		if( distinct.size === 3 ) {
			return;
		}
	}
	throw createPolygonError( "polygon: At least three distinct points are required." );
}


/*************************************************************************************************
 * Scanline Span Generation
 ************************************************************************************************/


/**
 * Build non-horizontal crossing edges, grouped by their first scanline.
 *
 * @param {Float64Array} coordinates - Normalized polygon coordinates
 * @returns {Object[]} Sorted edge table
 */
function buildEdgeTable( coordinates ) {
	const edges = [];
	const pointCount = coordinates.length / 2;
	for( let i = 0; i < pointCount; i++ ) {
		const next = ( i + 1 ) % pointCount;
		const x1 = getX( coordinates, i );
		const y1 = getY( coordinates, i );
		const x2 = getX( coordinates, next );
		const y2 = getY( coordinates, next );
		if( y1 === y2 ) {
			continue;
		}

		let x = x1;
		let direction = 1;
		if( y1 > y2 ) {
			x = x2;
			direction = -1;
		}
		edges.push( {
			"yMin": Math.min( y1, y2 ),
			"yMax": Math.max( y1, y2 ),
			"x": x,
			"inverseSlope": ( x2 - x1 ) / ( y2 - y1 ),
			"direction": direction,
			"index": i
		} );
	}
	edges.sort( function( a, b ) {
		return a.yMin - b.yMin || a.index - b.index;
	} );
	return edges;
}

/**
 * Generate inclusive X spans with a nonzero-winding Active Edge List sweep.
 * Crossing edges cover yMin <= y < yMax; horizontal edges are not crossings.
 *
 * @param {Float64Array} coordinates - Normalized polygon coordinates
 * @returns {Int32Array} Inclusive spans stored as y, xStart, xEnd triplets
 */
function generateSpans( coordinates ) {
	const edges = buildEdgeTable( coordinates );
	const active = [];
	const spans = [];
	let edgeIndex = 0;
	if( edges.length === 0 ) {
		return new Int32Array( 0 );
	}

	let y = edges[ 0 ].yMin;
	while( edgeIndex < edges.length || active.length > 0 ) {

		// Compact the AEL before adding all edges beginning on this row.
		let length = 0;
		for( const edge of active ) {
			if( y < edge.yMax ) {
				active[ length++ ] = edge;
			}
		}
		active.length = length;
		while( edgeIndex < edges.length && edges[ edgeIndex ].yMin === y ) {
			active.push( edges[ edgeIndex++ ] );
		}
		active.sort( function( a, b ) {
			return a.x - b.x || a.index - b.index;
		} );

		let winding = 0;
		let leftX = 0;
		for( const edge of active ) {
			if( winding === 0 ) {
				leftX = edge.x;
			}
			winding += edge.direction;
			if( winding === 0 ) {
				appendSpan( spans, y, Math.round( leftX ), Math.round( edge.x ) );
			}
		}
		for( const edge of active ) {
			edge.x += edge.inverseSlope;
		}

		// Disconnected vertical ranges need no empty-row iteration.
		if( active.length === 0 && edgeIndex < edges.length ) {
			y = edges[ edgeIndex ].yMin;
		} else {
			y++;
		}
	}
	return new Int32Array( spans );
}

/**
 * Append an ordered span, merging touching runs so fill pixels are drawn once.
 *
 * @param {number[]} spans - Destination span values
 * @param {number} y - Scanline
 * @param {number} startX - Inclusive start
 * @param {number} endX - Inclusive end
 * @returns {void}
 */
function appendSpan( spans, y, startX, endX ) {
	const previous = spans.length - 3;
	if(
		previous >= 0 && spans[ previous ] === y &&
		startX <= spans[ previous + 2 ] + 1
	) {
		spans[ previous + 2 ] = Math.max( spans[ previous + 2 ], endX );
	} else {
		spans.push( y, startX, endX );
	}
}


/*************************************************************************************************
 * Rendering
 ************************************************************************************************/


/**
 * Draw polygon scanline spans using public one-pixel-tall rectangles.
 *
 * @param {Object} screenData - Active Pi.js screen data
 * @param {Object} polygonData - Cached polygon data
 * @param {Object} color - Pi.js fill color
 * @param {Object} outlineColor - Screen color to restore
 * @returns {void}
 */
function drawFill( screenData, polygonData, color, outlineColor ) {
	const spans = polygonData.spans;
	const api = screenData.api;

	try {
		api.setColor( color );
		for( let i = 0; i < spans.length; i += 3 ) {
			const y = spans[ i ];
			const x1 = spans[ i + 1 ];
			const x2 = spans[ i + 2 ];
			api.rect( x1, y, x2 - x1 + 1, 1 );
		}
	} finally {
		api.setColor( outlineColor );
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


/*************************************************************************************************
 * Geometry Helpers
 ************************************************************************************************/


function getX( coordinates, pointIndex ) {
	return coordinates[ pointIndex * 2 ];
}

function getY( coordinates, pointIndex ) {
	return coordinates[ pointIndex * 2 + 1 ];
}

/*************************************************************************************************
 * Errors
 ************************************************************************************************/


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
		"description": "Outlined and nonzero-filled complex polygons",
		"init": polygonsPlugin
	} );
}
