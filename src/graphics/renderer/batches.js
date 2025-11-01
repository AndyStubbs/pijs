/**
 * Pi.js - Batches and Rendering Module
 * 
 * Batch system for rendering points and images efficiently.
 * Combines batch management and rendering operations.
 * 
 * @module graphics/renderer/batches
 */

"use strict";

import * as shaders from "./shaders.js";
import * as g_screenManager from "../../core/screen-manager.js";

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

const MAX_POINT_BATCH_SIZE = 1_000_000;
const DEFAULT_POINT_BATCH_SIZE = 5000;
const MAX_IMAGE_BATCH_SIZE = 10_000;
const DEFAULT_IMAGE_BATCH_SIZE = 50;
const BATCH_CAPACITY_SHRINK_INTERVAL = 5000;

// String constants to identify batch system names
const BATCH_TYPES = [ "POINTS", "IMAGE" ];

// Batch prototype
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
	"image": null,

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
 * @param {Object} api - The main Pi.js API object
 * @returns {void}
 */
export function init( api ) {

	g_screenManager.addScreenCleanupFunction( cleanup );
}

/**
 * Create batch system for points or images
 * 
 * @param {Object} screenData - Screen data object
 * @param {number} type - Batch type (POINTS_BATCH or IMAGE_BATCH)
 * @param {string} vertSrc - Vertex shader source
 * @param {string} fragSrc - Fragment shader source
 * @returns {Object|null} Batch object or null on error
 */
export function createBatch( screenData, type, vertSrc, fragSrc ) {

	const gl = screenData.gl;
	const batch = Object.create( m_batchProto );

	// Create the batch shader program
	batch.program = shaders.createShaderProgram( gl, vertSrc, fragSrc );

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
 * @returns {void}
 */
export function prepareBatch( screenData, batchType, itemCount ) {

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
		// For IMAGE_BATCH, track the current image/texture for this segment
		const drawOrderItem = { "batch": batch, "startIndex": batch.count, "endIndex": null };
		if( batch.type === IMAGE_BATCH ) {
			drawOrderItem.image = batch.image;
			drawOrderItem.texture = batch.texture;
		}
		batchInfo.drawOrder.push( drawOrderItem );
		batchInfo.currentBatch = batch;
	}

	// Check if need to increase capacity
	const requiredCount = batch.count + itemCount;
	if( requiredCount >= batch.capacity ) {

		// Make sure we don't exceed max batch size
		if( requiredCount > batch.maxCapacity ) {
			flushBatches( screenData );
			return prepareBatch( screenData, batchType, itemCount );
		}

		// Resize to new capacity by doubling current capacity
		const newCapacity = Math.max( requiredCount, batch.capacity * 2 );
		resizeBatch( batch, newCapacity );
	}

	return true;
}

/**
 * Cleanup batch resources for screen
 * 
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
function cleanup( screenData ) {

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

	// Clear batches array
	screenData.batches = {};
	screenData.batchInfo = {};
}

/**
 * Flush all batches to FBO
 * 
 * @param {Object} screenData - Screen data object
 * @param {string|null} blend - Blend mode or null for default
 * @returns {void}
 */
export function flushBatches( screenData, blend = null ) {

	// TODO: Implement batch flushing
}

/**
 * Display FBO texture to canvas
 * 
 * @param {Object} screenData - Screen data object
 * @returns {void}
 */
export function displayToCanvas( screenData ) {

	// TODO: Implement display to canvas
}

