/**
 * Pi.js - Batches and Rendering Module
 * 
 * Batch system for rendering points and images efficiently.
 * Combines batch management and rendering operations.
 * 
 * @module api/renderer/batches
 */

"use strict";

import * as g_shaders from "./shaders.js";
import * as g_screenManager from "../core/screen-manager.js";

// Import blend mode constants
import * as g_blends from "../api/blends.js";

// Shaders are imported from external files via esbuild text loader
import m_pointVertSrc from "./shaders/point.vert";
import m_pointFragSrc from "./shaders/point.frag";
import m_imageVertSrc from "./shaders/image.vert";
import m_imageFragSrc from "./shaders/image.frag";


/***************************************************************************************************
 * Constants
 ***************************************************************************************************/


export const POINTS_BATCH = 0;
export const IMAGE_BATCH = 1;
export const GEOMETRY_BATCH = 2;
export const POINTS_REPLACE_BATCH = 3;
export const LINES_BATCH = 4;

const MAX_POINT_BATCH_SIZE = 1_000_000;
const DEFAULT_POINT_BATCH_SIZE = 5000;
const MAX_IMAGE_BATCH_SIZE = 10_000;
const DEFAULT_IMAGE_BATCH_SIZE = 50;
const MAX_GEOMETRY_BATCH_SIZE = 100_000;
const DEFAULT_GEOMETRY_BATCH_SIZE = 1000;
const MAX_LINES_BATCH_SIZE = 50_000;
const DEFAULT_LINES_BATCH_SIZE = 500;
const BATCH_CAPACITY_SHRINK_INTERVAL = 5000;

// String constants to identify batch system names
const BATCH_TYPES = [ "POINTS", "IMAGE", "GEOMETRY", "POINTS_REPLACE", "LINES" ];

// Batch prototype
const m_batchProto = {
	
	// Type of batch POINTS_BATCH, IMAGE_BATCH, etc...
	"type": null,
	"overrideGlobalBlend": null,   // Tri-state: null = use default, true = alpha, false = replace

	"program": null,
	"vertices": null,
	"colors": null,
	"count": 0,

	// Capacity
	"minCapacity": 0,
	"capacity": 0,
	"maxCapacity": 0,
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

	// Drawing mode, e.g., gl.POINTS or gl.TRIANGLES
	"mode": null,

	// Cached shader locations
	"locations": null
};


/***************************************************************************************************
 * Module Initialization
 ***************************************************************************************************/


/**
 * Initialize batch and rendering module
 * 
 * @returns {void}
 */
export function init() {

	// Initialize screenData items owned by the batch system
	g_screenManager.addScreenDataItem( "batches", {} );
	g_screenManager.addScreenDataItem( "batchInfo", {
		"currentBatch": null,
		"drawOrder": []
	} );

	// Cleanup is invoked explicitly by renderer.cleanup().
}

/**
 * Creates all the batches
 * 
 * @returns {void}
 */
export function createBatches( screenData ) {

	// Create the point batch
	screenData.batches[ POINTS_BATCH ] = createBatch( screenData, POINTS_BATCH );
	screenData.batches[ IMAGE_BATCH ] = createBatch( screenData, IMAGE_BATCH );
	screenData.batches[ GEOMETRY_BATCH ] = createBatch( screenData, GEOMETRY_BATCH );
	screenData.batches[ POINTS_REPLACE_BATCH ] = createBatch( screenData, POINTS_REPLACE_BATCH );
	screenData.batches[ LINES_BATCH ] = createBatch( screenData, LINES_BATCH );
}

/**
 * Create batch system for points or images
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} type - Batch type (POINTS_BATCH or IMAGE_BATCH)
 * @returns {Object|null} Batch object or null on error
 */
export function createBatch( screenData, type ) {

	const gl = screenData.gl;
	const batch = Object.create( m_batchProto );

	// Get shader sources based on batch type
	let vertSrc, fragSrc;
	if( type === POINTS_BATCH ) {
		vertSrc = m_pointVertSrc;
		fragSrc = m_pointFragSrc;
		batch.capacity = DEFAULT_POINT_BATCH_SIZE;
		batch.minCapacity = DEFAULT_POINT_BATCH_SIZE;
		batch.maxCapacity = MAX_POINT_BATCH_SIZE;
		batch.mode = gl.POINTS;
	} else if( type === IMAGE_BATCH ) {
		vertSrc = m_imageVertSrc;
		fragSrc = m_imageFragSrc;
		batch.capacity = DEFAULT_IMAGE_BATCH_SIZE;
		batch.minCapacity = DEFAULT_IMAGE_BATCH_SIZE;
		batch.maxCapacity = MAX_IMAGE_BATCH_SIZE;
		batch.mode = gl.TRIANGLES;
		batch.overrideGlobalBlend = true;
	} else if( type === GEOMETRY_BATCH ) {
		vertSrc = m_pointVertSrc;
		fragSrc = m_pointFragSrc;
		batch.capacity = DEFAULT_GEOMETRY_BATCH_SIZE;
		batch.minCapacity = DEFAULT_GEOMETRY_BATCH_SIZE;
		batch.maxCapacity = MAX_GEOMETRY_BATCH_SIZE;
		batch.mode = gl.TRIANGLES;
	} else if( type === POINTS_REPLACE_BATCH ) {
		vertSrc = m_pointVertSrc;
		fragSrc = m_pointFragSrc;
		batch.capacity = DEFAULT_POINT_BATCH_SIZE;
		batch.minCapacity = DEFAULT_POINT_BATCH_SIZE;
		batch.maxCapacity = MAX_POINT_BATCH_SIZE;
		batch.mode = gl.POINTS;
		batch.overrideGlobalBlend = false;
	} else if( type === LINES_BATCH ) {
		vertSrc = m_pointVertSrc;
		fragSrc = m_pointFragSrc;
		batch.capacity = DEFAULT_LINES_BATCH_SIZE;
		batch.minCapacity = DEFAULT_LINES_BATCH_SIZE;
		batch.maxCapacity = MAX_LINES_BATCH_SIZE;
		batch.mode = gl.LINES;
	} else {
		throw `createBatch: Unknown batch type ${type}`;
	}

	// Create the batch shader program
	batch.program = g_shaders.createShaderProgram( gl, vertSrc, fragSrc );

	// Cache shader locations for efficiency
	batch.locations = {
		"position": gl.getAttribLocation( batch.program, "a_position" ),
		"color": gl.getAttribLocation( batch.program, "a_color" ),
		"resolution": gl.getUniformLocation( batch.program, "u_resolution" )
	};

	// Add noise uniform locations for batches that use point shaders
	if(
		type === POINTS_BATCH || 		 type === GEOMETRY_BATCH ||
		type === POINTS_REPLACE_BATCH || type === LINES_BATCH
	) {
		batch.locations.noiseMin = gl.getUniformLocation( batch.program, "u_noiseMin" );
		batch.locations.noiseMax = gl.getUniformLocation( batch.program, "u_noiseMax" );
		batch.locations.time = gl.getUniformLocation( batch.program, "u_time" );
	}

	// Setup batch type and capacity
	batch.type = type;

	// Setup image specific webgl variables
	if( batch.type === IMAGE_BATCH ) {

		// Image-specific shader locations
		batch.locations.texCoord = gl.getAttribLocation( batch.program, "a_texCoord" );
		batch.locations.texture = gl.getUniformLocation( batch.program, "u_texture" );

		// Image-specific data array
		batch.texCoords = new Float32Array( batch.capacity * batch.texCoordComps );

		// Image-specific VBO
		batch.texCoordVBO = gl.createBuffer();
	}

	// These are created for all batches
	batch.vertices = new Float32Array( batch.capacity * batch.vertexComps );
	batch.colors = new Uint8Array( batch.capacity * batch.colorComps );
	batch.vertexVBO = gl.createBuffer();
	batch.colorVBO = gl.createBuffer();

	// Create VAO (WebGL2 only)
	batch.vao = gl.createVertexArray();
	gl.bindVertexArray( batch.vao );

	// Setup position attribute
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

	// Setup texCoord attribute for IMAGE_BATCH
	if( batch.type === IMAGE_BATCH ) {
		gl.bindBuffer( gl.ARRAY_BUFFER, batch.texCoordVBO );
		gl.enableVertexAttribArray( batch.locations.texCoord );
		gl.vertexAttribPointer(
			batch.locations.texCoord, batch.texCoordComps, gl.FLOAT, false, 0, 0
		);
	}

	gl.bindVertexArray( null );

	// Set the next shrink check time
	batch.capacityShrinkCheckTime = Date.now() + BATCH_CAPACITY_SHRINK_INTERVAL;

	return batch;
}

/**
 * Resize batch to new capacity
 * 
 * @param {Object} batch - Batch object
 * @param {number} newCapacity - New capacity
 * @returns {void}
 */
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
		`Batch ${BATCH_TYPES[ batch.type ]} resized from ${batch.capacity} to ${newCapacity}`
	);

	// Update batch
	batch.capacity = newCapacity;
	batch.capacityChanged = true;

	// Set the time capacity last changed
	batch.capacityShrinkCheckTime = Date.now() + BATCH_CAPACITY_SHRINK_INTERVAL;
}

/**
 * Ensure batch has capacity for items
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} batchType - Batch type
 * @param {number} itemCount - Number of items needed
 * @param {HTMLImageElement|HTMLCanvasElement} [img] - Image for IMAGE_BATCH
 * @param {WebGLTexture} [texture] - Texture for IMAGE_BATCH
 * @returns {void}
 */
export function prepareBatch( screenData, batchType, itemCount, img, texture ) {

	// Get the batch
	const batch = screenData.batches[ batchType ];

	// Track if the batch type is changing or texture is changing (for IMAGE_BATCH)
	const batchInfo = screenData.batchInfo;
	const batchTypeChanging = batchInfo.currentBatch !== batch;
	const textureChanging = batchType === IMAGE_BATCH && batchInfo.currentBatch === batch &&
		batch.texture !== texture;

	if( batchTypeChanging || textureChanging ) {
		
		// Set the end index for the last drawOrderItem to it's current count
		if( batchInfo.drawOrder.length > 0 ) {
			const lastDrawOrderItem = batchInfo.drawOrder[ batchInfo.drawOrder.length - 1 ];
			lastDrawOrderItem.endIndex = lastDrawOrderItem.batch.count;
		}

		// Create a new draw order item
		const drawOrderItem = {
			"batch": batch,
			"startIndex": batch.count,
			"endIndex": null,
			"overrideGlobalBlend": batch.overrideGlobalBlend
		};
		
		// For IMAGE_BATCH, track the current image/texture for this segment
		if( batch.type === IMAGE_BATCH ) {
			batch.texture = texture;
			drawOrderItem.texture = texture;
		}

		// Add the draw order item
		batchInfo.drawOrder.push( drawOrderItem );
		batchInfo.currentBatch = batch;
	}

	// Check if need to increase capacity
	const requiredCount = batch.count + itemCount;
	if( requiredCount >= batch.capacity ) {

		// Make sure we don't exceed max batch size
		if( requiredCount > batch.maxCapacity ) {
			console.log(
				`Batch ${BATCH_TYPES[ batch.type ]} exceeded maxCapacity ${batch.maxCapacity}, ` +
				`requested ${requiredCount}.  Flushing batch to reset count to 0.`
			);
		
			flushBatches( screenData );
			return prepareBatch( screenData, batchType, itemCount, img, texture );
		}

		// Resize to new capacity by doubling current capacity up to maxCapacity
		const newCapacity = Math.max(
			requiredCount, Math.min( batch.capacity * 2, batch.maxCapacity )
		);
		resizeBatch( batch, newCapacity );
	}

	return true;
}

/**
 * Flush all batches to FBO
 * 
 * @param {Object} screenData - Screen data object
 * @param {string|null} blend - Blend mode or null for default
 * @returns {void}
 */
export function flushBatches( screenData, blend = null ) {
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

			// Set blend mode for this item
			if( drawOrderItem.overrideGlobalBlend === null ) {

				// Other batches use global blend mode
				if( blend === g_blends.BLEND_REPLACE ) {
					gl.disable( gl.BLEND );
				} else {
					gl.enable( gl.BLEND );
					gl.blendFuncSeparate(
						gl.SRC_ALPHA,           // srcRGBFactor
						gl.ONE_MINUS_SRC_ALPHA, // dstRGBFactor
						gl.ONE,                 // srcAlphaFactor - src alpha factor 1.0 (no scale)
						gl.ONE_MINUS_SRC_ALPHA  // dstAlphaFactor - dst alpha factor (1-src.a)
					);
				}

			} else if( drawOrderItem.overrideGlobalBlend === true ) {

				// IMAGE_BATCH always uses alpha blending
				gl.enable( gl.BLEND );
				gl.blendFuncSeparate(
					gl.SRC_ALPHA,           // srcRGBFactor
					gl.ONE_MINUS_SRC_ALPHA, // dstRGBFactor
					gl.ONE,                 // srcAlphaFactor - src alpha factor 1.0 (no scale)
					gl.ONE_MINUS_SRC_ALPHA  // dstAlphaFactor - dst alpha factor (1-src.a)
				);
			} else {
				gl.disable( gl.BLEND );
			}

			let texture = null;
			if( drawOrderItem.batch.type === IMAGE_BATCH ) {
				texture = drawOrderItem.texture;
			}
			drawBatch(
				gl, screenData, drawOrderItem.batch,
				drawOrderItem.startIndex, drawOrderItem.endIndex, texture
			);
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

/**
 * Upload batch data to GPU
 * 
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {Object} batch - Batch object
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @returns {void}
 */
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

/**
 * Draw batch to FBO
 * 
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {Object} screenData - Screen data object
 * @param {Object} batch - Batch object
 * @param {number} startIndex - Start index in batch
 * @param {number} endIndex - End index in batch
 * @param {WebGLTexture|null} texture - Texture for IMAGE_BATCH or null
 * @returns {void}
 */
function drawBatch( gl, screenData, batch, startIndex, endIndex, texture = null ) {

	gl.useProgram( batch.program );
	gl.bindVertexArray( batch.vao );

	// For IMAGE_BATCH, bind the texture and set uniform
	if( batch.type === IMAGE_BATCH && texture ) {
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, texture );
		gl.uniform1i( batch.locations.texture, 0 );
	}

	// Set noise uniforms for batches that use point shaders
	if( batch.locations.noiseMin !== undefined ) {
		const noise = screenData.blends.noise;
		
		// Calculate noise min and max ranges
		let noiseMin, noiseMax;
		if( noise === null ) {

			// No noise - set both to zero
			noiseMin = new Float32Array( [ 0.0, 0.0, 0.0, 0.0 ] );
			noiseMax = new Float32Array( [ 0.0, 0.0, 0.0, 0.0 ] );
		} else {

			noiseMin = noise[ 0 ];
			noiseMax = noise[ 1 ];
		}
		
		gl.uniform4fv( batch.locations.noiseMin, noiseMin );
		gl.uniform4fv( batch.locations.noiseMax, noiseMax );
		
		// Set time for animated noise (use 0.0 for static noise)
		// For now, use 0.0 for static noise - can be changed to performance.now() / 1000.0
		gl.uniform1f( batch.locations.time, performance.now() / 1000.0 );
	}

	// Draw based on batch mode
	gl.drawArrays( batch.mode, startIndex, endIndex - startIndex );
}

/**
 * Reset batch after flush
 * 
 * @param {Object} batch - Batch object
 * @returns {void}
 */
function resetBatch( batch ) {

	// Update the batch local max
	batch.capacityLocalMax = Math.max( batch.count, batch.capacityLocalMax );

	// Reset batch count
	batch.count = 0;

	if( batch.type === IMAGE_BATCH ) {
		batch.texture = null;
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
 * Display FBO texture to canvas
 * 
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function displayToCanvas( screenData ) {
	
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
	gl.bindTexture( gl.TEXTURE_2D, screenData.fboTexture );
	gl.uniform1i( locations.texture, 0 );
	
	// Draw fullscreen quad
	gl.drawArrays( gl.TRIANGLES, 0, 6 );
	
	// Cleanup
	gl.disableVertexAttribArray( locations.position );
}

/**
 * Cleanup batch resources for screen
 * 
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function cleanup( screenData ) {

	if( !screenData.gl ) {
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

	// Clear references for GC and signal uninitialized state
	screenData.batches = null;
	screenData.batchInfo = null;
}
