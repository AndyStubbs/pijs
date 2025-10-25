# Pi.js Command System - Structure Modification Plan

## Executive Summary

The current command system provides excellent API ergonomics but suffers from ~2x performance 
degradation in hot paths (rendering operations) due to JIT optimization challenges. This document 
outlines a plan to maintain the command system's flexibility while achieving near-native performance
for critical operations.

## Current State Analysis

### Strengths
- Clean, consistent API design
- Easy to add new commands
- Flexible parameter handling
- Good separation of concerns
- Screen-agnostic command structure

### Performance Issues
1. **Megamorphic Call Sites**: Function pointers (`screenData.pen`, `screenData.blend`) change at 
runtime, preventing V8 inline optimization
2. **Closure Overhead**: Command wrappers using `(...args)` and `parseOptions()` on every call
3. **Indirect Function Calls**: Multiple layers of indirection in hot rendering paths
4. **Memory Allocation**: Options objects created on every command invocation

### Impact
- Line rendering: ~2x slower than direct implementation
- Pixel operations: Significant overhead from pen/blend indirection
- alpha.0 implementation with different pen handling: 1.7x faster

## Root Causes

### 1. Dynamic Function Assignment
```javascript

// V8 cannot inline or optimize this pattern
screenData.pen = m_pens[ "pixel" ].fn;
screenData.blend = m_blends[ "replace" ].fn;

// Later in hot path:
screenData.pen( screenData, x, y, c );  // Megamorphic - could be any function
```

### 2. Wrapper Function Overhead
```javascript

// Creates closure, uses spread operator, allocates options object
screenData.api[ command.name ] = ( ...args ) => {
	const options = utils.parseOptions( args, command.parameterNames );
	return command.fn( screenData, options );
};
```

### 3. Lack of Fast Paths
No optimization for common cases (single pixel, no noise, default blend).

## Recommended Solution: Multi-Tier Approach

### Tier 1: Fast Paths for Hot Operations (High Priority)
Keep command system but add optimized implementations for performance-critical code.

### Tier 2: Optimize Command Wrappers (Medium Priority)
Reduce overhead in command registration and invocation.

### Tier 3: Internal Function Optimization (Medium Priority)
Use enums/switches instead of function pointers for internal operations.

## Implementation Plan

### Phase 1: Add Fast Paths for Rendering

#### 1.1 Create Direct Pixel Access Functions
**File: `core/renderer.js`**

```javascript
/**
 * Direct pixel write - no bounds checking, no blending, no noise
 * Use only when you've already validated coordinates and modes
 */
export function drawPixelUnsafe( screenData, x, y ) {
	const c = screenData.color;
	const data = screenData.imageData2;
	const i = ( ( screenData.width * y ) + x ) * 4;
	
	data[i] = c.r;
	data[i + 1] = c.g;
	data[i + 2] = c.b;
	data[i + 3] = c.a;
}

/**
 * Direct pixel write with bounds checking
 */
export function drawPixelDirect( screenData, x, y ) {
	if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
		return;
	}
	drawPixelUnsafe( screenData, x, y );
}

/**
 * Check if fast path can be used for current screen state
 */
export function canUseFastPath( screenData ) {
	return (
		screenData.penData.size === 1 &&
		screenData.blendData.noise === null &&
		screenData.blend === m_blends["replace"].fn
	);
}
```

#### 1.2 Update Line Drawing to Use Fast Paths
**File: `modules/graphics.js`**

```javascript
import { drawPixelDirect } from "../core/renderer.js";

function line( screenData, options ) {
	// ... parse options ...
	
	if( screenData.canUseFastPath ) {
		drawLineFast( screenData, x1, y1, x2, y2 );
	} else {
		drawLineFlexible( screenData, x1, y1, x2, y2 );
	}
}

function drawLineFast( screenData, x1, y1, x2, y2 ) {

	// Bresenham's line algorithm with direct pixel access
	const dx = Math.abs( x2 - x1 );
	const dy = Math.abs( y2 - y1 );
	const sx = x1 < x2 ? 1 : -1;
	const sy = y1 < y2 ? 1 : -1;
	let err = dx - dy;
	
	let x = x1;
	let y = y1;
	
	while( true ) {
		drawPixelDirect( screenData, x, y );
		
		if( x === x2 && y === y2 ) break;
		
		const e2 = 2 * err;
		if( e2 > -dy ) {
			err -= dy;
			x += sx;
		}
		if( e2 < dx ) {
			err += dx;
			y += sy;
		}
	}
}

function drawLineFlexible( screenData, x1, y1, x2, y2 ) {
	// Existing implementation using screenData.pen()
	// ... keep current code ...
}
```

#### 1.3 Apply Fast Paths to Other Hot Operations
- `pset()` - pixel setting
- `circle()` / `circleFill()` - circle rendering
- `rect()` / `rectFill()` - rectangle rendering
- `paint()` - flood fill (if applicable)

### Phase 2: Optimize Command Registration

#### 2.1 Generate Optimized Wrappers
**File: `core/commands.js`**

```javascript
function generateOptimizedWrapper( command, isScreen ) {
	const paramCount = command.parameterNames.length;
	
	if( paramCount === 0 ) {

		// No parameters - direct call, no parsing needed
		if( isScreen ) {
			return ( screenData ) => command.fn( screenData, {} );
		}
		return () => command.fn( {} );
	}
	
	if( paramCount === 1 ) {

		// Single parameter - skip parseOptions overhead
		const paramName = command.parameterNames[ 0 ];
		if( isScreen ) {
			return ( screenData, value ) => {
				if( utils.isObjectLiteral( value ) ) {
					return command.fn( screenData, value );
				}
				return command.fn( screenData, { [ paramName ]: value } );
			}
		}
		return ( value ) => {
			if( utils.isObjectLiteral( value ) ) {
				return command.fn( value );
			}
			return command.fn( { [ paramName ]: value } );
		};
	}

	if( paramCount === 2 ) {
		if( isScreen ) {
			return ( screenData, a1, a2 ) => {
				const args = [ a1, a2 ].slice( 0, arguments.length - 1 );
				const options = utils.parseOptions( args, params );
				return command.fn( screenData, options );
			};
		}
		return ( a1, a2 ) => {
			const args = [ a1, a2 ].slice( 0, arguments.length );
			const options = utils.parseOptions( args, params );
			return command.fn( options );
		};
	}
	
	// Multiple parameters - use parseOptions but avoid spread operator
	if( isScreen ) {
		return function( screenData, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10 ) {
			const args = [ a1, a2, a3, a4, a5, a6, a7, a8, a9, a10 ].slice(
				0, arguments.length - 1
			);
			const options = utils.parseOptions( args, command.parameterNames );
			return command.fn( screenData, options );
		};
	}
	
	return function( a1, a2, a3, a4, a5, a6, a7, a8, a9, a10 ) {
		const args = [ a1, a2, a3, a4, a5, a6, a7, a8, a9, a10 ].slice( 0, arguments.length );
		const options = utils.parseOptions( args, command.parameterNames );
		return command.fn( options );
	};
}

export function processApiCommand( command ) {
	if( command.isScreen ) {
		m_api[ command.name ] = generateOptimizedWrapper( command, true );
	} else {
		m_api[ command.name ] = generateOptimizedWrapper( command, false );
	}
}
```

**File: `core/utils.js`**
```javascript
export function parseOptions( args, parameterNames ) {
	const resultOptions = {};
	
	// Fast path: No args or first arg is clearly positional
	if( args.length === 0 || !isObjectLiteral( args[ 0 ] ) ) {

		// Positional arguments - single loop
		for( let i = 0; i < parameterNames.length; i++ ) {
			resultOptions[ parameterNames[ i ] ] = i < args.length ? args[ i ] : null;
		}
		return resultOptions;
	}
	
	// Slow path: Object literal with named parameters
	const inputOptions = args[ 0 ];
	for( const name of parameterNames ) {
		resultOptions[ name ] = ( name in inputOptions ) ? inputOptions[ name ] : null;
	}
	return resultOptions;
}
```

#### 2.2 Update Screen Command Processing
**File: `core/screen-manager.js`**

```javascript
function processApiCommand( screenData, command ) {
	const paramCount = command.parameterNames.length;
	
	if( paramCount === 0 ) {
		screenData.api[ command.name ] = () => command.fn( screenData, {} );
	} else if( paramCount === 1 ) {
		const paramName = command.parameterNames[ 0 ];
		screenData.api[ command.name ] = ( value ) => {
			return command.fn( screenData, { [ paramName ]: value } );
		};
	} else {
		screenData.api[ command.name ] = function( arg1, arg2, arg3, arg4, arg5 ) {
			const args = [ arg1, arg2, arg3, arg4, arg5 ].slice( 0, arguments.length );
			const options = utils.parseOptions( args, command.parameterNames );
			return command.fn( screenData, options );
		};
	}
}
```

### Phase 3: Optimize Internal Function Calls

#### 3.1 Use Mode Constants Instead of Function Pointers
**File: `core/renderer.js`**

```javascript
// Define mode constants
export const PEN_PIXEL = 0;
export const PEN_SQUARE = 1;
export const PEN_CIRCLE = 2;

export const BLEND_REPLACE = 0;
export const BLEND_ALPHA = 1;

// Update screen data to use modes
screenManager.addScreenDataItem( "penMode", PEN_PIXEL );
screenManager.addScreenDataItem( "blendMode", BLEND_REPLACE );

// Create unified draw function with switch
export function drawPixelInternal( screenData, x, y, c ) {

	// Bounds check
	if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
		return;
	}
	
	// Apply noise if needed
	if( screenData.blendData.noise !== null ) {
		c = blendGetColorNoise(screenData, c);
	}
	
	// Get pen size
	const size = screenData.penData.size;
	
	// Handle pen modes
	if( size === 1 ) {

		// Fast path - single pixel
		drawPixelUnsafe( screenData, x, y );
		return;
	}
	
	// Use switch for larger pens (more optimizable than function pointer)
	switch( screenData.penMode ) {
		case PEN_SQUARE:
			drawSquarePen( screenData, x, y, c, size );
			break;
		case PEN_CIRCLE:
			drawCirclePen( screenData, x, y, c, size );
			break;
	}
}
```

#### 3.2 Update setPen Command
```javascript
function setPen( screenData, options ) {
	const pen = options.pen;
	let size = utils.getFloat( options.size, null );
	
	if( !m_pens[ pen ] ) {
		// ... error handling ...
	}
	
	// Set mode constant instead of function pointer
	screenData.penMode = m_pens[ pen ].mode;
	screenData.penData.size = size;
	screenData.penData.cap = m_pens[ pen ].cap;
	screenData.context.lineCap = m_pens[ pen ].cap;
}
```