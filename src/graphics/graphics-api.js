/**
 * Pi.js - Graphics Module
 * 
 * Basic Graphics Commands: pset, line, and more to come
 * 
 * @module graphics/graphics-api
 */

"use strict";

// Import modules directly
import * as g_utils from "../core/utils.js";
import * as g_colors from "./colors.js";

// Graphics Modules
import * as g_primitives from "./graphics-primitives.js";
import * as g_shapes from "./graphics-shapes.js";

let m_api = null;

/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


// Initialize graphics module - only gets called on page load
export function init( api ) {
	m_api = api;

	// Build the null graphics commands - basically will throw an error since no screen is available
	buildGraphicsApi( null );
}

// Function to dynamically build the external API drawing commands (e.g., pset, line, etc...)
// for the current active screen, pen, and blend functions. This creates specialized API wrappers
// that handle input parsing/validation, then call optimized internal drawing routines. By closing
// over specific, already-optimized functions (like penFn), it provides highly performant, 
// monomorphic call sites in hot loops. Note that this gets from buildPenFn when a pen or blend
// changes or when screen the screen resizes or there is a new screen. Also gets called when on
// init but just to setup pre-screen calls with error returns.
export function buildGraphicsApi( s_screenData ) {

	if( s_screenData === null ) {

		// Set error fn for primitives
		for( const commandName of g_primitives.commandNames ) {
			m_api[ commandName ] = () => g_utils.errFn( commandName );
		}

		// Set error fn for primitives
		for( const commandName of g_shapes.commandNames ) {
			m_api[ commandName ] = () => g_utils.errFn( commandName );
		}
		return;
	}

	const s_penFn = s_screenData.pens.penFn;
	const s_penSize = s_screenData.pens.size;
	const s_penHalfSize = Math.round( s_penSize / 2 );
	const s_screenWidth = s_screenData.width;
	const s_screenHeight = s_screenData.height;
	const s_blendFn = s_screenData.blends.blendFn;
	const s_setImageDirty = s_screenData.renderer.setImageDirty;
	const s_getImageData = s_screenData.renderer.getImageData;
	const s_pointBatch = s_screenData.pointBatch;
	const s_pixelsPerPen = s_screenData.pens.pixelsPerPen;
	const s_prepareBatch = s_screenData.renderer.prepareBatch;
	const s_isObjectLiteral = g_utils.isObjectLiteral;
	const s_getInt = g_utils.getInt;
	const s_color = s_screenData.color;
	const s_getColorValueByRawInput = g_colors.getColorValueByRawInput;

	// Build primitives api
	g_primitives.buildApi(
		m_api, s_screenData, s_penFn, s_isObjectLiteral, s_getInt, s_getImageData, s_color,
		s_setImageDirty, s_prepareBatch, s_pointBatch, s_pixelsPerPen
	);

	// build shapes api
	g_shapes.buildApi(
		m_api, s_screenData, s_penFn, s_blendFn, s_isObjectLiteral, s_getInt, s_getImageData,
		s_color, s_setImageDirty, s_prepareBatch, s_pointBatch, s_pixelsPerPen, s_screenWidth,
		s_screenHeight, s_penSize, s_penHalfSize, s_getColorValueByRawInput
	);
}
