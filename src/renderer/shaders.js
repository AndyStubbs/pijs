/**
 * Pi.js - Shaders Module
 * 
 * Shader compilation, program creation, and display shader setup.
 * 
 * @module renderer/shaders
 */

"use strict";

import * as g_screenManager from "../core/screen-manager.js";

// Shaders are imported from external files via esbuild text loader
import m_displayVertSrc from "./shaders/display.vert";
import m_displayFragSrc from "./shaders/display.frag";


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize shaders module
 * 
 * @returns {void}
 */
export function init() {

	g_screenManager.addScreenDataItem( "displayProgram", null );
	g_screenManager.addScreenDataItem( "displayPositionBuffer", null );
	g_screenManager.addScreenDataItem( "displayLocations", null );
}

/**
 * Compile a single shader
 * 
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {number} type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
 * @param {string} source - Shader source code
 * @returns {WebGLShader|null} Compiled shader or null on error
 */
export function compileShader( gl, type, source ) {
	const shader = gl.createShader( type );
	gl.shaderSource( shader, source );
	gl.compileShader( shader );
	
	if( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
		console.error( "Shader compile error:", gl.getShaderInfoLog( shader ) );
		gl.deleteShader( shader );
		return null;
	}
	
	return shader;
}

/**
 * Create a linked shader program
 * 
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {string} vertexSrc - Vertex shader source
 * @param {string} fragSrc - Fragment shader source
 * @param {string} [cmdName="screen"] - Command name for error messages
 * @returns {WebGLProgram|null} Linked program or null on error
 */
export function createShaderProgram( gl, vertexSrc, fragSrc, cmdName = "screen" ) {
	let vertexShader = null;
	let fragmentShader = null;
	let program = null;
	let isProgramLinked = false;

	try {
		vertexShader = compileShader( gl, gl.VERTEX_SHADER, vertexSrc );
		fragmentShader = compileShader( gl, gl.FRAGMENT_SHADER, fragSrc );

		if( !vertexShader || !fragmentShader ) {
			const error = new Error( `${cmdName}: Unable to compile shaders.` );
			error.code = "INVALID_SHADERS";
			throw error;
		}

		program = gl.createProgram();
		gl.attachShader( program, vertexShader );
		gl.attachShader( program, fragmentShader );
		gl.linkProgram( program );

		if( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
			const errLog = gl.getProgramInfoLog( program );
			const error = new Error( `${cmdName}: Shader program error: ${errLog}.` );
			error.code = "SHADER_PROGRAM_ERROR";
			throw error;
		}

		isProgramLinked = true;
		return program;
	} finally {
		if( vertexShader ) {
			gl.deleteShader( vertexShader );
		}
		if( fragmentShader ) {
			gl.deleteShader( fragmentShader );
		}
		if( program && !isProgramLinked ) {
			gl.deleteProgram( program );
		}
	}
}

/**
 * Setup display shader for rendering FBO to screen
 * 
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function setupDisplayShader( screenData ) {
	const gl = screenData.gl;
	
	// Create shader program
	const program = createShaderProgram( gl, m_displayVertSrc, m_displayFragSrc );
	
	// Create fullscreen quad vertices (NDC: -1 to 1)
	const positions = new Float32Array( [
		-1, -1, // Bottom left
		 1, -1, // Bottom right
		-1,  1, // Top left
		-1,  1, // Top left
		 1, -1, // Bottom right
		 1,  1  // Top right
	] );
	
	// Create vertex buffer
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW );
	
	// Get attribute/uniform locations
	const positionLoc = gl.getAttribLocation( program, "a_position" );
	const textureLoc = gl.getUniformLocation( program, "u_texture" );

	// VAO for fullscreen quad (shared by display pass and FBO shader pass)
	const quadVao = gl.createVertexArray();
	gl.bindVertexArray( quadVao );
	gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
	gl.enableVertexAttribArray( positionLoc );
	gl.vertexAttribPointer( positionLoc, 2, gl.FLOAT, false, 0, 0 );
	gl.bindVertexArray( null );
	
	// Store in screen data
	screenData.displayProgram = program;
	screenData.displayPositionBuffer = positionBuffer;
	screenData.displayQuadVao = quadVao;
	screenData.displayLocations = {
		"position": positionLoc,
		"texture": textureLoc
	};
}

/**
 * Get or create a custom shader program for a handle (lazy compile per screen).
 *
 * @param {Object} screenData - Screen data object
 * @param {{ id: number, fragmentSource: string, uniforms: Object }} handle - Shader handle
 * @param {string} [cmdName="screen"] - Command name for compilation errors
 * @returns {{ program: WebGLProgram, locations: Object }} Program and cached locations
 */
export function getOrCreateCustomShaderProgram( screenData, handle, cmdName = "screen" ) {
	const gl = screenData.gl;
	let cache = screenData.customShaders[ handle.id ];
	if( cache ) {
		return cache;
	}
	const program = createShaderProgram( gl, m_displayVertSrc, handle.fragmentSource, cmdName );
	const positionLoc = gl.getAttribLocation( program, "a_position" );
	const textureLoc = gl.getUniformLocation( program, "u_texture" );
	const sourceSizeLoc = gl.getUniformLocation( program, "u_sourceSize" );
	const outputSizeLoc = gl.getUniformLocation( program, "u_outputSize" );
	const timeLoc = gl.getUniformLocation( program, "u_time" );
	const frameLoc = gl.getUniformLocation( program, "u_frame" );
	const customUniforms = reflectCustomUniforms( gl, program );
	cache = {
		program,
		customUniforms,
		locations: {
			position: positionLoc,
			texture: textureLoc,
			sourceSize: sourceSizeLoc,
			outputSize: outputSizeLoc,
			time: timeLoc,
			frame: frameLoc
		}
	};
	screenData.customShaders[ handle.id ] = cache;
	return cache;
}

const m_reservedUniforms = new Set( [
	"u_texture", "u_sourceSize", "u_outputSize", "u_time", "u_frame"
] );

/**
 * Reflect active uniforms so JavaScript values can be dispatched by their GLSL types.
 *
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {WebGLProgram} program - Linked shader program
 * @returns {Object} Uniform metadata keyed by base uniform name
 */
function reflectCustomUniforms( gl, program ) {
	const uniforms = {};
	const count = gl.getProgramParameter( program, gl.ACTIVE_UNIFORMS );
	for( let i = 0; i < count; i++ ) {
		const active = gl.getActiveUniform( program, i );
		if( !active ) {
			continue;
		}
		const name = active.name.endsWith( "[0]" ) ? active.name.slice( 0, -3 ) : active.name;
		uniforms[ name ] = {
			"location": gl.getUniformLocation( program, active.name ),
			"name": name,
			"size": active.size,
			"type": active.type
		};
	}
	return uniforms;
}

/**
 * Compile and validate a custom shader before it changes rendering state.
 *
 * Programs are cached per screen after successful compilation. Custom post-processing shaders
 * must sample the current framebuffer through u_texture.
 *
 * @param {Object} screenData - Screen data object
 * @param {{ id: number, fragmentSource: string, uniforms: Object }} handle - Shader handle
 * @param {string} cmdName - Public command applying the shader
 * @returns {{ program: WebGLProgram, locations: Object }} Validated program cache
 */
export function validateCustomShaderProgram( screenData, handle, cmdName ) {
	const cache = getOrCreateCustomShaderProgram( screenData, handle, cmdName );
	if( cache.locations.texture === null ) {
		const error = new Error(
			`${cmdName}: Missing required uniform u_texture in shader.`
		);
		error.code = "MISSING_U_TEXTURE";
		throw error;
	}
	return cache;
}

const m_isDebug = typeof window !== "undefined" && window.location.search.includes( "webgl-debug" );

function uniformError( cmdName, code, message ) {
	const error = new TypeError( `${cmdName}: ${message}` );
	error.code = code;
	return error;
}

function getUniformTypeInfo( gl, type ) {
	const types = new Map( [
		[ gl.FLOAT, [ "float", 1, "float" ] ],
		[ gl.FLOAT_VEC2, [ "float", 2, "float" ] ],
		[ gl.FLOAT_VEC3, [ "float", 3, "float" ] ],
		[ gl.FLOAT_VEC4, [ "float", 4, "float" ] ],
		[ gl.INT, [ "int", 1, "int" ] ],
		[ gl.INT_VEC2, [ "int", 2, "int" ] ],
		[ gl.INT_VEC3, [ "int", 3, "int" ] ],
		[ gl.INT_VEC4, [ "int", 4, "int" ] ],
		[ gl.UNSIGNED_INT, [ "uint", 1, "uint" ] ],
		[ gl.UNSIGNED_INT_VEC2, [ "uint", 2, "uint" ] ],
		[ gl.UNSIGNED_INT_VEC3, [ "uint", 3, "uint" ] ],
		[ gl.UNSIGNED_INT_VEC4, [ "uint", 4, "uint" ] ],
		[ gl.BOOL, [ "bool", 1, "int" ] ],
		[ gl.BOOL_VEC2, [ "bool", 2, "int" ] ],
		[ gl.BOOL_VEC3, [ "bool", 3, "int" ] ],
		[ gl.BOOL_VEC4, [ "bool", 4, "int" ] ],
		[ gl.FLOAT_MAT2, [ "matrix2fv", 4, "float" ] ],
		[ gl.FLOAT_MAT3, [ "matrix3fv", 9, "float" ] ],
		[ gl.FLOAT_MAT4, [ "matrix4fv", 16, "float" ] ],
		[ gl.FLOAT_MAT2x3, [ "matrix2x3fv", 6, "float" ] ],
		[ gl.FLOAT_MAT2x4, [ "matrix2x4fv", 8, "float" ] ],
		[ gl.FLOAT_MAT3x2, [ "matrix3x2fv", 6, "float" ] ],
		[ gl.FLOAT_MAT3x4, [ "matrix3x4fv", 12, "float" ] ],
		[ gl.FLOAT_MAT4x2, [ "matrix4x2fv", 8, "float" ] ],
		[ gl.FLOAT_MAT4x3, [ "matrix4x3fv", 12, "float" ] ]
	] );
	if( type === gl.SAMPLER_2D ) {
		return { "components": 1, "family": "sampler", "setter": "sampler" };
	}
	const info = types.get( type );
	if( !info ) {
		return null;
	}
	return { "components": info[ 1 ], "family": info[ 2 ], "setter": info[ 0 ] };
}

function isNumericArray( value ) {
	return Array.isArray( value ) || value instanceof Float32Array ||
		value instanceof Int32Array || value instanceof Uint32Array;
}

function normalizeNumericUniform( info, value, cmdName ) {
	const expectedLength = info.components * info.uniform.size;
	let values;
	if( expectedLength === 1 && !isNumericArray( value ) ) {
		values = [ value ];
	} else if( isNumericArray( value ) ) {
		values = Array.from( value );
	} else {
		throw uniformError(
			cmdName, "INVALID_UNIFORM_VALUE",
			`Uniform "${info.uniform.name}" requires ${expectedLength} values.`
		);
	}
	if( values.length !== expectedLength ) {
		throw uniformError(
			cmdName, "INVALID_UNIFORM_VALUE",
			`Uniform "${info.uniform.name}" requires ${expectedLength} values.`
		);
	}
	for( const item of values ) {
		let isValid = typeof item === "number" && Number.isFinite( item );
		if( info.setter === "bool" ) {
			isValid = typeof item === "boolean";
		} else if( info.family === "int" || info.family === "uint" ) {
			isValid = isValid && Number.isInteger( item );
			if( info.family === "uint" ) {
				isValid = isValid && item >= 0 && item <= 4294967295;
			} else {
				isValid = isValid && item >= -2147483648 && item <= 2147483647;
			}
		}
		if( !isValid ) {
			throw uniformError(
				cmdName, "INVALID_UNIFORM_VALUE",
				`Uniform "${info.uniform.name}" contains an invalid value.`
			);
		}
	}
	if( info.setter === "bool" ) {
		values = values.map( ( item ) => {
			if( item ) {
				return 1;
			}
			return 0;
		} );
	}
	if( info.family === "float" ) {
		return new Float32Array( values );
	}
	if( info.family === "uint" ) {
		return new Uint32Array( values );
	}
	return new Int32Array( values );
}

/**
 * Validate and snapshot custom uniform values without changing WebGL state.
 *
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {Object} cache - Custom shader program cache
 * @param {Object} uniforms - Merged custom uniform values
 * @param {string} cmdName - Public command name
 * @param {Function} resolveSampler - Converts a public image input to an image source
 * @returns {Object} Normalized uniform bindings
 */
export function normalizeCustomUniforms( gl, cache, uniforms, cmdName, resolveSampler ) {
	const normalized = {};
	const samplerInfos = Object.values( cache.customUniforms ).filter( ( uniform ) => {
		if( m_reservedUniforms.has( uniform.name ) ) {
			return false;
		}
		const typeInfo = getUniformTypeInfo( gl, uniform.type );
		return typeInfo && typeInfo.family === "sampler";
	} );
	const samplerCount = samplerInfos.reduce( ( total, uniform ) => total + uniform.size, 0 );
	if( samplerCount + 1 > gl.getParameter( gl.MAX_TEXTURE_IMAGE_UNITS ) ) {
		throw uniformError(
			cmdName, "TOO_MANY_TEXTURE_UNIFORMS",
			"Shader requires more fragment texture units than this WebGL context supports."
		);
	}

	for( const name of Object.keys( uniforms ?? {} ) ) {
		if( m_reservedUniforms.has( name ) ) {
			continue;
		}
		const uniform = cache.customUniforms[ name ];
		if( !uniform ) {
			if( m_isDebug ) {
				console.warn( `${cmdName}: Unknown uniform "${name}" ignored.` );
			}
			continue;
		}
		const typeInfo = getUniformTypeInfo( gl, uniform.type );
		if( !typeInfo ) {
			throw uniformError(
				cmdName, "UNSUPPORTED_UNIFORM_TYPE",
				`Uniform "${name}" uses an unsupported GLSL type.`
			);
		}
		const info = {
			"components": typeInfo.components,
			"family": typeInfo.family,
			"setter": typeInfo.setter,
			"uniform": uniform
		};
		if( info.family === "sampler" ) {
			const inputs = uniform.size === 1 ? [ uniforms[ name ] ] : uniforms[ name ];
			if( !Array.isArray( inputs ) || inputs.length !== uniform.size ) {
				throw uniformError(
					cmdName, "INVALID_UNIFORM_VALUE",
					`Uniform "${name}" requires ${uniform.size} image inputs.`
				);
			}
			normalized[ name ] = {
				"info": info,
				"sources": inputs.map( ( input ) => resolveSampler( input ) )
			};
		} else {
			normalized[ name ] = {
				"info": info,
				"value": normalizeNumericUniform( info, uniforms[ name ], cmdName )
			};
		}
	}

	for( const uniform of samplerInfos ) {
		if( !normalized[ uniform.name ] ) {
			throw uniformError(
				cmdName, "INVALID_UNIFORM_VALUE",
				`Sampler uniform "${uniform.name}" requires an image input.`
			);
		}
	}
	return normalized;
}

/**
 * Set normalized custom uniforms on a program.
 *
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {Object} uniforms - Normalized uniform bindings
 * @param {Function} getTexture - Gets a WebGL texture for a sampler source
 * @returns {void}
 */
export function setCustomUniforms( gl, uniforms, getTexture ) {
	let textureUnit = 1;
	for( const binding of Object.values( uniforms ?? {} ) ) {
		const { info, value, sources } = binding;
		const loc = info.uniform.location;
		if( info.family === "sampler" ) {
			const units = [];
			for( const source of sources ) {
				gl.activeTexture( gl.TEXTURE0 + textureUnit );
				gl.bindTexture( gl.TEXTURE_2D, getTexture( source ) );
				units.push( textureUnit++ );
			}
			if( units.length === 1 ) {
				gl.uniform1i( loc, units[ 0 ] );
			} else {
				gl.uniform1iv( loc, new Int32Array( units ) );
			}
			continue;
		}
		if( info.setter.startsWith( "matrix" ) ) {
			gl[ `uniformMatrix${info.setter.slice( 6 )}` ]( loc, false, value );
		} else if( info.components === 1 && info.uniform.size === 1 ) {
			let method = "uniform1i";
			if( info.family === "float" ) {
				method = "uniform1f";
			} else if( info.family === "uint" ) {
				method = "uniform1ui";
			}
			gl[ method ]( loc, value[ 0 ] );
		} else {
			let suffix = "iv";
			if( info.family === "float" ) {
				suffix = "fv";
			} else if( info.family === "uint" ) {
				suffix = "uiv";
			}
			gl[ `uniform${info.components}${suffix}` ]( loc, value );
		}
	}
	gl.activeTexture( gl.TEXTURE0 );
}
