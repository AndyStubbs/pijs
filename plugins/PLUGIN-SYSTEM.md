# Pi.js Plugin System

## Overview

Pi.js now includes a comprehensive plugin system that allows developers to extend the library's functionality without modifying the core code. The plugin system is fully compatible with both build formats: ESM and IIFE.

## What Was Implemented

### Core Files

1. **`src/core/plugins.js`** - Plugin system module
   - Plugin registration and validation
   - Plugin initialization
   - Plugin API creation
   - Commands: `registerPlugin()`, `getPlugins()`

2. **`src/index.js`** - Updated to initialize plugin system
   - Imports plugins module
   - Initializes plugins after all core modules

### Plugin API

The plugin API provides these capabilities:

#### Command Registration
- `addCommand( name, fn, isScreen, parameterNames, isScreenOptional )` - Add global or
  screen-specific commands. The final argument is optional.

#### Screen Data Management
- `addScreenDataItem( name, value )` - Add custom data to screens
- `addScreenDataItemGetter( name, fn )` - Add dynamic screen data

#### Lifecycle Hooks
- `addScreenInitFunction( fn )` - Hook into screen initialization
- `addScreenCleanupFunction( fn )` - Hook into screen cleanup

#### Utilities
- `getApi()` - Access main Pi.js API
- `utils` - Access to all Pi.js utility functions

#### Services
- `provideService( service )` - Publish one service object for plugins that depend on this one.
  Call it during `init` only. A second call throws `DUPLICATE_SERVICE`, a non-object throws
  `INVALID_SERVICE`, and a call after `init` returns throws `SERVICE_PROVIDE_CLOSED`. If `init`
  fails, the service is discarded.
- `getService( pluginName )` - Return the service of a plugin listed in this plugin's
  `dependencies`. It throws `SERVICE_NOT_AVAILABLE` when the plugin is not a declared
  dependency, is not initialized, or provided no service.

Dependencies initialize first, so a dependent plugin can call `getService()` inside its own
`init`:

```javascript
function audioToolsPlugin( pluginApi ) {
	const mixer = pluginApi.getService( "mixer" );
	pluginApi.addCommand( "mute", () => mixer.setLevel( 0 ), false, [] );
}

pi.registerPlugin( {
	"name": "mixer",
	"init": pluginApi => pluginApi.provideService( { "setLevel": level => {} } )
} );
pi.registerPlugin( {
	"name": "audio-tools",
	"dependencies": [ "mixer" ],
	"init": audioToolsPlugin
} );
```

#### Sound extension service

The `sound` plugin provides a service to plugins that list `"sound"` in their `dependencies`.
It lets them add sound sources, voice effects, bus effects, and PLAY commands while sharing
the audio context, buses, voice limits, and de-clicked stops of core. The `sound-advanced`
plugin is built entirely on it. The service is version 1; any change that breaks a member
below requires a new `version`.

| Member | Purpose |
| --- | --- |
| `version` | Interface version, `1` |
| `getContext()` | The shared `AudioContext`, created on first use |
| `createVoice( spec, name )` | Plays a voice and returns a sound ID. `spec` takes the `sound()` parameters plus `bus` (`"sfx"` or `"music"`) and `inserts`; `name` labels error messages |
| `registerSource( oType, factory )` | Adds a source type that `sound()`, `createVoice()`, and PLAY notes accept |
| `scheduleEnvelope( param, env, start, gateEnd, peak )` | Schedules an ADSR envelope (`attackTime`, `decayTime`, `sustainLevel`, `releaseTime`) on an `AudioParam` |
| `stopVoice( soundId, when )` | Fades a voice out by `when` (context time), or as soon as possible |
| `setBusVolume( bus, volume )` | Sets a bus volume after its effect; `"master"` is the same as `setVolume()` |
| `setBusInsert( bus, insert )` | Places one effect insert on a bus; `null` removes it |
| `tapBus( bus, node )` | Connects a bus output to `node` in parallel and returns an untap function; `"output"` taps the signal after the limiter |
| `registerPlayExtension( name, extension )` | Adds PLAY tokens, per-track state, and per-note voice overrides |
| `observePlay( listener )` | Reports admitted PLAY notes and song ends to `listener`; returns a function that removes it |

Buses are `"sfx"`, `"music"`, `"audio"`, and `"master"`. `tapBus` also accepts `"output"`,
the final signal after the limiter, which is what the speakers receive; `setBusVolume` and
`setBusInsert` do not. Core makes every connection between its nodes and an extension's
nodes; extensions never receive core nodes.

- **Sources.** `factory( context, spec )` receives a frozen spec (`oType`, `frequency`,
  `frequencyEnd`, `start`, `gate`, `end`, `offset`) and returns `{ output, frequency, detune,
  start( when ), stop( when ), onEnded( callback ), dispose() }`. `frequency` and `detune` are
  `AudioParam`s or `null`; core schedules pitch and sweeps on `frequency`. Core calls `start`
  once and `dispose` exactly once, and may call `stop` again with an earlier time, which must
  bring the stop forward. A source that was never started is disposed without `stop`. A
  factory that throws cleans up its own nodes.
- **Voice inserts.** `inserts` is an ordered array of `{ factory, params }` descriptors.
  `params` is copied and frozen, and `factory( context, params )` runs only when the voice is
  admitted, so pending sounds and queued songs hold no nodes. It returns `{ input, output,
  detune, start( when, gateEnd ), stop( when ), dispose() }`. Inserts are chained between the
  source and the voice envelope. An optional `detune` node is connected to the source's
  detune parameter, in cents, for vibrato and arpeggios. Stop and dispose follow the source
  rules.
- **Bus inserts.** `{ input, output, dispose }`. Replacing or removing one restores the
  direct route first, then disposes of the old insert. Bus volume follows the insert, so
  muting a bus also silences an effect's tail.
- **PLAY extensions.** `extension` has `tokens` (prefix → `handler( state, value )`),
  `initState()`, `copyState( state )` for comma tracks, and `resolveNote( state, note )`,
  which returns overrides for `frequency`, `frequencyEnd`, `gate`, `volume`, `envelope`,
  `pan`, `oType`, and `inserts`, or `null`. Notes resolve when `play()` is called. A prefix
  that core or another extension owns throws `DUPLICATE_PLAY_TOKEN`.
- **PLAY observers.** When the scheduler admits a note, `listener` receives a frozen
  `{ type: "note", trackId, track, time, duration, frequency, volume }`. `trackId` is the ID
  `play()` returned, `track` is the index of the comma-separated track, `time` is the audible
  start in context time, and `duration` runs from there to the end of the release. Notes are
  admitted up to the lookahead window before they sound, so a listener that acts at the
  audible time must schedule that itself. Expired, skipped, and rejected notes are not
  reported. When a song finishes or `stopPlay()` stops it, `listener` receives `{ type:
  "end", trackId, stopped }` once; a song with no notes ends during the `play()` call. A
  listener that throws is logged and does not affect playback or other listeners. Adding the
  same function twice registers it once. A listener that is not a function throws
  `INVALID_LISTENER`.

```javascript
function wobblePlugin( pluginApi ) {
	const sound = pluginApi.getService( "sound" );
	const wobble = {
		"factory": ( context, params ) => {
			const lfo = context.createOscillator();
			const depth = context.createGain();
			const pass = context.createGain();
			lfo.frequency.value = params.rate;
			depth.gain.value = params.cents;
			lfo.connect( depth );
			return {
				"input": pass,
				"output": pass,
				"detune": depth,
				"start": when => lfo.start( when ),
				"stop": when => lfo.stop( when ),
				"dispose": () => {
					lfo.disconnect();
					depth.disconnect();
					pass.disconnect();
				}
			};
		},
		"params": { "rate": 6, "cents": 30 }
	};
	pluginApi.addCommand( "wobble", options => sound.createVoice( {
		"frequency": options.frequency, "oType": "square", "inserts": [ wobble ]
	}, "wobble" ), false, [ "frequency" ] );
}

pi.registerPlugin( { "name": "wobble", "dependencies": [ "sound" ], "init": wobblePlugin } );
```

### Tools

1. **`scripts/build.js`** - Main build script
   - Builds Pi.js and all plugins automatically
   - Discovers all plugin directories with `index.js` files
   - Usage: `node scripts/build.js`

2. **`scripts/build-plugin.js`** - Individual plugin build script
   - Builds a single plugin during development
   - Usage: `node scripts/build-plugin.js <plugin-name>`

### Documentation

1. **`plugins/README.md`** - Comprehensive plugin documentation
   - Plugin system overview
   - Usage guide for all three formats
   - Plugin creation tutorial
   - API reference
   - Best practices
   - Example code

### Example Plugin

1. **`plugins/example-plugin/index.js`** - Full-featured example plugin
   - Demonstrates all plugin capabilities
   - Global commands: `hello()`, `getLibraryInfo()`
   - Screen commands: `trackClick()`, `drawRandomCircle()`
   - Screen data: Custom click tracking
   - Lifecycle hooks: Init and cleanup
   - Built versions: ESM and IIFE

2. **`plugins/example-plugin/README.md`** - Example plugin documentation

### Test Pages

1. **`test/tests/html-plugins/example_01.html`** - IIFE visual regression fixture
   - Tests auto-registration
   - Exercises the example plugin commands

2. **`test/tests/html-manual/example_01.html`** - ESM interactive fixture
   - Uses ES modules
   - Provides an animated manual demo

## Features

### Multi-Format Support

The plugin system works seamlessly with both build formats:

**IIFE (Browser `<script>` tags)**
```html
<script src="build/pi.min.js"></script>
<script src="build/plugins/my-plugin/my-plugin.min.js"></script>
<!-- Plugin auto-registers -->
```

**ESM (ES Modules)**
```javascript
import pi from "./build/pi.esm.min.js";
import "./build/plugins/my-plugin/my-plugin.esm.min.js";
```

Load Pi.js before the plugin. The ESM bundle auto-registers when `window.pi` already exists,
so importing the plugin is sufficient in a browser. The default export is also available for
controlled registration: import the plugin before Pi.js, then pass the initializer to
`pi.registerPlugin()` explicitly. Do not do both for the same plugin, because registration is
intentionally rejected when a plugin name is duplicated.


### Plugin Validation

The system validates:
- Plugin configuration structure
- Required properties (name, init)
- Duplicate plugin names
- Initialization errors

### Dynamic API Integration

- Plugins add commands to the Pi.js API dynamically
- Commands follow the same parameter parsing as core commands
- Screen commands work with the active screen
- Plugin commands integrate seamlessly with existing code

### Lifecycle Management

- Plugins can hook into screen initialization
- Plugins can hook into screen cleanup
- Each screen gets its own copy of plugin data
- Automatic cleanup when screens are removed

## Usage Example

### Creating a Plugin

```javascript
export default function myPlugin( pluginApi ) {
	// Add screen data
	pluginApi.addScreenDataItem( "myData", {
		"value": 0
	} );
	
	// Add a command
	pluginApi.addCommand( "increment", increment, true, [] );
	
	function increment( screenData ) {
		screenData.myData.value++;
		return screenData.myData.value;
	}
}

// Auto-register in IIFE mode
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "my-plugin",
		"version": "1.0.0",
		"init": myPlugin
	} );
}
```

### Using the Plugin

```javascript
pi.ready( () => {
	pi.screen( { "aspect": "300x200" } );
	
	console.log( pi.increment() );  // 1
	console.log( pi.increment() );  // 2
	console.log( pi.increment() );  // 3
} );
```

## Testing

To test the plugin system:

1. **Build Pi.js (plugins built automatically):**
   ```bash
   node scripts/build.js
   ```
   This builds both Pi.js and all plugins in one command.

2. **Open test pages in browser:**
   - `test/tests/html-plugins/example_01.html` - IIFE visual fixture
   - `test/tests/html-manual/example_01.html` - ESM interactive fixture

## Benefits

1. **Extensibility** - Add features without modifying core code
2. **Modularity** - Plugins are self-contained and reusable
3. **Compatibility** - Works with ESM and IIFE formats
4. **Type Safety** - Command system provides consistent parameter handling
5. **Clean API** - Plugins use the same patterns as core modules
6. **Easy Distribution** - Build scripts create ready-to-use bundles

## Next Steps

### For Plugin Developers

1. Read `plugins/README.md` for detailed documentation
2. Study `plugins/example-plugin/` for a complete example
3. Create your plugin in `plugins/your-plugin-name/index.js`
4. Run `node scripts/build.js` (builds Pi.js and all plugins)
5. Share your plugin!

### For Library Users

1. Find or create plugins for your needs
2. Load plugins using your preferred format (ESM or IIFE)
3. Load browser plugins after Pi.js so they auto-register; use `pi.registerPlugin()` explicitly
   only when controlling module evaluation or running without the browser auto-registration path
4. Use plugin commands like any other Pi.js command

## Migration Path

Existing Pi.js code works without any changes. The plugin system is purely additive:

- No breaking changes to core API
- All existing commands work as before
- Plugins add new capabilities
- Can enable/disable plugins as needed

## Architecture

The plugin system integrates with Pi.js's existing command system:

```
Pi.js Core
  ├─ Command System (src/core/commands.js)
  ├─ Screen Manager (src/core/screen-manager.js)
  └─ Plugin System (src/core/plugins.js)
       │
       ├─ Plugin Registration
       ├─ Plugin Validation
       ├─ Plugin API Creation
       └─ Plugin Initialization
            │
            └─ Plugins add commands via Plugin API
                 │
                 ├─ Global Commands
                 ├─ Screen Commands
                 ├─ Screen Data
                 └─ Lifecycle Hooks
```

## Future Enhancements

Possible future additions:
- Plugin dependency system
- Plugin versioning and compatibility checks
- Plugin configuration options
- Async plugin loading
- Plugin marketplace/registry
- TypeScript definitions for plugins

## Conclusion

The Pi.js plugin system provides a powerful, flexible way to extend the library while maintaining compatibility with all build formats and existing code. It follows Pi.js coding conventions and integrates seamlessly with the command system.

Happy plugin development! 🎨

