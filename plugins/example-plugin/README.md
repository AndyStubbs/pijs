# Example Plugin

A simple example plugin that demonstrates Pi.js plugin capabilities.

## Features

- **Global Commands**: Add commands that work without a screen
- **Screen Commands**: Add commands that operate on screens
- **Custom Data**: Attach custom data to each screen
- **Lifecycle Hooks**: Initialize and clean up when screens are created/removed
- **Utilities**: Use Pi.js utility functions

## Commands

### `hello( name )`

Prints a greeting message.

**Parameters:**
- `name` (string, optional): Name to greet. Defaults to "World".

**Returns:** Greeting string

**Example:**
```javascript
pi.hello( "Pi.js" );  // "Hello, Pi.js!"
pi.hello();           // "Hello, World!"
```

### `trackClick( x, y )`

Tracks clicks on the screen and increments a counter.

**Parameters:**
- `x` (number, optional): Click X coordinate
- `y` (number, optional): Click Y coordinate

**Returns:** Total number of clicks

**Example:**
```javascript
pi.trackClick( 100, 200 );  // Click #1 at (100, 200)
pi.trackClick( 150, 250 );  // Click #2 at (150, 250)
```

### `getLibraryInfo()`

Gets information about Pi.js and the plugin system.

**Returns:** Object with version and plugin info

**Example:**
```javascript
const info = pi.getLibraryInfo();
console.log( info );  // { version: "1.2.4", pluginSystem: "enabled" }
```

### `drawRandomCircle( x, y, radius )`

Draws a circle with a random color.

**Parameters:**
- `x` (number, optional): Circle center X
- `y` (number, optional): Circle center Y
- `radius` (number, optional): Circle radius. Defaults to 50.

**Example:**
```javascript
pi.drawRandomCircle( 200, 150, 75 );
```

## Usage

### Browser (IIFE)

```html
<script src="../../build/pi.min.js"></script>
<script src="dist/example-plugin.min.js"></script>

<script>
	pi.ready( () => {
		pi.screen( { "aspect": "16:9" } );
		pi.hello( "Plugin User" );
		pi.drawRandomCircle( 200, 150, 75 );
	} );
</script>
```

### ES Modules

```javascript
import pi from "../../build/pi.esm.min.js";
import examplePlugin from "./plugins/example-plugin/dist/example-plugin.esm.min.js";

pi.registerPlugin( {
	"name": "example-plugin",
	"init": examplePlugin
} );

pi.ready( () => {
	pi.screen( { "aspect": "16:9" } );
	pi.hello( "Plugin User" );
	pi.drawRandomCircle( 200, 150, 75 );
} );
```

## Building

This plugin is **built automatically** when you run:

```bash
node scripts/build.js
```

Or build just this plugin:

```bash
node scripts/build-plugin.js example-plugin
```

This creates (in the `dist/` directory):
- `example-plugin.esm.js` (ES Module)
- `example-plugin.esm.min.js` (ES Module, minified)
- `example-plugin.js` (IIFE for browsers)
- `example-plugin.min.js` (IIFE, minified)

## Screen Data

The plugin adds `exampleData` to each screen:

```javascript
{
	clicks: 0,        // Number of tracked clicks
	timestamp: null   // Screen creation timestamp
}
```

Access in your code:
```javascript
const screenData = pi.screen();
// After calling trackClick():
console.log( screenData.exampleData.clicks );
```

## License

Apache-2.0

