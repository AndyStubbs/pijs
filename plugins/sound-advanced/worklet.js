/**
 * Pi.js - Sound Advanced Worklet Module (Plugin)
 *
 * Loads the plugin's AudioWorklet processors, the recorder and the bitcrusher, once per audio
 * context. The processors are an inline source string turned into a blob: URL, so the plugin
 * stays a single file. Callers share one promise per context; a failed load is forgotten so a
 * later call can retry.
 *
 * @module plugins/sound-advanced/worklet
 */

"use strict";

/** Processor name of the recorder */
export const RECORDER_PROCESSOR = "pi-recorder";

/** Processor name of the bitcrusher */
export const CRUSHER_PROCESSOR = "pi-bitcrush";

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

/**
 * Register the bitcrusher processor. Like defineRecorder, it runs from its source text and
 * must not reference anything outside itself.
 *
 * Each channel holds a sample for round( rate ) frames, across render quanta, and quantizes it
 * to steps of 1 / 2^( bits - 1 ). Both parameters are k-rate. A "stop" message ends
 * processing, since the node's input can be silent while it is still in use.
 *
 * @param {string} name - Processor name
 * @returns {void}
 */
function defineCrusher( name ) {
	registerProcessor( name, class extends AudioWorkletProcessor {
		static get parameterDescriptors() {
			return [
				{
					"name": "bits", "defaultValue": 8, "minValue": 1, "maxValue": 16,
					"automationRate": "k-rate"
				},
				{
					"name": "rate", "defaultValue": 1, "minValue": 1, "maxValue": 64,
					"automationRate": "k-rate"
				}
			];
		}
		constructor() {
			super();
			this.held = [ 0, 0 ];
			this.count = [ 0, 0 ];
			this.stopped = false;
			this.port.onmessage = () => {
				this.stopped = true;
			};
		}
		process( inputs, outputs, parameters ) {
			const input = inputs[ 0 ];
			const output = outputs[ 0 ];
			const steps = Math.pow( 2, parameters.bits[ 0 ] - 1 );
			const hold = Math.round( parameters.rate[ 0 ] );
			for( let c = 0; c < output.length; c++ ) {
				const source = input[ c ] || input[ 0 ];
				const target = output[ c ];
				for( let i = 0; i < target.length; i++ ) {
					if( this.count[ c ] <= 0 ) {
						let sample = 0;
						if( source ) {
							sample = source[ i ];
						}
						this.held[ c ] = Math.round( sample * steps ) / steps;
						this.count[ c ] = hold;
					}
					target[ i ] = this.held[ c ];
					this.count[ c ]--;
				}
			}
			return !this.stopped;
		}
	} );
}

// Source text of the worklet module
const PROCESSOR_SOURCE =
	`(${defineRecorder})(${JSON.stringify( RECORDER_PROCESSOR )},${CHUNK_FRAMES});` +
	`(${defineCrusher})(${JSON.stringify( CRUSHER_PROCESSOR )});`;

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
