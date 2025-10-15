# Pi.js v2.0 Refactor Plan

## Goal

Complete refactor to modern, modular architecture while maintaining **Reasonable API compatibility**
with v1.2.4 and full **pixel-mode support** for retro graphics.

---

## Success Criteria

- ✅ **API Compatibility**: All `pi.*` functions work mostly like v1.2.4
- ✅ **Minor API Improvements**: Some changes to the API are acceptible if it's a net benefit
- ✅ **Pixel Mode**: Manual pixel drawing to avoid anti-aliasing
- ✅ **Modern Code**: ES2020+, modular, well-documented
- ✅ **All Tests Pass**: Existing visual regression tests work
- ✅ **Build System**: esbuild with multiple formats (ESM/CJS/IIFE)
- ✅ **Performance**: Equal or better than legacy

---

## Architecture Overview

### Core Principles

1. **Global `$` Alias (Preferred) and `pi` Object** - Maintains v1 compatibility, `$` is preferred
2. **Modular Internals** - Clean separation of concerns
3. **Dual Implementations** - Pixel-perfect vs anti-aliased for each drawing command
4. **Command System** - Automatic API generation from command registration
5. **Parameter Flexibility** - Support both `func(a, b, c)` and `func({ a, b, c })`

### Key Systems

**Pixel Mode**
- When `pixelMode: true` (default), uses manual pixel algorithms
- Bresenham line algorithm, midpoint circle, etc.
- Direct imageData manipulation
- No canvas anti-aliasing

**Screen Management**
- Multiple independent screens/canvases
- Active screen concept
- Per-screen state (colors, palette, position, etc.)
- ImageData caching for performance

---

## Progress Tracking

---

**Last Updated:** October 12, 2025
