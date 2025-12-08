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
- `addCommand( name, fn, parameterNames )` - Add global commands
- `addScreenCommand( name, fn, parameterNames )` - Add screen-specific commands
- `addPixelCommand( name, fn, parameterNames )` - Add pixel-mode commands
- `addAACommand( name, fn, parameterNames )` - Add anti-aliased mode commands

#### Screen Data Management
- `addScreenDataItem( name, value )` - Add custom data to screens
- `addScreenDataItemGetter( name, fn )` - Add dynamic screen data
- `addScreenInternalCommands( name, fn )` - Add internal helper functions

#### Lifecycle Hooks
- `addScreenInitFunction( fn )` - Hook into screen initialization
- `addScreenCleanupFunction( fn )` - Hook into screen cleanup

#### Utilities
- `getApi()` - Access main Pi.js API
- `utils` - Access to all Pi.js utility functions

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

1. **`test/test-plugin-system.html`** - Basic plugin system tests
   - Tests inline plugin registration
   - Tests plugin validation
   - Tests custom commands

2. **`test/test-example-plugin.html`** - Comprehensive example plugin tests (ESM)
   - Tests all example plugin commands
   - Interactive UI for testing
   - Uses ES modules

3. **`test/test-example-plugin-iife.html`** - IIFE format tests
   - Tests auto-registration
   - Beautiful animated demo
   - Uses `<script>` tags

## Features

### Multi-Format Support

The plugin system works seamlessly with both build formats:

**IIFE (Browser `<script>` tags)**
```html
<script src="build/pi.min.js"></script>
<script src="plugins/my-plugin/dist/my-plugin.min.js"></script>
<!-- Plugin auto-registers -->
```

**ESM (ES Modules)**
```javascript
import pi from "./build/pi.esm.min.js";
import myPlugin from "./plugins/my-plugin/dist/my-plugin.esm.min.js";

pi.registerPlugin( {
	"name": "my-plugin",
	"init": myPlugin
} );
```


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
	pluginApi.addScreenCommand( "increment", increment, [] );
	
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
   - `test/test-plugin-system.html` - Basic tests
   - `test/test-example-plugin.html` - ESM module tests
   - `test/test-example-plugin-iife.html` - IIFE tests (recommended)

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
3. Register plugins with `pi.registerPlugin()`
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

