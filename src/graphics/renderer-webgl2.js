/**
 * Pi.js - WebGL2 Renderer Core Module
 * 
 * WebGL2 rendering with Framebuffer Object (FBO) for offscreen rendering
 * and automatic batch rendering system.
 * 
 * @module graphics/renderer-webgl2
 */

"use strict";

// Import modules directly
import * as g_pens from "./pens.js";
import * as g_screenManager from "../core/screen-manager.js";
import * as g_utils from "../core/utils.js";

// Shaders are imported from external files via esbuild text loader
import m_pointVertSrc from "./shaders/point.vert";
import m_pointFragSrc from "./shaders/point.frag";
import m_imageVertSrc from "./shaders/image.vert";
import m_imageFragSrc from "./shaders/image.frag";
import m_displayVertSrc from "./shaders/display.vert";
import m_displayFragSrc from "./shaders/display.frag";

const MAX_POINT_BATCH_SIZE = 1_000_000;
const DEFAULT_POINT_BATCH_SIZE = 5000;
const MAX_IMAGE_BATCH_SIZE = 10_000;
const DEFAULT_IMAGE_BATCH_SIZE = 50;
const BATCH_CAPACITY_SHRINK_INTERVAL = 5000;

// TODO: Need to keep an eye on memory usage and memory caps. Maybe make max_batch_size a variable
// maybe let user update max batch sizes.  Need to handle out of memory issues or prevent them
// from happening.  Needs research.


// Batch systems
export const POINTS_BATCH = 0;
export const IMAGE_BATCH = 1;

// String constants to identify batch system names
const BATCH_TYPES = [ "POINTS", "IMAGE" ];

const m_batchProto = {
	
	// Type of batch POINTS_BATCH, IMAGE_BATCH, etc...
	"type": null,

	"program": null,
	"vertices": null,
	"colors": null,
	"count": 0,

	// Capacity
	"minCapacity": 0,
	"capacity": 0,
	"capacityChanged": true,
	"capacityLocalMax": 0,
	"capacityShrinkCheckTime": 0,

	// Components
	"vertexComps": 2,
	"colorComps": 4,
	"texCoordComps": 2,

	// WebGL resources
	"vertexVBO": null,
	"colorVBO": null,
	"texCoordVBO": null,
	"vao": null,

	// Image Specific items
	"texture": null,
	"image": null,

	// Drawing mode, e.g., gl.POINTS or gl.TRIANGLES
	"mode": null,

	// Cached shader locations
	"locations": null
};

let m_isWebgl2Capable = false;


/***************************************************************************************************
 * Module Commands
 **************************************************************************************************/


export { m_isWebgl2Capable as isWebgl2Capable };

export function init() {
	g_screenManager.addScreenCleanupFunction( cleanup );
	m_isWebgl2Capable = testWebGL2Capability();
}

export function cleanup( screenData ) {

	if( screenData.renderMode === g_screenManager.CANVAS2D_RENDER_MODE ) {
		return;
	}

	const gl = screenData.gl;

	// Cleanup batches
	for( const batchType in screenData.batches ) {

		// Get the batch
		const batch = screenData.batches[ batchType ];

		// Delete texCoord items
		if( batch.texCoordVBO ) {
			gl.deleteBuffer( batch.texCoordVBO );
		}

		gl.deleteBuffer( batch.vertexVBO );
		gl.deleteBuffer( batch.colorVBO );
		gl.deleteVertexArray( batch.vao );
		gl.deleteProgram( batch.program );

		if( batch.texture ) {
			gl.deleteTexture( batch.texture );
		}
	}

	// Clear batches array
	screenData.batches = {};
	screenData.batchInfo = {};
	
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

	// Setup initial screen data items
	screenData.contextLost = false;
	screenData.isRenderScheduled = false;
	screenData.isFirstRender = true;
	screenData.batches = {};
	screenData.batchInfo = {
		"currentBatch": null,
		"drawOrder": []
	};

	const canvas = screenData.canvas;
	const width = screenData.width;
	const height = screenData.height;
	
	// Try WebGL2 first
	screenData.gl = canvas.getContext( "webgl2", { 
		"alpha": true, 
		"premultipliedAlpha": false,
		"antialias": false,
		"preserveDrawingBuffer": true,
		"desynchronized": false,
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
	
	// Create the point batch
	screenData.batches[ POINTS_BATCH ] = createBatchSystem( 
		screenData, m_pointVertSrc, m_pointFragSrc, POINTS_BATCH 
	);

	// Create the images batch
	screenData.batches[ IMAGE_BATCH ] = createBatchSystem( 
		screenData, m_imageVertSrc, m_imageFragSrc, IMAGE_BATCH 
	);
	
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

export function blendModeChanged( screenData, previousBlend ) {

	// Flush existing batch with old blend mode
	flushBatches( screenData, previousBlend );
	displayToCanvas( screenData );

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
 * @param {number} type - Index number indicating type IE POINTS_BATCH, IMAGE_BATCH, etc.
 * 
 * @returns {Object} The batch system object
 */
function createBatchSystem( screenData, vertSrc, fragSrc, type ) {
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

	// Setup batch type and capacity
	batch.type = type;
	if( batch.type === POINTS_BATCH ) {
		batch.capacity = DEFAULT_POINT_BATCH_SIZE;
		batch.minCapacity = DEFAULT_POINT_BATCH_SIZE;
		batch.maxCapacity = MAX_POINT_BATCH_SIZE;
		batch.mode = gl.POINTS;
	} else if( batch.type === IMAGE_BATCH ) {
		batch.capacity = DEFAULT_IMAGE_BATCH_SIZE;
		batch.minCapacity = DEFAULT_IMAGE_BATCH_SIZE;
		batch.maxCapacity = MAX_IMAGE_BATCH_SIZE;
		batch.mode = gl.TRIANGLES;

		// Image-specific shader locations
		batch.locations.texCoord = gl.getAttribLocation( batch.program, "a_texCoord" );
		batch.locations.texture = gl.getUniformLocation( batch.program, "u_texture" );

		// Image-specific data array
		batch.texCoords = new Float32Array( batch.capacity * batch.texCoordComps );

		// Image-specific VBO
		batch.texCoordVBO = gl.createBuffer();

		// Setup texCoord attribute
		gl.bindBuffer( gl.ARRAY_BUFFER, batch.texCoordVBO );
		gl.enableVertexAttribArray( batch.locations.texCoord );
		gl.vertexAttribPointer(
			batch.locations.texCoord, batch.texCoordComps, gl.FLOAT, false, 0, 0
		);
	} else {
		throw new Error( "Invalid batch type." );
	}

	// These are created for all batches
	batch.vertices = new Float32Array( batch.capacity * batch.vertexComps );
	batch.colors = new Uint8Array( batch.capacity * batch.colorComps );
	batch.vertexVBO = gl.createBuffer();
	batch.colorVBO = gl.createBuffer();

	// Create VAO (WebGL2 only)
	batch.vao = gl.createVertexArray();
	gl.bindVertexArray( batch.vao );

	// Setup position attibute
	gl.bindBuffer( gl.ARRAY_BUFFER, batch.vertexVBO );
	gl.enableVertexAttribArray( batch.locations.position );
	gl.vertexAttribPointer(
		batch.locations.position, batch.vertexComps, gl.FLOAT, false, 0, 0
	);

	// Setup color attribute
	gl.bindBuffer( gl.ARRAY_BUFFER, batch.colorVBO );
	gl.enableVertexAttribArray( batch.locations.color );
	gl.vertexAttribPointer(
		batch.locations.color, batch.colorComps, gl.UNSIGNED_BYTE, true, 0, 0
	);
	
	gl.bindVertexArray( null );

	// Set the next shrink check time
	batch.capacityShrinkCheckTime = Date.now() + BATCH_CAPACITY_SHRINK_INTERVAL;

	return batch;
}

/**
 * Prepare batch and make sure has enough capacity
 * 
 * @param {number} batchType - Batch batch type identifier
 * @param {string} newItemCount - Number of new items that will be added
 */
export function prepareBatch( screenData, batchType, newItemCount ) {

	// Get the batch
	const batch = screenData.batches[ batchType ];

	// Track if the batch type is changing
	const batchInfo = screenData.batchInfo;
	if( batchInfo.currentBatch !== batch ) {
		
		// Set the end index for the last drawOrderItem to it's current count
		if( batchInfo.drawOrder.length > 0 ) {
			const lastDrawOrderItem = batchInfo.drawOrder[ batchInfo.drawOrder.length - 1 ];
			lastDrawOrderItem.endIndex = lastDrawOrderItem.batch.count;
		}

		// Add the new batch to the drawOrder array
		batchInfo.drawOrder.push( { batch, "startIndex": batch.count, "endIndex": null } );
		batchInfo.currentBatch = batch;
	}

	// Check if need to increase
	const requiredCount = batch.count + newItemCount;
	if( requiredCount >= batch.capacity ) {

		// Make sure we don't exceed max batch size
		if( requiredCount > batch.maxCapacity ) {
			flushBatches( screenData );
			return prepareBatch( screenData, batchType, newItemCount );
		}

		// Resize to new capacity by doubling current capacity
		const newCapacity = Math.max( requiredCount, batch.capacity * 2 );
		resizeBatch( batch, newCapacity );
	}

	return true;
}

function resizeBatch( batch, newCapacity ) {

	// Resize arrays
	const newVertices = new Float32Array( newCapacity * batch.vertexComps );
	const newColors = new Uint8Array( newCapacity * batch.colorComps );
	
	// Copy existing data
	newVertices.set( batch.vertices );
	batch.vertices = newVertices;
	newColors.set( batch.colors );
	batch.colors = newColors;
	
	if( batch.type === IMAGE_BATCH ) {
		const newTexCoords = new Float32Array( newCapacity * batch.texCoordComps );
		newTexCoords.set( batch.texCoords );
		batch.texCoords = newTexCoords;
	}

	console.log(
		`Batch ${BATCH_TYPES[ batch.type]} resized from ${batch.capacity} to ${newCapacity}`
	);

	// Update batch
	batch.capacity = newCapacity;
	batch.capacityChanged = true;

	// Set the time capacity last changed
	batch.capacityShrinkCheckTime = Date.now() + BATCH_CAPACITY_SHRINK_INTERVAL;
}


/**
 * Flush all batches to FBO
 * 
 * @param {Object} screenData - Screen data object
 */
function flushBatches( screenData, blend = null ) {
	if( blend === null ) {
		blend = screenData.blends.blend;
	}
	
	const gl = screenData.gl;

	if( screenData.contextLost ) {

		// TODO: Maybe add warning here?
		// console.warn( "WebGL context lost unable to render screen." );
		return;
	}

	// Bind FBO
	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
	
	// Set viewport
	gl.viewport( 0, 0, screenData.width, screenData.height );
	
	// Clear FBO on first render only
	if( screenData.isFirstRender ) {
		gl.clearColor( 0, 0, 0, 0 );
		gl.clear( gl.COLOR_BUFFER_BIT );
		screenData.isFirstRender = false;
	}

	// Update the blend mode
	if( blend === g_pens.BLEND_REPLACE ) {
		gl.disable( gl.BLEND );
	} else {
		gl.enable( gl.BLEND );
		gl.blendFuncSeparate(
			gl.SRC_ALPHA,           // srcRGBFactor
			gl.ONE_MINUS_SRC_ALPHA, // dstRGBFactor
			gl.ONE,                 // srcAlphaFactor  <--- Make src alpha factor 1.0 (no scaling)
			gl.ONE_MINUS_SRC_ALPHA  // dstAlphaFactor  <--- Make dst alpha factor (1-src.a)
		);
	}

	// Upload batch buffers
	for( const batchType in screenData.batches ) {
		const batch = screenData.batches[ batchType ];
		if( batch.count > 0 ) {
			uploadBatch( gl, batch, screenData.width, screenData.height );
		}
	}

	// Draw items
	for( const drawOrderItem of screenData.batchInfo.drawOrder ) {
		if( drawOrderItem.endIndex === null ) {
			drawOrderItem.endIndex = drawOrderItem.batch.count;
		}

		// Only draw the batch if there is something to draw
		if( drawOrderItem.endIndex - drawOrderItem.startIndex > 0 ) {
			drawBatch( gl, drawOrderItem.batch, drawOrderItem.startIndex, drawOrderItem.endIndex );
		}
	}

	// Reset Batches
	for( const batchType in screenData.batches ) {
		const batch = screenData.batches[ batchType ];
		resetBatch( batch );
	}

	// Reset drawOrder object
	screenData.batchInfo.drawOrder = [];
	screenData.batchInfo.currentBatch = null;

	// Unbind VAO
	gl.bindVertexArray( null );

	// Unbind FBO
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );

}

function uploadBatch( gl, batch, width, height ) {
	gl.useProgram( batch.program );
	gl.uniform2f( batch.locations.resolution, width, height );
	gl.bindVertexArray( batch.vao );
	
	// Allocate or resize buffers on capacity change
	if( batch.capacityChanged ) {
		gl.bindBuffer( gl.ARRAY_BUFFER, batch.vertexVBO );
		gl.bufferData( gl.ARRAY_BUFFER, batch.vertices.byteLength, gl.STREAM_DRAW );
		gl.bindBuffer( gl.ARRAY_BUFFER, batch.colorVBO );
		gl.bufferData( gl.ARRAY_BUFFER, batch.colors.byteLength, gl.STREAM_DRAW );

		if( batch.type === IMAGE_BATCH ) {
			gl.bindBuffer( gl.ARRAY_BUFFER, batch.texCoordVBO );
			gl.bufferData( gl.ARRAY_BUFFER, batch.texCoords.byteLength, gl.STREAM_DRAW );
		}

		batch.capacityChanged = false;
	}

	// Upload positions
	gl.bindBuffer( gl.ARRAY_BUFFER, batch.vertexVBO );
	gl.bufferSubData( 
		gl.ARRAY_BUFFER, 0, batch.vertices.subarray( 0, batch.count * batch.vertexComps )
	);
	
	// Upload colors
	gl.bindBuffer( gl.ARRAY_BUFFER, batch.colorVBO );
	gl.bufferSubData(
		gl.ARRAY_BUFFER, 0, batch.colors.subarray( 0, batch.count * batch.colorComps )
	);

	// Upload texture coordinates
	if( batch.type === IMAGE_BATCH ) {
		gl.bindBuffer( gl.ARRAY_BUFFER, batch.texCoordVBO );
		gl.bufferSubData(
			gl.ARRAY_BUFFER, 0, batch.texCoords.subarray( 0, batch.count * batch.texCoordComps )
		);
	}
}

function drawBatch( gl, batch, startIndex, endIndex ) {
	gl.useProgram( batch.program );
	gl.bindVertexArray( batch.vao );

	// Draw points
	gl.drawArrays( batch.mode, startIndex, endIndex );
}

function resetBatch( batch ) {

	// Update the batch local max
	batch.capacityLocalMax = Math.max( batch.count, batch.capacityLocalMax );

	// Reset batch count
	batch.count = 0;

	if( batch.type === IMAGE_BATCH ) {
		batch.image = null;
	}

	// Check if should shrink capacity
	if( Date.now() > batch.capacityShrinkCheckTime ) {

		// This will resize the batch slowly over time - cutting in half every 5 seconds
		if( batch.capacity > batch.minCapacity && batch.capacityLocalMax < batch.capacity * 0.5 ) {

			// Resize the batch
			resizeBatch( batch, Math.max( batch.capacity * 0.5, batch.minCapacity ) );
		}

		batch.capacityShrinkCheckTime = Date.now() + BATCH_CAPACITY_SHRINK_INTERVAL;
		batch.capacityLocalMax = 0;
	}
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
	const batch = screenData.batches[ POINTS_BATCH ];
	const idx = batch.count * batch.vertexComps;
	const cidx = batch.count * batch.colorComps;
	
	batch.vertices[ idx     ] = x;
	batch.vertices[ idx + 1 ] = y;
	batch.colors[ cidx     ] = color.r;
	batch.colors[ cidx + 1 ] = color.g;
	batch.colors[ cidx + 2 ] = color.b;
	batch.colors[ cidx + 3 ] = color.a;

	batch.count++;
}


/***************************************************************************************************
 * Readback Operations
 **************************************************************************************************/

export function readPixel( screenData, x, y ) {

	// Ensure latest contents are in the FBO
	flushBatches( screenData );

	const gl = screenData.gl;
	const screenWidth = screenData.width;
	const screenHeight = screenData.height;

	// Bounds check
	if( x < 0 || y < 0 || x >= screenWidth || y >= screenHeight ) {
		return null;
	}

	// WebGL uses bottom-left origin; flip Y
	const glY = ( screenHeight - 1 ) - y;
	const buf = new Uint8Array( 4 );

	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
	gl.readPixels( x, glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf );
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );

	return g_utils.rgbToColor( buf[ 0 ], buf[ 1 ], buf[ 2 ], buf[ 3 ] );
}

export function readPixelAsync( screenData, x, y ) {
	return new Promise( ( resolve ) => {
		g_utils.queueMicrotask( () => {
			resolve( readPixel( screenData, x, y ) );
		} );
	} );
}


export function readPixels( screenData, x, y, width, height ) {
	const gl = screenData.gl;
	const screenWidth = screenData.width;
	const screenHeight = screenData.height;

	// Clamp to screen bounds for robustness if not fully clipped by pixels.js
	const clampedX = Math.max( 0, x );
	const clampedY = Math.max( 0, y );
	const clampedWidth = Math.min( width, screenWidth - clampedX );
	const clampedHeight = Math.min( height, screenHeight - clampedY );

	// If after clamping, nothing left to read
	if( clampedWidth <= 0 || clampedHeight <= 0 ) {
		return [];
	}

	// Flush batches before reading
	flushBatches( screenData );

	// Allocate buffer for the exact rectangle to read
	const buf = new Uint8Array( clampedWidth * clampedHeight * 4 );

	// WebGL origin is bottom-left; convert to top-left for `gl.readPixels`
	// The Y coordinate for `gl.readPixels` is the bottom edge of the rectangle.
	// Bottom-left corner Y of the rectangle
	const glReadY = ( screenHeight - ( clampedY + clampedHeight ) );

	gl.bindFramebuffer( gl.FRAMEBUFFER, screenData.FBO );
	gl.readPixels( clampedX, glReadY, clampedWidth, clampedHeight, gl.RGBA, gl.UNSIGNED_BYTE, buf );
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );

	// Map back to output structure expected by graphics/pixels.js
	// This function will return a flat array of color objects
	const resultColors = new Array( clampedHeight );
	for( let row = 0; row < clampedHeight; row++ ) {

		const resultsRow = new Array( clampedWidth );
		for( let col = 0; col < clampedWidth; col++ ) {

			// Convert gl.readPixels' bottom-origin Y to top-origin Y for the buffer index
			// `buf` itself is ordered from glReadY up to glReadY + clampedHeight - 1
			// Flip row index
			const bufRow = ( clampedHeight - 1 ) - row;
			const i = ( ( clampedWidth * bufRow ) + col ) * 4;
			resultsRow[ col ] = g_utils.rgbToColor(
				buf[ i ], buf[ i + 1 ], buf[ i + 2 ], buf[ i + 3 ]
			);
		}
		resultColors[ row ] = resultsRow;
	}

	return resultColors;
}

export function readPixelsAsync( screenData, x, y, width, height ) {
	return new Promise( ( resolve ) => {
		g_utils.queueMicrotask( () => {
			resolve( readPixels( screenData, x, y, width, height ) );
		} );
	} );
}
