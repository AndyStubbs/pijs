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
import * as g_images from "./images.js";

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
	g_screenManager.addScreenDataItem( "displayShaderUniformBindings", {} );
	g_screenManager.addScreenDataItem( "displayShaderTextureResolver", null );
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

	validateUniformMap( uniforms, "createShader" );

	// Create shader handle
	const handle = {
		"id": m_nextShaderId++,
		"fragmentSource": fragmentSource,
		"uniforms": copyUniforms( uniforms )
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
	const copy = {};
	for( const name of Object.keys( uniforms ) ) {
		const value = uniforms[ name ];
		if( Array.isArray( value ) ) {
			copy[ name ] = value.slice();
		} else if(
			value instanceof Float32Array || value instanceof Int32Array ||
			value instanceof Uint32Array
		) {
			copy[ name ] = value.slice();
		} else {
			copy[ name ] = value;
		}
	}
	return copy;
}

function mergeUniforms( defaults, overrides ) {
	const merged = copyUniforms( defaults );
	const overrideCopy = copyUniforms( overrides );
	for( const name of Object.keys( overrideCopy ) ) {
		merged[ name ] = overrideCopy[ name ];
	}
	return merged;
}

function validateUniformMap( uniforms, cmdName ) {
	if( uniforms != null && ( typeof uniforms !== "object" || Array.isArray( uniforms ) ) ) {
		const error = new TypeError( `${cmdName}: Parameter uniforms must be an object.` );
		error.code = "INVALID_UNIFORMS";
		throw error;
	}
}

function resolveSamplerSource( screenData, input, cmdName ) {
	let source;
	try {
		source = g_images.getImageFromRawInput( input, cmdName );
	} catch( error ) {
		if( error.code === "INVALID_NAME" ) {
			const uniformError = new TypeError( `${cmdName}: Invalid sampler2D image input.` );
			uniformError.code = "INVALID_UNIFORM_VALUE";
			throw uniformError;
		}
		throw error;
	}
	const sourceData = g_screenManager.screenCanvasMap.get( source );
	if( sourceData === screenData ) {
		const error = new Error( `${cmdName}: A shader cannot sample its destination screen.` );
		error.code = "FRAMEBUFFER_FEEDBACK_LOOP";
		throw error;
	}
	return source;
}

function normalizeUniforms( screenData, cache, uniforms, cmdName ) {
	return g_renderer.normalizeCustomUniforms(
		screenData.gl, cache, uniforms, cmdName,
		( input ) => resolveSamplerSource( screenData, input, cmdName )
	);
}

function getSamplerTextureMap( screenData, bindings ) {
	const textures = new Map();
	for( const binding of Object.values( bindings ) ) {
		if( binding.info.family !== "sampler" ) {
			continue;
		}
		for( const source of binding.sources ) {
			if( !textures.has( source ) ) {
				textures.set( source, g_renderer.getWebGL2Texture( screenData, source ) );
			}
		}
	}
	return textures;
}

function retainSamplerSources( uniforms, bindings ) {
	const retained = copyUniforms( uniforms );
	for( const name of Object.keys( bindings ) ) {
		const binding = bindings[ name ];
		if( binding.info.family !== "sampler" ) {
			continue;
		}
		if( binding.sources.length === 1 ) {
			retained[ name ] = binding.sources[ 0 ];
		} else {
			retained[ name ] = binding.sources.slice();
		}
	}
	return retained;
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
	validateUniformMap( options.uniforms, "applyShader" );
	const overrides = copyUniforms( options.uniforms );
	const merged = mergeUniforms( handle.uniforms, overrides );
	const cache = g_renderer.validateCustomShaderProgram( screenData, handle, "applyShader" );
	const bindings = normalizeUniforms( screenData, cache, merged, "applyShader" );
	const samplerTextures = getSamplerTextureMap( screenData, bindings );
	g_renderer.prepareShaderBatch( screenData, handle, bindings, samplerTextures );
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
		screenData.displayShaderUniformBindings = {};
		screenData.displayShaderTextureResolver = null;
		screenData.renderToDisplaySize = false;
		g_renderer.flushBatches( screenData );
		g_screenManager.refreshScreenSize( screenData, true );
		return;
	}

	validateUniformMap( options.uniforms, "setDisplayShader" );

	const handle = getShaderHandle( options.shaderHandle, "setDisplayShader" );
	const cache = g_renderer.validateCustomShaderProgram(
		screenData, handle, "setDisplayShader"
	);
	const merged = mergeUniforms( handle.uniforms, options.uniforms );
	const bindings = normalizeUniforms( screenData, cache, merged, "setDisplayShader" );
	getSamplerTextureMap( screenData, bindings );
	screenData.displayShaderHandle = handle;
	screenData.displayShaderUniforms = retainSamplerSources( merged, bindings );
	screenData.displayShaderUniformBindings = bindings;
	screenData.displayShaderTextureResolver = ( source ) => {
		return g_renderer.getWebGL2Texture( screenData, source );
	};
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
	validateUniformMap( incoming, "setDisplayShaderUniforms" );

	const values = mergeUniforms( screenData.displayShaderUniforms, incoming );
	let bindings = screenData.displayShaderUniformBindings;
	if( screenData.displayShaderHandle ) {
		const cache = g_renderer.validateCustomShaderProgram(
			screenData, screenData.displayShaderHandle, "setDisplayShaderUniforms"
		);
		bindings = normalizeUniforms(
			screenData, cache, values, "setDisplayShaderUniforms"
		);
		getSamplerTextureMap( screenData, bindings );
	}
	screenData.displayShaderUniforms = retainSamplerSources( values, bindings );
	screenData.displayShaderUniformBindings = bindings;

	if( screenData.displayShaderHandle ) {
		g_screenManager.presentCurrentScreen( screenData );
	}
}
