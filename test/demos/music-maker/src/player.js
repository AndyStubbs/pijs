// Playback through Pi.js play(). The player defines the song's instruments, sets the music
// bus effects and starts one play() per lane, using the same strings as the exported code.
//
// Timing: play() strings can't be changed once started, so looping and live edits restart
// the lanes on a beat boundary. The playhead follows onPlay() note events, which report
// when each note really reaches the speakers.

import { buildPlan, laneString, laneOnsets } from "./codegen.js";
import { toSynth, STYLE_MML } from "./instruments.js";
import { NOTE_NAMES } from "./music.js";

const $ = window.pi;
const LATENCY_GUESS = 0.12;
const LOOP_SECONDS = 150;

export class Player {
	constructor() {
		this.song = null;
		this.plan = null;
		this.signature = "";
		this.playing = false;
		this.loop = true;
		this.recording = false;
		this.calls = new Map();
		this.stopTimers = new Set();
		this.restartTimer = null;
		this.dirty = false;
		this.from = 0;
		this.span = 0;
		this.stepSec = 0.125;
		this.callPerf = 0;
		this.audioT0 = null;
		this.perfMinusAudio = null;
		this.latency = LATENCY_GUESS;
		this.definedCount = 0;
		this.fxKey = null;
		this.trackHits = [];
		this.noteHits = [];
		$.onPlay( "note", data => this.onNote( data ) );
		$.onPlay( "end", data => this.onEnd( data ) );
	}

	// Call after every change to the song.
	setSong( song ) {
		this.song = song;
		this.plan = buildPlan( song );
		for( const inst of this.plan.instruments ) {
			$.defineInstrument( inst.n, toSynth( inst.params ) );
		}
		for( let n = this.plan.instruments.length + 1; n <= this.definedCount; n++ ) {
			$.defineInstrument( n, null );
		}
		this.definedCount = this.plan.instruments.length;
		const fxKey = JSON.stringify( this.plan.fx );
		if( fxKey !== this.fxKey ) {
			$.setBusEffect( "music", this.plan.fx );
			this.fxKey = fxKey;
		}
		const signature = JSON.stringify( [ song.tempo, song.bars, song.tracks ] );
		if( signature !== this.signature ) {
			this.signature = signature;
			if( this.playing && !this.recording ) {
				this.dirty = true;
			}
		}
	}

	setLoop( on ) {
		this.loop = on;
		if( this.playing && !this.recording ) {
			this.dirty = true;
		}
	}

	play( fromStep = 0 ) {
		this.stop();
		this.playing = true;
		this.start( fromStep );
	}

	stop() {
		clearTimeout( this.restartTimer );
		this.restartTimer = null;
		for( const id of this.calls.keys() ) {
			$.stopPlay( id );
		}
		this.calls.clear();
		this.playing = false;
		this.dirty = false;
		this.noteHits = [];
	}

	// Starts every audible lane at song step fromStep. Lanes already playing are stopped
	// after stopAfterMs, so their notes before the restart point still sound.
	start( fromStep, opts = {} ) {
		const plan = this.plan;
		const oldIds = [ ...this.calls.keys() ];
		if( oldIds.length ) {
			const stopOld = () => {
				for( const id of oldIds ) {
					$.stopPlay( id );
				}
			};
			if( opts.stopAfterMs > 0 ) {
				const timer = setTimeout( () => {
					this.stopTimers.delete( timer );
					stopOld();
				}, opts.stopAfterMs );
				this.stopTimers.add( timer );
			} else if( !opts.keepOld ) {
				stopOld();
			}
		}
		this.stepSec = 60 / this.song.tempo / 4;
		fromStep = Math.max( 0, Math.min( plan.total - 1, Math.floor( fromStep ) ) );
		const loopSteps = LOOP_SECONDS / this.stepSec;
		const repeats = opts.repeats !== undefined ? opts.repeats :
			this.loop ? Math.max( 1, Math.ceil( loopSteps / plan.total ) ) : 0;
		this.from = fromStep;
		this.span = plan.total - fromStep + repeats * plan.total;
		this.calls = new Map();
		this.callPerf = performance.now();
		this.audioT0 = null;
		for( const lane of plan.lanes ) {
			if( !lane.audible ) {
				continue;
			}
			const onsets = laneOnsets( plan, lane, fromStep, repeats );
			if( !onsets.length ) {
				continue;
			}
			const id = $.play( laneString( plan, lane, fromStep, repeats ) );
			this.calls.set( id, { lane, onsets, "ended": false } );
		}
	}

	// Steps since the current strings started.
	streamPos() {
		if( this.audioT0 !== null && this.perfMinusAudio !== null ) {
			const audioNow = ( performance.now() - this.perfMinusAudio ) / 1000;
			return ( audioNow - this.audioT0 ) / this.stepSec;
		}
		return Math.max( 0, ( performance.now() - this.callPerf ) / 1000 - this.latency ) / this.stepSec;
	}

	streamToSong( k ) {
		const total = this.plan.total;
		const first = total - this.from;
		k = Math.max( 0, k );
		return k < first ? this.from + k : ( k - first ) % total;
	}

	// Current song position in steps (fractional), or -1 when stopped.
	position() {
		if( !this.playing ) {
			return -1;
		}
		return this.streamToSong( this.streamPos() );
	}

	// Call once per frame.
	update() {
		const now = performance.now();
		this.noteHits = this.noteHits.filter( h => h.until > now );
		if( !this.playing || this.restartTimer ) {
			return;
		}
		const k = this.streamPos();
		if( this.dirty && !this.recording ) {
			const lead = ( this.latency + 0.05 ) / this.stepSec;
			this.scheduleRestart( Math.min( Math.ceil( ( k + lead ) / 4 ) * 4, this.span ) );
		} else if( this.loop && !this.recording ) {
			if( ( this.span - k ) * this.stepSec < 1 ) {
				this.scheduleRestart( this.span );
			}
		} else if( k > this.span + 2 / this.stepSec ) {
			this.stop();
		}
	}

	scheduleRestart( targetK ) {
		this.dirty = false;
		const atEnd = targetK >= this.span;
		const songStep = atEnd ? 0 : this.streamToSong( targetK );
		const waitMs = ( ( targetK - this.streamPos() ) * this.stepSec - this.latency ) * 1000;
		this.restartTimer = setTimeout( () => {
			this.restartTimer = null;
			if( !this.playing ) {
				return;
			}
			if( atEnd ) {
				this.start( 0, { "keepOld": true } );
			} else {
				this.start( songStep, { "stopAfterMs": Math.max( 0, this.latency * 1000 - 20 ) } );
			}
		}, Math.max( 0, waitMs ) );
	}

	onNote( data ) {
		const info = this.calls.get( data.trackId );
		if( !info ) {
			return;
		}
		const now = performance.now();
		const audible = now - data.delay * 1000;
		const pma = audible - data.time * 1000;
		this.perfMinusAudio = this.perfMinusAudio === null ? pma : this.perfMinusAudio * 0.9 + pma * 0.1;
		if( this.audioT0 === null ) {
			// Usually this is the lane's first note, but late notes are skipped (for example
			// in a background tab), so take the latest onset that is consistent with the
			// time since play() was called.
			const since = ( audible - this.callPerf ) / 1000;
			let j = 0;
			while( j + 1 < info.onsets.length && since - info.onsets[ j + 1 ] * this.stepSec >= 0.01 ) {
				j++;
			}
			this.audioT0 = data.time - info.onsets[ j ] * this.stepSec;
			this.latency = Math.max( 0.02, Math.min( 0.5, since - info.onsets[ j ] * this.stepSec ) );
		}
		const k = Math.round( ( data.time - this.audioT0 ) / this.stepSec );
		const step = this.streamToSong( k );
		const lane = info.lane;
		this.trackHits[ lane.track ] = now;
		const note = lane.notes.find( n => n.s === step );
		if( note ) {
			this.noteHits.push( {
				"track": lane.track, "s": note.s, "p": note.p,
				"until": now + Math.max( 90, Math.min( 400, data.duration * 1000 ) )
			} );
		}
	}

	onEnd( data ) {
		const info = this.calls.get( data.trackId );
		if( !info || data.stopped ) {
			return;
		}
		info.ended = true;
		if( [ ...this.calls.values() ].every( c => c.ended ) && !this.restartTimer ) {
			if( this.loop && !this.recording ) {
				this.start( 0, { "keepOld": true } );
			} else {
				this.calls.clear();
				this.playing = false;
			}
		}
	}

	// Plays one note of a track (pitch, or drum row for drum tracks) as a preview.
	preview( trackIndex, pitch ) {
		const track = this.song.tracks[ trackIndex ];
		if( !track || this.recording ) {
			return;
		}
		const isDrums = track.type === "drums";
		const inst = this.plan.instruments.find( i => i.track === trackIndex && ( !isDrums || i.drum === pitch ) );
		if( !inst ) {
			return;
		}
		const p = isDrums ? 60 : pitch;
		const len = isDrums ? 16 / Math.min( 4, inst.params.ring ) : 4;
		$.play(
			`T${this.song.tempo} @${inst.n} V${track.vol} MP${track.pan} ${STYLE_MML[ inst.params.style ]} MR0 ` +
			`O${Math.floor( p / 12 ) - 1} ${NOTE_NAMES[ p % 12 ]}${len}`
		);
	}

	// Starts a note of a melody track that sounds until noteOff(), and returns its sound ID.
	// The note is the track's instrument played by synth() on the music bus, so it has the
	// track's volume and pan and the song's effects, like a note of the song. Returns null
	// when the track cannot hold a note: a drum track, or any track while a WAV records.
	noteOn( trackIndex, pitch ) {
		const track = this.song.tracks[ trackIndex ];
		if( !track || track.type === "drums" || this.recording ) {
			return null;
		}
		const inst = this.plan.instruments.find( i => i.track === trackIndex );
		if( !inst ) {
			return null;
		}
		const options = toSynth( inst.params );
		return $.synth( {
			...options,
			"frequency": 440 * Math.pow( 2, ( pitch - 69 ) / 12 ),
			"volume": options.volume * track.vol / 100,
			"pan": track.pan / 100,
			"hold": true,
			"bus": "music"
		} );
	}

	// Releases a note started with noteOn(); it fades over the instrument's release.
	noteOff( soundId ) {
		$.releaseSound( soundId );
	}

	// Records the song (played `loops` times) and resolves with a WAV Blob, or null if
	// cancel() was called.
	async record( loops, onProgress ) {
		this.stop();
		const total = this.plan.total;
		const stepSec = 60 / this.song.tempo / 4;
		const tail = this.plan.fx ? 3 : 1;
		const seconds = total * stepSec * loops + tail;
		if( seconds > 590 ) {
			throw new Error( "TOO LONG TO RECORD" );
		}
		await $.startRecording( "output", Math.ceil( seconds + 3 ), 16 );
		this.recording = true;
		this.playing = true;
		this.start( 0, { "repeats": loops - 1 } );
		const began = performance.now();
		await new Promise( resolve => {
			const tick = () => {
				const elapsed = ( performance.now() - began ) / 1000;
				const target = seconds + this.latency;
				onProgress( Math.min( 1, elapsed / target ) );
				if( !this.recording || elapsed >= target ) {
					resolve();
				} else {
					setTimeout( tick, 100 );
				}
			};
			tick();
		} );
		const cancelled = !this.recording;
		this.recording = false;
		this.stop();
		const blob = await $.stopRecording();
		return cancelled ? null : blob;
	}

	cancelRecording() {
		this.recording = false;
	}
}
