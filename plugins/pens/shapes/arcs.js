
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
	// TODO: actually figure out good formula for segmentsPerFullCircle
	const segmentsPerFullCircle = Math.min( Math.round( radius * 5 ), 360 );

	const halfWidth = penSize / 2;

	// For square caps, extend the arc by halfWidth on each end to avoid overlapping cap quads
	const extensionAngle = ( useSquareCaps && radius > 0 ) ? ( halfWidth / radius ) : 0;
	const effectiveStartAngle = angle1 - extensionAngle;
	const effectiveEndAngle = ( angle1 + sweepAngle ) + extensionAngle;
	const effectiveSweep = effectiveEndAngle - effectiveStartAngle;

	const numSegments = Math.max(
		2,
		Math.ceil( ( effectiveSweep / ( 2 * Math.PI ) ) * segmentsPerFullCircle )
	);

	const angleStep = effectiveSweep / numSegments;

	// Get the geometry batch
	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];

	// Estimate vertex count: 6 per rectangular segment
	// Note: square caps are handled by extending the arc; circle caps draw their own geometry
	const estimatedVertices = numSegments * 6;
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, estimatedVertices );

	// Calculate start and end points for caps (for circle caps only)
	const startAngle = effectiveStartAngle;
	const endAngle = effectiveEndAngle;
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

		const angle1Seg = effectiveStartAngle + i * angleStep;
		const angle2Seg = effectiveStartAngle + ( i + 1 ) * angleStep;

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

		// No separate geometry; arc was extended to produce square ends without overlap
	} else {

		// TODO: Fix circle end caps
		// Draw circular caps
		// Use penSize / 2 as radius (same as drawLineCircle does)
		// drawFilledCircle applies radius -= 1 internally, so we add 1 to ensure full coverage
		const capRadius = Math.round( penSize / 2 );
		

		// Draw half circles oriented along the stroke direction to avoid overlap
		g_batchHelpers.drawHalfCircleCap( screenData, startX, startY, capRadius, color, startDirX, startDirY, false );
		g_batchHelpers.drawHalfCircleCap( screenData, endX, endY, capRadius, color, endDirX, endDirY, true );
	}
}
