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
	
	// Store in screen data
	screenData.displayProgram = program;
	screenData.displayPositionBuffer = positionBuffer;
	screenData.displayLocations = {
		"position": positionLoc,
		"texture": textureLoc
	};
}

