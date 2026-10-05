/**
 * Pi.js Type Definitions
 * Version: pi-2.3
 * Author: Andy Stubbs
 * License: Apache-2.0
 */
/**
 * Commands, screen commands, and settings added by separately loaded plugins. A plugin's
 * declaration file augments these interfaces with `declare module "pijs-web"`,
 * so importing the plugin adds its commands to the API.
 */
export interface PluginCommands {}
export interface PluginScreenCommands {}
export interface PluginOptions {}

declare namespace Pi {
	/**
	 * Click event data (mouse or touch).
	 *
	 * The data of the release that completed a click, passed to onClick callbacks, with action 'click'. It has the MouseData or TouchData fields of the release, and is frozen.
	 */
	interface ClickData {
		/**
		 * X coordinate of the release in pixels.
		 */
		x: number;

		/**
		 * Y coordinate of the release in pixels.
		 */
		y: number;

		/**
		 * X coordinate before the release.
		 */
		lastX: number;

		/**
		 * Y coordinate before the release.
		 */
		lastY: number;

		/**
		 * Buttons still held after the release.
		 */
		buttons: number;

		/**
		 * Always 'click'.
		 */
		action: string;

		/**
		 * Input type: 'mouse', 'pen', or 'touch'.
		 */
		type: string;

		/**
		 * Pointer identifier of the mouse, pen, or touch that clicked.
		 */
		id: number;

		/**
		 * Always false: a cancelled release never clicks.
		 */
		cancelled: boolean;
	}

	/**
	 * Standard JavaScript Error object.
	 *
	 * Standard JavaScript Error object passed to error callbacks (e.g., onError callbacks in loadImage, loadSpritesheet). Contains error information including message and potentially other error details.
	 *
	 * The Error object may contain additional properties depending on the error source. For image loading errors, it may include network-related information.
	 */
	interface Error {
		/**
		 * Error message describing what went wrong.
		 */
		message: string;

		/**
		 * Error type name (e.g., 'Error', 'TypeError', 'NetworkError').
		 */
		name?: string;

		/**
		 * Error stack trace (if available).
		 */
		stack?: string;
	}

	/**
	 * Font information object.
	 *
	 * Font information object containing properties of a loaded font. Returned in the array from getAvailableFonts().
	 */
	interface FontInfo {
		/**
		 * Font identifier/number.
		 */
		id: number;

		/**
		 * Character width in pixels.
		 */
		width: number;

		/**
		 * Character height in pixels.
		 */
		height: number;
	}

	/**
	 * Individual frame metadata within a spritesheet.
	 *
	 * Frame data object containing position, dimensions, and bounding box information for a single frame in a spritesheet. Part of the frames array in SpritesheetData.
	 */
	interface FrameData {
		/**
		 * Frame index (0-based).
		 */
		index: number;

		/**
		 * X coordinate of frame in spritesheet image.
		 */
		x: number;

		/**
		 * Y coordinate of frame in spritesheet image.
		 */
		y: number;

		/**
		 * Width of the frame in pixels.
		 */
		width: number;

		/**
		 * Height of the frame in pixels.
		 */
		height: number;

		/**
		 * Left edge X coordinate.
		 */
		left: number;

		/**
		 * Top edge Y coordinate.
		 */
		top: number;

		/**
		 * Right edge X coordinate.
		 */
		right: number;

		/**
		 * Bottom edge Y coordinate.
		 */
		bottom: number;

		/**
		 * Screen dimensions/aspect ratio string.
		 */
		screen?: string;

		/**
		 * Foreground color (palette index, color value, etc.).
		 */
		color?: any;

		/**
		 * Background color.
		 */
		bgColor?: any;

		/**
		 * Default color palette array.
		 */
		defaultPal?: Array<PiColor>;
	}

	/**
	 * State of one gamepad button.
	 *
	 * One entry of GamepadData.buttons. It is live: the same object is updated in place on each read.
	 */
	interface GamepadButton {
		/**
		 * Whether the button is held.
		 */
		pressed: boolean;

		/**
		 * How far the button is pressed, from 0 to 1.
		 */
		value: number;

		/**
		 * Whether the button was pressed since the previous read.
		 */
		pressStarted: boolean;

		/**
		 * Whether the button was released since the previous read.
		 */
		pressReleased: boolean;
	}

	/**
	 * Gamepad state and helper methods.
	 *
	 * A connected gamepad, returned by inGamepad() and passed to onGamepad( "connect" ) callbacks. The object is live: the same object is returned on every read and updated in place, including its buttons array, each button, axes, and lastAxes. Copy values to keep a snapshot.
	 */
	interface GamepadData {
		/**
		 * The browser's index for the pad, a non-negative integer.
		 */
		index: number;

		/**
		 * Gamepad identifier string.
		 */
		id: string;

		/**
		 * Connection status.
		 */
		connected: boolean;

		/**
		 * Gamepad mapping type, such as 'standard', or an empty string.
		 */
		mapping: string;

		/**
		 * The browser's timestamp of the pad state at the last read.
		 */
		timestamp: number;

		/**
		 * The browser's vibration actuator for the pad, or null. See vibrateGamepad().
		 */
		vibrationActuator: any;

		/**
		 * Button states, in the browser's button order.
		 */
		buttons: Array<GamepadButton>;

		/**
		 * Axis values from -1 to 1 after the dead zone set by setGamepadDeadZone().
		 */
		axes: Array<number>;

		/**
		 * Axis values at the previous read.
		 */
		lastAxes: Array<number>;

		/**
		 * Reads the button object, or null past the buttons array.
		 */
		getButton: ( buttonIndex: number | string ) => GamepadButton | null;

		/**
		 * Reads whether the button is held; false past the buttons array.
		 */
		getButtonPressed: ( buttonIndex: number | string ) => boolean;

		/**
		 * Reads whether the button was pressed since the previous read; false past the array.
		 */
		getButtonJustPressed: ( buttonIndex: number | string ) => boolean;

		/**
		 * Reads whether the button was released since the previous read; false past the array.
		 */
		getButtonJustReleased: ( buttonIndex: number | string ) => boolean;

		/**
		 * Reads the axis value; 0 past the axes array.
		 */
		getAxis: ( axisIndex: number | string ) => number;

		/**
		 * Reads whether the axis value differs from the previous read; false past the array.
		 */
		getAxisChanged: ( axisIndex: number | string ) => boolean;
	}

	/**
	 * Data passed to onGamepad( 'disconnect' ) callbacks.
	 *
	 * The disconnected pad's identity.
	 */
	interface GamepadDisconnectData {
		/**
		 * Index the pad had.
		 */
		index: number;

		/**
		 * The browser's id string for the pad.
		 */
		id: string;

		/**
		 * The pad's mapping, such as 'standard'.
		 */
		mapping: string;

		/**
		 * Always false.
		 */
		connected: boolean;
	}

	/**
	 * Rectangular area used for hit detection in event handlers.
	 *
	 * A rectangular area in screen pixels that restricts a pointer handler (onClick, onMouse, onPress, onTouch) to input inside it. A point is inside when x <= point.x < x + width and y <= point.y < y + height, so the left and top edges are included and the right and bottom edges are not.
	 *
	 * Every value must be a finite number, and fractions are allowed. Positions may be negative; width and height must be zero or greater.
	 */
	interface HitBox {
		/**
		 * Left edge X coordinate in pixels.
		 */
		x: number;

		/**
		 * Top edge Y coordinate in pixels.
		 */
		y: number;

		/**
		 * Width of the rectangle in pixels; 0 or more.
		 */
		width: number;

		/**
		 * Height of the rectangle in pixels; 0 or more.
		 */
		height: number;
	}

	/**
	 * Mouse state and event data.
	 *
	 * Mouse data containing position, button state, action, and previous position. Returned by inMouse() and passed to onMouse callbacks. Mouse, touch, press, and click data share one shape: x, y, lastX, lastY, buttons, action, type, id, and cancelled. The data is created once per event and frozen: reads and handlers of the event receive the same object.
	 *
	 * Positions are in screen pixels. Moves over the canvas border or padding, and a release outside the canvas, report their true position, which can be outside the screen.
	 */
	interface MouseData {
		/**
		 * X coordinate in pixels.
		 */
		x: number;

		/**
		 * Y coordinate in pixels.
		 */
		y: number;

		/**
		 * X coordinate before this event; the current X on a pointer's first event.
		 */
		lastX: number;

		/**
		 * Y coordinate before this event; the current Y on a pointer's first event.
		 */
		lastY: number;

		/**
		 * Bitmask of the buttons held (0 = none, 1 = left, 2 = right, 4 = middle). Only buttons pressed on the screen count: a press that starts on the canvas border, the padding, or outside the canvas is not held.
		 */
		buttons: number;

		/**
		 * Last action: 'down', 'move', or 'up'.
		 */
		action: string;

		/**
		 * Input type: 'pen' for a pen, otherwise 'mouse'.
		 */
		type: string;

		/**
		 * Pointer identifier of the mouse or pen.
		 */
		id: number;

		/**
		 * True for a release the player did not make: the browser cancelled the pointer, the page was hidden, or stopMouse() was called with a button held. False otherwise.
		 */
		cancelled: boolean;
	}

	/**
	 * Settings object for the set() command.
	 *
	 * Options object used with the set() command to apply multiple settings in a single call. Any command registered as a "setX" command is available as an option with the lowercased name (e.g., setColor => { "color": ... }).
	 */
	interface Options extends PluginOptions {
		/**
		 * Sets the keys whose default browser behavior is prevented.
		 */
		actionKeys?: Array<string>;

		/**
		 * Changes the volume, playback rate, or pan of an audio instance.
		 */
		audio?: number;

		/**
		 * Sets the canvas background color.
		 */
		bgColor?: any;

		/**
		 * Sets the current blend mode used for rendering.
		 */
		blend?: string;

		/**
		 * Sets the volume of one sound bus.
		 */
		busVolume?: { "bus": string; "volume": number };

		/**
		 * Sets a custom character bitmap in the current font.
		 */
		char?: { "charCode": number | string; "data": any[] | string };

		/**
		 * Sets the current foreground color used for drawing.
		 */
		color?: any;

		/**
		 * Sets the background color of the screen's container element.
		 */
		containerBgColor?: any;

		/**
		 * Enables or disables the right-click context menu.
		 */
		contextMenu?: boolean;

		/**
		 * Sets the default anchor point for images when drawing on the current screen.
		 */
		defaultAnchor?: { "x": number; "y": number };

		/**
		 * Sets the default foreground color used by new screens.
		 */
		defaultColor?: any;

		/**
		 * Sets the default font for new screens.
		 */
		defaultFont?: number;

		/**
		 * Sets the default color palette for newly created screens.
		 */
		defaultPal?: Array<any>;

		/**
		 * Sets or clears the shader used to present the screen to the canvas.
		 */
		displayShader?: number | null;

		/**
		 * Updates uniforms on the active display shader.
		 */
		displayShaderUniforms?: ShaderUniforms;

		/**
		 * Sets the font for the current screen.
		 */
		font?: number;

		/**
		 * Sets the dead zone for gamepad sticks and axes.
		 */
		gamepadDeadZone?: number;

		/**
		 * Configures color noise ranges and optional seed for blending.
		 */
		noise?: { "noise"?: number | any[]; "seed"?: number };

		/**
		 * Replaces the current palette with a new set of colors.
		 */
		pal?: Array<any>;

		/**
		 * Updates one or more palette colors at specific indices.
		 */
		palColors?: { "indices": Array<number>; "colors": Array<any> };

		/**
		 * Enables or disables browser pinch zoom on the screen canvas.
		 */
		pinchZoom?: boolean;

		/**
		 * Sets the print cursor position using column and row coordinates.
		 */
		pos?: { "col"?: number; "row"?: number };

		/**
		 * Sets the print cursor position using pixel coordinates.
		 */
		posPx?: { "x"?: number; "y"?: number };

		/**
		 * Sets the scale factor for printed text.
		 */
		printSize?: { "scaleWidth"?: number; "scaleHeight"?: number; "padX"?: number; "padY"?: number };

		/**
		 * Sets the active screen for graphics commands.
		 */
		screen?: number | Screen;

		/**
		 * Turns the output limiter on or off.
		 */
		soundLimiter?: boolean;

		/**
		 * Sets the master volume for all sounds, music, and audio.
		 */
		volume?: number;

		/**
		 * Enables or disables word breaking for text wrapping.
		 */
		wordBreak?: boolean;
	}

	/**
	 * Color object representing RGBA color values.
	 *
	 * Color object returned by getPixel(), getColor(), getPalColor(), and other color-related functions. Contains RGBA color components, a unique key, and array representation.
	 */
	interface PiColor {
		/**
		 * Unique 32-bit integer key for the color (packed RGBA format).
		 */
		key: number;

		/**
		 * Red component (0-255).
		 */
		r: number;

		/**
		 * Green component (0-255).
		 */
		g: number;

		/**
		 * Blue component (0-255).
		 */
		b: number;

		/**
		 * Alpha component (0-255).
		 */
		a: number;

		/**
		 * Array representation [r, g, b, a].
		 */
		array: Array<number>;
	}

	/**
	 * Plugin API object for extending Pi.js functionality.
	 *
	 * Plugin API object passed to plugin initialization functions. Provides access to Pi.js internals for registering commands, adding screen data, and extending functionality.
	 */
	interface PluginAPI {
		/**
		 * During init, register a new command.
		 */
		addCommand: ( name: string, fn: ( ...args: any[] ) => any, isScreen: boolean, parameterNames: string[], isScreenOptional?: boolean ) => void;

		/**
		 * During init, add persistent data to each screen.
		 */
		addScreenDataItem: ( name: string, defaultValue: any ) => void;

		/**
		 * During init, add a dynamic data getter for screens.
		 */
		addScreenDataItemGetter: ( name: string, getterFn: Function ) => void;

		/**
		 * During init, register a function to run when screens are created.
		 */
		addScreenInitFunction: ( initFn: Function ) => void;

		/**
		 * During init, register a function to run after isRemoved is set, before renderer cleanup; it cancels work without redrawing.
		 */
		addScreenPreCleanupFunction: ( cleanupFn: ( screenData: any ) => void ) => void;

		/**
		 * During init, register a function to run when screens are destroyed.
		 */
		addScreenCleanupFunction: ( cleanupFn: Function ) => void;

		/**
		 * Return the active screen data, or throw if none unless isScreenOptional is true.
		 */
		getActiveScreen: ( fnName: string, isScreenOptional?: boolean ) => any;

		/**
		 * Get data for a specific screen by its numeric ID.
		 */
		getScreenData: ( fnName: string, screenId: number ) => any;

		/**
		 * Get array of all screen data objects.
		 */
		getAllScreensData: () => any[];

		/**
		 * Resize an offscreen screen to integer dimensions.
		 */
		resizeOffscreenScreen: ( screenData: any, width: number, height: number ) => void;

		/**
		 * Get the main Pi.js API object.
		 */
		getApi: () => Pi.API;

		/**
		 * Access to utility functions.
		 */
		readonly utils: object;

		/**
		 * Increment resource wait counter (for async operations).
		 */
		wait: () => void;

		/**
		 * Decrement resource wait counter.
		 */
		done: () => void;

		/**
		 * During init, register a clearEvents handler for a specific event type.
		 */
		registerClearEvents: ( name: string, handler: Function ) => void;

		/**
		 * During init, publish one service object for plugins that depend on this plugin.
		 */
		provideService: ( service: object ) => void;

		/**
		 * Return the service of an initialized plugin named in this plugin's dependencies.
		 */
		getService: ( pluginName: string ) => any;
	}

	/**
	 * Character grid position coordinates.
	 *
	 * Position coordinates in character grid units (column and row). Used for text cursor positioning and character-based operations. The grid size is determined by the current font size and print scale.
	 */
	interface Position {
		/**
		 * Column position (0-indexed).
		 */
		col: number;

		/**
		 * Row position (0-indexed).
		 */
		row: number;
	}

	/**
	 * Pixel position coordinates.
	 *
	 * Exact pixel coordinates for positioning. Used when precise pixel-level positioning is required, as opposed to character grid coordinates.
	 */
	interface PositionPx {
		/**
		 * X coordinate in pixels.
		 */
		x: number;

		/**
		 * Y coordinate in pixels.
		 */
		y: number;
	}

	/**
	 * Press state data (mouse or touch).
	 *
	 * Press data from the primary pointer: the mouse, or the primary touch. Returned by inPress() and passed to onPress callbacks; type tells which input it came from. It has the fields of MouseData or TouchData, plus touches. A touch is primary when it starts with no other touch down, and stays primary until it lifts; after that, no touch is primary until every touch is up.
	 *
	 * Press data is created once per event and frozen, and can be serialized with JSON.stringify().
	 */
	interface PressData {
		/**
		 * X coordinate in pixels.
		 */
		x: number;

		/**
		 * Y coordinate in pixels.
		 */
		y: number;

		/**
		 * X coordinate before this event; the current X on a pointer's first event.
		 */
		lastX: number;

		/**
		 * Y coordinate before this event; the current Y on a pointer's first event.
		 */
		lastY: number;

		/**
		 * Mouse: the MouseData button bitmask. Touch: 1 while the primary touch is down, 0 after.
		 */
		buttons: number;

		/**
		 * Last action: 'down', 'move', or 'up'.
		 */
		action: string;

		/**
		 * Input type: 'mouse', 'pen', or 'touch'.
		 */
		type: string;

		/**
		 * Pointer identifier of the mouse, pen, or primary touch.
		 */
		id: number;

		/**
		 * True for a release the player did not make, as in MouseData and TouchData.
		 */
		cancelled: boolean;

		/**
		 * The frozen inTouch() list of the touches still down; empty for the mouse.
		 */
		touches: Array<TouchData>;
	}

	/**
	 * Image source accepted by a sampler2D custom uniform.
	 *
	 * Accepts the same direct image inputs as drawImage, registered names, and screens.
	 */
	type ShaderImageInput =
		string |
		HTMLImageElement |
		HTMLVideoElement |
		HTMLCanvasElement |
		ImageBitmap |
		ImageData |
		OffscreenCanvas |
		Screen;

	/**
	 * Copied lifecycle and diagnostic information for a custom shader.
	 */
	interface ShaderInfo {
		/**
		 * Shader handle id.
		 */
		id: number;

		/**
		 * Full GLSL ES 3.00 fragment source.
		 */
		fragmentSource: string;

		/**
		 * Copied default custom uniform values.
		 */
		uniforms: ShaderUniforms;

		/**
		 * Number of screens that have compiled and cached the shader.
		 */
		compiledScreenCount: number;

		/**
		 * Total queued framebuffer passes using the shader across all screens.
		 */
		queuedPassCount: number;

		/**
		 * Number of screens currently using this shader for display presentation.
		 */
		displayScreenCount: number;

		/**
		 * Selected-screen details when a current screen is available.
		 */
		screen?: ShaderScreenInfo;
	}

	/**
	 * Flat numeric or boolean data for vector, matrix, and uniform-array values.
	 *
	 * Matrices use WebGL column-major order.
	 */
	type ShaderNumericData =
		number[] |
		boolean[] |
		Float32Array |
		Int32Array |
		Uint32Array;

	/**
	 * Custom shader lifecycle details for one screen.
	 */
	interface ShaderScreenInfo {
		/**
		 * Whether this screen has compiled and cached the shader.
		 */
		compiled: boolean;

		/**
		 * Number of queued framebuffer passes using the shader on this screen.
		 */
		queuedPassCount: number;

		/**
		 * Whether this shader is the screen's active display shader.
		 */
		displayActive: boolean;

		/**
		 * Reflected active uniforms, empty until the shader is compiled on this screen.
		 */
		uniforms: ShaderUniformInfo[];
	}

	/**
	 * Reflected information about one active GLSL uniform.
	 */
	interface ShaderUniformInfo {
		/**
		 * Uniform name with any trailing array [0] removed.
		 */
		name: string;

		/**
		 * Readable GLSL ES type name, or unknown for an unsupported reflected type.
		 */
		type: string;

		/**
		 * Uniform array length, or 1 for a non-array uniform.
		 */
		size: number;

		/**
		 * Whether Pi.js owns and supplies this built-in uniform.
		 */
		reserved: boolean;
	}

	/**
	 * Custom shader uniform values keyed by GLSL uniform name.
	 *
	 * Unknown names and reserved Pi.js built-in uniform names are ignored.
	 */
	type ShaderUniforms = Record<string, ShaderUniformValue>;

	/**
	 * Value accepted for one reflected custom shader uniform.
	 *
	 * The GLSL declaration determines how the value is interpreted.
	 */
	type ShaderUniformValue =
		number |
		boolean |
		ShaderNumericData |
		ShaderImageInput |
		ShaderImageInput[];

	/**
	 * Width and height dimensions object.
	 *
	 * Size object containing width and height dimensions. Used in resize callbacks and other operations that need dimension information.
	 */
	interface Size {
		/**
		 * Width in pixels.
		 */
		width: number;

		/**
		 * Height in pixels.
		 */
		height: number;
	}

	/**
	 * Spritesheet metadata including frame information.
	 *
	 * Spritesheet data object containing frame count and detailed frame information. Returned by getSpritesheetData().
	 */
	interface SpritesheetData {
		/**
		 * Total number of frames in the spritesheet.
		 */
		frameCount: number;

		/**
		 * Array of FrameData objects, one for each frame in the spritesheet.
		 */
		frames: Array<FrameData>;
	}

	/**
	 * Single touch point data.
	 *
	 * Data for one touch point. inTouch() returns the touches still down, and onTouch callbacks receive the touch the event changed, in an array. Touch data is created once per event and frozen: the touch in the handlers' array is the same object inTouch() lists.
	 */
	interface TouchData {
		/**
		 * Current X coordinate in pixels. A touch that moves or ends outside the screen reports its true position, which can be outside the screen.
		 */
		x: number;

		/**
		 * Current Y coordinate in pixels.
		 */
		y: number;

		/**
		 * X coordinate before this event; the current X on the touch's first event.
		 */
		lastX: number;

		/**
		 * Y coordinate before this event; the current Y on the touch's first event.
		 */
		lastY: number;

		/**
		 * 1 while the touch is down, 0 when it ends.
		 */
		buttons: number;

		/**
		 * This touch's last action: 'down', 'move', or 'up'.
		 */
		action: string;

		/**
		 * Input type, always 'touch' for touch data.
		 */
		type: string;

		/**
		 * Touch identifier, the same for every event of one touch.
		 */
		id: number;

		/**
		 * True for an end the player did not make: the browser cancelled the touch, the page was hidden, or stopTouch() was called. False otherwise.
		 */
		cancelled: boolean;
	}

	/**
	 * Wheel event data.
	 *
	 * Data for one wheel event, passed to onWheel callbacks. It is created once per event and frozen. Deltas are in CSS pixels: positive deltaY scrolls down, and positive deltaX scrolls right.
	 */
	interface WheelData {
		/**
		 * X coordinate of the pointer in pixels; outside the screen over the border.
		 */
		x: number;

		/**
		 * Y coordinate of the pointer in pixels.
		 */
		y: number;

		/**
		 * Horizontal scroll amount in CSS pixels.
		 */
		deltaX: number;

		/**
		 * Vertical scroll amount in CSS pixels; positive when the wheel turns down.
		 */
		deltaY: number;
	}

	interface Screen extends PluginScreenCommands {
		/**
		 * Appends new colors to the current palette and returns their indices.
		 *
		 * Adds colors that do not already exist in the palette, returning the indices of the newly added entries.
		 * @param colors Array of colors to add (names, hex, RGB[A]).
		 * @returns Array of indices for colors that were added to the palette.
		 */
		addPalColors( params: { "colors": Array<any> } ): Array<number>;
		addPalColors( colors: Array<any> ): Array<number>;

		/**
		 * Applies a custom shader to the screen at the current point in draw order.
		 *
		 * Applies a custom fragment shader to the current screen pixels. Pi.js drawing commands write into the logical framebuffer at the screen's resolution. applyShader samples that framebuffer through u_texture, runs your shader over every pixel, and replaces those pixels with the result. Drawing that happens after applyShader appears on top. Call it more than once to stack effects.
		 *
		 * This is part of drawing, not presentation. It changes the actual screen pixels, works on onscreen and offscreen screens, and always processes the full logical framebuffer even inside a view. After drawing, Pi.js presents the logical framebuffer to the canvas. Use setDisplayShader for a presentation effect that does not change logical pixels. For applyShader, u_sourceSize and u_outputSize are both the logical screen size.
		 *
		 * Write the fragment shader with createShader. Pi.js supplies a fullscreen-quad vertex stage, so you only write GLSL ES 3.00 fragment source. A good shader:
		 *
		 * - Starts with "#version 300 es" and a precision qualifier such as precision mediump float
		 * - Declares in vec2 v_texCoord, uniform sampler2D u_texture, and out vec4 fragColor
		 * - Reads the current screen with texture(u_texture, v_texCoord)
		 * - Writes a complete premultiplied color; the shader replaces pixels and does not blend
		 * - Declares built-in uniforms only when needed: u_texture (sampler2D), u_sourceSize (vec2), u_outputSize (vec2), u_time (float seconds), and u_frame (int)
		 * - Keeps RGB between zero and alpha, with zero RGB at zero alpha
		 *
		 * Framebuffers, u_texture, custom sampler2D images, and fragment outputs use premultiplied RGBA: RGB is multiplied by alpha. For opacity, multiply all four channels. For inversion, use vec4(color.a - color.rgb, color.a). Unpremultiply with a zero-alpha guard before straight-color math, then premultiply the result before output.
		 *
		 * v_texCoord uses bottom-left/y-up UVs. Custom sampler2D images match the same orientation as u_texture. Drawing coordinates remain top-left/y-down. Convert UVs to screen pixels with vec2(uv.x, 1.0 - uv.y) * u_sourceSize.
		 *
		 * Per-call uniforms merge over createShader defaults for that invocation only. Built-in names cannot be overridden from JavaScript. Sampler images are captured when applyShader is called. A custom sampler cannot be the same screen the shader is applied to. Known uniform values with an invalid type or component count throw synchronously. Video sources refresh when decoded data is available; first use without a decoded frame throws IMAGE_NOT_READY, otherwise the last valid upload is retained. No video rendering loop is created.
		 * @param shaderHandle Shader handle returned by createShader.
		 * @param uniforms Optional per-call uniform overrides for this invocation.
		 * @returns This function does not return a value.
		 */
		applyShader( params: { "shaderHandle": number; "uniforms"?: ShaderUniforms } ): void;
		applyShader( shaderHandle: number, uniforms?: ShaderUniforms ): void;

		/**
		 * Draws an arc on the screen.
		 *
		 * This function renders a circular arc segment to the active canvas.
		 *
		 * The angles are measured in degrees, clockwise from the positive x-axis. Equal start and end angles draw nothing. A difference of 360 degrees or more draws one complete outline matching circle(). Shorter differences wrap clockwise from the starting angle to the ending angle.
		 * @param x The x coordinate of the center point of the arc's circle.
		 * @param y The y coordinate of the center point of the arc's circle.
		 * @param radius The radius of the arc's circle.
		 * @param angle1 The starting angle in degrees.
		 * @param angle2 The ending angle in degrees.
		 * @returns This function does not return a value.
		 */
		arc( params: { "x": number; "y": number; "radius": number; "angle1": number; "angle2": number } ): void;
		arc( x: number, y: number, radius: number, angle1: number, angle2: number ): void;

		/**
		 * Draws a bezier curve on the screen.
		 *
		 * This function renders a cubic Bezier curve to the active canvas.
		 *
		 * A Bezier curve is defined by four control points: two endpoints and two control points that influence the curve's shape.
		 * @param x1 The x coordinate of the first control point (starting point).
		 * @param y1 The y coordinate of the first control point (starting point).
		 * @param x2 The x coordinate of the second control point.
		 * @param y2 The y coordinate of the second control point.
		 * @param x3 The x coordinate of the third control point.
		 * @param y3 The y coordinate of the third control point.
		 * @param x4 The x coordinate of the fourth control point (ending point).
		 * @param y4 The y coordinate of the fourth control point (ending point).
		 * @returns This function does not return a value.
		 */
		bezier( params: { "x1": number; "y1": number; "x2": number; "y2": number; "x3": number; "y3": number; "x4": number; "y4": number } ): void;
		bezier( x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number ): void;

		/**
		 * Blits an image element directly onto the screen using replace batch mode.
		 *
		 * Blits an Image or Canvas element directly onto the screen. Unlike drawImage, this function accepts an image element directly (not a name) and uses replace batch mode for faster rendering. The angle parameter is in radians (not degrees).
		 *
		 * Note: The official recommended method for drawing images is the drawImage command as it has more safety with parameter validation and is still pretty fast.  So unless you really need the extra performance boost or you do not want to do any blending with the screen then you should stick with the drawImage command.
		 * @param img Image or Canvas element to blit (not a name string).
		 * @param x X (horizontal) coordinate (default 0).
		 * @param y Y (vertical) coordinate (default 0).
		 * @param color Optional color multiplier. Can be a palette index or color value (string, array, object, number). Defaults to white.
		 * @param anchorX X (horizontal) rotation point (0.0-1.0). Defaults to screen's default anchor.
		 * @param anchorY Y (vertical) rotation point (0.0-1.0). Defaults to screen's default anchor.
		 * @param scaleX Scale factor X (default 1).
		 * @param scaleY Scale factor Y (default 1).
		 * @param angleRad Rotation angle in radians (default 0).
		 * @returns This function does not return a value.
		 */
		blitImage( params: { "img": HTMLImageElement | HTMLCanvasElement; "x"?: number; "y"?: number; "color"?: any; "anchorX"?: number; "anchorY"?: number; "scaleX"?: number; "scaleY"?: number; "angleRad"?: number } ): void;
		blitImage( img: HTMLImageElement | HTMLCanvasElement, x?: number, y?: number, color?: any, anchorX?: number, anchorY?: number, scaleX?: number, scaleY?: number, angleRad?: number ): void;

		/**
		 * Blits a frame from a spritesheet onto the screen using replace batch mode.
		 *
		 * Blits a specific frame from a previously loaded spritesheet. Unlike drawSprite, this function uses replace batch mode for faster rendering. The angle parameter is in radians (not degrees).
		 *
		 * Note: The official recommended method for drawing sprites is the drawSprite command as it has more safety with parameter validation and is still pretty fast.  So unless you really need the extra performance boost or you do not want to do any blending with the screen then you should stick with the drawSprite command.
		 * @param name Spritesheet name.
		 * @param frame Frame index to draw (default 0).
		 * @param x X (horizontal) coordinate (default 0).
		 * @param y Y (vertical) coordinate (default 0).
		 * @param color Optional color multiplier. Can be a palette index or color value (string, array, object, number). Defaults to white.
		 * @param anchorX X (horizontal) rotation point (0.0-1.0). Defaults to screen's default anchor.
		 * @param anchorY Y (vertical) rotation point (0.0-1.0). Defaults to screen's default anchor.
		 * @param scaleX Scale factor X (default 1).
		 * @param scaleY Scale factor Y (default 1).
		 * @param angleRad Rotation angle in radians (default 0).
		 * @returns This function does not return a value.
		 */
		blitSprite( params: { "name": string; "frame"?: number; "x"?: number; "y"?: number; "color"?: any; "anchorX"?: number; "anchorY"?: number; "scaleX"?: number; "scaleY"?: number; "angleRad"?: number } ): void;
		blitSprite( name: string, frame?: number, x?: number, y?: number, color?: any, anchorX?: number, anchorY?: number, scaleX?: number, scaleY?: number, angleRad?: number ): void;

		/**
		 * Calculates the pixel width of a text message.
		 *
		 * Calculates how many pixels wide a text message will be when printed with the current font and print scale settings.
		 * @param msg Text message to calculate width for. Defaults to empty string if not provided.
		 * @returns Width of the text in pixels.
		 */
		calcWidth( params: { "msg"?: string } ): number;
		calcWidth( msg?: string ): number;

		/**
		 * Cancels the current input prompt on this screen.
		 *
		 * Cancels the active input prompt on the current screen. The input promise will resolve with null, and the callback (if provided) will also be passed in the value null.
		 * @returns This function does not return a value.
		 */
		cancelInput(): void;

		/**
		 * Returns the HTMLCanvasElement for the current screen.
		 *
		 * Gets the underlying HTMLCanvasElement DOM element for the active screen. This can be used for direct canvas manipulation or integration with other libraries.
		 *
		 * Note: This is for applying CSS styles to the canvas or moving the canvas in the DOM. You cannot call getContext( "2d" ) on the returned canvas element as it already has a WebGL context. If you want to use a 2d canvas context on a screen you can create a new DOM canvas and draw it as an image on the screen.
		 * @returns The canvas DOM element for the current screen.
		 */
		canvas(): HTMLCanvasElement;

		/**
		 * Draws a circle on the screen.
		 *
		 * This function renders a circle to the active canvas.
		 *
		 * The circle is drawn with a border using the current foreground color. If a fill color is provided, the circle will be filled with that color.
		 * @param x The x coordinate of the center of the circle.
		 * @param y The y coordinate of the center of the circle.
		 * @param radius The radius of the circle.
		 * @param fillColor The fill color for the circle. Can be a palette index or color value (string, array, object, number).
		 * @returns This function does not return a value.
		 */
		circle( params: { "x": number; "y": number; "radius": number; "fillColor"?: any } ): void;
		circle( x: number, y: number, radius: number, fillColor?: any ): void;

		/**
		 * Clears events from all plugins or a specific plugin event type.
		 *
		 * Clears queued/registered events. If type is provided, clears only that event type; otherwise clears events for all registered types.
		 *
		 * $.clearEvents() clears per-screen handlers on every screen. A screen's clearEvents(), such as screen.clearEvents(), clears them on that screen only.
		 * @param type Optional type to clear (e.g., "keyboard", "mouse", "click", "gamepad").
		 * @returns This function does not return a value.
		 */
		clearEvents( params: { "type"?: string } ): void;
		clearEvents( type?: string ): void;

		/**
		 * Clears the screen or a rectangular region.
		 *
		 * This function clears the entire screen or a rectangular region of the active canvas.
		 *
		 * When x, y, width, and height are provided, only that region is cleared. Otherwise the full screen is cleared and the print cursor is reset to position (0, 0).
		 * @param x The horizontal coordinate of the region to clear.
		 * @param y The vertical coordinate of the region to clear.
		 * @param width The width of the region to clear.
		 * @param height The height of the region to clear.
		 * @returns This function does not return a value.
		 */
		cls( params: { "x"?: number; "y"?: number; "width"?: number; "height"?: number } ): void;
		cls( x?: number, y?: number, width?: number, height?: number ): void;

		/**
		 * Creates an image from a region of the current screen.
		 *
		 * Copies a rectangular region from the screen into a new canvas-backed image and stores it by name.
		 * @param name Optional unique name for the image. Auto-generated if omitted.
		 * @param x1 Left coordinate (defaults to 0).
		 * @param y1 Top coordinate (defaults to 0).
		 * @param x2 Right coordinate (defaults to screen width - 1).
		 * @param y2 Bottom coordinate (defaults to screen height - 1).
		 * @returns The created image name.
		 */
		createImageFromScreen( params: { "name"?: string; "x1"?: number; "y1"?: number; "x2"?: number; "y2"?: number } ): string;
		createImageFromScreen( name?: string, x1?: number, y1?: number, x2?: number, y2?: number ): string;

		/**
		 * Draws lines on the screen defined by a string.
		 *
		 * Draws using a BASIC-style, case-insensitive draw string composed of commands.
		 *
		 * Supported commands:
		 *
		 * - **"B":** Before a line move, hides the line move (blind move).
		 * - **"Cn"**: Set the color attribute to palette index n.
		 * - **"C#RRGGBB"**: Set the color using a hex value (e.g., C#FF00FF).
		 * - **"Mn, n"**: Move to absolute coordinate (x, y) without drawing.
		 * - **"N"**: Return to the starting position after the next drawn segment.
		 * - **"Pn[, n]"**: Paint enclosed area from the cursor using color index; optional boundary color index.
		 * - **"Dn"**: Draw a vertical line DOWN n pixels.
		 * - **"En"**: Draw a diagonal line UP and RIGHT n pixels each direction (slash /).
		 * - **"Fn"**: Draw a diagonal line DOWN and RIGHT n pixels each direction.
		 * - **"Gn"**: Draw a diagonal line DOWN and LEFT n pixels each direction (slash /).
		 * - **"Hn"**: Draw a diagonal line UP and LEFT n pixels each direction.
		 * - **"Ln"**: Draw a horizontal line LEFT n pixels.
		 * - **"Rn"**: Draw a horizontal line RIGHT n pixels.
		 * - **"Un"**: Draw a vertical line UP n pixels.
		 * - **"Sn"**: Set scale factor; n in [1..255], actual scale is n/4 (default 1).
		 * - **"An"**: Set angle by quadrant; n in {0,1,2,3} maps to 0°, 90°, 180°, 270°.
		 * - **"TAn"**: Turn Angle; set any angle n from -360 to 360 degrees.
		 * - **"ARCn, n, n"**: Draw an arc with radius, start degrees, end degrees using the cursor as center.
		 * @param drawString Case insensitive string containing draw commands.
		 * @returns This function does not return a value.
		 */
		draw( params: { "drawString": string } ): void;
		draw( drawString: string ): void;

		/**
		 * Draws an image onto the screen.
		 *
		 * Draws an image (by name or element) using optional color, anchor, scale, and rotation parameters.
		 * @param image Image name (string), url (string), screen object, or Image/Canvas element.
		 * @param x X (horizontal) coordinate.
		 * @param y Y (vertical) coordinate.
		 * @param color Optional color multiplier.  Can be a palette index or color value (string, array, object, number).
		 * @param anchorX X (horizontal) rotation point (0.0-1.0).
		 * @param anchorY Y (vertical) rotation point (0.0-1.0).
		 * @param scaleX Scale factor X (default 1).
		 * @param scaleY Scale factor Y (default 1).
		 * @param angle Rotation angle in degrees (default 0).
		 * @returns This function does not return a value.
		 */
		drawImage( params: { "image": any; "x": number; "y": number; "color"?: any; "anchorX"?: number; "anchorY"?: number; "scaleX"?: number; "scaleY"?: number; "angle"?: number } ): void;
		drawImage( image: any, x: number, y: number, color?: any, anchorX?: number, anchorY?: number, scaleX?: number, scaleY?: number, angle?: number ): void;

		/**
		 * Draws a frame from a spritesheet onto the screen.
		 *
		 * Draws a specific frame from a previously loaded spritesheet with optional color, anchor, scale, and rotation parameters.
		 * @param name Spritesheet name.
		 * @param frame Frame index to draw (default 0).
		 * @param x X (horizontal) coordinate.
		 * @param y Y (vertical) coordinate.
		 * @param color Optional color multiplier.  Can be a palette index or color value (string, array, object, number).
		 * @param anchorX Anchor X (0.0-1.0). Defaults to screen's default anchor.
		 * @param anchorY Anchor Y (0.0-1.0). Defaults to screen's default anchor.
		 * @param scaleX Scale factor X (default 1).
		 * @param scaleY Scale factor Y (default 1).
		 * @param angle Rotation angle in degrees (default 0).
		 * @returns This function does not return a value.
		 */
		drawSprite( params: { "name": string; "frame"?: number; "x": number; "y": number; "color"?: any; "anchorX"?: number; "anchorY"?: number; "scaleX"?: number; "scaleY"?: number; "angle"?: number } ): void;
		drawSprite( name: string, frame: number | undefined, x: number, y: number, color?: any, anchorX?: number, anchorY?: number, scaleX?: number, scaleY?: number, angle?: number ): void;

		/**
		 * Draws an ellipse on the screen.
		 *
		 * This function renders an ellipse to the active canvas.
		 *
		 * The ellipse is drawn with a border using the current foreground color. If a fill color is provided, the ellipse will be filled with that color.
		 * @param x The x coordinate of the center of the ellipse.
		 * @param y The y coordinate of the center of the ellipse.
		 * @param radiusX The horizontal radius of the ellipse.
		 * @param radiusY The vertical radius of the ellipse.
		 * @param fillColor The fill color for the ellipse. Can be a palette index or color value (string, array, object, number).
		 * @returns This function does not return a value.
		 */
		ellipse( params: { "x": number; "y": number; "radiusX": number; "radiusY": number; "fillColor"?: any } ): void;
		ellipse( x: number, y: number, radiusX: number, radiusY: number, fillColor?: any ): void;

		/**
		 * Applies a filter function to a rectangular region of the screen.
		 *
		 * Defers a CPU filter until after the current synchronous work. The callback receives a reusable pixel buffer (RGBA as Uint8ClampedArray) and view-local x, y coordinates. Return truthy to keep the modified pixel, or falsy to make it transparent. Copy the buffer to retain a pixel beyond its callback.
		 *
		 * The region and view coordinates are captured when called. Pixel data is read when the queued filter runs. Removing the screen cancels queued filtering without invoking the callback. If a callback removes its own screen, filtering stops immediately, with no further callbacks or pixel upload. This command returns no promise; callback exceptions retain their normal behavior. Drawing performed synchronously after the call is included when the filter reads the framebuffer. Continue on a later task or animation frame to capture the result or draw above it.
		 *
		 * Filtering runs on the CPU rather than the GPU, so large areas may not be suitable for use in an animationFrame.
		 * @param filter Callback (color, x, y): color holds RGBA at indices 0-3. Return truthy to keep the modified pixel, or falsy to make it transparent. Copy the buffer to retain it.
		 * @param x1 Left coordinate (default 0).
		 * @param y1 Top coordinate (default 0).
		 * @param x2 Right coordinate (default screen width - 1).
		 * @param y2 Bottom coordinate (default screen height - 1).
		 * @returns This function does not return a value.
		 */
		filterImg( params: { "filter": ( color: Uint8ClampedArray, x: number, y: number ) => boolean; "x1"?: number; "y1"?: number; "x2"?: number; "y2"?: number } ): void;
		filterImg( filter: ( color: Uint8ClampedArray, x: number, y: number ) => boolean, x1?: number, y1?: number, x2?: number, y2?: number ): void;

		/**
		 * Reads a region of pixels as indices (default) or color values.
		 *
		 * Returns a 2D array [height][width] for the region. By default returns palette indices. Set asIndex=false to return color value objects. Tolerance controls color-to-index matching. If a color that doesn't match is not found the index 0 for black/transparent will be set.
		 *
		 * Note: if asIndex is set to false then the 2D array cannot be used with the put command.
		 * @param x Left coordinate.
		 * @param y Top coordinate.
		 * @param width Region width.
		 * @param height Region height.
		 * @param tolerance Color matching tolerance [0.0-1.0] for index conversion (default 1).
		 * @param asIndex If false (default true), return color value objects instead of indices.
		 * @returns 2D array [height][width] of palette indices (default) or color values.
		 */
		get( params: { "x": number; "y": number; "width": number; "height": number; "tolerance"?: number; "asIndex"?: boolean } ): Array<Array<number | PiColor>>;
		get( x: number, y: number, width: number, height: number, tolerance?: number, asIndex?: boolean ): Array<Array<number | PiColor>>;

		/**
		 * Asynchronously reads a region of pixels as indices (default) or color values.
		 *
		 * Returns a Promise resolving to a 2D array [height][width]. By default resolves to palette indices. Set asIndex=false to resolve to color value objects. Tolerance controls color-to-index matching.
		 *
		 * The region uses the view captured when called; pixel data is read in a deferred microtask. If the screen is removed before deferred processing completes, the promise rejects with an Error whose code is "SCREEN_REMOVED". Other read failures reject with the original error. Empty or out-of-bounds results completed immediately are unaffected by later screen removal. Invalid arguments still throw synchronously.
		 *
		 * Note: if asIndex is set to false then the 2D array cannot be used with the put command.
		 * @param x Left coordinate.
		 * @param y Top coordinate.
		 * @param width Region width.
		 * @param height Region height.
		 * @param tolerance Color matching tolerance [0.0-1.0] for index conversion (default 1).
		 * @param asIndex If false, resolve to color value objects instead of indices.
		 * @returns Resolves to a 2D array [height][width] of indices (default) or color values. Rejects with code
SCREEN_REMOVED if the screen is removed before deferred processing completes, or with the
original read error.
		 */
		getAsync( params: { "x": number; "y": number; "width": number; "height": number; "tolerance"?: number; "asIndex"?: boolean } ): Promise<Array<Array<number | PiColor>>>;
		getAsync( x: number, y: number, width: number, height: number, tolerance?: number, asIndex?: boolean ): Promise<Array<Array<number | PiColor>>>;

		/**
		 * Gets the current foreground color.
		 *
		 * Returns the current drawing color. If asIndex is true, returns the palette index; otherwise returns the color value object.
		 * @param asIndex If true returns the palette index, otherwise returns a color value object.
		 * @returns Palette index if asIndex is true; otherwise a color value object.
		 */
		getColor( params: { "asIndex"?: boolean } ): number | PiColor;
		getColor( asIndex?: boolean ): number | PiColor;

		/**
		 * Returns the number of character columns that fit on the screen.
		 *
		 * Gets the maximum number of character columns that can fit horizontally on the screen based on the current font size and print scale.
		 * @returns Number of columns that fit on the screen.
		 */
		getCols(): number;

		/**
		 * Returns the current color palette as an array.
		 *
		 * Gets the active screen's color palette. By default, index 0 (transparent black) is excluded. Note: Color indices may not match exactly because index 0 is strictly reserved for transparent black.
		 * @param include0 If true include palette index 0 (transparent black).
		 * @returns Array of color value objects representing the current screen palette.
		 */
		getPal( params: { "include0"?: boolean } ): Array<PiColor>;
		getPal( include0?: boolean ): Array<PiColor>;

		/**
		 * Returns the color value object for a palette index.
		 *
		 * Returns the color value object at a numeric integer palette index. Index 0 is transparent black. Returns null for nonnumeric indices, non-finite numbers, fractions, and indices outside the palette.
		 * @param index Finite integer from 0 through the last palette entry.
		 * @returns Color value object if the index is valid; otherwise null.
		 */
		getPalColor( params: { "index": number } ): PiColor | null;
		getPalColor( index: number ): PiColor | null;

		/**
		 * Finds the palette index for a color with optional tolerance.
		 *
		 * Finds the best-matching palette index for a given color. Tolerance filters how close the match must be: 0 = exact match only, 1 = any color. The closest color that fits in the tolerance range will be returned.
		 * @param color Palette index or color value (string, array, object, number).
		 * @param tolerance Number between 0 and 1 indicating acceptable color difference.
		 * @returns Palette index if a match is found; otherwise null.
		 */
		getPalIndex( params: { "color": any; "tolerance"?: number } ): number | null;
		getPalIndex( color: any, tolerance?: number ): number | null;

		/**
		 * Reads the color of a single pixel.
		 *
		 * Returns the color at (x, y). If asIndex is true, returns the palette index; otherwise returns a color value object.
		 * @param x X (horizontal) coordinate.
		 * @param y Y (vertical) coordinate.
		 * @param asIndex If true, return palette index instead of color value.
		 * @returns Palette index if asIndex is true; otherwise a color value object.
		 */
		getPixel( params: { "x": number; "y": number; "asIndex"?: boolean } ): number | PiColor;
		getPixel( x: number, y: number, asIndex?: boolean ): number | PiColor;

		/**
		 * Asynchronously reads the color of a single pixel.
		 *
		 * Reads the color at (x, y) asynchronously. If asIndex is true, resolves to the palette index; otherwise resolves to a color value object.
		 *
		 * Coordinates use the view captured when called; pixel data is read in a deferred microtask. If the screen is removed before deferred processing completes, the promise rejects with an Error whose code is "SCREEN_REMOVED". Other read failures reject with the original error. An out-of-bounds result completed immediately is unaffected by later screen removal. Invalid arguments still throw synchronously.
		 * @param x X (horizontal) coordinate.
		 * @param y Y (vertical) coordinate.
		 * @param asIndex If true, resolve to palette index instead of color value.
		 * @returns Resolves to a palette index or color value object. Rejects with code SCREEN_REMOVED if the
screen is removed before deferred processing completes, or with the original read error.
		 */
		getPixelAsync( params: { "x": number; "y": number; "asIndex"?: boolean } ): Promise<number | object>;
		getPixelAsync( x: number, y: number, asIndex?: boolean ): Promise<number | object>;

		/**
		 * Gets the current print cursor position as column and row.
		 *
		 * Returns the current print cursor position as character grid coordinates (column and row). The grid size is determined by the current font size and print scale.
		 * @returns Object with col and row properties (0-indexed).
		 */
		getPos(): Position;

		/**
		 * Gets the current print cursor position in pixels.
		 *
		 * Returns the current print cursor position as exact pixel coordinates.
		 * @returns Object with x and y properties in pixels.
		 */
		getPosPx(): PositionPx;

		/**
		 * Returns the number of character rows that fit on the screen.
		 *
		 * Gets the maximum number of character rows that can fit vertically on the screen based on the current font size and print scale.
		 * @returns Number of rows that fit on the screen.
		 */
		getRows(): number;

		/**
		 * Returns lifecycle and reflection diagnostics for a custom shader.
		 *
		 * Returns a copied snapshot containing the shader source, default uniforms, and aggregate counts for compiled screens, queued passes, and active display screens. When a current screen is available, the result also describes that screen's compilation state, queued passes, display use, and reflected uniforms.
		 *
		 * This function never compiles the shader or allocates GPU resources. An unused shader reports an uncompiled screen with an empty reflected-uniform list. Unknown handles throw INVALID_SHADER_HANDLE synchronously.
		 * @param shaderHandle Shader handle returned by createShader.
		 * @returns Copied shader lifecycle and diagnostic information.
		 */
		getShaderInfo( params: { "shaderHandle": number } ): ShaderInfo;
		getShaderInfo( shaderHandle: number ): ShaderInfo;

		/**
		 * Returns frame metadata for a spritesheet.
		 *
		 * Gets spritesheet data including frame count and per-frame bounding boxes.
		 * @param name Spritesheet name.
		 * @returns Object with frameCount and frames array (index, x, y, width, height, left, top, right, bottom).
		 */
		getSpritesheetData( params: { "name": string } ): SpritesheetData;
		getSpritesheetData( name: string ): SpritesheetData;

		/**
		 * Returns the screen or active view height in pixels.
		 *
		 * Gets the internal height of the active screen's canvas. This is the logical height used for drawing operations, which may differ from the CSS display size.
		 *
		 * If there is an active view using pushView then it will return the height of the local viewport area and not the screen height.
		 * @returns Screen or local view height in pixels.
		 */
		height(): number;

		/**
		 * Gets the current mouse state and starts tracking if needed.
		 *
		 * Returns the mouse data from the latest mouse event, or null before the first event and while tracking is stopped. The first call starts tracking unless stopMouse() was called.
		 *
		 * Only buttons pressed on the screen are counted. A drag that ends outside the canvas still releases its button.
		 *
		 * Requires an onscreen screen.
		 * @returns Frozen mouse data of the latest event, or null before it and while stopped.
		 */
		inMouse(): MouseData | null;

		/**
		 * Gets the current press state (mouse or touch) and starts tracking if needed.
		 *
		 * Returns the press of the primary pointer, from whichever was used last: the mouse, or the primary touch. A touch is primary when it starts with no other touch down, and stays primary until it lifts. Returns null before the first event, and while the input of the latest press is stopped.
		 *
		 * The first call starts mouse and touch tracking unless they were stopped.
		 *
		 * Requires an onscreen screen.
		 * @returns Frozen press data of the primary pointer, from the mouse or touch, or null.
		 */
		inPress(): PressData | null;

		/**
		 * Prompts the user for text input with a blinking cursor.
		 *
		 * Shows a prompt at the print cursor and waits for the user to type. Enter completes the input and Escape cancels it. Returns a Promise that resolves with the value, or null when cancelled, and calls fn with the same value when fn is given.
		 *
		 * The prompt stays on one line. When it ends, printing continues on the next line. It reads keys itself, so it works after stopKeyboard(). Keys typed into the prompt do not reach onKey() or inKey().
		 *
		 * With isNumber or isInteger, only a number is accepted and the promise resolves with a number. isInteger rejects a decimal point. allowNegative accepts a leading minus sign. A value with no digits resolves to 0.
		 *
		 * The prompt is also cancelled by cancelInput(), by clearEvents( "keyboard" ) on its screen, by removing that screen, or by starting another input.
		 * @param prompt Prompt text to display before the input field.
		 * @param fn Optional callback function called with the input value, or null if cancelled.
		 * @param cursor Cursor character to display. Omitted or empty, it is character code 219, which the built-in fonts draw as a block.
		 * @param isNumber If true, only accepts a number and resolves with a number.
		 * @param isInteger If true, only accepts an integer, with no decimal point, and resolves with a number, with or without isNumber.
		 * @param allowNegative If true, a numeric input accepts a leading minus sign.
		 * @param maxLength Maximum length of the input, at least 1, including a minus sign. Null or omitted for no limit.
		 * @returns Promise that resolves with the input value, a number for numeric input, or null if cancelled.
		 */
		input( params: { "prompt": string; "fn"?: ( value: string | number | null ) => void; "cursor"?: string; "isNumber"?: boolean; "isInteger"?: boolean; "allowNegative"?: boolean; "maxLength"?: number | null } ): Promise<string | number | null>;
		input( prompt: string, fn?: ( value: string | number | null ) => void, cursor?: string, isNumber?: boolean, isInteger?: boolean, allowNegative?: boolean, maxLength?: number | null ): Promise<string | number | null>;

		/**
		 * Gets the current touch state and starts tracking if needed.
		 *
		 * Returns the touches still down, or an empty array when none is down or tracking is stopped. The first call starts tracking unless stopTouch() was called.
		 *
		 * A touch that starts on the canvas border or padding is not included. Held touches are released when the page is hidden or stopTouch() is called.
		 *
		 * Requires an onscreen screen.
		 * @returns Touches still down; empty when none is down.
		 */
		inTouch(): Array<TouchData>;

		/**
		 * Draws a line on the screen.
		 *
		 * This function renders a line segment to the active canvas.
		 *
		 * The line is drawn from the first point to the second point using the current foreground color.
		 * @param x1 The x coordinate of the starting point of the line.
		 * @param y1 The y coordinate of the starting point of the line.
		 * @param x2 The x coordinate of the ending point of the line.
		 * @param y2 The y coordinate of the ending point of the line.
		 * @returns This function does not return a value.
		 */
		line( params: { "x1": number; "y1": number; "x2": number; "y2": number } ): void;
		line( x1: number, y1: number, x2: number, y2: number ): void;

		/**
		 * Removes a click event handler.
		 *
		 * Removes a click callback registered with onClick. If fn is omitted, removes every click callback on the screen.
		 * @param fn Callback function to remove. If omitted or null, removes every click handler.
		 * @returns This function does not return a value.
		 */
		offClick( params: { "fn"?: ( clickData: ClickData, customData?: object ) => void } ): void;
		offClick( fn?: ( clickData: ClickData, customData?: object ) => void ): void;

		/**
		 * Removes a mouse event handler.
		 *
		 * Removes callbacks registered with onMouse. A callback is identified by its mode and function.
		 *
		 * With a mode and a function, removes that callback. Without a function, removes every callback of the mode. With a function and no mode, removes the function from every mode.
		 * @param mode Mode ('down', 'up', or 'move'); if omitted or null, fn is removed from every mode.
		 * @param fn Callback function to remove. If omitted or null, removes every handler of the mode.
		 * @returns This function does not return a value.
		 */
		offMouse( params: { "mode"?: string | null; "fn"?: ( mouseData: MouseData, customData?: object ) => void } ): void;
		offMouse( mode?: string | null, fn?: ( mouseData: MouseData, customData?: object ) => void ): void;

		/**
		 * Removes a press event handler.
		 *
		 * Removes callbacks registered with onPress. A callback is identified by its mode and function.
		 *
		 * With a mode and a function, removes that callback. Without a function, removes every callback of the mode. With a function and no mode, removes the function from every mode.
		 * @param mode Mode ('down', 'up', or 'move'); if omitted or null, fn is removed from every mode.
		 * @param fn Callback function to remove. If omitted or null, removes every handler of the mode.
		 * @returns This function does not return a value.
		 */
		offPress( params: { "mode"?: string | null; "fn"?: ( pressData: PressData, customData?: object ) => void } ): void;
		offPress( mode?: string | null, fn?: ( pressData: PressData, customData?: object ) => void ): void;

		/**
		 * Removes a touch event handler.
		 *
		 * Removes callbacks registered with onTouch. A callback is identified by its mode and function.
		 *
		 * With a mode and a function, removes that callback. Without a function, removes every callback of the mode. With a function and no mode, removes the function from every mode.
		 * @param mode Mode ('down', 'up', or 'move'); if omitted or null, fn is removed from every mode.
		 * @param fn Callback function to remove. If omitted or null, removes every handler of the mode.
		 * @returns This function does not return a value.
		 */
		offTouch( params: { "mode"?: string | null; "fn"?: ( touches: Array<TouchData>, customData?: object ) => void } ): void;
		offTouch( mode?: string | null, fn?: ( touches: Array<TouchData>, customData?: object ) => void ): void;

		/**
		 * Removes a wheel event handler.
		 *
		 * Removes a wheel callback registered with onWheel. If fn is omitted, removes every wheel callback on the screen. When the last one is removed, the page scrolls with the wheel over the canvas again.
		 * @param fn Callback function to remove. If omitted or null, removes every wheel handler.
		 * @returns This function does not return a value.
		 */
		offWheel( params: { "fn"?: ( wheelData: WheelData, customData?: object ) => void } ): void;
		offWheel( fn?: ( wheelData: WheelData, customData?: object ) => void ): void;

		/**
		 * Registers a callback function for click events (mouse or touch).
		 *
		 * Registers a callback that runs when a pointer is pressed and released inside the hit box: the left mouse button, or a single touch. Each pointer clicks on its own.
		 *
		 * A press inside the box starts the click, and the release inside the box runs the callback with the release data. A release outside the box, another mouse button, or a cancelled touch does not click. If no hitBox is given, the screen's size when the callback is registered is used.
		 *
		 * once removes the callback before its first run.
		 *
		 * Requires an onscreen screen.
		 * @param fn Callback function that receives (clickData, customData).
		 * @param once If true, this registration is removed before the callback's first run.
		 * @param hitBox Optional area the press and release must both be inside. Defaults to the screen.
		 * @param customData Optional custom data passed to the callback function.
		 * @returns This function does not return a value.
		 */
		onClick( params: { "fn": ( clickData: ClickData, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onClick( fn: ( clickData: ClickData, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Registers a callback function for mouse events.
		 *
		 * Registers a callback for mouse events. The callback receives the mouse data and any custom data. Pens are included, with type set to 'pen'. With a hitBox, the callback runs only for events inside it.
		 *
		 * 'down' runs when a button is pressed, 'move' when the pointer moves, and 'up' when a button is released. A press that starts on the canvas border or padding is ignored. A press on the canvas keeps reporting moves after it leaves the canvas, and 'up' runs for the release anywhere. 'up' also runs with cancelled set to true when the browser cancels the pointer, the page is hidden, or stopMouse() is called while a button is held.
		 *
		 * once removes the callback before its first run. Registering starts tracking unless stopMouse() was called.
		 *
		 * Requires an onscreen screen.
		 * @param mode Event mode: 'down', 'up', or 'move'.
		 * @param fn Callback function that receives (mouseData, customData).
		 * @param once If true, this registration is removed before the callback's first run.
		 * @param hitBox Optional area; the callback runs only for events inside it.
		 * @param customData Optional custom data passed to the callback function.
		 * @returns This function does not return a value.
		 */
		onMouse( params: { "mode": string; "fn": ( mouseData: MouseData, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onMouse( mode: string, fn: ( mouseData: MouseData, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Registers a callback function for press events (mouse or touch).
		 *
		 * Registers a callback for the primary pointer, either the mouse or the primary touch. Other touches are available from onTouch() and inTouch(). With a hitBox, the callback runs only for events inside it.
		 *
		 * 'down', 'move', and 'up' follow that pointer. 'up' also runs with cancelled set to true for a release the player did not make. A press that starts on the canvas border or padding is ignored.
		 *
		 * once removes the callback before its first run. Registering starts mouse and touch tracking unless they were stopped.
		 *
		 * Requires an onscreen screen.
		 * @param mode Event mode: 'down', 'up', or 'move'.
		 * @param fn Callback function that receives (pressData, customData).
		 * @param once If true, this registration is removed before the callback's first run.
		 * @param hitBox Optional area; the callback runs only for presses inside it.
		 * @param customData Optional custom data passed to the callback function.
		 * @returns This function does not return a value.
		 */
		onPress( params: { "mode": string; "fn": ( pressData: PressData, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onPress( mode: string, fn: ( pressData: PressData, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Registers a callback function for touch events.
		 *
		 * Registers a callback for touch events. The callback receives the touch that changed, in an array, and any custom data. Each touch is reported on its own. Use inTouch() for every touch still down.
		 *
		 * 'down' receives the touch that started, 'move' the touch that moved, and 'up' the touch that ended. With a hitBox, the callback receives only the changed touches inside it. A touch that starts on the canvas border or padding is ignored. A touch that starts on the canvas keeps reporting moves and its end after it leaves the canvas. 'up' also runs with cancelled set to true when the browser cancels a touch, the page is hidden, or stopTouch() is called.
		 *
		 * While touch is tracked, the browser does not scroll or zoom from touches that start on the canvas. once removes the callback before its first run. Registering starts tracking unless stopTouch() was called.
		 *
		 * Requires an onscreen screen.
		 * @param mode Event mode: 'down', 'up', or 'move'.
		 * @param fn Callback function that receives (touches, customData) with the changed touches.
		 * @param once If true, this registration is removed before the callback's first run.
		 * @param hitBox Optional area; the callback receives only the changed touches inside it.
		 * @param customData Optional custom data passed to the callback function.
		 * @returns This function does not return a value.
		 */
		onTouch( params: { "mode": string; "fn": ( touches: Array<TouchData>, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onTouch( mode: string, fn: ( touches: Array<TouchData>, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Registers a callback function for mouse wheel and trackpad scroll events.
		 *
		 * Registers a callback for mouse wheel and trackpad scroll events over the canvas. The callback receives the wheel data and any custom data. With a hitBox, it runs only for events inside it. Deltas are in CSS pixels.
		 *
		 * While a wheel callback is registered, the page does not scroll from the wheel over the canvas. When the last one is removed, the page scrolls again.
		 *
		 * once removes the callback before its first run.
		 *
		 * Requires an onscreen screen.
		 * @param fn Callback function that receives (wheelData, customData).
		 * @param once If true, this registration is removed before the callback's first run.
		 * @param hitBox Optional area the wheel event must be inside. Defaults to the whole canvas.
		 * @param customData Optional custom data passed to the callback function.
		 * @returns This function does not return a value.
		 */
		onWheel( params: { "fn": ( wheelData: WheelData, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onWheel( fn: ( wheelData: WheelData, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Flood fills an area with a color, with optional tolerance or boundary color.
		 *
		 * Performs a flood fill starting at (x, y).
		 *
		 * Modes:
		 * - Tolerance fill: Fills pixels similar to the start pixel. Tolerance 0 = exact match; 1 = any color.
		 * - Boundary fill: If boundaryColor is provided, fills until pixels similar to the boundary color.
		 *
		 * Notes:
		 * - Coordinates must be within the screen; out-of-bounds start points are ignored.
		 * - Color inputs accept palette indices or color values (name, hex, RGB[A] array, or color object).
		 * @param x X (horizontal) coordinate to start filling.
		 * @param y Y (vertical) coordinate to start filling.
		 * @param fillColor Fill color. Palette index or color value (string, array, object, number).
		 * @param tolerance Color matching tolerance [0.0-1.0]. 0 = exact match; 1 = any color.
		 * @param boundaryColor Optional boundary color (palette index or color value). Enables boundary fill mode.
		 * @returns This function does not return a value.
		 */
		paint( params: { "x": number; "y": number; "fillColor": any; "tolerance"?: number; "boundaryColor"?: any } ): void;
		paint( x: number, y: number, fillColor: any, tolerance?: number, boundaryColor?: any ): void;

		/**
		 * Draws a closed polygon outline with an optional fill.
		 *
		 * Draws a closed polygon on the current screen. The outline uses the current drawing color. If **fillColor** is supplied, the interior is filled first, then the outline is drawn on top. Omit fillColor, or pass null, to draw only the outline. fillColor accepts a palette index or any Pi.js color value.
		 *
		 * **points** is one closed path. Pass a flat array of x, y pairs, a typed array, or an array of { x, y } objects. Coordinates round to integers. Consecutive duplicate points and a repeated closing point are removed. At least three distinct rounded points are required. The path closes automatically from the last point to the first.
		 *
		 * Convex, concave, self-intersecting, and overlapping shapes are supported, including stars and bowties. Filling uses nonzero winding: overlapping regions stay filled when edges wind the same way, and cancel when they wind opposite ways. Reversing the whole path does not change the fill. Fill coverage can differ from the outline on some edges, including the bottom row. A translucent outline blends over filled boundary pixels.
		 *
		 * If the fill and outline resolve to the same RGBA color, only the fill is drawn. After filling, the current drawing color is restored.
		 *
		 * Treat **points** as immutable. polygon remembers each points collection; mutating it in place will not update the shape. Replace the array or typed array when coordinates change.
		 * @param points Flat coordinates or point objects describing one closed path.
		 * @param fillColor Optional palette index or Pi.js color value; null draws only the outline.
		 * @returns This function does not return a value.
		 */
		polygon( params: { "points": Array<number> | Array<{ x: number; y: number }> | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array; "fillColor"?: any } ): void;
		polygon( points: Array<number> | Array<{ x: number; y: number }> | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array, fillColor?: any ): void;

		/**
		 * Pops the current child view and restores the parent.
		 *
		 * Removes the top view from the stack and restores the parent print cursor. Popping the last view returns to implicit full screen. Calling popView() when the stack is empty throws VIEW_STACK_EMPTY.
		 *
		 * A view defines a local drawing area with its own origin, width, height, and clipping region. Graphics and text commands use coordinates relative to the current view and cannot draw outside its visible clipped area.
		 * @returns This function does not return a value.
		 */
		popView(): void;

		/**
		 * Prints text to the screen using the current font and advances the cursor.
		 *
		 * Prints text to the screen at the current cursor position using the active bitmap font. The text cursor automatically advances after printing. Supports automatic word wrapping, text centering, and vertical scrolling when the cursor reaches the bottom of the screen.
		 *
		 * Newlines in the message will split the text into multiple lines. Tabs are converted to spaces.
		 * @param msg Text message to print. If omitted, prints an empty line.
		 * @param isInline If true, cursor stays on the same line after printing instead of advancing to next line.
		 * @param isCentered If true, centers the text horizontally on the screen.
		 * @returns This function does not return a value.
		 */
		print( params: { "msg"?: string; "isInline"?: boolean; "isCentered"?: boolean } ): void;
		print( msg?: string, isInline?: boolean, isCentered?: boolean ): void;

		/**
		 * Sets a pixel on the screen to the current foreground color.
		 *
		 * This function sets a single pixel on the active canvas to the current foreground color.
		 *
		 * After drawing, the cursor position is updated to the pixel coordinates.
		 * @param x The x coordinate of the pixel to set.
		 * @param y The y coordinate of the pixel to set.
		 * @returns This function does not return a value.
		 */
		pset( params: { "x": number; "y": number } ): void;
		pset( x: number, y: number ): void;

		/**
		 * Pushes a child view relative to the current view.
		 *
		 * Creates a new view relative to the current view. The parent print cursor is saved and the new view starts with its cursor at (0, 0). If the requested view extends outside its parent, only the overlapping area is visible.
		 *
		 * A view defines a local drawing area with its own origin, width, height, and clipping region. Graphics and text commands use coordinates relative to the current view and cannot draw outside its visible clipped area.
		 *
		 * Use popView() to restore the parent view and cursor. Child clips stay inside the parent. Resize recomputes origins and clips from the requested local rects, so previously clipped areas can become visible again when the screen grows.
		 * @param x Left edge of the child view in current local coordinates.
		 * @param y Top edge of the child view in current local coordinates.
		 * @param width Requested local width in pixels. Must be 0 or greater.
		 * @param height Requested local height in pixels. Must be 0 or greater.
		 * @returns This function does not return a value.
		 */
		pushView( params: { "x": number; "y": number; "width": number; "height": number } ): void;
		pushView( x: number, y: number, width: number, height: number ): void;

		/**
		 * Writes a 2D array of palette indices to the screen starting at (x, y).
		 *
		 * Draws pixels from a 2D array of palette indices. The array is indexed as [row][col] with row = y, col = x. Index 0 is transparent and is skipped unless include0 is true.
		 *
		 * You can call this using positional parameters or an object literal:
		 *
		 * - Positional: $.put( data, x, y, include0 )
		 * - Object: $.put( { "data": data, "x": x, "y": y, "include0": true } )
		 *
		 * Behavior:
		 * - Pixels are clipped to screen bounds.
		 * - Negative x/y start positions are supported; data is clipped accordingly.
		 * - If no pixels fall within the screen after clipping, nothing is drawn.
		 * - Data should contain palette indices (typically from $.get with asIndex=true).
		 * @param data 2D array [height][width] of palette indices (0..pal.length-1).
		 * @param x X (horizontal) destination coordinate.
		 * @param y Y (vertical) destination coordinate.
		 * @param include0 If true, draw index 0 (transparent) pixels; otherwise skip them.
		 * @returns This function does not return a value.
		 */
		put( params: { "data": Array<Array<number>>; "x": number; "y": number; "include0"?: boolean } ): void;
		put( data: Array<Array<number>>, x: number, y: number, include0?: boolean ): void;

		/**
		 * Draws a rectangle on the screen.
		 *
		 * This function renders a rectangle to the active canvas.
		 *
		 * The rectangle is drawn with a border using the current foreground color. If a fill color is provided, the rectangle will be filled with that color.
		 * @param x The x coordinate of the upper left corner of the rectangle.
		 * @param y The y coordinate of the upper left corner of the rectangle.
		 * @param width The width of the rectangle.
		 * @param height The height of the rectangle.
		 * @param fillColor The fill color for the rectangle. Can be a palette index or color value (string, array, object, number).
		 * @returns This function does not return a value.
		 */
		rect( params: { "x": number; "y": number; "width": number; "height": number; "fillColor"?: any } ): void;
		rect( x: number, y: number, width: number, height: number, fillColor?: any ): void;

		/**
		 * Removes this screen and cleans up all associated resources.
		 * @returns This function does not return a value.
		 */
		removeScreen(): void;

		/**
		 * Clears the view stack and resets to full screen.
		 *
		 * Clears the entire view stack and restores implicit full-screen origin and clip. The print cursor is set to (0, 0). Safe to call when the stack is already empty.
		 *
		 * resetView() does not restore saved nested cursors. Use popView() when you need to restore a parent cursor. Changing the view flushes pending batches into the framebuffer. It does not clear the screen.
		 * @returns This function does not return a value.
		 */
		resetView(): void;

		/**
		 * Converts a screen point to local view coordinates.
		 *
		 * Converts a point from screen / FBO coordinates to the active view's local coordinates using the logical view origin. Input stays screen-relative; call this to map mouse or other screen positions into the current view.
		 * @param x Screen / FBO x coordinate.
		 * @param y Screen / FBO y coordinate.
		 * @returns Local view position { x, y }.
		 */
		screenToView( params: { "x": number; "y": number } ): PositionPx;
		screenToView( x: number, y: number ): PositionPx;

		/**
		 * Applies multiple settings in a single call using an options object.
		 *
		 * Sets one or more settings in one call. Any setX command is available as an option with the first letter lowercased, such as setColor as "color", including settings from loaded plugins.
		 *
		 * Screen settings apply to the active screen. A "screen" option makes that screen active for the settings after it. Options set to null are skipped.
		 * @param options Object whose keys map to available settings (e.g., { "color": 2, "font": 1 }).
		 * @returns This function does not return a value.
		 */
		set( params: { "options": Options } ): void;
		set( options: Options ): void;

		/**
		 * Sets the canvas background color.
		 *
		 * Sets the background color of the canvas element. Transparent pixels will show this background color.
		 * @param color Palette index or color value (string, array, object, number).
		 * @returns This function does not return a value.
		 */
		setBgColor( params: { "color": any } ): void;
		setBgColor( color: any ): void;

		/**
		 * Sets the current blend mode used for rendering.
		 *
		 * Sets how new pixels are blended with existing pixels during rendering.
		 *
		 * Supported blend modes:
		 * - "replace": New pixels overwrite existing pixels.
		 * - "alpha": New pixels are alpha composited with existing pixels.
		 * @param blend Blend mode to use. One of: "replace", "alpha".
		 * @returns This function does not return a value.
		 */
		setBlend( params: { "blend": string } ): void;
		setBlend( blend: string ): void;

		/**
		 * Sets a custom character bitmap in the current font.
		 *
		 * Replaces one character's bitmap in the current font. data is a 2D array of 0 and 1, or a hex string. The character must exist in the font.
		 *
		 * The font is shared, so the change shows on every screen that uses it the next time the character is printed. Text already printed keeps the old glyph.
		 * @param charCode Character code (number) or single-character string to modify.
		 * @param data Character bitmap as 2D array [[row...], ...] where 1=on, 0=off, or hex-encoded string.
		 * @returns This function does not return a value.
		 */
		setChar( params: { "charCode": number | string; "data": any[] | string } ): void;
		setChar( charCode: number | string, data: any[] | string ): void;

		/**
		 * Sets the current foreground color used for drawing.
		 *
		 * Sets the active foreground color from a palette index or a supported color value. Color values are used directly, including colors outside the palette. Numeric indices must be finite integers from 0 through the last palette entry; index 0 is transparent black.
		 * @param color Numeric integer palette index, CSS/hex string, RGB/RGBA array, or color object.
		 * @returns This function does not return a value.
		 */
		setColor( params: { "color": any } ): void;
		setColor( color: any ): void;

		/**
		 * Sets the background color of the screen's container element.
		 *
		 * Sets the CSS background color of the container element that holds the canvas.
		 * @param color Palette index or color value (string, array, object, number).
		 * @returns This function does not return a value.
		 */
		setContainerBgColor( params: { "color": any } ): void;
		setContainerBgColor( color: any ): void;

		/**
		 * Enables or disables the right-click context menu.
		 *
		 * Controls whether the browser's context menu opens on the screen canvas. The menu is suppressed when the screen is created, so right-clicks reach the mouse callbacks. Pass true to let the menu open. set( { "contextMenu": ... } ) calls this command.
		 *
		 * Requires an onscreen screen.
		 * @param isEnabled If true, the context menu opens. If false, it is suppressed.
		 * @returns This function does not return a value.
		 */
		setContextMenu( params: { "isEnabled": boolean } ): void;
		setContextMenu( isEnabled: boolean ): void;

		/**
		 * Sets the default anchor point for images when drawing on the current screen.
		 *
		 * Sets the default anchor point for all image and sprite drawing operations on this screen. The anchor point defines the relative starting position to draw the image, based a percentage of the image size using the x/y coordinates as a starting point.
		 *
		 * **Common anchor values:**
		 * - `(0.0, 0.0)` - Top-left corner (default). The x/y position refers to the upper-left corner of the  	image.
		 * - `(0.5, 0.5)` - Center of the image. The x/y position refers to the center point. Useful for 	rotating images around their center or positioning sprites by their center point.
		 * - `(1.0, 1.0)` - Bottom-right corner. The x/y position refers to the lower-right corner of the 	image.
		 * - `(0.5, 0.0)` - Top-center. Useful for UI elements that should align at their top edge.
		 * - `(0.5, 1.0)` - Bottom-center. Useful for characters or objects that stand on a surface.
		 *
		 * The anchor affects all image drawing commands (`drawImage`, `drawSprite`, `blitImage`, `blitSprite`) unless they explicitly specify their own anchor point. This setting persists for the current screen until changed.
		 * @param x Anchor X in range [0.0-1.0].
		 * @param y Anchor Y in range [0.0-1.0].
		 * @returns This function does not return a value.
		 */
		setDefaultAnchor( params: { "x": number; "y": number } ): void;
		setDefaultAnchor( x: number, y: number ): void;

		/**
		 * Sets or clears the shader used to present the screen to the canvas.
		 *
		 * Sets the shader used when Pi.js presents the logical framebuffer to the canvas. Drawing commands write into the logical framebuffer at the screen's resolution. applyShader changes those pixels. setDisplayShader runs later, at presentation, and does not change logical pixels. Typical uses include custom upscaling, CRT effects, and color grading.
		 *
		 * Write the fragment shader with createShader. Pi.js supplies a fullscreen-quad vertex stage. u_texture is the logical framebuffer. u_sourceSize is the logical screen size. u_outputSize is the canvas backing size, which can be larger than the logical screen while a display shader is active. A good display shader:
		 *
		 * - Starts with "#version 300 es" and a precision qualifier such as precision mediump float
		 * - Declares in vec2 v_texCoord, uniform sampler2D u_texture, and out vec4 fragColor
		 * - Reads the logical framebuffer with texture(u_texture, v_texCoord)
		 * - Writes a complete premultiplied color to fragColor
		 * - Uses u_sourceSize and u_outputSize when scaling or sampling in pixel units
		 * - Keeps RGB between zero and alpha, with zero RGB at zero alpha
		 *
		 * Passing **shaderHandle** null restores the default presentation and logical canvas backing size. While a custom display shader is active, canvas.width and canvas.height follow the CSS presentation size (clamped). CSS style size remains for layout.
		 *
		 * Display shaders do not run on offscreen screens, though the setting may still be stored. This call replaces the active display shader and resets persistent uniform overrides to the **uniforms** supplied here, or to none.
		 *
		 * Sampler images stay bound and refresh dynamic canvas or screen content on each presentation. A shader cannot sample its own destination screen. Built-in names cannot be overridden from JavaScript. Known uniform values with an invalid type or component count throw synchronously.
		 *
		 * Framebuffers, u_texture, custom sampler2D images, and fragment outputs use premultiplied RGBA: RGB is multiplied by alpha. For opacity, multiply all four channels. For inversion, use vec4(color.a - color.rgb, color.a). Unpremultiply with a zero-alpha guard before straight-color math, then premultiply the result before output.
		 *
		 * v_texCoord uses bottom-left/y-up UVs. Custom sampler2D images match the same orientation as u_texture. Drawing coordinates remain top-left/y-down. Convert UVs to screen pixels with vec2(uv.x, 1.0 - uv.y) * u_sourceSize. Video sources refresh when decoded data is available; first use without a decoded frame throws IMAGE_NOT_READY, otherwise the last valid upload is retained. No video rendering loop is created.
		 * @param shaderHandle Shader handle from createShader, or null to restore the default display path.
		 * @param uniforms Optional initial display uniform overrides. Replaces prior overrides.
		 * @returns This function does not return a value.
		 */
		setDisplayShader( params: { "shaderHandle": number | null; "uniforms"?: ShaderUniforms } ): void;
		setDisplayShader( shaderHandle: number | null, uniforms?: ShaderUniforms ): void;

		/**
		 * Updates uniforms on the active display shader.
		 *
		 * Updates uniforms on the active display shader without replacing the shader. createShader defaults are applied first; values set here override them and stay until you change them again or call setDisplayShader.
		 *
		 * If an onscreen display shader is active and the canvas can be shown, the current logical framebuffer is presented with the new uniforms. This does not change canvas or logical screen size. Hidden, detached, and offscreen screens store the new uniforms but do not present; the next valid presentation uses them.
		 *
		 * **uniforms** is an object of uniform names to values. Known values with an invalid type or component count throw synchronously before the stored uniforms change. Built-in names cannot be overridden from JavaScript. Sampler images stay bound and refresh dynamic canvas or screen content on each presentation.
		 *
		 * Display shaders sample the logical framebuffer through u_texture and do not change logical pixels. Use the same premultiplied alpha and UV rules as createShader. Video sources refresh when decoded data is available; first use without a decoded frame throws IMAGE_NOT_READY, otherwise the last valid upload is retained. No video rendering loop is created.
		 * @param uniforms Uniform values to merge into the active display-shader overrides.
		 * @returns This function does not return a value.
		 */
		setDisplayShaderUniforms( params: { "uniforms": ShaderUniforms } ): void;
		setDisplayShaderUniforms( uniforms: ShaderUniforms ): void;

		/**
		 * Sets the font for the current screen.
		 *
		 * Sets the active font for text rendering on the current screen. The font must already be loaded using loadFont. Several default fonts are preloaded: 0=6x6, 1=6x8 (default), 2=8x8, 3=8x14, 4=8x16.
		 * @param fontId The id of the font to set. The default fonts loaded are.
		 * @returns This function does not return a value.
		 */
		setFont( params: { "fontId": number } ): void;
		setFont( fontId: number ): void;

		/**
		 * Configures color noise ranges and optional seed for blending.
		 *
		 * Sets per-channel noise ranges that influence color variation during blending operations.
		 *
		 * Noise formats:
		 * - number: A value [0..255]. Applies symmetric range [-v..+v] to RGBA channels.
		 * - [r, g, b, a]: Up to 4 values [0..255]. Each applies a symmetric range per channel.
		 * - [[rMin, gMin, bMin, aMin], [rMax, gMax, bMax, aMax]]:   Explicit per-channel min/max ranges [0..255].
		 *
		 * Seed:
		 * - A number used to seed noise generation. If omitted or null, the current time is used.
		 * @param noise Noise configuration (number, 1D array, or 2D min/max arrays).
		 * @param seed Optional noise seed used for deterministic noise.
		 * @returns This function does not return a value.
		 */
		setNoise( params: { "noise"?: number | any[]; "seed"?: number } ): void;
		setNoise( noise?: number | any[], seed?: number ): void;

		/**
		 * Replaces the current palette with a new set of colors.
		 *
		 * Sets an entirely new palette for the active screen. Index 0 is reserved for transparent black and will be set automatically. Note: Color indices may not match exactly because index 0 is strictly reserved for transparent black.
		 * @param pal Array of color values (names, hex, RGBA, or palette indices).
		 * @returns This function does not return a value.
		 */
		setPal( params: { "pal": Array<any> } ): void;
		setPal( pal: Array<any> ): void;

		/**
		 * Updates one or more palette colors at specific indices.
		 *
		 * Sets multiple palette entries by index. Indices must be within the palette range and cannot be 0 (reserved for transparent black).
		 * @param indices Array of palette indices to change.
		 * @param colors Array of color values corresponding to indices.
		 * @returns This function does not return a value.
		 */
		setPalColors( params: { "indices": Array<number>; "colors": Array<any> } ): void;
		setPalColors( indices: Array<number>, colors: Array<any> ): void;

		/**
		 * Enables or disables browser pinch zoom on the screen canvas.
		 *
		 * Controls whether a pinch that starts on the screen canvas zooms the page. Pass false, or omit the argument, to keep those touches for the screen. Pass true to let the pinch zoom the page.
		 *
		 * The setting does not start touch tracking. set( { "pinchZoom": ... } ) calls this command.
		 *
		 * Requires an onscreen screen.
		 * @param isEnabled If true, a pinch on the canvas zooms the page. If false, it does not.
		 * @returns This function does not return a value.
		 */
		setPinchZoom( params: { "isEnabled": boolean } ): void;
		setPinchZoom( isEnabled: boolean ): void;

		/**
		 * Sets the print cursor position using column and row coordinates.
		 *
		 * Sets the print cursor position based on character grid coordinates (columns and rows). The grid size is determined by the current font size and print scale. Column and row are 0-indexed.
		 * @param col Column position (0-indexed).
		 * @param row Row position (0-indexed).
		 * @returns This function does not return a value.
		 */
		setPos( params: { "col"?: number; "row"?: number } ): void;
		setPos( col?: number, row?: number ): void;

		/**
		 * Sets the print cursor position using pixel coordinates.
		 *
		 * Sets the print cursor position using exact pixel coordinates. This allows precise positioning independent of the font's character grid.
		 * @param x X position in pixels.
		 * @param y Y position in pixels.
		 * @returns This function does not return a value.
		 */
		setPosPx( params: { "x"?: number; "y"?: number } ): void;
		setPosPx( x?: number, y?: number ): void;

		/**
		 * Sets the scale factor for printed text.
		 *
		 * Sets the horizontal and vertical scale of printed bitmap text, and optional extra space between characters. Omitted values keep their current setting.
		 * @param scaleWidth Horizontal scale factor; a number greater than 0.
		 * @param scaleHeight Vertical scale factor; a number greater than 0.
		 * @param padX Extra horizontal padding between characters in pixels; an integer of 0 or more. Defaults to 0.
		 * @param padY Extra vertical padding between lines in pixels; an integer of 0 or more. Defaults to 0.
		 * @returns This function does not return a value.
		 */
		setPrintSize( params: { "scaleWidth"?: number; "scaleHeight"?: number; "padX"?: number; "padY"?: number } ): void;
		setPrintSize( scaleWidth?: number, scaleHeight?: number, padX?: number, padY?: number ): void;

		/**
		 * Enables or disables word breaking for text wrapping.
		 *
		 * Controls whether text wrapping breaks at word boundaries (spaces) or at any character. When enabled, long words will wrap at the last space before the line end. When disabled, text will wrap at any character.
		 * @param isEnabled If true, enable word breaking at spaces. If false, break at any character.
		 * @returns This function does not return a value.
		 */
		setWordBreak( params: { "isEnabled": boolean } ): void;
		setWordBreak( isEnabled: boolean ): void;

		/**
		 * Starts mouse input tracking for this screen.
		 *
		 * Starts mouse tracking. Tracking also starts on the first inMouse(), inPress(), or mouse callback, so this is only needed after stopMouse(). Calling it while tracking is already running does nothing.
		 *
		 * Requires an onscreen screen.
		 * @returns This function does not return a value.
		 */
		startMouse(): void;

		/**
		 * Starts touch input tracking for this screen.
		 *
		 * Starts touch tracking. Tracking also starts on the first inTouch(), inPress(), or touch callback, so this is only needed after stopTouch(). While tracking, the browser does not scroll or zoom from touches on the canvas. Calling it while tracking is already running does nothing.
		 *
		 * Requires an onscreen screen.
		 * @returns This function does not return a value.
		 */
		startTouch(): void;

		/**
		 * Stops mouse input tracking for this screen.
		 *
		 * Stops mouse tracking until startMouse(). Held buttons are released through the 'up' callbacks with cancelled set to true, and no click fires. While stopped, callbacks stay registered but are not called, and inMouse() returns null. Reads and new callbacks do not restart tracking.
		 * @returns This function does not return a value.
		 */
		stopMouse(): void;

		/**
		 * Stops touch input tracking for this screen.
		 *
		 * Stops touch tracking until startTouch(). Held touches are released through the 'up' callbacks with cancelled set to true, and no click fires. While stopped, callbacks stay registered but are not called, and inTouch() returns an empty array. Reads and new callbacks do not restart tracking.
		 * @returns This function does not return a value.
		 */
		stopTouch(): void;

		/**
		 * Converts a local view point to screen coordinates.
		 *
		 * Converts a point from the active view's local coordinates to screen / FBO coordinates using the logical view origin. This uses the requested origin, not the clipped origin. Input events stay screen-relative; use this helper when you need to compare local drawing coordinates with input positions.
		 * @param x Local x coordinate.
		 * @param y Local y coordinate.
		 * @returns Screen / FBO position { x, y }.
		 */
		viewToScreen( params: { "x": number; "y": number } ): PositionPx;
		viewToScreen( x: number, y: number ): PositionPx;

		/**
		 * Returns the screen or active view width in pixels.
		 *
		 * Gets the internal width of the active screen's canvas. This is the logical width used for drawing operations, which may differ from the CSS display size.
		 *
		 * If there is an active view using pushView then it will return the width of the local viewport area and not the screen width.
		 * @returns Screen or local view width in pixels.
		 */
		width(): number;
	}

	interface API extends Screen, PluginCommands {
		/**
		 * Converts a supported color value into a color object.
		 *
		 * Creates a PiColor object from a CSS color string, array, or color-like object. Useful for normalizing color values for inspection, comparison, or reuse without setting the screen drawing color or requiring an active screen.
		 * @param color Palette index or color value (string, array, object, number).
		 * @returns A color value object for the converted color.
		 */
		createColor( params: { "color": any } ): PiColor;
		createColor( color: any ): PiColor;

		/**
		 * Creates a custom fragment shader and returns a handle.
		 *
		 * Creates a reusable custom fragment shader and returns a numeric handle. The handle is screen-independent: create it once, then pass it to applyShader or setDisplayShader on any screen. createShader stores the source and optional default uniforms; it does not draw.
		 *
		 * Pi.js drawing commands write into the logical framebuffer at the screen's resolution. applyShader samples that framebuffer through u_texture, runs the shader over every pixel, and replaces those pixels with the result. setDisplayShader runs later, when the logical framebuffer is presented to the canvas, and does not change logical pixels. For applyShader, u_sourceSize and u_outputSize are both the logical screen size. For setDisplayShader, u_sourceSize is the logical screen size and u_outputSize is the canvas backing size.
		 *
		 * Pi.js supplies a fullscreen-quad vertex stage, so you only write GLSL ES 3.00 fragment source. A good shader:
		 *
		 * - Starts with "#version 300 es" and a precision qualifier such as precision mediump float
		 * - Declares in vec2 v_texCoord, uniform sampler2D u_texture, and out vec4 fragColor
		 * - Reads u_texture with texture(u_texture, v_texCoord)
		 * - Writes a complete premultiplied color to fragColor
		 * - Declares built-in uniforms only when needed: u_texture (sampler2D), u_sourceSize (vec2), u_outputSize (vec2), u_time (float seconds), and u_frame (int)
		 * - Keeps RGB between zero and alpha, with zero RGB at zero alpha
		 *
		 * Framebuffers, u_texture, custom sampler2D images, and fragment outputs use premultiplied RGBA: RGB is multiplied by alpha. For opacity, multiply all four channels. For inversion, use vec4(color.a - color.rgb, color.a). Unpremultiply with a zero-alpha guard before straight-color math, then premultiply the result before output.
		 *
		 * v_texCoord uses bottom-left/y-up UVs. Custom sampler2D images match the same orientation as u_texture. Drawing coordinates remain top-left/y-down. Convert UVs to screen pixels with vec2(uv.x, 1.0 - uv.y) * u_sourceSize.
		 *
		 * The source must include "#version 300 es". Compilation and validation happen synchronously the first time the shader is used on a screen. When first used, it must declare uniform sampler2D u_texture. Invalid shaders throw synchronously without changing rendering state.
		 *
		 * The second argument is an optional map of default custom uniform values. Values are interpreted from the linked GLSL declaration and may include float, integer, unsigned integer, boolean, vector, matrix, uniform-array, and sampler2D image inputs. Unknown and reserved built-in names are ignored. applyShader and setDisplayShader can override these defaults for a single use. A custom sampler cannot be the same screen the shader is applied to. Video sources refresh when decoded data is available; first use without a decoded frame throws IMAGE_NOT_READY, otherwise the last valid upload is retained. No video rendering loop is created.
		 * @param fragmentSource GLSL ES 3.00 fragment shader source. Must include "#version 300 es".
		 * @param uniforms Optional reflected custom uniform values keyed by uniform name.
		 * @returns Shader handle id for applyShader or setDisplayShader.
		 */
		createShader( params: { "fragmentSource": string; "uniforms"?: ShaderUniforms } ): number;
		createShader( fragmentSource: string, uniforms?: ShaderUniforms ): number;

		/**
		 * Returns an array of all screen API objects.
		 *
		 * Gets all created screens as an array of screen API objects. Each object has screen=true and an id property.
		 * @returns Array of screen API objects.
		 */
		getAllScreens(): Array<Screen>;

		/**
		 * Returns an array of all loaded fonts with their properties.
		 *
		 * Gets information about all fonts that have been loaded. Returns an array of font info objects containing id, width, and height for each font.
		 * @returns Array of font info objects with id, width, and height properties.
		 */
		getAvailableFonts(): Array<FontInfo>;

		/**
		 * Gets the default foreground color used by new screens.
		 *
		 * Returns the default drawing color for newly created screens. If asIndex is true, returns the palette index; otherwise returns the color value object.
		 * @param asIndex If true returns the palette index, otherwise returns a color value object.
		 * @returns Palette index if asIndex is true; otherwise a color value object.
		 */
		getDefaultColor( params: { "asIndex"?: boolean } ): number | PiColor;
		getDefaultColor( asIndex?: boolean ): number | PiColor;

		/**
		 * Gets default palette and returns an array with all the color data.
		 *
		 * Gets the default color palette used when screens are created. By default, index 0 (transparent black) is excluded. The default color palette defines what colors are available when a new screen is created.
		 * @param include0 If true include palette index 0 (transparent black).
		 * @returns An array of color data for the default color palette.
		 */
		getDefaultPal( params: { "include0"?: boolean } ): Array<PiColor>;
		getDefaultPal( include0?: boolean ): Array<PiColor>;

		/**
		 * Resolves a registered image, direct image source, or screen.
		 *
		 * Returns the underlying Image or Canvas element for a registered image name. Direct image, video, canvas, ImageBitmap, ImageData, and OffscreenCanvas sources are returned as supplied. An onscreen Screen returns its canvas; an offscreen Screen returns a new canvas containing a copy of its logical framebuffer pixels.
		 * @param name Registered image name, Screen, or direct image source.
		 * @returns The resolved source, or a canvas containing the screen's pixels.
		 */
		getImage( params: { "name": string | Screen | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap | ImageData | OffscreenCanvas } ): HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap | ImageData | OffscreenCanvas;
		getImage( name: string | Screen | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap | ImageData | OffscreenCanvas ): HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap | ImageData | OffscreenCanvas;

		/**
		 * Returns a list of registered plugins and their status.
		 *
		 * Returns an array of plugin info objects including name, version, description, initialized, and state. state is "pending" while a plugin waits for its dependencies, "initialized" after it installs, and "failed" after its init or installation throws. A failed plugin stays listed until its name is registered again.
		 * @returns Array of plugin info objects: { name, version, description, initialized, state }.
		 */
		getPlugins(): Array<object>;

		/**
		 * Gets a screen API object by screen ID.
		 *
		 * Retrieves the screen API object for a specific screen ID. This allows you to call all the graphics operations for a specific screen. This means you do not have to call setScreen to set the active screen every time you want to draw on a different screen. There is also a tiny performance advantage for drawing commands called directly on a screen object.
		 * @param screenId The screen ID to retrieve.
		 * @returns Screen API object with all graphics commands and screen=true and id property.
		 */
		getScreen( params: { "screenId": number } ): Screen;
		getScreen( screenId: number ): Screen;

		/**
		 * Gets gamepad data for a specific gamepad or all gamepads.
		 *
		 * Reads and returns the connected gamepads. With a gamepadIndex, returns the GamepadData for that index, or null.
		 *
		 * Gamepads are live objects updated in place. The first read in each animation frame reports what happened since the last frame that had a read, and every other read in the frame sees the same values.
		 * @param gamepadIndex Gamepad index to read. If omitted or null, returns every connected pad.
		 * @returns The pad for the index, or null when none has it or polling is stopped; with no index, an array of every connected pad, empty while polling is stopped.
		 */
		inGamepad( params: { "gamepadIndex"?: number } ): GamepadData | Array<GamepadData> | null;
		inGamepad( gamepadIndex?: number ): GamepadData | Array<GamepadData> | null;

		/**
		 * Gets the current state of a key or all pressed keys.
		 *
		 * Retrieves key state information. If a key is provided, returns the key data object for that key if it is currently pressed, or null if it is not. The key can be named by its code (e.g., "KeyA"), which names a physical key, or by its key value (e.g., "a"), which names the character it types. A key value is held while any key that produced it is held, such as either Shift key for "Shift"; the most recent press is returned.
		 *
		 * If no key is provided, returns a frozen array of the key data objects of all pressed keys, ordered by each key's latest keydown, or an empty array. The same array is returned until a key is pressed or released, so reading it every frame does not allocate.
		 *
		 * The first call starts keyboard tracking, unless stopKeyboard() was called; keys pressed before tracking starts are not reported. Keys typed into an input() prompt are not reported either.
		 *
		 * Key data objects contain: code, key, location, altKey, ctrlKey, metaKey, shiftKey, repeat, cancelled. They are frozen.
		 * @param key Key code or key value to check. If omitted, returns all pressed keys.
		 * @returns Key data object if key is pressed, array of all pressed keys if no key specified, or null if key not pressed.
		 */
		inKey( params: { "key"?: string } ): object | any[] | null;
		inKey( key?: string ): object | any[] | null;

		/**
		 * Loads an audio file for playback with playAudio.
		 *
		 * Loads an audio file and returns an audio ID for playAudio. By default the file is decoded, so many instances can play it at once. Set stream to true for long files such as music: that uses less memory and plays one instance at a time.
		 *
		 * The file loads in the background. Call $.ready() before playing it. The page must be served over HTTP or HTTPS, and a cross-origin file needs CORS headers.
		 * @param src Audio file URL (e.g., 'sound.mp3', 'audio/beep.wav').
		 * @param name A unique name to use as the audio ID. If omitted, an ID is generated.
		 * @param stream True to stream the file through a media element instead of decoding it into memory (default: false).
		 * @returns Audio ID for use with playAudio, stopAudio, pauseAudio, resumeAudio, and removeAudio.
		 */
		loadAudio( params: { "src": string; "name"?: string; "stream"?: boolean } ): string;
		loadAudio( src: string, name?: string, stream?: boolean ): string;

		/**
		 * Loads a bitmap font from an image source.
		 *
		 * Loads a bitmap font from an image URL, or from an Image or Canvas element. Characters are arranged in a grid. Each cell is the character size plus the margin on each side.
		 *
		 * If charset is omitted, the font uses character codes 0-255. charset can be an array of character codes or a string of characters. Returns a font ID for setFont. Call $.ready() before using the font.
		 * @param src Font image source: URL string, Image element, or Canvas element.
		 * @param width Character width in pixels (glyph width, excluding margin); an integer of at least 1.
		 * @param height Character height in pixels (glyph height, excluding margin); an integer of at least 1.
		 * @param margin Margin around each character cell in pixels; an integer of 0 or more. Defaults to 0.
		 * @param charset Character set as array of character codes or string. Defaults to 0-255 (ASCII) if not provided.
		 * @returns Font ID that can be used with setFont.
		 */
		loadFont( params: { "src": string | HTMLImageElement | HTMLCanvasElement; "width": number; "height": number; "margin"?: number; "charset"?: Array<number> | string } ): number;
		loadFont( src: string | HTMLImageElement | HTMLCanvasElement, width: number, height: number, margin?: number, charset?: Array<number> | string ): number;

		/**
		 * Loads an image by URL or from an Image/Canvas element.
		 *
		 * Loads an image and stores it by name. Use $.ready() to wait for loading before calling drawImage. Images retain their source colors when the screen palette changes. Use the shader API for recoloring.
		 * @param src Image source: URL string, HTMLImageElement, or HTMLCanvasElement.
		 * @param name Optional unique name for the image. Auto-generated if omitted.
		 * @param onLoad Callback invoked when the image finishes loading.
		 * @param onError Callback invoked if the image fails to load.
		 * @returns The image name.
		 */
		loadImage( params: { "src": string | HTMLImageElement | HTMLCanvasElement; "name"?: string; "onLoad"?: ( name: string ) => void; "onError"?: ( error: Error ) => void } ): string;
		loadImage( src: string | HTMLImageElement | HTMLCanvasElement, name?: string, onLoad?: ( name: string ) => void, onError?: ( error: Error ) => void ): string;

		/**
		 * Loads a spritesheet by URL or from an Image/Canvas element.
		 *
		 * Loads a spritesheet and slices it automatically, or on a fixed grid when width and height are given. Sprites keep their source colors when the screen palette changes.
		 * @param src Spritesheet source: URL string, HTMLImageElement, or HTMLCanvasElement.
		 * @param name Optional unique name for the spritesheet. Auto-generated if omitted.
		 * @param width Sprite width for fixed grid mode.
		 * @param height Sprite height for fixed grid mode.
		 * @param margin Margin between sprites in fixed grid mode; an integer of 0 or more. Defaults to 0.
		 * @param onLoad Callback invoked when the spritesheet finishes loading.
		 * @param onError Callback invoked if the spritesheet fails to load.
		 * @returns The spritesheet name.
		 */
		loadSpritesheet( params: { "src": string | HTMLImageElement | HTMLCanvasElement; "name"?: string; "width"?: number; "height"?: number; "margin"?: number; "onLoad"?: ( name: string ) => void; "onError"?: ( error: Error ) => void } ): string;
		loadSpritesheet( src: string | HTMLImageElement | HTMLCanvasElement, name?: string, width?: number, height?: number, margin?: number, onLoad?: ( name: string ) => void, onError?: ( error: Error ) => void ): string;

		/**
		 * Removes a gamepad connection or disconnection callback.
		 *
		 * Removes callbacks registered with onGamepad. A callback is identified by its mode and function; the 'once' parameter is not used to identify the callback.
		 *
		 * A callback removed during a dispatch does will not run later.
		 * @param mode 'connect' or 'disconnect'. If omitted or null, fn is removed from both modes.
		 * @param fn Callback to remove. If omitted or null, every callback of the mode is removed.
		 * @returns This function does not return a value.
		 */
		offGamepad( params: { "mode"?: string | null; "fn"?: ( data: GamepadData | GamepadDisconnectData ) => void } ): void;
		offGamepad( mode?: string | null, fn?: ( data: GamepadData | GamepadDisconnectData ) => void ): void;

		/**
		 * Removes a key event handler.
		 *
		 * Removes callbacks registered with onKey. A callback is identified by its key, mode, and function. A combination matches when it has the same keys, in any order.
		 *
		 * With a key, a mode, and a function, removes that callback. Without a function, removes every callback of that mode for the key. With a function and no mode, removes the function from both modes.
		 * @param key Key code, key value, "any", or combination array of the handlers to remove.
		 * @param mode Event mode ("up" or "down"). If omitted or null, fn is removed from both modes.
		 * @param fn Callback to remove. If omitted, every handler of the mode is removed.
		 * @returns This function does not return a value.
		 */
		offKey( params: { "key": string | any[]; "mode"?: string | null; "fn"?: ( keyData: object | object[] ) => void } ): void;
		offKey( key: string | any[], mode?: string | null, fn?: ( keyData: object | object[] ) => void ): void;

		/**
		 * Registers a callback function for gamepad connections or disconnections.
		 *
		 * Registers a callback for gamepad connections or disconnections.
		 *
		 * The 'connect' mode runs when a gamepad connects and receives that gamepad's GamepadData. It also receives each gamepad already connected when it is registered, in index order, once per connection.
		 *
		 * The 'disconnect' mode runs when a gamepad disconnects and receives GamepadDisconnectData. By then the gamepad has left the list that inGamepad() returns.
		 *
		 * With once, the callback is removed before its first run. Registering starts polling unless stopGamepad() was called.
		 * @param mode Event mode: 'connect' or 'disconnect'.
		 * @param fn Callback that receives GamepadData or GamepadDisconnectData, by mode.
		 * @param once If true, this registration is removed before the callback's first run.
		 * @returns This function does not return a value.
		 */
		onGamepad( params: { "mode": string; "fn": ( data: GamepadData | GamepadDisconnectData ) => void; "once"?: boolean } ): void;
		onGamepad( mode: string, fn: ( data: GamepadData | GamepadDisconnectData ) => void, once?: boolean ): void;

		/**
		 * Registers a callback function for key events.
		 *
		 * Registers a callback for key presses and releases. Name a key by its code (for example "KeyA"), which is the physical key, or by its key value (for example "a"), which is the character it types.
		 *
		 * 'down' runs when the key is pressed and receives its key data. 'up' runs when the key is released and receives the key data at release. "any" listens for every key.
		 *
		 * Pass an array of keys for a combination. It runs when all of those keys are held, and the callback receives an array of their key data. A combination's 'up' callback runs when one of its keys is released while the rest are still held.
		 *
		 * 'up' also runs, with cancelled set to true, when a held key is released because the window loses focus, the page is hidden, stopKeyboard() is called, or an input() prompt starts.
		 *
		 * once removes the callback before its first run. allowRepeat lets a 'down' callback run again while the key is held. Registering starts tracking unless stopKeyboard() was called. Keys typed into an input() prompt, or into an editable element on the page, are ignored.
		 * @param key Key code/key value string, array of keys for combinations, or "any" for any key.
		 * @param mode Event mode: "up" for key release, "down" for key press.
		 * @param fn Callback function that receives the key data, or an array of key data for a combination.
		 * @param once If true, the handler is removed after being called once.
		 * @param allowRepeat If true, allows the handler to fire on key repeat (when key is held down).
		 * @returns This function does not return a value.
		 */
		onKey( params: { "key": string | any[]; "mode": string; "fn": ( keyData: object | object[] ) => void; "once"?: boolean; "allowRepeat"?: boolean } ): void;
		onKey( key: string | any[], mode: string, fn: ( keyData: object | object[] ) => void, once?: boolean, allowRepeat?: boolean ): void;

		/**
		 * Pauses an audio instance, every instance of an audio ID, or all audio.
		 *
		 * Pauses audio and keeps its position, so resumeAudio continues from there. Pass an instance ID, an audio ID to pause every instance of that file, or nothing to pause all audio. Pausing an instance that has not started yet cancels its start.
		 * @param id Instance ID, or audio ID to pause all its instances. If omitted, pauses all audio.
		 * @returns This function does not return a value.
		 */
		pauseAudio( params: { "id"?: number | string } ): void;
		pauseAudio( id?: number | string ): void;

		/**
		 * Plays music using BASIC-style notation (inspired by QBasic PLAY command).
		 *
		 * Plays music from a notation string.
		 *
		 * **Notes:**
		 * - A-G: Note letters (A, B, C, D, E, F, G)
		 * - Sharps: Use # or + after the note (e.g., C#, F+)
		 * - Flats: Use - after the note (e.g., B-, E-); C- is the B below C
		 * - Note length: Include a number after the note (e.g., C4 = quarter note C, C#8 = eighth note C#)
		 * - Dotted notes: . (1.5x length), .. (1.75x length), after the length if one is given (e.g., C4.)
		 * - N[n]: Play note by number (1-119, where 1 is C0 and 58 is A4 at 440 Hz); N0 is a rest
		 *
		 * **Octave:**
		 * - O[n]: Set octave (0-9)
		 * - <: Decrease octave by 1
		 * - >: Increase octave by 1
		 * - MO[n]: Octave offset added to later notes (can be negative: MO-1)
		 *
		 * **Note Length:**
		 * - L[n]: Set default note length (1-64, where 4=quarter note, 8=eighth note, etc.)
		 *
		 * **Tempo & Timing:**
		 * - T[n]: Set tempo in quarter notes per minute (32-255, default 120)
		 * - P[n]: Rest for a note length (1-64)
		 *
		 * **Volume and Pan:**
		 * - V[n]: Set volume (0-100)
		 * - MP[n]: Pan from -100 (left) to 100 (right)
		 *
		 * **Waveforms:**
		 * - WS or SINE: Sine wave
		 * - WQ or SQUARE: Square wave
		 * - WW or SAWTOOTH: Sawtooth wave
		 * - WT or TRIANGLE: Triangle wave (default)
		 * - WN or NOISE: White noise
		 * - WP or PINK: Pink noise
		 * - [[r],[i]]: Use a custom wave table
		 *
		 * **Articulation:** Sets how much of each note sounds. The beat stays the same.
		 * - MS: Staccato (75%)
		 * - MN: Normal (87.5%, default)
		 * - ML: Legato (100%)
		 *
		 * **Envelope:**
		 * - MA[n]: Attack time, % of the sounding length (default 15)
		 * - MD[n]: Decay time, % of the sounding length (default 20)
		 * - MH[n]: Sustain (hold) level, % of note volume (default 65)
		 * - MR[n]: Release time, % of the sounding length (default 20)
		 *
		 * The release finishes inside the note, so notes do not run into the next beat.
		 *
		 * **Instruments:**
		 * - @[n]: Select instrument n. Instruments are provided by a plugin that extends PLAY; without one, @n is ignored and a warning is logged.
		 *
		 * **Simultaneous Tracks:** A comma starts another track at the time of the previous track's last command, with that track's settings. For example, "CDE, F" plays F at the same time as E, and "C2, E2, G2" plays a chord. Call `play()` several times to play independent tracks from the same moment.
		 *
		 * Unknown commands are ignored, and a warning is logged once per call.
		 * @param playString Music notation string with notes and commands.
		 * @returns Track ID for use with stopPlay.
		 */
		play( params: { "playString": string } ): number;
		play( playString: string ): number;

		/**
		 * Plays loaded audio as a new instance and returns its instance ID.
		 *
		 * Starts a new instance of audio loaded with loadAudio and returns its instance ID. Use the ID with stopAudio, pauseAudio, resumeAudio, and setAudio. Decoded audio can play many instances at once. Streamed audio plays one instance at a time: a new playAudio replaces the current one.
		 *
		 * duration and startTime are in the file's own time. A duration of 0 plays to the end, or loops forever when loop is set. playbackRate changes speed and pitch together. pan places the instance from -1 (left) to 1 (right). delay waits before the instance starts.
		 *
		 * Until the page gets its first click, key, or touch, a one-shot plays nothing. A looping instance starts when audio unlocks.
		 * @param audioId Audio ID returned from loadAudio.
		 * @param volume Volume (0-1, default: 1).
		 * @param startTime Offset into the file in seconds (default: 0).
		 * @param duration Seconds of the file to play, including every loop pass (default: 0 = to the end, or forever when looping).
		 * @param loop Loop the whole file (default: false).
		 * @param playbackRate Speed and pitch: 0.0625-16 for decoded audio, 0.25-4 for streamed audio (default: 1).
		 * @param pan Stereo position from -1 (left) to 1 (right) (default: 0).
		 * @param delay Seconds before playback starts (default: 0).
		 * @returns Instance ID for use with stopAudio, pauseAudio, resumeAudio, and setAudio.
		 */
		playAudio( params: { "audioId": string; "volume"?: number; "startTime"?: number; "duration"?: number; "loop"?: boolean; "playbackRate"?: number; "pan"?: number; "delay"?: number } ): number;
		playAudio( audioId: string, volume?: number, startTime?: number, duration?: number, loop?: boolean, playbackRate?: number, pan?: number, delay?: number ): number;

		/**
		 * Waits for document readiness and all pending resources.
		 *
		 * Defers execution until the document is ready and all registered asynchronous resources have completed loading (e.g., images queued via internal loading). Supports both callback and promise styles.
		 *
		 * Callbacks always run asynchronously. If a callback throws synchronously, only that ready call's promise rejects with the thrown value; other queued waiters continue. Handle this failure through the returned promise. Successful calls resolve to undefined. Callback return values are ignored, including promises: ready does not wait for async callbacks to finish or adopt their rejections.
		 *
		 * Usage styles:
		 * - Callback: $.ready( function() {} );
		 * - Promise: $.ready().then( function() {} );
		 * - Async/Await: await $.ready();
		 * @param callback Optional callback to run when ready completes.
		 * @returns Resolves to undefined when ready, after invoking the optional callback. Rejects with the
original thrown value if the callback throws synchronously. Callback return values are ignored.
		 */
		ready( params: { "callback"?: () => void } ): Promise<void>;
		ready( callback?: () => void ): Promise<void>;

		/**
		 * Registers a plugin to extend Pi.js with custom commands and features.
		 *
		 * Registers a plugin that adds commands and screen behavior. init receives a pluginApi object and uses it to add commands, screen data, and event handlers. Those methods work only while init runs. See PluginAPI for the methods.
		 *
		 * version and description are stored for getPlugins. dependencies names plugins that must initialize first. A plugin with a missing or cyclic dependency stays pending. If init fails, the plugin's state is "failed", and registering that name again retries it.
		 *
		 * If screens already exist, the plugin is installed on them. Screens created later get the same commands and data.
		 * @param name Unique plugin name.
		 * @param init Initialization function that receives pluginApi.
		 * @param version Optional plugin version.
		 * @param description Optional plugin description.
		 * @param dependencies Optional list of dependency plugin names.
		 * @returns This function does not return a value.
		 */
		registerPlugin( params: { "name": string; "init": ( pluginApi: PluginAPI ) => void; "version"?: string; "description"?: string; "dependencies"?: Array<string> } ): void;
		registerPlugin( name: string, init: ( pluginApi: PluginAPI ) => void, version?: string, description?: string, dependencies?: Array<string> ): void;

		/**
		 * Removes keys from the action keys set.
		 *
		 * Removes keys from the action keys set. Those keys go back to their normal browser behavior.
		 * @param keys Array of key codes or key values to remove from action keys.
		 * @returns This function does not return a value.
		 */
		removeActionKeys( params: { "keys": Array<string> } ): void;
		removeActionKeys( keys: Array<string> ): void;

		/**
		 * Removes all screens from memory and the DOM.
		 * @returns This function does not return a value.
		 */
		removeAllScreens(): void;

		/**
		 * Removes loaded audio and frees its resources.
		 *
		 * Removes audio loaded with loadAudio. A load still in progress is cancelled. Playing instances fade out, and the audio ID can be reused by a later loadAudio.
		 * @param audioId Audio ID returned from loadAudio.
		 * @returns This function does not return a value.
		 */
		removeAudio( params: { "audioId": string } ): void;
		removeAudio( audioId: string ): void;

		/**
		 * Removes a previously loaded image by name.
		 *
		 * Deletes the stored image and frees associated GPU resources (textures) for all screens. Draws already queued with the image complete before their textures are freed. Subsequent draws using the removed name throw IMAGE_NOT_FOUND.
		 * @param name Image name to remove.
		 * @returns This function does not return a value.
		 */
		removeImage( params: { "name": string } ): void;
		removeImage( name: string ): void;

		/**
		 * Removes a screen and cleans up all associated resources.
		 *
		 * Removes a screen and its canvas. After removal, calling methods on the screen throws.
		 *
		 * Call it as $.removeScreen( screen ) or as screen.removeScreen().
		 * @param screen Screen ID (number) or screen API object to remove. Required in the global form; the declaration marks it optional because each screen's own removeScreen() takes none.
		 * @returns This function does not return a value.
		 */
		removeScreen( params: { "screen"?: number | Screen } ): void;
		removeScreen( screen?: number | Screen ): void;

		/**
		 * Removes a custom shader and releases its cached GPU programs.
		 *
		 * Completes every queued pass using the shader, clears it from active display screens, deletes its cached WebGL program from every screen, and invalidates the handle for future use. Removing an unknown or previously removed numeric handle is a no-op. Malformed handles throw INVALID_SHADER_HANDLE synchronously.
		 * @param shaderHandle Shader handle returned by createShader.
		 * @returns This function does not return a value.
		 */
		removeShader( params: { "shaderHandle": number } ): void;
		removeShader( shaderHandle: number ): void;

		/**
		 * Resumes a paused audio instance, every instance of an audio ID, or all audio.
		 *
		 * Resumes paused audio from its saved position. Pass an instance ID, an audio ID to resume every paused instance of that file, or nothing to resume all paused audio. Volume, rate, and pan changes made while paused apply on resume.
		 * @param id Instance ID, or audio ID to resume all its instances. If omitted, resumes all paused audio.
		 * @returns This function does not return a value.
		 */
		resumeAudio( params: { "id"?: number | string } ): void;
		resumeAudio( id?: number | string ): void;

		/**
		 * Creates a new screen (canvas) with specified dimensions and aspect ratio.
		 *
		 * Creates a screen, makes it the active drawing target, and returns its Screen API. Call it before drawing.
		 *
		 * aspect uses (width)(x|e|m)(height):
		 *
		 * - x: exact pixel size, such as "320x200"
		 * - e: fill the container while keeping the aspect ratio, such as "320e200"
		 * - m: scale by whole multiples of the size, such as "320m200"
		 *
		 * An offscreen screen uses exact pixels only. Give it a parent screen so drawImage can copy from it directly. After creating an offscreen screen, call setScreen on the visible screen before reading pointer input.
		 * @param aspect Aspect ratio string in format (width)(x|e|m)(height), e.g., '300x200', '100e00', '300m200'.
		 * @param container DOM element or element ID string to use as container. Defaults to document.body.
		 * @param isOffscreen If true, creates an offscreen canvas that is not displayed. Requires exact pixel dimensions.
		 * @param resizeCallback Callback function called when screen is resized. Receives (screenApi, fromSize, toSize).
		 * @param parent Existing screen to share drawing with. Only for an offscreen screen. Makes drawImage from that screen faster.
		 * @param noCss If true, Pi.js does not set canvas or page styles. Supply the canvas layout in your own CSS.
		 * @returns Screen API object with all graphics command and screen=true and id property.
		 */
		screen( params: { "aspect": string; "container"?: string | HTMLElement; "isOffscreen"?: boolean; "resizeCallback"?: ( screenApi: Screen, fromSize: Size, toSize: Size ) => void; "parent"?: number | Screen; "noCss"?: boolean } ): Screen;
		screen( aspect: string, container?: string | HTMLElement, isOffscreen?: boolean, resizeCallback?: ( screenApi: Screen, fromSize: Size, toSize: Size ) => void, parent?: number | Screen, noCss?: boolean ): Screen;

		/**
		 * Sets the keys whose default browser behavior is prevented.
		 *
		 * Sets the action keys, replacing the previous set. The browser's default behavior is prevented for these keys, such as scrolling with the arrow keys or Space.
		 *
		 * Pass every action key in one call. An empty array clears them. set( { "actionKeys": [ ... ] } ) sets them the same way. Keys can be a code (for example "ArrowUp") or a key value (for example " "). Setting them starts keyboard tracking unless stopKeyboard() was called.
		 * @param keys Array of key codes or key values that become the action keys.
		 * @returns This function does not return a value.
		 */
		setActionKeys( params: { "keys": Array<string> } ): void;
		setActionKeys( keys: Array<string> ): void;

		/**
		 * Changes the volume, playback rate, or pan of an audio instance.
		 *
		 * Changes a playing, delayed, or paused instance. Omitted values stay as they are. playbackRate changes speed and pitch together, and stays in the range for how the audio was loaded: 0.0625 to 16 for decoded audio, and 0.25 to 4 for streamed audio. A rate change also changes how long the rest of the instance lasts. Changes to a paused instance apply when it resumes.
		 * @param instanceId Instance ID returned from playAudio.
		 * @param volume Volume (0-1).
		 * @param playbackRate Speed and pitch within the instance's mode range.
		 * @param pan Stereo position from -1 (left) to 1 (right).
		 * @returns This function does not return a value.
		 */
		setAudio( params: { "instanceId": number; "volume"?: number; "playbackRate"?: number; "pan"?: number } ): void;
		setAudio( instanceId: number, volume?: number, playbackRate?: number, pan?: number ): void;

		/**
		 * Sets the volume of one sound bus.
		 *
		 * Sets the volume of one mix bus, before the master volume. "sfx" is sound(), "music" is play(), and "audio" is playAudio(). "master" is the same as setVolume().
		 * @param bus 'sfx', 'music', 'audio', or 'master'.
		 * @param volume Volume, 0-1.
		 * @returns This function does not return a value.
		 */
		setBusVolume( params: { "bus": string; "volume": number } ): void;
		setBusVolume( bus: string, volume: number ): void;

		/**
		 * Sets the default foreground color used by new screens.
		 *
		 * Sets the drawing color for subsequently created screens from a default-palette index or a supported color value. Numeric indices must be finite integers from 0 through the last default-palette entry; index 0 is transparent black.
		 * @param color Numeric integer palette index, CSS/hex string, RGB/RGBA array, or color object.
		 * @returns This function does not return a value.
		 */
		setDefaultColor( params: { "color": any } ): void;
		setDefaultColor( color: any ): void;

		/**
		 * Sets the default font for new screens.
		 *
		 * Sets the default font ID that will be used when new screens are created. The font must already be loaded using loadFont.
		 * @param fontId Font ID from loadFont to use as default for new screens.
		 * @returns This function does not return a value.
		 */
		setDefaultFont( params: { "fontId": number } ): void;
		setDefaultFont( fontId: number ): void;

		/**
		 * Sets the default color palette for newly created screens.
		 *
		 * Defines the default palette used when a new screen is created.
		 *
		 * The first color (index 0) is reserved for transparent black and will be set automatically. This  means that the color you set at (index 0) will be (index 1) in the internal palette.
		 * @param pal Array of color values (names, hex, RGBA, or palette indices).
		 * @returns This function does not return a value.
		 */
		setDefaultPal( params: { "pal": Array<any> } ): void;
		setDefaultPal( pal: Array<any> ): void;

		/**
		 * Sets the dead zone for gamepad sticks and axes.
		 *
		 * Sets the dead zone that hides stick drift. The default is 0.2. Inside the dead zone an axis reads 0; outside it, the value is rescaled so that it starts from 0 at the edge of the dead zone and still reaches 1 at full tilt.
		 * @param deadZone Dead zone from 0 to under 1 (0 = no dead zone). The default is 0.2.
		 * @returns This function does not return a value.
		 */
		setGamepadDeadZone( params: { "deadZone": number } ): void;
		setGamepadDeadZone( deadZone: number ): void;

		/**
		 * Sets the active screen for graphics commands.
		 *
		 * Changes the active screen to the specified screen. All subsequent graphics commands will operate on this screen until another screen is set as active.
		 * @param screen Screen ID (number) or screen API object to set as active.
		 * @returns This function does not return a value.
		 */
		setScreen( params: { "screen": number | Screen } ): void;
		setScreen( screen: number | Screen ): void;

		/**
		 * Turns the output limiter on or off.
		 *
		 * Keeps the combined output of sounds, music, and audio from clipping. It is on by default. Levels below its threshold pass through unchanged. Set it before playback starts.
		 * @param enabled True to limit output (the default), false to bypass the limiter.
		 * @returns This function does not return a value.
		 */
		setSoundLimiter( params: { "enabled": boolean } ): void;
		setSoundLimiter( enabled: boolean ): void;

		/**
		 * Sets the master volume for all sounds, music, and audio.
		 *
		 * Sets the master volume for sounds, music, and audio together. 0 is silent and 1 is full volume. The default is 0.75.
		 * @param volume Volume (0-1, default: 0.75).
		 * @returns This function does not return a value.
		 */
		setVolume( params: { "volume": number } ): void;
		setVolume( volume: number ): void;

		/**
		 * Plays a synthesized sound with an ADSR envelope using Web Audio API.
		 *
		 * Plays a tone or noise with an ADSR envelope. The attack rises to volume, the decay falls to the sustain level, the sustain holds until duration ends, and the release fades to silence. The sound lasts for duration plus the release.
		 *
		 * oType selects the waveform: triangle, sine, square, sawtooth, white noise, pink noise, or a custom wavetable. frequencyEnd sweeps the pitch from frequency to frequencyEnd over duration. pan places the sound from -1 (left) to 1 (right). Noise ignores frequency.
		 *
		 * Until the page gets its first click, key, or touch, calls return an ID but play nothing.
		 * @param frequency Frequency in Hz; no effect on noise (default: 440).
		 * @param duration Gate length in seconds: how long the sound is held before the release begins (default: 1).
		 * @param volume Peak volume 0-1 (default: 1).
		 * @param oType Oscillator type: 'triangle', 'sine', 'square', 'sawtooth', 'white' or 'pink' noise, a source type added by a plugin (such as 'periodic' from sound-advanced), or custom wavetable array [[realArray], [imagArray]] (default: 'triangle').
		 * @param delay Delay before playing in seconds (default: 0).
		 * @param attackTime Seconds from silence to the peak volume (default: 0).
		 * @param decayTime Seconds from the peak to the sustain level (default: 0).
		 * @param sustainLevel Fraction of the peak volume held until duration ends, 0-1 (default: 1).
		 * @param releaseTime Seconds from the sustain level to silence after duration ends (default: 0.1).
		 * @param pan Stereo position from -1 (left) to 1 (right) (default: 0).
		 * @param frequencyEnd Frequency in Hz to sweep to exponentially over duration; no effect on noise (default: no sweep).
		 * @returns Sound ID for use with stopSound.
		 */
		sound( params: { "frequency"?: number; "duration"?: number; "volume"?: number; "oType"?: string | any[]; "delay"?: number; "attackTime"?: number; "decayTime"?: number; "sustainLevel"?: number; "releaseTime"?: number; "pan"?: number; "frequencyEnd"?: number } ): string;
		sound( frequency?: number, duration?: number, volume?: number, oType?: string | any[], delay?: number, attackTime?: number, decayTime?: number, sustainLevel?: number, releaseTime?: number, pan?: number, frequencyEnd?: number ): string;

		/**
		 * Starts the gamepad input loop and begins monitoring for gamepad connections.
		 *
		 * Starts polling gamepads once per animation frame. Polling also starts on first use: the first inGamepad() call or onGamepad() registration. After stopGamepad(), only startGamepad() starts it again. Calling it while polling does nothing.
		 *
		 * Since startGamepad is automatically called any time an inGamepad or onGamepad is registered it's only required if a stopGamepad was called explicitly.
		 * @returns This function does not return a value.
		 */
		startGamepad(): void;

		/**
		 * Starts keyboard input monitoring.
		 *
		 * Starts keyboard tracking. Tracking also starts on the first inKey(), onKey(), or setActionKeys() call, so this is only needed after stopKeyboard(). Calling it while the keyboard is already running does nothing. Keys pressed before tracking starts are not reported.
		 * @returns This function does not return a value.
		 */
		startKeyboard(): void;

		/**
		 * Stops an audio instance, every instance of an audio ID, or all audio.
		 *
		 * Stops audio with a short fade. Pass an instance ID to stop one instance, an audio ID to stop every instance of that file, or nothing to stop all audio. An instance that has not started yet is cancelled.
		 * @param id Instance ID, or audio ID to stop all its instances. If omitted, stops all audio.
		 * @returns This function does not return a value.
		 */
		stopAudio( params: { "id"?: number | string } ): void;
		stopAudio( id?: number | string ): void;

		/**
		 * Stops the gamepad input loop.
		 *
		 * Stops polling until startGamepad(). While stopped, inGamepad() returns an empty array and inGamepad( index ) returns null; neither reads nor onGamepad() registrations restart polling. Every button is released and the axes read 0, without reporting a release, as when the page is hidden: a gamepad kept from an earlier read reports no button held.
		 *
		 * Connection callbacks are not called while stopped, and gamepads do not join or leave the list. startGamepad() catches up: gamepads that disconnected while stopped are removed through the 'disconnect' callbacks, and the 'connect' callbacks receive the gamepads that connected.
		 * @returns This function does not return a value.
		 */
		stopGamepad(): void;

		/**
		 * Stops keyboard input monitoring.
		 *
		 * Stops keyboard tracking until startKeyboard(). Held keys are released through the 'up' callbacks, with cancelled set to true. While stopped, inKey() reports no keys, and callbacks stay registered but are not called. inKey(), onKey(), and setActionKeys() do not restart it. An input() prompt still reads keys.
		 * @returns This function does not return a value.
		 */
		stopKeyboard(): void;

		/**
		 * Stops playing music tracks.
		 *
		 * Stops one music track, or every track when trackId is omitted. Notes that are playing fade out. Notes that have not started are cancelled.
		 * @param trackId Track ID to stop. If null, stops all tracks.
		 * @returns This function does not return a value.
		 */
		stopPlay( params: { "trackId"?: number } ): void;
		stopPlay( trackId?: number ): void;

		/**
		 * Stops a playing sound or all sounds.
		 *
		 * Stops one sound, or every sound when soundId is omitted. A sound that is playing fades out. A delayed sound that has not started is cancelled.
		 * @param soundId Sound ID returned from sound(). If null, stops all sounds.
		 * @returns This function does not return a value.
		 */
		stopSound( params: { "soundId"?: string } ): void;
		stopSound( soundId?: string ): void;

		/**
		 * Rumbles a gamepad's vibration motors.
		 *
		 * Plays the "dual-rumble" effect of the gamepad's vibration actuator for duration milliseconds, with the strong (low-frequency) and weak (high-frequency) motors at the given magnitudes. Returns true when the gamepad supports the effect and false when it does not, such as in Firefox and iOS Safari, or when no gamepad has the index; nothing plays then. Browsers may cap the duration, and a new effect replaces one that is still playing; a duration of 0 stops the rumble.
		 * @param gamepadIndex Index of the pad to rumble.
		 * @param duration Rumble length in milliseconds.
		 * @param strong Strong (low-frequency) motor magnitude from 0 to 1. The default is 1.
		 * @param weak Weak (high-frequency) motor magnitude from 0 to 1. The default is 1.
		 * @returns True when the pad supports the dual-rumble effect and it was started.
		 */
		vibrateGamepad( params: { "gamepadIndex": number; "duration": number; "strong"?: number; "weak"?: number } ): boolean;
		vibrateGamepad( gamepadIndex: number, duration: number, strong?: number, weak?: number ): boolean;

		/**
		 * Current Pi.js version string.
		 */
		readonly version: "2.3.0";
	}
}

// Module and global bindings for Pi.js
// Runtime exposes window.pi and optional window.$; ESM exports pi and $.
declare const pi: Pi.API;
declare const $: Pi.API;

export { pi, $ };
export default pi;
export type PluginAPI = Pi.PluginAPI;
export type API = Pi.API;
export type Screen = Pi.Screen;

// Global augmentation for IIFE / non-module script usage
declare global {
	var pi: Pi.API;
	var $: Pi.API;
}
