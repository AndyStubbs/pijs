# Pi.js Tracks

A retro music maker for the browser, built with [Pi.js](https://pijs.org) and its
`sound-advanced` plugin. Beginners can make a good-sounding tune in minutes, and
experienced users can shape instruments, chords, effects and arrangements. Every song is
stored as plain Pi.js code, so it plays in any Pi.js program.

## Running

Browsers only play sound on pages served over HTTP(S). The page loads Pi.js and the
`sound-advanced` plugin from the repository's `build/` folder, so build the library and
start the repository server from the repository root:

```bash
npm run build
```

```bash
npm run server
```

Then open <http://localhost:8080/test/demos/music-maker/> and click to start (browsers keep
audio off until you click or press a key).

## Features

- **Piano-roll and drum grid**: click to add notes, drag to lengthen or move them, and
  right-click to make them softer. Drum tracks get big pads.
- **Always in key**: LOCK shows only notes in the song's key, and the notes of each bar's
  chord glow on the grid. Changing key or scale moves your notes with it, so a major tune
  can become minor.
- **Chords**: pick a progression (I-V-vi-IV and others) or click a bar's chord name to
  change it.
- **Magic**: writes a melody, chord pads, stabs, jazzy 7ths, arpeggios, basslines or drum
  beats for the selected track, following your chords.
- **Up to 8 tracks** with 20 instrument presets (chip leads, saw leads, pads, strings,
  e-piano, bells, plucks, arps, basses) and 3 drum kits. EDIT opens a synth editor with
  wave, envelope, filter sweep, vibrato, tremolo and arpeggio.
- **Effects**: reverb, echo (synced to tempo), chorus and bit-crush on the music bus.
- **Play live**: Z-M and Q-U play the selected track like a piano, and a note sounds for as
  long as its key is down.
- **Save and load**: SAVE keeps the song in the browser under its title. LOAD lists your
  saved songs and the demo songs (Chip Quest, Neon Drive, Rainy Lofi, Dungeon Crawl,
  Korobeiniki, or a blank song) on two tabs, and imports a song file.
- **Songs as code**: CODE shows the song as Pi.js commands and EXPORT downloads it as a
  `.js` file. LOAD's IMPORT FILE, paste (Ctrl+V) or drag-and-drop reads it back. Hand
  edits to the `play()` strings are picked up. Any plain Pi.js `play()` code can be
  imported too.
- **WAV export**: records the song (1x, 2x or 4x) and saves a 16-bit stereo `.wav`.
- **Help**: HELP opens a scrolling guide to every part of the editor. TIPS turns on pop-up
  tips: point at any button, slider or part of the screen to see what it does.
- Undo/redo, and the song you are working on autosaves in the browser.

## Keys

| Key | Action |
|---|---|
| Space | Play / stop |
| Ctrl+Z / Ctrl+Y | Undo / redo |
| Z-M, Q-U | Play notes (drum tracks: Z-M are the 8 drums) |
| Arrows | Change page / scroll notes |
| Esc | Close a panel |

## Example exported code

```javascript
function playSong() {
	$.defineInstrument( 1, { "oType": "pulse", "duty": 0.25, "volume": 0.5, ... } ); // LEAD (CHIP LEAD)
	$.defineInstrument( 3, { "oType": "triangle", "volume": 0.9, ... } ); // BASS (CHIP BASS)
	$.setBusEffect( "music", [ { "effect": "delay", ... }, { "effect": "reverb", ... } ] );
	return [
		$.play( // voice 1
			"T150 @1 V80 MP0 MN MR0 L4 " +
			"O4 G B8 V48 O5 C8 V80 O4 G F8 V48 G8 V80 G8 V48 F8 V80 G D F " + ...
		),
		$.play( // voice 1
			"T150 @3 V80 MP0 MN MR0 L8 " +
			"O2 C O3 C O2 C O3 C O2 C O3 C O2 C O3 C O1 G O2 G ..." + ...
		),
	];
}
```

## Project layout

```
index.html        Page: loads Pi.js, the sound-advanced plugin and src/app.js
src/              App modules
tests/            Node tests for code generation, parsing and music helpers (node --test)
```

Pi.js and its plugins are loaded from `build/` at the repository root.

## License

Pi.js is © Andy Stubbs, Apache-2.0.
