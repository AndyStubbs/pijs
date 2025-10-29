src/
├── core/                    # Essential infrastructure
│   ├── state.js (settings.js) 	# Application state management 
│   ├── plugins.js          # Plugin system
│   └── utils.js            # Core utilities
├── graphics/              # All rendering-related
│   ├── screen-manager.js   # Screen management
│   ├── renderer-webgl2.js  # WebGL2 renderer
│   ├── renderer-canvas2d.js# Canvas2D renderer
│   └── pens.js             # Pen/drawing state
        drawing.js
		colors.js
		images.js
		paint.js
├── input/                  # Input handling
│   ├── events.js           # Event system
│   ├── keyboard.js        # Keyboard input
│   ├── mouse.js           # Mouse input
│   ├── touch.js           # Touch input
│   └── gamepad.js         # Gamepad input
	└── press.js           # Button/press handling
├── audio/                  # Sound system
│   sound.js                # Audio playback
	play.js                 # Music Note Generator
├── text/                   # Text rendering
│   ├── font.js            # Font management
│   └── print.js           # Text printing
