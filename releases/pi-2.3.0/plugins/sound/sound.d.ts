import type { PluginAPI } from "pijs-web/lite";

// Commands the sound plugin adds to the Pi.js API
interface SoundCommands {
	/**
	 * Loads an audio file for playback with playAudio.
	 *
	 * Loads an audio file and returns an audio ID for playAudio. By default the file is downloaded and decoded into memory, so any number of instances can play it at once with sample-accurate timing. Set stream to true for long files such as music: the file then plays through a media element instead of being decoded, which saves memory but allows only one instance at a time, and its timing is approximate. Decoded audio uses about 21 MB per stereo minute at 44.1 kHz, so streaming is recommended for music longer than about 30 seconds.
	 *
	 * The file loads asynchronously; use $.ready() to wait for it. Network failures are retried up to three times. A file that fails to load logs an error, and playAudio then throws AUDIO_NOT_LOADED.
	 *
	 * Audio requires a page served over HTTP(S). file: URLs throw UNSUPPORTED_PROTOCOL, and cross-origin files need CORS headers.
	 * @param src Audio file URL (e.g., 'sound.mp3', 'audio/beep.wav').
	 * @param name A unique name to use as the audio ID. If omitted, an ID is generated.
	 * @param stream True to stream the file through a media element instead of decoding it into memory (default: false).
	 * @returns Audio ID for use with playAudio, stopAudio, pauseAudio, resumeAudio, and removeAudio.
	 */
	loadAudio( params: { "src": string; "name"?: string; "stream"?: boolean } ): string;
	loadAudio( src: string, name?: string, stream?: boolean ): string;

	/**
	 * Pauses an audio instance, every instance of an audio ID, or all audio.
	 *
	 * Pauses audio and saves its position, so resumeAudio continues from the same place with the rest of its duration. Pass an instance ID, an audio ID to pause every instance of that file, or nothing to pause all audio. The instance fades out over 10 ms, and a paused instance holds no voice. Pausing an instance that has not started yet cancels its start; resuming it then plays from its startTime. Pausing a paused instance does nothing. Finished instance IDs are ignored; unknown IDs throw AUDIO_NOT_FOUND.
	 * @param id Instance ID, or audio ID to pause all its instances. If omitted, pauses all audio.
	 * @returns This function does not return a value.
	 */
	pauseAudio( params: { "id"?: number | string } ): void;
	pauseAudio( id?: number | string ): void;

	/**
	 * Plays music using BASIC-style notation (inspired by QBasic PLAY command).
	 *
	 * Plays music from a notation string. Notes are scheduled just ahead of time as the song plays, so long songs use few resources. Songs play on the music bus.
	 *
	 * **Notes:**
	 * - A-G: Note letters (A, B, C, D, E, F, G)
	 * - Sharps: Use # or + after the note (e.g., C#, F+)
	 * - Flats: Use - after the note (e.g., B-, E-); C- is the B below C
	 * - Note length: Include a number after the note (e.g., C4 = quarter note C, C#8 = eighth note C#)
	 * - Dotted notes: . (1.5x length), .. (1.75x length), after the length if one is given (e.g., C4.)
	 * - N[n]: Play note by number (1-119, where 1 is C0 and 58 is A4 at 440 Hz); N0 is a rest
	 *
	 * **Octave:**
	 * - O[n]: Set octave (0-9)
	 * - <: Decrease octave by 1
	 * - >: Increase octave by 1
	 * - MO[n]: Octave offset added to later notes (can be negative: MO-1)
	 *
	 * **Note Length:**
	 * - L[n]: Set default note length (1-64, where 4=quarter note, 8=eighth note, etc.)
	 *
	 * **Tempo & Timing:**
	 * - T[n]: Set tempo in quarter notes per minute (32-255, default 120)
	 * - P[n]: Rest for a note length (1-64)
	 *
	 * **Volume and Pan:**
	 * - V[n]: Set volume (0-100)
	 * - MP[n]: Pan from -100 (left) to 100 (right)
	 *
	 * **Waveforms:**
	 * - WS or SINE: Sine wave
	 * - WQ or SQUARE: Square wave
	 * - WW or SAWTOOTH: Sawtooth wave
	 * - WT or TRIANGLE: Triangle wave (default)
	 * - WN or NOISE: White noise
	 * - WP or PINK: Pink noise
	 * - [[r],[i]]: Use a custom wave table
	 *
	 * **Articulation:** Each note fills a slot of its note length at the current tempo, and the song advances by whole slots. Articulation sets how much of the slot sounds; the rest is silent, so the beat never changes.
	 * - MS: Staccato (75% of the slot sounds)
	 * - MN: Normal (87.5%, default)
	 * - ML: Legato (100%)
	 *
	 * **Envelope:**
	 * - MA[n]: Attack time, % of the sounding length (default 15)
	 * - MD[n]: Decay time, % of the sounding length (default 20)
	 * - MH[n]: Sustain (hold) level, % of note volume (default 65)
	 * - MR[n]: Release time, % of the sounding length (default 20)
	 *
	 * The release happens inside the sounding length, so every note ends within its own slot. If MA + MD + MR is over 100, the note releases from the level it reached.
	 *
	 * **Instruments:**
	 * - @[n]: Select instrument n. Instruments are provided by a plugin that extends PLAY; without one, @n is ignored and a warning is logged.
	 *
	 * **Simultaneous Tracks:** A comma starts another track at the time of the previous track's last command, with that track's settings. For example, "CDE, F" plays F at the same time as E, and "C2, E2, G2" plays a chord. Call `play()` several times to play independent tracks from the same moment.
	 *
	 * Unknown commands are ignored, and a warning is logged once per call.
	 * @param playString Music notation string with notes and commands.
	 * @returns Track ID for use with stopPlay.
	 */
	play( params: { "playString": string } ): number;
	play( playString: string ): number;

	/**
	 * Plays loaded audio as a new instance and returns its instance ID.
	 *
	 * Starts a new instance of audio loaded with loadAudio and returns its instance ID. The instance can then be stopped, paused, resumed, or changed with setAudio. Decoded audio can play many instances at once. Streamed audio has one instance at a time: a new playAudio fades out the current instance and replaces it.
	 *
	 * startTime and duration are measured in the file's own time. duration counts every loop pass, so a looping instance with duration 5 stops after 5 seconds of the file. A duration of 0 plays to the end of the file, or loops forever. playbackRate changes speed and pitch together, so at rate 0.5 a duration of 5 lasts 10 seconds. The rate must be between 0.0625 and 16 for decoded audio, and between 0.25 and 4 for streamed audio, or the call throws INVALID_PLAYBACK_RATE. pan places the instance from -1 (left) to 1 (right). delay starts the instance later, measured on the audio clock.
	 *
	 * Instances fade in and out over a few milliseconds, so they start and stop without clicks. They play on the audio bus through the master volume and the output limiter, and share the 64-voice limit with sound() and play(). Looping instances are never stopped to make room for other sounds; when every voice is held by a loop, new sounds are not played. A request that is not played still returns an instance ID, and operations on it do nothing.
	 *
	 * Until the page receives its first user gesture, the browser keeps audio locked. A one-shot requested while audio is locked is not played; a looping instance starts when audio unlocks.
	 * @param audioId Audio ID returned from loadAudio.
	 * @param volume Volume (0-1, default: 1).
	 * @param startTime Offset into the file in seconds (default: 0).
	 * @param duration Seconds of the file to play, including every loop pass (default: 0 = to the end, or forever when looping).
	 * @param loop Loop the whole file (default: false).
	 * @param playbackRate Speed and pitch: 0.0625-16 for decoded audio, 0.25-4 for streamed audio (default: 1).
	 * @param pan Stereo position from -1 (left) to 1 (right) (default: 0).
	 * @param delay Seconds before playback starts (default: 0).
	 * @returns Instance ID for use with stopAudio, pauseAudio, resumeAudio, and setAudio.
	 */
	playAudio( params: { "audioId": string; "volume"?: number; "startTime"?: number; "duration"?: number; "loop"?: boolean; "playbackRate"?: number; "pan"?: number; "delay"?: number } ): number;
	playAudio( audioId: string, volume?: number, startTime?: number, duration?: number, loop?: boolean, playbackRate?: number, pan?: number, delay?: number ): number;

	/**
	 * Removes loaded audio and frees its resources.
	 *
	 * Removes audio loaded with loadAudio. A load still in progress is cancelled and no longer holds $.ready(). Playing instances fade out, paused and delayed instances end, and the memory is released. The audio ID is freed at once, so its name can be reused by a new loadAudio; results from the removed load can never affect the new one.
	 * @param audioId Audio ID returned from loadAudio.
	 * @returns This function does not return a value.
	 */
	removeAudio( params: { "audioId": string } ): void;
	removeAudio( audioId: string ): void;

	/**
	 * Resumes a paused audio instance, every instance of an audio ID, or all audio.
	 *
	 * Resumes paused audio from its saved position with the rest of its duration, fading in over a few milliseconds. Pass an instance ID, an audio ID to resume every paused instance of that file, or nothing to resume all paused audio. Volume, rate, and pan changes made with setAudio while paused apply on resume. A resumed instance needs a free voice again; if every voice is held by a loop, it stays paused. Resuming a playing instance does nothing. Finished instance IDs are ignored; unknown IDs throw AUDIO_NOT_FOUND.
	 * @param id Instance ID, or audio ID to resume all its instances. If omitted, resumes all paused audio.
	 * @returns This function does not return a value.
	 */
	resumeAudio( params: { "id"?: number | string } ): void;
	resumeAudio( id?: number | string ): void;

	/**
	 * Changes the volume, playback rate, or pan of an audio instance.
	 *
	 * Changes a playing, delayed, or paused instance. Omitted values are unchanged. Volume and pan ramp over 10 ms. playbackRate changes speed and pitch together; it must stay within the range of the instance's loading mode (0.0625-16 decoded, 0.25-4 streamed), or the call throws INVALID_PLAYBACK_RATE. The duration passed to playAudio is file time, so a rate change also changes how long the rest of the instance lasts. Changes to a delayed instance apply from its start, and changes to a paused instance apply when it resumes. Finished instance IDs are ignored; an instance ID that was never returned throws AUDIO_NOT_FOUND.
	 * @param instanceId Instance ID returned from playAudio.
	 * @param volume Volume (0-1).
	 * @param playbackRate Speed and pitch within the instance's mode range.
	 * @param pan Stereo position from -1 (left) to 1 (right).
	 * @returns This function does not return a value.
	 */
	setAudio( params: { "instanceId": number; "volume"?: number; "playbackRate"?: number; "pan"?: number } ): void;
	setAudio( instanceId: number, volume?: number, playbackRate?: number, pan?: number ): void;

	/**
	 * Sets the volume of one sound bus.
	 *
	 * Sound is mixed on three buses before the master volume: "sfx" carries sound(), "music" carries play(), and "audio" carries playAudio(). The bus volume applies after any bus effect set with the sound-advanced plugin's setBusEffect(), so it also fades an effect's tail. The change ramps over 10 ms. "master" is the same as setVolume().
	 * @param bus 'sfx', 'music', 'audio', or 'master'.
	 * @param volume Volume, 0-1.
	 * @returns This function does not return a value.
	 */
	setBusVolume( params: { "bus": string; "volume": number } ): void;
	setBusVolume( bus: string, volume: number ): void;

	/**
	 * Turns the output limiter on or off.
	 *
	 * The limiter keeps the combined output of all sounds, music, and audio within ±1.0, so many sounds playing together saturate smoothly instead of clipping harshly. It is on by default. Levels below its threshold pass unchanged. It is a safety net against overload, not a mastering stage.
	 *
	 * The limiter has two stages: a compressor that reduces sustained overload, then a soft clipper that sets the absolute ceiling. Browsers whose compressor also reduces bright waveforms (such as square and sawtooth) below its threshold use the soft clipper alone, so levels match across browsers.
	 *
	 * Switching reconnects the output immediately, which can cause a brief discontinuity in sounds that are playing. Set it before playback starts.
	 * @param enabled True to limit output (the default), false to bypass the limiter.
	 * @returns This function does not return a value.
	 */
	setSoundLimiter( params: { "enabled": boolean } ): void;
	setSoundLimiter( enabled: boolean ): void;

	/**
	 * Sets the master volume for all sounds, music, and audio.
	 *
	 * Sets the master volume, which scales sounds, music, and audio files together before the output limiter. The change ramps smoothly over a few milliseconds to avoid clicks.
	 *
	 * Volume is a multiplier: 0 = silent, 1 = full volume. The default is 0.75.
	 * @param volume Volume (0-1, default: 0.75).
	 * @returns This function does not return a value.
	 */
	setVolume( params: { "volume": number } ): void;
	setVolume( volume: number ): void;

	/**
	 * Plays a synthesized sound with an ADSR envelope using Web Audio API.
	 *
	 * Generates and plays a sound at a specific frequency using Web Audio API oscillators. Supports standard waveforms (triangle, sine, square, sawtooth), custom wavetables, and white or pink noise. Frequency is not rounded.
	 *
	 * The volume follows an ADSR envelope. The attack ramps linearly from silence to the peak volume over attackTime. The decay then falls toward sustainLevel × volume over decayTime, and the sustain holds until duration ends. The release fades from that level to silence over releaseTime. If duration ends before the attack and decay finish, the release starts from the level reached at that point. The total length is duration plus the release. Every onset and stop ramps over at least 3 ms, even when attackTime or releaseTime is 0, so sounds start and end without clicks.
	 *
	 * pan places the sound from -1 (left) to 1 (right). The louder channel always plays at volume, so a sound panned near center is as loud as an unpanned one, and the channels keep an equal-power balance. frequencyEnd sweeps the pitch exponentially from frequency to frequencyEnd over duration; both must then be greater than 0, or the call throws INVALID_FREQUENCY.
	 *
	 * The "white" and "pink" types play noise instead of a tone. White noise has equal energy at every frequency; pink noise falls by 3 dB per octave, which sounds deeper and softer. Each noise type loops one shared 2-second buffer, and every sound starts it at a random position so repeated hits do not sound identical. frequency and frequencyEnd have no effect on noise, though a sweep's values are still validated.
	 *
	 * Sounds play on the sound-effects bus through the master volume and the output limiter. A delay beyond the 0.2 second lookahead window is held as a pending request until its start approaches. At most 1024 requests can be pending; beyond that the call throws TOO_MANY_PENDING_SOUNDS. At most 64 sounds hold voice slots at once; when all are in use, the oldest overlapping sound fades out to make room.
	 *
	 * Until the page receives its first user gesture (pointer, key, or touch), the browser keeps audio locked. Calls made while audio is locked return an ID but play nothing; audio unlocks on the first gesture.
	 * @param frequency Frequency in Hz; no effect on noise (default: 440).
	 * @param duration Gate length in seconds: how long the sound is held before the release begins (default: 1).
	 * @param volume Peak volume 0-1 (default: 1).
	 * @param oType Oscillator type: 'triangle', 'sine', 'square', 'sawtooth', 'white' or 'pink' noise, a source type added by a plugin (such as 'periodic' from sound-advanced), or custom wavetable array [[realArray], [imagArray]] (default: 'triangle').
	 * @param delay Delay before playing in seconds (default: 0).
	 * @param attackTime Seconds from silence to the peak volume (default: 0; at least 3 ms is always used).
	 * @param decayTime Seconds from the peak to the sustain level (default: 0).
	 * @param sustainLevel Fraction of the peak volume held until duration ends, 0-1 (default: 1).
	 * @param releaseTime Seconds from the sustain level to silence after duration ends (default: 0.1; at least 3 ms is always used).
	 * @param pan Stereo position from -1 (left) to 1 (right); the louder channel stays at volume (default: 0).
	 * @param frequencyEnd Frequency in Hz to sweep to exponentially over duration; no effect on noise (default: no sweep).
	 * @returns Sound ID for use with stopSound.
	 */
	sound( params: { "frequency"?: number; "duration"?: number; "volume"?: number; "oType"?: string | any[]; "delay"?: number; "attackTime"?: number; "decayTime"?: number; "sustainLevel"?: number; "releaseTime"?: number; "pan"?: number; "frequencyEnd"?: number } ): string;
	sound( frequency?: number, duration?: number, volume?: number, oType?: string | any[], delay?: number, attackTime?: number, decayTime?: number, sustainLevel?: number, releaseTime?: number, pan?: number, frequencyEnd?: number ): string;

	/**
	 * Stops an audio instance, every instance of an audio ID, or all audio.
	 *
	 * Stops audio with a short fade. Pass an instance ID from playAudio to stop one instance, an audio ID from loadAudio to stop every instance of that file, or nothing to stop all audio. A playing instance fades out over 10 ms, so it is silent about 15 ms after the call; paused and delayed instances end at once. Instance IDs that have already finished are ignored. An instance ID that was never returned, or an unknown audio ID, throws AUDIO_NOT_FOUND.
	 * @param id Instance ID, or audio ID to stop all its instances. If omitted, stops all audio.
	 * @returns This function does not return a value.
	 */
	stopAudio( params: { "id"?: number | string } ): void;
	stopAudio( id?: number | string ): void;

	/**
	 * Stops playing music tracks.
	 *
	 * Stops a specific music track by track ID, or stops all tracks if trackId is null. Notes that are playing fade out over 10 ms, so the track is silent about 15 ms after the call. Notes that have not started are cancelled.
	 * @param trackId Track ID to stop. If null, stops all tracks.
	 * @returns This function does not return a value.
	 */
	stopPlay( params: { "trackId"?: number } ): void;
	stopPlay( trackId?: number ): void;

	/**
	 * Stops a playing sound or all sounds.
	 *
	 * Stops a specific sound by sound ID, or stops all sounds if soundId is null. A sound that is playing fades out over 10 ms, so it is silent about 15 ms after the call. A delayed sound that has not started is cancelled. IDs of sounds that have already finished, or were never played, are ignored.
	 * @param soundId Sound ID returned from sound(). If null, stops all sounds.
	 * @returns This function does not return a value.
	 */
	stopSound( params: { "soundId"?: string } ): void;
	stopSound( soundId?: string ): void;
}

/**
 * Settings the sound plugin adds to the set() options.
 */
interface SoundOptions {
	/**
	 * Changes the volume, playback rate, or pan of an audio instance.
	 */
	audio?: number;

	/**
	 * Sets the volume of one sound bus.
	 */
	busVolume?: { "bus": string; "volume": number };

	/**
	 * Turns the output limiter on or off.
	 */
	soundLimiter?: boolean;

	/**
	 * Sets the master volume for all sounds, music, and audio.
	 */
	volume?: number;
}

declare module "pijs-web/lite" {
	interface PluginCommands extends SoundCommands {}
	interface PluginOptions extends SoundOptions {}
}

/**
 * sound plugin initializer for Pi.js.
 */
declare function soundPlugin( pluginApi: PluginAPI ): void;
export default soundPlugin;
