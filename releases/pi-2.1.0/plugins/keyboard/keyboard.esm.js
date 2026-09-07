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
var m_pluginApi = null;
function initInput(pluginApi) {
  m_pluginApi = pluginApi;
  pluginApi.addCommand(
    "input",
    input,
    true,
    ["prompt", "fn", "cursor", "isNumber", "isInteger", "allowNegative", "maxLength"]
  );
  pluginApi.addCommand("cancelInput", cancelInput, true, []);
}
function input(screenData, options) {
  const prompt = options.prompt;
  const fn = options.fn;
  const cursor = options.cursor ? options.cursor : String.fromCharCode(219);
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
  if (m_inputData) {
    finishInput(true);
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
  startInput();
  return promise;
}
function cancelInput(screenData) {
  if (m_inputData && m_inputData.screenData === screenData) {
    finishInput(true);
  }
}
function startInput() {
  const api = m_pluginApi.getApi();
  const key = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  m_inputData.backgroundImageName = `__input_bg_${key}`;
  captureBackground();
  api.onkey("any", "down", onInputKeyDown, false, true);
  m_inputData.interval = setInterval(showPrompt, 100);
}
function captureBackground() {
  const screenData = m_inputData.screenData;
  let pos = screenData.api.getPos();
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
    "name": m_inputData.backgroundImageName,
    "x1": posPx.x,
    "y1": posPx.y,
    "x2": posPx.x + captureWidth - 1,
    "y2": posPx.y + captureHeight - 1
  });
  m_inputData.backgroundImage = m_pluginApi.getApi().getImage(m_inputData.backgroundImageName);
  m_inputData.captureX = posPx.x;
  m_inputData.captureY = posPx.y;
  m_inputData.captureWidth = captureWidth;
  m_inputData.captureHeight = captureHeight;
}
function onInputKeyDown(keyData) {
  if (keyData.key === "Enter") {
    finishInput();
    return;
  } else if (keyData.key === "Escape") {
    finishInput(true);
    return;
  } else if (keyData.key === "Backspace") {
    if (m_inputData.val.length > 0) {
      m_inputData.val = m_inputData.val.substring(0, m_inputData.val.length - 1);
    }
  } else if (keyData.key && keyData.key.length === 1) {
    let inputHandled = false;
    if (m_inputData.isNumber && m_inputData.allowNegative) {
      if (keyData.key === "-") {
        if (m_inputData.val.charAt(0) !== "-") {
          m_inputData.val = "-" + m_inputData.val;
        }
        inputHandled = true;
      } else if ((keyData.key === "+" || keyData.code === "Equal") && m_inputData.val.charAt(0) === "-") {
        m_inputData.val = m_inputData.val.substring(1);
        inputHandled = true;
      }
    }
    if (m_inputData.isInteger && keyData.code === "Period") {
      inputHandled = true;
    }
    if (!inputHandled) {
      if (m_inputData.maxLength !== null && m_inputData.val.length >= m_inputData.maxLength) {
        inputHandled = true;
      } else {
        m_inputData.val += keyData.key;
        if (m_inputData.isNumber && isNaN(Number(m_inputData.val)) || m_inputData.isInteger && !Number.isInteger(Number(m_inputData.val))) {
          m_inputData.val = m_inputData.val.substring(0, m_inputData.val.length - 1);
        }
      }
    }
  }
  showPrompt();
}
function showPrompt(hideCursorOverride) {
  const screenData = m_inputData.screenData;
  let msg = m_inputData.prompt + m_inputData.val;
  if (!hideCursorOverride) {
    const now = Date.now();
    if (now - m_inputData.lastCursorBlink > CURSOR_BLINK) {
      m_inputData.lastCursorBlink = now;
      m_inputData.showCursor = !m_inputData.showCursor;
    }
    if (m_inputData.showCursor) {
      msg += m_inputData.cursor;
    }
  }
  screenData.api.blitImage(
    m_inputData.backgroundImage,
    m_inputData.captureX,
    m_inputData.captureY
  );
  const posPx = $.getPosPx();
  $.setPosPx(m_inputData.captureX, m_inputData.captureY);
  screenData.api.print(msg, true);
  screenData.api.setPosPx(posPx);
}
function finishInput(isCancel) {
  const screenData = m_inputData.screenData;
  const api = m_pluginApi.getApi();
  api.offkey("any", "down", onInputKeyDown, false, true);
  showPrompt(true);
  screenData.printCursor.y += screenData.font.height;
  clearInterval(m_inputData.interval);
  let val = m_inputData.val;
  if (m_inputData.isNumber) {
    if (val === "" || val === "-") {
      val = 0;
    } else {
      val = Number(val);
      if (m_inputData.isInteger) {
        val = Math.floor(val);
      }
    }
  }
  api.removeImage(m_inputData.backgroundImageName);
  const tempInputData = m_inputData;
  m_inputData = null;
  if (isCancel) {
    tempInputData.resolve(null);
    if (tempInputData.fn) {
      tempInputData.fn(null);
    }
  } else {
    tempInputData.resolve(val);
    if (tempInputData.fn) {
      tempInputData.fn(val);
    }
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
function keyboardPlugin(pluginApi) {
  startKeyboard();
  window.addEventListener("blur", clearInKeys);
  pluginApi.addScreenCleanupFunction(() => {
  });
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
  const combo = typeof key === "string" ? [key] : key;
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
  const combo = typeof key === "string" ? [key] : key;
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
  triggerKeyEventHandlers(event, "up", event.code);
  if (event.code !== event.key) {
    triggerKeyEventHandlers(event, "up", event.key);
  }
  triggerKeyEventHandlers(event, "up", "any");
  delete m_inCodes[event.code];
  delete m_inKeys[event.key];
  if (m_actionKeys.has(event.code) || m_actionKeys.has(event.key)) {
    event.preventDefault();
  }
}
function triggerKeyEventHandlers(event, mode, keyOrCode) {
  const handlers = m_onKeyHandlers[keyOrCode];
  if (!handlers) {
    return;
  }
  const isAnyKey = keyOrCode === "any";
  const handlersCopy = handlers.slice();
  const toRemove = /* @__PURE__ */ new Set();
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
        handler.fn(keyData);
      }
      if (handler.once) {
        toRemove.add(handler);
        handler.isRemoved = true;
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
        handler.fn(comboData[0]);
      } else {
        handler.fn(comboData);
      }
      if (handler.once) {
        toRemove.add(handler);
        handler.isRemoved = true;
      }
    }
  }
  if (toRemove.size > 0) {
    m_onKeyHandlers[keyOrCode] = handlers.filter((h) => !toRemove.has(h));
    if (m_onKeyHandlers[keyOrCode].length === 0) {
      delete m_onKeyHandlers[keyOrCode];
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
