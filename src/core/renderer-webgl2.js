/**
 * Pi.js - WebGL2 Renderer Core Module
 * 
 * WebGL2 rendering with Framebuffer Object (FBO) for offscreen rendering
 * and automatic batch rendering system.
 * 
 * @module core/renderer-webgl2
 */

"use strict";

import * as g_screenManager from "./screen-manager";
import * as g_utils from "./utils";

// Batch systems
const m_batchProto = {
	"program": null,
	"vertices": null,
	"colors": null,
	"count": 0,
	"maxCount": 1000,

	// WebGL resources
	"vertexVBO": null,
	"colorVBO": null,

	// Cached shader locations
	"locations": null
};

// Point shader
const m_pointVertSrc = `
	attribute vec2 a_position;  // Screen coordinates (0,0 to width,height)
	attribute vec4 a_color;
	uniform vec2 u_resolution;  // Screen resolution
	varying vec4 v_color;
	
	void main() {
		// Convert screen coords to NDC with Y-flip in operation
		vec2 ndc = ((a_position / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);
		gl_Position = vec4(ndc, 0.0, 1.0);
		gl_PointSize = 1.0;
		v_color = a_color;
	}
`;

const m_pointFragSrc = `
	precision mediump float;
	varying vec4 v_color;
	
	void main() {
		gl_FragColor = v_color;
	}
`;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export function init() {
	g_screenManager.addScreenCleanupFunction( cleanup );
}

export function cleanup( screenData ) {

	const gl = screenData.gl;
	const pointBatch = screenData.pointBatch;

	// Cleanup batches
	if( pointBatch.vertexVBO ) {
		gl.deleteBuffer( pointBatch.vertexVBO );
		gl.deleteBuffer( pointBatch.colorVBO );
	}
	
	// Cleanup shaders and FBO
	if( screenData.FBO ) {
		gl.deleteFramebuffer( screenData.FBO );
		gl.deleteTexture( screenData.texture );
	}

	// TODO: Cleanup other batches
}


/***************************************************************************************************
 * WebGL Initialization
 **************************************************************************************************/


/**
 * Initialize WebGL2 context for a canvas
 * 
 * @param {Object} screenData - Screen Data Object
 * @returns {boolean} if successfull
 */
export function initWebGL( screenData ) {

	const canvas = screenData.canvas;
	const width = screenData.width;
	const height = screenData.height;
	
	// Try WebGL2 first
	screenData.gl = canvas.getContext( "webgl2", { 
		"alpha": true, 
		"premultipliedAlpha": false,
		"desynchronized": true,
		"colorType": "unorm8"
	} );
	
	if( !screenData.gl ) {

		// WebGL2 not available
		return false;
	}

	// Setup viewport
	screenData.gl.viewport( 0, 0, width, height );
	
	// Create texture and FBO
	if( !createTextureAndFBO( screenData ) ) {
		screenData.gl = null;
		return false;
	}
	
	// Setup batch buffers
	screenData.pointBatch = createBatchSystem( screenData, m_pointVertSrc, m_pointFragSrc );

	// Enable WebGL debugging extensions
	if( typeof window !== "undefined" && window.location.search.includes( "webgl-debug" ) ) {
		const debugExt = screenData.gl.getExtension( "WEBGL_debug_renderer_info" );
		if( debugExt ) {
			console.log( "GPU:", screenData.gl.getParameter( debugExt.UNMASKED_RENDERER_WEBGL ) );
		}
	}
	
	// Return successful
	return true;
}

/**
 * Create batch shader program and buffers
 * 
 * @param {Object} screenData - Global screen data object container
 * @param {string} vertSrc - Vertex shader program source code
 * @param {string} fragSrc - Fragment shader program source code
 * 
 * @returns {Object} The batch system object
 */
function createBatchSystem( screenData, vertSrc, fragSrc ) {

	const gl = screenData.gl;
	const batch = Object.create( m_batchProto );

	// Create the batch shader program
	batch.program = createShaderProgram( screenData, vertSrc, fragSrc );

	// Cache shader locations for efficiency
	batch.locations = {
		"position": gl.getAttribLocation( batch.program, "a_position" ),
		"color": gl.getAttribLocation( batch.program, "a_color" ),
		"resolution": gl.getUniformLocation( batch.program, "u_resolution" )
	};

	batch.vertices = new Float32Array( 1000 * 2 );
	batch.colors = new Uint8Array( 1000 * 4 );
	batch.vertexVBO = gl.createBuffer();
	batch.colorVBO = gl.createBuffer();

	// Create VAO (WebGL2 only)
	batch.vao = gl.createVertexArray();
	gl.bindVertexArray( batch.vao );

	// Setup position attibute
	gl.bindBuffer( gl.ARRAY_BUFFER, batch.vertexVBO );
	gl.enableVertexAttribArray( batch.locations.position );
	gl.vertexAttribPointer( batch.locations.position, 2, gl.FLOAT, false, 0, 0 );

	// Setup color attribute
	gl.bindBuffer( gl.ARRAY_BUFFER, batch.colorVBO );
	gl.enableVertexAttribArray( batch.locations.color );
	gl.vertexAttribPointer( batch.locations.color, 4, gl.UNSIGNED_BYTE, true, 0, 0 );
	
	gl.bindVertexArray( null );

	return batch;
}


/**
 * Create Framebuffer Object for offscreen rendering
 * 
 * @param {Object} screenData - Global screen data object container
 */
function createTextureAndFBO( screenData ) {

	const gl = screenData.gl;
	const width = screenData.width;
	const height = screenData.height;
	
	// Create texture
	screenData.texture = gl.createTexture();
	gl.bindTexture( gl.TEXTURE_2D, screenData.texture );
	gl.texImage2D( 
		gl.TEXTURE_2D, 0, gl.RGBA8, 
		width, height, 0, 
		gl.RGBA, gl.UNSIGNED_BYTE, null 
	);
	
	// Set texture parameters for pixel-perfect rendering
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
	
	// Create FBO
	screenData.FBO = gl.createFramebuffer();
	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
	
	// Attach texture to FBO
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
		gl.TEXTURE_2D, screenData.texture, 0 
	);
	
	// Make sure that framebuffer is complete
	const status = gl.checkFramebufferStatus( gl.FRAMEBUFFER );
	if( status !== gl.FRAMEBUFFER_COMPLETE ) {
		console.error( "Framebuffer incomplete:", status );
		return false;
	}

	// Unbind
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	gl.bindTexture( gl.TEXTURE_2D, null );

	return true;
}


/**
 * Create a shader program from vertex and fragment sources
 * 
 * @param {string} vertexSource - Vertex shader source
 * @param {string} fragmentSource - Fragment shader source
 * @returns {WebGLProgram|null} Shader program or null on error
 */
function createShaderProgram( screenData, vertexSource, fragmentSource ) {
	const gl = screenData.gl;

	const vertexShader = compileShader( screenData, gl.VERTEX_SHADER, vertexSource );
	const fragmentShader = compileShader( screenData, gl.FRAGMENT_SHADER, fragmentSource );
	
	if( !vertexShader || !fragmentShader ) {
		return null;
	}
	
	const program = gl.createProgram();
	gl.attachShader( program, vertexShader );
	gl.attachShader( program, fragmentShader );
	gl.linkProgram( program );
	
	if( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
		console.error( "Shader program error:", gl.getProgramInfoLog( program ) );
		gl.deleteProgram( program );
		return null;
	}
	
	return program;
}


/**
 * Compile a single shader
 * 
 * @param {number} type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
 * @param {string} source - Shader source code
 * @returns {WebGLShader|null} Compiled shader or null on error
 */
function compileShader( screenData, type, source ) {

	const gl = screenData.gl;

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
 * Ensure batch has enough capacity
 * 
 * @param {Object} batch - Batch system object
 * @param {string} requiredCount - Number of potential batch operations supported
 */
function ensureBatchCapacity( batch, requiredCount ) {
	if( requiredCount > batch.maxCount ) {
		const newCapacity = Math.max( requiredCount, batch.maxCount * 2 );
		
		// Resize arrays
		const newVertices = new Float32Array( newCapacity * 2 );
		const newColors = new Float32Array( newCapacity * 4 );
		
		// Copy existing data
		newVertices.set( batch.vertices );
		newColors.set( batch.colors );
		
		// Update batch
		batch.vertices = newVertices;
		batch.colors = newColors;
		batch.maxCount = newCapacity;
	}
}


/**
 * Sets the image dirty / Queue automatic render
 * @param {Object} screenData - Global screen data object container
 */
export function setImageDirty( screenData ) {
	if( !screenData.isRenderScheduled ) {
		screenData.isRenderScheduled = true;
		g_utils.queueMicrotask( () => {
			flushBatches( screenData );
			displayToCanvas( screenData );
			screenData.isRenderScheduled = false;
		} );
	}
}


/***************************************************************************************************
 * Batch Operations
 **************************************************************************************************/


/**
 * Fast path for direct pixel writes (no bounds check, no blending)
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color object includes r/g/b/a components (0-255)
 */
export function drawPixelUnsafe( screenData, x, y, color ) {
	
	// Add directly to point batch
	const pointBatch = screenData.pointBatch;

	// Make sure batch can handle the new capacity
	// TODO: Something to watch out for a per pixel check - maybe we could check before calling
	// like for a line command we could count the length of the line and ensure batch capacity
	// before drawing the individual pixels. But should test before implementing to see if its
	// needed
	ensureBatchCapacity( pointBatch, pointBatch.count + 1 );

	const idx = pointBatch.count * 2;
	const cidx = pointBatch.count * 4;
	
	pointBatch.vertices[ idx ] = x;
	pointBatch.vertices[ idx + 1 ] = y;
	pointBatch.colors[ cidx ] = color.r;
	pointBatch.colors[ cidx + 1 ] = color.g;
	pointBatch.colors[ cidx + 2 ] = color.b;
	pointBatch.colors[ cidx + 3 ] = color.a;
	
	pointBatch.count++;
	
	setImageDirty( screenData );
}


/**
 * Fast path with bounds checking
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} color - Color object includes r/g/b/a components (0-255)
 */
export function drawPixelDirect( screenData, x, y, color ) {
	if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
		return;
	}
	drawPixelUnsafe( screenData, x, y, color );
}


/**
 * Flush all batches to FBO
 * 
 * @param {Object} screenData - Screen data object
 */
function flushBatches( screenData ) {
	
	const gl = screenData.gl;
	const pointBatch = screenData.pointBatch;

	if( pointBatch.count === 0 ) {
		return;
	}

	// Bind FBO
	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
	
	// Set viewport
	gl.viewport( 0, 0, screenData.width, screenData.height );
	
	// This is supposed to be the "video memory" so we are not clearing the back buffer
	// Clear to black/transparent
	// gl.clearColor( 0, 0, 0, 0 );
	// gl.clear( gl.COLOR_BUFFER_BIT );
	
	// Render point batch if it has data
	gl.useProgram( pointBatch.program );
	
	// Set screen resolution
	gl.uniform2f( pointBatch.locations.resolution, screenData.width, screenData.height );

	// Bind VAO - all attributes already configured!
	gl.bindVertexArray( pointBatch.vao );
	
	// Set positions -- only copy buffer data used (subarray)
	gl.bindBuffer( gl.ARRAY_BUFFER, pointBatch.vertexVBO );
	gl.bufferData(
		gl.ARRAY_BUFFER, pointBatch.vertices.subarray( 0, pointBatch.count * 2 ), gl.STREAM_DRAW
	);

	// Set colors
	gl.bindBuffer( gl.ARRAY_BUFFER, pointBatch.colorVBO );
	gl.bufferData(
		gl.ARRAY_BUFFER, pointBatch.colors.subarray( 0, pointBatch.count * 4 ), gl.STREAM_DRAW
	);

	// Set Enable blending based on the blend mode
	if( screenData.blendData.isAlpha ) {
		gl.enable( gl.BLEND );
		gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

		// Draw points
		gl.drawArrays( gl.POINTS, 0, pointBatch.count );

		gl.disable( gl.BLEND );
	} else {

		// Draw points
		gl.drawArrays( gl.POINTS, 0, pointBatch.count );
	}
	
	// Reset batch count
	pointBatch.count = 0;

	// Unbind VAO
	gl.bindVertexArray( null );

	// Unbind FBO
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );

	// TODO: batch size never shrinks - could waste memory
	// Should check recent batch sizes and shrink if too large - make sure to keep minimum
	// Better to do it here than per pixel
}


/**
 * Display FBO texture to visible canvas
 * 
 * @param {Object} screenData - Screen data object
 */
function displayToCanvas( screenData ) {
	
	// TODO: Implement display to canvas
	// For now, this is a placeholder
	// Will implement fullscreen quad rendering later
}
