/**
 * pointer - Mouse and touch input handling for Pi.js
 * @version 2.0.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
"use strict";
(() => {
  // plugins/pointer/shared-events.js
  function throwCode(ErrorType, message, code) {
    const error = new ErrorType(message);
    error.code = code;
    throw error;
  }
  function createEventHelpers(pluginApi) {
    const utils = pluginApi.utils;
    function onevent(mode, fn, once, hitBox, modes, name, listenerArr, customData) {
      checkMode(name, mode, modes);
      checkFunction(name, fn);
      if (once != null && typeof once !== "boolean") {
        throwCode(TypeError, `${name}: once must be a boolean.`, "INVALID_ONCE");
      }
      once = once === true;
      if (hitBox != null) {
        if (typeof hitBox !== "object" || !Number.isFinite(hitBox.x) || !Number.isFinite(hitBox.y) || !Number.isFinite(hitBox.width) || !Number.isFinite(hitBox.height)) {
          throwCode(
            TypeError,
            `${name}: hitBox must be an object with properties x, y, width, and height whose values are finite numbers.`,
            "INVALID_HITBOX"
          );
        }
        if (hitBox.width < 0 || hitBox.height < 0) {
          throwCode(
            RangeError,
            `${name}: hitBox width and height must not be negative.`,
            "INVALID_HITBOX"
          );
        }
      }
      if (!listenerArr[mode]) {
        listenerArr[mode] = [];
      }
      for (const listener of listenerArr[mode]) {
        if (listener.fn === fn) {
          return;
        }
      }
      listenerArr[mode].push({
        "fn": fn,
        "once": once,
        "hitBox": hitBox,
        "armedPointers": null,
        "isRemoved": false,
        "customData": customData,
        "name": name
      });
    }
    function offevent(mode, fn, modes, name, listenerArr, clearType) {
      if (mode == null && fn == null) {
        throwCode(
          TypeError,
          `${name}: mode or fn is required. To remove every handler, call clearEvents( "${clearType}" ).`,
          "INVALID_MODE"
        );
      }
      let offModes = modes;
      if (mode != null) {
        checkMode(name, mode, modes);
        offModes = [mode];
      }
      if (fn != null) {
        checkFunction(name, fn);
      }
      for (const offMode of offModes) {
        const listeners = listenerArr[offMode];
        if (!listeners) {
          continue;
        }
        for (let i = listeners.length - 1; i >= 0; i--) {
          if (fn == null || listeners[i].fn === fn) {
            removeListener(listenerArr, offMode, listeners[i]);
          }
        }
      }
    }
    function checkMode(name, mode, modes) {
      const message = `${name}: mode must be one of the following: ${modes.join(", ")}.`;
      if (typeof mode !== "string") {
        throwCode(TypeError, message, "INVALID_MODE");
      }
      if (!modes.includes(mode)) {
        throwCode(RangeError, message, "INVALID_MODE");
      }
    }
    function checkFunction(name, fn) {
      if (typeof fn !== "function") {
        throwCode(TypeError, `${name}: fn must be a function.`, "INVALID_FUNCTION");
      }
    }
    function removeListener(listenerArr, mode, listener) {
      listener.isRemoved = true;
      const listeners = listenerArr[mode];
      if (!listeners) {
        return;
      }
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        delete listenerArr[mode];
      }
    }
    function removeAllListeners(listenerArr) {
      for (const mode in listenerArr) {
        for (const listener of listenerArr[mode]) {
          listener.isRemoved = true;
        }
      }
    }
    function runListener(listenerArr, mode, listener, data) {
      if (listener.once) {
        removeListener(listenerArr, mode, listener);
      }
      try {
        listener.fn(data, listener.customData);
      } catch (error) {
        console.error(`${listener.name}: Handler for "${mode}" failed:`, error);
      }
    }
    function triggerEventListeners(mode, data, listenerArr) {
      if (!listenerArr[mode]) {
        return;
      }
      const temp = listenerArr[mode].slice();
      for (let i = 0; i < temp.length; i++) {
        const listener = temp[i];
        if (listener.isRemoved) {
          continue;
        }
        if (listener.hitBox) {
          let isHit = false;
          let newData;
          if (Array.isArray(data)) {
            newData = [];
            for (let j = 0; j < data.length; j++) {
              const pos = data[j];
              if (utils.inRange(pos, listener.hitBox)) {
                newData.push(pos);
              }
            }
            if (newData.length > 0) {
              isHit = true;
            }
            Object.freeze(newData);
          } else {
            newData = data;
            if (utils.inRange(data, listener.hitBox)) {
              isHit = true;
            }
          }
          if (isHit) {
            runListener(listenerArr, mode, listener, newData);
          }
        } else {
          runListener(listenerArr, mode, listener, data);
        }
      }
    }
    function triggerClickListeners2(data, listenerArr, action, pointerId) {
      if (!listenerArr.click) {
        return;
      }
      const temp = listenerArr.click.slice();
      for (const listener of temp) {
        if (listener.isRemoved) {
          continue;
        }
        const isHit = utils.inRange(data, listener.hitBox);
        if (action === "down") {
          if (isHit) {
            if (listener.armedPointers === null) {
              listener.armedPointers = /* @__PURE__ */ new Set();
            }
            listener.armedPointers.add(pointerId);
          }
        } else if (listener.armedPointers !== null) {
          const wasArmed = listener.armedPointers.delete(pointerId);
          if (wasArmed && isHit && action === "up") {
            runListener(listenerArr, "click", listener, data);
          }
        }
      }
    }
    return {
      "onevent": onevent,
      "offevent": offevent,
      "removeAllListeners": removeAllListeners,
      "triggerEventListeners": triggerEventListeners,
      "triggerClickListeners": triggerClickListeners2
    };
  }

  // src/core/canvas-layout.js
  function getCanvasContentRect(canvas) {
    const rect = canvas.getBoundingClientRect();
    const style = getComputedStyle(canvas);
    const left = parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const top = parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
    const right = parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight);
    const bottom = parseFloat(style.borderBottomWidth) + parseFloat(style.paddingBottom);
    let width = parseFloat(style.width);
    let height = parseFloat(style.height);
    if (style.boxSizing !== "border-box") {
      width += left + right;
      height += top + bottom;
    }
    let scaleX = 0;
    let scaleY = 0;
    if (width > 0 && height > 0) {
      scaleX = rect.width / width;
      scaleY = rect.height / height;
    }
    return {
      "cssWidth": Math.max(0, width - left - right),
      "cssHeight": Math.max(0, height - top - bottom),
      "left": rect.left + left * scaleX,
      "top": rect.top + top * scaleY,
      "width": Math.max(0, rect.width - (left + right) * scaleX),
      "height": Math.max(0, rect.height - (top + bottom) * scaleY)
    };
  }

  // plugins/pointer/target.js
  function validatePointerTarget(screenData, command) {
    if (screenData.isOffscreen) {
      const error = new TypeError(
        `${command}: Screen ${screenData.id} is offscreen and cannot receive pointer input. Call ${command}() on an onscreen screen, or select an onscreen screen with setScreen() first.`
      );
      error.code = "OFFSCREEN_INPUT_UNSUPPORTED";
      throw error;
    }
  }
  function pointerPosition(screenData, event) {
    const rect = getCanvasContentRect(screenData.canvas);
    screenData.clientRect = rect;
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    return {
      "x": Math.floor((event.clientX - rect.left) / rect.width * screenData.width),
      "y": Math.floor((event.clientY - rect.top) / rect.height * screenData.height)
    };
  }
  function throwCode2(ErrorType, message, code) {
    const error = new ErrorType(message);
    error.code = code;
    throw error;
  }
  function readIsEnabled(command, isEnabled) {
    if (isEnabled == null) {
      return false;
    }
    if (typeof isEnabled !== "boolean") {
      throwCode2(TypeError, `${command}: isEnabled must be a boolean.`, "INVALID_IS_ENABLED");
    }
    return isEnabled;
  }
  function createPointerData(record) {
    return Object.freeze({
      "x": record.x,
      "y": record.y,
      "lastX": record.lastX,
      "lastY": record.lastY,
      "buttons": record.buttons,
      "action": record.action,
      "type": record.type,
      "id": record.id,
      "cancelled": record.cancelled
    });
  }
  function isOnScreen(screenData, position) {
    return position !== null && position.x >= 0 && position.y >= 0 && position.x < screenData.width && position.y < screenData.height;
  }

  // plugins/pointer/listeners.js
  var EVENT_TYPES = ["pointerdown", "pointermove", "pointerup", "pointercancel"];
  var m_handlers = {};
  var m_tracked = /* @__PURE__ */ new WeakMap();
  var m_getScreenData = null;
  function setHandlers(kind, handlers, getScreenData) {
    m_handlers[kind] = handlers;
    m_getScreenData = getScreenData;
  }
  function track(screenData, kind) {
    let kinds = m_tracked.get(screenData);
    if (!kinds) {
      kinds = /* @__PURE__ */ new Set();
      m_tracked.set(screenData, kinds);
      for (const type of EVENT_TYPES) {
        screenData.canvas.addEventListener(type, onPointerEvent);
      }
    }
    kinds.add(kind);
  }
  function untrack(screenData, kind) {
    const kinds = m_tracked.get(screenData);
    if (!kinds) {
      return;
    }
    kinds.delete(kind);
    if (kinds.size === 0) {
      m_tracked.delete(screenData);
      for (const type of EVENT_TYPES) {
        screenData.canvas.removeEventListener(type, onPointerEvent);
      }
    }
  }
  function onPointerEvent(e) {
    const screenData = m_getScreenData(e);
    if (!screenData) {
      return;
    }
    let kind = "mouse";
    if (e.pointerType === "touch") {
      kind = "touch";
    }
    const kinds = m_tracked.get(screenData);
    if (!kinds || !kinds.has(kind)) {
      return;
    }
    const isAccepted = m_handlers[kind][e.type](screenData, e);
    if (e.type === "pointerdown" && isAccepted) {
      capturePointer(screenData.canvas, e.pointerId);
    }
  }
  function capturePointer(canvas, pointerId) {
    try {
      canvas.setPointerCapture(pointerId);
    } catch (error) {
    }
  }

  // plugins/pointer/touch.js
  var m_startTouchInternal = null;
  var NO_TOUCHES = Object.freeze([]);
  function startTouchInternal(screenData) {
    if (m_startTouchInternal) {
      m_startTouchInternal(screenData);
    }
  }
  function registerTouch(pluginApi, helpers) {
    const m_onevent = helpers.onevent;
    const m_offevent = helpers.offevent;
    const m_removeAllListeners = helpers.removeAllListeners;
    const m_triggerEventListeners2 = helpers.triggerEventListeners;
    let m_isVisibilityListening = false;
    const m_touchActions = /* @__PURE__ */ new WeakMap();
    pluginApi.addScreenDataItem("touchStopped", false);
    pluginApi.addScreenDataItem("touchStarted", false);
    pluginApi.addScreenDataItem("touches", {});
    pluginApi.addScreenDataItem("touchList", null);
    pluginApi.addScreenDataItem("primaryTouchId", null);
    pluginApi.addScreenDataItem("isPinchZoomEnabled", null);
    pluginApi.addScreenDataItem("touchPress", null);
    pluginApi.addScreenDataItem("onTouchEventListeners", {});
    pluginApi.addScreenInitFunction(initTouchData);
    pluginApi.addCommand("startTouch", startTouch, true, []);
    pluginApi.addCommand("stopTouch", stopTouch, true, []);
    pluginApi.addCommand("inTouch", inTouch, true, []);
    pluginApi.addCommand(
      "onTouch",
      onTouch,
      true,
      ["mode", "fn", "once", "hitBox", "customData"]
    );
    pluginApi.addCommand("offTouch", offTouch, true, ["mode", "fn"]);
    pluginApi.addCommand("setPinchZoom", setPinchZoom, true, ["isEnabled"]);
    function initTouchData(screenData) {
      screenData.touchList = NO_TOUCHES;
      screenData.onTouchEventListeners = {
        "down": [],
        "up": [],
        "move": []
      };
    }
    setHandlers("touch", {
      "pointerdown": touchStart,
      "pointermove": touchMove,
      "pointerup": (screenData, e) => endTouches(screenData, e, false),
      "pointercancel": (screenData, e) => endTouches(screenData, e, true)
    }, getScreenDataFromEvent);
    function startTouchInternal2(screenData) {
      if (!screenData.touchStopped) {
        startTouch(screenData);
      }
    }
    m_startTouchInternal = startTouchInternal2;
    function startTouch(screenData) {
      validatePointerTarget(screenData, "startTouch");
      screenData.touchStopped = false;
      if (!m_isVisibilityListening) {
        document.addEventListener("visibilitychange", onVisibilityChangeTouch);
        m_isVisibilityListening = true;
      }
      if (!screenData.touchStarted) {
        if (screenData.isPinchZoomEnabled === null) {
          m_touchActions.set(screenData, screenData.canvas.style.touchAction);
          screenData.canvas.style.touchAction = "none";
        }
        track(screenData, "touch");
        screenData.touchStarted = true;
      }
    }
    function stopTouch(screenData) {
      releaseHeldTouches(screenData);
      screenData.touchPress = null;
      if (screenData.press !== null && screenData.press.type === "touch") {
        screenData.press = null;
      }
      screenData.touchStopped = true;
      if (screenData.touchStarted) {
        untrack(screenData, "touch");
        if (m_touchActions.has(screenData)) {
          screenData.canvas.style.touchAction = m_touchActions.get(screenData);
          m_touchActions.delete(screenData);
        }
        screenData.touchStarted = false;
      }
    }
    function inTouch(screenData) {
      validatePointerTarget(screenData, "inTouch");
      startTouchInternal2(screenData);
      return screenData.touchList;
    }
    function onTouch(screenData, options) {
      validatePointerTarget(screenData, "onTouch");
      const mode = options.mode;
      const fn = options.fn;
      const once = options.once;
      const hitBox = options.hitBox;
      const customData = options.customData;
      checkRenamedMode(mode, "onTouch");
      m_onevent(
        mode,
        fn,
        once,
        hitBox,
        ["down", "up", "move"],
        "onTouch",
        screenData.onTouchEventListeners,
        customData
      );
      startTouchInternal2(screenData);
    }
    function offTouch(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      checkRenamedMode(mode, "offTouch");
      m_offevent(
        mode,
        fn,
        ["down", "up", "move"],
        "offTouch",
        screenData.onTouchEventListeners,
        "touch"
      );
    }
    function checkRenamedMode(mode, command) {
      const renamed = { "start": "down", "end": "up" };
      if (mode === "start" || mode === "end") {
        throwCode2(
          RangeError,
          `${command}: mode "${mode}" is now "${renamed[mode]}"; touch modes are down, up, and move.`,
          "INVALID_MODE"
        );
      }
    }
    function setPinchZoom(screenData, options) {
      validatePointerTarget(screenData, "setPinchZoom");
      const isEnabled = readIsEnabled("setPinchZoom", options.isEnabled);
      screenData.isPinchZoomEnabled = isEnabled;
      m_touchActions.delete(screenData);
      if (isEnabled) {
        screenData.canvas.style.touchAction = "pinch-zoom";
      } else {
        screenData.canvas.style.touchAction = "none";
      }
    }
    function touchStart(screenData, e) {
      let isIdle = true;
      for (const id in screenData.touches) {
        isIdle = false;
        break;
      }
      const changed = updateTouch(screenData, e, "down", false);
      if (isIdle && changed.length > 0) {
        screenData.primaryTouchId = changed[0].id;
      }
      if (changed.length === 0) {
        return false;
      }
      const primary = findTouch(changed, screenData.primaryTouchId);
      if (primary) {
        setTouchPress(screenData, primary, primary.action, 1);
      }
      updatePress(screenData);
      const pressData = screenData.press;
      m_triggerEventListeners2("down", changed, screenData.onTouchEventListeners);
      if (!isTracking(screenData)) {
        return false;
      }
      if (primary) {
        triggerPressListeners(screenData, "down", pressData);
        if (!isTracking(screenData)) {
          return false;
        }
      }
      for (const touch of changed) {
        triggerClickListeners(screenData, touch, "down", touch.id);
      }
      return true;
    }
    function touchMove(screenData, e) {
      const changed = updateTouch(screenData, e, "move", false);
      if (changed.length === 0) {
        return;
      }
      const primary = findTouch(changed, screenData.primaryTouchId);
      if (primary) {
        setTouchPress(screenData, primary, primary.action, 1);
      }
      updatePress(screenData);
      const pressData = screenData.press;
      m_triggerEventListeners2("move", changed, screenData.onTouchEventListeners);
      if (primary && isTracking(screenData)) {
        triggerPressListeners(screenData, "move", pressData);
      }
    }
    function endTouches(screenData, e, isCancelled) {
      const changed = updateTouch(screenData, e, "up", isCancelled);
      dispatchTouchRelease(screenData, changed, isCancelled);
    }
    function releaseHeldTouches(screenData) {
      const changed = [];
      for (const id in screenData.touches) {
        const touch = screenData.touches[id];
        changed.push(createPointerData({
          ...touch,
          "lastX": touch.x,
          "lastY": touch.y,
          "buttons": 0,
          "action": "up",
          "cancelled": true
        }));
      }
      if (changed.length === 0) {
        return;
      }
      screenData.touches = {};
      screenData.touchList = NO_TOUCHES;
      dispatchTouchRelease(screenData, Object.freeze(changed), true);
    }
    function dispatchTouchRelease(screenData, changed, isCancelled) {
      if (changed.length === 0) {
        return;
      }
      const primary = findTouch(changed, screenData.primaryTouchId);
      if (primary) {
        setTouchPress(screenData, primary, "up", 0);
        screenData.primaryTouchId = null;
      }
      updatePress(screenData);
      const pressData = screenData.press;
      m_triggerEventListeners2("up", changed, screenData.onTouchEventListeners);
      if (primary && isTracking(screenData)) {
        triggerPressListeners(screenData, "up", pressData);
      }
      if (screenData.isRemoved) {
        return;
      }
      if (!isTracking(screenData)) {
        isCancelled = true;
      }
      for (const touch of changed) {
        if (isCancelled) {
          triggerClickListeners(screenData, touch, "cancel", touch.id);
        } else {
          triggerClickListeners(screenData, touch, "up", touch.id);
        }
      }
    }
    function isTracking(screenData) {
      return !screenData.isRemoved && screenData.touchStarted === true;
    }
    function findTouch(touches, id) {
      for (const touch of touches) {
        if (touch.id === id) {
          return touch;
        }
      }
      return null;
    }
    function setTouchPress(screenData, touch, action, buttons) {
      screenData.touchPress = createPointerData({
        ...touch,
        "action": action,
        "buttons": buttons
      });
    }
    function updatePress(screenData) {
      if (screenData.touchPress !== null) {
        screenData.press = getTouchPress(screenData);
      }
    }
    function updateTouch(screenData, e, action, isCancelled) {
      const previous = screenData.touches[e.pointerId];
      let position = pointerPosition(screenData, e);
      if (action === "down") {
        if (!isOnScreen(screenData, position)) {
          return [];
        }
      } else if (!previous) {
        return [];
      } else if (!position) {
        position = previous;
      }
      let buttons = 1;
      if (action === "up") {
        buttons = 0;
      }
      let lastX = position.x;
      let lastY = position.y;
      if (previous) {
        lastX = previous.x;
        lastY = previous.y;
      }
      const touchData = createPointerData({
        "x": position.x,
        "y": position.y,
        "lastX": lastX,
        "lastY": lastY,
        "buttons": buttons,
        "action": action,
        "type": "touch",
        "id": e.pointerId,
        "cancelled": isCancelled
      });
      const newTouches = {};
      for (const id in screenData.touches) {
        newTouches[id] = screenData.touches[id];
      }
      if (action === "up") {
        delete newTouches[touchData.id];
      } else {
        newTouches[touchData.id] = touchData;
      }
      screenData.touches = newTouches;
      const touchList = [];
      for (const id in newTouches) {
        touchList.push(newTouches[id]);
      }
      screenData.touchList = Object.freeze(touchList);
      return Object.freeze([touchData]);
    }
    function getScreenDataFromEvent(e) {
      const screenId = e.target.dataset?.screenId;
      if (screenId === void 0) {
        return null;
      }
      return pluginApi.getScreenData("pointer-event", screenId);
    }
    function onVisibilityChangeTouch() {
      if (document.visibilityState !== "hidden") {
        return;
      }
      for (const screenData of pluginApi.getAllScreensData()) {
        if (screenData.touches) {
          releaseHeldTouches(screenData);
        }
      }
    }
    function clearTouchEvents(screenData) {
      m_removeAllListeners(screenData.onTouchEventListeners);
      screenData.onTouchEventListeners = {};
    }
    return {
      "stopTouch": stopTouch,
      "clearTouchEvents": clearTouchEvents
    };
  }

  // plugins/pointer/press.js
  function registerPress(pluginApi, helpers) {
    const onevent = helpers.onevent;
    const offevent = helpers.offevent;
    const removeAllListeners = helpers.removeAllListeners;
    m_triggerEventListeners = helpers.triggerEventListeners;
    m_triggerClickListeners = helpers.triggerClickListeners;
    pluginApi.addScreenDataItem("press", null);
    pluginApi.addScreenDataItem("onPressEventListeners", {});
    pluginApi.addScreenDataItem("onClickEventListeners", {});
    pluginApi.addScreenInitFunction(initPressData);
    pluginApi.addCommand("inPress", inPress, true, []);
    pluginApi.addCommand(
      "onPress",
      onPress,
      true,
      ["mode", "fn", "once", "hitBox", "customData"]
    );
    pluginApi.addCommand("offPress", offPress, true, ["mode", "fn"]);
    pluginApi.addCommand("onClick", onClick, true, ["fn", "once", "hitBox", "customData"]);
    pluginApi.addCommand("offClick", offClick, true, ["fn"]);
    function initPressData(screenData) {
      screenData.onPressEventListeners = {
        "down": [],
        "up": [],
        "move": []
      };
      screenData.onClickEventListeners = {
        "click": []
      };
    }
    function inPress(screenData) {
      validatePointerTarget(screenData, "inPress");
      startMouseInternal(screenData);
      startTouchInternal(screenData);
      return screenData.press;
    }
    function onPress(screenData, options) {
      validatePointerTarget(screenData, "onPress");
      const mode = options.mode;
      const fn = options.fn;
      const once = options.once;
      const hitBox = options.hitBox;
      const customData = options.customData;
      onevent(
        mode,
        fn,
        once,
        hitBox,
        ["down", "up", "move"],
        "onPress",
        screenData.onPressEventListeners,
        customData
      );
      startMouseInternal(screenData);
      startTouchInternal(screenData);
    }
    function offPress(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      offevent(
        mode,
        fn,
        ["down", "up", "move"],
        "offPress",
        screenData.onPressEventListeners,
        "press"
      );
    }
    function onClick(screenData, options) {
      validatePointerTarget(screenData, "onClick");
      const fn = options.fn;
      const once = options.once;
      let hitBox = options.hitBox;
      const customData = options.customData;
      if (hitBox == null) {
        hitBox = {
          "x": 0,
          "y": 0,
          "width": screenData.width,
          "height": screenData.height
        };
      }
      onevent(
        "click",
        fn,
        once,
        hitBox,
        ["click"],
        "onClick",
        screenData.onClickEventListeners,
        customData
      );
      startMouseInternal(screenData);
      startTouchInternal(screenData);
    }
    function offClick(screenData, options) {
      const fn = options.fn;
      offevent(
        "click",
        fn,
        ["click"],
        "offClick",
        screenData.onClickEventListeners,
        "click"
      );
    }
    function clearPressEvents(screenData) {
      removeAllListeners(screenData.onPressEventListeners);
      screenData.onPressEventListeners = {};
    }
    function clearClickEvents(screenData) {
      removeAllListeners(screenData.onClickEventListeners);
      screenData.onClickEventListeners = {};
    }
    return {
      "clearPressEvents": clearPressEvents,
      "clearClickEvents": clearClickEvents
    };
  }
  var m_triggerEventListeners = null;
  var m_triggerClickListeners = null;
  function triggerPressListeners(screenData, mode, data) {
    if (m_triggerEventListeners) {
      m_triggerEventListeners(mode, data, screenData.onPressEventListeners);
    }
  }
  function triggerClickListeners(screenData, data, action, pointerId) {
    if (m_triggerClickListeners) {
      if (action === "up") {
        data = createPointerData({ ...data, "action": "click" });
      }
      m_triggerClickListeners(data, screenData.onClickEventListeners, action, pointerId);
    }
  }
  var NO_TOUCHES2 = Object.freeze([]);
  function getMousePress(mouseData) {
    return Object.freeze({ ...mouseData, "touches": NO_TOUCHES2 });
  }
  function getTouchPress(screenData) {
    return Object.freeze({ ...screenData.touchPress, "touches": screenData.touchList });
  }

  // plugins/pointer/mouse.js
  var m_startMouseInternal = null;
  var BUTTON_BITS = [1, 4, 2, 8, 16];
  function startMouseInternal(screenData) {
    if (m_startMouseInternal) {
      m_startMouseInternal(screenData);
    }
  }
  function registerMouse(pluginApi, helpers) {
    const m_onevent = helpers.onevent;
    const m_offevent = helpers.offevent;
    const m_removeAllListeners = helpers.removeAllListeners;
    const m_triggerEventListeners2 = helpers.triggerEventListeners;
    const m_heldScreens = /* @__PURE__ */ new Set();
    let m_isVisibilityListening = false;
    pluginApi.addScreenDataItem("mouseStopped", false);
    pluginApi.addScreenDataItem("mouseStarted", false);
    pluginApi.addScreenDataItem("mouse", null);
    pluginApi.addScreenDataItem("isContextMenuEnabled", false);
    pluginApi.addScreenInitFunction(initContextMenu);
    pluginApi.addScreenDataItem("onMouseEventListeners", {
      "down": [],
      "up": [],
      "move": []
    });
    pluginApi.addCommand("startMouse", startMouse, true, []);
    pluginApi.addCommand("stopMouse", stopMouse, true, []);
    pluginApi.addCommand("inMouse", inMouse, true, []);
    pluginApi.addCommand("setContextMenu", setContextMenu, true, ["isEnabled"]);
    pluginApi.addCommand(
      "onMouse",
      onMouse,
      true,
      ["mode", "fn", "once", "hitBox", "customData"]
    );
    pluginApi.addCommand("offMouse", offMouse, true, ["mode", "fn"]);
    setHandlers("mouse", {
      "pointerdown": mouseDown,
      "pointermove": mouseMove,
      "pointerup": mouseUp,
      "pointercancel": releaseHeldMouse
    }, getScreenDataFromEvent);
    function startMouseInternal2(screenData) {
      if (screenData.mouseStopped === false) {
        startMouse(screenData);
      }
    }
    m_startMouseInternal = startMouseInternal2;
    function startMouse(screenData) {
      validatePointerTarget(screenData, "startMouse");
      screenData.mouseStopped = false;
      if (!m_isVisibilityListening) {
        document.addEventListener("visibilitychange", onVisibilityChangeMouse);
        m_isVisibilityListening = true;
      }
      if (!screenData.mouseStarted) {
        track(screenData, "mouse");
        screenData.mouseStarted = true;
      }
    }
    function stopMouse(screenData) {
      releaseHeldMouse(screenData);
      screenData.mouse = null;
      if (screenData.press !== null && screenData.press.type !== "touch") {
        screenData.press = null;
      }
      screenData.mouseStopped = true;
      if (screenData.mouseStarted) {
        untrack(screenData, "mouse");
        screenData.mouseStarted = false;
      }
    }
    function inMouse(screenData) {
      validatePointerTarget(screenData, "inMouse");
      startMouseInternal2(screenData);
      return screenData.mouse;
    }
    function initContextMenu(screenData) {
      if (screenData.isOffscreen || !screenData.canvas) {
        return;
      }
      screenData.canvas.addEventListener("contextmenu", onContextMenu);
    }
    function cleanupContextMenu(screenData) {
      if (screenData.isOffscreen || !screenData.canvas) {
        return;
      }
      screenData.canvas.removeEventListener("contextmenu", onContextMenu);
    }
    function setContextMenu(screenData, options) {
      validatePointerTarget(screenData, "setContextMenu");
      screenData.isContextMenuEnabled = readIsEnabled(
        "setContextMenu",
        options.isEnabled
      );
    }
    function onMouse(screenData, options) {
      validatePointerTarget(screenData, "onMouse");
      const mode = options.mode;
      const fn = options.fn;
      const once = options.once;
      const hitBox = options.hitBox;
      const customData = options.customData;
      m_onevent(
        mode,
        fn,
        once,
        hitBox,
        ["down", "up", "move"],
        "onMouse",
        screenData.onMouseEventListeners,
        customData
      );
      startMouseInternal2(screenData);
    }
    function offMouse(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      m_offevent(
        mode,
        fn,
        ["down", "up", "move"],
        "offMouse",
        screenData.onMouseEventListeners,
        "mouse"
      );
    }
    function clearMouseEvents(screenData) {
      m_removeAllListeners(screenData.onMouseEventListeners);
      screenData.onMouseEventListeners = {
        "down": [],
        "up": [],
        "move": []
      };
    }
    function mouseMove(screenData, e) {
      if (e.button >= 0) {
        const bit = BUTTON_BITS[e.button];
        if (bit !== void 0 && (e.buttons & bit) !== 0) {
          mouseDown(screenData, e);
        } else {
          mouseUp(screenData, e);
        }
        return;
      }
      if (!updateMouse(screenData, e, "move", getHeldButtons(screenData) & e.buttons)) {
        return;
      }
      updateHeld(screenData);
      const pressData = screenData.press;
      m_triggerEventListeners2("move", screenData.mouse, screenData.onMouseEventListeners);
      if (isTracking(screenData)) {
        triggerPressListeners(screenData, "move", pressData);
      }
    }
    function mouseDown(screenData, e) {
      if (!isOnScreen(screenData, pointerPosition(screenData, e))) {
        return false;
      }
      let bit = BUTTON_BITS[e.button];
      if (bit === void 0) {
        bit = 0;
      }
      updateMouse(screenData, e, "down", getHeldButtons(screenData) & e.buttons | bit);
      updateHeld(screenData);
      const mouseData = screenData.mouse;
      const pressData = screenData.press;
      m_triggerEventListeners2("down", mouseData, screenData.onMouseEventListeners);
      if (!isTracking(screenData)) {
        return false;
      }
      triggerPressListeners(screenData, "down", pressData);
      if (!isTracking(screenData)) {
        return false;
      }
      if (e.button === 0) {
        triggerClickListeners(screenData, mouseData, "down", "mouse");
      }
      return true;
    }
    function mouseUp(screenData, e) {
      const bit = BUTTON_BITS[e.button];
      if (bit === void 0 || (getHeldButtons(screenData) & bit) === 0) {
        return;
      }
      updateMouse(screenData, e, "up", screenData.mouse.buttons & e.buttons & ~bit);
      updateHeld(screenData);
      if (e.button === 0) {
        dispatchRelease(screenData, "up");
      } else {
        dispatchRelease(screenData, "cancel");
      }
    }
    function releaseHeldMouse(screenData) {
      if (getHeldButtons(screenData) === 0) {
        return;
      }
      const mouse = screenData.mouse;
      setMouse(screenData, {
        "x": mouse.x,
        "y": mouse.y,
        "lastX": mouse.x,
        "lastY": mouse.y,
        "buttons": 0,
        "action": "up",
        "type": mouse.type,
        "id": mouse.id,
        "cancelled": true
      });
      updateHeld(screenData);
      dispatchRelease(screenData, "cancel");
    }
    function dispatchRelease(screenData, clickAction) {
      const mouseData = screenData.mouse;
      const pressData = screenData.press;
      m_triggerEventListeners2("up", mouseData, screenData.onMouseEventListeners);
      if (isTracking(screenData)) {
        triggerPressListeners(screenData, "up", pressData);
      }
      if (screenData.isRemoved) {
        return;
      }
      if (!isTracking(screenData)) {
        clickAction = "cancel";
      }
      triggerClickListeners(screenData, mouseData, clickAction, "mouse");
    }
    function isTracking(screenData) {
      return !screenData.isRemoved && screenData.mouseStarted === true;
    }
    function getHeldButtons(screenData) {
      if (screenData.mouse === null) {
        return 0;
      }
      return screenData.mouse.buttons;
    }
    function updateHeld(screenData) {
      if (getHeldButtons(screenData) !== 0) {
        m_heldScreens.add(screenData);
      } else {
        m_heldScreens.delete(screenData);
      }
    }
    function onContextMenu(e) {
      const screenData = getScreenDataFromEvent(e);
      if (!screenData) {
        return;
      }
      if (!screenData.isContextMenuEnabled) {
        e.preventDefault();
        return false;
      }
    }
    function updateMouse(screenData, e, action, buttons) {
      let position = pointerPosition(screenData, e);
      if (!position) {
        position = screenData.mouse;
      }
      if (!position) {
        return false;
      }
      const { "x": x, "y": y } = position;
      let lastX = x;
      let lastY = y;
      if (screenData.mouse !== null) {
        lastX = screenData.mouse.x;
        lastY = screenData.mouse.y;
      }
      setMouse(screenData, {
        "x": x,
        "y": y,
        "lastX": lastX,
        "lastY": lastY,
        "buttons": buttons,
        "action": action,
        "type": getPointerType(e),
        "id": e.pointerId,
        "cancelled": false
      });
      return true;
    }
    function setMouse(screenData, record) {
      screenData.mouse = createPointerData(record);
      screenData.press = getMousePress(screenData.mouse);
    }
    function getPointerType(e) {
      if (e.pointerType === "pen") {
        return "pen";
      }
      return "mouse";
    }
    function getScreenDataFromEvent(e) {
      const screenId = e.target.dataset?.screenId;
      if (screenId === void 0) {
        return null;
      }
      return pluginApi.getScreenData("pointer-event", screenId);
    }
    function onVisibilityChangeMouse() {
      if (document.visibilityState !== "hidden") {
        return;
      }
      for (const screenData of Array.from(m_heldScreens)) {
        releaseHeldMouse(screenData);
      }
    }
    return {
      "stopMouse": stopMouse,
      "clearMouseEvents": clearMouseEvents,
      "cleanupContextMenu": cleanupContextMenu
    };
  }

  // plugins/pointer/wheel.js
  var DOM_DELTA_LINE = 1;
  var DOM_DELTA_PAGE = 2;
  var LINE_HEIGHT = 16;
  function registerWheel(pluginApi, helpers) {
    const m_onevent = helpers.onevent;
    const m_offevent = helpers.offevent;
    const m_removeAllListeners = helpers.removeAllListeners;
    const m_triggerEventListeners2 = helpers.triggerEventListeners;
    pluginApi.addScreenDataItem("onWheelEventListeners", {});
    pluginApi.addScreenDataItem("isWheelListening", false);
    pluginApi.addCommand("onWheel", onWheel, true, ["fn", "once", "hitBox", "customData"]);
    pluginApi.addCommand("offWheel", offWheel, true, ["fn"]);
    function onWheel(screenData, options) {
      validatePointerTarget(screenData, "onWheel");
      m_onevent(
        "wheel",
        options.fn,
        options.once,
        options.hitBox,
        ["wheel"],
        "onWheel",
        screenData.onWheelEventListeners,
        options.customData
      );
      updateListener(screenData);
    }
    function offWheel(screenData, options) {
      m_offevent(
        "wheel",
        options.fn,
        ["wheel"],
        "offWheel",
        screenData.onWheelEventListeners,
        "wheel"
      );
      updateListener(screenData);
    }
    function clearWheelEvents(screenData) {
      m_removeAllListeners(screenData.onWheelEventListeners);
      screenData.onWheelEventListeners = {};
      updateListener(screenData);
    }
    function updateListener(screenData) {
      const hasHandlers = screenData.onWheelEventListeners.wheel !== void 0;
      if (hasHandlers && !screenData.isWheelListening) {
        screenData.canvas.addEventListener("wheel", onWheelEvent, { "passive": false });
        screenData.isWheelListening = true;
      } else if (!hasHandlers && screenData.isWheelListening) {
        screenData.canvas.removeEventListener("wheel", onWheelEvent, { "passive": false });
        screenData.isWheelListening = false;
      }
    }
    function onWheelEvent(e) {
      const screenId = e.target.dataset?.screenId;
      if (screenId === void 0) {
        return;
      }
      const screenData = pluginApi.getScreenData("pointer-event", screenId);
      if (!screenData) {
        return;
      }
      if (screenData.onWheelEventListeners.wheel === void 0) {
        updateListener(screenData);
        return;
      }
      e.preventDefault();
      const position = pointerPosition(screenData, e);
      if (position === null) {
        return;
      }
      const scale = getDeltaScale(e.deltaMode);
      const data = Object.freeze({
        "x": position.x,
        "y": position.y,
        "deltaX": e.deltaX * scale.x,
        "deltaY": e.deltaY * scale.y
      });
      m_triggerEventListeners2("wheel", data, screenData.onWheelEventListeners);
      if (!screenData.isRemoved) {
        updateListener(screenData);
      }
    }
    return {
      "clearWheelEvents": clearWheelEvents
    };
  }
  function getDeltaScale(deltaMode) {
    if (deltaMode === DOM_DELTA_LINE) {
      return { "x": LINE_HEIGHT, "y": LINE_HEIGHT };
    }
    if (deltaMode === DOM_DELTA_PAGE) {
      return { "x": window.innerWidth, "y": window.innerHeight };
    }
    return { "x": 1, "y": 1 };
  }

  // plugins/pointer/index.js
  function pointerPlugin(pluginApi) {
    const helpers = createEventHelpers(pluginApi);
    const mouseApi = registerMouse(pluginApi, helpers);
    const touchApi = registerTouch(pluginApi, helpers);
    const pressApi = registerPress(pluginApi, helpers);
    const wheelApi = registerWheel(pluginApi, helpers);
    registerScreenClear(pluginApi, "mouse", mouseApi.clearMouseEvents);
    registerScreenClear(pluginApi, "touch", touchApi.clearTouchEvents);
    registerScreenClear(pluginApi, "press", pressApi.clearPressEvents);
    registerScreenClear(pluginApi, "click", pressApi.clearClickEvents);
    registerScreenClear(pluginApi, "wheel", wheelApi.clearWheelEvents);
    pluginApi.addScreenCleanupFunction((screenData) => {
      mouseApi.clearMouseEvents(screenData);
      touchApi.clearTouchEvents(screenData);
      pressApi.clearPressEvents(screenData);
      pressApi.clearClickEvents(screenData);
      wheelApi.clearWheelEvents(screenData);
      if (screenData.mouseStarted) {
        mouseApi.stopMouse(screenData);
      }
      if (screenData.touchStarted) {
        touchApi.stopTouch(screenData);
      }
      mouseApi.cleanupContextMenu(screenData);
    });
  }
  function registerScreenClear(pluginApi, type, clear) {
    pluginApi.registerClearEvents(type, (screenData) => {
      if (screenData !== null) {
        clear(screenData);
      } else {
        for (const eachScreenData of pluginApi.getAllScreensData()) {
          clear(eachScreenData);
        }
      }
    });
  }
  if (typeof window !== "undefined" && window.pi) {
    window.pi.registerPlugin({
      "name": "pointer",
      "version": "2.0.0",
      "description": "Mouse and touch input handling for Pi.js",
      "init": pointerPlugin
    });
  }
})();
//# sourceMappingURL=pointer.js.map
