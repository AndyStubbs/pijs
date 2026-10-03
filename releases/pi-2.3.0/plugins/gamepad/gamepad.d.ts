import type { PluginAPI } from "pijs-web/lite";

// Object types used only by the gamepad plugin
/**
 * Gamepad state and helper methods.
 *
 * A connected gamepad, returned by inGamepad() and passed to onGamepad( "connect" ) callbacks. The object is live: the same object is returned on every read and updated in place, including its buttons array, each button, axes, and lastAxes. Copy values to keep a snapshot.
 *
 * A read is an inGamepad() call or a call to one of the methods below, including on a pad kept from an earlier read. The first read in each animation frame updates every pad with what happened since the last frame that had a read, so a press and a release between two reads are both reported; every other read in the same frame sees the same values.
 *
 * A pad starts with every button released, so a button held when the pad appears, such as the press that makes the browser expose it, is reported as just pressed on a later read. Button and axis numbers follow the browser's Gamepad API; the standard mapping has 17 buttons and 4 axes.
 *
 * The methods take a non-negative integer index or a standard-mapping name, which reads the button or axis at that position on any pad. Buttons: south, east, west, north, leftShoulder, rightShoulder, leftTrigger, rightTrigger, select, start, leftStick, rightStick, dpadUp, dpadDown, dpadLeft, dpadRight, and home (0 to 16). Axes: leftX, leftY, rightX, and rightY (0 to 3). Names are exact, and a button method does not take an axis name.
 *
 * A value that is neither an integer nor a string throws a TypeError, and a negative index or an unknown name a RangeError, both with code INVALID_INDEX and a message starting with the method name. An index past the pad's buttons or axes returns the empty value: null from getButton(), 0 from getAxis(), and false from the other methods.
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
	 * Axis values from -1 to 1 after the dead zone set by setGamepadDeadZone(): radial for the two sticks of the standard mapping, per axis otherwise. Values inside it read 0, and values outside it are rescaled to start from 0.
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
 * The disconnected pad's identity. Its GamepadData is no longer in the list that inGamepad() returns.
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

// Commands the gamepad plugin adds to the Pi.js API
interface GamepadCommands {
	/**
	 * Gets gamepad data for a specific gamepad or all gamepads.
	 *
	 * Reads the connected gamepads. With a gamepadIndex, returns the GamepadData for that index, or null when no pad has it. Without one, or with null, always returns an array: every connected pad in index order, in one live array that is refilled on each call, and empty when no pad is connected. The list is compact, so a pad's position in it is not always its index; use its index property.
	 *
	 * The first read starts polling, unless stopGamepad() was called; after stopGamepad(), the list form returns an empty array and the index form null, until startGamepad() starts polling again. The first read records the current state without reporting buttons already held as just pressed.
	 *
	 * Pads are live objects updated in place. The first read in each animation frame reports what happened since the last frame that had a read, and every other read in the frame sees the same values; see GamepadData.
	 *
	 * A gamepadIndex that is not an integer throws a TypeError, and a negative one a RangeError, both with code INVALID_INDEX; a well-formed index with no pad behind it returns null.
	 * @param gamepadIndex Gamepad index to read. If omitted or null, returns every connected pad.
	 * @returns The pad for the index, or null when none has it or polling is stopped; with no index, an array of every connected pad, empty while polling is stopped.
	 */
	inGamepad( params: { "gamepadIndex"?: number } ): GamepadData | Array<GamepadData> | null;
	inGamepad( gamepadIndex?: number ): GamepadData | Array<GamepadData> | null;

	/**
	 * Removes a gamepad connection or disconnection callback.
	 *
	 * Removes callbacks registered with onGamepad. A callback is identified by its mode and function; the once it was registered with does not matter.
	 *
	 * With a mode and a function, removes that callback. Without a function, removes every callback of the mode. With a function and no mode (null, or no mode in the object form), removes the function from both modes. Omitting both throws a TypeError with code INVALID_MODE; clearEvents( "gamepad" ) removes every callback.
	 *
	 * A callback removed during a dispatch does not run later in it. The mode and function are checked as onGamepad() checks them, with codes INVALID_MODE and INVALID_FUNCTION.
	 * @param mode 'connect' or 'disconnect'. If omitted or null, fn is removed from both modes.
	 * @param fn Callback to remove. If omitted or null, every callback of the mode is removed.
	 * @returns This function does not return a value.
	 */
	offGamepad( params: { "mode"?: string | null; "fn"?: ( data: GamepadData | GamepadDisconnectData ) => void } ): void;
	offGamepad( mode?: string | null, fn?: ( data: GamepadData | GamepadDisconnectData ) => void ): void;

	/**
	 * Registers a callback function for gamepad connections or disconnections.
	 *
	 * Registers a callback for the mode: 'connect' runs when a gamepad connects, with its GamepadData, and 'disconnect' runs when one disconnects, with its GamepadDisconnectData.
	 *
	 * A 'connect' callback also receives each pad that is already connected when it is registered, in index order. It receives each connection once, whether it learns of the pad from the start-up scan, this replay, or a connection event; a pad that disconnects and connects again is a new connection. The pad passed to it has every button released; a button held when it connected is reported as just pressed on a later read. A 'connect' callback registered by another gamepad callback receives the connected pads after that callback's dispatch ends. A pad has already left the list that inGamepad() returns when the 'disconnect' callbacks run.
	 *
	 * A callback runs until it is removed. A callback is identified by its mode and function: registering the same function for the same mode again does nothing, whatever its once, and offGamepad removes it by those two. once removes the registration before the callback runs, so a 'connect' callback with once receives one pad, the replay included. Callbacks added during a dispatch first run for the next one; a callback removed during a dispatch does not run later in it. A callback that throws is reported with console.error(), and the other callbacks still run. clearEvents( "gamepad" ) removes every callback.
	 *
	 * Registering starts polling, unless stopGamepad() was called; a 'connect' callback registered while stopped receives the connected pads when startGamepad() resumes polling. The mode is 'connect' or 'disconnect': another string throws a RangeError and a non-string a TypeError, with code INVALID_MODE; a fn that is not a function throws a TypeError with code INVALID_FUNCTION; and once is a boolean or omitted, else a TypeError with code INVALID_ONCE.
	 * @param mode Event mode: 'connect' or 'disconnect'.
	 * @param fn Callback that receives GamepadData or GamepadDisconnectData, by mode.
	 * @param once If true, this registration is removed before the callback's first run.
	 * @returns This function does not return a value.
	 */
	onGamepad( params: { "mode": string; "fn": ( data: GamepadData | GamepadDisconnectData ) => void; "once"?: boolean } ): void;
	onGamepad( mode: string, fn: ( data: GamepadData | GamepadDisconnectData ) => void, once?: boolean ): void;

	/**
	 * Sets the dead zone for gamepad sticks and axes.
	 *
	 * Sets the dead zone that hides stick drift. The default is 0.2. Inside the dead zone an axis reads 0; outside it, the value is rescaled so that it starts from 0 at the edge of the dead zone and still reaches 1 at full tilt.
	 *
	 * The two sticks of the standard mapping, axes 0 and 1 and axes 2 and 3, use a radial dead zone: the stick's distance from the center is compared with the dead zone and rescaled, and the stick keeps its direction, so diagonal and near-cardinal movement are not lost or snapped to an axis. A full diagonal reaches a distance of 1. Every other axis, and every axis of a pad without the standard mapping, uses the dead zone on its own.
	 *
	 * The value is a finite number from 0 to under 1; 0 means no dead zone. A value that is not a finite number throws a TypeError, and one outside the range a RangeError, both with code INVALID_DEAD_ZONE, and the previous setting is kept. The new dead zone applies from the next update. It can also be set with set( { "gamepadDeadZone": value } ).
	 * @param deadZone Dead zone from 0 to under 1 (0 = no dead zone). The default is 0.2.
	 * @returns This function does not return a value.
	 */
	setGamepadDeadZone( params: { "deadZone": number } ): void;
	setGamepadDeadZone( deadZone: number ): void;

	/**
	 * Starts the gamepad input loop and begins monitoring for gamepad connections.
	 *
	 * Starts polling gamepads once per animation frame. Polling also starts on first use: the first inGamepad() call or onGamepad() registration. After stopGamepad(), only startGamepad() starts it again. Calling it while polling does nothing.
	 *
	 * The first start adds the connection and page-visibility listeners and scans for pads that are already connected, passing each to the 'connect' callbacks of onGamepad(). The plugin adds no listener before then. A start after stopGamepad() catches up with the connections made while stopped: pads that left are removed through the 'disconnect' callbacks, and each 'connect' callback receives the connected pads it has not received. Its first update records the current state, so a button pressed while stopped reads as pressed, not as just pressed.
	 *
	 * Polling continues while the window loses focus but the page stays visible. When the page is hidden, every button is released and the axes read 0, without reporting a release; when it is visible again, a button still held reads as pressed, not as just pressed.
	 * @returns This function does not return a value.
	 */
	startGamepad(): void;

	/**
	 * Stops the gamepad input loop.
	 *
	 * Stops polling until startGamepad(). While stopped, inGamepad() returns an empty array and inGamepad( index ) returns null; neither reads nor onGamepad() registrations restart polling. Every button is released and the axes read 0, without reporting a release, as when the page is hidden: a pad kept from an earlier read reports no button held.
	 *
	 * Connection callbacks are not called while stopped, and pads do not join or leave the list. startGamepad() catches up: pads that disconnected while stopped are removed through the 'disconnect' callbacks, and the 'connect' callbacks receive the pads that connected.
	 * @returns This function does not return a value.
	 */
	stopGamepad(): void;

	/**
	 * Rumbles a gamepad's vibration motors.
	 *
	 * Plays the "dual-rumble" effect of the pad's vibration actuator for duration milliseconds, with the strong (low-frequency) and weak (high-frequency) motors at the given magnitudes. Returns true when the pad supports the effect and false when it does not, such as in Firefox and iOS Safari, or when no pad has the index; nothing plays then. Browsers may cap the duration, and a new effect replaces one that is still playing; a duration of 0 stops the rumble.
	 *
	 * Vibration reads the browser's pad directly, so it needs no polling and does not start it. The gamepadIndex is a non-negative integer (INVALID_INDEX); duration is a finite number that is not negative (INVALID_DURATION); strong and weak are finite numbers from 0 to 1, and 1 when omitted (INVALID_STRONG, INVALID_WEAK). A value of the wrong type throws a TypeError, and one out of range a RangeError.
	 * @param gamepadIndex Index of the pad to rumble.
	 * @param duration Rumble length in milliseconds.
	 * @param strong Strong (low-frequency) motor magnitude from 0 to 1. The default is 1.
	 * @param weak Weak (high-frequency) motor magnitude from 0 to 1. The default is 1.
	 * @returns True when the pad supports the dual-rumble effect and it was started.
	 */
	vibrateGamepad( params: { "gamepadIndex": number; "duration": number; "strong"?: number; "weak"?: number } ): boolean;
	vibrateGamepad( gamepadIndex: number, duration: number, strong?: number, weak?: number ): boolean;
}

/**
 * Settings the gamepad plugin adds to the set() options.
 */
interface GamepadOptions {
	/**
	 * Sets the dead zone for gamepad sticks and axes.
	 */
	gamepadDeadZone?: number;
}

declare module "pijs-web/lite" {
	interface PluginCommands extends GamepadCommands {}
	interface PluginOptions extends GamepadOptions {}
}

/**
 * gamepad plugin initializer for Pi.js.
 */
declare function gamepadPlugin( pluginApi: PluginAPI ): void;
export default gamepadPlugin;
