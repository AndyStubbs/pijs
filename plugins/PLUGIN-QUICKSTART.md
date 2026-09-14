# Pi.js Plugin System - Quick Start

## ⚡ 5-Minute Quick Start

### 1. Test the Plugin System (Right Now!)

Open any of these test pages in your browser:

```
test/tests/html-plugins/example_01.html  ← Automated visual fixture
test/tests/html-manual/example_01.html   ← Interactive manual fixture
```

### 2. Use the Example Plugin

**Option A: With Script Tags (Browser)**
```html
<!DOCTYPE html>
<html>
<body>
	<script src="build/pi.min.js"></script>
	<script src="build/plugins/example-plugin/example-plugin.min.js"></script>
	<script>
		pi.ready( () => {
			pi.screen( { "aspect": "300x200" } );
			pi.hello( "World" );                    // Plugin command!
			pi.drawRandomCircle( 200, 150, 50 );    // Plugin command!
		} );
	</script>
</body>
</html>
```

**Option B: With ES Modules (Modern)**
```html
<!DOCTYPE html>
<html>
<body>
	<script type="module">
		import pi from "./build/pi.esm.min.js";
		import "./build/plugins/example-plugin/example-plugin.esm.min.js";
		
		pi.ready( () => {
			pi.screen( { "aspect": "300x200" } );
			pi.hello( "Plugin User" );
		} );
	</script>
</body>
</html>
```

### 3. Create Your First Plugin (5 minutes)

**Step 1:** Create file `plugins/my-first-plugin/index.js`

```javascript
export default function myFirstPlugin( pluginApi ) {
	
	// Add a simple command
	pluginApi.addCommand( "greet", greet, false, [ "name" ] );
	
	function greet( options ) {
		const name = options.name || "Friend";
		alert( `Hello, ${name}!` );
	}
	
	// Add a drawing command
	pluginApi.addCommand( "drawStar", drawStar, true, [ "x", "y", "size" ] );
	
	function drawStar( screenData, options ) {
		const x = options.x || 100;
		const y = options.y || 100;
		const size = options.size || 50;
		
		// Draw a simple star
		for( let i = 0; i < 5; i++ ) {
			const angle = ( i * 4 * Math.PI ) / 5 - Math.PI / 2;
			const px = x + size * Math.cos( angle );
			const py = y + size * Math.sin( angle );
			screenData.api.line( x, y, px, py );
		}
	}
}

// Auto-register for IIFE
if( typeof window !== "undefined" && window.pi ) {
	window.pi.registerPlugin( {
		"name": "my-first-plugin",
		"version": "1.0.0",
		"init": myFirstPlugin
	} );
}
```

**Step 2:** Build Pi.js and all plugins

```bash
node scripts/build.js
```

This automatically builds your plugin along with Pi.js!

**Step 3:** Use your plugin!

```html
<!DOCTYPE html>
<html>
<body>
	<div id="container"></div>
	
	<script src="build/pi.min.js"></script>
	<script src="build/plugins/my-first-plugin/my-first-plugin.min.js"></script>
	<script>
		pi.ready( () => {
			pi.screen( { "aspect": "300x200", "container": "container" } );
			
			// Your plugin commands!
			pi.greet( "World" );
			pi.setColor( "yellow" );
			pi.drawStar( 200, 150, 50 );
		} );
	</script>
</body>
</html>
```

## 🎯 Common Plugin Patterns

### Pattern 1: Add Screen Data

```javascript
export default function counterPlugin( pluginApi ) {
	// Add data to each screen
	pluginApi.addScreenDataItem( "counter", 0 );
	
	// Increment command
	pluginApi.addCommand( "increment", increment, true, [] );
	function increment( screenData ) {
		screenData.counter++;
		return screenData.counter;
	}
	
	// Get counter command
	pluginApi.addCommand( "getCounter", getCounter, true, [] );
	function getCounter( screenData ) {
		return screenData.counter;
	}
}
```

Usage:
```javascript
pi.increment();       // 1
pi.increment();       // 2
pi.getCounter();      // 2
```

### Pattern 2: Use Lifecycle Hooks

```javascript
export default function setupPlugin( pluginApi ) {
	// Run when screen is created
	pluginApi.addScreenInitFunction( ( screenData ) => {
		console.log( `Screen ${screenData.id} created!` );
		screenData.myData = { "initialized": true };
	} );
	
	// Run when screen is removed
	pluginApi.addScreenCleanupFunction( ( screenData ) => {
		console.log( `Screen ${screenData.id} removed!` );
		screenData.myData = null;
	} );
}
```

### Pattern 3: Access Main API

```javascript
export default function infoPlugin( pluginApi ) {
	pluginApi.addCommand( "showInfo", showInfo, false, [] );
	
	function showInfo() {
		const api = pluginApi.getApi();
		console.log( `Pi.js version: ${api.version}` );
		
		// Can also call other Pi.js commands
		if( api.width ) {
			console.log( `Screen: ${api.width()}x${api.height()}` );
		}
	}
}
```

### Pattern 4: Use Utilities

```javascript
export default function mathPlugin( pluginApi ) {
	const utils = pluginApi.utils;
	
	pluginApi.addCommand( "randomColor", randomColor, false, [] );
	
	function randomColor() {
		const r = Math.floor( utils.rndRange( 0, 256 ) );
		const g = Math.floor( utils.rndRange( 0, 256 ) );
		const b = Math.floor( utils.rndRange( 0, 256 ) );
		return utils.rgbToColor( r, g, b, 255 );
	}
}
```

## 📚 Next Steps

1. **Read full docs**: `plugins/README.md`
2. **Study example**: `plugins/example-plugin/`
3. **View tests**: Open `test/tests/html-manual/example_01.html`
4. **Build more**: Create your own plugins!

## 🔍 Available Plugin API

```javascript
pluginApi.addCommand( name, fn, isScreen, parameterNames[, isScreenOptional] )
pluginApi.addScreenDataItem( name, value )
pluginApi.addScreenDataItemGetter( name, fn )
pluginApi.addScreenInitFunction( fn )
pluginApi.addScreenPreCleanupFunction( fn )
pluginApi.addScreenCleanupFunction( fn )
pluginApi.getActiveScreen( fnName, isScreenOptional )
pluginApi.getScreenData( fnName, screenId )
pluginApi.getAllScreensData()
pluginApi.resizeOffscreenScreen( screenData, width, height )
pluginApi.getApi()
pluginApi.utils
pluginApi.wait()
pluginApi.done()
pluginApi.registerClearEvents( name, handler )
```

Set `isScreen` to `false` for a global command whose handler receives `options`. Set it to `true`
for a screen command whose handler receives `screenData, options`. The final `isScreenOptional`
argument is optional and allows a screen command to run with `screenData` set to `null` when no
screen is active.

## 💡 Pro Tips

1. **Auto-register IIFE plugins** - Add the auto-register code at the end
2. **Use descriptive names** - Avoid conflicts with other plugins
3. **Validate parameters** - Check types and throw clear errors
4. **Document your plugin** - Create a README.md
5. **Test thoroughly** - Test with multiple screens and edge cases

## ✅ Verification Checklist

- [ ] Pi.js builds successfully (`node scripts/build.js`)
- [ ] Test page opens without errors
- [ ] `pi.registerPlugin()` is available
- [ ] `pi.getPlugins()` returns array
- [ ] Example plugin commands work
- [ ] Your custom plugin loads
- [ ] Plugin commands appear on `pi` object

## 🆘 Troubleshooting

**Plugin not loading?**
- Check browser console for errors
- Verify plugin file path is correct
- Check that plugin has `init` function

**Command not available?**
- Check `pi.getPlugins()` to see if plugin registered
- Verify you're calling after `pi.ready()`
- Check for name conflicts

**Build fails?**
- Ensure `esbuild` is installed (`npm install`)
- Check plugin `index.js` exists
- Verify plugin has valid JavaScript

## 🎉 You're Ready!

You now have a working plugin system. Start creating plugins to extend Pi.js!

For complete documentation, see:
- `plugins/README.md` - Full plugin guide
- `PLUGIN-SYSTEM.md` - System architecture
- `plugins/example-plugin/` - Working example

