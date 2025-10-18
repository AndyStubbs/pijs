# Pi.js Plugin System - Quick Start

## ⚡ 5-Minute Quick Start

### 1. Test the Plugin System (Right Now!)

Open any of these test pages in your browser:

```
test/test-example-plugin-iife.html     ← Start here! Beautiful animated demo
test/test-example-plugin.html          ← ESM module version
test/test-plugin-system.html           ← Basic inline tests
```

### 2. Use the Example Plugin

**Option A: With Script Tags (Simplest)**
```html
<!DOCTYPE html>
<html>
<body>
	<script src="build/pi.min.js"></script>
	<script src="plugins/example-plugin/example-plugin.js"></script>
	<script>
		pi.ready( () => {
			pi.screen( { "aspect": "16:9" } );
			pi.hello( "World" );                    // Plugin command!
			pi.drawRandomCircle( 200, 150, 50 );    // Plugin command!
		} );
	</script>
</body>
</html>
```

**Option B: With ES Modules**
```html
<!DOCTYPE html>
<html>
<body>
	<script type="module">
		import pi from "./build/pi.esm.min.js";
		import examplePlugin from "./plugins/example-plugin/index.js";
		
		pi.registerPlugin( {
			"name": "example-plugin",
			"init": examplePlugin
		} );
		
		pi.ready( () => {
			pi.screen( { "aspect": "16:9" } );
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
	pluginApi.addCommand( "greet", greet, [ "name" ] );
	
	function greet( options ) {
		const name = options.name || "Friend";
		alert( `Hello, ${name}!` );
	}
	
	// Add a drawing command
	pluginApi.addScreenCommand( "drawStar", drawStar, [ "x", "y", "size" ] );
	
	function drawStar( screenData, options ) {
		const x = options.x || 100;
		const y = options.y || 100;
		const size = options.size || 50;
		
		const ctx = screenData.context;
		ctx.fillStyle = screenData.color.s;
		
		// Draw a simple star
		ctx.beginPath();
		for( let i = 0; i < 5; i++ ) {
			const angle = ( i * 4 * Math.PI ) / 5 - Math.PI / 2;
			const px = x + size * Math.cos( angle );
			const py = y + size * Math.sin( angle );
			if( i === 0 ) {
				ctx.moveTo( px, py );
			} else {
				ctx.lineTo( px, py );
			}
		}
		ctx.closePath();
		ctx.fill();
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
	<script src="plugins/my-first-plugin/my-first-plugin.js"></script>
	<script>
		pi.ready( () => {
			pi.screen( { "aspect": "16:9", "container": "container" } );
			
			// Your plugin commands!
			pi.greet( "World" );
			pi.color( "yellow" );
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
	pluginApi.addScreenCommand( "increment", increment, [] );
	function increment( screenData ) {
		screenData.counter++;
		return screenData.counter;
	}
	
	// Get counter command
	pluginApi.addScreenCommand( "getCounter", getCounter, [] );
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
	pluginApi.addCommand( "showInfo", showInfo, [] );
	
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
	
	pluginApi.addCommand( "randomColor", randomColor, [] );
	
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
3. **View tests**: Open `test/test-example-plugin-iife.html`
4. **Build more**: Create your own plugins!

## 🔍 Available Plugin API

```javascript
pluginApi.addCommand( name, fn, params )
pluginApi.addScreenCommand( name, fn, params )
pluginApi.addPixelCommand( name, fn, params )
pluginApi.addAACommand( name, fn, params )
pluginApi.addScreenDataItem( name, value )
pluginApi.addScreenDataItemGetter( name, fn )
pluginApi.addScreenInternalCommands( name, fn )
pluginApi.addScreenInitFunction( fn )
pluginApi.addScreenCleanupFunction( fn )
pluginApi.getApi()
pluginApi.utils
```

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

