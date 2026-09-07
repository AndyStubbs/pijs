/**
 * Canvas content bounds shared by presentation sizing and pointer conversion.
 * Supports ordinary axis-aligned CSS scaling; rotation and skew are not supported.
 * @module core/canvas-layout
 */

/**
 * Read current content bounds in viewport coordinates, excluding borders and padding.
 * @param {HTMLCanvasElement} canvas - Displayed canvas
 * @returns {Object} Viewport bounds and CSS content dimensions before transforms
 */
export function getCanvasContentRect( canvas ) {
	const rect = canvas.getBoundingClientRect();
	const style = getComputedStyle( canvas );
	const left = parseFloat( style.borderLeftWidth ) + parseFloat( style.paddingLeft );
	const top = parseFloat( style.borderTopWidth ) + parseFloat( style.paddingTop );
	const right = parseFloat( style.borderRightWidth ) + parseFloat( style.paddingRight );
	const bottom = parseFloat( style.borderBottomWidth ) + parseFloat( style.paddingBottom );
	let width = parseFloat( style.width );
	let height = parseFloat( style.height );
	if( style.boxSizing !== "border-box" ) {
		width += left + right;
		height += top + bottom;
	}
	let scaleX = 0;
	let scaleY = 0;
	if( width > 0 && height > 0 ) {
		scaleX = rect.width / width;
		scaleY = rect.height / height;
	}
	return {
		"cssWidth": Math.max( 0, width - left - right ),
		"cssHeight": Math.max( 0, height - top - bottom ),
		"left": rect.left + left * scaleX,
		"top": rect.top + top * scaleY,
		"width": Math.max( 0, rect.width - ( left + right ) * scaleX ),
		"height": Math.max( 0, rect.height - ( top + bottom ) * scaleY )
	};
}
