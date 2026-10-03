import type { PluginAPI } from "pijs-web/lite";

// Object types used only by the pointer plugin
/**
 * Rectangular area used for hit detection in event handlers.
 *
 * A rectangular area in screen pixels that restricts a pointer handler (onClick, onMouse, onPress, onTouch) to input inside it. A point is inside when x <= point.x < x + width and y <= point.y < y + height, so the left and top edges are included and the right and bottom edges are not.
 *
 * Every value must be a finite number, and fractions are allowed. A negative width or height throws a RangeError with code INVALID_HITBOX.
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
 * Press state data (mouse or touch).
 *
 * Press data from the primary pointer: the mouse, or the primary touch. Returned by inPress() and passed to onPress callbacks; type tells which input it came from. It has the fields of MouseData or TouchData, plus touches. A touch is primary when it starts with no other touch down, and stays primary until it lifts; after that, no touch is primary until every touch is up. Press data is created once per event and frozen, and can be serialized with JSON.stringify().
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

// Commands the pointer plugin adds to the API and each screen
interface PointerScreenCommands {
	/**
	 * Gets the current mouse state and starts tracking if needed.
	 *
	 * Returns the mouse data of the latest mouse event, for use in an animation loop. The data is frozen, and it is the same object the event's onMouse handlers received; every read returns it until the next mouse event. Returns null before the first mouse event and while mouse tracking is stopped. Tracking starts on the first read unless stopMouse() was called.
	 *
	 * buttons counts only buttons pressed on the screen, and a release outside the canvas is seen, so a drag that ends anywhere releases its button.
	 *
	 * Requires an onscreen screen.
	 * @returns Frozen mouse data of the latest event, or null before it and while stopped.
	 */
	inMouse(): MouseData | null;

	/**
	 * Gets the current press state (mouse or touch) and starts tracking if needed.
	 *
	 * Returns the press of the primary pointer, from whichever input was used last: the mouse data, or the primary touch. A touch is primary when it starts with no other touch down, and stays primary until it lifts; the other touches are listed in touches but do not move the press. After the primary touch lifts, the press keeps its release, with buttons 0 and action 'up', until the next primary touch.
	 *
	 * The data is frozen, and it is the same object the event's onPress handlers received; every read returns it until the next mouse or touch event. Returns null before the first event, and while the input the latest press came from is stopped. Mouse and touch tracking start on the first read unless stopped.
	 *
	 * Requires an onscreen screen.
	 * @returns Frozen press data of the primary pointer, from the mouse or touch, or null.
	 */
	inPress(): PressData | null;

	/**
	 * Gets the current touch state and starts tracking if needed.
	 *
	 * Returns the touches still down, ordered by identifier; the array is empty when no touch is down and while touch tracking is stopped. Each touch has its own action. The array and its touches are frozen: every read returns the same array until a touch changes, and each touch is the object the onTouch handlers received. Tracking starts on the first read unless stopTouch() was called.
	 *
	 * A touch that starts on the canvas border or padding is not tracked. Held touches are released when the page is hidden or stopTouch() is called.
	 *
	 * Requires an onscreen screen.
	 * @returns Touches still down; empty when none is down.
	 */
	inTouch(): Array<TouchData>;

	/**
	 * Removes a click event handler.
	 *
	 * Removes the click handler registered with the function; the once, hitBox, and customData it was registered with do not matter. Click has one mode, so if fn is omitted or null, removes every click handler of the screen. A handler removed during an event does not run later in it. The callback is checked as onClick() checks it, with code INVALID_FUNCTION.
	 * @param fn Callback function to remove. If omitted or null, removes every click handler.
	 * @returns This function does not return a value.
	 */
	offClick( params: { "fn"?: ( clickData: ClickData, customData?: object ) => void } ): void;
	offClick( fn?: ( clickData: ClickData, customData?: object ) => void ): void;

	/**
	 * Removes a mouse event handler.
	 *
	 * Removes mouse event handlers registered with onMouse. A handler is identified by its mode and callback; the once, hitBox, and customData it was registered with do not matter.
	 *
	 * With a mode and a callback, removes that handler. Without a callback, removes every handler of the mode. With a callback and no mode (null, or no mode in the object form), removes the callback from every mode. Omitting both throws a TypeError with code INVALID_MODE; clearEvents( "mouse" ) removes every mouse handler.
	 *
	 * A handler removed during an event does not run later in it.
	 *
	 * The mode and callback are checked as onMouse() checks them, with codes INVALID_MODE and INVALID_FUNCTION.
	 * @param mode Mode ('down', 'up', or 'move'); if omitted or null, fn is removed from every mode.
	 * @param fn Callback function to remove. If omitted or null, removes every handler of the mode.
	 * @returns This function does not return a value.
	 */
	offMouse( params: { "mode"?: string | null; "fn"?: ( mouseData: MouseData, customData?: object ) => void } ): void;
	offMouse( mode?: string | null, fn?: ( mouseData: MouseData, customData?: object ) => void ): void;

	/**
	 * Removes a press event handler.
	 *
	 * Removes press event handlers registered with onPress. A handler is identified by its mode and callback; the once, hitBox, and customData it was registered with do not matter.
	 *
	 * With a mode and a callback, removes that handler. Without a callback, removes every handler of the mode. With a callback and no mode (null, or no mode in the object form), removes the callback from every mode. Omitting both throws a TypeError with code INVALID_MODE; clearEvents( "press" ) removes every press handler.
	 *
	 * A handler removed during an event does not run later in it.
	 *
	 * The mode and callback are checked as onPress() checks them, with codes INVALID_MODE and INVALID_FUNCTION.
	 * @param mode Mode ('down', 'up', or 'move'); if omitted or null, fn is removed from every mode.
	 * @param fn Callback function to remove. If omitted or null, removes every handler of the mode.
	 * @returns This function does not return a value.
	 */
	offPress( params: { "mode"?: string | null; "fn"?: ( pressData: PressData, customData?: object ) => void } ): void;
	offPress( mode?: string | null, fn?: ( pressData: PressData, customData?: object ) => void ): void;

	/**
	 * Removes a touch event handler.
	 *
	 * Removes touch event handlers registered with onTouch. A handler is identified by its mode and callback; the once, hitBox, and customData it was registered with do not matter.
	 *
	 * With a mode and a callback, removes that handler. Without a callback, removes every handler of the mode. With a callback and no mode (null, or no mode in the object form), removes the callback from every mode. Omitting both throws a TypeError with code INVALID_MODE; clearEvents( "touch" ) removes every touch handler.
	 *
	 * A handler removed during an event does not run later in it.
	 *
	 * The mode and callback are checked as onTouch() checks them, with codes INVALID_MODE and INVALID_FUNCTION.
	 * @param mode Mode ('down', 'up', or 'move'); if omitted or null, fn is removed from every mode.
	 * @param fn Callback function to remove. If omitted or null, removes every handler of the mode.
	 * @returns This function does not return a value.
	 */
	offTouch( params: { "mode"?: string | null; "fn"?: ( touches: Array<TouchData>, customData?: object ) => void } ): void;
	offTouch( mode?: string | null, fn?: ( touches: Array<TouchData>, customData?: object ) => void ): void;

	/**
	 * Removes a wheel event handler.
	 *
	 * Removes the wheel handler registered with the function; the once, hitBox, and customData it was registered with do not matter. Wheel has one mode, so if fn is omitted or null, removes every wheel handler of the screen. When the last handler is removed, the page scrolls with the wheel over the canvas again. A handler removed during an event does not run later in it. The callback is checked as onWheel() checks it, with code INVALID_FUNCTION.
	 * @param fn Callback function to remove. If omitted or null, removes every wheel handler.
	 * @returns This function does not return a value.
	 */
	offWheel( params: { "fn"?: ( wheelData: WheelData, customData?: object ) => void } ): void;
	offWheel( fn?: ( wheelData: WheelData, customData?: object ) => void ): void;

	/**
	 * Registers a callback function for click events (mouse or touch).
	 *
	 * Registers a callback that runs when a pointer is pressed and released inside the hit box: the left mouse button, or any single touch. Each pointer clicks on its own, so a second finger's tap inside the box clicks while the first is still down.
	 *
	 * A press inside the box arms the click for that pointer, and its release inside the box fires it with the release data. A release outside the box, a release of another mouse button, or a cancel disarms it, so right and middle clicks, a drag that leaves the box, and a cancelled touch never click.
	 *
	 * If no hitBox is provided, the screen's size when the handler is registered is used. A handler runs until it is removed. A handler is identified by its callback: registering the same callback again does nothing, whatever its once, hitBox, and customData, and offClick removes it by the callback. once removes the registration before the handler runs. Handlers added during an event first run for the next event; a handler removed during an event does not run later in it. A handler that throws is reported with console.error(), and the other handlers still run.
	 *
	 * once is a boolean or omitted. Invalid arguments throw a TypeError for a wrong type or a RangeError for a negative hitBox size, with code INVALID_FUNCTION, INVALID_ONCE, or INVALID_HITBOX.
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
	 * Registers a callback that runs when a mouse event occurs, with the mouse data and the optional custom data. Mouse commands also observe pens, whose data has type set to 'pen'. With a hitBox, the callback runs only for events inside it. Registering starts tracking unless stopMouse() was called.
	 *
	 * A press that starts on the canvas border or padding is ignored. A press on the canvas keeps reporting moves while it leaves the canvas, and 'up' runs for its release anywhere. 'up' also runs with cancelled set to true when the browser cancels the pointer, the page is hidden, or stopMouse() is called with a button held; moves and releases report their true position, which can be outside the screen.
	 *
	 * A handler runs until it is removed. A handler is identified by its mode and callback: registering the same callback for the same mode again does nothing, whatever its once, hitBox, and customData, and offMouse removes it by those two. once removes the registration before the handler runs. Handlers added during an event first run for the next event; a handler removed during an event does not run later in it. A handler that throws is reported with console.error(), and the other handlers still run.
	 *
	 * The mode is 'down', 'up', or 'move', and once is a boolean or omitted. Invalid arguments throw a TypeError for a wrong type or a RangeError for an unknown mode or a negative hitBox size, with code INVALID_MODE, INVALID_FUNCTION, INVALID_ONCE, or INVALID_HITBOX.
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
	 * Registers a callback that runs for press events of the primary pointer, the mouse or the primary touch, with the press data and the optional custom data. Other touches reach onTouch handlers and inTouch() only. With a hitBox, the callback runs only for presses inside it.
	 *
	 * 'up' runs for the mouse release anywhere and for the primary touch's release, with cancelled set to true for a release the player did not make: a cancelled touch, a hidden page, or a stop command. A press that starts on the canvas border or padding is ignored. Registering starts mouse and touch tracking unless stopped.
	 *
	 * A handler runs until it is removed. A handler is identified by its mode and callback: registering the same callback for the same mode again does nothing, whatever its once, hitBox, and customData, and offPress removes it by those two. once removes the registration before the handler runs. Handlers added during an event first run for the next event; a handler removed during an event does not run later in it. A handler that throws is reported with console.error(), and the other handlers still run.
	 *
	 * The mode is 'down', 'up', or 'move', and once is a boolean or omitted. Invalid arguments throw a TypeError for a wrong type or a RangeError for an unknown mode or a negative hitBox size, with code INVALID_MODE, INVALID_FUNCTION, INVALID_ONCE, or INVALID_HITBOX.
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
	 * Registers a callback that runs when a touch event occurs, with the touch it changed, in an array, and the optional custom data: 'down' receives the touch that started, 'move' the touch that moved, and 'up' the touch that ended, at the position where it lifted. Each touch is reported by its own event. Use inTouch() for every touch still down.
	 *
	 * With a hitBox, the callback receives only the changed touches inside it, and runs only when there is one. 'up' also runs with cancelled set to true when the browser cancels a touch, the page is hidden, or stopTouch() is called. A touch that starts on the canvas border or padding is ignored. A touch that starts on the canvas keeps reporting moves and its end when it leaves the canvas. While touch is tracked, the canvas has touch-action set to none, so the browser does not scroll or zoom with touches that start there. Registering starts tracking unless stopTouch() was called.
	 *
	 * A handler runs until it is removed. A handler is identified by its mode and callback: registering the same callback for the same mode again does nothing, whatever its once, hitBox, and customData, and offTouch removes it by those two. once removes the registration before the handler runs. Handlers added during an event first run for the next event; a handler removed during an event does not run later in it. A handler that throws is reported with console.error(), and the other handlers still run.
	 *
	 * The mode is 'down', 'up', or 'move', and once is a boolean or omitted. Invalid arguments throw a TypeError for a wrong type or a RangeError for an unknown mode or a negative hitBox size, with code INVALID_MODE, INVALID_FUNCTION, INVALID_ONCE, or INVALID_HITBOX.
	 *
	 * Requires an onscreen screen.
	 * @param mode Event mode: 'down', 'up', or 'move'. Any other mode throws INVALID_MODE.
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
	 * Registers a callback that runs when the wheel turns, or a trackpad scrolls, over the screen canvas, with the wheel data and the optional custom data. Deltas are in CSS pixels whatever the browser reports: a line is 16 pixels and a page is the window's width or height. With a hitBox, the callback runs only for wheel events inside it.
	 *
	 * While the screen has a wheel handler, the page does not scroll with the wheel over the canvas; when the last handler is removed, it scrolls again. Wheel handlers need no tracking, so the mouse start and stop commands do not affect them.
	 *
	 * A handler runs until it is removed. A handler is identified by its callback: registering the same callback again does nothing, whatever its once, hitBox, and customData, and offWheel removes it by the callback. once removes the registration before the handler runs. Handlers added during an event first run for the next event; a handler removed during an event does not run later in it. A handler that throws is reported with console.error(), and the other handlers still run.
	 *
	 * once is a boolean or omitted. Invalid arguments throw a TypeError for a wrong type or a RangeError for a negative hitBox size, with code INVALID_FUNCTION, INVALID_ONCE, or INVALID_HITBOX.
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
	 * Enables or disables the right-click context menu.
	 *
	 * Controls whether the browser's context menu opens on the screen canvas. The menu is suppressed from screen creation, whether or not mouse tracking runs, so right-clicks reach the mouse handlers instead; enable it here to let it open. The setting does not start mouse tracking, and stopping mouse tracking does not change it. isEnabled is a boolean, or omitted to suppress the menu; any other value throws a TypeError with code INVALID_IS_ENABLED.
	 *
	 * The option contextMenu of set() calls this command.
	 *
	 * Requires an onscreen screen.
	 * @param isEnabled If true, the context menu opens. If false, it is suppressed.
	 * @returns This function does not return a value.
	 */
	setContextMenu( params: { "isEnabled": boolean } ): void;
	setContextMenu( isEnabled: boolean ): void;

	/**
	 * Enables or disables browser pinch zoom on the screen canvas.
	 *
	 * Sets the touch-action style of the screen canvas, at any time: 'pinch-zoom' when enabled, so a pinch that starts on the canvas zooms the page, and 'none' when disabled, so every touch on the canvas stays with the screen. The rest of the page, including the body, is not changed. isEnabled is a boolean, or omitted to disable pinch zoom; any other value throws a TypeError with code INVALID_IS_ENABLED.
	 *
	 * Without this setting, the canvas has touch-action set to none while touch tracking runs, and stopping tracking restores the canvas's previous value. After this setting, tracking keeps its value. The setting does not start touch tracking. The option pinchZoom of set() calls this command.
	 *
	 * Requires an onscreen screen.
	 * @param isEnabled If true, a pinch on the canvas zooms the page. If false, it does not.
	 * @returns This function does not return a value.
	 */
	setPinchZoom( params: { "isEnabled": boolean } ): void;
	setPinchZoom( isEnabled: boolean ): void;

	/**
	 * Starts mouse input tracking for this screen.
	 *
	 * Starts mouse tracking on the screen canvas. Tracking also starts on first use: the first inMouse(), inPress(), or handler registration. After stopMouse(), only startMouse() starts tracking again.
	 *
	 * When the page is hidden, held buttons are released through the 'up' handlers, with cancelled set to true.
	 *
	 * Requires an onscreen screen.
	 * @returns This function does not return a value.
	 */
	startMouse(): void;

	/**
	 * Starts touch input tracking for this screen.
	 *
	 * Starts touch tracking on the screen canvas, and sets its touch-action style to none so the browser does not scroll or zoom with touches on it; stopTouch() restores the previous value. Tracking also starts on first use: the first inTouch(), inPress(), or handler registration. After stopTouch(), only startTouch() starts tracking again.
	 *
	 * When the page is hidden, held touches are released through the 'up' handlers, with cancelled set to true.
	 *
	 * Requires an onscreen screen.
	 * @returns This function does not return a value.
	 */
	startTouch(): void;

	/**
	 * Stops mouse input tracking for this screen.
	 *
	 * Stops mouse tracking on the screen canvas. Held buttons are released first: the onMouse and onPress 'up' handlers run with cancelled set to true, and no click fires. Called from a handler, it ends that event: no press, click, or pointer capture follows it.
	 *
	 * While stopped, handlers stay registered but are not called, inMouse() returns null, and inPress() returns null when its latest press came from the mouse. Reads and handler registration do not restart tracking; call startMouse().
	 * @returns This function does not return a value.
	 */
	stopMouse(): void;

	/**
	 * Stops touch input tracking for this screen.
	 *
	 * Stops touch tracking on the screen canvas. Held touches are released first: the onTouch 'up' handlers, and the onPress 'up' handlers for the primary touch, run with cancelled set to true, and no click fires. Called from a handler, it ends that event: no press, click, or pointer capture follows it.
	 *
	 * While stopped, handlers stay registered but are not called, inTouch() returns an empty array, and inPress() returns null when its latest press came from a touch. Reads and handler registration do not restart tracking; call startTouch().
	 * @returns This function does not return a value.
	 */
	stopTouch(): void;
}

/**
 * Settings the pointer plugin adds to the set() options.
 */
interface PointerOptions {
	/**
	 * Enables or disables the right-click context menu.
	 */
	contextMenu?: boolean;

	/**
	 * Enables or disables browser pinch zoom on the screen canvas.
	 */
	pinchZoom?: boolean;
}

declare module "pijs-web/lite" {
	interface PluginScreenCommands extends PointerScreenCommands {}
	interface PluginOptions extends PointerOptions {}
}

/**
 * pointer plugin initializer for Pi.js.
 */
declare function pointerPlugin( pluginApi: PluginAPI ): void;
export default pointerPlugin;
