/**
 * sound - Music playback and sound effects using Web Audio API
 * @version 2.0.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */

// plugins/sound/envelope.js
var MIN_RAMP = 3e-3;
var STOP_FADE = 0.01;
var LN_10000 = Math.log(1e4);
function heldValueAt(env, t, peak) {
  if (t <= 0) {
    return 0;
  }
  if (t < env.attack) {
    return peak * t / env.attack;
  }
  const sustain = peak * env.sustain;
  return sustain + (peak - sustain) * Math.exp(-(t - env.attack) * LN_10000 / env.decay);
}
function resolveEnvelope(params) {
  return {
    "attack": Math.max(params.attackTime, MIN_RAMP),
    "decay": Math.max(params.decayTime, MIN_RAMP),
    "sustain": params.sustainLevel,
    "gate": params.duration,
    "release": Math.max(params.releaseTime, MIN_RAMP)
  };
}
function getEnvelopeLength(env) {
  return env.gate + env.release;
}
function envelopeValueAt(env, t, peak) {
  if (t <= 0 || t >= env.gate + env.release) {
    return 0;
  }
  if (t <= env.gate) {
    return heldValueAt(env, t, peak);
  }
  const gateValue = heldValueAt(env, env.gate, peak);
  return gateValue * Math.exp(-(t - env.gate) * LN_10000 / env.release);
}
function buildEnvelopeSchedule(env, start, peak, offset = 0) {
  const events = [];
  const attackEnd = start + env.attack;
  const gateEnd = start + env.gate;
  const end = gateEnd + env.release;
  const begin = start + offset;
  events.push({
    "type": "set",
    "time": begin,
    "value": envelopeValueAt(env, offset, peak)
  });
  if (offset < env.attack && offset < env.gate) {
    if (env.gate < env.attack) {
      events.push({
        "type": "linear",
        "time": gateEnd,
        "value": peak * env.gate / env.attack
      });
    } else {
      events.push({ "type": "linear", "time": attackEnd, "value": peak });
    }
  }
  if (env.gate > env.attack && offset < env.gate) {
    events.push({
      "type": "target",
      "time": Math.max(attackEnd, begin),
      "value": peak * env.sustain,
      "timeConstant": env.decay / LN_10000
    });
  }
  events.push({
    "type": "target",
    "time": Math.max(gateEnd, begin),
    "value": 0,
    "timeConstant": env.release / LN_10000
  });
  events.push({ "type": "set", "time": end, "value": 0 });
  return events;
}
function stopHoldEvent(env, start, peak, time) {
  const t = time - start;
  const value = envelopeValueAt(env, t, peak);
  if (t > 0 && t < env.attack && t < env.gate) {
    return { "type": "linear", "time": time, "value": value };
  }
  return { "type": "set", "time": time, "value": value };
}
function applySchedule(param, events) {
  for (const event of events) {
    if (event.type === "set") {
      param.setValueAtTime(event.value, event.time);
    } else if (event.type === "linear") {
      param.linearRampToValueAtTime(event.value, event.time);
    } else {
      param.setTargetAtTime(event.value, event.time, event.timeConstant);
    }
  }
}
function scheduleEnvelope(param, env, start, gateEnd, peak) {
  const resolved = resolveEnvelope({
    "duration": Math.max(gateEnd - start, 0),
    "attackTime": env.attackTime || 0,
    "decayTime": env.decayTime || 0,
    "sustainLevel": env.sustainLevel ?? 1,
    "releaseTime": env.releaseTime ?? 0.1
  });
  applySchedule(param, buildEnvelopeSchedule(resolved, start, peak));
  return start + getEnvelopeLength(resolved);
}
function rampValueAt(ramp, time) {
  if (time <= ramp.t0) {
    return ramp.from;
  }
  if (time >= ramp.t1) {
    return ramp.to;
  }
  return ramp.from + (ramp.to - ramp.from) * (time - ramp.t0) / (ramp.t1 - ramp.t0);
}

// plugins/sound/context.js
var BUS_NAMES = ["sfx", "music", "audio"];
var QUANTUM_FRAMES = 128;
var MIN_SCHEDULE_LEAD_QUANTA = 2;
var MASTER_TIME_CONSTANT = 0.015;
var BUS_RAMP = 0.01;
var COMPRESSOR_SETTINGS = {
  "threshold": -4,
  "knee": 0,
  "ratio": 20,
  "attack": 1e-3,
  "release": 0.2
};
var COMPRESSOR_STARTUP_RELEASE = 1e-3;
var COMPRESSOR_SETTLE = 0.05;
var PROBE_BELOW_THRESHOLD = 6;
var PROBE_TOLERANCE = 1;
var PROBE_FRAMES = 48e3;
var PROBE_SAMPLE_RATE = 48e3;
var PROBE_TAIL_FRAMES = 4800;
var LIMITER_HEADROOM = 4;
var LIMITER_KNEE = 0.9;
var LIMITER_CURVE_POINTS = 8001;
var UNLOCK_EVENTS = ["pointerdown", "keydown", "touchend"];
var m_audioContext = null;
var m_volume = 0.75;
var m_limiterEnabled = true;
var m_compressorUsable = true;
var m_probeStarted = false;
var m_graph = null;
var m_busVolumes = { "sfx": 1, "music": 1, "audio": 1 };
var m_unlockArmed = false;
var m_resumeRequested = false;
var m_unlockCallbacks = [];
function createClipperCurve() {
  const curve = new Float32Array(LIMITER_CURVE_POINTS);
  const center = (LIMITER_CURVE_POINTS - 1) / 2;
  const step = LIMITER_HEADROOM / center;
  const range = 1 - LIMITER_KNEE;
  for (let i = 0; i < LIMITER_CURVE_POINTS; i++) {
    const x = (i - center) * step;
    const magnitude = Math.abs(x);
    let y = magnitude;
    if (magnitude > LIMITER_KNEE) {
      y = LIMITER_KNEE + range * Math.tanh((magnitude - LIMITER_KNEE) / range);
    }
    if (x < 0) {
      y = -y;
    }
    curve[i] = y;
  }
  return curve;
}
function getMakeupGain() {
  const fullRangeDb = COMPRESSOR_SETTINGS.threshold * (1 - 1 / COMPRESSOR_SETTINGS.ratio);
  return Math.pow(10, -0.6 * fullRangeDb / 20);
}
function createCompressor(context) {
  const compressor = context.createDynamicsCompressor();
  for (const name in COMPRESSOR_SETTINGS) {
    compressor[name].value = COMPRESSOR_SETTINGS[name];
  }
  return compressor;
}
function createGraph(context) {
  const masterInput = context.createGain();
  const masterGain = context.createGain();
  masterGain.gain.value = m_volume;
  masterInput.connect(masterGain);
  const compressor = createCompressor(context);
  compressor.release.value = COMPRESSOR_STARTUP_RELEASE;
  compressor.release.setValueAtTime(COMPRESSOR_SETTINGS.release, COMPRESSOR_SETTLE);
  const makeupTrim = context.createGain();
  makeupTrim.gain.value = 1 / getMakeupGain();
  const clipperGain = context.createGain();
  clipperGain.gain.value = 1 / LIMITER_HEADROOM;
  const clipper = context.createWaveShaper();
  clipper.curve = createClipperCurve();
  clipper.oversample = "none";
  compressor.connect(makeupTrim);
  makeupTrim.connect(clipperGain);
  clipperGain.connect(clipper);
  const output = context.createGain();
  output.connect(context.destination);
  clipper.connect(output);
  const buses = {};
  for (const name of BUS_NAMES) {
    const input = context.createGain();
    const output2 = context.createGain();
    output2.gain.value = m_busVolumes[name];
    input.connect(output2);
    output2.connect(masterInput);
    buses[name] = {
      "input": input,
      "insert": null,
      "output": output2,
      "ramp": null
    };
  }
  return {
    "buses": buses,
    "master": { "input": masterInput, "insert": null, "output": masterGain },
    "output": { "output": output },
    "masterInput": masterInput,
    "masterGain": masterGain,
    "masterRoute": null,
    "compressor": compressor,
    "clipperGain": clipperGain
  };
}
function routeMaster() {
  const masterGain = m_graph.masterGain;
  let target;
  if (!m_limiterEnabled) {
    target = m_graph.output.output;
  } else if (m_compressorUsable) {
    target = m_graph.compressor;
  } else {
    target = m_graph.clipperGain;
  }
  if (m_graph.masterRoute !== target) {
    if (m_graph.masterRoute) {
      masterGain.disconnect(m_graph.masterRoute);
    }
    masterGain.connect(target);
    m_graph.masterRoute = target;
  }
}
function getBusStage(bus) {
  getAudioContext();
  if (bus === "master" || bus === "output") {
    return m_graph[bus];
  }
  return m_graph.buses[bus];
}
function probeCompressor() {
  if (m_probeStarted || typeof OfflineAudioContext !== "function") {
    return;
  }
  m_probeStarted = true;
  try {
    const context = new OfflineAudioContext(1, PROBE_FRAMES, PROBE_SAMPLE_RATE);
    const levelDb = COMPRESSOR_SETTINGS.threshold - PROBE_BELOW_THRESHOLD;
    const level = Math.pow(10, levelDb / 20);
    const oscillator = context.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.value = 440;
    const gain = context.createGain();
    gain.gain.value = level;
    const compressor = createCompressor(context);
    oscillator.connect(gain);
    gain.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);
    context.startRendering().then((buffer) => {
      oscillator.disconnect();
      const data = buffer.getChannelData(0);
      let peak = 0;
      for (let i = data.length - PROBE_TAIL_FRAMES; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
      }
      const expected = level * getMakeupGain() * Math.pow(10, -PROBE_TOLERANCE / 20);
      m_compressorUsable = peak >= expected;
      if (m_audioContext) {
        routeMaster();
      }
    }, () => {
    });
  } catch (error) {
  }
}
function setAudioSession() {
  try {
    if (typeof navigator !== "undefined" && navigator.audioSession) {
      navigator.audioSession.type = "ambient";
    }
  } catch (error) {
  }
}
function runUnlockCallbacks() {
  const callbacks = m_unlockCallbacks.splice(0, m_unlockCallbacks.length);
  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      console.error("sound: Deferred start failed:", error);
    }
  }
}
function hasUserActivation() {
  return typeof navigator !== "undefined" && !!navigator.userActivation && navigator.userActivation.isActive === true;
}
function handleUnlockGesture() {
  if (m_audioContext.state === "running") {
    disarmUnlock();
    runUnlockCallbacks();
    return;
  }
  m_resumeRequested = true;
  try {
    const result = m_audioContext.resume();
    if (result && typeof result.catch === "function") {
      result.catch(() => {
      });
    }
  } catch (error) {
  }
  runUnlockCallbacks();
}
function armUnlock() {
  if (m_unlockArmed || typeof document === "undefined") {
    return;
  }
  m_unlockArmed = true;
  for (const type of UNLOCK_EVENTS) {
    document.addEventListener(
      type,
      handleUnlockGesture,
      { "capture": true, "passive": true }
    );
  }
}
function disarmUnlock() {
  if (!m_unlockArmed) {
    return;
  }
  m_unlockArmed = false;
  for (const type of UNLOCK_EVENTS) {
    document.removeEventListener(type, handleUnlockGesture, { "capture": true });
  }
}
function handleStateChange() {
  const state = m_audioContext.state;
  if (state === "running") {
    m_resumeRequested = false;
    disarmUnlock();
    runUnlockCallbacks();
  } else if (state === "suspended" || state === "interrupted") {
    m_resumeRequested = false;
    armUnlock();
  }
}
function getAudioContext() {
  if (!m_audioContext) {
    m_audioContext = new AudioContext();
    setAudioSession();
    m_graph = createGraph(m_audioContext);
    routeMaster();
    m_audioContext.addEventListener("statechange", handleStateChange);
    if (m_audioContext.state !== "running") {
      armUnlock();
      if (hasUserActivation()) {
        handleUnlockGesture();
      }
    }
  }
  return m_audioContext;
}
function startLimiterProbe() {
  probeCompressor();
}
function getBusInput(bus) {
  getAudioContext();
  return m_graph.buses[bus].input;
}
function setBusInsert(bus, insert) {
  const stage = getBusStage(bus);
  const previous = stage.insert;
  if (previous === insert) {
    return;
  }
  if (previous) {
    for (const [from, to] of [
      [stage.input, previous.input],
      [previous.output, stage.output]
    ]) {
      try {
        from.disconnect(to);
      } catch (caughtError) {
      }
    }
    stage.input.connect(stage.output);
    stage.insert = null;
  }
  if (insert) {
    stage.input.disconnect(stage.output);
    stage.input.connect(insert.input);
    insert.output.connect(stage.output);
    stage.insert = insert;
  }
  if (previous) {
    try {
      previous.dispose();
    } catch (error) {
      console.error("sound: Bus insert cleanup failed:", error);
    }
  }
}
function tapBus(bus, node) {
  const output = getBusStage(bus).output;
  output.connect(node);
  let tapped = true;
  return () => {
    if (!tapped) {
      return;
    }
    tapped = false;
    try {
      output.disconnect(node);
    } catch (caughtError) {
    }
  };
}
function getScheduleLead() {
  const context = getAudioContext();
  const quantum = QUANTUM_FRAMES / context.sampleRate;
  const lead = Math.max(MIN_SCHEDULE_LEAD_QUANTA * quantum, context.baseLatency || 0);
  return Math.ceil((context.currentTime + lead) / quantum - 1e-6) * quantum;
}
function setMasterVolume(volume) {
  m_volume = volume;
  if (!m_audioContext) {
    return;
  }
  const lead = getScheduleLead();
  const gain = m_graph.masterGain.gain;
  gain.cancelScheduledValues(lead);
  gain.setTargetAtTime(volume, lead, MASTER_TIME_CONSTANT);
}
function setBusOutputVolume(bus, volume) {
  m_busVolumes[bus] = volume;
  if (!m_audioContext) {
    return;
  }
  const busNodes = m_graph.buses[bus];
  const gain = busNodes.output.gain;
  const lead = getScheduleLead();
  let current = gain.value;
  let holdType = "set";
  if (busNodes.ramp) {
    current = rampValueAt(busNodes.ramp, lead);
    if (lead > busNodes.ramp.t0 && lead < busNodes.ramp.t1) {
      holdType = "linear";
    }
  }
  gain.cancelScheduledValues(lead);
  if (holdType === "linear") {
    gain.linearRampToValueAtTime(current, lead);
  } else {
    gain.setValueAtTime(current, lead);
  }
  gain.linearRampToValueAtTime(volume, lead + BUS_RAMP);
  busNodes.ramp = { "from": current, "to": volume, "t0": lead, "t1": lead + BUS_RAMP };
}
function setLimiterEnabled(enabled) {
  m_limiterEnabled = enabled;
  if (m_audioContext) {
    routeMaster();
  }
}
function isLocked() {
  const context = getAudioContext();
  return context.state !== "running" && !m_resumeRequested;
}
function onUnlock(callback) {
  m_unlockCallbacks.push(callback);
}
function cancelUnlock(callback) {
  const index = m_unlockCallbacks.indexOf(callback);
  if (index > -1) {
    m_unlockCallbacks.splice(index, 1);
  }
}

// plugins/sound/scheduler.js
var BASE_WINDOW = 0.2;
var HIDDEN_WINDOW = 2;
var TICK = 0.025;
var LATE_GRACE = 0.025;
var FILL_HEADROOM = 16;
var MAX_PENDING_SOUNDS = 1024;
var m_pending = [];
var m_streams = [];
var m_timer = null;
var m_visibilityListener = false;
var m_canFill = () => true;
function tick() {
  processPending(getAudioContext().currentTime);
  if (m_pending.length === 0 && m_streams.length === 0 && m_timer !== null) {
    clearInterval(m_timer);
    m_timer = null;
  }
}
function handleVisibilityChange() {
  if (document.hidden && m_timer !== null) {
    tick();
  }
}
function ensureTimer() {
  if (m_timer === null && (m_pending.length > 0 || m_streams.length > 0)) {
    m_timer = setInterval(tick, TICK * 1e3);
    if (!m_visibilityListener && typeof document !== "undefined") {
      m_visibilityListener = true;
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
  }
}
function nextStream() {
  let best = null;
  let bestStart = Infinity;
  for (const stream of m_streams) {
    const start = stream.peek();
    if (start < bestStart) {
      best = stream;
      bestStart = start;
    }
  }
  return best;
}
function runItem(run) {
  try {
    run();
  } catch (error) {
    console.error("sound: Scheduled start failed:", error);
  }
}
function setFillProbe(canFill) {
  m_canFill = canFill;
}
function getWindow() {
  if (typeof document !== "undefined" && document.hidden) {
    return HIDDEN_WINDOW;
  }
  return BASE_WINDOW;
}
function shouldCreate(start, now) {
  const ahead = start - now;
  if (ahead <= BASE_WINDOW) {
    return true;
  }
  return ahead <= getWindow() && m_canFill();
}
function addPending(item, commandName) {
  if (m_pending.length >= MAX_PENDING_SOUNDS) {
    const error = new RangeError(
      `${commandName}: Too many pending sounds; at most ${MAX_PENDING_SOUNDS} delayed requests can wait at once.`
    );
    error.code = "TOO_MANY_PENDING_SOUNDS";
    throw error;
  }
  let index = m_pending.length;
  while (index > 0 && m_pending[index - 1].start > item.start) {
    index -= 1;
  }
  m_pending.splice(index, 0, item);
  ensureTimer();
}
function removePending(id) {
  const index = m_pending.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }
  m_pending.splice(index, 1);
  return true;
}
function clearPending(kind) {
  for (let i = m_pending.length - 1; i >= 0; i--) {
    if (m_pending[i].kind === kind) {
      m_pending.splice(i, 1);
    }
  }
}
function addStream(stream) {
  m_streams.push(stream);
  processPending(getAudioContext().currentTime);
  ensureTimer();
}
function removeStream(id) {
  const index = m_streams.findIndex((stream) => stream.id === id);
  if (index === -1) {
    return false;
  }
  m_streams.splice(index, 1);
  return true;
}
function processPending(now) {
  while (true) {
    const stream = nextStream();
    let start = Infinity;
    if (stream !== null) {
      start = stream.peek();
    }
    if (m_pending.length > 0 && m_pending[0].start <= start) {
      if (!shouldCreate(m_pending[0].start, now)) {
        break;
      }
      runItem(m_pending.shift().run);
    } else if (stream !== null && shouldCreate(start, now)) {
      runItem(stream.take);
    } else {
      break;
    }
  }
  for (let i = m_streams.length - 1; i >= 0; i--) {
    const stream = m_streams[i];
    if (stream.isDone()) {
      m_streams.splice(i, 1);
      runItem(stream.onDone);
    }
  }
}

// plugins/sound/noise.js
var NOISE_TYPES = ["white", "pink"];
var NOISE_SECONDS = 2;
var SEAM_SECONDS = 0.01;
var PINK_WARMUP = 4800;
var NOISE_RMS = 1 / Math.sqrt(3);
var KNEE = 0.8;
var LEVEL_PASSES = 3;
var m_context = null;
var m_buffers = {};
function createGenerator(type) {
  if (type === "white") {
    return () => Math.random() * 2 - 1;
  }
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  return () => {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    return pink;
  };
}
function rms(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}
function softLimit(sample) {
  const size = Math.abs(sample);
  if (size <= KNEE) {
    return sample;
  }
  const bent = KNEE + (1 - KNEE) * Math.tanh((size - KNEE) / (1 - KNEE));
  return Math.sign(sample) * bent;
}
function createNoiseBuffer(context, type) {
  const length = Math.round(NOISE_SECONDS * context.sampleRate);
  const seam = Math.round(SEAM_SECONDS * context.sampleRate);
  const next = createGenerator(type);
  if (type === "pink") {
    for (let i = 0; i < PINK_WARMUP; i++) {
      next();
    }
  }
  const raw = new Float32Array(length + seam);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = next();
  }
  const data = raw.subarray(0, length);
  for (let i = 0; i < seam; i++) {
    const angle = (i + 0.5) / seam * Math.PI / 2;
    data[i] = data[i] * Math.sin(angle) + raw[length + i] * Math.cos(angle);
  }
  const leveled = new Float32Array(length);
  let gain = NOISE_RMS / rms(data);
  for (let pass = 0; pass < LEVEL_PASSES; pass++) {
    if (pass > 0) {
      gain *= NOISE_RMS / rms(leveled);
    }
    for (let i = 0; i < length; i++) {
      leveled[i] = softLimit(data[i] * gain);
    }
  }
  const buffer = context.createBuffer(1, length, context.sampleRate);
  buffer.copyToChannel(leveled, 0);
  return buffer;
}
function isNoiseType(type) {
  return NOISE_TYPES.indexOf(type) !== -1;
}
function createNoiseSource(context, type) {
  if (m_context !== context) {
    m_context = context;
    m_buffers = {};
  }
  if (!m_buffers[type]) {
    m_buffers[type] = createNoiseBuffer(context, type);
  }
  const source = context.createBufferSource();
  source.buffer = m_buffers[type];
  source.loop = true;
  return {
    "source": source,
    "offset": Math.random() * NOISE_SECONDS
  };
}

// plugins/sound/voices.js
var MAX_VOICES = 64;
var MAX_LIVE_VOICES = 128;
var OSCILLATOR_TYPES = ["triangle", "sine", "square", "sawtooth"];
var CAPACITY_WARNING_INTERVAL = 1e3;
var VOICE_BUSES = ["sfx", "music"];
var m_voices = /* @__PURE__ */ new Map();
var m_sources = /* @__PURE__ */ new Map();
var m_utils = null;
var m_nextSoundId = 0;
var m_nextOrder = 0;
var m_lastCapacityWarning = -Infinity;
setFillProbe(
  () => countLiveVoices() < MAX_LIVE_VOICES - FILL_HEADROOM
);
function countLiveVoices() {
  return m_voices.size;
}
function stopInserts(voice, when) {
  for (const insert of voice.inserts) {
    insert.stop(when);
  }
}
function disposeInserts(inserts) {
  for (const insert of inserts.splice(0, inserts.length)) {
    try {
      insert.dispose();
    } catch (error) {
      console.error("sound: Insert cleanup failed:", error);
    }
  }
}
function disconnectNodes(voice) {
  for (const node of voice.nodes) {
    try {
      node.disconnect();
    } catch (caughtError) {
    }
  }
  for (const link of voice.links.splice(0, voice.links.length)) {
    try {
      link.node.disconnect(link.param);
    } catch (caughtError) {
    }
  }
}
function disposeVoiceParts(voice) {
  disposeInserts(voice.inserts);
  const disposeSource = voice.disposeSource;
  if (disposeSource) {
    voice.disposeSource = null;
    try {
      disposeSource();
    } catch (error) {
      console.error("sound: Source cleanup failed:", error);
    }
  }
}
function throwCode(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function validateInsert(insert, label) {
  if (!hasMembers(insert, ["input", "output"], ["start", "stop", "dispose"]) || insert.detune != null && !(insert.detune instanceof AudioNode)) {
    throwCode(
      TypeError,
      label + " must provide input, output, start, stop, and dispose.",
      "INVALID_INSERT"
    );
  }
}
function warnCapacity() {
  const now = Date.now();
  if (now - m_lastCapacityWarning >= CAPACITY_WARNING_INTERVAL) {
    m_lastCapacityWarning = now;
    console.warn("sound: Voice capacity reached; a new sound was not played.");
  }
}
function disposeVoice(voice) {
  if (voice.disposed) {
    return;
  }
  voice.disposed = true;
  disconnectNodes(voice);
  m_voices.delete(voice.id);
  disposeVoiceParts(voice);
  if (voice.onDispose) {
    try {
      voice.onDispose(voice);
    } catch (error) {
      console.error("sound: Voice cleanup failed:", error);
    }
  }
}
function hardStop(voice) {
  try {
    voice.source.stop();
  } catch (caughtError) {
  }
  try {
    stopInserts(voice, getAudioContext().currentTime);
  } catch (error) {
    console.error("sound: Insert stop failed:", error);
  }
  disposeVoice(voice);
}
function schedulePitch(param, spec, begin, offset) {
  const env = spec.env;
  if (spec.frequencyEnd != null) {
    let frequency = spec.frequency;
    if (offset > 0 && env.gate > 0) {
      const progress = Math.min(offset / env.gate, 1);
      const ratio = spec.frequencyEnd / spec.frequency;
      frequency = spec.frequency * Math.pow(ratio, progress);
    }
    param.setValueAtTime(frequency, begin);
    if (spec.start + env.gate > begin) {
      param.exponentialRampToValueAtTime(spec.frequencyEnd, spec.start + env.gate);
    }
  } else {
    param.value = spec.frequency;
  }
}
function createOscillator(context, spec, begin, offset) {
  const source = context.createOscillator();
  if (spec.oType === "custom") {
    source.setPeriodicWave(
      context.createPeriodicWave(spec.waveTables[0], spec.waveTables[1])
    );
  } else {
    source.type = spec.oType;
  }
  schedulePitch(source.frequency, spec, begin, offset);
  return source;
}
function createRegisteredSource(context, spec, voice, offset) {
  const factory = m_sources.get(spec.oType);
  const source = factory(context, Object.freeze({
    "oType": spec.oType,
    "frequency": spec.frequency,
    "frequencyEnd": spec.frequencyEnd,
    "start": spec.start,
    "gate": spec.env.gate,
    "end": voice.end,
    "offset": offset
  }));
  if (source && typeof source.dispose === "function") {
    voice.disposeSource = () => {
      source.dispose();
    };
  }
  if (!hasMembers(source, ["output"], ["start", "stop", "onEnded", "dispose"])) {
    throwCode(
      TypeError,
      'sound: Source factory for "' + spec.oType + '" must return output, start, stop, onEnded, and dispose.',
      "INVALID_SOURCE"
    );
  }
  let started = false;
  voice.source = {
    "start": (when) => {
      started = true;
      source.start(when);
    },
    "stop": (when) => {
      if (started) {
        source.stop(when ?? context.currentTime);
      }
    }
  };
  if (source.frequency) {
    schedulePitch(source.frequency, spec, voice.begin, offset);
  }
  source.onEnded(() => {
    disposeVoice(voice);
  });
  return source;
}
function buildVoice(spec, soundId) {
  const context = getAudioContext();
  const env = spec.env;
  const offset = spec.offset || 0;
  const begin = spec.start + offset;
  const end = spec.start + getEnvelopeLength(env);
  let peak = spec.peak;
  if (spec.pan) {
    peak *= panGain(spec.pan);
  }
  const voice = createVoiceRecord({
    "id": soundId,
    "start": spec.start,
    "begin": begin,
    "end": end,
    "env": env,
    "peak": peak,
    "onDispose": spec.onDispose || null
  });
  try {
    let output;
    let detune = null;
    let startSource;
    if (m_sources.has(spec.oType)) {
      const registered = createRegisteredSource(context, spec, voice, offset);
      output = registered.output;
      if (registered.detune instanceof AudioParam) {
        detune = registered.detune;
      }
      startSource = () => {
        voice.source.start(begin);
        voice.source.stop(end);
      };
    } else {
      let source;
      let sourceOffset = null;
      if (isNoiseType(spec.oType)) {
        const noise = createNoiseSource(context, spec.oType);
        source = noise.source;
        sourceOffset = noise.offset;
      } else {
        source = createOscillator(context, spec, begin, offset);
        detune = source.detune;
      }
      voice.source = source;
      voice.nodes.push(source);
      output = source;
      startSource = () => {
        source.onended = () => {
          disposeVoice(voice);
        };
        if (sourceOffset === null) {
          source.start(begin);
        } else {
          source.start(begin, sourceOffset);
        }
        source.stop(end);
      };
    }
    if (spec.inserts) {
      for (const descriptor of spec.inserts) {
        const insert = descriptor.factory(context, descriptor.params);
        if (insert && typeof insert.dispose === "function") {
          voice.inserts.push(insert);
        }
        validateInsert(insert, "sound: Voice insert");
        output.connect(insert.input);
        output = insert.output;
        if (insert.detune && detune) {
          insert.detune.connect(detune);
          voice.links.push({ "node": insert.detune, "param": detune });
        }
        insert.start(begin, spec.start + env.gate);
        insert.stop(end);
      }
    }
    if (offset > 0) {
      const onset = context.createGain();
      voice.nodes.push(onset);
      onset.gain.value = 0;
      onset.gain.setValueAtTime(0, begin);
      onset.gain.linearRampToValueAtTime(1, begin + MIN_RAMP);
      output.connect(onset);
      output = onset;
    }
    const gain = context.createGain();
    voice.gain = gain;
    voice.nodes.push(gain);
    gain.gain.value = 0;
    applySchedule(
      gain.gain,
      buildEnvelopeSchedule(env, spec.start, peak, offset)
    );
    output.connect(gain);
    output = gain;
    if (spec.pan) {
      const panner = context.createStereoPanner();
      voice.nodes.push(panner);
      panner.pan.value = spec.pan;
      output.connect(panner);
      output = panner;
    }
    output.connect(getBusInput(spec.bus));
    startSource();
  } catch (error) {
    voice.disposed = true;
    try {
      voice.source?.stop(context.currentTime);
    } catch (caughtError) {
    }
    disconnectNodes(voice);
    disposeVoiceParts(voice);
    throw error;
  }
  m_voices.set(soundId, voice);
  return voice;
}
function admitAndCreate(spec, soundId) {
  return admitVoice({
    "begin": spec.start + (spec.offset || 0),
    "end": spec.start + getEnvelopeLength(spec.env),
    "protected": false,
    "inherit": false,
    "build": () => buildVoice(spec, soundId)
  });
}
function throwRange(message, code) {
  throwCode(RangeError, message, code);
}
function resolveSoundRequest(name, options) {
  const utils = m_utils;
  const frequency = utils.getFloat(options.frequency, 440);
  const duration = utils.getFloat(options.duration, 1);
  const volume = utils.getFloat(options.volume, 1);
  let oType;
  if (options.oType != null) {
    oType = options.oType;
  } else {
    oType = "triangle";
  }
  const delay = utils.getFloat(options.delay, 0);
  const attackTime = utils.getFloat(options.attackTime, 0);
  const decayTime = utils.getFloat(options.decayTime, 0);
  const sustainLevel = utils.getFloat(options.sustainLevel, 1);
  const releaseTime = utils.getFloat(options.releaseTime, 0.1);
  const pan = utils.getFloat(options.pan, 0);
  let frequencyEnd = null;
  if (options.frequencyEnd != null) {
    frequencyEnd = utils.getFloat(options.frequencyEnd, NaN);
  }
  if (duration < 0) {
    throwRange(
      `${name}: Parameter duration must be a number greater than or equal to 0.`,
      "INVALID_DURATION"
    );
  }
  if (volume < 0 || volume > 1) {
    throwRange(
      `${name}: Parameter volume must be a number between 0 and 1.`,
      "INVALID_VOLUME"
    );
  }
  if (delay < 0) {
    throwRange(
      `${name}: Parameter delay must be a number greater than or equal to 0.`,
      "INVALID_DELAY"
    );
  }
  if (attackTime < 0) {
    throwRange(
      `${name}: Parameter attackTime must be a number greater than or equal to 0.`,
      "INVALID_ATTACK_TIME"
    );
  }
  if (decayTime < 0) {
    throwRange(
      `${name}: Parameter decayTime must be a number greater than or equal to 0.`,
      "INVALID_DECAY_TIME"
    );
  }
  if (sustainLevel < 0 || sustainLevel > 1) {
    throwRange(
      `${name}: Parameter sustainLevel must be a number between 0 and 1.`,
      "INVALID_SUSTAIN_LEVEL"
    );
  }
  if (releaseTime < 0) {
    throwRange(
      `${name}: Parameter releaseTime must be a number greater than or equal to 0.`,
      "INVALID_RELEASE_TIME"
    );
  }
  if (pan < -1 || pan > 1) {
    throwRange(`${name}: Parameter pan must be a number between -1 and 1.`, "INVALID_PAN");
  }
  if (frequencyEnd !== null && !(frequency > 0 && frequencyEnd > 0)) {
    throwRange(
      `${name}: Parameters frequency and frequencyEnd must be greater than 0 for a sweep.`,
      "INVALID_FREQUENCY"
    );
  }
  let waveTables = null;
  if (Array.isArray(oType)) {
    if (oType.length !== 2 || oType[0].length === 0 || oType[1].length === 0 || oType[0].length !== oType[1].length) {
      throwCode(
        TypeError,
        `${name}: Parameter oType array must contain two non-empty arrays of equal length.`,
        "INVALID_WAVE_TABLE"
      );
    }
    waveTables = [];
    for (let i = 0; i < oType.length; i++) {
      for (let j = 0; j < oType[i].length; j++) {
        if (isNaN(oType[i][j])) {
          throwCode(
            TypeError,
            `${name}: Parameter oType array must only contain numbers.`,
            "INVALID_WAVE_TABLE_VALUE"
          );
        }
      }
      waveTables.push(new Float32Array(oType[i]));
    }
    oType = "custom";
  } else if (typeof oType !== "string") {
    throwCode(
      TypeError,
      `${name}: Parameter oType must be a string or an array.`,
      "INVALID_OTYPE"
    );
  } else if (!isSourceType(oType)) {
    throwCode(
      Error,
      `${name}: Parameter oType must be one of: ${getSourceTypes().join(", ")}.`,
      "INVALID_OTYPE"
    );
  }
  return {
    "frequency": frequency,
    "frequencyEnd": frequencyEnd,
    "oType": oType,
    "waveTables": waveTables,
    "volume": volume,
    "pan": pan,
    "delay": delay,
    "envelope": {
      "duration": duration,
      "attackTime": attackTime,
      "decayTime": decayTime,
      "sustainLevel": sustainLevel,
      "releaseTime": releaseTime
    }
  };
}
function resolveInserts(name, inserts) {
  if (inserts == null) {
    return null;
  }
  if (!Array.isArray(inserts) || inserts.some((descriptor) => !descriptor || typeof descriptor.factory !== "function")) {
    throwCode(
      TypeError,
      `${name}: Parameter inserts must be an array of { factory, params } descriptors.`,
      "INVALID_INSERT"
    );
  }
  if (inserts.length === 0) {
    return null;
  }
  return snapshot(inserts.map((descriptor) => ({
    "factory": descriptor.factory,
    "params": descriptor.params ?? null
  })));
}
function requestVoice(request, bus, inserts) {
  const context = getAudioContext();
  const soundId = nextSoundId();
  if (isLocked()) {
    return soundId;
  }
  const now = context.currentTime;
  const spec = {
    "frequency": request.frequency,
    "frequencyEnd": request.frequencyEnd,
    "oType": request.oType,
    "waveTables": request.waveTables,
    "peak": request.volume,
    "pan": request.pan,
    "bus": bus,
    "env": resolveEnvelope(request.envelope),
    "start": Math.max(now + request.delay, getScheduleLead()),
    "inserts": inserts
  };
  if (shouldCreate(spec.start, now)) {
    startVoice(spec, soundId);
  } else {
    addPending({
      "id": soundId,
      "kind": "sound",
      "start": spec.start,
      "run": () => startVoice(spec, soundId)
    }, "sound");
  }
  return soundId;
}
function getSourceTypes() {
  return OSCILLATOR_TYPES.concat(NOISE_TYPES, Array.from(m_sources.keys()));
}
function nextSoundId() {
  const soundId = "sound_" + m_nextSoundId;
  m_nextSoundId += 1;
  return soundId;
}
function startVoice(spec, soundId) {
  const context = getAudioContext();
  const now = context.currentTime;
  const lead = getScheduleLead();
  spec.offset = 0;
  if (spec.start < lead) {
    const end = spec.start + getEnvelopeLength(spec.env);
    if (end - lead < MIN_RAMP) {
      return null;
    }
    if (now - spec.start > LATE_GRACE) {
      return null;
    }
    spec.offset = lead - spec.start;
  }
  return admitAndCreate(spec, soundId);
}
function panGain(pan) {
  const angle = (pan + 1) * Math.PI / 4;
  return 1 / Math.max(Math.cos(angle), Math.sin(angle));
}
function createVoiceRecord(fields) {
  const voice = Object.assign({
    "kind": "synth",
    "order": m_nextOrder,
    "stopKind": null,
    "fadeStart": null,
    "protected": false,
    "nodes": [],
    "inserts": [],
    "links": [],
    "source": null,
    "disposeSource": null,
    "gain": null,
    "fade": null,
    "onDispose": null,
    "disposed": false
  }, fields);
  m_nextOrder += 1;
  if (voice.slotEnd === void 0) {
    voice.slotEnd = voice.end;
  }
  return voice;
}
function registerVoice(voice) {
  m_voices.set(voice.id, voice);
}
function releaseVoice(voice) {
  disposeVoice(voice);
}
function admitVoice(request) {
  const context = getAudioContext();
  const now = context.currentTime;
  const lead = getScheduleLead();
  const live = Array.from(m_voices.values());
  let cleanup = null;
  if (live.length >= MAX_LIVE_VOICES) {
    cleanup = chooseCleanup(live, now, lead);
    if (cleanup === null) {
      warnCapacity();
      return null;
    }
  }
  let victims = [];
  if (!request.inherit) {
    const holders = [];
    for (const voice2 of live) {
      if (voice2 !== cleanup && voice2.slotEnd !== null && voice2.slotEnd > request.begin) {
        holders.push({
          "voice": voice2,
          "start": voice2.begin,
          "end": voice2.slotEnd,
          "order": voice2.order,
          "protected": voice2.protected
        });
      }
    }
    const plan = planAdmission(holders, request.begin, request.end, MAX_VOICES);
    if (!plan.admit) {
      warnCapacity();
      return null;
    }
    victims = plan.victims;
  }
  if (cleanup !== null) {
    hardStop(cleanup);
  }
  for (const victim of victims) {
    stopVoice(victim.holder.voice, victim.conflict, "steal");
  }
  const voice = request.build();
  voice.protected = request.protected === true;
  return voice;
}
function planAdmission(holders, start, end, maxVoices) {
  const ends = /* @__PURE__ */ new Map();
  for (const holder of holders) {
    ends.set(holder, holder.end);
  }
  const victims = [];
  for (let guard = 0; guard <= holders.length; guard++) {
    const points = [start];
    for (const holder of holders) {
      if (holder.start > start && holder.start < end) {
        points.push(holder.start);
      }
    }
    points.sort((a, b) => a - b);
    let conflict = null;
    for (const point of points) {
      let count = 0;
      for (const holder of holders) {
        if (holder.start <= point && point < ends.get(holder)) {
          count += 1;
        }
      }
      if (count >= maxVoices) {
        conflict = point;
        break;
      }
    }
    if (conflict === null) {
      return { "admit": true, "victims": victims };
    }
    let victim = null;
    for (const holder of holders) {
      if (!holder.protected && holder.start <= conflict && conflict < ends.get(holder) && (victim === null || holder.order < victim.order)) {
        victim = holder;
      }
    }
    if (victim === null) {
      return { "admit": false, "victims": [] };
    }
    ends.set(victim, conflict);
    victims.push({ "holder": victim, "conflict": conflict });
  }
  return { "admit": false, "victims": [] };
}
function chooseCleanup(voices, now, lead) {
  let silentRetiring = null;
  let stopping = null;
  let audibleRetiring = null;
  let active = null;
  for (const voice of voices) {
    const retiring = voice.stopKind === "steal" && now < voice.fadeStart;
    if (retiring && voice.begin >= lead) {
      if (silentRetiring === null || voice.order < silentRetiring.order) {
        silentRetiring = voice;
      }
    } else if (voice.stopKind !== null && !retiring || voice.end <= now) {
      if (stopping === null || voice.end < stopping.end) {
        stopping = voice;
      }
    } else if (retiring) {
      if (audibleRetiring === null || voice.order < audibleRetiring.order) {
        audibleRetiring = voice;
      }
    } else if (!voice.protected && voice.begin < lead) {
      if (active === null || voice.order < active.order) {
        active = voice;
      }
    }
  }
  return silentRetiring || stopping || audibleRetiring || active;
}
function stopVoice(voice, when, kind) {
  if (voice.disposed) {
    return;
  }
  const lead = getScheduleLead();
  let fadeStart = lead;
  if (when !== null && when !== void 0) {
    fadeStart = Math.max(lead, when - STOP_FADE);
  }
  if (kind === "steal") {
    if (voice.slotEnd !== null) {
      voice.slotEnd = Math.min(voice.slotEnd, when);
    }
  } else {
    voice.slotEnd = null;
  }
  if (voice.begin >= fadeStart) {
    hardStop(voice);
    return;
  }
  const deadline = fadeStart + STOP_FADE;
  if (kind === "stop") {
    voice.stopKind = "stop";
  }
  if (voice.end <= deadline) {
    return;
  }
  if (voice.stopKind === null) {
    voice.stopKind = "steal";
  }
  voice.end = deadline;
  voice.fadeStart = fadeStart;
  if (voice.fade) {
    voice.fade(fadeStart, deadline);
    return;
  }
  const param = voice.gain.gain;
  param.cancelScheduledValues(fadeStart);
  applySchedule(param, [
    stopHoldEvent(voice.env, voice.start, voice.peak, fadeStart),
    { "type": "linear", "time": deadline, "value": 0 }
  ]);
  voice.source.stop(deadline);
  stopInserts(voice, deadline);
}
function stopSoundById(soundId, when = null) {
  if (removePending(soundId)) {
    return;
  }
  const voice = m_voices.get(soundId);
  if (voice && voice.kind === "synth") {
    stopVoice(voice, when, "stop");
  }
}
function snapshot(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(snapshot));
  }
  if (ArrayBuffer.isView(value)) {
    return value.slice();
  }
  if (value !== null && typeof value === "object") {
    const copy = {};
    for (const key of Object.keys(value)) {
      copy[key] = snapshot(value[key]);
    }
    return Object.freeze(copy);
  }
  return value;
}
function hasMembers(object, nodes, functions) {
  return Boolean(object) && nodes.every((key) => object[key] instanceof AudioNode) && functions.every((key) => typeof object[key] === "function");
}
function isSourceType(oType) {
  return OSCILLATOR_TYPES.indexOf(oType) !== -1 || isNoiseType(oType) || m_sources.has(oType);
}
function registerSource(oType, factory) {
  if (typeof oType !== "string" || oType === "" || typeof factory !== "function") {
    throwCode(
      TypeError,
      "registerSource: Parameter oType must be a non-empty string and factory a function.",
      "INVALID_SOURCE"
    );
  }
  if (isSourceType(oType) || oType === "custom") {
    throwCode(
      Error,
      `registerSource: Source type "${oType}" is already defined.`,
      "DUPLICATE_SOURCE"
    );
  }
  m_sources.set(oType, factory);
}
function createVoice(spec, name = "createVoice") {
  if (spec === null || typeof spec !== "object") {
    throwCode(TypeError, `${name}: Parameter spec must be an object.`, "INVALID_SPEC");
  }
  const request = resolveSoundRequest(name, spec);
  let bus = "sfx";
  if (spec.bus != null) {
    if (VOICE_BUSES.indexOf(spec.bus) === -1) {
      throwCode(Error, `${name}: Parameter bus must be one of: sfx, music.`, "INVALID_BUS");
    }
    bus = spec.bus;
  }
  return requestVoice(request, bus, resolveInserts(name, spec.inserts));
}
function registerVoices(pluginApi) {
  m_utils = pluginApi.utils;
  pluginApi.addCommand("sound", sound, false, [
    "frequency",
    "duration",
    "volume",
    "oType",
    "delay",
    "attackTime",
    "decayTime",
    "sustainLevel",
    "releaseTime",
    "pan",
    "frequencyEnd"
  ]);
  function sound(options) {
    return requestVoice(resolveSoundRequest("sound", options), "sfx", null);
  }
  pluginApi.addCommand("stopSound", stopSound, false, ["soundId"]);
  function stopSound(options) {
    const soundId = options.soundId;
    if (soundId == null) {
      clearPending("sound");
      for (const voice of Array.from(m_voices.values())) {
        if (voice.kind === "synth") {
          stopVoice(voice, null, "stop");
        }
      }
      return;
    }
    stopSoundById(soundId);
  }
}

// plugins/sound/play.js
var NOTE_SEMITONES = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
var MAX_NOTE_NUMBER = 119;
var A4_NUMBER = 58;
var OCTAVES = 10;
var COMMANDS = [
  "N",
  "O",
  "L",
  "T",
  "V",
  "P",
  "<",
  ">",
  "MS",
  "MN",
  "ML",
  "MW",
  "MO",
  "MA",
  "MD",
  "MH",
  "MR",
  "MP",
  "MB",
  "MF",
  "WS",
  "WQ",
  "WW",
  "WT",
  "WN",
  "WP",
  "W"
];
var WORDS = {
  "SINE": "WS",
  "SQUARE": "WQ",
  "SAWTOOTH": "WW",
  "TRIANGLE": "WT",
  "NOISE": "WN",
  "PINK": "WP"
};
var WAVEFORMS = {
  "WS": "sine",
  "WQ": "square",
  "WW": "sawtooth",
  "WT": "triangle",
  "WN": "white",
  "WP": "pink"
};
var PACES = { "MS": 0.75, "MN": 0.875, "ML": 1 };
var ENVELOPE_COMMANDS = { "MA": "attack", "MD": "decay", "MH": "sustain", "MR": "release" };
var NOTE_PATTERN = /([A-G])([#+-]?)(\d*)(\.{0,2})/y;
var VALUE_PATTERN = /-?\d+/y;
var INVALID_PREFIX_PATTERN = /[\d\s,[\]#+.-]/;
var m_songs = /* @__PURE__ */ new Map();
var m_lastTrackId = 0;
var m_playObservers = /* @__PURE__ */ new Set();
var m_extensions = [];
var m_extensionTokens = /* @__PURE__ */ new Map();
var m_tokenNames = [];
rebuildTokenNames();
function rebuildTokenNames() {
  m_tokenNames = COMMANDS.concat(Object.keys(WORDS), "@", [...m_extensionTokens.keys()]);
  m_tokenNames.sort((a, b) => b.length - a.length);
}
function throwCode2(message, code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function noteFrequency(number) {
  return 440 * Math.pow(2, (number - A4_NUMBER) / 12);
}
function getNoteLength(val) {
  if (val >= 1 && val < 65) {
    return 1 / val;
  }
  return 0.875;
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function extractWaveTables(playString) {
  const waveTables = [];
  let start = playString.indexOf("[[");
  while (start > -1) {
    const end = playString.indexOf("]]", start);
    if (end === -1) {
      break;
    }
    const text = playString.substring(start, end + 2);
    playString = playString.replace(text, "W" + waveTables.length);
    let table = JSON.parse(text);
    if (table.length !== 2 || table[0].length !== table[1].length) {
      console.error(
        "play: Wavetables must have 2 arrays of same length. Defaulting to triangle wave."
      );
      table = "triangle";
    } else {
      for (let j = 0; j < 2; j++) {
        table[j] = new Float32Array(table[j].map((value) => {
          const number = parseFloat(value);
          if (isNaN(number)) {
            return 0;
          }
          return number;
        }));
      }
    }
    waveTables.push(table);
    start = playString.indexOf("[[");
  }
  return { "playString": playString, "waveTables": waveTables };
}
function readValue(text, index) {
  VALUE_PATTERN.lastIndex = index;
  const match = VALUE_PATTERN.exec(text);
  if (match === null) {
    return { "value": null, "index": index };
  }
  return { "value": parseInt(match[0], 10), "index": VALUE_PATTERN.lastIndex };
}
function createTrackState() {
  const state = {
    "tempo": 60 / 120,
    "noteLength": 0.25,
    "pace": PACES.MN,
    "octave": 4,
    "octaveOffset": 0,
    "volume": 1,
    "pan": 0,
    "attack": 15,
    "decay": 20,
    "sustain": 65,
    "release": 20,
    "oType": "triangle",
    "waveTables": null,
    "ext": {}
  };
  for (const extension of m_extensions) {
    state.ext[extension.name] = extension.initState();
  }
  return state;
}
function copyTrackState(state) {
  const copy = Object.assign({}, state, { "ext": {} });
  for (const extension of m_extensions) {
    copy.ext[extension.name] = extension.copyState(state.ext[extension.name]);
  }
  return copy;
}
function createNoteEvent(state, frequency, time, slot, track) {
  const sounding = slot * state.pace;
  const releaseTime = Math.max(sounding * state.release / 100, MIN_RAMP);
  let note = {
    "frequency": frequency,
    "frequencyEnd": null,
    "time": time,
    "gate": Math.max(sounding - releaseTime, 0),
    "volume": state.volume,
    "envelope": {
      "attackTime": sounding * state.attack / 100,
      "decayTime": sounding * state.decay / 100,
      "sustainLevel": state.sustain / 100,
      "releaseTime": releaseTime
    },
    "pan": state.pan,
    "oType": state.oType,
    "waveTables": state.waveTables,
    "inserts": null
  };
  for (const extension of m_extensions) {
    const overrides = extension.resolveNote(
      state.ext[extension.name],
      snapshot(note)
    );
    if (overrides) {
      note = Object.assign({}, note, overrides, {
        "time": time,
        "envelope": Object.assign({}, note.envelope, overrides.envelope)
      });
    }
  }
  let oType = note.oType;
  let waveTables = note.waveTables;
  if (Array.isArray(oType)) {
    waveTables = [new Float32Array(oType[0]), new Float32Array(oType[1])];
    oType = "custom";
  } else if (oType !== "custom" && !isSourceType(oType)) {
    throwCode2(`play: Unknown oType "${oType}" from a PLAY extension.`, "INVALID_OTYPE");
  }
  return snapshot({
    "time": time,
    "track": track,
    "frequency": note.frequency,
    "frequencyEnd": note.frequencyEnd,
    "peak": note.volume,
    "pan": note.pan,
    "oType": oType,
    "waveTables": waveTables,
    "env": resolveEnvelope({
      "duration": note.gate,
      "attackTime": note.envelope.attackTime,
      "decayTime": note.envelope.decayTime,
      "sustainLevel": note.envelope.sustainLevel,
      "releaseTime": note.envelope.releaseTime
    }),
    "inserts": note.inserts
  });
}
function applyToken(token, state, time, song) {
  const value = token.value;
  let frequency = 0;
  let length = 0;
  if (token.handler) {
    token.handler(state.ext[token.extension], value);
    return time;
  }
  switch (token.name) {
    case "NOTE": {
      const octave = state.octave + state.octaveOffset;
      if (octave >= 0 && octave < OCTAVES) {
        frequency = noteFrequency(octave * 12 + token.semitone + 1);
      }
      length = state.noteLength;
      if (token.length !== null) {
        length = getNoteLength(token.length);
      }
      length *= [1, 1.5, 1.75][token.dots];
      break;
    }
    case "N":
      if (value !== null) {
        if (value > 0 && value <= MAX_NOTE_NUMBER) {
          frequency = noteFrequency(value);
        }
        length = state.noteLength;
      }
      break;
    case "O":
      if (value !== null && value >= 0 && value < OCTAVES) {
        state.octave = value;
      }
      break;
    case ">":
      state.octave = Math.min(state.octave + 1, OCTAVES - 1);
      break;
    case "<":
      state.octave = Math.max(state.octave - 1, 0);
      break;
    case "L":
      if (value !== null) {
        state.noteLength = getNoteLength(value);
      }
      break;
    case "T":
      if (value !== null && value >= 32 && value < 256) {
        state.tempo = 60 / value;
      }
      break;
    case "V":
      if (value !== null) {
        state.volume = clamp(value, 0, 100) / 100;
      }
      break;
    case "P":
      if (value !== null) {
        length = getNoteLength(value);
      }
      break;
    case "MS":
    case "MN":
    case "ML":
      state.pace = PACES[token.name];
      break;
    case "MO":
      if (value !== null) {
        state.octaveOffset = value;
      }
      break;
    case "MA":
    case "MD":
    case "MH":
    case "MR":
      if (value !== null) {
        state[ENVELOPE_COMMANDS[token.name]] = clamp(value, 0, 100);
      }
      break;
    case "MP":
      if (value !== null) {
        state.pan = clamp(value, -100, 100) / 100;
      }
      break;
    case "W": {
      const table = song.waveTables[value];
      if (Array.isArray(table)) {
        state.oType = "custom";
        state.waveTables = table;
      } else if (table) {
        state.oType = table;
        state.waveTables = null;
      }
      break;
    }
    case "@":
      song.warnings.instrument = true;
      break;
    case "?":
      if (song.warnings.unknown === null) {
        song.warnings.unknown = token.text;
      }
      break;
    default:
      if (WAVEFORMS[token.name]) {
        state.oType = WAVEFORMS[token.name];
        state.waveTables = null;
      }
      break;
  }
  if (length === 0) {
    return time;
  }
  const slot = state.tempo * length * 4;
  if (frequency > 0) {
    song.events.push(createNoteEvent(state, frequency, time, slot, song.track));
  }
  return time + slot;
}
function notifyPlay(event) {
  Object.freeze(event);
  for (const listener of Array.from(m_playObservers)) {
    try {
      listener(event);
    } catch (error) {
      console.error("sound: Play observer failed:", error);
    }
  }
}
function removeSong(song) {
  for (const trackId of song.trackIds) {
    if (m_songs.get(trackId) === song) {
      m_songs.delete(trackId);
    }
  }
}
function playNextEvent(song) {
  const event = song.events[song.index];
  song.index += 1;
  const soundId = nextSoundId();
  const voice = startVoice({
    "frequency": event.frequency,
    "frequencyEnd": event.frequencyEnd,
    "oType": event.oType,
    "waveTables": event.waveTables,
    "peak": event.peak,
    "pan": event.pan,
    "bus": "music",
    "env": event.env,
    "start": song.base + event.time,
    "inserts": event.inserts,
    "onDispose": () => {
      song.voices.delete(soundId);
    }
  }, soundId);
  if (voice) {
    song.voices.set(soundId, voice);
    notifyPlay({
      "type": "note",
      "trackId": song.id,
      "track": event.track,
      "time": voice.begin,
      "duration": voice.end - voice.begin,
      "frequency": event.frequency,
      "volume": event.peak
    });
  }
}
function startSong(song) {
  song.deferred = null;
  song.base = getScheduleLead();
  addStream({
    "id": song.id,
    "kind": "play",
    "peek": () => {
      if (song.index < song.events.length) {
        return song.base + song.events[song.index].time;
      }
      return Infinity;
    },
    "take": () => {
      playNextEvent(song);
    },
    "isDone": () => song.index >= song.events.length && song.voices.size === 0,
    "onDone": () => {
      removeSong(song);
      notifyPlay({ "type": "end", "trackId": song.id, "stopped": false });
    }
  });
}
function stopSong(song) {
  if (song.deferred) {
    cancelUnlock(song.deferred);
    song.deferred = null;
  }
  removeStream(song.id);
  song.index = song.events.length;
  for (const voice of Array.from(song.voices.values())) {
    stopVoice(voice, null, "stop");
  }
  removeSong(song);
  notifyPlay({ "type": "end", "trackId": song.id, "stopped": true });
}
function tokenize(text) {
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    const name = m_tokenNames.find((tokenName) => text.startsWith(tokenName, index));
    if (name !== void 0) {
      const read = readValue(text, index + name.length);
      const token = { "name": WORDS[name] || name, "value": read.value };
      const owner = m_extensionTokens.get(name);
      if (owner) {
        token.handler = owner.handler;
        token.extension = owner.extension;
      }
      tokens.push(token);
      index = read.index;
      continue;
    }
    NOTE_PATTERN.lastIndex = index;
    const note = NOTE_PATTERN.exec(text);
    if (note !== null) {
      let semitone = NOTE_SEMITONES[note[1]];
      if (note[2] === "-") {
        semitone -= 1;
      } else if (note[2] !== "") {
        semitone += 1;
      }
      let length = null;
      if (note[3] !== "") {
        length = parseInt(note[3], 10);
      }
      tokens.push({
        "name": "NOTE",
        "semitone": semitone,
        "length": length,
        "dots": note[4].length
      });
      index = NOTE_PATTERN.lastIndex;
      continue;
    }
    let end = index + 1;
    if (text[index] === "M" && /[A-Z]/.test(text[index + 1])) {
      end = readValue(text, index + 2).index;
    }
    tokens.push({ "name": "?", "value": null, "text": text.substring(index, end) });
    index = end;
  }
  return tokens;
}
function parsePlayString(playString) {
  const extracted = extractWaveTables(playString.split(/\s+/).join("").toUpperCase());
  const trackTexts = extracted.playString.split(",");
  const song = {
    "events": [],
    "waveTables": extracted.waveTables,
    "warnings": { "unknown": null, "instrument": false }
  };
  let state = createTrackState();
  let time = 0;
  for (let i = 0; i < trackTexts.length; i++) {
    const tokens = tokenize(trackTexts[i]);
    song.track = i;
    let nextTime = time;
    for (const token of tokens) {
      nextTime = time;
      time = applyToken(token, state, time, song);
    }
    if (i < trackTexts.length - 1) {
      state = copyTrackState(state);
      time = nextTime;
    }
  }
  song.events.sort((a, b) => a.time - b.time);
  return {
    "events": Object.freeze(song.events),
    "trackCount": trackTexts.length,
    "warnings": song.warnings
  };
}
function observePlay(listener) {
  if (typeof listener !== "function") {
    throwCode2("observePlay: Parameter listener must be a function.", "INVALID_LISTENER");
  }
  m_playObservers.add(listener);
  return () => {
    m_playObservers.delete(listener);
  };
}
function registerPlayExtension(name, extension) {
  if (typeof name !== "string" || name === "") {
    throwCode2(
      "registerPlayExtension: Parameter name must be a non-empty string.",
      "INVALID_PLAY_EXTENSION"
    );
  }
  if (!extension || typeof extension.tokens !== "object" || extension.tokens === null || typeof extension.initState !== "function" || typeof extension.copyState !== "function" || typeof extension.resolveNote !== "function") {
    throwCode2(
      "registerPlayExtension: Parameter extension must have tokens, initState, copyState, and resolveNote.",
      "INVALID_PLAY_EXTENSION"
    );
  }
  if (m_extensions.some((registered) => registered.name === name)) {
    throwCode2(
      `registerPlayExtension: A PLAY extension named "${name}" is already registered.`,
      "DUPLICATE_PLAY_TOKEN"
    );
  }
  const tokens = /* @__PURE__ */ new Map();
  for (const prefix of Object.keys(extension.tokens)) {
    const upper = prefix.toUpperCase();
    const handler = extension.tokens[prefix];
    if (upper === "" || INVALID_PREFIX_PATTERN.test(upper) || typeof handler !== "function") {
      throwCode2(
        `registerPlayExtension: Token "${prefix}" must be a prefix without digits, spaces, or , [ ] # + - . and must map to a function.`,
        "INVALID_PLAY_EXTENSION"
      );
    }
    if (COMMANDS.includes(upper) || WORDS[upper] || NOTE_SEMITONES[upper] !== void 0 || m_extensionTokens.has(upper) || tokens.has(upper)) {
      throwCode2(
        `registerPlayExtension: PLAY token "${upper}" is already registered.`,
        "DUPLICATE_PLAY_TOKEN"
      );
    }
    tokens.set(upper, { "handler": handler, "extension": name });
  }
  m_extensions.push({
    "name": name,
    "initState": extension.initState,
    "copyState": extension.copyState,
    "resolveNote": extension.resolveNote
  });
  for (const [prefix, owner] of tokens) {
    m_extensionTokens.set(prefix, owner);
  }
  rebuildTokenNames();
}
function registerPlay(pluginApi) {
  pluginApi.addCommand("play", play, false, ["playString"]);
  function play(options) {
    const playString = options.playString;
    if (typeof playString !== "string") {
      const error = new TypeError("play: Parameter playString must be a string.");
      error.code = "INVALID_PLAY_STRING";
      throw error;
    }
    const parsed = parsePlayString(playString);
    if (parsed.warnings.unknown !== null) {
      console.warn(`play: Unknown command "${parsed.warnings.unknown}" ignored.`);
    }
    if (parsed.warnings.instrument) {
      console.warn("play: Instrument command @n needs a PLAY extension; ignored.");
    }
    const song = {
      "id": m_lastTrackId,
      "trackIds": [],
      "events": parsed.events,
      "index": 0,
      "base": 0,
      "voices": /* @__PURE__ */ new Map(),
      "deferred": null
    };
    for (let i = 0; i < parsed.trackCount; i++) {
      song.trackIds.push(m_lastTrackId);
      m_songs.set(m_lastTrackId, song);
      m_lastTrackId += 1;
    }
    if (isLocked()) {
      song.deferred = () => {
        startSong(song);
      };
      onUnlock(song.deferred);
      return song.id;
    }
    startSong(song);
    return song.id;
  }
  pluginApi.addCommand("stopPlay", stopPlay, false, ["trackId"]);
  function stopPlay(options) {
    const trackId = options.trackId;
    if (trackId === null) {
      for (const song2 of new Set(m_songs.values())) {
        stopSong(song2);
      }
      return;
    }
    const song = m_songs.get(trackId);
    if (song) {
      stopSong(song);
    }
  }
}

// plugins/sound/samples.js
var DECODE_RATES = [0.0625, 16];
var STREAM_RATES = [0.25, 4];
var RETRY_COUNT = 3;
var RETRY_DELAY = 100;
var CONTROL_RAMP = 0.01;
var MEDIA_ERR_NETWORK = 2;
var m_audio = {};
var m_instances = /* @__PURE__ */ new Map();
var m_nextAudioId = 0;
var m_nextInstanceId = 1;
function resolveBudget(fileLength, startTime, duration, loop) {
  if (loop) {
    if (duration > 0) {
      return duration;
    }
    return Infinity;
  }
  const available = Math.max(fileLength - startTime, 0);
  if (duration > 0) {
    return Math.min(duration, available);
  }
  return available;
}
function consumedAt(segments, time) {
  let total = 0;
  for (let i = 0; i < segments.length; i++) {
    const segmentStart = segments[i].time;
    if (time <= segmentStart) {
      break;
    }
    let segmentEnd = time;
    if (i + 1 < segments.length && segments[i + 1].time < time) {
      segmentEnd = segments[i + 1].time;
    }
    total += segments[i].rate * (segmentEnd - segmentStart);
  }
  return total;
}
function rateAt(segments, time) {
  let rate = segments[0].rate;
  for (const segment of segments) {
    if (segment.time <= time) {
      rate = segment.rate;
    }
  }
  return rate;
}
function timeForContent(segments, content) {
  if (content === Infinity) {
    return Infinity;
  }
  let consumed = 0;
  for (let i = 0; i < segments.length - 1; i++) {
    const span = segments[i].rate * (segments[i + 1].time - segments[i].time);
    if (consumed + span >= content) {
      return segments[i].time + (content - consumed) / segments[i].rate;
    }
    consumed += span;
  }
  const last = segments[segments.length - 1];
  return last.time + (content - consumed) / last.rate;
}
function addRateSegment(segments, time, rate) {
  while (segments.length > 1 && segments[segments.length - 1].time >= time) {
    segments.pop();
  }
  if (time <= segments[0].time) {
    segments[0].rate = rate;
    return;
  }
  segments.push({ "time": time, "rate": rate });
}
function wrapPosition(startTime, consumed, fileLength, loop) {
  const position = startTime + consumed;
  if (loop && fileLength > 0) {
    return position % fileLength;
  }
  return position;
}
function isPlaybackRateValid(rate, stream) {
  let range = DECODE_RATES;
  if (stream) {
    range = STREAM_RATES;
  }
  return rate >= range[0] && rate <= range[1];
}
function throwError(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function isFileUrl(src) {
  let base;
  if (typeof document !== "undefined") {
    base = document.baseURI;
  }
  try {
    return new URL(src, base).protocol === "file:";
  } catch (error) {
    return false;
  }
}
function releaseElement(element) {
  try {
    element.pause();
  } catch (caughtError) {
  }
  try {
    element.removeAttribute("src");
    element.load();
  } catch (caughtError) {
  }
}
function settleLoad(pluginApi, audio) {
  if (audio.settled) {
    return;
  }
  audio.settled = true;
  clearTimeout(audio.retryTimer);
  audio.retryTimer = null;
  pluginApi.done();
}
function failLoad(pluginApi, audio, message, retryable, retryCount, retry) {
  console.error("loadAudio: " + message + " - " + audio.src);
  if (retryable && retryCount > 0) {
    const timer = setTimeout(() => {
      if (audio.removed || audio.retryTimer !== timer) {
        return;
      }
      audio.retryTimer = null;
      try {
        retry();
      } catch (error) {
        audio.status = "failed";
        settleLoad(pluginApi, audio);
        console.error("loadAudio: Retry initialization failed:", error);
      }
    }, RETRY_DELAY);
    audio.retryTimer = timer;
    return;
  }
  if (retryable) {
    console.error("loadAudio: Max retries exceeded for " + audio.src);
  }
  audio.status = "failed";
  settleLoad(pluginApi, audio);
}
function loadDecoded(pluginApi, audio, retryCount) {
  const controller = new AbortController();
  audio.controller = controller;
  let retryable = true;
  function isCurrent() {
    return !audio.removed && audio.controller === controller;
  }
  fetch(audio.src, { "signal": controller.signal }).then((response) => {
    if (!response.ok) {
      retryable = response.status >= 500;
      throw new Error("HTTP status " + response.status);
    }
    return response.arrayBuffer();
  }).then((data) => {
    if (!isCurrent()) {
      return null;
    }
    retryable = false;
    return getAudioContext().decodeAudioData(data);
  }).then((buffer) => {
    if (!isCurrent() || !buffer) {
      return;
    }
    audio.controller = null;
    audio.buffer = buffer;
    audio.length = buffer.duration;
    audio.status = "ready";
    settleLoad(pluginApi, audio);
  }).catch((error) => {
    if (!isCurrent()) {
      return;
    }
    audio.controller = null;
    let message = "Failed to load audio";
    if (error && error.message) {
      message += ": " + error.message;
    }
    failLoad(pluginApi, audio, message, retryable, retryCount, () => {
      loadDecoded(pluginApi, audio, retryCount - 1);
    });
  });
}
function loadStream(pluginApi, audio, retryCount) {
  const element = new Audio();
  audio.element = element;
  let active = true;
  function detach() {
    active = false;
    element.removeEventListener("canplay", ready);
    element.removeEventListener("error", fail);
    audio.detach = null;
  }
  audio.detach = detach;
  function ready() {
    if (!active || audio.removed) {
      return;
    }
    detach();
    audio.length = element.duration;
    audio.status = "ready";
    audio.ended = () => {
      streamEnded(audio);
    };
    element.addEventListener("ended", audio.ended);
    settleLoad(pluginApi, audio);
  }
  function fail() {
    if (!active || audio.removed) {
      return;
    }
    detach();
    const code = element.error?.code;
    audio.element = null;
    releaseElement(element);
    failLoad(
      pluginApi,
      audio,
      "Media error " + code,
      code === MEDIA_ERR_NETWORK,
      retryCount,
      () => {
        loadStream(pluginApi, audio, retryCount - 1);
      }
    );
  }
  element.addEventListener("canplay", ready);
  element.addEventListener("error", fail);
  element.crossOrigin = "anonymous";
  element.preload = "auto";
  element.preservesPitch = false;
  element.mozPreservesPitch = false;
  element.webkitPreservesPitch = false;
  element.src = audio.src;
}
function disposeAudio(pluginApi, audio) {
  audio.removed = true;
  if (audio.controller) {
    audio.controller.abort();
    audio.controller = null;
  }
  if (audio.detach) {
    audio.detach();
  }
  settleLoad(pluginApi, audio);
  for (const inst of Array.from(audio.instances)) {
    stopInstance(inst);
  }
  audio.buffer = null;
  const element = audio.element;
  const sourceNode = audio.sourceNode;
  audio.element = null;
  audio.sourceNode = null;
  if (element && audio.ended) {
    element.removeEventListener("ended", audio.ended);
  }
  if (element && !sourceNode) {
    releaseElement(element);
  } else if (element) {
    const context = getAudioContext();
    const delay = getScheduleLead() - context.currentTime + STOP_FADE;
    setTimeout(() => {
      sourceNode.disconnect();
      releaseElement(element);
    }, delay * 1e3);
  }
}
function isIssued(id) {
  return Number.isInteger(id) && id >= 1 && id < m_nextInstanceId;
}
function resolveInstances(id, name) {
  if (id === null || id === void 0) {
    return Array.from(m_instances.values());
  }
  if (typeof id === "string") {
    if (!m_audio[id]) {
      throwError(Error, `${name}: Audio "${id}" not found.`, "AUDIO_NOT_FOUND");
    }
    return Array.from(m_audio[id].instances);
  }
  if (typeof id === "number") {
    if (!isIssued(id)) {
      throwError(Error, `${name}: Audio instance ${id} not found.`, "AUDIO_NOT_FOUND");
    }
    const inst = m_instances.get(id);
    if (inst) {
      return [inst];
    }
    return [];
  }
  throwError(
    TypeError,
    `${name}: Parameter id must be an instance ID or an audio ID.`,
    "INVALID_AUDIO_ID"
  );
}
function completeInstance(inst) {
  inst.state = "done";
  inst.voice = null;
  m_instances.delete(inst.id);
  inst.audio.instances.delete(inst);
  if (inst.audio.current === inst) {
    inst.audio.current = null;
  }
  if (inst.pending) {
    removePending(inst.id);
    inst.pending = false;
  }
  if (inst.deferred) {
    cancelUnlock(inst.deferred);
    inst.deferred = null;
  }
}
function stopInstance(inst) {
  const voice = inst.voice;
  completeInstance(inst);
  if (voice) {
    stopVoice(voice, null, "stop");
  }
}
function contentAt(inst, time) {
  return inst.consumed + consumedAt(inst.segments, time);
}
function instanceGain(inst) {
  if (inst.mono) {
    return inst.volume * panGain(inst.pan);
  }
  return inst.volume;
}
function rampControl(param, ramp, target, time) {
  const current = rampValueAt(ramp, time);
  param.cancelScheduledValues(time);
  if (time > ramp.t0 && time <= ramp.t1) {
    param.linearRampToValueAtTime(current, time);
  } else {
    param.setValueAtTime(current, time);
  }
  param.linearRampToValueAtTime(target, time + CONTROL_RAMP);
  return { "from": current, "to": target, "t0": time, "t1": time + CONTROL_RAMP };
}
function fadeValueAt(events, time) {
  let value = 0;
  let previous = -Infinity;
  for (const event of events) {
    if (event.time <= time) {
      value = event.value;
      previous = event.time;
    } else {
      if (event.type === "linear" && previous > -Infinity) {
        return value + (event.value - value) * (time - previous) / (event.time - previous);
      }
      return value;
    }
  }
  return value;
}
function pushFade(voice, event) {
  voice.fadeEvents.push(event);
  applySchedule(voice.gain.gain, [event]);
}
function holdFade(voice, time) {
  const events = voice.fadeEvents;
  const value = fadeValueAt(events, time);
  let type = "set";
  for (const event of events) {
    if (event.time >= time) {
      if (event.type === "linear") {
        type = "linear";
      }
      break;
    }
  }
  voice.gain.gain.cancelScheduledValues(time);
  while (events.length > 0 && events[events.length - 1].time >= time) {
    events.pop();
  }
  pushFade(voice, { "type": type, "time": time, "value": value });
}
function scheduleEndFade(voice, inst, from) {
  voice.endFadeStart = null;
  const end = timeForContent(inst.segments, inst.budget - inst.consumed);
  if (end === Infinity) {
    voice.end = Infinity;
    return;
  }
  const fadeEnd = Math.max(end, from + MIN_RAMP);
  const fadeStart = Math.max(from, fadeEnd - STOP_FADE);
  pushFade(voice, { "type": "set", "time": fadeStart, "value": 1 });
  pushFade(voice, { "type": "linear", "time": fadeEnd, "value": 0 });
  voice.endFadeStart = fadeStart;
  voice.end = fadeEnd;
  voice.source.stop(fadeEnd);
}
function updateEndFade(inst, voice) {
  if (voice.stopKind !== null || !voice.started) {
    return;
  }
  const from = Math.max(getScheduleLead(), voice.begin + MIN_RAMP);
  if (voice.endFadeStart !== null && voice.endFadeStart < from) {
    return;
  }
  if (voice.end === Infinity && voice.endFadeStart === null && inst.budget === Infinity) {
    return;
  }
  holdFade(voice, from);
  scheduleEndFade(voice, inst, from);
}
function voiceEnded(inst, voice) {
  clearTimeout(voice.startTimer);
  clearTimeout(voice.stopTimer);
  if (voice.streamSource) {
    try {
      voice.streamSource.disconnect(voice.gain);
    } catch (caughtError) {
    }
  }
  if (inst.voice === voice) {
    completeInstance(inst);
  }
}
function createSampleVoice(inst, begin) {
  const context = getAudioContext();
  const voice = createVoiceRecord({
    "id": "instance_" + inst.id,
    "kind": "sample",
    "start": begin,
    "begin": begin,
    "end": Infinity,
    "fadeEvents": [],
    "endFadeStart": null,
    "started": false,
    "startTimer": null,
    "stopTimer": null,
    "streamSource": null
  });
  const fade = context.createGain();
  const volume = context.createGain();
  const panner = context.createStereoPanner();
  voice.nodes.push(fade, volume, panner);
  voice.gain = fade;
  fade.gain.value = 0;
  volume.gain.value = instanceGain(inst);
  panner.pan.value = inst.pan;
  fade.connect(volume);
  volume.connect(panner);
  panner.connect(getBusInput("audio"));
  inst.volumeNode = volume;
  inst.panner = panner;
  inst.volumeRamp = { "from": volume.gain.value, "to": volume.gain.value, "t0": 0, "t1": 0 };
  inst.panRamp = { "from": inst.pan, "to": inst.pan, "t0": 0, "t1": 0 };
  pushFade(voice, { "type": "set", "time": begin, "value": 0 });
  voice.fade = (fadeStart, deadline) => {
    holdFade(voice, fadeStart);
    pushFade(voice, { "type": "linear", "time": deadline, "value": 0 });
    voice.source.stop(deadline);
  };
  voice.onDispose = () => {
    voiceEnded(inst, voice);
  };
  return voice;
}
function abandonVoice(voice) {
  voice.disposed = true;
  clearTimeout(voice.startTimer);
  for (const node of voice.nodes) {
    try {
      node.disconnect();
    } catch (caughtError) {
    }
  }
  if (voice.streamSource) {
    try {
      voice.streamSource.disconnect(voice.gain);
    } catch (caughtError) {
    }
  }
}
function buildDecodeVoice(inst, begin, content) {
  const context = getAudioContext();
  const audio = inst.audio;
  const voice = createSampleVoice(inst, begin);
  try {
    const source = context.createBufferSource();
    voice.source = source;
    voice.nodes.unshift(source);
    source.buffer = audio.buffer;
    source.loop = inst.loop;
    const rate = source.playbackRate;
    rate.value = rateAt(inst.segments, begin);
    rate.setValueAtTime(rate.value, begin);
    for (const segment of inst.segments) {
      if (segment.time > begin) {
        rate.setValueAtTime(segment.rate, segment.time);
      }
    }
    source.connect(voice.gain);
    source.onended = () => {
      releaseVoice(voice);
    };
    const offset = wrapPosition(inst.startTime, content, audio.length, inst.loop);
    const remaining = inst.budget - content;
    if (remaining === Infinity) {
      source.start(begin, offset);
    } else {
      source.start(begin, offset, remaining);
    }
    voice.started = true;
    pushFade(voice, {
      "type": "linear",
      "time": begin + MIN_RAMP,
      "value": 1
    });
    scheduleEndFade(voice, inst, begin + MIN_RAMP);
  } catch (error) {
    abandonVoice(voice);
    throw error;
  }
  registerVoice(voice);
  return voice;
}
function buildStreamVoice(inst, begin, content) {
  const context = getAudioContext();
  const audio = inst.audio;
  const voice = createSampleVoice(inst, begin);
  try {
    if (!audio.sourceNode) {
      audio.sourceNode = context.createMediaElementSource(audio.element);
    }
    voice.streamSource = audio.sourceNode;
    audio.sourceNode.connect(voice.gain);
    voice.source = {
      "stop": (when) => {
        stopStream(inst, voice, when);
      }
    };
  } catch (error) {
    abandonVoice(voice);
    throw error;
  }
  registerVoice(voice);
  inst.voice = voice;
  let position = inst.resumePosition;
  if (position === null) {
    position = wrapPosition(inst.startTime, content, audio.length, inst.loop);
  }
  if (begin <= getScheduleLead()) {
    startStream(inst, voice, position);
  } else {
    voice.startTimer = setTimeout(() => {
      voice.startTimer = null;
      startStream(inst, voice, position);
    }, (begin - context.currentTime) * 1e3);
  }
  return voice;
}
function startStream(inst, voice, position) {
  if (voice.disposed || inst.voice !== voice || voice.stopKind !== null) {
    return;
  }
  const audio = inst.audio;
  const element = audio.element;
  audio.playing = voice;
  element.loop = inst.loop;
  element.playbackRate = inst.rate;
  element.currentTime = position;
  const played = element.play();
  if (played && typeof played.catch === "function") {
    played.catch((error) => {
      console.warn("playAudio: Audio playback failed:", error.message);
    });
  }
  const lead = getScheduleLead();
  holdFade(voice, lead);
  pushFade(voice, { "type": "linear", "time": lead + MIN_RAMP, "value": 1 });
  voice.started = true;
  scheduleEndFade(voice, inst, lead + MIN_RAMP);
}
function stopStream(inst, voice, when) {
  clearTimeout(voice.stopTimer);
  voice.stopTimer = null;
  const audio = inst.audio;
  function finish() {
    voice.stopTimer = null;
    if (audio.playing === voice) {
      audio.playing = null;
      if (audio.element) {
        audio.element.pause();
      }
    }
    releaseVoice(voice);
  }
  let delay = 0;
  if (when !== void 0) {
    delay = when - getAudioContext().currentTime;
  }
  if (delay <= 0) {
    finish();
  } else {
    voice.stopTimer = setTimeout(finish, delay * 1e3);
  }
}
function streamEnded(audio) {
  const voice = audio.playing;
  audio.playing = null;
  if (voice) {
    releaseVoice(voice);
  }
}
function admitInstance(inst, begin, content) {
  const inherit = inst.inherit;
  inst.inherit = false;
  const voice = admitVoice({
    "begin": begin,
    "end": Infinity,
    "protected": inst.loop,
    "inherit": inherit,
    "build": () => {
      if (inst.stream) {
        return buildStreamVoice(inst, begin, content);
      }
      return buildDecodeVoice(inst, begin, content);
    }
  });
  if (voice === null) {
    return false;
  }
  inst.voice = voice;
  inst.state = "voiced";
  inst.resumePosition = null;
  return true;
}
function startInstance(inst) {
  const context = getAudioContext();
  const now = context.currentTime;
  const lead = getScheduleLead();
  let begin = inst.start;
  let content = inst.consumed;
  if (begin < lead) {
    content = contentAt(inst, lead);
    const remaining = inst.budget - content;
    if (remaining < MIN_RAMP * rateAt(inst.segments, lead)) {
      completeInstance(inst);
      return;
    }
    if (!inst.loop && now - inst.start > LATE_GRACE) {
      completeInstance(inst);
      return;
    }
    begin = lead;
  }
  let admitted = false;
  try {
    admitted = admitInstance(inst, begin, content);
  } finally {
    if (!admitted) {
      completeInstance(inst);
    }
  }
}
function scheduleInstance(inst) {
  const context = getAudioContext();
  const now = context.currentTime;
  inst.start = Math.max(now + inst.delay, getScheduleLead(), inst.after);
  inst.segments = [{ "time": inst.start, "rate": inst.rate }];
  if (shouldCreate(inst.start, now)) {
    startInstance(inst);
    return;
  }
  addPending({
    "id": inst.id,
    "kind": "audio",
    "start": inst.start,
    "run": () => {
      inst.pending = false;
      startInstance(inst);
    }
  }, "playAudio");
  inst.pending = true;
}
function pauseInstance(inst) {
  if (inst.deferred) {
    cancelUnlock(inst.deferred);
    inst.deferred = null;
  }
  if (inst.state === "paused") {
    return;
  }
  if (inst.pending) {
    removePending(inst.id);
    inst.pending = false;
  }
  const voice = inst.voice;
  inst.voice = null;
  inst.state = "paused";
  if (!voice) {
    return;
  }
  const lead = getScheduleLead();
  if (voice.begin >= lead || !voice.started) {
    inst.consumed = 0;
  } else {
    inst.consumed = Math.min(contentAt(inst, lead), inst.budget);
    if (inst.stream && inst.audio.element) {
      inst.resumePosition = inst.audio.element.currentTime;
    }
  }
  inst.segments = null;
  stopVoice(voice, null, "stop");
}
function resumeInstance(inst) {
  if (inst.state !== "paused") {
    return;
  }
  if (inst.budget - inst.consumed < MIN_RAMP * inst.rate) {
    completeInstance(inst);
    return;
  }
  if (isLocked()) {
    if (inst.loop && !inst.deferred) {
      inst.deferred = () => {
        inst.deferred = null;
        resumeInstance(inst);
      };
      onUnlock(inst.deferred);
    }
    return;
  }
  const lead = getScheduleLead();
  inst.start = lead;
  inst.segments = [{ "time": lead, "rate": inst.rate }];
  let admitted = false;
  try {
    admitted = admitInstance(inst, lead, inst.consumed);
  } finally {
    if (!admitted) {
      inst.segments = null;
    }
  }
}
function changeInstance(inst, volume, rate, pan) {
  if (volume !== null) {
    inst.volume = volume;
  }
  if (pan !== null) {
    inst.pan = pan;
  }
  if (rate !== null) {
    inst.rate = rate;
  }
  const voice = inst.voice;
  if (!voice) {
    if (rate !== null && inst.segments && inst.state === "pending") {
      addRateSegment(inst.segments, getScheduleLead(), rate);
    }
    return;
  }
  const lead = getScheduleLead();
  const time = Math.max(lead, voice.begin);
  if (volume !== null || pan !== null) {
    inst.volumeRamp = rampControl(
      inst.volumeNode.gain,
      inst.volumeRamp,
      instanceGain(inst),
      time
    );
  }
  if (pan !== null) {
    inst.panRamp = rampControl(inst.panner.pan, inst.panRamp, pan, time);
  }
  if (rate === null) {
    return;
  }
  if (inst.stream) {
    addRateSegment(inst.segments, lead, rate);
    if (inst.audio.playing === voice && inst.audio.element) {
      inst.audio.element.playbackRate = rate;
    }
  } else {
    addRateSegment(inst.segments, time, rate);
    let step = time;
    if (time <= voice.begin) {
      step = lead;
    }
    const param = voice.source.playbackRate;
    param.cancelScheduledValues(step);
    param.setValueAtTime(rate, step);
  }
  updateEndFade(inst, voice);
}
function validateRange(name, param, value, min, max, code) {
  if (!(value >= min && value <= max)) {
    let message = `${name}: Parameter ${param} must be a number `;
    if (max === Infinity) {
      message += `greater than or equal to ${min}.`;
    } else {
      message += `between ${min} and ${max}.`;
    }
    throwError(RangeError, message, code);
  }
}
function validatePlaybackRate(name, rate, stream) {
  if (!isPlaybackRateValid(rate, stream)) {
    let range = DECODE_RATES;
    let mode = "decoded";
    if (stream) {
      range = STREAM_RATES;
      mode = "streamed";
    }
    throwError(
      RangeError,
      `${name}: Parameter playbackRate must be between ${range[0]} and ${range[1]} for ${mode} audio.`,
      "INVALID_PLAYBACK_RATE"
    );
  }
}
function getAudioBuffer(name) {
  if (Object.prototype.hasOwnProperty.call(m_audio, name)) {
    return m_audio[name].buffer;
  }
  return null;
}
function registerSamples(pluginApi) {
  const utils = pluginApi.utils;
  pluginApi.addCommand("loadAudio", loadAudio, false, ["src", "name", "stream"]);
  function loadAudio(options) {
    const src = options.src;
    const audioName = options.name;
    let stream = false;
    if (options.stream !== null && options.stream !== void 0) {
      stream = options.stream;
    }
    if (!src || typeof src !== "string") {
      throwError(
        TypeError,
        "loadAudio: Parameter src must be a non-empty string.",
        "INVALID_SRC"
      );
    }
    if (typeof stream !== "boolean") {
      throwError(
        TypeError,
        "loadAudio: Parameter stream must be a boolean.",
        "INVALID_STREAM"
      );
    }
    if (isFileUrl(src)) {
      throwError(
        Error,
        "loadAudio: Audio requires an HTTP(S) server; file: URLs are not supported.",
        "UNSUPPORTED_PROTOCOL"
      );
    }
    let audioId;
    if (audioName) {
      if (m_audio[audioName]) {
        throwError(
          Error,
          `loadAudio: Audio name "${audioName}" is already in use.`,
          "DUPLICATE_AUDIO_NAME"
        );
      }
      audioId = audioName;
    } else {
      do {
        audioId = "audio_" + m_nextAudioId;
        m_nextAudioId += 1;
      } while (m_audio[audioId]);
    }
    const audio = {
      "id": audioId,
      "src": src,
      "stream": stream,
      "status": "loading",
      "removed": false,
      "settled": false,
      "controller": null,
      "retryTimer": null,
      "detach": null,
      "ended": null,
      "buffer": null,
      "element": null,
      "sourceNode": null,
      "length": 0,
      "instances": /* @__PURE__ */ new Set(),
      "current": null,
      "playing": null
    };
    pluginApi.wait();
    try {
      if (stream) {
        loadStream(pluginApi, audio, RETRY_COUNT);
      } else {
        loadDecoded(pluginApi, audio, RETRY_COUNT);
      }
    } catch (error) {
      disposeAudio(pluginApi, audio);
      throw error;
    }
    m_audio[audioId] = audio;
    return audioId;
  }
  pluginApi.addCommand("removeAudio", removeAudio, false, ["audioId"]);
  function removeAudio(options) {
    const audioId = options.audioId;
    if (typeof audioId !== "string" || !m_audio[audioId]) {
      throwError(Error, `removeAudio: Audio "${audioId}" not found.`, "AUDIO_NOT_FOUND");
    }
    const audio = m_audio[audioId];
    delete m_audio[audioId];
    disposeAudio(pluginApi, audio);
  }
  pluginApi.addCommand("playAudio", playAudio, false, [
    "audioId",
    "volume",
    "startTime",
    "duration",
    "loop",
    "playbackRate",
    "pan",
    "delay"
  ]);
  function playAudio(options) {
    const audioId = options.audioId;
    const volume = utils.getFloat(options.volume, 1);
    const startTime = utils.getFloat(options.startTime, 0);
    const duration = utils.getFloat(options.duration, 0);
    const playbackRate = utils.getFloat(options.playbackRate, 1);
    const pan = utils.getFloat(options.pan, 0);
    const delay = utils.getFloat(options.delay, 0);
    let loop = false;
    if (options.loop !== null && options.loop !== void 0) {
      loop = options.loop;
    }
    if (typeof audioId !== "string" || !m_audio[audioId]) {
      throwError(Error, `playAudio: Audio "${audioId}" not found.`, "AUDIO_NOT_FOUND");
    }
    const audio = m_audio[audioId];
    validateRange("playAudio", "volume", volume, 0, 1, "INVALID_VOLUME");
    validateRange("playAudio", "startTime", startTime, 0, Infinity, "INVALID_START_TIME");
    validateRange("playAudio", "duration", duration, 0, Infinity, "INVALID_DURATION");
    if (typeof loop !== "boolean") {
      throwError(TypeError, "playAudio: Parameter loop must be a boolean.", "INVALID_LOOP");
    }
    validatePlaybackRate("playAudio", playbackRate, audio.stream);
    validateRange("playAudio", "pan", pan, -1, 1, "INVALID_PAN");
    validateRange("playAudio", "delay", delay, 0, Infinity, "INVALID_DELAY");
    if (audio.status !== "ready") {
      throwError(
        Error,
        `playAudio: Audio "${audioId}" is not loaded.`,
        "AUDIO_NOT_LOADED"
      );
    }
    const id = m_nextInstanceId;
    m_nextInstanceId += 1;
    const budget = resolveBudget(audio.length, startTime, duration, loop);
    if (!(budget > 0)) {
      return id;
    }
    const locked = isLocked();
    if (locked && !loop) {
      return id;
    }
    const inst = {
      "id": id,
      "audio": audio,
      "stream": audio.stream,
      "mono": !audio.stream && audio.buffer.numberOfChannels === 1,
      "volume": volume,
      "rate": playbackRate,
      "pan": pan,
      "loop": loop,
      "startTime": startTime,
      "delay": delay,
      "budget": budget,
      "consumed": 0,
      "segments": null,
      "start": 0,
      "after": 0,
      "state": "pending",
      "voice": null,
      "pending": false,
      "deferred": null,
      "inherit": false,
      "resumePosition": null,
      "volumeNode": null,
      "panner": null,
      "volumeRamp": null,
      "panRamp": null
    };
    if (audio.stream && audio.current) {
      const outgoing = audio.current;
      const outgoingVoice = outgoing.voice;
      if (outgoingVoice && outgoingVoice.slotEnd !== null) {
        inst.inherit = true;
      }
      stopInstance(outgoing);
      if (outgoingVoice && !outgoingVoice.disposed) {
        inst.after = outgoingVoice.end;
      }
    }
    m_instances.set(id, inst);
    audio.instances.add(inst);
    if (audio.stream) {
      audio.current = inst;
    }
    if (locked) {
      inst.deferred = () => {
        inst.deferred = null;
        try {
          scheduleInstance(inst);
        } catch (error) {
          completeInstance(inst);
          throw error;
        }
      };
      onUnlock(inst.deferred);
      return id;
    }
    try {
      scheduleInstance(inst);
    } catch (error) {
      completeInstance(inst);
      throw error;
    }
    return id;
  }
  pluginApi.addCommand("stopAudio", stopAudio, false, ["id"]);
  function stopAudio(options) {
    for (const inst of resolveInstances(options.id, "stopAudio")) {
      stopInstance(inst);
    }
  }
  pluginApi.addCommand("pauseAudio", pauseAudio, false, ["id"]);
  function pauseAudio(options) {
    for (const inst of resolveInstances(options.id, "pauseAudio")) {
      pauseInstance(inst);
    }
  }
  pluginApi.addCommand("resumeAudio", resumeAudio, false, ["id"]);
  function resumeAudio(options) {
    for (const inst of resolveInstances(options.id, "resumeAudio")) {
      resumeInstance(inst);
    }
  }
  pluginApi.addCommand(
    "setAudio",
    setAudio,
    false,
    ["instanceId", "volume", "playbackRate", "pan"]
  );
  function setAudio(options) {
    const instanceId = options.instanceId;
    const volume = utils.getFloat(options.volume, null);
    const playbackRate = utils.getFloat(options.playbackRate, null);
    const pan = utils.getFloat(options.pan, null);
    if (typeof instanceId !== "number") {
      throwError(
        TypeError,
        "setAudio: Parameter instanceId must be an instance ID.",
        "INVALID_AUDIO_ID"
      );
    }
    if (volume !== null) {
      validateRange("setAudio", "volume", volume, 0, 1, "INVALID_VOLUME");
    }
    if (pan !== null) {
      validateRange("setAudio", "pan", pan, -1, 1, "INVALID_PAN");
    }
    const instances = resolveInstances(instanceId, "setAudio");
    if (playbackRate !== null) {
      let stream = false;
      if (instances.length > 0) {
        stream = instances[0].stream;
      }
      validatePlaybackRate("setAudio", playbackRate, stream);
    }
    for (const inst of instances) {
      changeInstance(inst, volume, playbackRate, pan);
    }
  }
}

// plugins/sound/index.js
var SERVICE_VERSION = 1;
function playSoundPlugin(pluginApi) {
  registerSamples(pluginApi);
  registerVoices(pluginApi);
  registerVolume(pluginApi);
  registerPlay(pluginApi);
  startLimiterProbe();
  pluginApi.provideService({
    "version": SERVICE_VERSION,
    "getContext": getAudioContext,
    "createVoice": createVoice,
    "registerSource": registerSource,
    "scheduleEnvelope": scheduleEnvelope,
    "stopVoice": (soundId, when) => {
      stopSoundById(soundId, when ?? null);
    },
    "setBusVolume": setBusVolume,
    "setBusInsert": setBusInsert2,
    "tapBus": tapBus2,
    "registerPlayExtension": registerPlayExtension,
    "observePlay": observePlay,
    "getAudioBuffer": getAudioBuffer
  });
}
function validateBus(name, bus, allowOutput) {
  let names = "sfx, music, audio, master";
  if (allowOutput) {
    if (bus === "output") {
      return;
    }
    names += ", output";
  }
  if (bus !== "master" && BUS_NAMES.indexOf(bus) === -1) {
    const error = new Error(`${name}: Parameter bus must be one of: ${names}.`);
    error.code = "INVALID_BUS";
    throw error;
  }
}
function validateVolume(name, volume) {
  if (!(volume >= 0 && volume <= 1)) {
    const error = new RangeError(
      `${name}: Parameter volume must be a number between 0 and 1.`
    );
    error.code = "INVALID_VOLUME";
    throw error;
  }
}
function setBusVolume(bus, volume) {
  validateBus("setBusVolume", bus);
  validateVolume("setBusVolume", volume);
  if (bus === "master") {
    setMasterVolume(volume);
  } else {
    setBusOutputVolume(bus, volume);
  }
}
function setBusInsert2(bus, insert) {
  validateBus("setBusInsert", bus);
  if (insert !== null && !hasMembers(insert, ["input", "output"], ["dispose"])) {
    const error = new TypeError(
      "setBusInsert: Parameter insert must be null or provide input, output, and dispose."
    );
    error.code = "INVALID_INSERT";
    throw error;
  }
  setBusInsert(bus, insert);
}
function tapBus2(bus, node) {
  validateBus("tapBus", bus, true);
  if (!(node instanceof AudioNode)) {
    const error = new TypeError("tapBus: Parameter node must be an AudioNode.");
    error.code = "INVALID_TAP";
    throw error;
  }
  return tapBus(bus, node);
}
function registerVolume(pluginApi) {
  const utils = pluginApi.utils;
  pluginApi.addCommand("setVolume", setVolume, false, ["volume"]);
  function setVolume(options) {
    const volume = utils.getFloat(options.volume, 0.75);
    validateVolume("setVolume", volume);
    setMasterVolume(volume);
  }
  pluginApi.addCommand("setBusVolume", setBusVolumeCommand, false, ["bus", "volume"]);
  function setBusVolumeCommand(options) {
    setBusVolume(options.bus, utils.getFloat(options.volume, NaN));
  }
  pluginApi.addCommand("setSoundLimiter", setSoundLimiter, false, ["enabled"]);
  function setSoundLimiter(options) {
    if (typeof options.enabled !== "boolean") {
      const error = new TypeError("setSoundLimiter: Parameter enabled must be a boolean.");
      error.code = "INVALID_ENABLED";
      throw error;
    }
    setLimiterEnabled(options.enabled);
  }
}
if (typeof window !== "undefined" && window.pi) {
  window.pi.registerPlugin({
    "name": "sound",
    "version": "2.0.0",
    "description": "Music playback and sound effects using Web Audio API",
    "init": playSoundPlugin
  });
}
export {
  playSoundPlugin as default
};
//# sourceMappingURL=sound.esm.js.map
