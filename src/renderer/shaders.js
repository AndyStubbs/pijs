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
 * @returns {WebGLProgram|null} Linked program or null on error
 */
export function createShaderProgram( gl, vertexSrc, fragSrc ) {
	const vertexShader = compileShader( gl, gl.VERTEX_SHADER, vertexSrc );
	const fragmentShader = compileShader( gl, gl.FRAGMENT_SHADER, fragSrc );
	
	if( !vertexShader || !fragmentShader ) {
		const error = new Error( "screen: Unable to compile shaders." );
		error.code = "INVALID_SHADERS";
		throw error;
	}
	
	const program = gl.createProgram();
	gl.attachShader( program, vertexShader );
	gl.attachShader( program, fragmentShader );
	gl.linkProgram( program );

	// Cleanup shader programs
	gl.deleteShader( vertexShader );
	gl.deleteShader( fragmentShader );
	
	if( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
		const errLog = gl.getProgramInfoLog( program );
		gl.deleteProgram( program );
		const error = new Error( `screen: Shader program error:, ${errLog}.` );
		error.code = "SHADER_PROGRAM_ERROR";
		throw error;
	}
	
	return program;
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
 * @returns {{ program: WebGLProgram, locations: Object }} Program and cached locations
 */
export function getOrCreateCustomShaderProgram( screenData, handle ) {
	const gl = screenData.gl;
	let cache = screenData.customShaders[ handle.id ];
	if( cache ) {
		return cache;
	}
	const program = createShaderProgram( gl, m_displayVertSrc, handle.fragmentSource );
	const positionLoc = gl.getAttribLocation( program, "a_position" );
	const textureLoc = gl.getUniformLocation( program, "u_texture" );
	const sourceSizeLoc = gl.getUniformLocation( program, "u_sourceSize" );
	const outputSizeLoc = gl.getUniformLocation( program, "u_outputSize" );
	const timeLoc = gl.getUniformLocation( program, "u_time" );
	const frameLoc = gl.getUniformLocation( program, "u_frame" );
	cache = {
		program,
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

const m_isDebug = typeof window !== "undefined" && window.location.search.includes( "webgl-debug" );

/**
 * Set custom uniforms on a program from a name->value map.
 * Ignores unknown uniforms; in debug mode warns for unknown or unsupported shapes.
 *
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {WebGLProgram} program - Shader program
 * @param {Object} uniforms - Map of uniform name to value (number, [x,y], [x,y,z], [x,y,z,w])
 * @returns {void}
 */
export function setCustomUniforms( gl, program, uniforms ) {
	if( !uniforms || typeof uniforms !== "object" ) {
		return;
	}
	for( const name of Object.keys( uniforms ) ) {
		const value = uniforms[ name ];
		const loc = gl.getUniformLocation( program, name );
		if( loc === null ) {
			if( m_isDebug ) {
				console.warn( `applyShader: Unknown uniform "${name}" ignored.` );
			}
			continue;
		}
		if( typeof value === "number" ) {
			gl.uniform1f( loc, value );
		} else if( Array.isArray( value ) ) {
			if( value.length === 2 ) {
				gl.uniform2f( loc, value[ 0 ], value[ 1 ] );
			} else if( value.length === 3 ) {
				gl.uniform3f( loc, value[ 0 ], value[ 1 ], value[ 2 ] );
			} else if( value.length === 4 ) {
				gl.uniform4f( loc, value[ 0 ], value[ 1 ], value[ 2 ], value[ 3 ] );
			} else if( m_isDebug ) {
				console.warn(
					`applyShader: Unsupported uniform "${name}" array length ${value.length}, ` +
					`ignored.`
				);
			}
		} else if( m_isDebug ) {
			console.warn( `applyShader: Unsupported uniform "${name}" type, ignored.` );
		}
	}
}
