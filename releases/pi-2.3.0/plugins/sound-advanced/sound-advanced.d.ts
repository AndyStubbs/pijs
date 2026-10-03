import type { PluginAPI as FullPluginAPI } from "pijs-web";
import type { PluginAPI as LitePluginAPI } from "pijs-web/lite";

type PluginAPI = FullPluginAPI | LitePluginAPI;

// Commands the sound-advanced plugin adds to the Pi.js API
interface SoundAdvancedCommands {
	/**
	 * Defines a play() instrument that a play string selects with @n.
	 *
	 * Requires the sound-advanced plugin. Stores synth() options as instrument number n, from 1 to 255. In a play() string, @n selects the instrument for the notes that follow, and @0 returns to the default sound. A simultaneous track after a comma keeps the instrument of the track before it.
	 *
	 * An instrument replaces only the options it sets. oType (including "pulse" with duty) replaces the waveform. attackTime, decayTime, sustainLevel, and releaseTime are in seconds and replace the note's envelope stage; stages left out keep the play() values from MA, MD, MH, and MR. volume scales each note's volume, and pan replaces its position. frequency fixes the pitch of every note, which suits drums, and frequencyEnd sweeps each note to that pitch. Filter, vibrato, tremolo, and arpeggio options apply to every note.
	 *
	 * A sample instrument plays an audio file instead of a waveform. audio is the name of a file loaded with loadAudio(); rootFrequency (default 261.63, C4) is the pitch at which the file plays at its own speed, and each note changes the playback rate, so pitch and length change together. loop (default false) repeats the file until the note's release ends; otherwise the note ends when the file does, if that is sooner. The envelope, volume, pan, frequency, frequencyEnd, filter, vibrato, tremolo, and arpeggio options apply as for synthesized instruments. The file does not have to be loaded when the instrument is defined. audio must be a non-empty string (INVALID_AUDIO), rootFrequency a finite number greater than 0 (INVALID_ROOT_FREQUENCY), and loop a boolean (INVALID_LOOP). audio with oType, or rootFrequency or loop without audio, throws INVALID_INSTRUMENT.
	 *
	 * play() reads the instrument when it is called, so redefining an instrument changes later songs only, not a song already playing. A sample instrument's notes in a song started while its file is loading, or is streamed, are silent, with one console warning per instrument and play() call; wait with ready() first. params of null removes the instrument.
	 *
	 * Built-in instruments: 1 square lead, 2 pluck bass, 3 pad, 4 noise snare, 5 hi-hat, and 6 kick drum.
	 * @param instrument Instrument number, 1-255.
	 * @param params synth() options, plus audio, rootFrequency, and loop for a sample instrument, or null to remove the instrument.
	 */
	defineInstrument( params: { "instrument": number; "params": object | null } ): void;
	defineInstrument( instrument: number, params: object | null ): void;

	/**
	 * Adds or replaces a sound-effect preset for sfx().
	 *
	 * Requires the sound-advanced plugin. Stores a set of synth() options under a name, so sfx( name ) plays them. The options are validated and copied when the preset is defined, so an invalid option throws here, and later changes to the object have no effect. Defining a built-in name replaces that preset.
	 * @param name Preset name.
	 * @param params synth() options.
	 */
	definePreset( params: { "name": string; "params": object } ): void;
	definePreset( name: string, params: object ): void;

	/**
	 * Generates a retro sound effect as synth() options from a category and a seed.
	 *
	 * Requires the sound-advanced plugin. Returns a frozen object of synth() options and plays nothing, so the result can go to synth(), definePreset(), or a recording. The categories are "coin", "laser", "jump", "hit", "explosion", "powerup", "blip", "select", and "random".
	 *
	 * The result is repeatable: the same category and seed return the same options every time. Seed 0 returns the built-in preset with the category's name, so generateSfx( "laser" ) sounds like sfx( "laser" ); defining a preset with that name does not change it. The "random" category has no preset, so its seed 0 is an ordinary generated sound. Every other seed from 1 to 4294967295 is a different variant of the category, such as a different laser for each enemy type.
	 *
	 * variation moves every numeric option by a random amount, up to a quarter of its category range at 1, while the waveform, filter type, and arpeggio stay the same. It is the only part of the result that is not repeatable. Small values give repeated sounds such as footsteps and pickups some life.
	 *
	 * An unknown category throws INVALID_CATEGORY, a seed that is not an integer from 0 to 4294967295 throws INVALID_SEED, and a variation outside 0-1 throws INVALID_VARIATION.
	 * @param category Sound category: coin, laser, jump, hit, explosion, powerup, blip, select, or random.
	 * @param seed Integer from 0 to 4294967295 (default: 0, the built-in preset).
	 * @param variation Random change to every numeric option, 0-1 (default: 0).
	 * @returns Frozen synth() options.
	 */
	generateSfx( params: { "category": string; "seed"?: number; "variation"?: number } ): object;
	generateSfx( category: string, seed?: number, variation?: number ): object;

	/**
	 * Gets the recording state and the seconds recorded so far.
	 *
	 * Requires the sound-advanced plugin. state is "idle" with no recording, "starting" while the first recording loads its audio worklet, "recording" while capturing, and "full" when the recording reached its maxDuration and waits for stopRecording().
	 *
	 * duration is the length captured so far, in seconds. It counts audio as it arrives, in steps of about 85 ms, and does not advance while audio is locked or suspended. It returns to 0 when the recording is stopped.
	 * @returns The recording state and the seconds captured so far.
	 */
	getRecordingState(): { state: "idle" | "starting" | "recording" | "full"; duration: number };

	/**
	 * Measures the current level of a sound bus, with optional spectrum and waveform data.
	 *
	 * Requires the sound-advanced plugin. Measures the most recent 2048 samples of a bus after its effect and volume, which suits level meters and visualizers. "master" is measured after the master volume, before the output limiter, and "output" after the limiter, which is what the speakers receive.
	 *
	 * peak is the largest sample magnitude and rms the average level, both from 0 upward. With spectrum, the result includes 1024 frequency bands in decibels from 0 Hz up to half the sample rate. With waveform, it includes the 2048 samples themselves. Arrays that were not requested are null.
	 *
	 * The first call on a bus starts measuring it and returns silence, so call it every frame.
	 * @param bus 'sfx', 'music', 'audio', 'master', or 'output' (default: 'master').
	 * @param spectrum Include frequency data in decibels (default: false).
	 * @param waveform Include the time-domain samples (default: false).
	 * @returns Levels, plus spectrum and waveform arrays when requested.
	 */
	getSoundLevels( params: { "bus"?: string; "spectrum"?: boolean; "waveform"?: boolean } ): { peak: number; rms: number; spectrum: Float32Array | null; waveform: Float32Array | null };
	getSoundLevels( bus?: string, spectrum?: boolean, waveform?: boolean ): { peak: number; rms: number; spectrum: Float32Array | null; waveform: Float32Array | null };

	/**
	 * Removes PLAY note or song end handlers registered with onPlay().
	 *
	 * Requires the sound-advanced plugin. A handler is identified by its mode and function; once does not matter. With a mode and a function, that handler is removed. With a mode and no function, every handler of that mode is removed. With null as the mode and a function, the function is removed from both modes.
	 *
	 * Giving neither a mode nor a function throws INVALID_MODE; use clearEvents( "play" ) to remove every handler. A mode other than "note", "end", or null throws INVALID_MODE, and fn that is not a function throws INVALID_FUNCTION.
	 * @param mode "note" or "end", or null to remove fn from both modes.
	 * @param fn Handler to remove. If omitted, every handler of the mode is removed.
	 * @returns This function does not return a value.
	 */
	offPlay( params: { "mode"?: "note" | "end" | null; "fn"?: ( data: { type: "note"; trackId: number; track: number; time: number; duration: number; frequency: number; volume: number; delay: number } | { type: "end"; trackId: number; stopped: boolean; delay: number } ) => void } ): void;
	offPlay( mode?: "note" | "end" | null, fn?: ( data: { type: "note"; trackId: number; track: number; time: number; duration: number; frequency: number; volume: number; delay: number } | { type: "end"; trackId: number; stopped: boolean; delay: number } ) => void ): void;

	/**
	 * Registers a handler for PLAY notes or song ends, called when the music is heard.
	 *
	 * Requires the sound-advanced plugin. Use it to sync visuals and game events to music started with play(). mode "note" calls fn for each note as it starts to sound, and "end" once when a song finishes or is stopped with stopPlay().
	 *
	 * A note's data is { type, trackId, track, time, duration, frequency, volume, delay }. trackId is the ID play() returned, track is the index of the comma-separated track, time is the note's audible start in audio context time, duration runs to the end of its release in seconds, and volume is its peak volume. An end's data is { type, trackId, stopped, delay }, where stopped is true after stopPlay(). delay is the seconds between the audible moment and the call. Every handler of an event receives the same frozen object.
	 *
	 * Handlers run on animation frames, on the first frame at or after the moment the note reaches the speakers, including the output latency the browser reports. While audio is suspended, queued notes wait until it resumes and they sound. Notes whose frame comes more than 250 ms late, for example while the tab is hidden, are skipped rather than delivered in a burst. Song ends are always delivered, and stopPlay() skips the song's remaining notes.
	 *
	 * Registering the same function for the same mode again does nothing. A handler that throws is reported with console.error without stopping the others. clearEvents( "play" ) removes every handler. A mode other than "note" or "end" throws INVALID_MODE, fn that is not a function throws INVALID_FUNCTION, and once that is not a boolean throws INVALID_ONCE.
	 * @param mode "note" for each note as it sounds, or "end" when a song finishes or is stopped.
	 * @param fn Handler called with the event's frozen data.
	 * @param once Remove the handler after its first call (default: false).
	 * @returns This function does not return a value.
	 */
	onPlay( params: { "mode": "note" | "end"; "fn": ( data: { type: "note"; trackId: number; track: number; time: number; duration: number; frequency: number; volume: number; delay: number } | { type: "end"; trackId: number; stopped: boolean; delay: number } ) => void; "once"?: boolean } ): void;
	onPlay( mode: "note" | "end", fn: ( data: { type: "note"; trackId: number; track: number; time: number; duration: number; frequency: number; volume: number; delay: number } | { type: "end"; trackId: number; stopped: boolean; delay: number } ) => void, once?: boolean ): void;

	/**
	 * Releases a held sound, or every held sound, so it fades out over its release time.
	 *
	 * Requires the sound-advanced plugin. A sound started with synth() or sfx() and hold set to true sustains until it is released. releaseSound() starts its release: the volume fades over releaseTime and the filter envelope over filterReleaseTime, from the levels they have reached, so a sound released during its attack fades from there. Use it for sounds that last as long as something is happening, such as an engine while a key is down.
	 *
	 * Pass a sound ID to release one sound, or nothing to release every held sound. IDs of sounds that are not held, that have finished, or that were never played are ignored, and releasing a sound twice does nothing more. A held sound that has not started yet because of its delay is cancelled.
	 *
	 * stopSound() still cuts a held sound off in 10 ms without its release.
	 * @param soundId Sound ID of a held sound. If null, releases every held sound.
	 * @returns This function does not return a value.
	 */
	releaseSound( params: { "soundId"?: string } ): void;
	releaseSound( soundId?: string ): void;

	/**
	 * Downloads a recording as a file.
	 *
	 * Requires the sound-advanced plugin. Starts a browser download of a Blob, usually the WAV file returned by stopRecording(), under the given file name. Browsers may ask the user where to save the file, or block downloads that do not follow a user action, so call it from an input handler.
	 * @param blob The file to save, such as the result of stopRecording().
	 * @param filename Name of the downloaded file (default: 'recording.wav').
	 * @returns This function does not return a value.
	 */
	saveRecording( params: { "blob": Blob; "filename"?: string } ): void;
	saveRecording( blob: Blob, filename?: string ): void;

	/**
	 * Places an effect, or a chain of effects, on a sound bus.
	 *
	 * Requires the sound-advanced plugin. Each bus ("sfx", "music", "audio", or "master") holds one effect or one chain of up to four effects. Setting a new one replaces the old one, and null or an empty array removes it. The bus volume is unchanged either way, and it applies after the effect, so muting a bus also silences the effect's tail.
	 *
	 * "reverb" options: time, the length of the reverb tail in seconds (0.1-10, default 2); decay, how quickly the tail dies away (0.1-20, default 3); and mix, the share of reverberated sound (0-1, default 0.3).
	 *
	 * "delay" options: time, the echo spacing in seconds (0.01-2, default 0.25); feedback, how much of each echo repeats (0-0.95, default 0.4); and mix, the share of echoed sound (0-1, default 0.3).
	 *
	 * "filter" options: type, "lowpass", "highpass", or "bandpass" (default "lowpass"); cutoff, the cutoff frequency in Hz (20-20000, default 1000); and q, the resonance (0.0001-100, default 1). A lowpass filter gives the muffled sound of a pause menu or an underwater scene.
	 *
	 * "distortion" options: drive, the amount of saturation (0-1, default 0.5); tone, the cutoff of a lowpass after the distortion in Hz (200-20000, default 4000); and mix (0-1, default 1).
	 *
	 * "bitcrush" options: bits, the bit depth (1-16, default 8); rate, how many frames each sample is held, which lowers the sample rate (1-64, default 1); and mix (0-1, default 1). The bitcrusher loads an audio worklet on first use and passes the sound unchanged until it is ready, which takes a few milliseconds.
	 *
	 * "chorus" options: rate, the modulation speed in Hz (0.1-10, default 1.5); depth, the delay modulation in milliseconds (0-10, default 3); and mix (0-1, default 0.5).
	 *
	 * For a chain, pass an array of objects instead of an effect name, each with an effect property and that effect's options, and omit the options parameter. The effects run in array order.
	 *
	 * When the effects and their order match the bus's current ones, setBusEffect updates them in place: the changed options move to their new values over 20 ms, without clicks, and tails continue. Changing a reverb's time or decay or a filter's type builds a new effect instead, which cuts the tail.
	 * @param bus 'sfx', 'music', 'audio', or 'master'.
	 * @param effect 'reverb', 'delay', 'filter', 'distortion', 'bitcrush', or 'chorus'; an array of up to four { effect, ...options } objects for a chain; or null to remove the bus effect.
	 * @param options Options of a single effect. Omit it for a chain.
	 */
	setBusEffect( params: { "bus": string; "effect": string | object[] | null; "options"?: object } ): void;
	setBusEffect( bus: string, effect: string | object[] | null, options?: object ): void;

	/**
	 * Changes the volume, pitch, or filter cutoff of a held sound while it plays.
	 *
	 * Requires the sound-advanced plugin. Changes a sound started with synth() or sfx() and hold set to true, for example to follow a throttle. Each value moves to its new setting in about 20 ms, without a click, so setSynth() can be called every frame. Values that are omitted or null stay as they are.
	 *
	 * volume replaces the sound's volume; the envelope, tremolo, and pan still apply to it. detune shifts the pitch by a number of cents from the sound's frequency, where 100 cents is a semitone and 1200 an octave; it has no effect on noise. filterCutoff replaces the filter's cutoff, which the filter envelope still moves, and does nothing on a sound that has no filter.
	 *
	 * IDs of sounds that are not held, that have finished, or that were never played are ignored. A released sound can still be changed until it ends.
	 *
	 * A volume outside 0-1 throws INVALID_VOLUME, a detune outside -4800 to 4800 throws INVALID_DETUNE, and a filterCutoff that is not above 0 and at most 24000 throws INVALID_FILTER_CUTOFF.
	 * @param soundId Sound ID of a held sound.
	 * @param volume New volume, 0-1.
	 * @param detune Pitch offset in cents from the sound's frequency, -4800 to 4800.
	 * @param filterCutoff New filter cutoff in Hz, above 0 and at most 24000.
	 * @returns This function does not return a value.
	 */
	setSynth( params: { "soundId": string; "volume"?: number; "detune"?: number; "filterCutoff"?: number } ): void;
	setSynth( soundId: string, volume?: number, detune?: number, filterCutoff?: number ): void;

	/**
	 * Plays a named sound-effect preset.
	 *
	 * Requires the sound-advanced plugin. Plays a preset: a stored set of synth() options. The built-in presets are "coin", "laser", "jump", "hit", "explosion", "powerup", "blip", and "select". definePreset() adds presets or replaces these.
	 *
	 * variation adds random pitch and length changes so repeated effects do not sound identical. At 1, the pitch moves by up to 3 semitones either way and the duration by up to 10%.
	 *
	 * A name that is not defined throws PRESET_NOT_FOUND.
	 * @param name Preset name.
	 * @param variation Random pitch and duration variation, 0-1 (default: 0).
	 * @returns Sound ID for use with stopSound().
	 */
	sfx( params: { "name": string; "variation"?: number } ): string;
	sfx( name: string, variation?: number ): string;

	/**
	 * Starts recording the sound output, or one bus, to memory.
	 *
	 * Requires the sound-advanced plugin. Captures what Pi.js plays in real time, for saving as a WAV file with stopRecording() and saveRecording(). "output" records the final signal after the limiter, exactly what the speakers receive. A bus name records that bus alone, after its effect and volume; "master" is recorded before the limiter.
	 *
	 * The returned promise resolves when capture is running. The first recording loads a small audio worklet, so await the promise before playing anything that must be in the recording. If the worklet cannot load, for example because a Content Security Policy blocks blob: scripts, the promise rejects with the code RECORDING_UNAVAILABLE and the recording state returns to "idle".
	 *
	 * Recording follows the audio clock: nothing is captured while audio is locked before the first user gesture or suspended by the browser. At maxDuration capture stops and the state becomes "full"; the samples are kept until stopRecording() collects them. Only one recording runs at a time, so calling startRecording() again before stopRecording() finishes throws RECORDING_ACTIVE.
	 *
	 * A 16-bit stereo recording at 48 kHz uses about 11.5 MB of memory per minute; a 32-bit recording uses twice that.
	 * @param bus 'output', 'master', 'sfx', 'music', or 'audio' (default: 'output').
	 * @param maxDuration Longest recording in seconds, from 1 to 600 (default: 60).
	 * @param bitDepth 16 for 16-bit PCM or 32 for 32-bit float samples (default: 16).
	 * @returns Resolves when capture is running; rejects with RECORDING_UNAVAILABLE when the audio worklet cannot load.
	 */
	startRecording( params: { "bus"?: string; "maxDuration"?: number; "bitDepth"?: number } ): Promise<void>;
	startRecording( bus?: string, maxDuration?: number, bitDepth?: number ): Promise<void>;

	/**
	 * Stops recording and returns the recording as a WAV file.
	 *
	 * Requires the sound-advanced plugin. Stops the recording started by startRecording(), including a recording that stopped capturing at its maxDuration, and resolves with an audio/wav Blob. The last samples are flushed before the promise resolves, so nothing is lost at the end.
	 *
	 * The file is stereo at the audio context's sample rate, as 16-bit PCM or 32-bit float samples. Pass it to saveRecording() to download it, or play it back with URL.createObjectURL() and loadAudio().
	 *
	 * Stopping while the recording is still starting waits for it to start. Calling stopRecording() again before it resolves returns the same promise. With no recording, it throws NOT_RECORDING.
	 * @returns Resolves with the recording as an audio/wav Blob.
	 */
	stopRecording(): Promise<Blob>;

	/**
	 * Plays a synthesized sound with a filter, vibrato, tremolo, pulse waves, and arpeggios.
	 *
	 * Requires the sound-advanced plugin. Takes every sound() parameter and adds synthesis features. Each feature runs only when it is switched on, so a call with only sound() parameters plays the same as sound().
	 *
	 * oType also accepts "pulse", a square-like wave whose high part lasts for duty of each period. A duty of 0.5 is a square wave; 0.25 and 0.125 give the thinner tones of retro consoles.
	 *
	 * The filter runs when filterType is set. filterCutoff sets its cutoff frequency and filterQ its resonance. The filter envelope moves the cutoff by filterAmount octaves at its peak, with its own attack, decay, sustain, and release, timed like the volume envelope from the start of the sound and the end of duration. A negative filterAmount lowers the cutoff instead.
	 *
	 * Vibrato runs when vibratoDepth is above 0 and swings the pitch by up to vibratoDepth cents at vibratoRate times per second. Tremolo runs when tremoloDepth is above 0 and dips the volume by up to tremoloDepth at tremoloRate times per second. vibratoShape and tremoloShape choose how each one moves: "sine" is a steady wave, and "random" moves to a new random value at the rate, within the same depth, which gives the uneven wobble of an engine, wind, or a flame. A shape that is neither throws INVALID_VIBRATO_SHAPE or INVALID_TREMOLO_SHAPE. An arpeggio cycles the pitch through semitone offsets, such as [0, 4, 7] for a major chord, at arpeggioRate steps per second until the sound ends.
	 *
	 * With hold set to true, the sound is held: after its attack and decay it stays at its sustain level until releaseSound() releases it, and setSynth() can change its volume, pitch, and filter cutoff while it plays. A held sound ignores duration and frequencyEnd. One that is never released releases by itself after 600 seconds. A hold that is not a boolean throws INVALID_HOLD.
	 *
	 * Sounds play on the sound-effects bus, or on the music bus when bus is "music", so a note played by hand gets the music's volume and effects. They follow the same delay, voice, and autoplay rules as sound(). A bus that is neither throws INVALID_BUS. The returned ID works with stopSound().
	 * @param frequency Frequency in Hz; no effect on noise (default: 440).
	 * @param duration Gate length in seconds before the release begins (default: 1).
	 * @param volume Peak volume 0-1 (default: 1).
	 * @param oType Any sound() oType, or 'pulse' for a pulse wave with the given duty (default: 'triangle').
	 * @param delay Delay in seconds before the sound starts (default: 0).
	 * @param attackTime Seconds from silence to peak volume (default: 0).
	 * @param decayTime Seconds from peak volume to the sustain level (default: 0).
	 * @param sustainLevel Fraction of the peak held until duration ends, 0-1 (default: 1).
	 * @param releaseTime Seconds from the sustained level to silence (default: 0.1).
	 * @param pan Stereo position from -1 (left) to 1 (right) (default: 0).
	 * @param frequencyEnd Exponential pitch sweep target in Hz over the duration.
	 * @param filterType 'lowpass', 'highpass', 'bandpass', or 'notch'; the filter runs only when this is set.
	 * @param filterCutoff Filter cutoff in Hz, above 0 and at most 24000 (default: 1000).
	 * @param filterQ Filter resonance, 0-100 (default: 1).
	 * @param filterAttackTime Seconds for the filter envelope to reach its peak (default: 0).
	 * @param filterDecayTime Seconds for the filter envelope to fall to its sustain level (default: 0).
	 * @param filterSustainLevel Fraction of filterAmount held until duration ends, 0-1 (default: 1).
	 * @param filterReleaseTime Seconds for the filter envelope to return to the cutoff after duration (default: 0.1).
	 * @param filterAmount Octaves the filter envelope moves the cutoff at its peak, -10 to 10 (default: 0).
	 * @param vibratoRate Vibrato cycles per second, above 0 and at most 100 (default: 5).
	 * @param vibratoDepth Vibrato depth in cents, 0-1200; 0 turns vibrato off (default: 0).
	 * @param tremoloRate Tremolo cycles per second, above 0 and at most 100 (default: 5).
	 * @param tremoloDepth Fraction of the volume the tremolo removes at its lowest, 0-1; 0 turns tremolo off (default: 0).
	 * @param duty Pulse duty cycle for oType 'pulse', between 0 and 1, exclusive (default: 0.5).
	 * @param arpeggio Semitone offsets to cycle through, 1 to 32 values between -48 and 48.
	 * @param arpeggioRate Arpeggio steps per second, above 0 and at most 100 (default: 12).
	 * @param hold If true, the sound sustains until releaseSound() releases it (default: false).
	 * @param vibratoShape 'sine' for a steady vibrato or 'random' for an uneven one (default: 'sine').
	 * @param tremoloShape 'sine' for a steady tremolo or 'random' for an uneven one (default: 'sine').
	 * @param bus Bus the sound plays on: 'sfx' or 'music' (default: 'sfx').
	 * @returns Sound ID for use with stopSound(), releaseSound(), and setSynth().
	 */
	synth( params: { "frequency"?: number; "duration"?: number; "volume"?: number; "oType"?: string | any[]; "delay"?: number; "attackTime"?: number; "decayTime"?: number; "sustainLevel"?: number; "releaseTime"?: number; "pan"?: number; "frequencyEnd"?: number; "filterType"?: string; "filterCutoff"?: number; "filterQ"?: number; "filterAttackTime"?: number; "filterDecayTime"?: number; "filterSustainLevel"?: number; "filterReleaseTime"?: number; "filterAmount"?: number; "vibratoRate"?: number; "vibratoDepth"?: number; "tremoloRate"?: number; "tremoloDepth"?: number; "duty"?: number; "arpeggio"?: any[]; "arpeggioRate"?: number; "hold"?: boolean; "vibratoShape"?: string; "tremoloShape"?: string; "bus"?: string } ): string;
	synth( frequency?: number, duration?: number, volume?: number, oType?: string | any[], delay?: number, attackTime?: number, decayTime?: number, sustainLevel?: number, releaseTime?: number, pan?: number, frequencyEnd?: number, filterType?: string, filterCutoff?: number, filterQ?: number, filterAttackTime?: number, filterDecayTime?: number, filterSustainLevel?: number, filterReleaseTime?: number, filterAmount?: number, vibratoRate?: number, vibratoDepth?: number, tremoloRate?: number, tremoloDepth?: number, duty?: number, arpeggio?: any[], arpeggioRate?: number, hold?: boolean, vibratoShape?: string, tremoloShape?: string, bus?: string ): string;
}

/**
 * Settings the sound-advanced plugin adds to the set() options.
 */
interface SoundAdvancedOptions {
	/**
	 * Places an effect, or a chain of effects, on a sound bus.
	 */
	busEffect?: { "bus": string; "effect": string | object[] | null; "options"?: object };

	/**
	 * Changes the volume, pitch, or filter cutoff of a held sound while it plays.
	 */
	synth?: string;
}

declare module "pijs-web" {
	interface PluginCommands extends SoundAdvancedCommands {}
	interface PluginOptions extends SoundAdvancedOptions {}
}

declare module "pijs-web/lite" {
	interface PluginCommands extends SoundAdvancedCommands {}
	interface PluginOptions extends SoundAdvancedOptions {}
}

/**
 * sound-advanced plugin initializer for Pi.js.
 */
declare function sound_advancedPlugin( pluginApi: PluginAPI ): void;
export default sound_advancedPlugin;
