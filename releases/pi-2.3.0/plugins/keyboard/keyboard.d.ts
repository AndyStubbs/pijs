import type { PluginAPI } from "pijs-web/lite";

// Commands the keyboard plugin adds to the Pi.js API
interface KeyboardCommands {
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
	 *
	 * A key that is not a string throws a TypeError, and an empty string a RangeError, with code INVALID_KEY; null is the same as no key.
	 * @param key Key code or key value to check. If omitted, returns all pressed keys.
	 * @returns Key data object if key is pressed, array of all pressed keys if no key specified, or null if key not pressed.
	 */
	inKey( params: { "key"?: string } ): object | any[] | null;
	inKey( key?: string ): object | any[] | null;

	/**
	 * Removes a key event handler.
	 *
	 * Removes key event handlers registered with onKey. A handler is identified by its key or combination, its mode, and its callback; the once and allowRepeat flags it was registered with do not matter. A combination matches when it holds the same keys, in any order.
	 *
	 * With a key, a mode, and a callback, removes that handler. Without a callback, removes every handler of the mode for the key. With a callback and no mode (null, or no mode in the object form), removes the callback from both modes. A key alone throws a TypeError with code INVALID_MODE; clearEvents( "keyboard" ) removes every key handler.
	 *
	 * A handler removed while a key event is being dispatched does not run later in that dispatch.
	 *
	 * The key, mode, and callback are checked as onKey() checks them, with codes INVALID_KEY, INVALID_MODE, and INVALID_FUNCTION.
	 * @param key Key code, key value, "any", or combination array of the handlers to remove.
	 * @param mode Event mode ("up" or "down"). If omitted or null, fn is removed from both modes.
	 * @param fn Callback to remove. If omitted, every handler of the mode is removed.
	 * @returns This function does not return a value.
	 */
	offKey( params: { "key": string | any[]; "mode"?: string | null; "fn"?: ( keyData: object | object[] ) => void } ): void;
	offKey( key: string | any[], mode?: string | null, fn?: ( keyData: object | object[] ) => void ): void;

	/**
	 * Registers a callback function for key events.
	 *
	 * Registers a callback function that will be called when a key event occurs. Keys can be named by code (e.g., "KeyA", "Space"), which names a physical key whatever the layout and modifiers, or by key value (e.g., "a", " "), which names the character it types. Codes suit game controls.
	 *
	 * For single keys, the callback receives one key data object. A combination, given as an array of keys, runs when all of its keys are held, and its callback receives an array with the key data of each key in the order given.
	 *
	 * Use "any" as the key to listen for every key. The callback receives the key data of the key that was pressed or released.
	 *
	 * A "down" callback receives the key data of the keydown. An "up" callback receives the key data of the keyup, so its modifier state is the state at the release. A release runs the handlers of the key's code, of the value it reports, and of the value the key was pressed with, when a modifier changed it during the hold. Single-key and "any" up handlers run even for a key whose press was not seen. A combination's up handler runs when one of its keys is released while all were held, with the release data for that key and the held data for the others.
	 *
	 * Key state is updated before handlers run: in a "down" handler, inKey() reports the pressed key, and in an "up" handler, it no longer reports the released key. A handler registered while an event is being handled first runs for the next event, and a handler removed then is not called for the rest of it.
	 *
	 * Keys the player did not release are released through the "up" handlers too, with cancelled set to true: when the window loses focus, the page is hidden, stopKeyboard() is called, a key comes from an editable element, or an input() prompt starts. Their key data copies the last keydown, with repeat set to false. Each held key is released once; a later trigger finds nothing held.
	 *
	 * A handler is identified by its key or combination, its mode, and its callback: registering the same callback for the same keys and mode again does nothing, whatever its once and allowRepeat flags, and offKey removes it by those three. Registering starts keyboard tracking, unless stopKeyboard() was called; handlers stay registered while the keyboard is stopped, but are not called.
	 *
	 * Key data objects are frozen and carry cancelled, false unless the release was cancelled. Keys typed into an editable element, such as an input field, are ignored, and so are the keys of an active input() prompt. A callback that throws does not stop the others; its error is reported with console.error().
	 *
	 * The key is a non-empty string or a non-empty array of them. The array is copied, so changing it later does not change the handler, and a key listed twice counts once; "any" cannot be part of a combination. The mode is "up" or "down", and once and allowRepeat are booleans or omitted. Invalid arguments throw a TypeError for a wrong type or a RangeError for an empty key or an unknown mode, with code INVALID_KEY, INVALID_MODE, INVALID_FUNCTION, INVALID_ONCE, or INVALID_ALLOW_REPEAT.
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
	 * Removes keys from the action keys set.
	 *
	 * Removes keys from the action keys set. These keys will no longer have their default browser behavior prevented.
	 *
	 * Keys that are not an array of strings throw a TypeError, and an empty string in the array a RangeError, with code INVALID_KEYS.
	 * @param keys Array of key codes or key values to remove from action keys.
	 * @returns This function does not return a value.
	 */
	removeActionKeys( params: { "keys": Array<string> } ): void;
	removeActionKeys( keys: Array<string> ): void;

	/**
	 * Sets the keys whose default browser behavior is prevented.
	 *
	 * Sets the action keys, replacing the previous set. Action keys have their default browser behavior prevented on keydown and keyup, for example page scrolling with the arrow keys or Space. This is useful for game controls where you don't want the browser to handle certain keys.
	 *
	 * Pass every action key in one call; an empty array clears them. set( { "actionKeys": [ ... ] } ) sets them the same way, and removeActionKeys() removes some of them. Keys can be specified by code (e.g., "ArrowUp", "Space") or key value (e.g., " "). Setting action keys starts keyboard tracking, unless stopKeyboard() was called.
	 *
	 * Keys that are not an array of strings throw a TypeError, and an empty string in the array a RangeError, with code INVALID_KEYS; the set is then left unchanged.
	 * @param keys Array of key codes or key values that become the action keys.
	 * @returns This function does not return a value.
	 */
	setActionKeys( params: { "keys": Array<string> } ): void;
	setActionKeys( keys: Array<string> ): void;

	/**
	 * Starts keyboard input monitoring.
	 *
	 * Starts the keyboard input monitoring system by adding the keydown and keyup listeners, and the blur and page-visibility listeners that release held keys. The keyboard also starts on first use: the first inKey() call, onKey() registration, or setActionKeys() call, including set( { "actionKeys": [ ... ] } ). The plugin adds no listener before then, so keys pressed earlier are not tracked. This command is needed only after stopKeyboard(), which nothing else undoes. Calling it again while the keyboard is running has no effect, and starting keeps the focused element's focus.
	 * @returns This function does not return a value.
	 */
	startKeyboard(): void;

	/**
	 * Stops keyboard input monitoring.
	 *
	 * Stops the keyboard input monitoring system. Held keys are released first, through the "up" handlers with cancelled set to true; then the keydown and keyup listeners are removed. Keyboard events are no longer tracked until startKeyboard() is called again: while stopped, inKey() reports no keys, and handlers stay registered but are not called. Calling inKey(), registering a handler, or setting action keys does not restart it. An input() prompt keeps reading keys while the keyboard is stopped.
	 * @returns This function does not return a value.
	 */
	stopKeyboard(): void;
}

// Commands the keyboard plugin adds to the API and each screen
interface KeyboardScreenCommands {
	/**
	 * Cancels the current input prompt on this screen.
	 *
	 * Cancels the active input prompt on the current screen. The input promise will resolve with null, and the callback (if provided) will also be passed in the value null.
	 * @returns This function does not return a value.
	 */
	cancelInput(): void;

	/**
	 * Prompts the user for text input with a blinking cursor.
	 *
	 * Displays a prompt at the print cursor and waits for the user to type a value. Enter completes the input and Escape cancels it. Returns a Promise that resolves with the value, or null if the input is cancelled, and optionally calls a callback function with the same value.
	 *
	 * The prompt keeps to one line: when the value would reach the right edge, the end of the value is shown. After the input ends, printing continues at column 0 of the line below the prompt.
	 *
	 * While the prompt is active it reads keys itself, so it works even after stopKeyboard(). It prevents the default action of the keys it handles, so typing does not scroll the page or move focus. Shortcuts with Ctrl or Meta are left to the browser, except AltGr, which types; pasted text is inserted one character at a time by the same rules as typed text. Keys typed into an editable element on the page, such as an input field, are ignored.
	 *
	 * The prompt's keys are its own: they do not reach onKey() handlers or inKey(), including the key that ends the prompt and the later release of keys pressed during it. Keys held when the prompt starts are released through the onKey() "up" handlers, with cancelled set to true, and their later release is not reported again.
	 *
	 * With isNumber or isInteger, the value is a number. Only digits, one decimal point unless isInteger is set, and a leading minus sign with allowNegative are accepted. Typing "-" adds the minus sign at the start, and "+" removes it; the minus sign counts toward maxLength. A value with no digits resolves to 0.
	 *
	 * The input is cancelled by cancelInput(), by clearEvents( "keyboard" ) called with no screen or from the screen that owns the prompt, by removing that screen, or by starting another input.
	 *
	 * The prompt and cursor are strings, the callback a function, and isNumber, isInteger, and allowNegative booleans; maxLength is an integer of at least 1. Omitted values, null or undefined, take their defaults. Invalid options throw a TypeError, or a RangeError for a maxLength below 1, with code INVALID_PROMPT, INVALID_FUNCTION, INVALID_CURSOR, INVALID_IS_NUMBER, INVALID_IS_INTEGER, INVALID_ALLOW_NEGATIVE, or INVALID_MAX_LENGTH.
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
}

/**
 * Settings the keyboard plugin adds to the set() options.
 */
interface KeyboardOptions {
	/**
	 * Sets the keys whose default browser behavior is prevented.
	 */
	actionKeys?: Array<string>;
}

declare module "pijs-web/lite" {
	interface PluginCommands extends KeyboardCommands {}
	interface PluginScreenCommands extends KeyboardScreenCommands {}
	interface PluginOptions extends KeyboardOptions {}
}

/**
 * keyboard plugin initializer for Pi.js.
 */
declare function keyboardPlugin( pluginApi: PluginAPI ): void;
export default keyboardPlugin;
