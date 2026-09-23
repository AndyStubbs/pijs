/**
 * Pi.js - Sound Advanced Worklet Module (Plugin)
 *
 * Loads the plugin's AudioWorklet processors once per audio context. The processors are an
 * inline source string turned into a blob: URL, so the plugin stays a single file. Callers
 * share one promise per context; a failed load is forgotten so a later call can retry.
 *
 * @module plugins/sound-advanced/worklet
 */

"use strict";

/** Processor name of the recorder */
export const RECORDER_PROCESSOR = "pi-recorder";

/** Frames per recorder message */
export const CHUNK_FRAMES = 4096;

/*************************************************************************************************
 * Worklet Processors
 ************************************************************************************************/


/**
 * Register the recorder processor. This runs in the AudioWorkletGlobalScope from its source
 * text, which the minifier still compacts, so it must not reference anything outside itself.
 *
 * The processor copies two input channels into chunkFrames buffers and posts each full buffer,
 * transferred. It stops accumulating at maxFrames and posts the partial buffer with end
 * "full". A "stop" message posts the partial buffer with end "done"; the flush runs in the
 * message handler, so it works even after rendering has ended.
 *
 * @param {string} name - Processor name
 * @param {number} chunkFrames - Frames per message
 * @returns {void}
 */
function defineRecorder( name, chunkFrames ) {
	registerProcessor( name, class extends AudioWorkletProcessor {
		constructor( options ) {
			super();
			this.left = options.processorOptions.maxFrames;
			this.fill = 0;
			this.stopped = false;
			this.buffers = this.alloc();
			this.port.onmessage = () => {
				this.post( "done" );
				this.stopped = true;
			};
		}
		alloc() {
			return [ new Float32Array( chunkFrames ), new Float32Array( chunkFrames ) ];
		}
		post( end ) {
			let samples = this.buffers;
			if( this.fill < chunkFrames ) {
				samples = samples.map( buffer => buffer.slice( 0, this.fill ) );
			}
			this.port.postMessage(
				{ "samples": samples, "end": end }, samples.map( buffer => buffer.buffer )
			);
			this.buffers = this.alloc();
			this.fill = 0;
		}
		process( inputs ) {
			const input = inputs[ 0 ];
			if( this.stopped || this.left <= 0 ) {
				return false;
			}
			let count = 128;
			if( input[ 0 ] ) {
				count = input[ 0 ].length;
			}
			count = Math.min( count, this.left );
			for( let c = 0; c < 2; c++ ) {
				const channel = input[ c ] || input[ 0 ];
				if( channel ) {
					this.buffers[ c ].set( channel.subarray( 0, count ), this.fill );
				}
			}
			this.fill += count;
			this.left -= count;
			if( this.left <= 0 ) {
				this.post( "full" );
			} else if( this.fill === chunkFrames ) {
				this.post( null );
			}
			return true;
		}
	} );
}

// Source text of the worklet module
const PROCESSOR_SOURCE =
	`(${defineRecorder})(${JSON.stringify( RECORDER_PROCESSOR )},${CHUNK_FRAMES});`;

// Module load promises by audio context
const m_modules = new WeakMap();


/*************************************************************************************************
 * Exported Functions
 ************************************************************************************************/


/**
 * Load the plugin's worklet processors into a context
 *
 * @param {BaseAudioContext} context - Audio context
 * @returns {Promise} Resolves when the processors are registered; rejects when the context
 *   has no AudioWorklet or the module cannot load, for example under a Content Security
 *   Policy that blocks blob: modules
 */
export function loadWorklet( context ) {
	let promise = m_modules.get( context );
	if( !promise ) {
		promise = Promise.resolve().then( () => {
			const url = URL.createObjectURL(
				new Blob( [ PROCESSOR_SOURCE ], { "type": "text/javascript" } )
			);
			return context.audioWorklet.addModule( url ).finally( () => {
				URL.revokeObjectURL( url );
			} );
		} );
		promise.catch( () => {
			m_modules.delete( context );
		} );
		m_modules.set( context, promise );
	}
	return promise;
}
