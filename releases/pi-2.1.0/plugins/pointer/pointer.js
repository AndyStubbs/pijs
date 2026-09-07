/**
 * pointer - Mouse and touch input handling for Pi.js
 * @version 1.0.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
"use strict";
(() => {
  // plugins/pointer/shared-events.js
  function createEventHelpers(pluginApi) {
    const utils = pluginApi.utils;
    function onevent(mode, fn, once, hitBox, modes, name, listenerArr, extraId, extraData, customData) {
      let modeFound = false;
      for (let i = 0; i < modes.length; i++) {
        if (mode === modes[i]) {
          modeFound = true;
          break;
        }
      }
      if (!modeFound) {
        const error = new Error(
          `${name}: mode needs to be one of the following: ${modes.join(", ")}.`
        );
        error.code = "INVALID_MODE";
        throw error;
      }
      once = !!once;
      if (typeof fn !== "function") {
        const error = new Error(`${name}: fn is not a valid function.`);
        error.code = "INVALID_FUNCTION";
        throw error;
      }
      if (hitBox) {
        if (!Number.isInteger(hitBox.x) || !Number.isInteger(hitBox.y) || !Number.isInteger(hitBox.width) || !Number.isInteger(hitBox.height)) {
          const error = new Error(
            `${name}: hitBox must have properties x, y, width, and height whose values are integers.`
          );
          error.code = "INVALID_HITBOX";
          throw error;
        }
      }
      setTimeout(() => {
        const originalFn = fn;
        let newMode = mode;
        if (typeof extraId === "string") {
          newMode = mode + extraId;
        }
        let wrappedFn = fn;
        if (once) {
          wrappedFn = (data, customData2) => {
            offevent(mode, originalFn, modes, name, listenerArr, extraId);
            originalFn(data, customData2);
          };
        }
        if (!listenerArr[newMode]) {
          listenerArr[newMode] = [];
        }
        listenerArr[newMode].push({
          "fn": wrappedFn,
          "hitBox": hitBox,
          "extraData": extraData,
          "clickDown": false,
          "originalFn": originalFn,
          "customData": customData
        });
      }, 1);
      return true;
    }
    function offevent(mode, fn, modes, name, listenerArr, extraId) {
      let modeFound = false;
      for (let i = 0; i < modes.length; i++) {
        if (mode === modes[i]) {
          modeFound = true;
          break;
        }
      }
      if (!modeFound) {
        const error = new Error(
          `${name}: mode needs to be one of the following: ${modes.join(", ")}.`
        );
        error.code = "INVALID_MODE";
        throw error;
      }
      if (typeof extraId === "string") {
        mode += extraId;
      }
      const isClear = fn == null;
      if (!isClear && typeof fn !== "function") {
        const error = new Error(`${name}: fn is not a valid function.`);
        error.code = "INVALID_FUNCTION";
        throw error;
      }
      if (listenerArr[mode]) {
        if (isClear) {
          delete listenerArr[mode];
        } else {
          for (let i = listenerArr[mode].length - 1; i >= 0; i--) {
            if (listenerArr[mode][i].originalFn === fn) {
              listenerArr[mode].splice(i, 1);
            }
          }
          if (listenerArr[mode].length === 0) {
            delete listenerArr[mode];
          }
        }
        return true;
      }
      return false;
    }
    function triggerEventListeners(mode, data, listenerArr, clickStatus) {
      if (!listenerArr[mode]) {
        return;
      }
      const temp = listenerArr[mode].slice();
      for (let i = 0; i < temp.length; i++) {
        const listener = temp[i];
        if (clickStatus === "up" && !listener.clickDown) {
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
          } else {
            newData = data;
            if (utils.inRange(data, listener.hitBox)) {
              isHit = true;
            }
          }
          if (isHit) {
            if (clickStatus === "down") {
              listener.clickDown = true;
            } else {
              listener.clickDown = false;
              listener.fn(newData, listener.customData);
            }
          }
        } else {
          listener.fn(data, listener.customData);
        }
      }
    }
    return {
      "onevent": onevent,
      "offevent": offevent,
      "triggerEventListeners": triggerEventListeners
    };
  }

  // plugins/pointer/touch.js
  var m_startTouchInternal = null;
  function startTouchInternal(screenData) {
    if (m_startTouchInternal) {
      m_startTouchInternal(screenData);
    }
  }
  function registerTouch(pluginApi, helpers) {
    const m_onevent = helpers.onevent;
    const m_offevent = helpers.offevent;
    const m_triggerEventListeners2 = helpers.triggerEventListeners;
    pluginApi.addScreenDataItem("touchStopped", false);
    pluginApi.addScreenDataItem("touchStarted", false);
    pluginApi.addScreenDataItem("touches", {});
    pluginApi.addScreenDataItem("lastTouches", {});
    pluginApi.addScreenDataItem("touchEventListenersActive", 0);
    pluginApi.addScreenDataItem("onTouchEventListeners", {});
    pluginApi.addScreenInitFunction(initTouchData);
    window.addEventListener("blur", onWindowBlurTouch);
    pluginApi.addCommand("startTouch", startTouch, true, []);
    pluginApi.addCommand("stopTouch", stopTouch, true, []);
    pluginApi.addCommand("intouch", intouch, true, []);
    pluginApi.addCommand(
      "ontouch",
      ontouch,
      true,
      ["mode", "fn", "once", "hitBox", "customData"]
    );
    pluginApi.addCommand("offtouch", offtouch, true, ["mode", "fn"]);
    pluginApi.addCommand("setPinchZoom", setPinchZoom, false, ["isEnabled"]);
    function initTouchData(screenData) {
      screenData.onTouchEventListeners = {
        "start": [],
        "end": [],
        "move": []
      };
    }
    function startTouchInternal2(screenData) {
      if (!screenData.touchStopped) {
        startTouch(screenData);
      }
    }
    m_startTouchInternal = startTouchInternal2;
    function startTouch(screenData) {
      screenData.touchStopped = false;
      if (!screenData.touchStarted) {
        const options = { "passive": false };
        screenData.canvas.addEventListener("touchstart", touchStart, options);
        screenData.canvas.addEventListener("touchmove", touchMove, options);
        screenData.canvas.addEventListener("touchend", touchEnd, options);
        screenData.canvas.addEventListener("touchcancel", touchEnd, options);
        screenData.touchStarted = true;
      }
    }
    function stopTouch(screenData) {
      screenData.touchStopped = true;
      if (screenData.touchStarted) {
        screenData.canvas.removeEventListener("touchstart", touchStart);
        screenData.canvas.removeEventListener("touchmove", touchMove);
        screenData.canvas.removeEventListener("touchend", touchEnd);
        screenData.canvas.removeEventListener("touchcancel", touchEnd);
        screenData.touchStarted = false;
      }
    }
    function intouch(screenData) {
      startTouchInternal2(screenData);
      return getTouch(screenData);
    }
    function ontouch(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      const once = options.once;
      const hitBox = options.hitBox;
      const customData = options.customData;
      const isValid = m_onevent(
        mode,
        fn,
        once,
        hitBox,
        ["start", "end", "move"],
        "ontouch",
        screenData.onTouchEventListeners,
        null,
        null,
        customData
      );
      if (isValid) {
        startTouchInternal2(screenData);
        screenData.touchEventListenersActive += 1;
      }
    }
    function offtouch(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      const isValid = m_offevent(
        mode,
        fn,
        ["start", "end", "move"],
        "offtouch",
        screenData.onTouchEventListeners
      );
      if (isValid) {
        if (fn == null) {
          screenData.touchEventListenersActive = 0;
        } else {
          screenData.touchEventListenersActive -= 1;
          if (screenData.touchEventListenersActive < 0) {
            screenData.touchEventListenersActive = 0;
          }
        }
      }
    }
    function setPinchZoom(options) {
      const isEnabled = !!options.isEnabled;
      if (isEnabled) {
        document.body.style.touchAction = "";
      } else {
        document.body.style.touchAction = "none";
      }
    }
    function touchStart(e) {
      const screenData = getScreenDataFromEvent(e);
      if (screenData == null) {
        return;
      }
      updateTouch(screenData, e, "start");
      const touchData = getTouch(screenData);
      if (screenData.touchEventListenersActive > 0) {
        m_triggerEventListeners2("start", touchData, screenData.onTouchEventListeners);
      }
      triggerPressListeners(screenData, "down", getTouchPress(screenData));
      e.preventDefault();
      triggerClickListeners(screenData, getTouchPress(screenData), "down");
    }
    function touchMove(e) {
      const screenData = getScreenDataFromEvent(e);
      if (screenData == null) {
        return;
      }
      updateTouch(screenData, e, "move");
      const touchData = getTouch(screenData);
      if (screenData.touchEventListenersActive > 0) {
        m_triggerEventListeners2("move", touchData, screenData.onTouchEventListeners);
      }
      triggerPressListeners(screenData, "move", getTouchPress(screenData));
    }
    function touchEnd(e) {
      const screenData = getScreenDataFromEvent(e);
      if (screenData == null) {
        return;
      }
      updateTouch(screenData, e, "end");
      const touchData = getTouch(screenData);
      if (screenData.touchEventListenersActive > 0) {
        m_triggerEventListeners2("end", touchData, screenData.onTouchEventListeners);
      }
      triggerPressListeners(screenData, "up", getTouchPress(screenData));
      triggerClickListeners(screenData, getTouchPress(screenData), "up");
    }
    function updateTouch(screenData, e, action) {
      if (!screenData.clientRect) {
        return;
      }
      const newTouches = {};
      const rect = screenData.clientRect;
      for (let j = 0; j < e.touches.length; j++) {
        const touch = e.touches[j];
        const touchData = {};
        touchData.x = Math.floor(
          (touch.clientX - rect.left) / rect.width * screenData.width
        );
        touchData.y = Math.floor(
          (touch.clientY - rect.top) / rect.height * screenData.height
        );
        touchData.id = touch.identifier;
        if (screenData.touches[touchData.id]) {
          touchData.lastX = screenData.touches[touchData.id].x;
          touchData.lastY = screenData.touches[touchData.id].y;
        } else {
          touchData.lastX = null;
          touchData.lastY = null;
        }
        touchData.action = action;
        newTouches[touchData.id] = touchData;
      }
      screenData.lastTouches = screenData.touches;
      screenData.touches = newTouches;
      screenData.lastEvent = "touch";
    }
    function getTouch(screenData) {
      const touchArr = [];
      for (const i in screenData.touches) {
        const touch = screenData.touches[i];
        const touchData = {
          "x": touch.x,
          "y": touch.y,
          "id": touch.id,
          "lastX": touch.lastX,
          "lastY": touch.lastY,
          "action": touch.action,
          "type": "touch"
        };
        touchArr.push(touchData);
      }
      return touchArr;
    }
    function getScreenDataFromEvent(e) {
      const screenId = e.target.dataset?.screenId;
      if (screenId === void 0) {
        return null;
      }
      return pluginApi.getScreenData("touch-event", screenId);
    }
    function onWindowBlurTouch() {
      const allScreensData = pluginApi.getAllScreensData();
      for (const screenData of allScreensData) {
        screenData.lastTouches = screenData.touches;
        screenData.touches = {};
      }
    }
    function clearTouchEvents(screenData) {
      screenData.onTouchEventListeners = {};
      screenData.touchEventListenersActive = 0;
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
    const triggerEventListenersLocal = helpers.triggerEventListeners;
    m_triggerEventListeners = triggerEventListenersLocal;
    pluginApi.addScreenDataItem("pressEventListenersActive", 0);
    pluginApi.addScreenDataItem("onPressEventListeners", {});
    pluginApi.addScreenDataItem("clickEventListenersActive", 0);
    pluginApi.addScreenDataItem("onClickEventListeners", {});
    pluginApi.addScreenInitFunction(initPressData);
    pluginApi.addCommand("inpress", inpress, true, []);
    pluginApi.addCommand("onpress", onpress, true, ["mode", "fn", "once", "hitBox", "customData"]);
    pluginApi.addCommand("offpress", offpress, true, ["mode", "fn"]);
    pluginApi.addCommand("onclick", onclick, true, ["fn", "once", "hitBox", "customData"]);
    pluginApi.addCommand("offclick", offclick, true, ["fn"]);
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
    function inpress(screenData) {
      startMouseInternal(screenData);
      startTouchInternal(screenData);
      if (screenData.lastEvent === "touch") {
        return getTouchPress(screenData);
      } else {
        return screenData.api.inmouse();
      }
    }
    function onpress(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      const once = options.once;
      const hitBox = options.hitBox;
      const customData = options.customData;
      const isValid = onevent(
        mode,
        fn,
        once,
        hitBox,
        ["down", "up", "move"],
        "onpress",
        screenData.onPressEventListeners,
        null,
        null,
        customData
      );
      if (isValid) {
        startMouseInternal(screenData);
        startTouchInternal(screenData);
        screenData.pressEventListenersActive += 1;
      }
    }
    function offpress(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      const isValid = offevent(
        mode,
        fn,
        ["down", "up", "move"],
        "offpress",
        screenData.onPressEventListeners
      );
      if (isValid) {
        if (fn == null) {
          screenData.pressEventListenersActive = 0;
        } else {
          screenData.pressEventListenersActive -= 1;
          if (screenData.pressEventListenersActive < 0) {
            screenData.pressEventListenersActive = 0;
          }
        }
      }
    }
    function onclick(screenData, options) {
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
      const isValid = onevent(
        "click",
        fn,
        once,
        hitBox,
        ["click"],
        "onclick",
        screenData.onClickEventListeners,
        null,
        null,
        customData
      );
      if (isValid) {
        startMouseInternal(screenData);
        startTouchInternal(screenData);
        screenData.clickEventListenersActive += 1;
      }
    }
    function offclick(screenData, options) {
      const fn = options.fn;
      const isValid = offevent(
        "click",
        fn,
        ["click"],
        "offclick",
        screenData.onClickEventListeners
      );
      if (isValid) {
        if (fn == null) {
          screenData.clickEventListenersActive = 0;
        } else {
          screenData.clickEventListenersActive -= 1;
          if (screenData.clickEventListenersActive < 0) {
            screenData.clickEventListenersActive = 0;
          }
        }
      }
    }
    function clearPressEvents(screenData) {
      screenData.onPressEventListeners = {};
      screenData.pressEventListenersActive = 0;
    }
    function clearClickEvents(screenData) {
      screenData.onClickEventListeners = {};
      screenData.clickEventListenersActive = 0;
    }
    return {
      "clearPressEvents": clearPressEvents,
      "clearClickEvents": clearClickEvents
    };
  }
  var m_triggerEventListeners = null;
  function triggerPressListeners(screenData, mode, data) {
    if (screenData.pressEventListenersActive > 0 && m_triggerEventListeners) {
      m_triggerEventListeners(mode, data, screenData.onPressEventListeners);
    }
  }
  function triggerClickListeners(screenData, data, clickStatus) {
    if (screenData.clickEventListenersActive > 0 && m_triggerEventListeners) {
      m_triggerEventListeners("click", data, screenData.onClickEventListeners, clickStatus);
    }
  }
  function getTouchPress(screenData) {
    function copyTouches(touches, touchArr2, action) {
      for (const i in touches) {
        const touch = touches[i];
        const touchData = {
          "x": touch.x,
          "y": touch.y,
          "id": touch.id,
          "lastX": touch.lastX,
          "lastY": touch.lastY,
          "action": touch.action,
          "type": "touch"
        };
        if (action !== void 0) {
          touchData.action = action;
        }
        touchArr2.push(touchData);
      }
    }
    const touchArr = [];
    copyTouches(screenData.touches, touchArr);
    if (touchArr.length === 0) {
      copyTouches(screenData.lastTouches, touchArr, "up");
    }
    if (touchArr.length > 0) {
      const touchData = touchArr[0];
      if (touchData.action === "up") {
        touchData.buttons = 0;
      } else {
        touchData.buttons = 1;
      }
      touchData.touches = touchArr;
      return touchData;
    } else {
      return {
        "x": -1,
        "y": -1,
        "id": -1,
        "lastX": -1,
        "lastY": -1,
        "action": "none",
        "buttons": 0,
        "type": "touch"
      };
    }
  }

  // plugins/pointer/mouse.js
  var m_startMouseInternal = null;
  function startMouseInternal(screenData) {
    if (m_startMouseInternal) {
      m_startMouseInternal(screenData);
    }
  }
  function registerMouse(pluginApi, helpers) {
    const m_onevent = helpers.onevent;
    const m_offevent = helpers.offevent;
    const m_triggerEventListeners2 = helpers.triggerEventListeners;
    pluginApi.addScreenDataItem("mouseStopped", false);
    pluginApi.addScreenDataItem("mouseStarted", false);
    pluginApi.addScreenDataItem("mouse", null);
    pluginApi.addScreenDataItem("lastEvent", null);
    pluginApi.addScreenDataItem("isContextMenuEnabled", false);
    pluginApi.addScreenDataItem("mouseEventListenersActive", 0);
    pluginApi.addScreenDataItem("onMouseEventListeners", {
      "down": [],
      "up": [],
      "move": []
    });
    pluginApi.addScreenInitFunction(initMouseData);
    window.addEventListener("blur", onWindowBlurMouse);
    pluginApi.addCommand("startMouse", startMouse, true, []);
    pluginApi.addCommand("stopMouse", stopMouse, true, []);
    pluginApi.addCommand("inmouse", inmouse, true, []);
    pluginApi.addCommand("setEnableContextMenu", setEnableContextMenu, true, ["isEnabled"]);
    pluginApi.addCommand(
      "onmouse",
      onmouse,
      true,
      ["mode", "fn", "once", "hitBox", "customData"]
    );
    pluginApi.addCommand("offmouse", offmouse, true, ["mode", "fn"]);
    function initMouseData(screenData) {
      screenData.mouse = {
        "x": Math.floor(screenData.width / 2),
        "y": Math.floor(screenData.height / 2),
        "lastX": Math.floor(screenData.width / 2),
        "lastY": Math.floor(screenData.height / 2),
        "buttons": 0,
        "action": "none"
      };
    }
    function startMouseInternal2(screenData) {
      if (screenData.mouseStopped === false) {
        startMouse(screenData);
      }
    }
    m_startMouseInternal = startMouseInternal2;
    function startMouse(screenData) {
      screenData.mouseStopped = false;
      if (!screenData.mouseStarted) {
        screenData.canvas.addEventListener("mousemove", mouseMove);
        screenData.canvas.addEventListener("mousedown", mouseDown);
        screenData.canvas.addEventListener("mouseup", mouseUp);
        screenData.canvas.addEventListener("contextmenu", onContextMenu);
        screenData.mouseStarted = true;
      }
    }
    function stopMouse(screenData) {
      screenData.mouseStopped = true;
      if (screenData.mouseStarted) {
        screenData.canvas.removeEventListener("mousemove", mouseMove);
        screenData.canvas.removeEventListener("mousedown", mouseDown);
        screenData.canvas.removeEventListener("mouseup", mouseUp);
        screenData.canvas.removeEventListener("contextmenu", onContextMenu);
        screenData.mouseStarted = false;
      }
    }
    function getMouse(screenData) {
      const mouse = {};
      mouse.x = screenData.mouse.x;
      mouse.y = screenData.mouse.y;
      mouse.lastX = screenData.mouse.lastX;
      mouse.lastY = screenData.mouse.lastY;
      mouse.buttons = screenData.mouse.buttons;
      mouse.action = screenData.mouse.action;
      mouse.type = "mouse";
      return mouse;
    }
    function inmouse(screenData) {
      startMouseInternal2(screenData);
      return getMouse(screenData);
    }
    function setEnableContextMenu(screenData, options) {
      screenData.isContextMenuEnabled = !!options.isEnabled;
      startMouseInternal2(screenData);
    }
    function onmouse(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      const once = options.once;
      const hitBox = options.hitBox;
      const customData = options.customData;
      const isValid = m_onevent(
        mode,
        fn,
        once,
        hitBox,
        ["down", "up", "move"],
        "onmouse",
        screenData.onMouseEventListeners,
        null,
        null,
        customData
      );
      if (isValid) {
        startMouseInternal2(screenData);
        screenData.mouseEventListenersActive += 1;
      }
    }
    function offmouse(screenData, options) {
      const mode = options.mode;
      const fn = options.fn;
      const isValid = m_offevent(
        mode,
        fn,
        ["down", "up", "move"],
        "offmouse",
        screenData.onMouseEventListeners
      );
      if (isValid) {
        if (fn == null) {
          screenData.mouseEventListenersActive = 0;
        } else {
          screenData.mouseEventListenersActive -= 1;
          if (screenData.mouseEventListenersActive < 0) {
            screenData.mouseEventListenersActive = 0;
          }
        }
      }
    }
    function clearMouseEvents(screenData) {
      screenData.onMouseEventListeners = {
        "down": [],
        "up": [],
        "move": []
      };
      screenData.mouseEventListenersActive = 0;
    }
    function mouseMove(e) {
      const screenData = getScreenDataFromEvent(e);
      if (!screenData) {
        return;
      }
      updateMouse(screenData, e, "move");
      const mouseData = getMouse(screenData);
      if (screenData.mouseEventListenersActive > 0) {
        m_triggerEventListeners2("move", mouseData, screenData.onMouseEventListeners);
      }
      triggerPressListeners(screenData, "move", mouseData);
    }
    function mouseDown(e) {
      const screenData = getScreenDataFromEvent(e);
      if (!screenData) {
        return;
      }
      updateMouse(screenData, e, "down");
      const mouseData = getMouse(screenData);
      if (screenData.mouseEventListenersActive > 0) {
        m_triggerEventListeners2("down", mouseData, screenData.onMouseEventListeners);
      }
      triggerPressListeners(screenData, "down", mouseData);
      triggerClickListeners(screenData, mouseData, "down");
    }
    function mouseUp(e) {
      const screenData = getScreenDataFromEvent(e);
      if (!screenData) {
        return;
      }
      updateMouse(screenData, e, "up");
      const mouseData = getMouse(screenData);
      if (screenData.mouseEventListenersActive > 0) {
        m_triggerEventListeners2("up", mouseData, screenData.onMouseEventListeners);
      }
      triggerPressListeners(screenData, "up", mouseData);
      triggerClickListeners(screenData, mouseData, "up");
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
    function updateMouse(screenData, e, action) {
      const rect = screenData.clientRect;
      const x = Math.floor(
        e.offsetX / rect.width * screenData.width
      );
      const y = Math.floor(
        e.offsetY / rect.height * screenData.height
      );
      let lastX = x;
      let lastY = y;
      if (screenData.mouse) {
        if (screenData.mouse.x !== void 0) {
          lastX = screenData.mouse.x;
        }
        if (screenData.mouse.y !== void 0) {
          lastY = screenData.mouse.y;
        }
      }
      screenData.mouse = {
        "x": x,
        "y": y,
        "lastX": lastX,
        "lastY": lastY,
        "buttons": e.buttons,
        "action": action
      };
      screenData.lastEvent = "mouse";
    }
    function getScreenDataFromEvent(e) {
      const screenId = e.target.dataset?.screenId;
      if (screenId === void 0) {
        return null;
      }
      return pluginApi.getScreenData("mouse-event", screenId);
    }
    function onWindowBlurMouse() {
      const allScreensData = pluginApi.getAllScreensData();
      for (const screenData of allScreensData) {
        screenData.mouse.buttons = 0;
        screenData.mouse.action = "up";
      }
    }
    return {
      "stopMouse": stopMouse,
      "clearMouseEvents": clearMouseEvents
    };
  }

  // plugins/pointer/index.js
  function pointerPlugin(pluginApi) {
    const helpers = createEventHelpers(pluginApi);
    const mouseApi = registerMouse(pluginApi, helpers);
    const touchApi = registerTouch(pluginApi, helpers);
    const pressApi = registerPress(pluginApi, helpers);
    pluginApi.registerClearEvents("mouse", (screenData) => {
      if (screenData !== null) {
        mouseApi.clearMouseEvents(screenData);
      } else {
        const allScreensData = pluginApi.getAllScreensData();
        for (const sd of allScreensData) {
          mouseApi.clearMouseEvents(sd);
        }
      }
    });
    pluginApi.registerClearEvents("touch", (screenData) => {
      if (screenData !== null) {
        touchApi.clearTouchEvents(screenData);
      } else {
        const allScreensData = pluginApi.getAllScreensData();
        for (const sd of allScreensData) {
          touchApi.clearTouchEvents(sd);
        }
      }
    });
    pluginApi.registerClearEvents("press", (screenData) => {
      if (screenData !== null) {
        pressApi.clearPressEvents(screenData);
        pressApi.clearClickEvents(screenData);
      } else {
        const allScreensData = pluginApi.getAllScreensData();
        for (const sd of allScreensData) {
          pressApi.clearPressEvents(sd);
          pressApi.clearClickEvents(sd);
        }
      }
    });
    pluginApi.addScreenCleanupFunction((screenData) => {
      if (screenData.mouseStarted) {
        mouseApi.stopMouse(screenData);
      }
      if (screenData.touchStarted) {
        touchApi.stopTouch(screenData);
      }
      mouseApi.clearMouseEvents(screenData);
      touchApi.clearTouchEvents(screenData);
      pressApi.clearPressEvents(screenData);
      pressApi.clearClickEvents(screenData);
    });
  }
  if (typeof window !== "undefined" && window.pi) {
    window.pi.registerPlugin({
      "name": "pointer",
      "version": "1.0.0",
      "description": "Mouse and touch input handling for Pi.js",
      "init": pointerPlugin
    });
  }
})();
//# sourceMappingURL=pointer.js.map
