/**
 * Pi.js Type Definitions
 * Version: pi-1.2
 * Author: Andy Stubbs
 * License: Apache-2.0
 * Generated on 2025-12-11T21:10:21.815Z
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
		 * Disables the default behavior for a key.
		 */
		actionKey?: any;

		/**
		 * Enable automatic rendering after drawing in pixel mode
		 */
		autoRender?: boolean;

		/**
		 * Sets the canvas background color.
		 */
		bgColor?: any;

		/**
		 * Sets the alpha blend mode when drawing.
		 */
		blendMode?: any;

		/**
		 * Overwrites a character in the current font set.
		 */
		char?: { "code": number; "data": any[] | string };

		/**
		 * Sets the foreground color.
		 */
		color?: any;

		/**
		 * Set multiple colors for multi-color fonts
		 */
		colors?: any;

		/**
		 * Sets the background color of the screen's container element.
		 */
		containerBgColor?: any;

		/**
		 * Sets the default font for new screens.
		 */
		defaultFont?: number;

		/**
		 * Sets the default input focus for keyboard. By default this will be set to the window.  Normally you don't really need to change this but if you have multiple elements on your screen that will compete for keyboard focus then this will come in handy.
		 */
		defaultInputFocus?: any;

		/**
		 * Sets the default color palette for new screens.
		 */
		defaultPal?: any;

		/**
		 * Disables context menu on right click.
		 */
		enableContextMenu?: any;

		/**
		 * Sets how Pi.js handles errors by setting an error mode between throw, log, and none.
		 */
		errorMode?: any;

		/**
		 * Sets the font for the current screen.
		 */
		font?: number;

		/**
		 * Sets the font-size for bitmap fonts. Can only be used in bitmap fonts.
		 */
		fontSize?: { "width": any; "height": any };

		/**
		 * Sets the cursor for the input command.
		 */
		inputCursor?: any;

		/**
		 * Sets a color value in the current screen's palette.
		 */
		palColor?: { "index": any; "color": any };

		/**
		 * Sets the pen to use for drawing operations.
		 */
		pen?: { "pen": any; "size": any; "noise"?: any };

		/**
		 * Enables or disables pinch zoom.
		 */
		pinchZoom?: any;

		/**
		 * Toggles between pixel mode and anti-aliased drawing modes.
		 */
		pixelMode?: any;

		/**
		 * Sets the print cursor position using column and row coordinates.
		 */
		pos?: { "col"?: number; "row"?: number };

		/**
		 * Sets the print cursor position using pixel coordinates.
		 */
		posPx?: { "x"?: number; "y"?: number };

		/**
		 * Sets the active screen for graphics commands.
		 */
		screen?: number | Screen;

		/**
		 * Sets the master volume for all sound commands.
		 */
		volume?: any;

		/**
		 * Enables or disables word breaking for text wrapping.
		 */
		wordBreak?: boolean;
	}

	/**
	 * Color object representing RGBA color values.
	 *
	 * Color object returned by getPixel() and other color-related functions. Contains RGBA color components and string representations.
	 */
	interface PiColor {
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
		 * RGBA string representation of the color.
		 */
		s: string;

		/**
		 * Hex string representation of the color.
		 */
		s2: string;
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
		 * This function renders a cubic Bezier curve to the active canvas.  A Bezier curve is defined by four control points: two endpoints and two control points that influence the curve's shape.
		 * @param xStart The x coordinate of the first control point (starting point).
		 * @param yStart The y coordinate of the first control point (starting point).
		 * @param x1 The x coordinate of the second control point.
		 * @param y1 The y coordinate of the second control point.
		 * @param x2 The x coordinate of the third control point.
		 * @param y2 The y coordinate of the third control point.
		 * @param xEnd The x coordinate of the fourth control point (ending point).
		 * @param yEnd The y coordinate of the fourth control point (ending point).
		 */
		bezier( params: { "xStart": number; "yStart": number; "x1": number; "y1": number; "x2": number; "y2": number; "xEnd": number; "yEnd": number } ): void;
		bezier( xStart: number, yStart: number, x1: number, y1: number, x2: number, y2: number, xEnd: number, yEnd: number ): void;

		/**
		 * Cancels all previous input commands.
		 */
		cancelInput(): void;

		/**
		 * Returns the HTMLCanvasElement for the current screen.
		 *
		 * Gets the underlying HTMLCanvasElement DOM element for the active screen. This can be used for direct canvas manipulation or integration with other libraries.
		 *
		 * Note: This is intended for applying CSS styles to the canvas or moving the canvas in the DOM. You can call getContext( "2d" ) on the returned canvas element but this may conflict with internal graphics command so it could produce some strange artifacts when drawing to the context.
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
		 * Clears the screen or a rectangular region.
		 *
		 * This function clears the entire screen or a rectangular region of the active canvas and resets the print cursor to position (0, 0).  When x, y, width, and height are provided, only that region is cleared. Otherwise the full screen is cleared.
		 * @param x The horizontal coordinate of the region to clear.
		 * @param y The vertical coordinate of the region to clear.
		 * @param width The width of the region to clear.
		 * @param height The height of the region to clear.
		 */
		cls( params: { "x"?: number; "y"?: number; "width"?: number; "height"?: number } ): void;
		cls( x?: number, y?: number, width?: number, height?: number ): void;

		/**
		 * Draws lines on the screen defined by a string.
		 *
		 * Draws lines on the screen defined by a case-insensitive draw string made of commands.
		 *
		 * Supported commands:
		 *
		 * - **"B"**: Before a line move, hides the line move (blind move).
		 * - **"Cn"**: Set the color attribute to palette index n.
		 * - **"Mn, n"**: Move to coordinate (x, y) without drawing.
		 * - **"N"**: Return to the starting position after the line is drawn.
		 * - **"Pn"**: Paint enclosed objects using color index n.
		 * - **"Sn, n"**: Paint enclosed objects using color and tolerance.
		 * - **"Dn"**: Draw a vertical line DOWN n pixels.
		 * - **"En"**: Draw a diagonal line UP and RIGHT n pixels each direction (slash /).
		 * - **"Fn"**: Draw a diagonal line DOWN and RIGHT n pixels each direction.
		 * - **"Gn"**: Draw a diagonal line DOWN and LEFT n pixels each direction (slash /).
		 * - **"Hn"**: Draw a diagonal line UP and LEFT n pixels each direction.
		 * - **"Ln"**: Draw a horizontal line LEFT n pixels.
		 * - **"Rn"**: Draw a horizontal line RIGHT n pixels.
		 * - **"Un"**: Draw a vertical line UP n pixels.
		 * - **"An, n, n"**: Draw an arc using cursor as center point (radius, start degree, end degree).
		 * - **"TAn**": Turn Angle; rotate by any angle n from -360 to 360 degrees.
		 * @param drawString Case insensitive string that contains commands for drawing.
		 */
		draw( params: { "drawString": string } ): void;
		draw( drawString: string ): void;

		/**
		 * Draws an image on to the screen.  Note: this method will fail if it gets called before the image is loaded.
		 * @param name Name or id of the image.
		 * @param x Horizontal coordinate.
		 * @param y Vertical coordinate.
		 * @param angle Rotate the image in degrees.
		 * @param anchorX Horizontal rotation point (0-1) coordinate.
		 * @param anchorY Vertical rotation coordinate.
		 * @param alpha Transparency amount number 0-255.
		 * @param scaleX Horizontal scaling amount.
		 * @param scaleY Vertical scaling amount.
		 */
		drawImage( params: { "name": any; "x": number; "y": number; "angle"?: number; "anchorX"?: number; "anchorY"?: number; "alpha"?: number; "scaleX"?: number; "scaleY"?: number } ): void;
		drawImage( name: any, x: number, y: number, angle?: number, anchorX?: number, anchorY?: number, alpha?: number, scaleX?: number, scaleY?: number ): void;

		/**
		 * Draws a sprite from a spritesheet on to the screen. Note: this method will fail if it gets called before the sprite image is loaded.
		 * @param name Name or id of the spritesheet.
		 * @param frame Frame number of the specific sprite on the spritesheet.
		 * @param x Horizontal coordiante.
		 * @param y Vertical coordinate.
		 * @param angle Rotate the image in degrees.
		 * @param anchorX Horizontal rotation coordinate.
		 * @param anchorY Vertical rotation coordinate.
		 * @param alpha Transparency amount number 0-255.
		 * @param scaleX Horizontal scaling amount.
		 * @param scaleY Vertical scaling amount.
		 */
		drawSprite( params: { "name": string; "frame": number; "x": number; "y": number; "angle"?: number; "anchorX"?: number; "anchorY"?: number; "alpha"?: number; "scaleX"?: number; "scaleY"?: number } ): void;
		drawSprite( name: string, frame: number, x: number, y: number, angle?: number, anchorX?: number, anchorY?: number, alpha?: number, scaleX?: number, scaleY?: number ): void;

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
		 * Filters a screens colors.
		 * @param filter Callback (color, x, y) to be called on each pixel.
		 */
		filterImg( params: { "filter": ( color: PiColor, x: number, y: number ) => PiColor } ): void;
		filterImg( filter: ( color: PiColor, x: number, y: number ) => PiColor ): void;

		/**
		 * Given a color value, find the index from the color palette.
		 * @param color Palette index or color value (string, array, object, number).
		 * @param tolerance The percentage of how close the color has to be to match. Returns the fist match.
		 * @param isAddToPalette Add the color to the palette if its not found.
		 */
		findColor( params: { "color": any; "tolerance"?: number; "isAddToPalette"?: boolean } ): void;
		findColor( color: any, tolerance?: number, isAddToPalette?: boolean ): void;

		/**
		 * Gets an area of pixels from the screen and returns an array of color indices.
		 * It's counterpart, the put method, copies the contents of the array back onto
		 * the screen.
		 * @param x1 First horizontal coordiante.
		 * @param y1 First vertical coordinate.
		 * @param x2 Second horizontal coordiante.
		 * @param y2 Second vertical coordinate.
		 * @param tolerance If the color is not in the color palette then attempt to find the closest fit color.
		 */
		get( params: { "x1": number; "y1": number; "x2": number; "y2": number; "tolerance"?: number } ): void;
		get( x1: number, y1: number, x2: number, y2: number, tolerance?: number ): void;

		/**
		 * Returns the number of character columns that fit on the screen.
		 *
		 * Gets the maximum number of character columns that can fit horizontally on the screen based on the current font size and print scale.
		 */
		getCols(): void;

		/**
		 * Gets an image from an area on the current screen.
		 *
		 * Gets an area of pixels from the screen and draws it to an in-memory image that can be used with the drawImage function.
		 *
		 * Note: This function has been renamed in version 2.0 to createImageFromScreen. The 2.0 getImage function returns an imageObject that has been loaded with loadImage.
		 * @param name The name of the image for reference.
		 * @param x1 First horizontal coordiante.
		 * @param y1 First vertical coordinate.
		 * @param x2 Second horizontal coordiante.
		 * @param y2 Second vertical coordinate.
		 */
		getImage( params: { "name"?: string; "x1": number; "y1": number; "x2": number; "y2": number } ): void;
		getImage( name: string | undefined, x1: number, y1: number, x2: number, y2: number ): void;

		/**
		 * Returns the current color palette as an array.
		 *
		 * Gets the current color palette from the screen and returns an array with all the color data.
		 */
		getPal(): void;

		/**
		 * Gets the pixel color from the screen and returns the color data.
		 * @param x The horizontal coordinate for the pixel
		 * @param y The vertical coordinate for the pixel
		 */
		getPixel( params: { "x": number; "y": number } ): void;
		getPixel( x: number, y: number ): void;

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
		 * Gets the most recent mouse status.
		 */
		inmouse(): void;

		/**
		 * Gets the most recent mouse or touch status.
		 */
		inpress(): void;

		/**
		 * Displays a text prompt on screen and waits for user input.
		 *
		 * Prompts the user to enter text input through the keyboard. The function displays a prompt message on screen with a blinking cursor, allowing the user to type their response. Input collection ends when the user presses the Enter key.
		 *
		 * The function returns a Promise that resolves with the user's input as a string. You can use async/await syntax to wait for the input, or you can provide an optional callback function that will be called when Enter is pressed.
		 *
		 * For numeric input, you can enable validation by setting isNumber to true. When isNumber is enabled, only numeric characters (digits, decimal point, and optionally a minus sign) are accepted. If isInteger is also true, decimal points are rejected. The allowNegative parameter controls whether negative numbers are allowed (defaults to true).
		 *
		 * On touch-enabled devices, you can add an onscreen keyboard with the onscreenKeyboard parameter:
		 * - "auto": Automatically shows the onscreen keyboard if a touch screen is detected
		 * - "always": Always shows the onscreen keyboard regardless of device type
		 * - "none": Never shows the onscreen keyboard (default)
		 *
		 * The input prompt is displayed at the current text cursor position and updates in real-time as the user types. The cursor blinks to indicate the input field is active.
		 * @param prompt The text prompt that will be displayed to the user. Defaults to an empty string if not provided.
		 * @param callback An optional callback function that will be called when the user presses Enter. The callback receives the input value as its argument.
		 * @param isNumber If true, restricts input to numeric characters only (digits, decimal point, and optionally minus sign). Non-numeric characters are rejected as they are typed.
		 * @param isInteger If true, restricts input to integer values only. Decimal points are rejected. This parameter automatically enables isNumber behavior.
		 * @param allowNegative Controls whether negative numbers are allowed. Defaults to true. Only applies when isNumber is true.
		 * @param onscreenKeyboard Controls the onscreen keyboard display for touch devices. Valid values: "auto" (show if touch screen detected), "always" (always show), "none" (never show, default).
		 */
		input( params: { "prompt"?: string; "callback"?: ( message: string ) => void; "isNumber"?: boolean; "isInteger"?: boolean; "allowNegative"?: boolean; "onscreenKeyboard"?: string } ): void;
		input( prompt?: string, callback?: ( message: string ) => void, isNumber?: boolean, isInteger?: boolean, allowNegative?: boolean, onscreenKeyboard?: string ): void;

		/**
		 * Gets the most recent touch status.
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
		 * Removes a hitbox from the screen created by the onclick command.
		 *
		 * Removes a click event handler that was previously registered with the onclick command. The function reference and signature must exactly match the one passed to the onclick command.
		 *
		 * The callback receives (clickData, customData) where clickData contains x, y, buttons, action, type, lastX, and lastY properties.
		 * @param fn Callback function used when registering with onclick.
		 */
		offclick( params: { "fn": ( clickData: ClickData, customData?: object ) => void } ): void;
		offclick( fn: ( clickData: ClickData, customData?: object ) => void ): void;

		/**
		 * Removes a mouse event handler registered with the onmouse command.
		 *
		 * Removes a mouse event handler that was previously registered with the onmouse command. The function reference and mode must exactly match the ones used when registering the handler with onmouse.
		 *
		 * The callback receives (mouseData, customData) where mouseData contains x, y, buttons, action, type, lastX, and lastY properties.
		 * @param mode Event mode: 'down', 'up', or 'move'.
		 * @param fn Callback function used when registering with onmouse.
		 */
		offmouse( params: { "mode": string; "fn": ( mouseData: MouseData, customData?: object ) => void } ): void;
		offmouse( mode: string, fn: ( mouseData: MouseData, customData?: object ) => void ): void;

		/**
		 * Removes a press event handler registered with the onpress command.
		 *
		 * Removes a press event handler that was previously registered with the onpress command. The function reference and mode must exactly match the ones used when registering the handler with onpress.
		 *
		 * The callback receives (pressData, customData) where pressData contains x, y, buttons, action, type, lastX, and lastY properties.
		 * @param mode Event mode: 'down', 'up', or 'move'.
		 * @param fn Callback function used when registering with onpress.
		 */
		offpress( params: { "mode": string; "fn": ( pressData: PressData, customData?: object ) => void } ): void;
		offpress( mode: string, fn: ( pressData: PressData, customData?: object ) => void ): void;

		/**
		 * Removes a touch event handler registered with the ontouch command.
		 *
		 * Removes a touch event handler that was previously registered with the ontouch command. The function reference and mode must exactly match the ones used when registering the handler with ontouch.
		 *
		 * The callback receives (touchDataArray, customData) where touchDataArray is an array of touch data objects containing x, y, id, lastX, lastY, action, and type properties.
		 * @param mode Event mode: 'start', 'end', or 'move'.
		 * @param fn Callback function used when registering with ontouch.
		 */
		offtouch( params: { "mode": string; "fn": ( touchDataArray: Array<TouchData>, customData?: object ) => void } ): void;
		offtouch( mode: string, fn: ( touchDataArray: Array<TouchData>, customData?: object ) => void ): void;

		/**
		 * Registers a callback function for click events (mouse or touch) within an optional hit box area.
		 *
		 * Creates a clickable area on the screen that triggers a callback function when clicked. A click event is triggered when the user presses down (mouse down or touch start) and releases (mouse up or touch end) within the same hit box area. The mouse cursor or touch point must be within the hit box area for both the down and up events to register as a click.
		 *
		 * If no hitBox is provided, the entire screen is used as the hit box area. The callback function receives (clickData, customData) where clickData contains x, y, buttons, action, type, lastX, and lastY properties. The customData parameter is optional and contains any custom data passed when registering the handler.
		 * @param fn Callback function called when the area is clicked.
		 * @param once If true, removes the handler after being called once.
		 * @param hitBox Optional hit box object with x, y, width, height properties.
		 * @param customData Optional custom data passed to the callback function.
		 */
		onclick( params: { "fn": ( clickData: ClickData, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onclick( fn: ( clickData: ClickData, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Registers a callback function for mouse events (down, up, or move) with optional hit box filtering.
		 *
		 * Registers a callback function that will be called when a mouse event occurs. The callback receives mouse data including position coordinates, button state, and action type, along with any optional custom data passed when registering the handler.
		 *
		 * Supports three event modes:
		 * - "down": Triggered when a mouse button is pressed down
		 * - "up": Triggered when a mouse button is released
		 * - "move": Triggered when the mouse cursor moves
		 *
		 * If a hitBox is provided, the callback only fires when the mouse is within that rectangular area. Otherwise, events fire regardless of mouse position.
		 *
		 * The callback function receives (mouseData, customData) where mouseData contains x, y, buttons, action, type, lastX, and lastY properties. The customData parameter is optional.
		 * @param mode Event mode: 'down', 'up', or 'move'.
		 * @param fn Callback function called when the mouse event occurs.
		 * @param once If true, removes the handler after being called once.
		 * @param hitBox Optional hit box object with x, y, width, height properties.
		 * @param customData Optional custom data passed to the callback function.
		 */
		onmouse( params: { "mode": string; "fn": ( mouseData: MouseData, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onmouse( mode: string, fn: ( mouseData: MouseData, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Registers a callback function for press events (mouse or touch) with optional hit box filtering.
		 *
		 * Registers a callback function that will be called when a press event occurs. Press events unify mouse and touch input, allowing the same handler to work with both input types. The callback receives press data including position coordinates, button state, and action type, along with any optional custom data passed when registering the handler.
		 *
		 * Supports three event modes:
		 * - "down": Triggered when a mouse button is pressed down or touch starts
		 * - "up": Triggered when a mouse button is released or touch ends
		 * - "move": Triggered when the mouse cursor moves or touch moves
		 *
		 * If a hitBox is provided, the callback only fires when the press is within that rectangular area. Otherwise, events fire regardless of position.
		 *
		 * The callback function receives (pressData, customData) where pressData contains x, y, buttons, action, type, lastX, and lastY properties. The type will be either "mouse" or "touch" depending on the input source. The customData parameter is optional.
		 * @param mode Event mode: 'down', 'up', or 'move'.
		 * @param fn Callback function called when the press event occurs.
		 * @param once If true, removes the handler after being called once.
		 * @param hitBox Optional hit box object with x, y, width, height properties.
		 * @param customData Optional custom data passed to the callback function.
		 */
		onpress( params: { "mode": string; "fn": ( pressData: PressData, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		onpress( mode: string, fn: ( pressData: PressData, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Registers a callback function for touch events (start, end, or move) with optional hit box filtering.
		 *
		 * Registers a callback function that will be called when a touch event occurs. The callback receives an array of touch data objects, one for each active touch point, along with any optional custom data passed when registering the handler.
		 *
		 * Supports three event modes:
		 * - "start": Triggered when a touch point starts (finger touches screen)
		 * - "end": Triggered when a touch point ends (finger leaves screen)
		 * - "move": Triggered when a touch point moves
		 *
		 * If a hitBox is provided, the callback only fires when touches are within that rectangular area. Otherwise, events fire regardless of touch position.
		 *
		 * The callback function receives (touchDataArray, customData) where touchDataArray is an array of touch data objects, one for each active touch point. Each touch data object contains x, y, id (touch identifier), lastX, lastY, action, and type properties. The customData parameter is optional.
		 * @param mode Event mode: 'start', 'end', or 'move'.
		 * @param fn Callback function called when the touch event occurs.
		 * @param once If true, removes the handler after being called once.
		 * @param hitBox Optional hit box object with x, y, width, height properties.
		 * @param customData Optional custom data passed to the callback function.
		 */
		ontouch( params: { "mode": string; "fn": ( touchDataArray: Array<TouchData>, customData?: object ) => void; "once"?: boolean; "hitBox"?: HitBox; "customData"?: any } ): void;
		ontouch( mode: string, fn: ( touchDataArray: Array<TouchData>, customData?: object ) => void, once?: boolean, hitBox?: HitBox, customData?: any ): void;

		/**
		 * Fills in areas of the screen that are the same color.
		 * @param x The horizontal coordinate from where to start the paint algorithm.
		 * @param y The vertical coordinate from where to start the paint algorithm.
		 * @param fillColor The fill color for floodfill operation. Can be a palette index or color value (string, array, object, number).
		 * @param tolerance A number between 0 and 1 that allows you to set how sensitive the algorithm is to color differences.
		 */
		paint( params: { "x": number; "y": number; "fillColor": any; "tolerance"?: number } ): void;
		paint( x: number, y: number, fillColor: any, tolerance?: number ): void;

		/**
		 * Prints text onto the screen and moves the text cursor to the next line. Will automatically
		 * vertically scroll the text and screen image up when text cursor reaches the bottom of the screen.
		 * @param msg The text message to print on the screen.
		 * @param inLine Does not move the text cursor to the next line.
		 * @param isCentered Centers the text horizontally on the screen.
		 */
		print( params: { "msg"?: string; "inLine"?: boolean; "isCentered"?: boolean } ): void;
		print( msg?: string, inLine?: boolean, isCentered?: boolean ): void;

		/**
		 * Prints a table on the screen.
		 * @param items An array of strings that get put into the table from top-left to bottom-right order.
		 * @param tableFormat An array of strings that creates the table shape.
		<ul style='margin:0'>
			<li><span class='gray'>"*"</span> Indicates a table corner.</li>
			<li><span class='gray'>"-"</span> Indicates a table horiztontal line.</li>
			<li><span class='gray'>"|"</span> Indicates a table vertical line.</li>
			<li><span class='gray'>"V"</span> Inside a cell for vertical orientation of the cell.</li>
		</ul>
		 * @param borderStyle The style of borders. Must be one of the following strings single, double, singleDouble, doubleSingle, or thick.
		 * @param isCentered Horizontally centers the table.
		 */
		printTable( params: { "items": any; "tableFormat"?: any; "borderStyle"?: any; "isCentered"?: any } ): void;
		printTable( items: any, tableFormat?: any, borderStyle?: any, isCentered?: any ): void;

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
		 * Writes a 2-dimensional array of color values onto the screen. It's counterpart the get statement
		 * will create an array of color values that you can use with the put statement. Or you can create
		 * your own array to use.
		 * @param data The 2d array of color values.
		 * @param x The horizontal coordinate of the starting position to write the pixels.
		 * @param y The vertical coordinate of the starting position to write the pixels.
		 * @param includeZero If set to true then it will copy 0 (transparent) pixels.
		 */
		put( params: { "data": Array<Array<number | any>>; "x": any; "y": any; "includeZero": any } ): void;
		put( data: Array<Array<number | any>>, x: any, y: any, includeZero: any ): void;

		/**
		 * Draws a rectangle on the screen.
		 *
		 * This function renders a rectangle to the active canvas.  The rectangle is drawn with a border using the current foreground color. If a fill color is provided, the rectangle will be filled with that color.
		 * @param x The x coordinate of the upper left corner of the rectangle.
		 * @param y The y coordinate of the upper left corner of the rectangle.
		 * @param width The width of the rectangle.
		 * @param height The height of the rectangle.
		 * @param fillColor The fill color for the rectangle. Can be a palette index or color value (string, array, object, number).
		 */
		rect( params: { "x": number; "y": number; "width": number; "height": number; "fillColor"?: any } ): void;
		rect( x: number, y: number, width: number, height: number, fillColor?: any ): void;

		/**
		 * Removes the active screen from memory and the DOM.
		 */
		removeScreen(): void;

		/**
		 * Renders buffered graphics to the screen.
		 *
		 * Render is called automatically when all drawing has been completed at the of execution so it is generally not needed to call it. However, there are some cases you may need to call the render function. Such as if you are drawing to an offscreen canvas and then want to draw that canvas onto another canvas.
		 */
		render(): void;

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
		 * Enable automatic rendering after drawing in pixel mode
		 *
		 * Auto render will automatically render any graphics drawn using pixel mode after any drawing routine is called using a microtask that executes after the current execution thread. Auto render is set by default. Use setAutoRender to enable and disable the auto rendering.
		 * @param isAutoRender If set to true then autorender will run
		 */
		setAutoRender( params: { "isAutoRender": boolean } ): void;
		setAutoRender( isAutoRender: boolean ): void;

		/**
		 * Sets the canvas background color.
		 *
		 * Sets the background color of the canvas element. Transparent pixels will show this background color.
		 * @param color Palette index or color value (string, array, object, number).
		 */
		setBgColor( params: { "color": any } ): void;
		setBgColor( color: any ): void;

		/**
		 * Sets the alpha blend mode when drawing.
		 *
		 * Normal will set the pixel to the exact color. Blended will mix the colors if the alpha channel of the current color is not 100%.
		 * @param mode The mode of blend choices are normal or blend.
		 */
		setBlendMode( params: { "mode": any } ): void;
		setBlendMode( mode: any ): void;

		/**
		 * Overwrites a character in the current font set.
		 * @param code The ascii character code you want to replace.
		 * @param data Either a 2d array containing numbers or a hex string that when converted to binary represents the character data.
		 */
		setChar( params: { "code": number; "data": any[] | string } ): void;
		setChar( code: number, data: any[] | string ): void;

		/**
		 * Sets the foreground color.
		 * @param color Palette index or color value (string, array, object, number).
		 * @param isAddToPalette If set to true and the color is not part of the current color palette then it will add it to the color palette.
		 */
		setColor( params: { "color": any; "isAddToPalette"?: boolean } ): void;
		setColor( color: any, isAddToPalette?: boolean ): void;

		/**
		 * Set multiple colors for multi-color fonts
		 *
		 * Sets an array of color values for use with multi-color fonts using the print statement. The first  color in the array will be used in all drawing commands while the rest are only used in multi-color fonts.
		 * @param colors An array of color values to be set.
		 */
		setColors( params: { "colors": any } ): void;
		setColors( colors: any ): void;

		/**
		 * Sets the background color of the screen's container element.
		 *
		 * Sets the CSS background color of the container element that holds the canvas.
		 * @param color Palette index or color value (string, array, object, number).
		 */
		setContainerBgColor( params: { "color": any } ): void;
		setContainerBgColor( color: any ): void;

		/**
		 * Disables context menu on right click.
		 * @param isEnabled If set to true context menu will be enabled.
		 */
		setEnableContextMenu( params: { "isEnabled": any } ): void;
		setEnableContextMenu( isEnabled: any ): void;

		/**
		 * Sets the font for the current screen.
		 *
		 * Sets the active font for text rendering on the current screen. The font must already be loaded using loadFont. Several default fonts are preloaded: 0=6x6, 1=6x8 (default), 2=8x8, 3=8x14, 4=8x16.
		 * @param fontId The id of the font to set. The default fonts loaded are.
		 */
		setFont( params: { "fontId": number } ): void;
		setFont( fontId: number ): void;

		/**
		 * Sets the font-size for bitmap fonts. Can only be used in bitmap fonts.
		 * @param width The width of the font.
		 * @param height The height of the font.
		 */
		setFontSize( params: { "width": any; "height": any } ): void;
		setFontSize( width: any, height: any ): void;

		/**
		 * Sets the cursor for the input command.
		 * @param cursor A string character or an ascii value from the current font set.
		 */
		setInputCursor( params: { "cursor": any } ): void;
		setInputCursor( cursor: any ): void;

		/**
		 * Sets a color value in the current screen's palette.
		 * @param index The index value of the color to change.
		 * @param color Palette index or color value (string, array, object, number).
		 */
		setPalColor( params: { "index": any; "color": any } ): void;
		setPalColor( index: any, color: any ): void;

		/**
		 * Sets the pen to use for drawing operations.
		 * @param pen A string that is either circle, square, or pixel for the shape of the pen.
		 * @param size A number for the size of the pen.
		 * @param noise Noise is either a number between 0 and 128 or an array of 4 values between 0 and 128 that represents the range of color values for red/green/blue/alpha. Noise does not work for anti-alias drawing mode.
		 */
		setPen( params: { "pen": any; "size": any; "noise"?: any } ): void;
		setPen( pen: any, size: any, noise?: any ): void;

		/**
		 * Toggles between pixel mode and anti-aliased drawing modes.
		 * @param isEnabled If set to true use the pixel mode otherwise use anit-aliased mode.
		 */
		setPixelMode( params: { "isEnabled": any } ): void;
		setPixelMode( isEnabled: any ): void;

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
		 * Stops tracking mouse input.
		 */
		stopMouse(): void;

		/**
		 * Stops the touch event listeners for the screen.
		 */
		stopTouch(): void;

		/**
		 * Swaps a color in the screens palette with a new color and updates the screen colors.
		 * @param oldColor The color that needs to be swapped out.
		 * @param newColor The new color.
		 */
		swapColor( params: { "oldColor": any; "newColor": any } ): void;
		swapColor( oldColor: any, newColor: any ): void;

		/**
		 * Returns the width of the current screen in pixels.
		 *
		 * Gets the internal width of the active screen's canvas. This is the logical width used for drawing operations, which may differ from the CSS display size.
		 */
		width(): void;
	}

	interface API extends Screen {
		/**
		 * Clears event handlers for mouse and touch events on the screen.
		 */
		clearEvents(): void;

		/**
		 * Clears event handlers for keyboard events.
		 */
		clearKeys(): void;

		/**
		 * Creates a group of audio players that can play sounds. Audio pools are useful if you want to
		 * 	play a sound multiple times without reloading it each time. The number of audio players you
		 * 	specify determines how many sounds you can play simultanously. If you only want to play one
		 * 	sound at a time set 1 for the poolSize.
		 * @param src The source of the audio file.
		 * @param poolSize The number of audio players.
		 */
		createAudioPool( params: { "src": string; "poolSize"?: number } ): void;
		createAudioPool( src: string, poolSize?: number ): void;

		/**
		 * Deletes an audio pool.
		 * @param audioId The id of the audio pool.
		 */
		deleteAudioPool( params: { "audioId": string } ): void;
		deleteAudioPool( audioId: string ): void;

		/**
		 * Gets default palette and returns an array with all the color data. The default color palette defines what colors are
		 * available when a new screen is created.
		 */
		getDefaultPal(): void;

		/**
		 * Gets a screen API object by screen ID.
		 *
		 * Retrieves the screen API object for a specific screen ID. This allows you to call all the graphics operations for a specific screen. This means you do not have to call setScreen to set the active screen every time you want to draw on a different screen. There is also a tiny performance advantage for drawing commands called directly on a screen object.
		 * @param screenId The screen ID to retrieve.
		 */
		getScreen( params: { "screenId": number } ): void;
		getScreen( screenId: number ): void;

		/**
		 * Gets the most recent gamepad status.
		 */
		ingamepads(): void;

		/**
		 * Gets the most recent status of keys.
		 * @param key Name (string) or keyCode (integer) of key to return the status. Leave blank for the status of all keys that have been pressed.
		 */
		inkey( params: { "key"?: any } ): void;
		inkey( key?: any ): void;

		/**
		 * Loads a font from an image or encoded string.
		 * @param fontSrc The source location of the image or the encoded string location.
		 * @param width The width of each character in the font.
		 * @param height The height of each character in the font.
		 * @param charSet A string or an array of integers containing the ascii value for each font character in order.
		 * @param isEncoded Boolean to load the font from an encoded string.
		 */
		loadFont( params: { "fontSrc": string | HTMLImageElement | HTMLCanvasElement; "width": number; "height": number; "charSet"?: Array<number> | string; "isEncoded"?: boolean } ): void;
		loadFont( fontSrc: string | HTMLImageElement | HTMLCanvasElement, width: number, height: number, charSet?: Array<number> | string, isEncoded?: boolean ): void;

		/**
		 * Loads an image for later use in the drawImage command. It is recommended to use the ready command after loadImage and before calling the drawImage command.
		 * @param src The source location of an image file or an image element.
		 * @param name A name you can use to refer to the image later in the drawImage command. If left blank then the name will be created automatically.
		 */
		loadImage( params: { "src": string | HTMLImageElement | HTMLCanvasElement; "name"?: string } ): void;
		loadImage( src: string | HTMLImageElement | HTMLCanvasElement, name?: string ): void;

		/**
		 * Loads an image for later use in the drawSprite command. It is recommended to use the ready command after loadSpritesheet and before calling the drawSprite command. If you do not provide a
		 * width and height the frames will be auto generated. Use getSpritesheetData to get info on the
		 * frame count and frame dimensions.
		 * @param src The source location of an image file or an image element.
		 * @param name . The name of the sprite for use in the drawSprite command.
		 * @param width . The width of each sprite in the spritesheet.
		 * @param height . The height of each sprite in the spritesheet.
		 * @param margin . A margin in pixels around each sprite.
		 */
		loadSpritesheet( params: { "src": string | HTMLImageElement | HTMLCanvasElement; "name"?: string; "width"?: number; "height"?: number; "margin"?: number } ): void;
		loadSpritesheet( src: string | HTMLImageElement | HTMLCanvasElement, name?: string, width?: number, height?: number, margin?: number ): void;

		/**
		 * Removes a gamepad event handler registered with the ongamepad command.
		 *
		 * Removes a gamepad event handler that was previously registered with the ongamepad command. The function reference, gamepadIndex, mode, and item must exactly match the ones used when registering the handler with ongamepad.
		 *
		 * The callback data structure varies by event mode (see ongamepad documentation for details).
		 * @param gamepadIndex Gamepad index (0-3).
		 * @param mode Event mode.
		 * @param item Button/axis index, array, or 'any'.
		 * @param fn Callback function used when registering with ongamepad.
		 */
		offgamepad( params: { "gamepadIndex": number; "mode": string; "item": any; "fn": ( data: any, customData?: object ) => void } ): void;
		offgamepad( gamepadIndex: number, mode: string, item: any, fn: ( data: any, customData?: object ) => void ): void;

		/**
		 * Removes a keyboard event handler registered with the onkey command.
		 *
		 * Removes a keyboard event handler that was previously registered with the onkey command. The function reference, key, and mode must exactly match the ones used when registering the handler with onkey.
		 *
		 * The callback function receives keyData containing key, location, code, and keyCode properties.
		 * @param key Key identifier used when registering with onkey.
		 * @param mode Event mode: 'down' or 'up'.
		 * @param fn Callback function used when registering with onkey.
		 */
		offkey( params: { "key": string | number | any[]; "mode": string; "fn": ( keyData: { key: string, location: number, code: string, keyCode: number } ) => void } ): void;
		offkey( key: string | number | any[], mode: string, fn: ( keyData: { key: string, location: number, code: string, keyCode: number } ) => void ): void;

		/**
		 * Registers a callback function for gamepad events (buttons, axes, connect, disconnect).
		 *
		 * Registers a callback function that will be called when a gamepad event occurs. The callback data varies depending on the event mode:
		 *
		 * - "connect": Receives gamepad connection data
		 * - "disconnect": Receives gamepad disconnection data
		 * - "pressed", "touched", "pressReleased", "touchReleased": Receives button data object with index,   pressed, touched, value, gamepadIndex properties
		 * - "axis" (specific index): Receives axis value as a number
		 * - "axis" (any/all): Receives array of axis change objects with index, value, lastValue properties
		 *
		 * You can listen for specific buttons/axes by index, use "any" to listen for any button/axis, or use an array to listen for multiple specific buttons. The customData parameter is optional.
		 * @param gamepadIndex Gamepad index (0-3).
		 * @param mode Event mode: 'connect', 'disconnect', 'axis', 'pressed', 'touched', 'pressReleased', or 'touchReleased'.
		 * @param item Button or axis index, array of indices, 'any', or null for all axes.
		 * @param fn Callback function called when the gamepad event occurs.
		 * @param once If true, removes the handler after being called once.
		 * @param customData Optional custom data passed to the callback function.
		 */
		ongamepad( params: { "gamepadIndex": number; "mode": string; "item": number | string | any[]; "fn": ( data: any, customData?: object ) => void; "once"?: boolean; "customData"?: any } ): void;
		ongamepad( gamepadIndex: number, mode: string, item: number | string | any[], fn: ( data: any, customData?: object ) => void, once?: boolean, customData?: any ): void;

		/**
		 * Registers a callback function for keyboard key events (down or up) with support for key combinations.
		 *
		 * Registers a callback function that will be called when a keyboard key event occurs. The callback receives key data including the key name, code, location, and keyCode.
		 *
		 * Supports two event modes:
		 * - "down": Triggered when a key is pressed down
		 * - "up": Triggered when a key is released
		 *
		 * You can register handlers for single keys (string or keyCode), key combinations (array of keys), or use "any" to listen for any key press. For key combinations, the mode must be "down" and all keys in the combination must be pressed simultaneously.
		 *
		 * The callback function receives (keyData) for single keys or an array of keyData objects for key combinations. The keyData object contains: key (the key name), location (key location), code (the key code), and keyCode (numeric key code).
		 * @param key Key identifier: string key name, numeric keyCode, array for combinations, or 'any'.
		 * @param mode Event mode: 'down' or 'up'.
		 * @param fn Callback function called when the key event occurs.
		 * @param once If true, removes the handler after being called once.
		 */
		onkey( params: { "key": string | number | any[]; "mode": string; "fn": ( keyData: { key: string, location: number, code: string, keyCode: number } ) => void; "once"?: boolean } ): void;
		onkey( key: string | number | any[], mode: string, fn: ( keyData: { key: string, location: number, code: string, keyCode: number } ) => void, once?: boolean ): void;

		/**
		 * Plays music notes generated by the Web Audio API.
		 *
		 * Plays music from a notation string. Supports notes, tempo, volume, waveforms, and multiple simultaneous tracks separated by commas.
		 *
		 * - **Notes**: A-G (with sharps # or +, flats -), N[n] for note by number (0-127)
		 * - **Octave**: O[n] (0-9), < (decrease), > (increase)
		 * - **Length**: L[n] (1-64, where 4=quarter note), . (1.5x), .. (1.75x)
		 * - **Tempo**: T[n] (32-255 BPM)
		 * - **Volume**: V[n] (0-100)
		 * - **Pause**: P[n] (pause for note length)
		 * - **Waveforms**: WS (sine), WQ (square), WW (sawtooth), WT (triangle), W[n] (custom wavetable)
		 * - **Style**: MS (staccato), MN (normal), ML (legato), MW (toggle full note)
		 * - **Modifiers**: MU[n] (octave offset), MY[n] (attack 0-100), MX[n] (sustain 0-100), MZ[n] (decay 0-100)
		 *
		 * Custom wavetables can be defined using [[realArray, imagArray]] syntax.
		 * @param playString Case insensitive string that contains commands for playing music.
		 */
		play( params: { "playString": any } ): void;
		play( playString: any ): void;

		/**
		 * Plays an audio pool sound.
		 * @param audioId The id of the audio pool to play.
		 * @param volume Sets the volume level. Use a float value between 0 and 1.
		 * @param startTime Allows you to choose a specific time in seconds at which the audio starts.
		 * @param duration Max length in seconds the audio will play.
		 */
		playAudioPool( params: { "audioId": any; "volume": any; "startTime": any; "duration": any } ): void;
		playAudioPool( audioId: any, volume: any, startTime: any, duration: any ): void;

		/**
		 * Waits for document readiness and all pending resources.
		 *
		 * Defers execution until the document is ready and all registered asynchronous resources have completed loading (e.g., images queued via internal loading).
		 *
		 * Usage styles:
		 * - Callback: $.ready( function() {} );
		 * @param callback Callback to run when ready completes.
		 */
		ready( params: { "callback": () => void } ): void;
		ready( callback: () => void ): void;

		/**
		 * Removes all screens from memory and the DOM.
		 */
		removeAllScreens(): void;

		/**
		 * Removes an image from memory.
		 * @param name The name or id of the image to remove.
		 */
		removeImage( params: { "name": any } ): void;
		removeImage( name: any ): void;

		/**
		 * Creates a new screen (canvas) with specified dimensions and aspect ratio.
		 *
		 * When the screen command is called it will create a canvas element and when graphics commands are  called they will manipulate the canvas created. There are three types of canvas styles that can be created a fullscreen canvas that gets appended to the body of the page, a canvas that gets appended to a container element supplied, or an offscreen canvas.
		 *
		 * The screen command must be called before any graphics commands can be called.
		 *
		 * The aspect command allows certain types of screen resolutioins to be used. An x is used to specify specific pixel dimensions of the screen. A : is used to provide a aspect ratio. An e is to extend the canvas to fill 100% of the screen regardless of aspect ratio.
		 *
		 * Examples: 300x200 = A canvas that has data for 300x200 canvas filled to fit in the screen dimensions with a 3:2 pixel ratio. 16:9 = A canvas that has data and the maximum screen size for the 16:9 aspect ratio. 640e480 = A canvas that tries to fit 640x480 resolution but will extend the data and the canvas  size to fill the entire screen.
		 *
		 * If aspect is left blank then the canvas will fill the screen 100% width and height.
		 * @param aspect Specify the dimensions of the screen using string in the format of: (width)(x/:/e)(height). Ie: 300x200.
		 * @param container A DOM element or a string that contains the id tag of a dom element to use as the container for the canvas.
		 * @param isOffscreen Is the canvas an offscreen buffer. If true canvas will not show on screen but can be used as an offscreen buffer.
		 * @param willReadFrequently This sets the image data to not use hardware acceleration. This will help speed things up if you are using a lot of pixel mode primitive graphics commands. It won't help with drawImage or drawSprite commands.
		 * @param noStyles Create a canvas that has no css applied to it. Just use a default canvas element.
		 * @param isMultiple Set the auto size of the canvas to only expand to exact multiples of the target resolution.
		 * @param resizeCallback A function that will get called after any time the canvas gets resized.
		 */
		screen( params: { "aspect"?: string; "container"?: string | HTMLElement; "isOffscreen"?: boolean; "willReadFrequently"?: boolean; "noStyles"?: boolean; "isMultiple"?: boolean; "resizeCallback"?: ( fromSize: { width: number; height: number }, toSize: { width: number; height: number } ) => void } ): void;
		screen( aspect?: string, container?: string | HTMLElement, isOffscreen?: boolean, willReadFrequently?: boolean, noStyles?: boolean, isMultiple?: boolean, resizeCallback?: ( fromSize: { width: number; height: number }, toSize: { width: number; height: number } ) => void ): void;

		/**
		 * Disables the default behavior for a key.
		 *
		 * This is helpful if you want to use a key that has default behaviour that the web browser you want to disable.  Such as if you want to use the function keys in your game/app you would need to call setActionKey to disable the web browser default behaviour.
		 * @param key The key you wish to disable default behaviour.
		 * @param isEnabled If set to true or left blank then it disables default behaviour. False re-enables default behaviour.
		 */
		setActionKey( params: { "key": any; "isEnabled"?: any } ): void;
		setActionKey( key: any, isEnabled?: any ): void;

		/**
		 * Sets the default font for new screens.
		 *
		 * Sets the default font ID that will be used when new screens are created. The font must already be loaded using loadFont.
		 * @param fontId Font ID from loadFont to use as default for new screens.
		 */
		setDefaultFont( params: { "fontId": number } ): void;
		setDefaultFont( fontId: number ): void;

		/**
		 * Sets the default input focus for keyboard. By default this will be set to the window.  Normally you don't really need to change this but if you have multiple elements on your screen that will compete for keyboard focus then this will come in handy.
		 * @param element Font id for the new default
		 */
		setDefaultInputFocus( params: { "element": any } ): void;
		setDefaultInputFocus( element: any ): void;

		/**
		 * Sets the default color palette for new screens.
		 * @param pal An array of color values to use as new palette.
		 */
		setDefaultPal( params: { "pal": any } ): void;
		setDefaultPal( pal: any ): void;

		/**
		 * Sets how Pi.js handles errors by setting an error mode between throw, log, and none.
		 * @param mode Set to throw, log, or none for the different error modes.
		 */
		setErrorMode( params: { "mode": any } ): void;
		setErrorMode( mode: any ): void;

		/**
		 * Enables or disables pinch zoom.
		 *
		 * Controls whether the browser's default pinch-to-zoom gesture is enabled. When disabled, pinch gestures are prevented from zooming the page, allowing them to be handled by touch event handlers instead.
		 *
		 * This is recommended when working with touch if you want to disable zoom.
		 * @param isEnabled Set to true if you want to enable this is the default state. Set to false if you want to disable zoom.
		 */
		setPinchZoom( params: { "isEnabled": any } ): void;
		setPinchZoom( isEnabled: any ): void;

		/**
		 * Sets the active screen for graphics commands.
		 *
		 * Changes the active screen to the specified screen. All subsequent graphics commands will operate on this screen until another screen is set as active.
		 * @param screen Screen ID (number) or screen API object to set as active.
		 */
		setScreen( params: { "screen": number | Screen } ): void;
		setScreen( screen: number | Screen ): void;

		/**
		 * Sets the master volume for all sound commands.
		 * @param volume The volume between 0 and 1 that sets the master volume.
		 */
		setVolume( params: { "volume": any } ): void;
		setVolume( volume: any ): void;

		/**
		 * Plays a sound by frequency using Web Audio API.
		 *
		 * Generates and plays a sound at a specific frequency using Web Audio API oscillators. Supports standard waveforms (triangle, sine, square, sawtooth) or custom wavetables.
		 *
		 * The sound uses an ADSR envelope (attack, sustain, decay) for natural sound shaping.
		 * @param frequency The sound frequency.
		 * @param duration How long to play the sound.
		 * @param volume The volume of the sound.
		 * @param oType The type of oscillator to use for the sound ie: (sawtooth, sine, square, triangle).
		 * @param delay A pause before the sound plays.
		 * @param attack How long to ramp up to the full volume, prevents clicking sound.
		 * @param decay How long to ramp down to 0 volume, prevents clicking sound.
		 */
		sound( params: { "frequency": any; "duration": any; "volume"?: any; "oType"?: any; "delay"?: any; "attack"?: any; "decay"?: any } ): void;
		sound( frequency: any, duration: any, volume?: any, oType?: any, delay?: any, attack?: any, decay?: any ): void;

		/**
		 * Starts keyboard input monitoring.
		 *
		 * Starts the keyboard input monitoring system. This initializes event listeners for keydown and keyup events.
		 *
		 * Note: the keyboard automatically starts when key commands are called, but this command can be used to restart it after calling stopKeyboard.
		 */
		startKeyboard(): void;

		/**
		 * Stops and audio pool if it is currently playing audio.
		 * @param audioId The audio id of the audio pool.
		 */
		stopAudioPool( params: { "audioId": any } ): void;
		stopAudioPool( audioId: any ): void;

		/**
		 * Stops tracking keyboard input.
		 */
		stopKeyboard(): void;

		/**
		 * Stops music created by the play command. Leave first parameter blank to stop all play tracks.
		 * @param trackId the trackId to stop playing.
		 */
		stopPlay( params: { "trackId"?: any } ): void;
		stopPlay( trackId?: any ): void;

		/**
		 * Stops sounds made from the sound command. Leave soundId blank to stop all sounds.
		 * @param soundId The soundId to be stopped.
		 */
		stopSound( params: { "soundId": any } ): void;
		stopSound( soundId: any ): void;

		/**
		 * Current Pi.js version string.
		 */
		readonly version: "pi-1.2";
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
