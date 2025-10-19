# Sound Module Implementation

**Date:** October 19, 2025  
**Status:** Complete ✅

## Overview

The sound system has been successfully ported from the legacy Pi.js codebase to the new modular architecture. This includes both basic sound effects (sound.js) and BASIC-style music notation (play.js).

## Files Created

### Core Modules

1. **src/modules/sound.js** (635 lines)
   - Sound effects using Web Audio API
   - Audio pool management for overlapping sounds
   - Global volume control
   - ADSR envelope support

2. **src/modules/play.js** (700 lines)
   - BASIC-style music notation parser
   - Multi-track support
   - Musical commands (tempo, octave, volume, etc.)
   - Multiple waveform types

### Test Files

3. **test/tests/html-manual/sound_01.html**
   - Basic sound testing
   - Waveform comparison
   - ADSR envelope testing
   - Volume control testing

4. **test/tests/html-manual/play_01.html**
   - Musical notation examples
   - Scale and melody playback
   - Command testing
   - Multi-track/chord examples

5. **test/tests/html-manual/audiopool_01.html**
   - Audio pool creation
   - Overlapping sound playback
   - Volume control per sound

## API Reference

### Sound Effects (sound.js)

#### `sound( options )`
Play a sound by frequency using Web Audio API.

**Parameters:**
- `frequency` (number): Frequency in Hz
- `duration` (number, default: 1): Duration in seconds
- `volume` (number, default: 1): Volume (0-1)
- `oType` (string|Array, default: "triangle"): Waveform type or custom wave table
- `delay` (number, default: 0): Delay before playing in seconds
- `attack` (number, default: 0): Attack time in seconds
- `decay` (number, default: 0.1): Decay time in seconds

**Returns:** Sound ID string

**Example:**
```javascript
// Play a 440Hz beep for 0.5 seconds
$.sound( { "frequency": 440, "duration": 0.5 } );

// Play with custom envelope
$.sound( {
	"frequency": 523.25,
	"duration": 1.0,
	"volume": 0.8,
	"attack": 0.1,
	"decay": 0.2,
	"oType": "sine"
} );
```

#### `stopSound( soundId )`
Stop a playing sound or all sounds.

**Parameters:**
- `soundId` (string, optional): Sound ID to stop (null to stop all)

**Example:**
```javascript
const id = $.sound( { "frequency": 440, "duration": 5 } );
$.stopSound( id ); // Stop this specific sound
$.stopSound( null ); // Stop all sounds
```

#### `setVolume( volume )`
Set global volume for all sounds.

**Parameters:**
- `volume` (number): Volume level (0-1)

**Example:**
```javascript
$.setVolume( 0.5 ); // 50% volume
```

#### `createAudioPool( src, poolSize )`
Create an audio pool for playing multiple instances of the same sound.

**Parameters:**
- `src` (string): Audio file URL
- `poolSize` (number, default: 1): Number of audio instances

**Returns:** Audio pool ID string

**Example:**
```javascript
const poolId = $.createAudioPool( "sounds/laser.mp3", 5 );

// Wait for loading
$.ready( () => {
	$.playAudioPool( poolId );
} );
```

#### `deleteAudioPool( audioId )`
Delete an audio pool and free its resources.

**Parameters:**
- `audioId` (string): Audio pool ID

**Example:**
```javascript
$.deleteAudioPool( poolId );
```

#### `playAudioPool( audioId, volume, startTime, duration )`
Play audio from an audio pool.

**Parameters:**
- `audioId` (string): Audio pool ID
- `volume` (number, default: 1): Volume (0-1)
- `startTime` (number, default: 0): Start time in seconds
- `duration` (number, default: 0): Play duration in seconds (0 = full)

**Example:**
```javascript
$.playAudioPool( poolId, 0.8, 0, 1.5 ); // Play at 80% volume for 1.5 seconds
```

#### `stopAudioPool( audioId )`
Stop audio from an audio pool or all audio pools.

**Parameters:**
- `audioId` (string, optional): Audio pool ID (null to stop all)

**Example:**
```javascript
$.stopAudioPool( poolId ); // Stop specific pool
$.stopAudioPool( null ); // Stop all pools
```

### Music Playback (play.js)

#### `play( playString )`
Play music using BASIC-style notation.

**Parameters:**
- `playString` (string): Music notation string

**Notation:**
- Notes: `A`, `B`, `C`, `D`, `E`, `F`, `G`
- Sharps: `#` or `+` (e.g., `C#`, `F+`)
- Flats: `-` (e.g., `B-`, `E-`)
- Octave: `O[0-9]` (e.g., `O4`)
- Octave shift: `<` (down), `>` (up)
- Note length: `[1-64]` (e.g., `C4` = quarter note)
- Dotted notes: `.` or `..` (e.g., `C4.`, `C4..`)
- Default length: `L[1-64]` (e.g., `L4` = quarter notes)
- Tempo: `T[32-255]` (e.g., `T120` = 120 BPM)
- Volume: `V[0-100]` (e.g., `V75` = 75%)
- Pause: `P[1-64]` (e.g., `P4` = quarter rest)
- Note by number: `N[0-127]` (e.g., `N60` = middle C)
- Waveforms: `SINE`, `SQUARE`, `SAWTOOTH`, `TRIANGLE`
- Styles: `MS` (staccato), `MN` (normal), `ML` (legato)
- Full note: `MW` (toggle)
- Multiple tracks: separate with commas

**Example:**
```javascript
// Play C major scale
$.play( "C D E F G A B C5" );

// Play Mary Had a Little Lamb
$.play( "L4 E D C D E E E2 D D D2 E G G2 E D C D E E E E D D E D C2" );

// Play a C major chord (3 simultaneous tracks)
$.play( "C2, E2, G2" );

// Complex example with tempo and volume changes
$.play( "T120 V100 O4 C D E F V75 G A V50 B C5" );
```

#### `stopPlay( trackId )`
Stop playing music.

**Parameters:**
- `trackId` (number, optional): Track ID to stop (null to stop all)

**Example:**
```javascript
$.stopPlay( null ); // Stop all music
```

## Architecture Details

### Sound Module (sound.js)

**Key Features:**
- Web Audio API integration
- Oscillator-based sound generation
- Support for sine, square, sawtooth, and triangle waves
- Custom wave tables via periodic waves
- ADSR envelope (attack, sustain, decay)
- Global master volume with real-time updates
- Audio pool system for overlapping sounds
- Automatic cleanup of completed sounds

**Internal Structure:**
```javascript
// Global state
m_audioContext - Shared Web Audio context
m_audioPools   - Audio pool storage
m_soundPool    - Active sound storage
m_volume       - Global volume (0-1)

// Key functions
createSound()  - Internal sound creation
loadAudio()    - Audio pool loading with retry logic
```

### Play Module (play.js)

**Key Features:**
- BASIC/QBasic PLAY command compatibility
- Full music notation parser
- Multiple simultaneous tracks (chords)
- Note frequency tables (10 octaves)
- Tempo control (32-255 BPM)
- Dynamic volume, attack, sustain, decay
- Multiple waveforms
- Staccato, legato, and normal articulation
- Custom wave tables

**Internal Structure:**
```javascript
// Note data
m_notesData  - Note frequencies by name (A-G#)
m_allNotes   - Note frequencies by number (0-127)

// Track management
m_tracks     - Active track storage
m_allTracks  - Track ID list
m_playData   - Sorted sound events

// Key functions
createTrack()     - Parse play string into track
playTrack()       - Recursive track playback
processNote()     - Note parsing (sharps, flats, dots)
processMusic()    - Music style commands (MS, MN, ML)
processWaveform() - Waveform commands (WS, WQ, WW, WT)
playNote()        - Schedule single note
```

## Integration with New Architecture

### Module Initialization

Both modules are initialized in `src/index.js`:

```javascript
import * as sound from "./modules/sound.js";
import * as play from "./modules/play.js";

// ...

sound.init();
play.init();
```

### Command Registration

Commands are registered via the new command system:

```javascript
// sound.js
commands.addCommand( "sound", sound, [ "frequency", "duration", ... ] );
commands.addCommand( "setVolume", setVolume, [ "volume" ] );

// play.js
commands.addCommand( "play", play, [ "playString" ] );
```

### Utility Functions Added

Added to `src/core/utils.js`:

```javascript
export const isArray = ( arr ) => Array.isArray( arr );
export function getFloat( val, def ) { ... }
```

### Ready System Integration

Audio pools integrate with the ready system:

```javascript
// In sound.js loadAudio()
commands.wait();  // Before loading
commands.done();  // When loaded or on error
```

## Error Handling

Modern typed errors with error codes:

```javascript
// Invalid parameter
const error = new TypeError( "sound: Parameter oType must be a string or an array." );
error.code = "INVALID_OTYPE";
throw error;

// Range errors
const error = new RangeError( "sound: Parameter volume must be between 0 and 1." );
error.code = "INVALID_VOLUME";
throw error;

// Resource not found
const error = new Error( `stopAudioPool: Audio pool "${audioId}" not found.` );
error.code = "AUDIO_POOL_NOT_FOUND";
throw error;
```

## Browser Compatibility

- Uses Web Audio API (all modern browsers)
- Falls back to webkitAudioContext for older Safari
- Audio element used for file-based sounds
- Canvas-free operation

## Performance Considerations

1. **Audio Pool System**: Prevents audio context overhead by reusing Audio elements
2. **Sound Cleanup**: Automatic cleanup via setTimeout prevents memory leaks
3. **Shared Context**: Single AudioContext shared across all sounds
4. **Optimized Playback**: Pre-sorted play data for efficient scheduling

## Future Enhancements

Possible future additions:

1. Audio sprite support
2. 3D spatial audio
3. Audio filters and effects
4. MIDI file support
5. Microphone input
6. Audio recording/export

## Testing

Manual test files created:

1. `sound_01.html` - Basic sound testing
2. `play_01.html` - Music notation testing
3. `audiopool_01.html` - Audio pool testing

To test:
```bash
npm run server
# Navigate to http://localhost:8080/test/tests/html-manual/sound_01.html
```

## Migration Notes

### Changes from Legacy

1. **Module Pattern**: Uses ES6 modules instead of IIFE
2. **Modern JS**: Uses const/let, arrow functions
3. **Error Handling**: Uses typed errors with codes
4. **Command Registration**: Uses new command system
5. **Ready System**: Integrates with new ready/wait/done system

### API Compatibility

- ✅ 100% compatible with legacy `$.sound()`
- ✅ 100% compatible with legacy `$.play()`
- ✅ 100% compatible with audio pool API
- ✅ All legacy play string commands supported

### Breaking Changes

None - full backward compatibility maintained.

## Conclusion

The sound system has been successfully ported to the new Pi.js architecture with:

- ✅ 11 API methods implemented
- ✅ Full legacy compatibility
- ✅ Modern code standards
- ✅ Comprehensive error handling
- ✅ Manual test coverage
- ✅ Integration with command system
- ✅ Integration with ready system

Next priority: Input system (keyboard, mouse, touch, gamepad) - 37 APIs remaining.

