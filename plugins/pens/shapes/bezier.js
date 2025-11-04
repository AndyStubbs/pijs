
/**
 * Draw cubic Bezier with square pen by tessellating and emitting thick rectangles per segment.
 * Adds square caps at the curve ends using batch-helpers.
 * 
 * @returns {void}
 */
export function drawBezierSquare( screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color, penSize, penType ) {

	const pts = g_batchHelpers.tessellateCubicBezier( p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, 0.75 );
	if( pts.length < 4 ) return;

	const halfWidth = Math.floor( penSize / 2 );
	const count = ( pts.length >> 1 );
	const offsets = buildOffsetSides( pts, halfWidth );
	const left = offsets.left;
	const right = offsets.right;

	applyMiterJoins( pts, left, right, halfWidth );

	// Extend endpoints for square ends
	{
		const x0 = pts[ 0 ], y0 = pts[ 1 ];
		const x1 = pts[ 2 ], y1 = pts[ 3 ];
		let dx = x1 - x0, dy = y1 - y0; let len = Math.sqrt( dx*dx + dy*dy );
		if( len < 0.0001 ) { dx = 1; dy = 0; len = 1; }
		dx /= len; dy /= len;
		left[ 0 ] -= dx * halfWidth; left[ 1 ] -= dy * halfWidth;
		right[ 0 ] -= dx * halfWidth; right[ 1 ] -= dy * halfWidth;

		const pt1Index = ( count - 1 ) * 2;
		const pt2Index = ( count - 2 ) * 2;
		const xn = pts[ pt1Index ], yn = pts[ pt1Index + 1 ];
		const xp = pts[ pt2Index ], yp = pts[ pt2Index + 1 ];
		dx = xn - xp; dy = yn - yp; len = Math.sqrt( dx*dx + dy*dy );
		if( len < 0.0001 ) {
			dx = 1; dy = 0; len = 1;
		}
		dx /= len; dy /= len;
		left[ pt1Index ] += dx * halfWidth; left[ pt1Index + 1 ] += dy * halfWidth;
		right[ pt1Index ] += dx * halfWidth; right[ pt1Index + 1 ] += dy * halfWidth;
	}

	renderThickStrip( screenData, left, right, color );
}

/**
 * Draw cubic Bezier with circle pen: thick segments without caps, then semicircle caps at ends.
 * 
 * @returns {void}
 */
export function drawBezierCircle(
	screenData, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, color, penSize
) {

	const pts = g_batchHelpers.tessellateCubicBezier(
		p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, 0.75
	);
	if( pts.length < 4 ) return;

	const halfWidth = Math.floor( penSize / 2 );
	const count = ( pts.length >> 1 );
	const offsets = buildOffsetSides( pts, halfWidth );
	const left = offsets.left;
	const right = offsets.right;

	applyMiterJoins( pts, left, right, halfWidth );

	renderThickStrip( screenData, left, right, color );

	// Caps
	const startX = pts[ 0 ], startY = pts[ 1 ];
	const endX = pts[ ( count - 1 ) * 2 ], endY = pts[ ( count - 1 ) * 2 + 1 ];
	let sdx = pts[ 2 ] - pts[ 0 ], sdy = pts[ 3 ] - pts[ 1 ];
	let sl = Math.sqrt( sdx*sdx + sdy*sdy ); if( sl < 0.0001 ) { sdx = 1; sdy = 0; sl = 1; }
		sdx /= sl; sdy /= sl;
	let edx = pts[ ( count - 1 ) * 2 ] - pts[ ( count - 2 ) * 2 ];
	let edy = pts[ ( count - 1 ) * 2 + 1 ] - pts[ ( count - 2 ) * 2 + 1 ];
	let el = Math.sqrt( edx*edx + edy*edy ); if( el < 0.0001 ) { edx = 1; edy = 0; el = 1; }
		edx /= el; edy /= el;

	g_batchHelpers.drawHalfCircleCap(
		screenData, startX, startY, halfWidth, color, sdx, sdy, false
	);
	g_batchHelpers.drawHalfCircleCap( screenData, endX, endY, halfWidth, color, edx, edy, true );
}


/**************************************************************************************************
 * Ineternal Helper functions
 **************************************************************************************************/


/**
 * Build left/right offset vertices for a polyline defined by tessellated points.
 * Uses averaged tangents for normals, which stabilizes the strip across corners.
 *
 * @param {Array<number>} pts - Flat array [x0, y0, x1, y1, ...]
 * @param {number} halfWidth - Half of the stroke width
 * @returns {{ left: Array<number>, right: Array<number> }}
 */
function buildOffsetSides( pts, halfWidth ) {

	const count = ( pts.length >> 1 );
	const left = new Array( count * 2 );
	const right = new Array( count * 2 );

	for( let i = 0; i < count; i++ ) {
		const iPrev = Math.max( 0, i - 1 );
		const iNext = Math.min( count - 1, i + 1 );
		const xPrev = pts[ iPrev * 2 ];
		const yPrev = pts[ iPrev * 2 + 1 ];
		const xNext = pts[ iNext * 2 ];
		const yNext = pts[ iNext * 2 + 1 ];
		let dx = xNext - xPrev;
		let dy = yNext - yPrev;
		let len = Math.sqrt( dx * dx + dy * dy );
		if( len < 0.0001 ) { dx = 1; dy = 0; len = 1; }
		dx /= len; dy /= len;
		const nx = -dy;
		const ny = dx;
		const px = pts[ i * 2 ];
		const py = pts[ i * 2 + 1 ];
		left[ i * 2 ] = px + nx * halfWidth;
		left[ i * 2 + 1 ] = py + ny * halfWidth;
		right[ i * 2 ] = px - nx * halfWidth;
		right[ i * 2 + 1 ] = py - ny * halfWidth;
	}

	return { "left": left, "right": right };
}

/**
 * Apply miter joins with a limit to reduce overlaps at sharp angles.
 * Modifies left/right arrays in place.
 *
 * @param {Array<number>} pts
 * @param {Array<number>} left
 * @param {Array<number>} right
 * @param {number} halfWidth
 * @returns {void}
 */
function applyMiterJoins( pts, left, right, halfWidth ) {

	const count = ( pts.length >> 1 );
	const miterLimit = 2.0;

	function intersect( x1, y1, dx1, dy1, x2, y2, dx2, dy2 ) {
		const det = dx1 * dy2 - dy1 * dx2;
		if( Math.abs( det ) < 1e-6 ) return null;
		const t = ( ( x2 - x1 ) * dy2 - ( y2 - y1 ) * dx2 ) / det;
		return { "x": x1 + dx1 * t, "y": y1 + dy1 * t };
	}

	for( let i = 1; i < count - 1; i++ ) {
		const xA = pts[ ( i - 1 ) * 2 ], yA = pts[ ( i - 1 ) * 2 + 1 ];
		const xB = pts[ i * 2 ], yB = pts[ i * 2 + 1 ];
		const xC = pts[ ( i + 1 ) * 2 ], yC = pts[ ( i + 1 ) * 2 + 1 ];

		let dx1 = xB - xA, dy1 = yB - yA; let len1 = Math.sqrt( dx1*dx1 + dy1*dy1 );
		if( len1 < 1e-6 ) { dx1 = 1; dy1 = 0; len1 = 1; }
		dx1 /= len1; dy1 /= len1;
		let dx2 = xC - xB, dy2 = yC - yB; let len2 = Math.sqrt( dx2*dx2 + dy2*dy2 );
		if( len2 < 1e-6 ) { dx2 = 1; dy2 = 0; len2 = 1; }
		dx2 /= len2; dy2 /= len2;

		const n1x = -dy1, n1y = dx1;
		const n2x = -dy2, n2y = dx2;

		const lBx = xB + n1x * halfWidth, lBy = yB + n1y * halfWidth;
		const lCx = xB + n2x * halfWidth, lCy = yB + n2y * halfWidth;
		const li = intersect( lBx, lBy, dx1, dy1, lCx, lCy, dx2, dy2 );
		if( li ) {
			const d = Math.hypot( li.x - xB, li.y - yB );
			if( d <= miterLimit * halfWidth ) {
				left[ i * 2 ] = li.x; left[ i * 2 + 1 ] = li.y;
			}
		}

		const rBx = xB - n1x * halfWidth, rBy = yB - n1y * halfWidth;
		const rCx = xB - n2x * halfWidth, rCy = yB - n2y * halfWidth;
		const ri = intersect( rBx, rBy, dx1, dy1, rCx, rCy, dx2, dy2 );
		if( ri ) {
			const d = Math.hypot( ri.x - xB, ri.y - yB );
			if( d <= miterLimit * halfWidth ) {
				right[ i * 2 ] = ri.x; right[ i * 2 + 1 ] = ri.y;
			}
		}
	}
}

/**
 * Add triangles for a continuous thick polyline strip.
 *
 * @param {Object} screenData
 * @param {Array<number>} left
 * @param {Array<number>} right
 * @param {Object} color
 * @returns {void}
 */
function renderThickStrip( screenData, left, right, color ) {

	const batch = screenData.batches[ g_batches.GEOMETRY_BATCH ];
	const count = ( left.length >> 1 );
	g_batches.prepareBatch( screenData, g_batches.GEOMETRY_BATCH, ( count - 1 ) * 6 );
	for( let i = 0; i < count - 1; i++ ) {
		const l0x = left[ i * 2 ], l0y = left[ i * 2 + 1 ];
		const r0x = right[ i * 2 ], r0y = right[ i * 2 + 1 ];
		const l1x = left[ ( i + 1 ) * 2 ], l1y = left[ ( i + 1 ) * 2 + 1 ];
		const r1x = right[ ( i + 1 ) * 2 ], r1y = right[ ( i + 1 ) * 2 + 1 ];
		g_batchHelpers.addTriangleToBatch( batch, l0x, l0y, r0x, r0y, l1x, l1y, color );
		g_batchHelpers.addTriangleToBatch( batch, l1x, l1y, r0x, r0y, r1x, r1y, color );
	}
}