/**
 * Pi.js - WebGL2 Renderer Core Module
 * 
 * WebGL2 rendering with Framebuffer Object (FBO) for offscreen rendering
 * and automatic batch rendering system.
 * 
 * @module core/renderer-webgl2
 */

"use strict";

// Import modules directly
import * as g_pens from "./pens.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_utils from "../core/utils.js";
import m_pointVertSrc from "./shaders/point.vert";
import m_pointFragSrc from "./shaders/point.frag";
import m_displayVertSrc from "./shaders/display.vert";
import m_displayFragSrc from "./shaders/display.frag";

const MAX_BATCH_SIZE = 1_000_000;

// TODO: Need to keep an eye on memory usage and memory caps. Maybe make max_batch_size a variable
// maybe let user update max batch sizes.  Need to handle out of memory issues or prevent them
// from happening.  Needs research.


// Batch systems
const m_batchProto = {
	"program": null,
	"vertices": null,
	"colors": null,
	"count": 0,
	"capacity": 1000,
	"capacityChanged": true,

	// WebGL resources
	"vertexVBO": null,
	"colorVBO": null,

	// Cached shader locations
	"locations": null
};

// Shaders are imported from external files via esbuild text loader

let m_isWebgl2Capable = false;

/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export { m_isWebgl2Capable as isWebgl2Capable };

export function init( api ) {
	g_screenManager.addScreenDataItem( "contextLost", false );
	g_screenManager.addScreenDataItem( "isRenderScheduled", false );
	g_screenManager.addScreenDataItem( "isFirstRender", true );
	g_screenManager.addScreenCleanupFunction( cleanup );

	m_isWebgl2Capable = testWebGL2Capability();
}

export function cleanup( screenData ) {

	const gl = screenData.gl;
	const pointBatch = screenData.pointBatch;

	// Cleanup batches
	if( pointBatch.vertexVBO ) {
		gl.deleteBuffer( pointBatch.vertexVBO );
		gl.deleteBuffer( pointBatch.colorVBO );
		gl.deleteVertexArray( pointBatch.vao );
		gl.deleteProgram( pointBatch.program );
	}
	
	// Cleanup display shader
	if( screenData.displayProgram ) {
		gl.deleteProgram( screenData.displayProgram );
		gl.deleteBuffer( screenData.displayPositionBuffer );
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
 * Test if WebGL2 is available and working properly
 * 
 * @returns {boolean} True if WebGL2 is available and functional
 */
function testWebGL2Capability() {
	
	// Create a temporary offscreen canvas for testing
	const testCanvas = document.createElement( "canvas" );
	testCanvas.width = 1;
	testCanvas.height = 1;
	
	// Create a minimal screen data object for testing
	const testScreenData = {
		"canvas": testCanvas,
		"width": 1,
		"height": 1
	};
	
	// Use the existing initWebGL function to test capability
	const result = initWebGL( testScreenData );
	
	// Cleanup test resources if WebGL2 was initialized
	if( result && testScreenData.gl ) {
		cleanup( testScreenData );
	}
	
	return result;
}

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
		"premultipliedAlpha": true,
		"antialias": false,
		"preserveDrawingBuffer": true,
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
	
	// Setup display shader
	setupDisplayShader( screenData );

	// Enable WebGL debugging extensions
	if( typeof window !== "undefined" && window.location.search.includes( "webgl-debug" ) ) {
		const debugExt = screenData.gl.getExtension( "WEBGL_debug_renderer_info" );
		if( debugExt ) {
			console.log( "GPU:", screenData.gl.getParameter( debugExt.UNMASKED_RENDERER_WEBGL ) );
		}
	}
	
	// Track if webglcontext gets lost
	screenData.canvas.addEventListener( "webglcontextlost", ( e ) => {
		e.preventDefault();
		console.warn( "WebGL context lost" );
		screenData.contextLost = true;
	} );
	
	// Reinit canvas when webglcontext gets restored
	screenData.canvas.addEventListener( "webglcontextrestored", () => {
		console.log( "WebGL context restored" );

		// TODO: Screen gets lost but maybe we can restore it from the FBO?

		// Reinitialize WebGL resources
		initWebGL( screenData );
		screenData.contextLost = false;

		// Reset blend mode
		blendModeChanged( screenData );
	} );

	// Return successful
	return true;
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
	if( !screenData.texture ) {
		console.error( "Failed to create WebGL2 texture." );
		return false;
	}

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
		console.error( "WebGL2 Framebuffer incomplete:", status );
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
		const errLog =  gl.getProgramInfoLog( program );
		gl.deleteProgram( program );
		const error = new Error( `screen: Shader program error:, ${errLog}.` );
		error.code = "SHADER_PROGRAM_ERROR";
		throw error;
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
 * Setup display shader for rendering FBO to screen
 * 
 * @param {Object} screenData - Screen data object
 */
function setupDisplayShader( screenData ) {
	
	const gl = screenData.gl;
	
	// Create shader program
	const program = createShaderProgram( screenData, m_displayVertSrc, m_displayFragSrc );
	
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


/***************************************************************************************************
 * Render Management
 **************************************************************************************************/


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

export function cls( screenData, x, y, width, height ) {
	
	// TODO: Implement clear screen command
}

export function blendModeChanged( screenData ) {

	// Flush existing batch with old blend mode
	flushBatches( screenData );
	displayToCanvas( screenData );

	const gl = screenData.gl;
	if( screenData.blendData.blend === g_pens.BLEND_REPLACE ) {
		gl.disable( gl.BLEND );
	} else {
		
		// TODO: Actually figure out how to do proper blending - support more blending modes
		// https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc
		gl.enable( gl.BLEND );
		gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
	}
}


/***************************************************************************************************
 * Batch Operations
 **************************************************************************************************/


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

	batch.vertices = new Float32Array( batch.capacity * 2 );
	batch.colors = new Uint8Array( batch.capacity * 4 );
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
 * Ensure batch has enough capacity
 * 
 * @param {Object} batch - Batch system object
 * @param {string} newItemCount - Number of new items that will be added
 */
export function ensureBatchCapacity( screenData, batch, newItemCount ) {

	const requiredCount = batch.count + newItemCount;
	if( requiredCount >= batch.capacity ) {

		// Make sure we don't exceed max batch size
		if( requiredCount > MAX_BATCH_SIZE ) {
			flushBatches( screenData );
			displayToCanvas( screenData );
		}

		// Get new capacity
		const newCapacity = Math.max( requiredCount, batch.capacity * 2 );
		
		// Resize arrays
		const newVertices = new Float32Array( newCapacity * 2 );
		const newColors = new Uint8Array( newCapacity * 4 );
		
		// Copy existing data
		newVertices.set( batch.vertices );
		newColors.set( batch.colors );
		
		// Update batch
		batch.vertices = newVertices;
		batch.colors = newColors;
		batch.capacity = newCapacity;
		batch.capacityChanged = true;
	}

	return true;
}

/**
 * Flush all batches to FBO
 * 
 * @param {Object} screenData - Screen data object
 */
function flushBatches( screenData ) {
	
	const gl = screenData.gl;

	if( screenData.contextLost ) {

		// TODO: Maybe add warning here?
		// console.warn( "WebGL context lost unable to render screen." );
		return;
	}

	const pointBatch = screenData.pointBatch;

	// Bind FBO
	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
	
	// Set viewport
	gl.viewport( 0, 0, screenData.width, screenData.height );
	
	// Clear FBO on first render only
	if( screenData.isFirstRender ) {
		gl.clearColor( 0, 0, 0, 0 );
		gl.clear( gl.COLOR_BUFFER_BIT );
		screenData.isFirstRender = false;
		//console.log( "WebGL2: Cleared FBO on first render" );
	}
	
	// Render point batch if it has data
	gl.useProgram( pointBatch.program );
	
	// Set screen resolution
	gl.uniform2f( pointBatch.locations.resolution, screenData.width, screenData.height );

	// Bind VAO - all attributes already configured!
	gl.bindVertexArray( pointBatch.vao );
	
	// TODO: Make sure this is optimized recieved different advice on how to copy buffer data
	// efficiently so need to resarch STREAM_DRAW to make sure it's efficient for streaming
	// to a persistant texture that acts as "screen memory".
	// on first use or resize
	if( pointBatch.capacityChanged ) {

		// Allocate position vertices
		gl.bindBuffer( gl.ARRAY_BUFFER, pointBatch.vertexVBO );
		gl.bufferData( gl.ARRAY_BUFFER, pointBatch.vertices.byteLength, gl.STREAM_DRAW );
		
		// Allocate color vertices
		gl.bindBuffer( gl.ARRAY_BUFFER, pointBatch.colorVBO );
		gl.bufferData( gl.ARRAY_BUFFER, pointBatch.colors.byteLength, gl.STREAM_DRAW );

		// Reset capacity changed flag
		pointBatch.capacityChanged = false;
	}

	// Set positions
	gl.bindBuffer( gl.ARRAY_BUFFER, pointBatch.vertexVBO );
	gl.bufferSubData( gl.ARRAY_BUFFER, 0, pointBatch.vertices.subarray( 0, pointBatch.count * 2 ) );

	// Set colors
	gl.bindBuffer( gl.ARRAY_BUFFER, pointBatch.colorVBO );
	gl.bufferSubData( gl.ARRAY_BUFFER, 0, pointBatch.colors.subarray( 0, pointBatch.count * 4 ) );

	// Draw points
	gl.drawArrays( gl.POINTS, 0, pointBatch.count );
	
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
	
	const gl = screenData.gl;
	const program = screenData.displayProgram;
	const locations = screenData.displayLocations;

	// Bind default framebuffer (screen)
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	
	// Set viewport to full canvas
	gl.viewport( 0, 0, screenData.canvas.width, screenData.canvas.height );
	
	// Clear the canvas before drawing the FBO texture
	gl.clearColor( 0, 0, 0, 0 );
	gl.clear( gl.COLOR_BUFFER_BIT );
	
	// Disable blend for render to display
	gl.disable( gl.BLEND );

	// Use display shader
	gl.useProgram( program );
	
	// Enable position attribute
	gl.enableVertexAttribArray( locations.position );
	
	// Bind position buffer
	gl.bindBuffer( gl.ARRAY_BUFFER, screenData.displayPositionBuffer );
	gl.vertexAttribPointer( locations.position, 2, gl.FLOAT, false, 0, 0 );
	
	// Bind FBO texture
	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, screenData.texture );
	gl.uniform1i( locations.texture, 0 );
	
	// Draw fullscreen quad
	gl.drawArrays( gl.TRIANGLES, 0, 6 );
	
	// Cleanup
	gl.disableVertexAttribArray( locations.position );
}


/***************************************************************************************************
 * Drawing Operations
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
	const idx = pointBatch.count * 2;
	const cidx = pointBatch.count * 4;
	
	pointBatch.vertices[ idx     ] = x;
	pointBatch.vertices[ idx + 1 ] = y;
	pointBatch.colors[ cidx     ] = color.r;
	pointBatch.colors[ cidx + 1 ] = color.g;
	pointBatch.colors[ cidx + 2 ] = color.b;
	pointBatch.colors[ cidx + 3 ] = color.a;
	
	pointBatch.count++;
	
	// Debug logging
	// if( pointBatch.count <= 10 ) {
	// 	console.log( `WebGL2: Added pixel ${pointBatch.count} at (${x}, ${y}) color:`, color );
	// }
	
	// TODO: Remove per pixel check, should be done after draw but in actual graphics commands like
	// after the line draw is complete
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
