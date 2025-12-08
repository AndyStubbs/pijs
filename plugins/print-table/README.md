# Print Table Plugin

Table formatting and printing plugin for Pi.js with customizable borders.

## Overview

The Print Table plugin provides the `printTable()` command for creating formatted ASCII-style
tables with borders. Supports both auto-formatted tables and custom table layouts.

## Installation

### Browser (IIFE)

```html
<script src="../../build/pi.min.js"></script>
<script src="plugins/print-table/dist/print-table.min.js"></script>
```

### ES Modules

```javascript
import pi from "../../build/pi.esm.min.js";
import printTablePlugin from "./plugins/print-table/dist/print-table.esm.min.js";

pi.registerPlugin( {
	"name": "print-table",
	"init": printTablePlugin
} );
```

## Commands

### `printTable( items, tableFormat, borderStyle, isCentered )`

Prints a formatted table to the screen.

**Parameters:**
- `items` (array): 2D array of items to display
- `tableFormat` (array, optional): Custom format strings defining table structure
- `borderStyle` (string|array, optional): Border style name or custom border array
- `isCentered` (boolean, optional): Center the table on screen

**Returns:** Array of box data objects with position/dimension info

## Border Styles

Built-in border styles:
- `"single"` - Single-line borders (default)
- `"double"` - Double-line borders
- `"singleDouble"` - Single horizontal, double vertical
- `"doubleSingle"` - Double horizontal, single vertical
- `"thick"` - Thick block borders

## Examples

### Simple Auto-Formatted Table

```javascript
pi.screen( { "aspect": "300x200" } );

const data = [
	[ "Name", "Age", "City" ],
	[ "Alice", "25", "NYC" ],
	[ "Bob", "30", "LA" ]
];

pi.printTable( data );
```

### Table with Custom Border Style

```javascript
const data = [
	[ "Product", "Price", "Stock" ],
	[ "Widget", "$10", "50" ],
	[ "Gadget", "$25", "30" ]
];

pi.printTable( data, null, "double" );
```

### Custom Formatted Table

```javascript
const items = [ "Title", "Name", "Age", "Location", "Description" ];

const format = [
	"*-----------*-------*-------*",
	"|           |       |       |",
	"*-----------*-------*-------*",
	"|           |               |",
	"*-----------*---------------*",
	"|                           |",
	"*---------------------------*"
];

pi.printTable( items, format, "single", true );
```

## Custom Format Syntax

- `*` - Intersection point (corner or T-junction)
- `-` - Horizontal line
- `|` - Vertical line
- ` ` - Empty space (for cell content)

The plugin automatically determines what type of intersection to draw based on adjacent cells.

## Usage with Input

```javascript
pi.ready( () => {
	pi.screen( { "aspect": "300x200" } );
	
	const menu = [
		[ "Main Menu" ],
		[ "1. New Game" ],
		[ "2. Load Game" ],
		[ "3. Options" ],
		[ "4. Quit" ]
	];
	
	pi.printTable( menu, null, "double" );
	pi.print( "" );
	pi.input( "Select option: ", ( value ) => {
		console.log( "Selected:", value );
	} );
} );
```

## Building

This plugin is built automatically when you run:

```bash
node scripts/build.js
```

Or build just this plugin:

```bash
node scripts/build-plugin.js print-table
```

## Features

- ✅ Auto-formatted tables (automatic column sizing)
- ✅ Custom formatted tables (precise control)
- ✅ Multiple border styles
- ✅ Centered table option
- ✅ 2D or flat arrays supported
- ✅ Vertical text in cells (format: "v")
- ✅ Returns hitbox data for each cell

## License

Apache-2.0

