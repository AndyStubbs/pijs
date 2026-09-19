/**
 * keyboard - Keyboard input handling for Pi.js
 * @version 1.0.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */

// plugins/keyboard/input.js
var CURSOR_BLINK = 500;
var m_inputData = null;
var m_inputRequest = 0;
var m_pluginApi = null;
function initInput(pluginApi) {
  m_pluginApi = pluginApi;
  pluginApi.addScreenPreCleanupFunction(disposeInput);
  pluginApi.addCommand(
    "input",
    input,
    true,
    ["prompt", "fn", "cursor", "isNumber", "isInteger", "allowNegative", "maxLength"]
  );
  pluginApi.addCommand("cancelInput", cancelInput, true, []);
}
function input(screenData, options) {
  if (screenData.isRemoved) {
    const error = new Error("input: Cannot start input on a removed screen.");
    error.code = "SCREEN_REMOVED";
    throw error;
  }
  const prompt = options.prompt;
  const fn = options.fn;
  let cursor;
  if (options.cursor) {
    cursor = options.cursor;
  } else {
    cursor = String.fromCharCode(219);
  }
  const isNumber = !!options.isNumber;
  const isInteger = !!options.isInteger;
  const allowNegative = !!options.allowNegative;
  const maxLength = options.maxLength;
  if (typeof prompt !== "string") {
    const error = new TypeError("input: prompt must be a string");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  if (fn && typeof fn !== "function") {
    const error = new TypeError("input: fn must be a function.");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  if (typeof cursor !== "string") {
    const error = new TypeError("input: cursor must be a string");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  if (maxLength !== null && (typeof maxLength !== "number" || maxLength < 0 || !Number.isInteger(maxLength))) {
    const error = new TypeError("input: maxLength must be a non-negative integer");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  let resolvePromise, rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  const request = ++m_inputRequest;
  if (m_inputData) {
    finishInput(true);
  }
  if (request !== m_inputRequest || screenData.isRemoved) {
    resolvePromise(null);
    notifyInput(fn, null);
    return promise;
  }
  m_inputData = {
    "screenData": screenData,
    "prompt": prompt,
    "cursor": cursor,
    "lastCursorBlink": Date.now(),
    "showCursor": true,
    "isNumber": isNumber,
    "isInteger": isInteger,
    "allowNegative": allowNegative,
    "maxLength": maxLength,
    "val": "",
    "fn": fn,
    "resolve": resolvePromise,
    "reject": rejectPromise,
    "backgroundImageName": null,
    "backgroundImage": null,
    "captureX": null,
    "captureY": null
  };
  const inputData = m_inputData;
  try {
    startInput(inputData);
  } catch (error) {
    m_inputData = null;
    inputData.reject(error);
    releaseInput(inputData);
  }
  return promise;
}
function cancelInput(screenData) {
  if (m_inputData && m_inputData.screenData === screenData) {
    finishInput(true);
  }
}
function startInput(inputData) {
  const api = m_pluginApi.getApi();
  const key = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  inputData.backgroundImageName = `__input_bg_${key}`;
  captureBackground(inputData);
  inputData.keyHandler = (keyData) => onInputKeyDown(inputData, keyData);
  api.onkey("any", "down", inputData.keyHandler, false, true);
  inputData.interval = setInterval(() => {
    if (m_inputData === inputData) {
      showPrompt(inputData);
    }
  }, 100);
}
function captureBackground(inputData) {
  const screenData = inputData.screenData;
  const pos = screenData.api.getPos();
  if (pos.row >= screenData.api.getRows()) {
    screenData.api.print("");
    screenData.api.setPos(pos.col, pos.row - 1);
  }
  const posPx = screenData.api.getPosPx();
  const font = screenData.font;
  const width = screenData.width;
  const height = font.height;
  const captureWidth = width - posPx.x;
  const captureHeight = height;
  screenData.api.createImageFromScreen({
    "name": inputData.backgroundImageName,
    "x1": posPx.x,
    "y1": posPx.y,
    "x2": posPx.x + captureWidth - 1,
    "y2": posPx.y + captureHeight - 1
  });
  inputData.backgroundImage = m_pluginApi.getApi().getImage(inputData.backgroundImageName);
  inputData.captureX = posPx.x;
  inputData.captureY = posPx.y;
  inputData.captureWidth = captureWidth;
  inputData.captureHeight = captureHeight;
}
function onInputKeyDown(inputData, keyData) {
  if (m_inputData !== inputData) {
    return;
  }
  if (keyData.key === "Enter") {
    finishInput();
    return;
  } else if (keyData.key === "Escape") {
    finishInput(true);
    return;
  } else if (keyData.key === "Backspace") {
    if (inputData.val.length > 0) {
      inputData.val = inputData.val.substring(0, inputData.val.length - 1);
    }
  } else if (keyData.key && keyData.key.length === 1) {
    let inputHandled = false;
    if (inputData.isNumber && inputData.allowNegative) {
      if (keyData.key === "-") {
        if (inputData.val.charAt(0) !== "-") {
          inputData.val = "-" + inputData.val;
        }
        inputHandled = true;
      } else if ((keyData.key === "+" || keyData.code === "Equal") && inputData.val.charAt(0) === "-") {
        inputData.val = inputData.val.substring(1);
        inputHandled = true;
      }
    }
    if (inputData.isInteger && keyData.code === "Period") {
      inputHandled = true;
    }
    if (!inputHandled) {
      if (inputData.maxLength !== null && inputData.val.length >= inputData.maxLength) {
        inputHandled = true;
      } else {
        inputData.val += keyData.key;
        if (inputData.isNumber && isNaN(Number(inputData.val)) || inputData.isInteger && !Number.isInteger(Number(inputData.val))) {
          inputData.val = inputData.val.substring(0, inputData.val.length - 1);
        }
      }
    }
  }
  showPrompt(inputData);
}
function showPrompt(inputData, hideCursorOverride) {
  if (inputData.screenData.isRemoved) {
    return;
  }
  const screenData = inputData.screenData;
  let msg = inputData.prompt + inputData.val;
  if (!hideCursorOverride) {
    const now = Date.now();
    if (now - inputData.lastCursorBlink > CURSOR_BLINK) {
      inputData.lastCursorBlink = now;
      inputData.showCursor = !inputData.showCursor;
    }
    if (inputData.showCursor) {
      msg += inputData.cursor;
    }
  }
  screenData.api.blitImage(
    inputData.backgroundImage,
    inputData.captureX,
    inputData.captureY
  );
  const posPx = screenData.api.getPosPx();
  screenData.api.setPosPx(inputData.captureX, inputData.captureY);
  screenData.api.print(msg, true);
  screenData.api.setPosPx(posPx);
}
function finishInput(isCancel, isDisposal = false) {
  const inputData = m_inputData;
  if (!inputData) {
    return;
  }
  m_inputData = null;
  const screenData = inputData.screenData;
  const fn = inputData.fn;
  let val = inputData.val;
  if (isCancel) {
    val = null;
  } else if (inputData.isNumber) {
    if (val === "" || val === "-") {
      val = 0;
    } else {
      val = Number(val);
      if (inputData.isInteger) {
        val = Math.floor(val);
      }
    }
  }
  inputData.resolve(val);
  try {
    if (!isDisposal && !screenData.isRemoved) {
      showPrompt(inputData, true);
      screenData.printCursor.y += screenData.font.height;
    }
  } catch (error) {
    reportInputError(error);
  } finally {
    releaseInput(inputData);
  }
  notifyInput(fn, val);
}
function releaseInput(inputData) {
  const api = m_pluginApi.getApi();
  clearInterval(inputData.interval);
  try {
    if (inputData.keyHandler) {
      api.offkey("any", "down", inputData.keyHandler, false, true);
    }
  } catch (error) {
    reportInputError(error);
  }
  try {
    if (inputData.backgroundImageName) {
      api.removeImage(inputData.backgroundImageName);
    }
  } catch (error) {
    reportInputError(error);
  } finally {
    inputData.screenData = null;
    inputData.backgroundImage = null;
    inputData.backgroundImageName = null;
    inputData.keyHandler = null;
    inputData.interval = null;
    inputData.fn = null;
    inputData.resolve = null;
    inputData.reject = null;
  }
}
function notifyInput(fn, val) {
  if (!fn) {
    return;
  }
  try {
    fn(val);
  } catch (error) {
    reportInputError(error);
  }
}
function reportInputError(error) {
  m_pluginApi.utils.queueMicrotask(() => {
    throw error;
  });
}
function disposeInput(screenData) {
  if (m_inputData && m_inputData.screenData === screenData) {
    finishInput(true, true);
  }
}
function cancelAllInputs(screenData) {
  if (m_inputData) {
    if (screenData === null || screenData === void 0) {
      finishInput(true);
    } else if (m_inputData.screenData === screenData) {
      finishInput(true);
    }
  }
}

// plugins/keyboard/index.js
var INPUT_TAGS = /* @__PURE__ */ new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);
var m_inCodes = {};
var m_inKeys = {};
var m_actionKeys = /* @__PURE__ */ new Set();
var m_onKeyHandlers = {};
var m_isKeyboardActive = false;
var m_pluginApi2 = null;
function keyboardPlugin(pluginApi) {
  m_pluginApi2 = pluginApi;
  startKeyboard();
  window.addEventListener("blur", clearInKeys);
  pluginApi.addCommand("startKeyboard", startKeyboard, false, []);
  pluginApi.addCommand("stopKeyboard", stopKeyboard, false, []);
  pluginApi.addCommand("inkey", inkey, false, ["key"]);
  pluginApi.addCommand("setActionKeys", setActionKeys, false, ["keys"]);
  pluginApi.addCommand("removeActionKeys", removeActionKeys, false, ["keys"]);
  pluginApi.addCommand("onkey", onkey, false, ["key", "mode", "fn", "once", "allowRepeat"]);
  pluginApi.addCommand("offkey", offkey, false, ["key", "mode", "fn", "once", "allowRepeat"]);
  initInput(pluginApi);
  pluginApi.registerClearEvents("keyboard", clearKeyboardEvents);
}
function startKeyboard() {
  if (m_isKeyboardActive) {
    return;
  }
  window.addEventListener("keydown", onKeyDown, { "capture": true });
  window.addEventListener("keyup", onKeyUp, { "capture": true });
  m_isKeyboardActive = true;
  if (document.activeElement) {
    document.activeElement.blur();
  }
}
function stopKeyboard() {
  if (!m_isKeyboardActive) {
    return;
  }
  window.removeEventListener("keydown", onKeyDown, { "capture": true });
  window.removeEventListener("keyup", onKeyUp, { "capture": true });
  m_isKeyboardActive = false;
  clearInKeys();
}
function inkey(options) {
  const key = options.key;
  if (key) {
    if (typeof key !== "string") {
      const error = new TypeError("inkey: key must be a string.");
      error.code = "INVALID_PARAMETERS";
      throw error;
    }
    if (m_inCodes[key]) {
      return m_inCodes[key];
    }
    if (m_inKeys[key]) {
      return m_inKeys[key];
    }
    return null;
  }
  const keyCodes = [];
  for (const code in m_inCodes) {
    if (m_inCodes[code]) {
      keyCodes.push(m_inCodes[code]);
    }
  }
  return keyCodes;
}
function setActionKeys(options) {
  const keys = options.keys;
  if (!Array.isArray(keys)) {
    const error = new TypeError("setActionKeys: keys must be an array.");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  for (const key of keys) {
    m_actionKeys.add(key);
  }
}
function removeActionKeys(options) {
  const keys = options.keys;
  if (!Array.isArray(keys)) {
    const error = new TypeError("removeActionKeys: keys must be an array.");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  for (const key of keys) {
    m_actionKeys.delete(key);
  }
}
function onkey(options) {
  const key = options.key;
  const mode = options.mode;
  const fn = options.fn;
  const once = !!options.once;
  const allowRepeat = !!options.allowRepeat;
  if (!key || typeof key !== "string" && !Array.isArray(key)) {
    const error = new TypeError("onkey: key must be a string or an array of strings.");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  if (!mode || typeof mode !== "string") {
    const error = new TypeError("onkey: mode must be a string with value of up or down.");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  if (typeof fn !== "function") {
    const error = new TypeError("onkey: fn must be a function.");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  let combo;
  if (typeof key === "string") {
    combo = [key];
  } else {
    combo = key;
  }
  const handler = {
    "comboKey": combo.sort().join(""),
    "combo": combo,
    "mode": mode,
    "fn": fn,
    "once": once,
    "allowRepeat": allowRepeat,
    "isRemoved": false
  };
  for (const key2 of combo) {
    if (!m_onKeyHandlers[key2]) {
      m_onKeyHandlers[key2] = [];
    }
    m_onKeyHandlers[key2].push(handler);
  }
}
function offkey(options) {
  const key = options.key;
  const mode = options.mode;
  const fn = options.fn;
  const once = !!options.once;
  const allowRepeat = !!options.allowRepeat;
  if (!key || typeof key !== "string" && !Array.isArray(key)) {
    const error = new TypeError("offkey: key must be a string or an array of strings.");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  if (typeof fn !== "function") {
    const error = new TypeError("offkey: callback must be a function.");
    error.code = "INVALID_PARAMETERS";
    throw error;
  }
  let combo;
  if (typeof key === "string") {
    combo = [key];
  } else {
    combo = key;
  }
  const comboKey = combo.sort().join("");
  for (const key2 of combo) {
    const handlers = m_onKeyHandlers[key2];
    if (!handlers) {
      continue;
    }
    const toRemove = [];
    for (let i = 0; i < handlers.length; i += 1) {
      const handler = handlers[i];
      if (handler.comboKey === comboKey && handler.mode === mode && handler.fn === fn && handler.once === once && handler.allowRepeat === allowRepeat) {
        toRemove.push(i);
        handler.isRemoved = true;
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i -= 1) {
      handlers.splice(toRemove[i], 1);
    }
    if (handlers.length === 0) {
      delete m_onKeyHandlers[key2];
    }
  }
}
function onKeyDown(event) {
  if (isFromEditableTarget(event)) {
    clearInKeys();
    return;
  }
  const keyData = {
    "code": event.code,
    "key": event.key,
    "location": event.location,
    "altKey": event.altKey,
    "ctrlKey": event.ctrlKey,
    "metaKey": event.metaKey,
    "shiftKey": event.shiftKey,
    "repeat": event.repeat
  };
  m_inCodes[event.code] = keyData;
  m_inKeys[event.key] = keyData;
  triggerKeyEventHandlers(event, "down", event.code);
  if (event.code !== event.key) {
    triggerKeyEventHandlers(event, "down", event.key);
  }
  triggerKeyEventHandlers(event, "down", "any");
  if (m_actionKeys.has(event.code) || m_actionKeys.has(event.key)) {
    event.preventDefault();
  }
}
function onKeyUp(event) {
  if (isFromEditableTarget(event)) {
    clearInKeys();
    return;
  }
  const codeData = m_inCodes[event.code];
  const keyData = m_inKeys[event.key];
  try {
    triggerKeyEventHandlers(event, "up", event.code);
    if (event.code !== event.key) {
      triggerKeyEventHandlers(event, "up", event.key);
    }
    triggerKeyEventHandlers(event, "up", "any");
  } finally {
    if (m_inCodes[event.code] === codeData) {
      delete m_inCodes[event.code];
    }
    if (m_inKeys[event.key] === keyData) {
      delete m_inKeys[event.key];
    }
    if (m_actionKeys.has(event.code) || m_actionKeys.has(event.key)) {
      event.preventDefault();
    }
  }
}
function removeHandler(handler) {
  handler.isRemoved = true;
  for (const key of handler.combo) {
    const handlers = m_onKeyHandlers[key];
    if (!handlers) {
      continue;
    }
    const remaining = handlers.filter((item) => item !== handler);
    if (remaining.length === 0) {
      delete m_onKeyHandlers[key];
    } else {
      m_onKeyHandlers[key] = remaining;
    }
  }
}
function invokeHandler(handler, data) {
  if (handler.once) {
    removeHandler(handler);
  }
  try {
    handler.fn(data);
  } catch (error) {
    m_pluginApi2.utils.queueMicrotask(() => {
      throw error;
    });
  }
}
function triggerKeyEventHandlers(event, mode, keyOrCode) {
  const handlers = m_onKeyHandlers[keyOrCode];
  if (!handlers) {
    return;
  }
  const isAnyKey = keyOrCode === "any";
  const handlersCopy = handlers.slice();
  for (let i = 0; i < handlersCopy.length; i += 1) {
    const handler = handlersCopy[i];
    if (handler.mode !== mode) {
      continue;
    }
    if (event.repeat && !handler.allowRepeat) {
      continue;
    }
    if (handler.isRemoved) {
      continue;
    }
    if (isAnyKey) {
      let keyData = m_inCodes[event.code];
      if (!keyData) {
        keyData = m_inKeys[event.key];
      }
      if (keyData !== void 0) {
        invokeHandler(handler, keyData);
      }
      continue;
    }
    const isAllKeysPressed = handler.combo.every((key) => m_inKeys[key] || m_inCodes[key]);
    if (isAllKeysPressed) {
      const comboData = handler.combo.map((key) => {
        if (m_inKeys[key]) {
          return m_inKeys[key];
        }
        return m_inCodes[key];
      });
      if (comboData.length === 1) {
        invokeHandler(handler, comboData[0]);
      } else {
        invokeHandler(handler, comboData);
      }
    }
  }
}
function isFromEditableTarget(event) {
  const element = event.target;
  if (!element) {
    return false;
  }
  if (INPUT_TAGS.has(element.tagName)) {
    return true;
  }
  if (element.isContentEditable) {
    return true;
  }
  const role = element.getAttribute && element.getAttribute("role");
  if (role === "textbox" || role === "searchbox") {
    return true;
  }
  return false;
}
function clearInKeys() {
  for (const code in m_inCodes) {
    delete m_inCodes[code];
  }
  for (const key in m_inKeys) {
    delete m_inKeys[key];
  }
}
function clearKeyboardEvents(screenData) {
  for (const mode in m_onKeyHandlers) {
    for (const handler of m_onKeyHandlers[mode]) {
      handler.isRemoved = true;
    }
    delete m_onKeyHandlers[mode];
  }
  cancelAllInputs(screenData);
}
if (typeof window !== "undefined" && window.pi) {
  window.pi.registerPlugin({
    "name": "keyboard",
    "version": "1.0.0",
    "description": "Keyboard input handling for Pi.js",
    "init": keyboardPlugin
  });
}
export {
  clearKeyboardEvents,
  keyboardPlugin as default
};
//# sourceMappingURL=keyboard.esm.js.map
