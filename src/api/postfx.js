/**
 * Pi.js - Post-FX Module
 *
 * API for custom post-processing shaders (display and FBO).
 *
 * @module api/postfx
 */

"use strict";

import * as g_commands from "../core/commands.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_renderer from "../renderer/renderer.js";

/** Next id for shader handles */
let m_nextShaderId = 0;

/** Shader handles */
let m_shaderHandles = new Map();


/**************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init( api ) {
	g_screenManager.addScreenDataItem( "displayShaderHandle", null );
	g_screenManager.addScreenDataItem( "displayShaderUniforms", {} );
	g_screenManager.addScreenDataItem( "renderToDisplaySize", false );
	registerCommands();
}


function registerCommands() {
	g_commands.addCommand( "createShader", createShader, false, [ "fragmentSource", "uniforms" ] );
	g_commands.addCommand( "applyShader", applyShader, true, [ "shaderHandle", "uniforms" ] );
	g_commands.addCommand(
		"setDisplayShader", setDisplayShader, true, [ "shaderHandle", "uniforms" ]
	);
	g_commands.addCommand(
		"setDisplayShaderUniforms", setDisplayShaderUniforms, true, [ "uniforms" ]
	);
}


/**************************************************************************************************
 * External API Commands
 **************************************************************************************************/


/**
 * Create a custom shader from fragment source.
 *
 * @param {Object} options - Parsed options: fragmentSource (string), uniforms (object | null)
 * @param {string} options.fragmentSource - Fragment shader GLSL ES 3.00 source
 * @param {Object} [options.uniforms] - Optional: { name: value, ... } default values
 * @returns {number} Shader handle id
 */
function createShader( options ) {
	const fragmentSource = options.fragmentSource;
	const uniforms = options.uniforms ?? null;

	if( typeof fragmentSource !== "string" ) {
		const error = new TypeError( "createShader: Parameter fragmentSource must be a string." );
		error.code = "INVALID_FRAGMENT_SOURCE";
		throw error;
	}

	if( fragmentSource.trim().length === 0 ) {
		const error = new TypeError( "createShader: Parameter fragmentSource must not be empty." );
		error.code = "INVALID_FRAGMENT_SOURCE";
		throw error;
	}

	// Make sure the fragment source is valid GLSL ES 3.00
	if( !fragmentSource.includes( "#version 300 es" ) ) {
		const error = new TypeError(
			"createShader: Parameter fragmentSource must include #version 300 es."
		);
		error.code = "INVALID_FRAGMENT_SOURCE";
		throw error;
	}

	// Validate uniforms
	if( uniforms && typeof uniforms !== "object" ) {
		const error = new TypeError( "createShader: Parameter uniforms must be an object." );
		error.code = "INVALID_UNIFORMS";
		throw error;
	}

	// Create shader handle
	const handle = {
		"id": m_nextShaderId++,
		"fragmentSource": fragmentSource,
		"uniforms": uniforms
	};
	m_shaderHandles.set( handle.id, handle );
	
	return handle.id;
}


/**
 * Resolve shader handle (id or object) to the full handle object.
 *
 * @param {number|Object} shaderHandle - Shader handle id or handle object
 * @param {string} [cmdName="applyShader"] - Command name for error messages
 * @returns {{ id: number, fragmentSource: string, uniforms: Object }} Handle object
 */
export function getShaderHandle( shaderHandle, cmdName ) {
	if( cmdName == null ) {
		cmdName = "applyShader";
	}
	if( shaderHandle == null ) {
		const error = new TypeError( `${cmdName}: Parameter shaderHandle is required.` );
		error.code = "INVALID_SHADER_HANDLE";
		throw error;
	}
	if( typeof shaderHandle === "number" ) {
		const handle = m_shaderHandles.get( shaderHandle );
		if( !handle ) {
			const error = new TypeError( `${cmdName}: Unknown shader handle id ${shaderHandle}.` );
			error.code = "INVALID_SHADER_HANDLE";
			throw error;
		}
		return handle;
	}
	if(
		typeof shaderHandle === "object" && "id" in shaderHandle && "fragmentSource" in shaderHandle
	) {
		return shaderHandle;
	}
	const error = new TypeError(
		`${cmdName}: Parameter shaderHandle must be a shader id or handle from createShader.`
	);
	error.code = "INVALID_SHADER_HANDLE";
	throw error;
}


/**
 * Shallow-copy a caller uniform object so later mutation does not leak.
 *
 * @param {Object|null} uniforms - Caller-provided uniforms
 * @returns {Object} New object (empty if none)
 */
function copyUniforms( uniforms ) {
	if( !uniforms || typeof uniforms !== "object" ) {
		return {};
	}
	return { ...uniforms };
}


/**
 * Queue custom FBO shader at current point in draw order (does not flush).
 *
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Parsed options: shaderHandle (number|Object), uniforms (object | null)
 * @returns {void}
 */
function applyShader( screenData, options ) {
	const handle = getShaderHandle( options.shaderHandle );
	const overrides = options.uniforms ?? {};
	const merged = { ...( handle.uniforms ?? {} ), ...overrides };
	g_renderer.validateCustomShaderProgram( screenData, handle, "applyShader" );
	g_renderer.prepareShaderBatch( screenData, handle, merged );
	g_renderer.setImageDirty( screenData );
}


/**
 * Set or clear the display shader. Always invalidates presentation.
 *
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Parsed options: shaderHandle, uniforms
 * @returns {void}
 */
function setDisplayShader( screenData, options ) {
	if( options.shaderHandle == null ) {
		screenData.displayShaderHandle = null;
		screenData.displayShaderUniforms = {};
		screenData.renderToDisplaySize = false;
		g_renderer.flushBatches( screenData );
		g_screenManager.refreshScreenSize( screenData, true );
		return;
	}

	if( options.uniforms && typeof options.uniforms !== "object" ) {
		const error = new TypeError( "setDisplayShader: Parameter uniforms must be an object." );
		error.code = "INVALID_UNIFORMS";
		throw error;
	}

	const handle = getShaderHandle( options.shaderHandle, "setDisplayShader" );
	g_renderer.validateCustomShaderProgram( screenData, handle, "setDisplayShader" );
	screenData.displayShaderHandle = handle;
	screenData.displayShaderUniforms = copyUniforms( options.uniforms );
	screenData.renderToDisplaySize = !screenData.isOffscreen;
	g_renderer.flushBatches( screenData );
	g_screenManager.refreshScreenSize( screenData, true );
}


/**
 * Merge persistent display-shader uniform overrides and re-present.
 *
 * @param {Object} screenData - Screen data object
 * @param {Object} options - Parsed options: uniforms
 * @returns {void}
 */
function setDisplayShaderUniforms( screenData, options ) {
	const incoming = options.uniforms;
	if( incoming && typeof incoming !== "object" ) {
		const error = new TypeError(
			"setDisplayShaderUniforms: Parameter uniforms must be an object."
		);
		error.code = "INVALID_UNIFORMS";
		throw error;
	}

	screenData.displayShaderUniforms = {
		...( screenData.displayShaderUniforms ?? {} ),
		...copyUniforms( incoming )
	};

	if( screenData.displayShaderHandle ) {
		g_screenManager.presentCurrentScreen( screenData );
	}
}
