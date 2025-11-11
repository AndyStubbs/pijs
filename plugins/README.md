# Pi.js Plugins

This directory contains plugins that extend Pi.js functionality. Plugins allow you to add custom commands, screen commands, and additional features without modifying the core library.

## Table of Contents

- [What are Plugins?](#what-are-plugins)
- [Using Existing Plugins](#using-existing-plugins)
- [Creating Your Own Plugin](#creating-your-own-plugin)
- [Plugin API Reference](#plugin-api-reference)
- [Building Plugins](#building-plugins)
- [Best Practices](#best-practices)
- [Example Plugins](#example-plugins)

---

## What are Plugins?

Plugins are modular extensions that can:
- Add new commands to the Pi.js API
- Add screen-specific commands
- Extend screen data with custom properties
- Hook into screen initialization and cleanup
- Provide additional utilities and features

Plugins work seamlessly with both build formats:
- **ESM** (ES Modules)
- **IIFE** (Immediately Invoked Function Expression for `<script>` tags)

---

## Using Existing Plugins

### Browser (IIFE with `<script>` tags)

The simplest way to use plugins in the browser:

```html
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Pi.js with Plugin</title>
</head>
<body>
	<!-- Load Pi.js -->
	<script src="build/pi.min.js"></script>
	
	<!-- Load plugin (auto-registers itself) -->
	<script src="plugins/my-plugin/dist/my-plugin.min.js"></script>
	
	<script>
		pi.ready( () => {
			pi.screen( { "aspect": "16:9" } );
			
			// Use plugin commands
			pi.myPluginCommand( "hello" );
		} );
	</script>
</body>
</html>
```

### ES Modules (ESM)

For modern JavaScript projects:

```javascript
import pi from "./build/pi.esm.min.js";
import myPlugin from "./plugins/my-plugin/dist/my-plugin.esm.min.js";

// Register the plugin
pi.registerPlugin( {
	"name": "my-plugin",
	"init": myPlugin
} );

pi.ready( () => {
	pi.screen( { "aspect": "16:9" } );
	pi.myPluginCommand( "hello" );
} );
```

---

## Creating Your Own Plugin

### Basic Plugin Structure

Create a new directory in `plugins/` with your plugin name:

```
plugins/
  my-plugin/
    index.js           # Source code
    README.md          # Plugin documentation
    package.json       # Optional: Plugin metadata
```

### Minimal Plugin Example

**`plugins/my-plugin/index.js`:**

```javascript
/**
 * My Custom Plugin for Pi.js
 * 
 * @param {Object} pluginApi - Plugin API provided by Pi.js
 */
export default function myPlugin( pluginApi ) {
	
	// Add a simple command
	pluginApi.addCommand( "hello", hello, false, [ "message" ] );
	
	function hello( options ) {
		const message = options.message || "Hello, Pi.js!";
		console.log( message );
		return message;
	}
	
	// Add a screen command
	pluginApi.addCommand( "drawCustomShape", drawCustomShape, true, [ "x", "y", "size" ] );
	
	function drawCustomShape( screenData, options ) {
		const x = options.x || 0;
		const y = options.y || 0;
		const size = options.size || 10;
		
		screenData.api.rect( x, y, size, size );
	}
}

// Auto-register in IIFE mode
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "my-plugin",
		"version": "1.0.0",
		"description": "My custom plugin",
		"init": myPlugin
	} );
}
```

### Advanced Plugin Example

**`plugins/advanced-plugin/index.js`:**

```javascript
/**
 * Advanced Plugin Example
 * 
 * Demonstrates screen data, initialization hooks, and utilities.
 */
export default function advancedPlugin( pluginApi ) {
	
	// Add custom data to each screen
	pluginApi.addScreenDataItem( "myPluginState", {
		"counter": 0,
		"enabled": true
	} );
	
	// Add initialization hook
	pluginApi.addScreenInitFunction( ( screenData ) => {
		console.log( `Advanced plugin initialized for screen ${screenData.id}` );
		
		// Set up initial state
		screenData.myPluginState.counter = 0;
	} );
	
	// Add cleanup hook
	pluginApi.addScreenCleanupFunction( ( screenData ) => {
		console.log( `Advanced plugin cleanup for screen ${screenData.id}` );
	} );
	
	// Add command that uses screen data
	pluginApi.addCommand( "incrementCounter", incrementCounter, true, [] );
	
	function incrementCounter( screenData ) {
		screenData.myPluginState.counter++;
		return screenData.myPluginState.counter;
	}
	
	// Add command that accesses the main API
	pluginApi.addCommand( "getApiVersion", getApiVersion, false, [] );
	
	function getApiVersion() {
		const api = pluginApi.getApi();
		return api.version;
	}
	
	// Use utility functions
	pluginApi.addCommand( "randomColor", randomColor, false, [] );
	
	function randomColor() {
		const utils = pluginApi.utils;
		const r = Math.floor( utils.rndRange( 0, 256 ) );
		const g = Math.floor( utils.rndRange( 0, 256 ) );
		const b = Math.floor( utils.rndRange( 0, 256 ) );
		return utils.rgbToColor( r, g, b, 255 );
	}
}

// Auto-register in IIFE mode
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "advanced-plugin",
		"version": "1.0.0",
		"description": "Advanced plugin demonstrating all features",
		"init": advancedPlugin
	} );
}
```

---

## Plugin API Reference

The `pluginApi` object passed to your plugin's `init` function provides these methods:

### Commands

#### `addCommand( name, fn, isScreen, parameterNames )`

Add a global command to the Pi.js API.

- **name** (string): Command name (will be available as `pi.commandName()`)
- **fn** (function): Command function that receives `options` object
- **parameterNames** (array): Array of parameter names

**Example:**
```javascript
pluginApi.addCommand( "myCommand", myFn, false, [ "param1", "param2" ] );

function myFn( options ) {
	console.log( options.param1, options.param2 );
}

// Usage:
pi.myCommand( "a", "b" );  // Positional
pi.myCommand( { "param1": "a", "param2": "b" } );  // Named
```

### Screen Data

#### `addScreenDataItem( name, value )`

Add custom data to all screens. The value will be cloned for each screen.

**Example:**
```javascript
pluginApi.addScreenDataItem( "myData", {
	"value": 0,
	"enabled": true
} );

// Access in commands:
function myCommand( screenData ) {
	screenData.myData.value++;
}
```

#### `addScreenDataItemGetter( name, fn )`

Add dynamic screen data that's generated when each screen is created.

### Lifecycle Hooks

#### `addScreenInitFunction( fn )`

Register a function to be called when each screen is initialized.

**Example:**
```javascript
pluginApi.addScreenInitFunction( ( screenData ) => {
	screenData.myData.initialized = true;
} );
```

#### `addScreenCleanupFunction( fn )`

Register a function to be called when a screen is removed.

**Example:**
```javascript
pluginApi.addScreenCleanupFunction( ( screenData ) => {
	// Clean up resources
	screenData.myData = null;
} );
```

### Utilities

#### `getApi()`

Get reference to the main Pi.js API object.

**Example:**
```javascript
const api = pluginApi.getApi();
console.log( api.version );
```

#### `utils`

Access to Pi.js utility functions (see `src/core/utils.js`):

- `parseOptions( args, parameterNames )` - Parse function arguments
- `isFunction( fn )` - Check if value is a function
- `isDomElement( el )` - Check if value is a DOM element
- `isObjectLiteral( obj )` - Check if value is a plain object
- `convertToColor( color )` - Convert color formats
- `rgbToColor( r, g, b, a )` - Create color object
- `clamp( num, min, max )` - Clamp number to range
- `inRange( point, hitBox )` - Check point in rectangle
- `rndRange( min, max )` - Random number in range
- `degreesToRadian( deg )` - Convert degrees to radians
- `radiansToDegrees( rad )` - Convert radians to degrees
- `padL( str, len, c )` - Pad string left
- `pad( str, len, c )` - Pad string center
- `getInt( val, def )` - Parse integer with default
- And more...

---

## Building Plugins

### Automatic Build

**Plugins are built automatically** when you build Pi.js:

```bash
node scripts/build.js
```

This will:
1. Build Pi.js in both formats (ESM and IIFE)
2. Automatically discover and build all plugins in the `plugins/` directory
3. Generate both minified and unminified versions
4. Output plugin builds to `plugins/<plugin-name>/dist/`
5. Skip any directories without an `index.js` file

### Build Individual Plugin

To build a single plugin during development:

```bash
node scripts/build-plugin.js my-plugin
```

This is useful when you're actively developing a plugin and don't want to rebuild Pi.js every time.

### Using the Source File Directly

For simple plugins, you can just use the `index.js` source file directly without building. Modern browsers support ES modules:

```html
<script type="module">
	import pi from "./build/pi.esm.min.js";
	import myPlugin from "./plugins/my-plugin/index.js";
	
	pi.registerPlugin( {
		"name": "my-plugin",
		"init": myPlugin
	} );
</script>
```

---

## Best Practices

### 1. **Naming Conventions**

- Use descriptive, unique command names to avoid conflicts
- Prefix commands with your plugin name if needed: `myPlugin_command()`
- Follow Pi.js naming conventions (camelCase)

### 2. **Error Handling**

- Validate parameters in your commands
- Throw descriptive errors with error codes
- Use try-catch for async operations

**Example:**
```javascript
function myCommand( options ) {
	if( typeof options.value !== "number" ) {
		const error = new TypeError( "myCommand: value must be a number" );
		error.code = "INVALID_VALUE";
		throw error;
	}
	// ... rest of implementation
}
```

### 3. **Documentation**

- Include JSDoc comments for all functions
- Create a README.md for your plugin
- Document all commands and their parameters
- Provide usage examples

### 4. **Compatibility**

- Support both build formats (ESM and IIFE)
- Test in browser environments
- Don't depend on external libraries unless necessary
- Use Pi.js utilities when available

### 5. **Resource Management**

- Clean up resources in cleanup hooks
- Avoid memory leaks
- Don't modify core Pi.js objects
- Use screen data for per-screen state

### 6. **Testing**

- Test your plugin with different screen configurations
- Test command parameter variations
- Test with multiple screens active
- Test screen removal and cleanup

---

## Example Plugins

### Simple Drawing Plugin

```javascript
export default function drawingTools( pluginApi ) {
	
	// Draw a star
	pluginApi.addCommand( "star", star, true, [ "x", "y", "radius", "points" ] );
	
	function star( screenData, options ) {
		const x = options.x || 0;
		const y = options.y || 0;
		const radius = options.radius || 50;
		const points = options.points || 5;
		const innerRadius = radius * 0.5;
		
		let px1, py1;
		for( let i = 0; i < points * 2; i++ ) {
			const r = i % 2 === 0 ? radius : innerRadius;
			const angle = ( i * Math.PI ) / points;
			const px2 = x + r * Math.cos( angle - Math.PI / 2 );
			const py2 = y + r * Math.sin( angle - Math.PI / 2 );
			
			if( i !== 0 ) {
				screenData.api.line( px1, py1, px2, py2 );
			}
			px1 = px2;
			py1 = py2;
		}
	}
}

if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "drawing-tools",
		"version": "1.0.0",
		"init": drawingTools
	} );
}
```

**Usage:**
```javascript
pi.screen( { "aspect": "400x300" } );
pi.color( "yellow" );
pi.star( 100, 100, 50, 5 );  // Draw a 5-pointed star
```

### State Management Plugin

```javascript
export default function stateManager( pluginApi ) {
	
	// Add state storage to each screen
	pluginApi.addScreenDataItem( "state", {} );
	
	// Set state
	pluginApi.addCommand( "setState", setState, true, [ "key", "value" ] );
	
	function setState( screenData, options ) {
		screenData.state[ options.key ] = options.value;
	}
	
	// Get state
	pluginApi.addCommand( "getState", getState, true, [ "key" ] );
	
	function getState( screenData, options ) {
		return screenData.state[ options.key ];
	}
	
	// Clear state
	pluginApi.addCommand( "clearState", clearState, true, [] );
	
	function clearState( screenData ) {
		screenData.state = {};
	}
}

if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "state-manager",
		"version": "1.0.0",
		"init": stateManager
	} );
}
```

**Usage:**
```javascript
pi.setState( "score", 100 );
pi.setState( "level", 1 );
console.log( pi.getState( "score" ) );  // 100
pi.clearState();
```

---

## Getting Plugin List

You can check which plugins are registered:

```javascript
const plugins = pi.getPlugins();
console.log( plugins );
// [
//   { name: "my-plugin", version: "1.0.0", description: "...", initialized: true },
//   ...
// ]
```

---

## Support

For questions or issues:
- Check the main Pi.js documentation
- Review the source code in `src/core/plugins.js`
- Look at example plugins in this directory
- Examine how core modules use the command system

---

## Contributing

To contribute a plugin:
1. Create your plugin in the `plugins/` directory
2. Follow the coding conventions in the main Pi.js style guide
3. Include comprehensive documentation
4. Test thoroughly
5. Submit a pull request

Happy plugin development! 🎨

