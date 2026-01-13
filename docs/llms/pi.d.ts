/**
 * Pi.js Type Definitions
 * Version: pi-2.0
 * Author: Andy Stubbs
 * License: Apache-2.0
 * Generated on 2025-12-14T16:09:55.015Z
 */
declare namespace Pi {
	/**
	 * Click event data (mouse or touch).
	 *
	 * Click data object containing position, button state, and action information. Passed to click event callbacks (onclick). Click events unify mouse clicks and touch taps.
	 */
	interface ClickData {
		/**
		 * X coordinate where click occurred in pixels.
		 */
		x: number;

		/**
		 * Y coordinate where click occurred in pixels.
		 */
		y: number;

		/**
		 * Previous X coordinate in pixels.
		 */
		lastX: number;

		/**
		 * Previous Y coordinate in pixels.
		 */
		lastY: number;

		/**
		 * Button state at time of click.
		 */
		buttons: number;

		/**
		 * Action type, typically 'click'.
		 */
		action: string;

		/**
		 * Input type: 'mouse' or 'touch'.
		 */
		type: string;
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
	 * Gamepad state and event data.
	 *
	 * Gamepad data object containing connection status, button states, axis values, and helper methods. Returned by ingamepad() and passed to gamepad event callbacks (onGamepadConnected, onGamepadDisconnected).
	 */
	interface GamepadData {
		/**
		 * Gamepad index (0-3).
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
		 * Gamepad mapping type.
		 */
		mapping: string;

		/**
		 * Array of button objects with pressed, value, pressStarted, pressReleased properties.
		 */
		buttons: Array<object>;

		/**
		 * Array of axis values (-1.0 to 1.0).
		 */
		axes: Array<number>;
	}

	/**
	 * Rectangular area used for hit detection in event handlers.
	 *
	 * A rectangular area defined by position and dimensions. Used to restrict event handlers (onclick, onmouse, onpress, ontouch) to only fire when the input occurs within this area.
	 *
	 * If no hitBox is provided to an event handler, the entire screen is used as the hit box.
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
		 * Width of the rectangle in pixels.
		 */
		width: number;

		/**
		 * Height of the rectangle in pixels.
		 */
		height: number;
	}

	/**
	 * Mouse state and event data.
	 *
	 * Mouse data object containing position, button state, action type, and previous position. Returned by inmouse() and passed to mouse event callbacks (onmouse).
	 */
	interface MouseData {
		/**
		 * Current X coordinate in pixels.
		 */
		x: number;

		/**
		 * Current Y coordinate in pixels.
		 */
		y: number;

		/**
		 * Previous X coordinate in pixels.
		 */
		lastX: number;

		/**
		 * Previous Y coordinate in pixels.
		 */
		lastY: number;

		/**
		 * Button state bitmask (0 = no buttons, 1 = left, 2 = right, 4 = middle, etc.).
		 */
		buttons: number;

		/**
		 * Action type: 'down', 'up', or 'move'.
		 */
		action: string;

		/**
		 * Input type, always 'mouse' for mouse data.
		 */
		type: string;
	}

	/**
	 * Settings object for the set() command.
	 *
	 * Options object used with the set() command to apply multiple settings in a single call. Any command registered as a "setX" command is available as an option with the lowercased name (e.g., setColor => { "color": ... }).
	 */
	interface Options {
		/**
		 * Sets keys that should prevent default browser behavior.
		 */
		actionKeys?: Array<string>;

		/**
		 * Sets the canvas background color.
		 */
		bgColor?: any;

		/**
		 * Sets the current blend mode used for rendering.
		 */
		blend?: string;

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
		 * Enables or disables the right-click context menu.
		 */
		enableContextMenu?: boolean;

		/**
		 * Sets the font for the current screen.
		 */
		font?: number;

		/**
		 * Sets the dead zone sensitivity for gamepad analog sticks.
		 */
		gamepadSensitivity?: number;

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
		 * Enables or disables browser pinch zoom gestures.
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
		 * Sets the global volume for all sounds and audio pools.
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
		 * Register a new command.
		 */
		addCommand: ( name: string, fn: ( ...args: any[] ) => any, isScreen: boolean, parameterNames: string[], isScreenOptional: boolean ) => void;

		/**
		 * Add persistent data to each screen.
		 */
		addScreenDataItem: ( name: string, defaultValue: any ) => void;

		/**
		 * Add a dynamic data getter for screens.
		 */
		addScreenDataItemGetter: ( name: string, getterFn: Function ) => void;

		/**
		 * Register a function to run when screens are created.
		 */
		addScreenInitFunction: ( initFn: Function ) => void;

		/**
		 * Register a function to run when screens are destroyed.
		 */
		addScreenCleanupFunction: ( cleanupFn: Function ) => void;

		/**
		 * Get data for a specific screen by name.
		 */
		getScreenData: ( fnName: string, screenId: string ) => any;

		/**
		 * Get array of all screen data objects.
		 */
		getAllScreensData: () => any[];

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
		 * Register a clearEvents handler for a specific event type.
		 */
		registerClearEvents: ( name: string, handler: Function ) => void;
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
	 * Press data object containing position, button state, action type, and input source. Returned by inpress() and passed to press event callbacks (onpress). The type property indicates whether the data is from mouse or touch input.
	 */
	interface PressData {
		/**
		 * Current X coordinate in pixels.
		 */
		x: number;

		/**
		 * Current Y coordinate in pixels.
		 */
		y: number;

		/**
		 * Previous X coordinate in pixels.
		 */
		lastX: number;

		/**
		 * Previous Y coordinate in pixels.
		 */
		lastY: number;

		/**
		 * Button/press state (0 = no press, 1 = pressed).
		 */
		buttons: number;

		/**
		 * Action type: 'down', 'up', or 'move'.
		 */
		action: string;

		/**
		 * Input type: 'mouse' or 'touch'.
		 */
		type: string;
	}

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
	 * Data for a single touch point. Touch events can have multiple simultaneous touches, so ontouch callbacks receive an array of TouchData objects.
	 */
	interface TouchData {
		/**
		 * Current X coordinate in pixels.
		 */
		x: number;

		/**
		 * Current Y coordinate in pixels.
		 */
		y: number;

		/**
		 * Unique touch identifier for tracking individual touches.
		 */
		id: number;

		/**
		 * Previous X coordinate in pixels.
		 */
		lastX: number;

		/**
		 * Previous Y coordinate in pixels.
		 */
		lastY: number;

		/**
		 * Action type: 'start', 'end', or 'move'.
		 */
		action: string;

		/**
		 * Input type, always 'touch' for touch data.
		 */
		type: string;
	}

	interface Screen {
		/**
		 * Appends new colors to the current palette and returns their indices.
		 *
		 * Adds colors that do not already exist in the palette, returning the indices of the newly added entries.
		 * @param colors Array of colors to add (names, hex, RGB[A]).
		 */
		addPalColors( params: { "colors": Array<any> } ): void;
		addPalColors( colors: Array<any> ): void;

		/**
		 * Draws an arc on the screen.
		 *
		 * This function renders a circular arc segment to the active canvas.  The angles are measured in degrees, clockwise from the positive x-axis.
		 * @param x The x coordinate of the center point of the arc's circle.
		 * @param y The y coordinate of the center point of the arc's circle.
		 * @param radius The radius of the arc's circle.
		 * @param angle1 The starting angle in degrees.
		 * @param angle2 The ending angle in degrees.
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
		 */
		blitSprite( params: { "name": string; "frame"?: number; "x"?: number; "y"?: number; "color"?: any; "anchorX"?: number; "anchorY"?: number; "scaleX"?: number; "scaleY"?: number; "angleRad"?: number } ): void;
		blitSprite( name: string, frame?: number, x?: number, y?: number, color?: any, anchorX?: number, anchorY?: number, scaleX?: number, scaleY?: number, angleRad?: number ): void;

		/**
		 * Calculates the pixel width of a text message.
		 *
		 * Calculates how many pixels wide a text message will be when printed with the current font and print scale settings.
		 * @param msg Text message to calculate width for. Defaults to empty string if not provided.
		 */
		calcWidth( params: { "msg"?: string } ): void;
		calcWidth( msg?: string ): void;

		/**
		 * Cancels the current input prompt on this screen.
		 *
		 * Cancels the active input prompt on the current screen. The input promise will resolve with null, and the callback (if provided) will also be passed in the value null.
		 */
		cancelInput(): void;

		/**
		 * Returns the HTMLCanvasElement for the current screen.
		 *
		 * Gets the underlying HTMLCanvasElement DOM element for the active screen. This can be used for direct canvas manipulation or integration with other libraries.
		 *
		 * Note: This is for applying CSS styles to the canvas or moving the canvas in the DOM. You cannot call getContext( "2d" ) on the returned canvas element as it already has a WebGL context. If you want to use a 2d canvas context on a screen you can create a new DOM canvas and draw it as an image on the screen.
		 */
		canvas(): void;

		/**
		 * Draws a circle on the screen.
		 *
		 * This function renders a circle to the active canvas.  The circle is drawn with a border using the current foreground color. If a fill color is provided, the circle will be filled with that color.
		 * @param x The x coordinate of the center of the circle.
		 * @param y The y coordinate of the center of the circle.
		 * @param radius The radius of the circle.
		 * @param fillColor The fill color for the circle. Can be a palette index or color value (string, array, object, number).
		 */
		circle( params: { "x": number; "y": number; "radius": number; "fillColor"?: any } ): void;
		circle( x: number, y: number, radius: number, fillColor?: any ): void;

		/**
		 * Clears events from all plugins or a specific plugin event type.
		 *
		 * Clears queued/registered events. If type is provided, clears only that event type; otherwise clears events for all registered types.
		 * @param type Optional type to clear (e.g., "keyboard", "mouse", "touch", "press").
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
		 */
		createImageFromScreen( params: { "name"?: string; "x1"?: number; "y1"?: number; "x2"?: number; "y2"?: number } ): void;
		createImageFromScreen( name?: string, x1?: number, y1?: number, x2?: number, y2?: number ): void;

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
		 */
		drawSprite( params: { "name": string; "frame"?: number; "x": number; "y": number; "color"?: any; "anchorX"?: number; "anchorY"?: number; "scaleX"?: number; "scaleY"?: number; "angle"?: number } ): void;
		drawSprite( name: string, frame: number | undefined, x: number, y: number, color?: any, anchorX?: number, anchorY?: number, scaleX?: number, scaleY?: number, angle?: number ): void;

		/**
		 * Draws an ellipse on the screen.
		 *
		 * This function renders an ellipse to the active canvas.  The ellipse is drawn with a border using the current foreground color. If a fill color is provided, the ellipse will be filled with that color.
		 * @param x The x coordinate of the center of the ellipse.
		 * @param y The y coordinate of the center of the ellipse.
		 * @param radiusX The horizontal radius of the ellipse.
		 * @param radiusY The vertical radius of the ellipse.
		 * @param fillColor The fill color for the ellipse. Can be a palette index or color value (string, array, object, number).
		 */
		ellipse( params: { "x": number; "y": number; "radiusX": number; "radiusY": number; "fillColor"?: any } ): void;
		ellipse( x: number, y: number, radiusX: number, radiusY: number, fillColor?: any ): void;

		/**
		 * Applies a filter function to a rectangular region of the screen.
		 *
		 * Queues a filter to run at end of frame. The filter callback receives a mutable pixel buffer (RGBA as Uint8ClampedArray) and x, y coordinates; return truthy to apply the modified pixel. If true is not returned in the callback the pixel will be filtered out and be set to black/transparent, even if it is not modified.
		 *
		 * Note: while this function is asynchrounous it will modify the screen image using the image data at the time the function is called. So a line drawn after the filterImg command is called will be drawn after the filter is applied. Also, this runs on the CPU not the GPU so in large areas it may not be suitable to run in an animationFrame.
		 * @param filter Callback (color, x, y) => truthy to accept modified pixel color, falsy to skip.
		 * @param x1 Left coordinate (default 0).
		 * @param y1 Top coordinate (default 0).
		 * @param x2 Right coordinate (default screen width - 1).
		 * @param y2 Bottom coordinate (default screen height - 1).
		 */
		filterImg( params: { "filter": ( color: PiColor, x: number, y: number ) => boolean; "x1"?: number; "y1"?: number; "x2"?: number; "y2"?: number } ): void;
		filterImg( filter: ( color: PiColor, x: number, y: number ) => boolean, x1?: number, y1?: number, x2?: number, y2?: number ): void;

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
		 */
		get( params: { "x": number; "y": number; "width": number; "height": number; "tolerance"?: number; "asIndex"?: boolean } ): void;
		get( x: number, y: number, width: number, height: number, tolerance?: number, asIndex?: boolean ): void;

		/**
		 * Asynchronously reads a region of pixels as indices (default) or color values.
		 *
		 * Returns a Promise resolving to a 2D array [height][width]. By default resolves to palette indices. Set asIndex=false to resolve to color value objects. Tolerance controls color-to-index matching.
		 *
		 * Note: if asIndex is set to false then the 2D array cannot be used with the put command.
		 * @param x Left coordinate.
		 * @param y Top coordinate.
		 * @param width Region width.
		 * @param height Region height.
		 * @param tolerance Color matching tolerance [0.0-1.0] for index conversion (default 1).
		 * @param asIndex If false, resolve to color value objects instead of indices.
		 */
		getAsync( params: { "x": number; "y": number; "width": number; "height": number; "tolerance"?: number; "asIndex"?: boolean } ): void;
		getAsync( x: number, y: number, width: number, height: number, tolerance?: number, asIndex?: boolean ): void;

		/**
		 * Gets the current foreground color.
		 *
		 * Returns the current drawing color. If asIndex is true, returns the palette index; otherwise returns the color value object.
		 * @param asIndex If true returns the palette index, otherwise returns a color value object.
		 */
		getColor( params: { "asIndex"?: boolean } ): void;
		getColor( asIndex?: boolean ): void;

		/**
		 * Returns the number of character columns that fit on the screen.
		 *
		 * Gets the maximum number of character columns that can fit horizontally on the screen based on the current font size and print scale.
		 */
		getCols(): void;

		/**
		 * Returns the current color palette as an array.
		 *
		 * Gets the active screen's color palette. By default, index 0 (transparent black) is excluded. Note: Color indices may not match exactly because index 0 is strictly reserved for transparent black.
		 * @param include0 If true include palette index 0 (transparent black).
		 */
		getPal( params: { "include0"?: boolean } ): void;
		getPal( include0?: boolean ): void;

		/**
		 * Returns the color value object for a palette index.
		 *
		 * Gets the color value for a specific palette index. Returns null if the index is out of range.
		 * @param index Palette index to retrieve.
		 */
		getPalColor( params: { "index": number } ): void;
		getPalColor( index: number ): void;

		/**
		 * Finds the palette index for a color with optional tolerance.
		 *
		 * Finds the best-matching palette index for a given color. Tolerance filters how close the match must be: 0 = exact match only, 1 = any color. The closest color that fits in the tolerance range will be returned.
		 * @param color Palette index or color value (string, array, object, number).
		 * @param tolerance Number between 0 and 1 indicating acceptable color difference.
		 */
		getPalIndex( params: { "color": any; "tolerance"?: number } ): void;
		getPalIndex( color: any, tolerance?: number ): void;

		/**
		 * Reads the color of a single pixel.
		 *
		 * Returns the color at (x, y). If asIndex is true, returns the palette index; otherwise returns a color value object.
		 * @param x X (horizontal) coordinate.
		 * @param y Y (vertical) coordinate.
		 * @param asIndex If true, return palette index instead of color value.
		 */
		getPixel( params: { "x": number; "y": number; "asIndex"?: boolean } ): void;
		getPixel( x: number, y: number, asIndex?: boolean ): void;

		/**
		 * Asynchronously reads the color of a single pixel.
		 *
		 * Reads the color at (x, y) asynchronously. If asIndex is true, resolves to the palette index; otherwise resolves to a color value object.
		 * @param x X (horizontal) coordinate.
		 * @param y Y (vertical) coordinate.
		 * @param asIndex If true, resolve to palette index instead of color value.
		 */
		getPixelAsync( params: { "x": number; "y": number; "asIndex"?: boolean } ): void;
		getPixelAsync( x: number, y: number, asIndex?: boolean ): void;

		/**
		 * Gets the current print cursor position as column and row.
		 *
		 * Returns the current print cursor position as character grid coordinates (column and row). The grid size is determined by the current font size and print scale.
		 */
		getPos(): void;

		/**
		 * Gets the current print cursor position in pixels.
		 *
		 * Returns the current print cursor position as exact pixel coordinates.
		 */
		getPosPx(): void;

		/**
		 * Returns the number of character rows that fit on the screen.
		 *
		 * Gets the maximum number of character rows that can fit vertically on the screen based on the current font size and print scale.
		 */
		getRows(): void;

		/**
		 * Returns frame metadata for a spritesheet.
		 *
		 * Gets spritesheet data including frame count and per-frame bounding boxes.
		 * @param name Spritesheet name.
		 */
		getSpritesheetData( params: { "name": string } ): void;
		getSpritesheetData( name: string ): void;

		/**
		 * Returns the height of the current screen in pixels.
		 *
		 * Gets the internal height of the active screen's framebuffer size. This is the logical height used for drawing operations, which may differ from the CSS display size.
		 */
		height(): void;

		/**
		 * Gets the current mouse state and starts tracking if needed.
		 *
		 * Gets the current mouse state. If mouse tracking is not started, it will be started automatically. This is a convenience function that combines startMouse() and getMouse().
		 */
		inmouse(): void;

		/**
		 * Gets the current press state (mouse or touch) and starts tracking if needed.
		 *
		 * Returns press data from either mouse or touch, depending on which was used last. If the last event was touch, returns touch press data. Otherwise, returns mouse data.
		 *
		 * The returned object contains position, buttons, action, and type properties. For touch, it also includes a touches array with all active touches.
		 */
		inpress(): void;

		/**
		 * Prompts the user for text input with a blinking cursor.
		 *
		 * Displays a prompt and waits for the user to enter text. The input appears at the current print cursor position with a blinking cursor. Supports validation for numbers, integers, and maximum length.
		 *
		 * The input is completed when Enter is pressed, or cancelled when Escape is pressed. Returns a Promise that resolves with the input value (or null if cancelled), and optionally calls a callback function.
		 *
		 * For numeric input, empty input or just "-" returns 0. For integer input, decimal points are not allowed.
		 * @param prompt Prompt text to display before the input field.
		 * @param fn Optional callback function called with the input value when input completes.
		 * @param cursor Cursor character to display. Defaults to block character (█).
		 * @param isNumber If true, only allows numeric input.
		 * @param isInteger If true, only allows integer input (no decimals).
		 * @param allowNegative If true, allows negative numbers (for numeric input).
		 * @param maxLength Maximum length of the input string. If null, no limit.
		 */
		input( params: { "prompt": string; "fn"?: ( message: string ) => void; "cursor"?: string; "isNumber"?: boolean; "isInteger"?: boolean; "allowNegative"?: boolean; "maxLength"?: number } ): void;
		input( prompt: string, fn?: ( message: string ) => void, cursor?: string, isNumber?: boolean, isInteger?: boolean, allowNegative?: boolean, maxLength?: number ): void;

		/**
		 * Gets the current touch state and starts tracking if needed.
		 *
		 * Returns an array of all active touches. Each touch object contains:
		 * - **x**: Current X coordinate
		 * - **y**: Current Y coordinate
		 * - **id**: Touch identifier
		 * - **lastX**: Previous X coordinate (or null if first touch)
		 * - **lastY**: Previous Y coordinate (or null if first touch)
		 * - **action**: Last action ("start", "end", or "move")
		 * - **type**: Always "touch"
		 *
		 * If touch tracking is not started, it will be started automatically.
		 */
		intouch(): void;

		/**
		 * Draws a line on the screen.
		 *
		 * This function renders a line segment to the active canvas.  The line is drawn from the first point to the second point using the current foreground color.
		 * @param x1 The x coordinate of the starting point of the line.
		 * @param y1 The y coordinate of the starting point of the line.
		 * @param x2 The x coordinate of the ending point of the line.
		 * @param y2 The y coordinate of the ending point of the line.
		 */
		line( params: { "x1": number; "y1": number; "x2": number; "y2": number } ): void;
		line( x1: number, y1: number, x2: number, y2: number ): void;

		/**
		 * Removes a click event handler.
		 *
		 * Removes a previously registered click event handler. If fn is null, removes all click handlers.
		 * @param fn Callback function that matches the original handler. If null, removes all click handlers.
		 */
		offclick( params: { "fn"?: ( clickData: ClickData, customData?: object ) => void } ): void;
		offclick( fn?: ( clickData: ClickData, customData?: object ) => void ): void;

		/**
		 * Removes a mouse event handler.
		 *
		 * Removes a previously registered mouse event handler. If fn is null, removes all handlers for the specified mode.
		 * @param mode Event mode ('down', 'up', or 'move') that matches the original handler.
		 * @param fn Callback function that matches the original handler. If null, removes all handlers for this mode.
		 */
		offmouse( params: { "mode": string; "fn"?: ( mouseData: MouseData, customData?: object ) => void } ): void;
		offmouse( mode: string, fn?: ( mouseData: MouseData, customData?: object ) => void ): void;

		/**
		 * Removes a press event handler.
		 *
		 * Removes a previously registered press event handler. If fn is null, removes all handlers for the specified mode.
		 * @param mode Event mode ('down', 'up', or 'move') that matches the original handler.
		 * @param fn Callback function that matches the original handler. If null, removes all handlers for this mode.
		 */
		offpress( params: { "mode": string; "fn"?: ( pressData: PressData, customData?: object ) => void } ): void;
		offpress( mode: string, fn?: ( pressData: PressData, customData?: object ) => void ): void;

		/**
		 * Removes a touch event handler.
		 *
		 * Removes a previously registered touch event handler. If fn is null, removes all handlers for the specified mode.
		 * @param mode Event mode ('start', 'end', or 'move') that matches the original handler.
		 * @param fn Callback function that matches the original handler. If null, removes all handlers for this mode.
		 */
		offtouch( params: { "mode": string; "fn"?: ( touchDataArray: Array<TouchData>, customData?: object ) => void } ): void;
		offtouch( mode: string, fn?: ( touchDataArray: Array<TouchData>, customData?: object ) => void ): void;

		/**
		 * Registers a callback function for click events (mouse or touch).
		 *
		 * Registers a callback function that will be called when a click event occurs. Click events are triggered when a press is released (up) after being pressed (down) in the same location, unifying mouse clicks and touch taps.
		 *
		 * If no hitBox is provided, the entire screen is used as the hit box.
		 * @param fn Callback function that receives (clickData, customData) when a click occurs.
		 * @param once If true, the handler is removed after being called once.
		 * @param hitBox Optional hit box object with x, y, width, height properties. Click only fires if press is within this area. Defaults to full screen.
		 * @param customData Optional custom data passed to the callback function.
		 */
		onclick( params: { "fn": ( clickData: ClickData, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onclick( fn: ( clickData: ClickData, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Registers a callback function for mouse events.
		 *
		 * Registers a callback function that will be called when a mouse event occurs. The callback receives mouse data and optional custom data.
		 *
		 * Supports hit box filtering - if a hitBox is provided, the callback only fires when the mouse is within that rectangular area.
		 * @param mode Event mode: 'down', 'up', or 'move'.
		 * @param fn Callback function that receives (mouseData, customData) when the event occurs.
		 * @param once If true, the handler is removed after being called once.
		 * @param hitBox Optional hit box object with x, y, width, height properties. Callback only fires if mouse is within this area.
		 * @param customData Optional custom data passed to the callback function.
		 */
		onmouse( params: { "mode": string; "fn": ( mouseData: MouseData, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onmouse( mode: string, fn: ( mouseData: MouseData, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Registers a callback function for press events (mouse or touch).
		 *
		 * Registers a callback function that will be called when a press event occurs. Press events unify mouse and touch input, so the callback receives data from either input method.
		 *
		 * Supports hit box filtering - if a hitBox is provided, the callback only fires when the press is within that rectangular area.
		 * @param mode Event mode: 'down', 'up', or 'move'.
		 * @param fn Callback function that receives (pressData, customData) when the event occurs.
		 * @param once If true, the handler is removed after being called once.
		 * @param hitBox Optional hit box object with x, y, width, height properties. Callback only fires if press is within this area.
		 * @param customData Optional custom data passed to the callback function.
		 */
		onpress( params: { "mode": string; "fn": ( pressData: PressData, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onpress( mode: string, fn: ( pressData: PressData, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Registers a callback function for touch events.
		 *
		 * Registers a callback function that will be called when a touch event occurs. The callback receives an array of touch data and optional custom data.
		 *
		 * Supports hit box filtering - if a hitBox is provided, the callback only fires when touches are within that rectangular area.
		 * @param mode Event mode: 'start', 'end', or 'move'.
		 * @param fn Callback function that receives (touchDataArray, customData) when the event occurs.
		 * @param once If true, the handler is removed after being called once.
		 * @param hitBox Optional hit box object with x, y, width, height properties. Callback only fires if touches are within this area.
		 * @param customData Optional custom data passed to the callback function.
		 */
		ontouch( params: { "mode": string; "fn": ( touchDataArray: Array<TouchData>, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		ontouch( mode: string, fn: ( touchDataArray: Array<TouchData>, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

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
		 */
		paint( params: { "x": number; "y": number; "fillColor": any; "tolerance"?: number; "boundaryColor"?: any } ): void;
		paint( x: number, y: number, fillColor: any, tolerance?: number, boundaryColor?: any ): void;

		/**
		 * Prints text to the screen using the current font and advances the cursor.
		 *
		 * Prints text to the screen at the current cursor position using the active bitmap font. The text cursor automatically advances after printing. Supports automatic word wrapping, text centering, and vertical scrolling when the cursor reaches the bottom of the screen.
		 *
		 * Newlines in the message will split the text into multiple lines. Tabs are converted to spaces.
		 * @param msg Text message to print. If omitted, prints an empty line.
		 * @param isInline If true, cursor stays on the same line after printing instead of advancing to next line.
		 * @param isCentered If true, centers the text horizontally on the screen.
		 */
		print( params: { "msg"?: string; "isInline"?: boolean; "isCentered"?: boolean } ): void;
		print( msg?: string, isInline?: boolean, isCentered?: boolean ): void;

		/**
		 * Sets a pixel on the screen to the current foreground color.
		 *
		 * This function sets a single pixel on the active canvas to the current foreground color.  After drawing, the cursor position is updated to the pixel coordinates.
		 * @param x The x coordinate of the pixel to set.
		 * @param y The y coordinate of the pixel to set.
		 */
		pset( params: { "x": number; "y": number } ): void;
		pset( x: number, y: number ): void;

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
		 */
		rect( params: { "x": number; "y": number; "width": number; "height": number; "fillColor"?: any } ): void;
		rect( x: number, y: number, width: number, height: number, fillColor?: any ): void;

		/**
		 * Applies multiple settings in a single call using an options object.
		 *
		 * Sets one or more global or screen-scoped settings. Any command registered as a "setX" command is available as an option with the lowercased name (e.g., setColor => { "color": ... }).
		 *
		 * Behavior:
		 * - May be called before or after a screen exists; screen-scoped settings are applied to the active   screen if available.
		 * - Settings routed to non-screen commands are applied globally.
		 * @param options Object whose keys map to available settings (e.g., { "screen": "300x200", "color": 2 }).
		 */
		set( params: { "options": Options } ): void;
		set( options: Options ): void;

		/**
		 * Sets the canvas background color.
		 *
		 * Sets the background color of the canvas element. Transparent pixels will show this background color.
		 * @param color Palette index or color value (string, array, object, number).
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
		 */
		setBlend( params: { "blend": string } ): void;
		setBlend( blend: string ): void;

		/**
		 * Sets a custom character bitmap in the current font.
		 *
		 * Modifies a character in the current screen's font atlas by replacing its bitmap data. The character must exist in the font's character set. The data can be provided as a 2D array of 0/1 values or as a hex-encoded string.
		 *
		 * This updates the WebGL texture for the font, so the change is immediately visible when that character is printed.
		 * @param charCode Character code (number) or single-character string to modify.
		 * @param data Character bitmap as 2D array [[row...], ...] where 1=on, 0=off, or hex-encoded string.
		 */
		setChar( params: { "charCode": number | string; "data": any[] | string } ): void;
		setChar( charCode: number | string, data: any[] | string ): void;

		/**
		 * Sets the current foreground color used for drawing.
		 *
		 * Sets the active foreground color. Accepts a palette index or any supported color value. If a color value is provided that is not in the palette, the closest match will be used.
		 * @param color Palette index or color value (string, array, object, number).
		 */
		setColor( params: { "color": any } ): void;
		setColor( color: any ): void;

		/**
		 * Sets the background color of the screen's container element.
		 *
		 * Sets the CSS background color of the container element that holds the canvas.
		 * @param color Palette index or color value (string, array, object, number).
		 */
		setContainerBgColor( params: { "color": any } ): void;
		setContainerBgColor( color: any ): void;

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
		 */
		setDefaultAnchor( params: { "x": number; "y": number } ): void;
		setDefaultAnchor( x: number, y: number ): void;

		/**
		 * Enables or disables the right-click context menu.
		 *
		 * Controls whether the browser's default right-click context menu is shown. When disabled (default), right-clicks are prevented from showing the context menu, allowing them to be handled by mouse event handlers instead.
		 * @param isEnabled If true, enables the context menu. If false, disables it (default).
		 */
		setEnableContextMenu( params: { "isEnabled": boolean } ): void;
		setEnableContextMenu( isEnabled: boolean ): void;

		/**
		 * Sets the font for the current screen.
		 *
		 * Sets the active font for text rendering on the current screen. The font must already be loaded using loadFont. Several default fonts are preloaded: 0=6x6, 1=6x8 (default), 2=8x8, 3=8x14, 4=8x16.
		 * @param fontId The id of the font to set. The default fonts loaded are.
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
		 */
		setNoise( params: { "noise"?: number | any[]; "seed"?: number } ): void;
		setNoise( noise?: number | any[], seed?: number ): void;

		/**
		 * Replaces the current palette with a new set of colors.
		 *
		 * Sets an entirely new palette for the active screen. Index 0 is reserved for transparent black and will be set automatically. Note: Color indices may not match exactly because index 0 is strictly reserved for transparent black.
		 * @param pal Array of color values (names, hex, RGBA, or palette indices).
		 */
		setPal( params: { "pal": Array<any> } ): void;
		setPal( pal: Array<any> ): void;

		/**
		 * Updates one or more palette colors at specific indices.
		 *
		 * Sets multiple palette entries by index. Indices must be within the palette range and cannot be 0 (reserved for transparent black).
		 * @param indices Array of palette indices to change.
		 * @param colors Array of color values corresponding to indices.
		 */
		setPalColors( params: { "indices": Array<number>; "colors": Array<any> } ): void;
		setPalColors( indices: Array<number>, colors: Array<any> ): void;

		/**
		 * Sets the print cursor position using column and row coordinates.
		 *
		 * Sets the print cursor position based on character grid coordinates (columns and rows). The grid size is determined by the current font size and print scale. Column and row are 0-indexed.
		 * @param col Column position (0-indexed).
		 * @param row Row position (0-indexed).
		 */
		setPos( params: { "col"?: number; "row"?: number } ): void;
		setPos( col?: number, row?: number ): void;

		/**
		 * Sets the print cursor position using pixel coordinates.
		 *
		 * Sets the print cursor position using exact pixel coordinates. This allows precise positioning independent of the font's character grid.
		 * @param x X position in pixels.
		 * @param y Y position in pixels.
		 */
		setPosPx( params: { "x"?: number; "y"?: number } ): void;
		setPosPx( x?: number, y?: number ): void;

		/**
		 * Sets the scale factor for printed text.
		 *
		 * Sets the horizontal and vertical scale factors for bitmap font rendering. This allows you to make text larger or smaller. Scale values must be numbers greater than 0.
		 *
		 * Use padX and padY to add extra padding between characters when the print to the screen.
		 * @param scaleWidth Horizontal scale factor (must be number >= 0).
		 * @param scaleHeight Vertical scale factor (must be number >= 0).
		 * @param padX Extra horizontal padding between characters in pixels. Defaults to 0.
		 * @param padY Extra vertical padding between lines in pixels. Defaults to 0.
		 */
		setPrintSize( params: { "scaleWidth"?: number; "scaleHeight"?: number; "padX"?: number; "padY"?: number } ): void;
		setPrintSize( scaleWidth?: number, scaleHeight?: number, padX?: number, padY?: number ): void;

		/**
		 * Enables or disables word breaking for text wrapping.
		 *
		 * Controls whether text wrapping breaks at word boundaries (spaces) or at any character. When enabled, long words will wrap at the last space before the line end. When disabled, text will wrap at any character.
		 * @param isEnabled If true, enable word breaking at spaces. If false, break at any character.
		 */
		setWordBreak( params: { "isEnabled": boolean } ): void;
		setWordBreak( isEnabled: boolean ): void;

		/**
		 * Starts mouse input tracking for this screen.
		 *
		 * Starts mouse event listeners on the screen canvas. Mouse position and button states will be tracked and available via getMouse() or inmouse(). This is automatically called when mouse event handlers are registered.
		 */
		startMouse(): void;

		/**
		 * Starts touch input tracking for this screen.
		 *
		 * Starts touch event listeners on the screen canvas. Touch positions and states will be tracked and available via intouch(). This is automatically called when touch event handlers are registered.
		 */
		startTouch(): void;

		/**
		 * Stops mouse input tracking for this screen.
		 *
		 * Stops mouse event listeners on the screen canvas. Mouse tracking will no longer update until startMouse() is called again.
		 */
		stopMouse(): void;

		/**
		 * Stops touch input tracking for this screen.
		 *
		 * Stops touch event listeners on the screen canvas. Touch tracking will no longer update until startTouch() is called again.
		 */
		stopTouch(): void;

		/**
		 * Returns the width of the current screen in pixels.
		 *
		 * Gets the internal width of the active screen's canvas. This is the logical width used for drawing operations, which may differ from the CSS display size.
		 */
		width(): void;
	}

	interface API extends Screen {
		/**
		 * Returns an array of all screen API objects.
		 *
		 * Gets all created screens as an array of screen API objects. Each object has screen=true and an id property.
		 */
		getAllScreens(): void;

		/**
		 * Returns an array of all loaded fonts with their properties.
		 *
		 * Gets information about all fonts that have been loaded. Returns an array of font info objects containing id, width, and height for each font.
		 */
		getAvailableFonts(): void;

		/**
		 * Gets default palette and returns an array with all the color data. The default color palette defines what colors are
		 * available when a new screen is created.
		 */
		getDefaultPal(): void;

		/**
		 * Gets the image element by name.
		 *
		 * Returns the underlying Image or Canvas element for a previously loaded image.
		 * @param name Image name.
		 */
		getImage( params: { "name": string } ): void;
		getImage( name: string ): void;

		/**
		 * Returns a list of registered plugins and their status.
		 *
		 * Returns an array of plugin info objects including name, version, description, and initialized state.
		 */
		getPlugins(): void;

		/**
		 * Gets a screen API object by screen ID.
		 *
		 * Retrieves the screen API object for a specific screen ID. This allows you to call all the graphics operations for a specific screen. This means you do not have to call setScreen to set the active screen every time you want to draw on a different screen. There is also a tiny performance advantage for drawing commands called directly on a screen object.
		 * @param screenId The screen ID to retrieve.
		 */
		getScreen( params: { "screenId": number } ): void;
		getScreen( screenId: number ): void;

		/**
		 * Gets gamepad data for a specific gamepad or all gamepads.
		 *
		 * Retrieves gamepad data. If gamepadIndex is provided, returns the gamepad object for that index, or undefined if not found. If gamepadIndex is null or undefined, returns an array of all connected gamepads sorted by index.
		 *
		 * The returned gamepad object contains:
		 * - **index**: Gamepad index
		 * - **id**: Gamepad identifier string
		 * - **connected**: Connection status
		 * - **mapping**: Gamepad mapping type
		 * - **buttons**: Array of button objects with pressed, value, pressStarted, pressReleased
		 * - **axes**: Array of axis values (-1.0 to 1.0)
		 * - **getButton(buttonIndex)**: Get button object by index
		 * - **getButtonPressed(buttonIndex)**: Get button pressed state
		 * - **getButtonJustPressed(buttonIndex)**: Get if button was just pressed this frame
		 * - **getButtonJustReleased(buttonIndex)**: Get if button was just released this frame
		 * - **getAxis(axisIndex)**: Get axis value
		 * - **getAxisChanged(axisIndex)**: Get if axis value changed this frame
		 * @param gamepadIndex Gamepad index to retrieve. If null/undefined, returns all gamepads.
		 */
		ingamepad( params: { "gamepadIndex"?: number } ): void;
		ingamepad( gamepadIndex?: number ): void;

		/**
		 * Gets the current state of a key or all pressed keys.
		 *
		 * Retrieves key state information. If a key is provided (as a string), returns the key data object for that key if it's currently pressed, or null if not pressed. The key can be specified by its code (e.g., "KeyA") or key value (e.g., "a").
		 *
		 * If no key is provided, returns an array of all currently pressed key data objects.
		 *
		 * Key data objects contain: code, key, location, altKey, ctrlKey, metaKey, shiftKey, repeat.
		 * @param key Key code or key value to check. If omitted, returns all pressed keys.
		 */
		inkey( params: { "key"?: string } ): void;
		inkey( key?: string ): void;

		/**
		 * Creates an audio pool for playing multiple instances of the same sound file.
		 *
		 * Creates a pool of audio instances from a single audio file. This allows playing the same sound multiple times simultaneously without waiting for previous instances to finish. The pool uses round-robin selection to cycle through available instances.
		 *
		 * The audio file will be loaded asynchronously. Use $.ready() to wait for all audio to load.
		 * @param src Audio file URL (e.g., 'sound.mp3', 'audio/beep.wav').
		 * @param name A name that can be used to identify the audio for later use.
		 * @param poolSize Number of audio instances in the pool (default: 1).
		 */
		loadAudio( params: { "src": string; "name": string; "poolSize"?: number } ): void;
		loadAudio( src: string, name: string, poolSize?: number ): void;

		/**
		 * Loads a bitmap font from an image source.
		 *
		 * Loads a bitmap font from an image URL or Image/Canvas element. The font image should contain characters arranged in a grid. Each character cell is width+margin*2 by height+margin*2 pixels.
		 *
		 * If charset is not provided, defaults to characters 0-255. The charset can be an array of character codes or a string of characters.
		 *
		 * Returns a font ID that can be used with setFont. After calling loadFont, you should call $.ready() to wait for the image to load before using the font.
		 * @param src Font image source: URL string, Image element, or Canvas element.
		 * @param width Character width in pixels (glyph width, excluding margin).
		 * @param height Character height in pixels (glyph height, excluding margin).
		 * @param margin Margin around each character cell in pixels. Defaults to 0.
		 * @param charset Character set as array of character codes or string. Defaults to 0-255 (ASCII) if not provided.
		 */
		loadFont( params: { "src": string | HTMLImageElement | HTMLCanvasElement; "width": number; "height": number; "margin"?: number; "charset"?: Array<number> | string } ): void;
		loadFont( src: string | HTMLImageElement | HTMLCanvasElement, width: number, height: number, margin?: number, charset?: Array<number> | string ): void;

		/**
		 * Loads an image by URL or from an Image/Canvas element.
		 *
		 * Loads an image and stores it by name. Supports optional palette-linking to the screen palette. After calling load image you should call $.ready command to wait for image to load before calling drawImage.
		 * @param src Image source: URL string, HTMLImageElement, or HTMLCanvasElement.
		 * @param name Optional unique name for the image. Auto-generated if omitted.
		 * @param usePalette If true, link image colors to the active screen palette.
		 * @param paletteKeys Key colors used to map image colors to palette indices (required if usePalette).
		 * @param onLoad Callback invoked when the image finishes loading.
		 * @param onError Callback invoked if the image fails to load.
		 */
		loadImage( params: { "src": string | HTMLImageElement | HTMLCanvasElement; "name"?: string; "usePalette"?: boolean; "paletteKeys"?: Array<number>; "onLoad"?: ( name: string ) => void; "onError"?: ( error: Error ) => void } ): void;
		loadImage( src: string | HTMLImageElement | HTMLCanvasElement, name?: string, usePalette?: boolean, paletteKeys?: Array<number>, onLoad?: ( name: string ) => void, onError?: ( error: Error ) => void ): void;

		/**
		 * Loads a spritesheet by URL or from an Image/Canvas element.
		 *
		 * Loads a spritesheet and slices it either automatically (connected components) or by a fixed grid.
		 * @param src Spritesheet source: URL string, HTMLImageElement, or HTMLCanvasElement.
		 * @param name Optional unique name for the spritesheet. Auto-generated if omitted.
		 * @param width Sprite width for fixed grid mode.
		 * @param height Sprite height for fixed grid mode.
		 * @param margin Margin between sprites in fixed grid mode (default 0).
		 * @param usePalette If true, link image colors to the active screen palette.
		 * @param paletteKeys Key colors used to map image colors to palette indices (required if usePalette).
		 * @param onLoad Callback invoked when the spritesheet finishes loading.
		 * @param onError Callback invoked if the spritesheet fails to load.
		 */
		loadSpritesheet( params: { "src": string | HTMLImageElement | HTMLCanvasElement; "name"?: string; "width"?: number; "height"?: number; "margin"?: number; "usePalette"?: boolean; "paletteKeys"?: Array<number>; "onLoad"?: ( name: string ) => void; "onError"?: ( error: Error ) => void } ): void;
		loadSpritesheet( src: string | HTMLImageElement | HTMLCanvasElement, name?: string, width?: number, height?: number, margin?: number, usePalette?: boolean, paletteKeys?: Array<number>, onLoad?: ( name: string ) => void, onError?: ( error: Error ) => void ): void;

		/**
		 * Removes a key event handler.
		 *
		 * Removes a previously registered key event handler. All parameters must match the original onkey call exactly for the handler to be removed.
		 * @param key Key code/key value string or array of keys that matches the original handler.
		 * @param mode Event mode ("up" or "down") that matches the original handler.
		 * @param fn Callback function that matches the original handler.
		 * @param once Once flag that matches the original handler.
		 * @param allowRepeat AllowRepeat flag that matches the original handler.
		 */
		offkey( params: { "key": string | any[]; "mode"?: string; "fn": ( keyData: object ) => void; "once"?: boolean; "allowRepeat"?: boolean } ): void;
		offkey( key: string | any[], mode: string | undefined, fn: ( keyData: object ) => void, once?: boolean, allowRepeat?: boolean ): void;

		/**
		 * Registers a callback function for when a gamepad is connected.
		 *
		 * Registers a callback function that will be called whenever a gamepad is connected. The callback receives a gamepad data object with index, id, mapping, and other properties.
		 *
		 * Multiple callbacks can be registered. The callback will also be triggered for any gamepads that are already connected when the callback is registered.
		 * @param fn Callback function that receives (gamepad) when a gamepad connects.
		 */
		onGamepadConnected( params: { "fn": ( gamepadData: GamepadData ) => void } ): void;
		onGamepadConnected( fn: ( gamepadData: GamepadData ) => void ): void;

		/**
		 * Registers a callback function for when a gamepad is disconnected.
		 *
		 * Registers a callback function that will be called whenever a gamepad is disconnected. The callback receives a gamepad data object with index, id, mapping, and connected status.
		 *
		 * Multiple callbacks can be registered.
		 * @param fn Callback function that receives (gamepad) when a gamepad disconnects.
		 */
		onGamepadDisconnected( params: { "fn": ( gamepadData: GamepadData ) => void } ): void;
		onGamepadDisconnected( fn: ( gamepadData: GamepadData ) => void ): void;

		/**
		 * Registers a callback function for key events.
		 *
		 * Registers a callback function that will be called when a key event occurs. Supports single keys or key combinations. The callback receives key data object(s) depending on whether it's a single key or combination.
		 *
		 * For single keys, the callback receives one key data object. For combinations, it receives an array of key data objects for all keys in the combination.
		 *
		 * Use "any" as the key to listen for any key press. In this case, the callback receives the key data for the specific key that was pressed.
		 * @param key Key code/key value string, array of keys for combinations, or "any" for any key.
		 * @param mode Event mode: "up" for key release, "down" for key press.
		 * @param fn Callback function that receives key data object(s) when the event occurs.
		 * @param once If true, the handler is removed after being called once.
		 * @param allowRepeat If true, allows the handler to fire on key repeat (when key is held down).
		 */
		onkey( params: { "key": string | any[]; "mode": string; "fn": ( keyData: object ) => void; "once"?: boolean; "allowRepeat"?: boolean } ): void;
		onkey( key: string | any[], mode: string, fn: ( keyData: object ) => void, once?: boolean, allowRepeat?: boolean ): void;

		/**
		 * Plays music using BASIC-style notation (inspired by QBasic PLAY command).
		 *
		 * Plays music from a notation string. Supports notes, tempo, volume, waveforms, and simultaneous notes using commas.
		 *
		 * **Notes:**
		 * - A-G: Note letters (A, B, C, D, E, F, G)
		 * - Sharps: Use # or + after note (e.g., C#, F+)
		 * - Flats: Use - after note (e.g., B-, E-)
		 * - Dotted notes: . (1.5x length), .. (1.75x length)
		 * - Note length in note: Include number after note (e.g., C4 = quarter note C)
		 * - N[n]: Play note by MIDI number (0-127)
		 *
		 * **Octave:**
		 * - O[n]: Set octave (0-9)
		 * - <: Decrease octave by 1
		 * - >: Increase octave by 1
		 *
		 * **Note Length:**
		 * - L[n]: Set default note length (1-64, where 4=quarter note, 8=eighth note, etc.)
		 * - Note-specific length: Include number directly after note (e.g., C4, D8)
		 *
		 * **Tempo & Timing:**
		 * - T[n]: Set tempo in BPM (32-255)
		 *
		 * **Volume:**
		 * - V[n]: Set volume (0-100)
		 *
		 * **Pause:**
		 * - P[n]: Pause for specified note length (1-64)
		 *
		 * **Waveforms:**
		 * - WS or SINE: Sine wave
		 * - WQ or SQUARE: Square wave
		 * - WW or SAWTOOTH: Sawtooth wave
		 * - WT or TRIANGLE: Triangle wave
		 * - [[r],[i]]: Use custom wavetable
		 *
		 * **Style (Musical Articulation):**
		 * - MS: Staccato (75% of note length)
		 * - MN: Normal (87.5% of note length)
		 * - ML: Legato (100% of note length)
		 * - MW: Toggle full note mode
		 *
		 * **Modifiers (Envelope & Effects):**
		 * - MU[n] or MO[n]: Octave offset (can be negative: MU-n)
		 * - MY[n] or MA[n]: Attack rate (0-100)
		 * - MX[n] or MT[n]: Sustain rate (0-100)
		 * - MZ[n] or MD[n]: Decay rate (0-100)
		 *
		 * **Advanced Features:**
		 * - Simultaneous notes: Use comma to play the next note simultaneously with the previous note (e.g., "CDE, F" plays F at the same time as E)
		 * - Multiple tracks: Call `.play()` multiple times with different playstrings to play multiple independent tracks
		 * - Custom wavetables: Define using [realArray, imagArray]
		 * @param playString Music notation string with notes and commands.
		 */
		play( params: { "playString": string } ): void;
		play( playString: string ): void;

		/**
		 * Plays audio from an audio pool.
		 *
		 * Plays an audio instance from the specified audio pool. The pool uses round-robin selection, so multiple calls will cycle through available instances, allowing overlapping playback.
		 *
		 * Volume is multiplied by the global volume set with setVolume.
		 * @param audioId Audio pool ID returned from loadAudio.
		 * @param volume Volume (0-1, default: 1).
		 * @param startTime Start time in seconds (default: 0).
		 * @param duration Play duration in seconds (default: 0 = play full audio).
		 */
		playAudio( params: { "audioId": string; "volume"?: number; "startTime"?: number; "duration"?: number } ): void;
		playAudio( audioId: string, volume?: number, startTime?: number, duration?: number ): void;

		/**
		 * Waits for document readiness and all pending resources.
		 *
		 * Defers execution until the document is ready and all registered asynchronous resources have completed loading (e.g., images queued via internal loading). Supports both callback and promise styles.
		 *
		 * Usage styles:
		 * - Callback: $.ready( function() {} );
		 * - Promise: $.ready().then( function() {} );
		 * - Async/Await: await $.ready();
		 * @param callback Optional callback to run when ready completes.
		 */
		ready( params: { "callback"?: () => void } ): void;
		ready( callback?: () => void ): void;

		/**
		 * Registers a plugin to extend Pi.js with custom commands and features.
		 *
		 * Registers a plugin with a unique name and an init function. The init callback receives a pluginApi object that provides access to Pi.js internals for extending functionality.
		 *
		 * The pluginApi object provides the following methods and properties:
		 *
		 * - **addCommand**(name, fn, isScreen, parameterNames, isScreenOptional): Register a new command
		 * - **addScreenDataItem**(name, defaultValue): Add persistent data to each screen
		 * - **addScreenDataItemGetter**(name, getterFn): Add a dynamic data getter for screens
		 * - **addScreenInitFunction**(initFn): Register a function to run when screens are created
		 * - **addScreenCleanupFunction**(cleanupFn): Register a function to run when screens are destroyed
		 * - **getScreenData**(name): Get data for a specific screen by name
		 * - **getAllScreensData**(): Get array of all screen data objects
		 * - **getApi**(): Get the main Pi.js API object
		 * - **utils**: Access to utility functions
		 * - **wait**(): Increment resource wait counter (for async operations)
		 * - **done**(): Decrement resource wait counter
		 * - **registerClearEvents**(name, handler): Register a clearEvents handler for a specific event type
		 *
		 * Optional metadata (version, description) and a list of dependencies can be provided. Plugins with dependencies will wait until all dependencies are registered before initialization.
		 * @param name Unique plugin name.
		 * @param init Initialization function that receives pluginApi.
		 * @param version Optional plugin version.
		 * @param description Optional plugin description.
		 * @param dependencies Optional list of dependency plugin names.
		 */
		registerPlugin( params: { "name": string; "init": ( pluginApi: PluginAPI ) => void; "version"?: string; "description"?: string; "dependencies"?: Array<string> } ): void;
		registerPlugin( name: string, init: ( pluginApi: PluginAPI ) => void, version?: string, description?: string, dependencies?: Array<string> ): void;

		/**
		 * Removes keys from the action keys set.
		 *
		 * Removes keys from the action keys set. These keys will no longer have their default browser behavior prevented.
		 * @param keys Array of key codes or key values to remove from action keys.
		 */
		removeActionKeys( params: { "keys": Array<string> } ): void;
		removeActionKeys( keys: Array<string> ): void;

		/**
		 * Removes all screens from memory and the DOM.
		 */
		removeAllScreens(): void;

		/**
		 * Removes an audio pool and frees its resources.
		 *
		 * Removes an audio pool, stopping all playing instances and freeing memory. After deletion, the audio ID is no longer valid.
		 * @param audioId Audio ID returned from loadAudio.
		 */
		removeAudio( params: { "audioId": string } ): void;
		removeAudio( audioId: string ): void;

		/**
		 * Removes a previously loaded image by name.
		 *
		 * Deletes the stored image and frees associated GPU resources (textures) for all screens.
		 * @param name Image name to remove.
		 */
		removeImage( params: { "name": string } ): void;
		removeImage( name: string ): void;

		/**
		 * Removes a screen and cleans up all associated resources.
		 *
		 * Removes a screen from the page and cleans up all WebGL2 resources, event handlers, and DOM elements. After removal, the screen object becomes invalid and calling methods on it will throw errors.
		 *
		 * Can be called either as a global function with a screen ID/object, or as a method on a screen API object.
		 * @param screen Screen ID (number) or screen API object to remove.
		 */
		removeScreen( params: { "screen"?: number | Screen } ): void;
		removeScreen( screen?: number | Screen ): void;

		/**
		 * Creates a new screen (canvas) with specified dimensions and aspect ratio.
		 *
		 * Creates a new WebGL2 canvas screen and sets it as the active screen. The screen command must be called before any graphics commands can be used.
		 *
		 * Aspect ratio format: `(width)(x|e|m)(height)`
		 * - **x**: Exact pixel dimensions (e.g., "300x200")
		 * - **e**: Extend mode (e.g., "100e100") - extends canvas to fill container while maintaining aspect ratio
		 * - **m**: Multiple mode (e.g., "300m200") - scales to exact multiples of target resolution
		 *
		 * For offscreen screens, only exact pixel dimensions (x) are allowed.
		 * @param aspect Aspect ratio string in format (width)(x|e|m)(height), e.g., '300x200', '100e00', '300m200'.
		 * @param container DOM element or element ID string to use as container. Defaults to document.body.
		 * @param isOffscreen If true, creates an offscreen canvas that is not displayed. Requires exact pixel dimensions.
		 * @param resizeCallback Callback function called when screen is resized. Receives (screenApi, fromSize, toSize).
		 */
		screen( params: { "aspect": string; "container"?: string | HTMLElement; "isOffscreen"?: boolean; "resizeCallback"?: ( screenApi: Screen, fromSize: Size, toSize: Size ) => void } ): void;
		screen( aspect: string, container?: string | HTMLElement, isOffscreen?: boolean, resizeCallback?: ( screenApi: Screen, fromSize: Size, toSize: Size ) => void ): void;

		/**
		 * Sets keys that should prevent default browser behavior.
		 *
		 * Adds keys to the action keys set. Action keys will have their default browser behavior prevented (e.g., preventing page scrolling with arrow keys). This is useful for game controls where you don't want the browser to handle certain keys.
		 *
		 * Keys can be specified by code (e.g., "ArrowUp") or key value (e.g., "Arrow Up").
		 * @param keys Array of key codes or key values to add as action keys.
		 */
		setActionKeys( params: { "keys": Array<string> } ): void;
		setActionKeys( keys: Array<string> ): void;

		/**
		 * Sets the default foreground color used by new screens.
		 *
		 * Updates the default drawing color for newly created screens.
		 * @param color Palette index or color value (string, array, object, number).
		 */
		setDefaultColor( params: { "color": any } ): void;
		setDefaultColor( color: any ): void;

		/**
		 * Sets the default font for new screens.
		 *
		 * Sets the default font ID that will be used when new screens are created. The font must already be loaded using loadFont.
		 * @param fontId Font ID from loadFont to use as default for new screens.
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
		 */
		setDefaultPal( params: { "pal": Array<any> } ): void;
		setDefaultPal( pal: Array<any> ): void;

		/**
		 * Sets the dead zone sensitivity for gamepad analog sticks.
		 *
		 * Sets the sensitivity threshold for analog stick axes. Values below this threshold will be treated as zero to account for stick drift. The sensitivity value must be between 0 and 1.
		 *
		 * A value of 0 means no dead zone (all input is registered). A value of 1 means maximum dead zone (almost no input registered). Typical values are around 0.1-0.3.
		 * @param sensitivity Sensitivity threshold between 0 and 1 (0 = no dead zone, 1 = maximum dead zone).
		 */
		setGamepadSensitivity( params: { "sensitivity": number } ): void;
		setGamepadSensitivity( sensitivity: number ): void;

		/**
		 * Enables or disables browser pinch zoom gestures.
		 *
		 * Controls whether the browser's default pinch-to-zoom gesture is enabled. When disabled, pinch gestures are prevented from zooming the page, allowing them to be handled by touch event handlers instead.
		 *
		 * This is a global setting that affects the entire document body.
		 * @param isEnabled If true, enables pinch zoom. If false, disables it.
		 */
		setPinchZoom( params: { "isEnabled": boolean } ): void;
		setPinchZoom( isEnabled: boolean ): void;

		/**
		 * Sets the active screen for graphics commands.
		 *
		 * Changes the active screen to the specified screen. All subsequent graphics commands will operate on this screen until another screen is set as active.
		 * @param screen Screen ID (number) or screen API object to set as active.
		 */
		setScreen( params: { "screen": number | Screen } ): void;
		setScreen( screen: number | Screen ): void;

		/**
		 * Sets the global volume for all sounds and audio pools.
		 *
		 * Sets the master volume that affects all sounds and audio pools. Volume changes are applied gradually using exponential ramping to avoid clicks and pops.
		 *
		 * Volume is a multiplier: 0 = silent, 1 = full volume.
		 * @param volume Volume (0-1, default: 0.75).
		 */
		setVolume( params: { "volume": number } ): void;
		setVolume( volume: number ): void;

		/**
		 * Plays a sound by frequency using Web Audio API.
		 *
		 * Generates and plays a sound at a specific frequency using Web Audio API oscillators. Supports standard waveforms (triangle, sine, square, sawtooth) or custom wavetables.
		 *
		 * The sound uses an ADSR envelope (attack, sustain, decay) for natural sound shaping.
		 * @param frequency Frequency in Hz (default: 440).
		 * @param duration Duration in seconds (default: 1).
		 * @param volume Volume 0-1 (default: 1).
		 * @param oType Oscillator type: 'triangle', 'sine', 'square', 'sawtooth', or custom wavetable array [[realArray], [imagArray]] (default: 'triangle').
		 * @param delay Delay before playing in seconds (default: 0).
		 * @param attack Attack time in seconds (default: 0).
		 * @param decay Decay time in seconds (default: 0.1).
		 */
		sound( params: { "frequency"?: number; "duration"?: number; "volume"?: number; "oType"?: string | any[]; "delay"?: number; "attack"?: number; "decay"?: number } ): void;
		sound( frequency?: number, duration?: number, volume?: number, oType?: string | any[], delay?: number, attack?: number, decay?: number ): void;

		/**
		 * Starts the gamepad input loop and begins monitoring for gamepad connections.
		 *
		 * Starts the gamepad input monitoring system. This initializes event listeners for gamepad connections/disconnections and begins polling gamepad state. The gamepad loop runs automatically once started and will continue until stopGamepad is called.
		 *
		 * If gamepads are already connected when this is called, they will be automatically detected and added to the gamepad list.
		 */
		startGamepad(): void;

		/**
		 * Starts keyboard input monitoring.
		 *
		 * Starts the keyboard input monitoring system. This initializes event listeners for keydown and keyup events.
		 *
		 * Note: the keyboard automatically starts when key commands are called, but this command can be used to restart it after calling stopKeyboard.
		 */
		startKeyboard(): void;

		/**
		 * Stops audio from an audio pool or all audio pools.
		 *
		 * Stops all playing instances in the specified audio pool, or stops all audio pools if audioId is null.
		 * @param audioId Audio pool ID. If null, stops all audio pools.
		 */
		stopAudio( params: { "audioId"?: string } ): void;
		stopAudio( audioId?: string ): void;

		/**
		 * Stops the gamepad input loop.
		 *
		 * Stops the gamepad input monitoring loop. This will cancel the animation frame loop that polls gamepad state. Gamepad connection/disconnection events will still be tracked, but button and axis updates will stop until startGamepad is called again.
		 */
		stopGamepad(): void;

		/**
		 * Stops keyboard input monitoring.
		 *
		 * Stops the keyboard input monitoring system. This removes event listeners and clears all key states. Keyboard events will no longer be tracked until startKeyboard is called again.
		 */
		stopKeyboard(): void;

		/**
		 * Stops playing music tracks.
		 *
		 * Stops a specific music track by track ID, or stops all tracks if trackId is null.
		 * @param trackId Track ID to stop. If null, stops all tracks.
		 */
		stopPlay( params: { "trackId"?: number } ): void;
		stopPlay( trackId?: number ): void;

		/**
		 * Stops a playing sound or all sounds.
		 *
		 * Stops a specific sound by sound ID, or stops all sounds if soundId is null.
		 * @param soundId Sound ID returned from sound(). If null, stops all sounds.
		 */
		stopSound( params: { "soundId"?: string } ): void;
		stopSound( soundId?: string ): void;

		/**
		 * Current Pi.js version string.
		 */
		readonly version: "pi-2.0";
	}
}

// Global variable declarations for IIFE-based Pi.js library
// These are exposed as window.Pi and window.$ in the browser runtime
// Using 'var' instead of 'const' because these are global variables, not constants
declare var Pi: Pi.API;
declare var $: Pi.API;

// Global augmentation block ensures these are available in non-module JavaScript contexts
// This is needed because the file has exports (making it a module), but we want
// the globals to be available in plain JavaScript files (IIFE-based code)
declare global {
	var Pi: Pi.API;
	var $: Pi.API;
}

// Module exports for TypeScript/ES6 module users (optional)
export { Pi, $ };
export default Pi;
