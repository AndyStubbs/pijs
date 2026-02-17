/**
 * Pi.js - Post-FX Module
 *
 * API for custom post-processing shaders (display and FBO).
 *
 * @module api/postfx
 */

"use strict";

import * as g_commands from "../core/commands.js";
import * as g_renderer from "../renderer/renderer.js";

/** Next id for shader handles */
let m_nextShaderId = 0;

/** Shader handles */
let m_shaderHandles = new Map();

/**************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init( api ) {
	registerCommands();
}


function registerCommands() {
	g_commands.addCommand( "createShader", createShader, false, [ "fragmentSource", "uniforms" ] );
	g_commands.addCommand( "applyShader", applyShader, true, [ "shaderHandle", "uniforms" ] );
}


/**************************************************************************************************
 * External API Commands
 **************************************************************************************************/


/**
 * Create a custom shader from fragment source.
 *
 * @param {Object} options - Parsed options: fragmentSource (string), options (object | null)
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
		id: m_nextShaderId++,
		fragmentSource,
		uniforms
	};
	m_shaderHandles.set( handle.id, handle );
	
	return handle.id;
}


/**
 * Resolve shader handle (id or object) to the full handle object.
 *
 * @param {number|Object} shaderHandle - Shader handle id or handle object
 * @returns {{ id: number, fragmentSource: string, uniforms: Object }} Handle object
 */
export function getShaderHandle( shaderHandle ) {
	if( shaderHandle == null ) {
		const error = new TypeError( "applyShader: Parameter shaderHandle is required." );
		error.code = "INVALID_SHADER_HANDLE";
		throw error;
	}
	if( typeof shaderHandle === "number" ) {
		const handle = m_shaderHandles.get( shaderHandle );
		if( !handle ) {
			const error = new TypeError( `applyShader: Unknown shader handle id ${shaderHandle}.` );
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
		"applyShader: Parameter shaderHandle must be a shader id or handle from createShader."
	);
	error.code = "INVALID_SHADER_HANDLE";
	throw error;
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
	g_renderer.prepareShaderBatch( screenData, handle, merged );
	g_renderer.setImageDirty( screenData );
}
