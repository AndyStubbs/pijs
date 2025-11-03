/**
 * Pi.js - Arcs Drawing Module
 * 
 * Low-level drawing operations: arcs drawing.
 * 
 * drawArcPixel, drawArcSquare, drawArcCircle
 * 
 * @module renderer/draw/arcs
 */

"use strict";

import * as g_batches from "../batches.js";
import * as g_textures from "../textures.js";
import * as g_utils from "../../core/utils.js";
import * as g_batchHelpers from "./batch-helpers.js";
import * as g_shapes from "./filled-shapes.js";


/**
 * Draw arc outline using midpoint circle algorithm
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Arc radius
 * @param {number} angle1 - Start angle in radians
 * @param {number} angle2 - End angle in radians
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @returns {void}
 */
export function drawArcPixel( screenData, cx, cy, radius, angle1, angle2, color ) {

	// Convert angles from radians to degrees and normalize to 0-360
	let a1 = g_utils.radiansToDegrees( angle1 );
	let a2 = g_utils.radiansToDegrees( angle2 );
	a1 = ( a1 + 360 ) % 360;
	a2 = ( a2 + 360 ) % 360;

	// Check for winding (when angle1 > angle2, arc wraps around 360 degrees)
	const winding = a1 > a2;

	// Adjust radius (consistent with filled circle implementation)
	const adjustedRadius = radius - 1;
	let finalRadius = adjustedRadius;
	if( finalRadius < 0 ) {
		finalRadius = 0;
	}

	// Estimate pixel count: approximately 2 * PI * radius pixels
	const estimatedPixels = Math.max( 4, Math.ceil( 2 * Math.PI * radius ) );

	// Get the points batch and prepare it
	const batch = screenData.batches[ g_batches.POINTS_BATCH ];
	g_batches.prepareBatch( screenData, g_batches.POINTS_BATCH, estimatedPixels );

	// Helper function to check if angle is within arc range and draw pixel
	const setPixel = ( px, py ) => {

		// Calculate angle of this point relative to center
		let angle = Math.atan2( py - cy, px - cx ) * ( 180 / Math.PI );
		angle = ( angle + 360 ) % 360;

		// Check if angle is within arc range
		let shouldDraw = false;
		if( winding ) {

			// Arc wraps around 360 degrees
			shouldDraw = angle >= a1 || angle <= a2;
		} else {

			// Normal arc
			shouldDraw = angle >= a1 && angle <= a2;
		}

		if( shouldDraw ) {
			g_batchHelpers.addVertexToBatch( batch, px, py, color );
		}
	};

	// Handle special cases
	if( finalRadius === 0 ) {

		// Single point
		setPixel( cx, cy );
		return;
	}

	if( finalRadius === 1 ) {

		// Draw 4 cardinal points
		setPixel( cx + 1, cy );
		setPixel( cx - 1, cy );
		setPixel( cx, cy + 1 );
		setPixel( cx, cy - 1 );
		return;
	}

	// Midpoint circle algorithm
	let x = finalRadius;
	let y = 0;
	let err = 1 - x;

	// Draw initial symmetrical points
	setPixel( cx + x, cy + y );
	setPixel( cx - x, cy + y );
	setPixel( cx + y, cy + x );
	setPixel( cx + y, cy - x );

	while( x >= y ) {

		y++;
		if( err < 0 ) {
			err += 2 * y + 1;
		} else {
			x--;
			err += 2 * ( y - x ) + 1;
		}

		// Apply 8-way symmetry to draw all octants
		setPixel( cx + x, cy + y );
		setPixel( cx + y, cy + x );
		setPixel( cx - y, cy + x );
		setPixel( cx - x, cy + y );
		setPixel( cx - x, cy - y );
		setPixel( cx - y, cy - x );
		setPixel( cx + y, cy - x );
		setPixel( cx + x, cy - y );
	}
}

/**
 * Draw arc outline using a square pen (thicker line segments)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Arc radius
 * @param {number} angle1 - Start angle in radians
 * @param {number} angle2 - End angle in radians
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @param {number} penSize - Thickness of the pen
 * @param {number} penType - Pen type (unused)
 * @returns {void}
 */
export function drawArcSquare( screenData, cx, cy, radius, angle1, angle2, color, penSize, penType ) {

	_drawArcSegments( screenData, cx, cy, radius, angle1, angle2, color, penSize, true );
}

/**
 * Draw arc outline using a circular pen (thicker line segments with rounded caps)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Arc radius
 * @param {number} angle1 - Start angle in radians
 * @param {number} angle2 - End angle in radians
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @param {number} penSize - Thickness of the pen
 * @param {number} penType - Pen type (unused)
 * @returns {void}
 */
export function drawArcCircle( screenData, cx, cy, radius, angle1, angle2, color, penSize, penType ) {

	_drawArcSegments( screenData, cx, cy, radius, angle1, angle2, color, penSize, false );
}

/**
 * Internal helper to draw an arc by subdividing it into rectangular segments
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} cx - Center X coordinate
 * @param {number} cy - Center Y coordinate
 * @param {number} radius - Arc radius
 * @param {number} angle1 - Start angle in radians
 * @param {number} angle2 - End angle in radians
 * @param {Object} color - Color object with r/g/b/a components (0-255)
 * @param {number} penSize - Thickness of the pen
 * @param {boolean} useSquareCaps - True for square caps, false for circular caps
 * @returns {void}
 */
function _drawArcSegments( screenData, cx, cy, radius, angle1, angle2, color, penSize, useSquareCaps ) {

	// Determine the sweep angle
	let sweepAngle = angle2 - angle1;

	// Ensure sweepAngle is positive and within (0, 2*PI]
	sweepAngle %= ( 2 * Math.PI );
	if( sweepAngle < 0 ) {
		sweepAngle += ( 2 * Math.PI );
	}

	if( sweepAngle === 0 && angle1 !== angle2 ) {

		// If angles wrap around perfectly, it's a full circle
		sweepAngle = 2 * Math.PI;
	} else if( sweepAngle === 0 && angle1 === angle2 ) {

		// Degenerate arc (single point or zero length)
		return;
	}

	// Determine number of segments for the arc
	// More segments = smoother arc, but more draw calls/vertices
	// A common heuristic is based on radius or a fixed segment length
	// Let's use a rough estimate based on the full circle segments
	const segmentsPerFullCircle = 60; // Adjust for desired smoothness
	const numSegments = Math.max( 2, Math.ceil( ( sweepAngle / ( 2 * Math.PI ) ) * segmentsPerFullCircle ) );

	const angleStep = sweepAngle / numSegments;
	const halfWidth = penSize / 2;

	// Get the geometry batch
	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];

	// Estimate vertex count: 6 per segment + caps
	const estimatedVertices = numSegments * 6 + ( useSquareCaps ? 12 : 0 );
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, estimatedVertices );

	// Calculate start and end points for caps
	const startAngle = angle1;
	const endAngle = angle1 + sweepAngle;
	const startX = cx + radius * Math.cos( startAngle );
	const startY = cy + radius * Math.sin( startAngle );
	const endX = cx + radius * Math.cos( endAngle );
	const endY = cy + radius * Math.sin( endAngle );

	// Calculate start and end tangent directions for caps
	const startDirX = -Math.sin( startAngle );
	const startDirY = Math.cos( startAngle );
	const endDirX = -Math.sin( endAngle );
	const endDirY = Math.cos( endAngle );

	// Draw rectangular segments along the arc
	for( let i = 0; i < numSegments; i++ ) {

		const angle1Seg = angle1 + i * angleStep;
		const angle2Seg = angle1 + ( i + 1 ) * angleStep;

		// Calculate segment endpoints on the arc
		const x1 = cx + radius * Math.cos( angle1Seg );
		const y1 = cy + radius * Math.sin( angle1Seg );
		const x2 = cx + radius * Math.cos( angle2Seg );
		const y2 = cy + radius * Math.sin( angle2Seg );

		// For arcs, the perpendicular direction is the radial direction from center
		// Calculate perpendicular at each endpoint separately for proper connection
		const radDx1 = x1 - cx;
		const radDy1 = y1 - cy;
		const radLength1 = Math.sqrt( radDx1 * radDx1 + radDy1 * radDy1 );

		const radDx2 = x2 - cx;
		const radDy2 = y2 - cy;
		const radLength2 = Math.sqrt( radDx2 * radDx2 + radDy2 * radDy2 );

		// Normalize radial directions to get perpendicular vectors at each endpoint
		let perpX1, perpY1, perpX2, perpY2;
		if( radLength1 > 0.001 && radLength2 > 0.001 ) {
			perpX1 = radDx1 / radLength1;
			perpY1 = radDy1 / radLength1;
			perpX2 = radDx2 / radLength2;
			perpY2 = radDy2 / radLength2;
		} else {
			// Fallback to using segment direction if radius is too small
			const dx = x2 - x1;
			const dy = y2 - y1;
			const segLength = Math.sqrt( dx * dx + dy * dy );
			if( segLength < 0.001 ) {
				continue;
			}
			const tangentX = dx / segLength;
			const tangentY = dy / segLength;
			perpX1 = -tangentY;
			perpY1 = tangentX;
			perpX2 = perpX1;
			perpY2 = perpY1;
		}

		// Calculate rectangle corners using perpendicular directions at each endpoint
		const p1x = x1 + perpX1 * halfWidth;
		const p1y = y1 + perpY1 * halfWidth;
		const p2x = x1 - perpX1 * halfWidth;
		const p2y = y1 - perpY1 * halfWidth;
		const p3x = x2 - perpX2 * halfWidth;
		const p3y = y2 - perpY2 * halfWidth;
		const p4x = x2 + perpX2 * halfWidth;
		const p4y = y2 + perpY2 * halfWidth;

		// Add rectangle as two triangles
		g_batchHelpers.addTriangleToBatch( batch, p1x, p1y, p4x, p4y, p2x, p2y, color );
		g_batchHelpers.addTriangleToBatch( batch, p4x, p4y, p3x, p3y, p2x, p2y, color );
	}

	// Draw caps at endpoints
	if( useSquareCaps ) {

		// Draw square caps
		drawSquareCap( batch, startX, startY, startDirX, startDirY, halfWidth, color );
		drawSquareCap( batch, endX, endY, endDirX, endDirY, halfWidth, color );
	} else {

		// Draw circular caps
		g_shapes.drawFilledCircle( screenData, startX, startY, halfWidth, color );
		g_shapes.drawFilledCircle( screenData, endX, endY, halfWidth, color );
	}
}

/**
 * Helper function to draw a square cap at an endpoint
 * 
 * @param {Object} batch - Geometry batch object
 * @param {number} x - Endpoint X coordinate
 * @param {number} y - Endpoint Y coordinate
 * @param {number} dirX - Tangent direction X (normalized)
 * @param {number} dirY - Tangent direction Y (normalized)
 * @param {number} halfWidth - Half the pen width
 * @param {Object} color - Color object
 * @returns {void}
 */
function drawSquareCap( batch, x, y, dirX, dirY, halfWidth, color ) {

	// Perpendicular vector (outward from arc)
	const perpX = -dirY;
	const perpY = dirX;

	// Square cap extends halfWidth along the tangent in both directions
	const capHalfWidth = halfWidth;

	// Calculate four corners of the square cap
	const p1x = x + dirX * capHalfWidth + perpX * capHalfWidth;
	const p1y = y + dirY * capHalfWidth + perpY * capHalfWidth;
	const p2x = x + dirX * capHalfWidth - perpX * capHalfWidth;
	const p2y = y + dirY * capHalfWidth - perpY * capHalfWidth;
	const p3x = x - dirX * capHalfWidth - perpX * capHalfWidth;
	const p3y = y - dirY * capHalfWidth - perpY * capHalfWidth;
	const p4x = x - dirX * capHalfWidth + perpX * capHalfWidth;
	const p4y = y - dirY * capHalfWidth + perpY * capHalfWidth;

	// Draw square as two triangles
	g_batchHelpers.addTriangleToBatch( batch, p1x, p1y, p4x, p4y, p2x, p2y, color );
	g_batchHelpers.addTriangleToBatch( batch, p4x, p4y, p3x, p3y, p2x, p2y, color );
}

