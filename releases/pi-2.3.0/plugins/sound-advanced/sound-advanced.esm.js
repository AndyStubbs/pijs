/**
 * sound-advanced - Synthesis, bus effects, analyser, presets, a sound-effect generator, PLAY instruments, music sync, and recording for the sound plugin
 * @version 1.0.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// plugins/sound-advanced/analyser.js
var analyser_exports = {};
__export(analyser_exports, {
  ANALYSER_BUSES: () => ANALYSER_BUSES,
  measureLevels: () => measureLevels,
  register: () => register
});
var ANALYSER_BUSES = ["sfx", "music", "audio", "master", "output"];
var FFT_SIZE = 2048;
var MIN_DECIBELS = -120;
var m_analysers = /* @__PURE__ */ new Map();
function throwCode(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function readFlag(name, value, code) {
  if (value == null) {
    return false;
  }
  if (typeof value !== "boolean") {
    throwCode(TypeError, `getSoundLevels: Parameter ${name} must be a boolean.`, code);
  }
  return value;
}
function measureLevels(samples) {
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    const magnitude = Math.abs(value);
    if (magnitude > peak) {
      peak = magnitude;
    }
    sum += value * value;
  }
  let rms = 0;
  if (samples.length > 0) {
    rms = Math.sqrt(sum / samples.length);
  }
  return { "peak": peak, "rms": rms };
}
function register(pluginApi, service) {
  function getAnalyser(bus) {
    let analyser = m_analysers.get(bus);
    if (!analyser) {
      const context = service.getContext();
      analyser = context.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0;
      analyser.minDecibels = MIN_DECIBELS;
      service.tapBus(bus, analyser);
      m_analysers.set(bus, analyser);
    }
    return analyser;
  }
  pluginApi.addCommand(
    "getSoundLevels",
    getSoundLevels,
    false,
    ["bus", "spectrum", "waveform"]
  );
  function getSoundLevels(options) {
    let bus = "master";
    if (options.bus != null) {
      bus = options.bus;
    }
    if (ANALYSER_BUSES.indexOf(bus) === -1) {
      throwCode(
        Error,
        "getSoundLevels: Parameter bus must be one of: sfx, music, audio, master, output.",
        "INVALID_BUS"
      );
    }
    const includeSpectrum = readFlag("spectrum", options.spectrum, "INVALID_SPECTRUM");
    const includeWaveform = readFlag("waveform", options.waveform, "INVALID_WAVEFORM");
    const analyser = getAnalyser(bus);
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    const levels = measureLevels(samples);
    let spectrum = null;
    if (includeSpectrum) {
      spectrum = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(spectrum);
    }
    let waveform = null;
    if (includeWaveform) {
      waveform = samples;
    }
    return {
      "peak": levels.peak,
      "rms": levels.rms,
      "spectrum": spectrum,
      "waveform": waveform
    };
  }
}

// plugins/sound-advanced/effects.js
var effects_exports = {};
__export(effects_exports, {
  EFFECT_BUSES: () => EFFECT_BUSES,
  EFFECT_TYPES: () => EFFECT_TYPES,
  MAX_CHAIN: () => MAX_CHAIN,
  register: () => register2,
  resolveChain: () => resolveChain,
  resolveEffectOptions: () => resolveEffectOptions
});

// plugins/sound-advanced/worklet.js
var RECORDER_PROCESSOR = "pi-recorder";
var CRUSHER_PROCESSOR = "pi-bitcrush";
var CHUNK_FRAMES = 4096;
function defineRecorder(name, chunkFrames) {
  registerProcessor(name, class extends AudioWorkletProcessor {
    constructor(options) {
      super();
      this.left = options.processorOptions.maxFrames;
      this.fill = 0;
      this.stopped = false;
      this.buffers = this.alloc();
      this.port.onmessage = () => {
        this.post("done");
        this.stopped = true;
      };
    }
    alloc() {
      return [new Float32Array(chunkFrames), new Float32Array(chunkFrames)];
    }
    post(end) {
      let samples = this.buffers;
      if (this.fill < chunkFrames) {
        samples = samples.map((buffer) => buffer.slice(0, this.fill));
      }
      this.port.postMessage(
        { "samples": samples, "end": end },
        samples.map((buffer) => buffer.buffer)
      );
      this.buffers = this.alloc();
      this.fill = 0;
    }
    process(inputs) {
      const input = inputs[0];
      if (this.stopped || this.left <= 0) {
        return false;
      }
      let count = 128;
      if (input[0]) {
        count = input[0].length;
      }
      count = Math.min(count, this.left);
      for (let c = 0; c < 2; c++) {
        const channel = input[c] || input[0];
        if (channel) {
          this.buffers[c].set(channel.subarray(0, count), this.fill);
        }
      }
      this.fill += count;
      this.left -= count;
      if (this.left <= 0) {
        this.post("full");
      } else if (this.fill === chunkFrames) {
        this.post(null);
      }
      return true;
    }
  });
}
function defineCrusher(name) {
  registerProcessor(name, class extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        {
          "name": "bits",
          "defaultValue": 8,
          "minValue": 1,
          "maxValue": 16,
          "automationRate": "k-rate"
        },
        {
          "name": "rate",
          "defaultValue": 1,
          "minValue": 1,
          "maxValue": 64,
          "automationRate": "k-rate"
        }
      ];
    }
    constructor() {
      super();
      this.held = [0, 0];
      this.count = [0, 0];
      this.stopped = false;
      this.port.onmessage = () => {
        this.stopped = true;
      };
    }
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      const output = outputs[0];
      const steps = Math.pow(2, parameters.bits[0] - 1);
      const hold = Math.round(parameters.rate[0]);
      for (let c = 0; c < output.length; c++) {
        const source = input[c] || input[0];
        const target = output[c];
        for (let i = 0; i < target.length; i++) {
          if (this.count[c] <= 0) {
            let sample = 0;
            if (source) {
              sample = source[i];
            }
            this.held[c] = Math.round(sample * steps) / steps;
            this.count[c] = hold;
          }
          target[i] = this.held[c];
          this.count[c]--;
        }
      }
      return !this.stopped;
    }
  });
}
var PROCESSOR_SOURCE = `(${defineRecorder})(${JSON.stringify(RECORDER_PROCESSOR)},${CHUNK_FRAMES});(${defineCrusher})(${JSON.stringify(CRUSHER_PROCESSOR)});`;
var m_modules = /* @__PURE__ */ new WeakMap();
function loadWorklet(context) {
  let promise = m_modules.get(context);
  if (!promise) {
    promise = Promise.resolve().then(() => {
      const url = URL.createObjectURL(
        new Blob([PROCESSOR_SOURCE], { "type": "text/javascript" })
      );
      return context.audioWorklet.addModule(url).finally(() => {
        URL.revokeObjectURL(url);
      });
    });
    promise.catch(() => {
      m_modules.delete(context);
    });
    m_modules.set(context, promise);
  }
  return promise;
}

// plugins/sound-advanced/effects.js
var EFFECT_BUSES = ["sfx", "music", "audio", "master"];
var EFFECT_TYPES = ["reverb", "delay", "filter", "distortion", "bitcrush", "chorus"];
var MAX_CHAIN = 4;
var RAMP_TIME = 0.02;
var MAX_DELAY_TIME = 2;
var CHORUS_DELAY = 0.015;
var DRIVE_CURVE = 20;
var DRIVE_MIN_GAIN = 5e-3;
var DRIVE_RANGE = 200;
var m_impulses = /* @__PURE__ */ new Map();
var m_driveCurve = null;
var m_chains = /* @__PURE__ */ new Map();
var m_crushWarned = false;
function throwCode2(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function setParam(ramps, param, value) {
  param.value = value;
  ramps.set(param, { "from": value, "to": value, "t0": 0, "t1": 0 });
}
function rampParam(ramps, param, target, time) {
  const ramp = ramps.get(param);
  let current = ramp.to;
  if (time <= ramp.t0) {
    current = ramp.from;
  } else if (time < ramp.t1) {
    current = ramp.from + (ramp.to - ramp.from) * (time - ramp.t0) / (ramp.t1 - ramp.t0);
  }
  param.cancelScheduledValues(time);
  if (time > ramp.t0 && time <= ramp.t1) {
    param.linearRampToValueAtTime(current, time);
  } else {
    param.setValueAtTime(current, time);
  }
  param.linearRampToValueAtTime(target, time + RAMP_TIME);
  ramps.set(param, { "from": current, "to": target, "t0": time, "t1": time + RAMP_TIME });
}
function getImpulse(context, time, decay) {
  const key = context.sampleRate + ":" + time + ":" + decay;
  let impulse = m_impulses.get(key);
  if (impulse) {
    return impulse;
  }
  const length = Math.max(Math.round(time * context.sampleRate), 1);
  impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  m_impulses.set(key, impulse);
  return impulse;
}
function getDriveCurve() {
  if (!m_driveCurve) {
    m_driveCurve = new Float32Array(4097);
    for (let i = 0; i < 4097; i++) {
      m_driveCurve[i] = Math.tanh(DRIVE_CURVE * (i / 2048 - 1));
    }
  }
  return m_driveCurve;
}
function driveGains(drive) {
  const gain = DRIVE_MIN_GAIN * Math.pow(DRIVE_RANGE, drive);
  return [gain, 1 / Math.tanh(DRIVE_CURVE * gain)];
}
function createMixStage(context, mix, wetInput, wetOutput, nodes, ramps) {
  const input = context.createGain();
  const output = context.createGain();
  const dry = context.createGain();
  const wet = context.createGain();
  setParam(ramps, dry.gain, 1 - mix);
  setParam(ramps, wet.gain, mix);
  input.connect(dry);
  dry.connect(output);
  if (wetInput) {
    input.connect(wetInput);
    wetOutput.connect(wet);
  }
  wet.connect(output);
  return {
    "input": input,
    "output": output,
    "dry": dry,
    "wet": wet,
    "nodes": [input, dry, wet, output].concat(nodes),
    "ramps": ramps
  };
}
function mixTargets(stage, mix) {
  if (stage.pending) {
    return [];
  }
  return [[stage.dry.gain, 1 - mix], [stage.wet.gain, mix]];
}
function buildReverb(context, opts) {
  const convolver = context.createConvolver();
  convolver.buffer = getImpulse(context, opts.time, opts.decay);
  return createMixStage(context, opts.mix, convolver, convolver, [convolver], /* @__PURE__ */ new Map());
}
function buildDelay(context, opts) {
  const ramps = /* @__PURE__ */ new Map();
  const delay = context.createDelay(MAX_DELAY_TIME);
  setParam(ramps, delay.delayTime, opts.time);
  const feedback = context.createGain();
  setParam(ramps, feedback.gain, opts.feedback);
  delay.connect(feedback);
  feedback.connect(delay);
  const stage = createMixStage(context, opts.mix, delay, delay, [delay, feedback], ramps);
  stage.delay = delay;
  stage.feedback = feedback;
  return stage;
}
function buildFilter(context, opts) {
  const ramps = /* @__PURE__ */ new Map();
  const filter = context.createBiquadFilter();
  filter.type = opts.type;
  setParam(ramps, filter.frequency, opts.cutoff);
  setParam(ramps, filter.Q, opts.q);
  return {
    "input": filter,
    "output": filter,
    "filter": filter,
    "nodes": [filter],
    "ramps": ramps
  };
}
function buildDistortion(context, opts) {
  const [preGain, makeUpGain] = driveGains(opts.drive);
  const ramps = /* @__PURE__ */ new Map();
  const pre = context.createGain();
  setParam(ramps, pre.gain, preGain);
  const shaper = context.createWaveShaper();
  shaper.curve = getDriveCurve();
  shaper.oversample = "2x";
  const tone = context.createBiquadFilter();
  setParam(ramps, tone.frequency, opts.tone);
  const makeUp = context.createGain();
  setParam(ramps, makeUp.gain, makeUpGain);
  pre.connect(shaper);
  shaper.connect(tone);
  tone.connect(makeUp);
  const stage = createMixStage(
    context,
    opts.mix,
    pre,
    makeUp,
    [pre, shaper, tone, makeUp],
    ramps
  );
  stage.pre = pre;
  stage.tone = tone;
  stage.makeUp = makeUp;
  return stage;
}
function buildChorus(context, opts) {
  const ramps = /* @__PURE__ */ new Map();
  const lfo = context.createOscillator();
  setParam(ramps, lfo.frequency, opts.rate);
  const stage = createMixStage(context, opts.mix, null, null, [lfo], ramps);
  stage.depths = [];
  for (const side of [-1, 1]) {
    const delay = context.createDelay(CHORUS_DELAY * 2);
    delay.channelCount = 1;
    delay.channelCountMode = "explicit";
    delay.delayTime.value = CHORUS_DELAY;
    const depth = context.createGain();
    setParam(ramps, depth.gain, side * opts.depth / 1e3);
    const panner = context.createStereoPanner();
    panner.pan.value = side;
    lfo.connect(depth);
    depth.connect(delay.delayTime);
    stage.input.connect(delay);
    delay.connect(panner);
    panner.connect(stage.wet);
    stage.depths.push(depth);
    stage.nodes.push(delay, depth, panner);
  }
  lfo.start();
  stage.lfo = lfo;
  stage.end = () => {
    lfo.stop();
  };
  return stage;
}
function buildBitcrush(context, opts) {
  const stage = createMixStage(context, 0, null, null, [], /* @__PURE__ */ new Map());
  stage.opts = opts;
  stage.pending = true;
  loadWorklet(context).then(() => {
    if (stage.disposed) {
      return;
    }
    const node = new AudioWorkletNode(context, CRUSHER_PROCESSOR, {
      "channelCount": 2,
      "channelCountMode": "explicit",
      "outputChannelCount": [2],
      "parameterData": { "bits": stage.opts.bits, "rate": stage.opts.rate }
    });
    for (const name of ["bits", "rate"]) {
      setParam(stage.ramps, node.parameters.get(name), stage.opts[name]);
    }
    stage.input.connect(node);
    node.connect(stage.wet);
    stage.node = node;
    stage.nodes.push(node);
    stage.end = () => {
      node.port.postMessage("stop");
      node.port.close();
    };
    stage.pending = false;
    for (const [param, target] of mixTargets(stage, stage.opts.mix)) {
      rampParam(stage.ramps, param, target, context.currentTime);
    }
  }, () => {
    if (!m_crushWarned) {
      m_crushWarned = true;
      console.warn(
        "setBusEffect: The bitcrush effect is unavailable; the audio worklet could not load."
      );
    }
  });
  return stage;
}
function crushTargets(name) {
  return (stage, value) => {
    if (stage.pending) {
      return [];
    }
    return [[stage.node.parameters.get(name), value]];
  };
}
var EFFECTS = {
  "reverb": {
    "options": {
      "time": [2, 0.1, 10],
      "decay": [3, 0.1, 20],
      "mix": [0.3, 0, 1]
    },
    "ramp": { "mix": mixTargets },
    "build": buildReverb
  },
  "delay": {
    "options": {
      "time": [0.25, 0.01, MAX_DELAY_TIME],
      "feedback": [0.4, 0, 0.95],
      "mix": [0.3, 0, 1]
    },
    "ramp": {
      "time": (stage, value) => [[stage.delay.delayTime, value]],
      "feedback": (stage, value) => [[stage.feedback.gain, value]],
      "mix": mixTargets
    },
    "build": buildDelay
  },
  "filter": {
    "options": {
      "type": ["lowpass", ["lowpass", "highpass", "bandpass"]],
      "cutoff": [1e3, 20, 2e4],
      "q": [1, 1e-4, 100]
    },
    "ramp": {
      "cutoff": (stage, value) => [[stage.filter.frequency, value]],
      "q": (stage, value) => [[stage.filter.Q, value]]
    },
    "build": buildFilter
  },
  "distortion": {
    "options": {
      "drive": [0.5, 0, 1],
      "tone": [4e3, 200, 2e4],
      "mix": [1, 0, 1]
    },
    "ramp": {
      "drive": (stage, value) => {
        const [preGain, makeUpGain] = driveGains(value);
        return [[stage.pre.gain, preGain], [stage.makeUp.gain, makeUpGain]];
      },
      "tone": (stage, value) => [[stage.tone.frequency, value]],
      "mix": mixTargets
    },
    "build": buildDistortion
  },
  "bitcrush": {
    "options": {
      "bits": [8, 1, 16],
      "rate": [1, 1, 64],
      "mix": [1, 0, 1]
    },
    "ramp": {
      "bits": crushTargets("bits"),
      "rate": crushTargets("rate"),
      "mix": mixTargets
    },
    "build": buildBitcrush
  },
  "chorus": {
    "options": {
      "rate": [1.5, 0.1, 10],
      "depth": [3, 0, 10],
      "mix": [0.5, 0, 1]
    },
    "ramp": {
      "rate": (stage, value) => [[stage.lfo.frequency, value]],
      "depth": (stage, value) => [
        [stage.depths[0].gain, -value / 1e3],
        [stage.depths[1].gain, value / 1e3]
      ],
      "mix": mixTargets
    },
    "build": buildChorus
  }
};
function buildChain(context, chain) {
  const stages = chain.map((item) => {
    const stage = EFFECTS[item.effect].build(context, item.opts);
    stage.opts = item.opts;
    return stage;
  });
  for (let i = 1; i < stages.length; i++) {
    stages[i - 1].output.connect(stages[i].input);
  }
  return {
    "stages": stages,
    "insert": {
      "input": stages[0].input,
      "output": stages[stages.length - 1].output,
      "dispose": () => {
        for (const stage of stages) {
          if (stage.disposed) {
            continue;
          }
          stage.disposed = true;
          if (stage.end) {
            stage.end();
          }
          for (const node of stage.nodes) {
            node.disconnect();
          }
        }
      }
    }
  };
}
function canUpdate(current, context, chain) {
  if (!current || current.context !== context || current.chain.length !== chain.length) {
    return false;
  }
  return chain.every((item, i) => {
    const previous = current.chain[i];
    if (item.effect !== previous.effect || current.stages[i].disposed) {
      return false;
    }
    const ramp = EFFECTS[item.effect].ramp;
    return Object.keys(item.opts).every(
      (name) => ramp[name] || item.opts[name] === previous.opts[name]
    );
  });
}
function resolveEffectOptions(effect, options) {
  if (options == null) {
    options = {};
  } else if (typeof options !== "object") {
    throwCode2(
      TypeError,
      "setBusEffect: Parameter options must be an object.",
      "INVALID_OPTIONS"
    );
  }
  const specs = EFFECTS[effect].options;
  const resolved = {};
  for (const name of Object.keys(specs)) {
    const [def, min, max] = specs[name];
    let value = def;
    if (Array.isArray(min)) {
      if (options[name] != null) {
        value = options[name];
      }
      if (min.indexOf(value) === -1) {
        throwCode2(
          RangeError,
          `setBusEffect: Option ${name} for ${effect} must be one of: ${min.join(", ")}.`,
          "INVALID_EFFECT_OPTION"
        );
      }
    } else {
      if (options[name] != null) {
        value = Number(options[name]);
      }
      if (!(value >= min && value <= max)) {
        throwCode2(
          RangeError,
          `setBusEffect: Option ${name} for ${effect} must be a number between ${min} and ${max}.`,
          "INVALID_EFFECT_OPTION"
        );
      }
    }
    resolved[name] = value;
  }
  return resolved;
}
function resolveChain(effect, options) {
  if (effect == null) {
    return null;
  }
  if (!Array.isArray(effect)) {
    if (EFFECT_TYPES.indexOf(effect) === -1) {
      throwCode2(
        Error,
        `setBusEffect: Parameter effect must be one of: ${EFFECT_TYPES.join(", ")}, an array, or null.`,
        "INVALID_EFFECT"
      );
    }
    return [{ "effect": effect, "opts": resolveEffectOptions(effect, options) }];
  }
  if (options != null) {
    throwCode2(
      TypeError,
      "setBusEffect: Parameter options must be omitted for a chain; each item holds its own options.",
      "INVALID_OPTIONS"
    );
  }
  if (effect.length > MAX_CHAIN) {
    throwCode2(
      RangeError,
      `setBusEffect: A chain holds at most ${MAX_CHAIN} effects.`,
      "INVALID_EFFECT"
    );
  }
  if (effect.length === 0) {
    return null;
  }
  return effect.map((item) => {
    if (item === null || typeof item !== "object" || EFFECT_TYPES.indexOf(item.effect) === -1) {
      throwCode2(
        Error,
        `setBusEffect: Each chain item must be an object whose effect is one of: ${EFFECT_TYPES.join(", ")}.`,
        "INVALID_EFFECT"
      );
    }
    return { "effect": item.effect, "opts": resolveEffectOptions(item.effect, item) };
  });
}
function register2(pluginApi, service) {
  pluginApi.addCommand("setBusEffect", setBusEffect, false, ["bus", "effect", "options"]);
  function setBusEffect(options) {
    const bus = options.bus;
    if (EFFECT_BUSES.indexOf(bus) === -1) {
      throwCode2(
        Error,
        "setBusEffect: Parameter bus must be one of: sfx, music, audio, master.",
        "INVALID_BUS"
      );
    }
    const chain = resolveChain(options.effect, options.options);
    if (chain === null) {
      service.setBusInsert(bus, null);
      m_chains.delete(bus);
      return;
    }
    const context = service.getContext();
    const current = m_chains.get(bus);
    if (canUpdate(current, context, chain)) {
      const time = context.currentTime;
      chain.forEach((item, i) => {
        const stage = current.stages[i];
        const ramp = EFFECTS[item.effect].ramp;
        for (const name of Object.keys(item.opts)) {
          const value = item.opts[name];
          if (value !== stage.opts[name]) {
            for (const [param, target] of ramp[name](stage, value)) {
              rampParam(stage.ramps, param, target, time);
            }
          }
        }
        stage.opts = item.opts;
      });
      current.chain = chain;
      return;
    }
    const built = buildChain(context, chain);
    service.setBusInsert(bus, built.insert);
    m_chains.set(bus, { "context": context, "chain": chain, "stages": built.stages });
  }
}

// plugins/sound-advanced/generator.js
var generator_exports = {};
__export(generator_exports, {
  SFX_CATEGORIES: () => SFX_CATEGORIES,
  createRandom: () => createRandom,
  generateSfxOptions: () => generateSfxOptions,
  register: () => register5
});

// plugins/sound-advanced/presets.js
var presets_exports = {};
__export(presets_exports, {
  BUILT_IN_PRESETS: () => BUILT_IN_PRESETS,
  freezeCopy: () => freezeCopy,
  getPreset: () => getPreset,
  register: () => register4,
  storePreset: () => storePreset,
  varyPreset: () => varyPreset
});

// plugins/sound-advanced/synth.js
var synth_exports = {};
__export(synth_exports, {
  FILTER_TYPES: () => FILTER_TYPES,
  LFO_SHAPES: () => LFO_SHAPES,
  MAX_HOLD: () => MAX_HOLD,
  SET_SYNTH_PARAMETERS: () => SET_SYNTH_PARAMETERS,
  SYNTH_BUSES: () => SYNTH_BUSES,
  SYNTH_PARAMETERS: () => SYNTH_PARAMETERS,
  buildSynthInserts: () => buildSynthInserts,
  playSynth: () => playSynth,
  pulseWaveTables: () => pulseWaveTables,
  randomPoints: () => randomPoints,
  register: () => register3,
  resolveOType: () => resolveOType,
  resolveSetSynth: () => resolveSetSynth,
  resolveSynthOptions: () => resolveSynthOptions,
  resolveSynthSpec: () => resolveSynthSpec
});
var FILTER_TYPES = ["lowpass", "highpass", "bandpass", "notch"];
var SYNTH_PARAMETERS = [
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
  "frequencyEnd",
  "filterType",
  "filterCutoff",
  "filterQ",
  "filterAttackTime",
  "filterDecayTime",
  "filterSustainLevel",
  "filterReleaseTime",
  "filterAmount",
  "vibratoRate",
  "vibratoDepth",
  "tremoloRate",
  "tremoloDepth",
  "duty",
  "arpeggio",
  "arpeggioRate",
  "hold",
  "vibratoShape",
  "tremoloShape",
  "bus"
];
var SYNTH_BUSES = ["sfx", "music"];
var LFO_SHAPES = ["sine", "random"];
var SET_SYNTH_PARAMETERS = ["soundId", "volume", "detune", "filterCutoff"];
var MAX_HOLD = 600;
var MAX_DETUNE = 4800;
var SET_TIME_CONSTANT = 7e-3;
var LN_10000 = Math.log(1e4);
var RANDOM_POINTS = 256;
var RANDOM_POINT_FRAMES = 32;
var RANDOM_SEED = 49734321;
var PULSE_HARMONICS = 64;
var MAX_PULSE_TABLES = 64;
var MAX_ARPEGGIO_STEPS = 32;
var MAX_ARPEGGIO_SEMITONES = 48;
var MAX_ARPEGGIO_EVENTS = 4096;
var MIN_RAMP = 3e-3;
var m_pulseTables = /* @__PURE__ */ new Map();
var m_service = null;
var m_held = /* @__PURE__ */ new Map();
var m_randomBuffers = /* @__PURE__ */ new WeakMap();
function throwCode3(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function readNumber(value, def) {
  if (value === null || value === void 0) {
    return def;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return def;
  }
  return parsed;
}
function checkRange(name, resolved, param, min, max, code) {
  const value = resolved[param];
  if (!(value >= min && value <= max)) {
    throwCode3(
      RangeError,
      `${name}: Parameter ${param} must be a number between ${min} and ${max}.`,
      code
    );
  }
}
function checkNonNegative(name, resolved, param, code) {
  if (!(resolved[param] >= 0)) {
    throwCode3(
      RangeError,
      `${name}: Parameter ${param} must be a number greater than or equal to 0.`,
      code
    );
  }
}
function checkPositive(name, resolved, param, max, code) {
  const value = resolved[param];
  if (!(value > 0 && value <= max)) {
    throwCode3(
      RangeError,
      `${name}: Parameter ${param} must be a number greater than 0 and at most ${max}.`,
      code
    );
  }
}
function readArpeggio(name, arpeggio) {
  if (arpeggio === null || arpeggio === void 0) {
    return null;
  }
  if (!Array.isArray(arpeggio) || arpeggio.length === 0 || arpeggio.length > MAX_ARPEGGIO_STEPS || arpeggio.some(
    (step) => !Number.isFinite(step) || Math.abs(step) > MAX_ARPEGGIO_SEMITONES
  )) {
    throwCode3(
      TypeError,
      `${name}: Parameter arpeggio must be an array of 1 to ${MAX_ARPEGGIO_STEPS} semitone offsets between -${MAX_ARPEGGIO_SEMITONES} and ${MAX_ARPEGGIO_SEMITONES}.`,
      "INVALID_ARPEGGIO"
    );
  }
  return arpeggio.slice();
}
function createInsert(parts) {
  let stopAt = Infinity;
  let disposed = false;
  return {
    "input": parts.input,
    "output": parts.output,
    "detune": parts.detune || null,
    "start": (when, gateEnd) => {
      for (const source of parts.sources) {
        source.start(when);
      }
      if (parts.onStart) {
        parts.onStart(when, gateEnd);
      }
    },
    "stop": (when) => {
      if (when >= stopAt) {
        return;
      }
      stopAt = when;
      for (const source of parts.sources) {
        source.stop(when);
      }
    },
    "dispose": () => {
      if (disposed) {
        return;
      }
      disposed = true;
      for (const node of parts.nodes) {
        node.disconnect();
      }
    }
  };
}
function createFilterInsert(context, params) {
  const filter = context.createBiquadFilter();
  filter.type = params.type;
  filter.frequency.value = params.cutoff;
  filter.Q.value = params.q;
  return createInsert({
    "input": filter,
    "output": filter,
    "sources": [],
    "nodes": [filter],
    "onStart": (when, gateEnd) => {
      if (params.amount !== 0) {
        m_service.scheduleEnvelope(
          filter.detune,
          params.envelope,
          when,
          gateEnd,
          params.amount * 1200
        );
      }
      if (params.onStart) {
        params.onStart(filter);
      }
    }
  });
}
function createHoldInsert(context, params) {
  const envelope = context.createGain();
  envelope.gain.value = 0;
  const level = context.createGain();
  level.gain.value = params.volume;
  const pitch = context.createConstantSource();
  pitch.offset.value = 0;
  envelope.connect(level);
  const insert = createInsert({
    "input": envelope,
    "output": level,
    "detune": pitch,
    "sources": [pitch],
    "nodes": [pitch, envelope, level],
    "onStart": (when, gateEnd) => {
      m_service.scheduleEnvelope(envelope.gain, params.envelope, when, gateEnd, 1);
      params.onStart({
        "when": when,
        "envelope": envelope.gain,
        "level": level.gain,
        "pitch": pitch.offset
      });
    }
  });
  const dispose = insert.dispose;
  insert.dispose = () => {
    dispose();
    params.onDispose();
  };
  return insert;
}
function releaseParam(param, envelope, start, peak, time) {
  const attack = Math.max(envelope.attackTime, MIN_RAMP);
  const release = Math.max(envelope.releaseTime, MIN_RAMP);
  param.cancelScheduledValues(time);
  if (time - start < attack) {
    param.linearRampToValueAtTime(peak * (time - start) / attack, time);
  }
  param.setTargetAtTime(0, time, release / LN_10000);
  param.setValueAtTime(0, time + release);
  return time + release;
}
function releaseHeld(held) {
  if (held.released) {
    return;
  }
  held.released = true;
  const nodes = held.nodes;
  if (nodes === null) {
    m_held.delete(held.id);
    m_service.stopVoice(held.id);
    return;
  }
  const time = Math.max(m_service.getContext().currentTime, nodes.when);
  const end = releaseParam(nodes.envelope, held.envelope, nodes.when, 1, time);
  if (held.filter && held.filterPeak !== 0) {
    releaseParam(
      held.filter.detune,
      held.filterEnvelope,
      nodes.when,
      held.filterPeak,
      time
    );
  }
  m_service.stopVoice(held.id, end);
}
function moveParam(param, value, start) {
  const time = Math.max(m_service.getContext().currentTime, start);
  param.setTargetAtTime(value, time, SET_TIME_CONSTANT);
}
function sweepHeld() {
  const now = m_service.getContext().currentTime;
  for (const held of m_held.values()) {
    if (held.nodes === null && now > held.expires) {
      m_held.delete(held.id);
    }
  }
}
function playHeld(name, resolved) {
  sweepHeld();
  const held = {
    "id": null,
    "nodes": null,
    "filter": null,
    "released": false,
    "disposed": false,
    "expires": m_service.getContext().currentTime + resolved.delay + 1,
    "envelope": { "attackTime": resolved.attackTime, "releaseTime": resolved.releaseTime },
    "filterEnvelope": {
      "attackTime": resolved.filterAttackTime,
      "releaseTime": resolved.filterReleaseTime
    },
    "filterPeak": resolved.filterAmount * 1200
  };
  const inserts = buildSynthInserts(resolved, resolved.releaseTime, (filter) => {
    held.filter = filter;
  });
  inserts.push({
    "factory": createHoldInsert,
    "params": {
      "volume": resolved.volume,
      "envelope": {
        "attackTime": resolved.attackTime,
        "decayTime": resolved.decayTime,
        "sustainLevel": resolved.sustainLevel,
        "releaseTime": resolved.releaseTime
      },
      "onStart": (nodes) => {
        held.nodes = nodes;
      },
      "onDispose": () => {
        held.disposed = true;
        m_held.delete(held.id);
      }
    }
  });
  held.id = m_service.createVoice({
    "frequency": resolved.frequency,
    "frequencyEnd": null,
    "duration": MAX_HOLD,
    "volume": 1,
    "oType": resolveOType(resolved),
    "delay": resolved.delay,
    "attackTime": 0,
    "decayTime": 0,
    "sustainLevel": 1,
    "releaseTime": resolved.releaseTime,
    "pan": resolved.pan,
    "bus": resolved.bus,
    "inserts": inserts
  }, name);
  if (!held.disposed) {
    m_held.set(held.id, held);
  }
  return held.id;
}
function getRandomBuffer(context) {
  let buffer = m_randomBuffers.get(context);
  if (buffer) {
    return buffer;
  }
  const points = randomPoints(RANDOM_POINTS);
  buffer = context.createBuffer(1, RANDOM_POINTS * RANDOM_POINT_FRAMES, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const index = Math.floor(i / RANDOM_POINT_FRAMES);
    const from = points[index];
    const to = points[(index + 1) % RANDOM_POINTS];
    data[i] = from + (to - from) * (i % RANDOM_POINT_FRAMES) / RANDOM_POINT_FRAMES;
  }
  m_randomBuffers.set(context, buffer);
  return buffer;
}
function createLfo(context, params) {
  if (params.shape !== "random") {
    const lfo2 = context.createOscillator();
    lfo2.frequency.value = params.rate;
    return lfo2;
  }
  const buffer = getRandomBuffer(context);
  const lfo = context.createBufferSource();
  lfo.buffer = buffer;
  lfo.loop = true;
  lfo.playbackRate.value = params.rate * RANDOM_POINT_FRAMES / context.sampleRate;
  const start = lfo.start.bind(lfo);
  lfo.start = (when) => start(when, Math.random() * buffer.duration);
  return lfo;
}
function createTremoloInsert(context, params) {
  const amp = context.createGain();
  amp.gain.value = 1 - params.depth / 2;
  const lfo = createLfo(context, params);
  const depth = context.createGain();
  depth.gain.value = params.depth / 2;
  lfo.connect(depth);
  depth.connect(amp.gain);
  return createInsert({
    "input": amp,
    "output": amp,
    "sources": [lfo],
    "nodes": [lfo, depth, amp]
  });
}
function createVibratoInsert(context, params) {
  const pass = context.createGain();
  const lfo = createLfo(context, params);
  const depth = context.createGain();
  depth.gain.value = params.depth;
  lfo.connect(depth);
  return createInsert({
    "input": pass,
    "output": pass,
    "detune": depth,
    "sources": [lfo],
    "nodes": [lfo, depth, pass]
  });
}
function createArpeggioInsert(context, params) {
  const pass = context.createGain();
  const steps = context.createConstantSource();
  steps.offset.value = params.steps[0];
  return createInsert({
    "input": pass,
    "output": pass,
    "detune": steps,
    "sources": [steps],
    "nodes": [steps, pass],
    "onStart": (when, gateEnd) => {
      const end = gateEnd + Math.max(params.releaseTime, MIN_RAMP);
      const interval = 1 / params.rate;
      steps.offset.setValueAtTime(params.steps[0], when);
      for (let count = 1; count < MAX_ARPEGGIO_EVENTS; count++) {
        const time = when + count * interval;
        if (time >= end) {
          break;
        }
        steps.offset.setValueAtTime(params.steps[count % params.steps.length], time);
      }
    }
  });
}
function randomPoints(count) {
  const points = [];
  let state = RANDOM_SEED;
  for (let i = 0; i < count; i++) {
    state = Math.imul(state, 1664525) + 1013904223 >>> 0;
    points.push(state / 2147483648 - 1);
  }
  return points;
}
function pulseWaveTables(duty) {
  let tables = m_pulseTables.get(duty);
  if (tables) {
    return tables;
  }
  const real = [0];
  const imag = [0];
  for (let n = 1; n <= PULSE_HARMONICS; n++) {
    const angle = 2 * Math.PI * n * duty;
    real.push(2 * Math.sin(angle) / (Math.PI * n));
    imag.push(2 * (1 - Math.cos(angle)) / (Math.PI * n));
  }
  tables = Object.freeze([Object.freeze(real), Object.freeze(imag)]);
  if (m_pulseTables.size >= MAX_PULSE_TABLES) {
    m_pulseTables.delete(m_pulseTables.keys().next().value);
  }
  m_pulseTables.set(duty, tables);
  return tables;
}
function resolveSynthOptions(name, options) {
  if (options === null || typeof options !== "object") {
    throwCode3(TypeError, `${name}: Parameter options must be an object.`, "INVALID_OPTIONS");
  }
  let frequencyEnd = null;
  if (options.frequencyEnd != null) {
    frequencyEnd = readNumber(options.frequencyEnd, NaN);
  }
  let oType = "triangle";
  if (options.oType != null) {
    oType = options.oType;
  }
  let filterType = null;
  if (options.filterType != null) {
    filterType = options.filterType;
  }
  const resolved = {
    "frequency": readNumber(options.frequency, 440),
    "frequencyEnd": frequencyEnd,
    "duration": readNumber(options.duration, 1),
    "volume": readNumber(options.volume, 1),
    "oType": oType,
    "delay": readNumber(options.delay, 0),
    "attackTime": readNumber(options.attackTime, 0),
    "decayTime": readNumber(options.decayTime, 0),
    "sustainLevel": readNumber(options.sustainLevel, 1),
    "releaseTime": readNumber(options.releaseTime, 0.1),
    "pan": readNumber(options.pan, 0),
    "filterType": filterType,
    "filterCutoff": readNumber(options.filterCutoff, 1e3),
    "filterQ": readNumber(options.filterQ, 1),
    "filterAttackTime": readNumber(options.filterAttackTime, 0),
    "filterDecayTime": readNumber(options.filterDecayTime, 0),
    "filterSustainLevel": readNumber(options.filterSustainLevel, 1),
    "filterReleaseTime": readNumber(options.filterReleaseTime, 0.1),
    "filterAmount": readNumber(options.filterAmount, 0),
    "vibratoRate": readNumber(options.vibratoRate, 5),
    "vibratoDepth": readNumber(options.vibratoDepth, 0),
    "tremoloRate": readNumber(options.tremoloRate, 5),
    "tremoloDepth": readNumber(options.tremoloDepth, 0),
    "duty": readNumber(options.duty, 0.5),
    "arpeggio": readArpeggio(name, options.arpeggio),
    "arpeggioRate": readNumber(options.arpeggioRate, 12),
    "hold": options.hold ?? false,
    "vibratoShape": options.vibratoShape ?? "sine",
    "tremoloShape": options.tremoloShape ?? "sine",
    "bus": options.bus ?? "sfx"
  };
  checkNonNegative(name, resolved, "duration", "INVALID_DURATION");
  checkRange(name, resolved, "volume", 0, 1, "INVALID_VOLUME");
  checkNonNegative(name, resolved, "delay", "INVALID_DELAY");
  checkNonNegative(name, resolved, "attackTime", "INVALID_ATTACK_TIME");
  checkNonNegative(name, resolved, "decayTime", "INVALID_DECAY_TIME");
  checkRange(name, resolved, "sustainLevel", 0, 1, "INVALID_SUSTAIN_LEVEL");
  checkNonNegative(name, resolved, "releaseTime", "INVALID_RELEASE_TIME");
  checkRange(name, resolved, "pan", -1, 1, "INVALID_PAN");
  if (frequencyEnd !== null && !(resolved.frequency > 0 && frequencyEnd > 0)) {
    throwCode3(
      RangeError,
      `${name}: Parameters frequency and frequencyEnd must be greater than 0 for a sweep.`,
      "INVALID_FREQUENCY"
    );
  }
  if (typeof oType !== "string" && !Array.isArray(oType)) {
    throwCode3(
      TypeError,
      `${name}: Parameter oType must be a string or an array.`,
      "INVALID_OTYPE"
    );
  }
  if (filterType !== null && FILTER_TYPES.indexOf(filterType) === -1) {
    throwCode3(
      Error,
      `${name}: Parameter filterType must be one of: ${FILTER_TYPES.join(", ")}.`,
      "INVALID_FILTER_TYPE"
    );
  }
  checkPositive(name, resolved, "filterCutoff", 24e3, "INVALID_FILTER_CUTOFF");
  checkRange(name, resolved, "filterQ", 0, 100, "INVALID_FILTER_Q");
  checkNonNegative(name, resolved, "filterAttackTime", "INVALID_FILTER_ATTACK_TIME");
  checkNonNegative(name, resolved, "filterDecayTime", "INVALID_FILTER_DECAY_TIME");
  checkRange(name, resolved, "filterSustainLevel", 0, 1, "INVALID_FILTER_SUSTAIN_LEVEL");
  checkNonNegative(name, resolved, "filterReleaseTime", "INVALID_FILTER_RELEASE_TIME");
  checkRange(name, resolved, "filterAmount", -10, 10, "INVALID_FILTER_AMOUNT");
  checkPositive(name, resolved, "vibratoRate", 100, "INVALID_VIBRATO_RATE");
  checkRange(name, resolved, "vibratoDepth", 0, 1200, "INVALID_VIBRATO_DEPTH");
  checkPositive(name, resolved, "tremoloRate", 100, "INVALID_TREMOLO_RATE");
  checkRange(name, resolved, "tremoloDepth", 0, 1, "INVALID_TREMOLO_DEPTH");
  if (!(resolved.duty > 0 && resolved.duty < 1)) {
    throwCode3(
      RangeError,
      `${name}: Parameter duty must be a number between 0 and 1, exclusive.`,
      "INVALID_DUTY"
    );
  }
  checkPositive(name, resolved, "arpeggioRate", 100, "INVALID_ARPEGGIO_RATE");
  if (typeof resolved.hold !== "boolean") {
    throwCode3(TypeError, `${name}: Parameter hold must be a boolean.`, "INVALID_HOLD");
  }
  for (const param of ["vibratoShape", "tremoloShape"]) {
    if (LFO_SHAPES.indexOf(resolved[param]) === -1) {
      throwCode3(
        Error,
        `${name}: Parameter ${param} must be one of: ${LFO_SHAPES.join(", ")}.`,
        param === "vibratoShape" ? "INVALID_VIBRATO_SHAPE" : "INVALID_TREMOLO_SHAPE"
      );
    }
  }
  if (SYNTH_BUSES.indexOf(resolved.bus) === -1) {
    throwCode3(
      Error,
      `${name}: Parameter bus must be one of: ${SYNTH_BUSES.join(", ")}.`,
      "INVALID_BUS"
    );
  }
  return resolved;
}
function buildSynthInserts(resolved, releaseTime, onFilter) {
  const inserts = [];
  if (resolved.filterType !== null) {
    const params = {
      "type": resolved.filterType,
      "cutoff": resolved.filterCutoff,
      "q": resolved.filterQ,
      "amount": resolved.filterAmount,
      "envelope": {
        "attackTime": resolved.filterAttackTime,
        "decayTime": resolved.filterDecayTime,
        "sustainLevel": resolved.filterSustainLevel,
        "releaseTime": resolved.filterReleaseTime
      }
    };
    if (onFilter) {
      params.onStart = onFilter;
    }
    inserts.push({ "factory": createFilterInsert, "params": params });
  }
  if (resolved.tremoloDepth > 0) {
    inserts.push({
      "factory": createTremoloInsert,
      "params": lfoParams(resolved.tremoloRate, resolved.tremoloDepth, resolved.tremoloShape)
    });
  }
  if (resolved.vibratoDepth > 0) {
    inserts.push({
      "factory": createVibratoInsert,
      "params": lfoParams(resolved.vibratoRate, resolved.vibratoDepth, resolved.vibratoShape)
    });
  }
  if (resolved.arpeggio !== null) {
    inserts.push({
      "factory": createArpeggioInsert,
      "params": {
        "steps": resolved.arpeggio.map((step) => step * 100),
        "rate": resolved.arpeggioRate,
        "releaseTime": releaseTime
      }
    });
  }
  return inserts;
}
function lfoParams(rate, depth, shape) {
  const params = { "rate": rate, "depth": depth };
  if (shape !== "sine") {
    params.shape = shape;
  }
  return params;
}
function resolveOType(resolved) {
  if (resolved.oType === "pulse") {
    return pulseWaveTables(resolved.duty);
  }
  return resolved.oType;
}
function resolveSynthSpec(name, options) {
  const resolved = resolveSynthOptions(name, options);
  return {
    "frequency": resolved.frequency,
    "frequencyEnd": resolved.frequencyEnd,
    "duration": resolved.duration,
    "volume": resolved.volume,
    "oType": resolveOType(resolved),
    "delay": resolved.delay,
    "attackTime": resolved.attackTime,
    "decayTime": resolved.decayTime,
    "sustainLevel": resolved.sustainLevel,
    "releaseTime": resolved.releaseTime,
    "pan": resolved.pan,
    "bus": resolved.bus,
    "inserts": buildSynthInserts(resolved, resolved.releaseTime)
  };
}
function playSynth(name, options) {
  if (options && options.hold === true) {
    return playHeld(name, resolveSynthOptions(name, options));
  }
  return m_service.createVoice(resolveSynthSpec(name, options), name);
}
function resolveSetSynth(options) {
  const resolved = {};
  for (const param of ["volume", "detune", "filterCutoff"]) {
    resolved[param] = options[param] == null ? null : readNumber(options[param], NaN);
  }
  if (resolved.volume !== null) {
    checkRange("setSynth", resolved, "volume", 0, 1, "INVALID_VOLUME");
  }
  if (resolved.detune !== null) {
    checkRange("setSynth", resolved, "detune", -MAX_DETUNE, MAX_DETUNE, "INVALID_DETUNE");
  }
  if (resolved.filterCutoff !== null) {
    checkPositive("setSynth", resolved, "filterCutoff", 24e3, "INVALID_FILTER_CUTOFF");
  }
  return resolved;
}
function register3(pluginApi, service) {
  m_service = service;
  pluginApi.addCommand("synth", synth, false, SYNTH_PARAMETERS);
  function synth(options) {
    return playSynth("synth", options);
  }
  pluginApi.addCommand("releaseSound", releaseSound, false, ["soundId"]);
  function releaseSound(options) {
    if (options.soundId == null) {
      for (const held2 of Array.from(m_held.values())) {
        releaseHeld(held2);
      }
      return;
    }
    const held = m_held.get(options.soundId);
    if (held) {
      releaseHeld(held);
    }
  }
  pluginApi.addCommand("setSynth", setSynth, false, SET_SYNTH_PARAMETERS);
  function setSynth(options) {
    const resolved = resolveSetSynth(options);
    const held = m_held.get(options.soundId);
    if (!held || held.nodes === null) {
      return;
    }
    const nodes = held.nodes;
    if (resolved.volume !== null) {
      moveParam(nodes.level, resolved.volume, nodes.when);
    }
    if (resolved.detune !== null) {
      moveParam(nodes.pitch, resolved.detune, nodes.when);
    }
    if (resolved.filterCutoff !== null && held.filter) {
      moveParam(held.filter.frequency, resolved.filterCutoff, nodes.when);
    }
  }
}

// plugins/sound-advanced/presets.js
var MAX_PITCH_JITTER = 3;
var MAX_DURATION_JITTER = 0.1;
var BUILT_IN_PRESETS = {
  "coin": {
    "frequency": 988,
    "duration": 0.2,
    "volume": 0.5,
    "oType": "pulse",
    "duty": 0.5,
    "releaseTime": 0.15,
    "arpeggio": [0, 5],
    "arpeggioRate": 14
  },
  "laser": {
    "frequency": 1400,
    "frequencyEnd": 180,
    "duration": 0.16,
    "volume": 0.45,
    "oType": "sawtooth",
    "releaseTime": 0.05,
    "filterType": "lowpass",
    "filterCutoff": 3500
  },
  "jump": {
    "frequency": 280,
    "frequencyEnd": 640,
    "duration": 0.16,
    "volume": 0.5,
    "oType": "pulse",
    "duty": 0.25,
    "releaseTime": 0.06
  },
  "hit": {
    "duration": 0.05,
    "volume": 0.9,
    "oType": "white",
    "releaseTime": 0.12,
    "filterType": "lowpass",
    "filterCutoff": 5e3
  },
  "explosion": {
    "duration": 0.5,
    "volume": 0.85,
    "oType": "pink",
    "decayTime": 0.45,
    "sustainLevel": 0.5,
    "releaseTime": 0.5,
    "filterType": "lowpass",
    "filterCutoff": 800,
    "filterAmount": 2.5,
    "filterDecayTime": 0.5,
    "filterSustainLevel": 0
  },
  "powerup": {
    "frequency": 440,
    "frequencyEnd": 880,
    "duration": 0.45,
    "volume": 0.45,
    "oType": "square",
    "releaseTime": 0.1,
    "arpeggio": [0, 4, 7, 12],
    "arpeggioRate": 20
  },
  "blip": {
    "frequency": 1320,
    "duration": 0.03,
    "volume": 0.4,
    "oType": "pulse",
    "duty": 0.125,
    "releaseTime": 0.03
  },
  "select": {
    "frequency": 660,
    "duration": 0.08,
    "volume": 0.45,
    "oType": "triangle",
    "releaseTime": 0.06,
    "arpeggio": [0, 7],
    "arpeggioRate": 25
  }
};
var m_presets = /* @__PURE__ */ new Map();
function throwCode4(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function freezeCopy(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeCopy));
  }
  if (value !== null && typeof value === "object") {
    const copy = {};
    for (const key of Object.keys(value)) {
      copy[key] = freezeCopy(value[key]);
    }
    return Object.freeze(copy);
  }
  return value;
}
function storePreset(name, params) {
  if (typeof name !== "string" || name === "") {
    throwCode4(
      TypeError,
      "definePreset: Parameter name must be a non-empty string.",
      "INVALID_PRESET_NAME"
    );
  }
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    throwCode4(
      TypeError,
      "definePreset: Parameter params must be an object.",
      "INVALID_PRESET"
    );
  }
  resolveSynthOptions("definePreset", params);
  m_presets.set(name, freezeCopy(params));
}
function getPreset(name) {
  return m_presets.get(name);
}
function varyPreset(preset, variation, random) {
  if (variation === 0) {
    return preset;
  }
  const pitch = Math.pow(
    2,
    (random() * 2 - 1) * variation * MAX_PITCH_JITTER / 12
  );
  const stretch = 1 + (random() * 2 - 1) * variation * MAX_DURATION_JITTER;
  const base = resolveSynthOptions("sfx", preset);
  const varied = Object.assign({}, preset);
  varied.frequency = base.frequency * pitch;
  if (base.frequencyEnd !== null) {
    varied.frequencyEnd = base.frequencyEnd * pitch;
  }
  varied.duration = base.duration * stretch;
  return varied;
}
function register4(pluginApi) {
  const utils = pluginApi.utils;
  for (const name of Object.keys(BUILT_IN_PRESETS)) {
    storePreset(name, BUILT_IN_PRESETS[name]);
  }
  pluginApi.addCommand("sfx", sfx, false, ["name", "variation"]);
  function sfx(options) {
    const preset = m_presets.get(options.name);
    if (!preset) {
      throwCode4(
        Error,
        `sfx: Preset "${options.name}" is not defined.`,
        "PRESET_NOT_FOUND"
      );
    }
    const variation = utils.getFloat(options.variation, 0);
    if (!(variation >= 0 && variation <= 1)) {
      throwCode4(
        RangeError,
        "sfx: Parameter variation must be a number between 0 and 1.",
        "INVALID_VARIATION"
      );
    }
    return playSynth("sfx", varyPreset(preset, variation, Math.random));
  }
  pluginApi.addCommand("definePreset", definePreset, false, ["name", "params"]);
  function definePreset(options) {
    storePreset(options.name, options.params);
  }
}

// plugins/sound-advanced/generator.js
var MAX_SEED = 4294967295;
var VARIATION_SPAN = 0.25;
var LOG_PARAMETERS = [
  "frequency",
  "frequencyEnd",
  "filterCutoff",
  "duration",
  "attackTime",
  "decayTime",
  "releaseTime",
  "filterDecayTime"
];
var CHOICES = ["oType", "filterType", "arpeggio", "sweep"];
var SFX_CATEGORIES = freezeCopy({
  "coin": {
    "oType": [["pulse", 3], ["square", 1], ["triangle", 1]],
    "arpeggio": [[[0, 5], 2], [[0, 7], 1], [[0, 12], 1], [[0, 4, 7], 1]],
    "numbers": [
      ["frequency", 600, 1800],
      ["duration", 0.08, 0.3],
      ["volume", 0.4, 0.6],
      ["releaseTime", 0.05, 0.3],
      ["duty", 0.125, 0.5, "pulse"],
      ["arpeggioRate", 8, 24, "arpeggio"]
    ]
  },
  "laser": {
    "oType": [["sawtooth", 3], ["square", 1], ["pulse", 1]],
    "filterType": [["lowpass", 1]],
    "numbers": [
      ["frequency", 800, 2400],
      ["frequencyEnd", 80, 500],
      ["duration", 0.08, 0.3],
      ["volume", 0.35, 0.55],
      ["releaseTime", 0.02, 0.12],
      ["duty", 0.125, 0.5, "pulse"],
      ["filterCutoff", 1500, 8e3, "filter"]
    ]
  },
  "jump": {
    "oType": [["pulse", 2], ["square", 1], ["triangle", 1]],
    "numbers": [
      ["frequency", 150, 450],
      ["frequencyEnd", 400, 1200],
      ["duration", 0.1, 0.3],
      ["volume", 0.4, 0.6],
      ["releaseTime", 0.03, 0.15],
      ["duty", 0.125, 0.5, "pulse"]
    ]
  },
  "hit": {
    "oType": [["white", 3], ["pink", 1]],
    "filterType": [["lowpass", 3], ["bandpass", 1]],
    "numbers": [
      ["duration", 0.03, 0.1],
      ["volume", 0.7, 1],
      ["releaseTime", 0.05, 0.25],
      ["filterCutoff", 1500, 8e3, "filter"]
    ]
  },
  "explosion": {
    "oType": [["pink", 1]],
    "filterType": [["lowpass", 1]],
    "numbers": [
      ["duration", 0.3, 1],
      ["volume", 0.7, 1],
      ["decayTime", 0.2, 0.8],
      ["sustainLevel", 0.3, 0.7],
      ["releaseTime", 0.3, 1],
      ["filterCutoff", 400, 1500, "filter"],
      ["filterAmount", 1, 4, "filter"],
      ["filterDecayTime", 0.2, 1, "filter"],
      ["filterSustainLevel", 0, 0.3, "filter"]
    ]
  },
  "powerup": {
    "oType": [["square", 2], ["pulse", 1], ["triangle", 1]],
    "arpeggio": [
      [[0, 4, 7, 12], 2],
      [[0, 4, 7], 1],
      [[0, 5, 7, 12], 1],
      [[0, 7, 12], 1]
    ],
    "numbers": [
      ["frequency", 220, 660],
      ["frequencyEnd", 440, 1760],
      ["duration", 0.25, 0.7],
      ["volume", 0.35, 0.55],
      ["releaseTime", 0.05, 0.2],
      ["duty", 0.125, 0.5, "pulse"],
      ["arpeggioRate", 12, 30, "arpeggio"]
    ]
  },
  "blip": {
    "oType": [["pulse", 2], ["square", 1], ["sine", 1]],
    "numbers": [
      ["frequency", 600, 2e3],
      ["duration", 0.015, 0.06],
      ["volume", 0.3, 0.5],
      ["releaseTime", 0.015, 0.06],
      ["duty", 0.125, 0.5, "pulse"]
    ]
  },
  "select": {
    "oType": [["triangle", 2], ["sine", 1], ["pulse", 1]],
    "arpeggio": [[[0, 7], 2], [[0, 5], 1], [[0, 12], 1], [[0, 4], 1]],
    "numbers": [
      ["frequency", 440, 990],
      ["duration", 0.05, 0.14],
      ["volume", 0.35, 0.55],
      ["releaseTime", 0.03, 0.12],
      ["duty", 0.125, 0.5, "pulse"],
      ["arpeggioRate", 15, 35, "arpeggio"]
    ]
  },
  "random": {
    "oType": [
      ["square", 1],
      ["sawtooth", 1],
      ["triangle", 1],
      ["sine", 1],
      ["pulse", 1],
      ["white", 1],
      ["pink", 1]
    ],
    "filterType": [[null, 2], ["lowpass", 1], ["highpass", 1]],
    "arpeggio": [[null, 3], [[0, 4, 7], 1], [[0, 5], 1], [[0, 12], 1]],
    "sweep": [[false, 1], [true, 1]],
    "numbers": [
      ["frequency", 80, 2400],
      ["frequencyEnd", 60, 2400, "sweep"],
      ["duration", 0.03, 0.8],
      ["volume", 0.3, 0.7],
      ["attackTime", 1e-3, 0.05],
      ["releaseTime", 0.02, 0.5],
      ["duty", 0.125, 0.5, "pulse"],
      ["filterCutoff", 300, 8e3, "filter"],
      ["arpeggioRate", 6, 30, "arpeggio"]
    ]
  }
});
function throwCode5(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function pick(choices, r) {
  let total = 0;
  for (const choice of choices) {
    total += choice[1];
  }
  let position = r * total;
  for (const choice of choices) {
    position -= choice[1];
    if (position < 0) {
      return choice[0];
    }
  }
  return choices[choices.length - 1][0];
}
function isIncluded(condition, chosen) {
  if (condition === "pulse") {
    return chosen.oType === "pulse";
  }
  if (condition === "filter") {
    return chosen.filterType !== null;
  }
  if (condition === "arpeggio") {
    return chosen.arpeggio !== null;
  }
  if (condition === "sweep") {
    return chosen.sweep === true;
  }
  return true;
}
function hashName(name) {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash = Math.imul(hash ^ name.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}
function drawSound(category, seed) {
  const table = SFX_CATEGORIES[category];
  const random = createRandom(seed ^ hashName(category));
  const chosen = { "oType": null, "filterType": null, "arpeggio": null, "sweep": false };
  for (const name of CHOICES) {
    if (table[name]) {
      chosen[name] = pick(table[name], random());
    }
  }
  const options = { "oType": chosen.oType };
  for (const entry of table.numbers) {
    let r = random();
    if (!isIncluded(entry[3], chosen)) {
      continue;
    }
    if (LOG_PARAMETERS.indexOf(entry[0]) !== -1) {
      r = r * r;
    }
    const value = entry[1] + (entry[2] - entry[1]) * r;
    options[entry[0]] = Math.round(value * 1e3) / 1e3;
  }
  if (chosen.filterType !== null) {
    options.filterType = chosen.filterType;
  }
  if (chosen.arpeggio !== null) {
    options.arpeggio = chosen.arpeggio;
  }
  return options;
}
function varySound(options, table, variation, random) {
  const varied = Object.assign({}, options);
  for (const entry of table.numbers) {
    const name = entry[0];
    if (typeof options[name] !== "number") {
      continue;
    }
    const min = entry[1];
    const max = entry[2];
    const step = (random() * 2 - 1) * variation * VARIATION_SPAN;
    let value = options[name];
    if (LOG_PARAMETERS.indexOf(name) !== -1) {
      value = Math.exp(Math.log(value) + step * Math.log(max / min));
    } else {
      value += step * (max - min);
    }
    varied[name] = Math.min(max, Math.max(min, value));
  }
  return varied;
}
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = state + 1831565813 >>> 0;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function generateSfxOptions(category, seed, variation, random) {
  if (typeof category !== "string" || !Object.prototype.hasOwnProperty.call(SFX_CATEGORIES, category)) {
    throwCode5(
      Error,
      "generateSfx: Parameter category must be one of: " + Object.keys(SFX_CATEGORIES).join(", ") + ".",
      "INVALID_CATEGORY"
    );
  }
  if (seed === null || seed === void 0) {
    seed = 0;
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throwCode5(
      RangeError,
      `generateSfx: Parameter seed must be an integer from 0 to ${MAX_SEED}.`,
      "INVALID_SEED"
    );
  }
  if (variation === null || variation === void 0) {
    variation = 0;
  }
  if (typeof variation !== "number" || !(variation >= 0 && variation <= 1)) {
    throwCode5(
      RangeError,
      "generateSfx: Parameter variation must be a number between 0 and 1.",
      "INVALID_VARIATION"
    );
  }
  const table = SFX_CATEGORIES[category];
  let options = null;
  if (seed === 0 && BUILT_IN_PRESETS[category]) {
    options = BUILT_IN_PRESETS[category];
  } else {
    options = drawSound(category, seed);
  }
  if (variation > 0) {
    options = varySound(options, table, variation, random);
  }
  return freezeCopy(options);
}
function register5(pluginApi) {
  pluginApi.addCommand(
    "generateSfx",
    generateSfx,
    false,
    ["category", "seed", "variation"]
  );
  function generateSfx(options) {
    return generateSfxOptions(
      options.category,
      options.seed,
      options.variation,
      Math.random
    );
  }
}

// plugins/sound-advanced/instruments.js
var instruments_exports = {};
__export(instruments_exports, {
  BUILT_IN_INSTRUMENTS: () => BUILT_IN_INSTRUMENTS,
  EXTENSION_NAME: () => EXTENSION_NAME,
  MAX_INSTRUMENT: () => MAX_INSTRUMENT,
  register: () => register6,
  resolveNote: () => resolveNote,
  storeInstrument: () => storeInstrument
});

// plugins/sound-advanced/sample-source.js
var SAMPLE_TYPE_PREFIX = "sample:";
var DEFAULT_ROOT_FREQUENCY = 261.63;
var m_types = /* @__PURE__ */ new Set();
function createSampleFactory(service, name, rootFrequency, loop) {
  return (context, spec) => {
    const source = context.createBufferSource();
    const buffer = service.getAudioBuffer(name);
    if (buffer) {
      source.buffer = buffer;
    }
    source.loop = loop;
    scheduleRate(source.playbackRate, spec, rootFrequency);
    let stopAt = Infinity;
    let disposed = false;
    return {
      "output": source,
      "frequency": null,
      "detune": source.detune,
      "start": (when) => {
        source.start(when);
      },
      "stop": (when) => {
        if (when >= stopAt) {
          return;
        }
        stopAt = when;
        source.stop(when);
      },
      "onEnded": (callback) => {
        source.onended = callback;
      },
      "dispose": () => {
        if (disposed) {
          return;
        }
        disposed = true;
        source.onended = null;
        source.disconnect();
      }
    };
  };
}
function scheduleRate(param, spec, rootFrequency) {
  const rate = spec.frequency / rootFrequency;
  if (spec.frequencyEnd == null) {
    param.value = rate;
    return;
  }
  const rateEnd = spec.frequencyEnd / rootFrequency;
  const begin = spec.start + spec.offset;
  let rateBegin = rate;
  if (spec.offset > 0 && spec.gate > 0) {
    const progress = Math.min(spec.offset / spec.gate, 1);
    rateBegin = rate * Math.pow(rateEnd / rate, progress);
  }
  param.setValueAtTime(rateBegin, begin);
  if (spec.start + spec.gate > begin) {
    param.exponentialRampToValueAtTime(rateEnd, spec.start + spec.gate);
  }
}
function sampleTypeName(name, rootFrequency, loop) {
  let type = SAMPLE_TYPE_PREFIX + JSON.stringify(name);
  if (rootFrequency !== DEFAULT_ROOT_FREQUENCY) {
    type += "@" + rootFrequency;
  }
  if (loop) {
    type += ":loop";
  }
  return type;
}
function getSampleType(service, name, rootFrequency, loop) {
  const type = sampleTypeName(name, rootFrequency, loop);
  if (!m_types.has(type)) {
    service.registerSource(type, createSampleFactory(service, name, rootFrequency, loop));
    m_types.add(type);
  }
  return type;
}

// plugins/sound-advanced/instruments.js
var EXTENSION_NAME = "instruments";
var MAX_INSTRUMENT = 255;
var ENVELOPE_FIELDS = ["attackTime", "decayTime", "sustainLevel", "releaseTime"];
var BUILT_IN_INSTRUMENTS = {
  "1": {
    "oType": "pulse",
    "duty": 0.5,
    "vibratoRate": 5.5,
    "vibratoDepth": 12
  },
  "2": {
    "oType": "pulse",
    "duty": 0.25,
    "attackTime": 3e-3,
    "decayTime": 0.15,
    "sustainLevel": 0.3,
    "filterType": "lowpass",
    "filterCutoff": 700,
    "filterAmount": 2,
    "filterDecayTime": 0.12,
    "filterSustainLevel": 0
  },
  "3": {
    "oType": "sawtooth",
    "volume": 0.7,
    "attackTime": 0.2,
    "sustainLevel": 0.8,
    "releaseTime": 0.4,
    "filterType": "lowpass",
    "filterCutoff": 1200,
    "filterQ": 0.7,
    "tremoloRate": 4,
    "tremoloDepth": 0.15
  },
  "4": {
    "oType": "white",
    "attackTime": 0,
    "decayTime": 0.12,
    "sustainLevel": 0,
    "releaseTime": 0.05,
    "filterType": "bandpass",
    "filterCutoff": 2e3,
    "filterQ": 0.8
  },
  "5": {
    "oType": "white",
    "volume": 0.6,
    "attackTime": 0,
    "decayTime": 0.04,
    "sustainLevel": 0,
    "releaseTime": 0.02,
    "filterType": "highpass",
    "filterCutoff": 7e3
  },
  "6": {
    "oType": "sine",
    "frequency": 150,
    "frequencyEnd": 45,
    "attackTime": 0,
    "decayTime": 0.25,
    "sustainLevel": 0,
    "releaseTime": 0.05
  }
};
var m_instruments = /* @__PURE__ */ new Map();
function throwCode6(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function readSampleOptions(params) {
  const audio = params.audio;
  if (audio == null) {
    if (params.rootFrequency != null || params.loop != null) {
      throwCode6(
        Error,
        "defineInstrument: Parameters rootFrequency and loop require audio.",
        "INVALID_INSTRUMENT"
      );
    }
    return null;
  }
  if (typeof audio !== "string") {
    throwCode6(
      TypeError,
      "defineInstrument: Parameter audio must be a string.",
      "INVALID_AUDIO"
    );
  }
  if (audio === "") {
    throwCode6(
      RangeError,
      "defineInstrument: Parameter audio must not be empty.",
      "INVALID_AUDIO"
    );
  }
  if (params.oType != null) {
    throwCode6(
      Error,
      "defineInstrument: Parameters audio and oType cannot be used together.",
      "INVALID_INSTRUMENT"
    );
  }
  let rootFrequency = DEFAULT_ROOT_FREQUENCY;
  if (params.rootFrequency != null) {
    rootFrequency = params.rootFrequency;
    if (typeof rootFrequency !== "number") {
      throwCode6(
        TypeError,
        "defineInstrument: Parameter rootFrequency must be a number.",
        "INVALID_ROOT_FREQUENCY"
      );
    }
    if (!(rootFrequency > 0 && rootFrequency < Infinity)) {
      throwCode6(
        RangeError,
        "defineInstrument: Parameter rootFrequency must be a finite number greater than 0.",
        "INVALID_ROOT_FREQUENCY"
      );
    }
  }
  let loop = false;
  if (params.loop != null) {
    loop = params.loop;
    if (typeof loop !== "boolean") {
      throwCode6(
        TypeError,
        "defineInstrument: Parameter loop must be a boolean.",
        "INVALID_LOOP"
      );
    }
  }
  return { "audio": audio, "rootFrequency": rootFrequency, "loop": loop };
}
function isSampleReady(instrument) {
  return instrument.service.getAudioBuffer(instrument.audio) !== null;
}
function storeInstrument(instrument, params, service) {
  if (!Number.isInteger(instrument) || instrument < 1 || instrument > MAX_INSTRUMENT) {
    throwCode6(
      RangeError,
      `defineInstrument: Parameter instrument must be an integer from 1 to ${MAX_INSTRUMENT}.`,
      "INVALID_INSTRUMENT"
    );
  }
  if (params === null || params === void 0) {
    m_instruments.delete(instrument);
    return;
  }
  if (typeof params !== "object" || Array.isArray(params)) {
    throwCode6(
      TypeError,
      "defineInstrument: Parameter params must be an object or null.",
      "INVALID_INSTRUMENT_PARAMS"
    );
  }
  const resolved = resolveSynthOptions("defineInstrument", params);
  const sample = readSampleOptions(params);
  const envelope = {};
  let hasEnvelope = false;
  for (const field of ENVELOPE_FIELDS) {
    if (params[field] != null) {
      envelope[field] = resolved[field];
      hasEnvelope = true;
    }
  }
  const record = {
    "resolved": Object.freeze(resolved),
    "oType": null,
    "envelope": null,
    "volume": null,
    "pan": null,
    "frequency": null,
    "frequencyEnd": resolved.frequencyEnd,
    "audio": null,
    "service": null
  };
  if (params.oType != null) {
    record.oType = resolveOType(resolved);
  }
  if (sample !== null) {
    record.oType = getSampleType(
      service,
      sample.audio,
      sample.rootFrequency,
      sample.loop
    );
    record.audio = sample.audio;
    record.service = service;
  }
  if (hasEnvelope) {
    record.envelope = Object.freeze(envelope);
  }
  if (params.volume != null) {
    record.volume = resolved.volume;
  }
  if (params.pan != null) {
    record.pan = resolved.pan;
  }
  if (params.frequency != null) {
    record.frequency = resolved.frequency;
  }
  m_instruments.set(instrument, Object.freeze(record));
}
function resolveNote(state, note) {
  const instrument = m_instruments.get(state.instrument);
  if (!instrument) {
    return null;
  }
  const overrides = {};
  if (instrument.audio !== null && !isSampleReady(instrument)) {
    if (!state.warned.has(state.instrument)) {
      state.warned.add(state.instrument);
      console.warn(
        `play: Audio "${instrument.audio}" of instrument ${state.instrument} is not loaded, or is streamed; its notes are silent.`
      );
    }
    overrides.volume = 0;
  }
  if (instrument.oType !== null) {
    overrides.oType = instrument.oType;
  }
  if (instrument.envelope !== null) {
    overrides.envelope = instrument.envelope;
  }
  if (instrument.volume !== null && overrides.volume !== 0) {
    overrides.volume = note.volume * instrument.volume;
  }
  if (instrument.pan !== null) {
    overrides.pan = instrument.pan;
  }
  if (instrument.frequency !== null) {
    overrides.frequency = instrument.frequency;
  }
  if (instrument.frequencyEnd !== null) {
    overrides.frequencyEnd = instrument.frequencyEnd;
  }
  let releaseTime = note.envelope.releaseTime;
  if (instrument.envelope !== null && instrument.envelope.releaseTime !== void 0) {
    releaseTime = instrument.envelope.releaseTime;
  }
  const inserts = buildSynthInserts(instrument.resolved, releaseTime);
  if (inserts.length > 0) {
    overrides.inserts = (note.inserts || []).concat(inserts);
  }
  return overrides;
}
function register6(pluginApi, service) {
  for (const key of Object.keys(BUILT_IN_INSTRUMENTS)) {
    storeInstrument(Number(key), BUILT_IN_INSTRUMENTS[key], service);
  }
  service.registerPlayExtension(EXTENSION_NAME, {
    "tokens": {
      "@": (state, value) => {
        state.instrument = value ?? 0;
      }
    },
    "initState": () => ({ "instrument": 0, "warned": /* @__PURE__ */ new Set() }),
    "copyState": (state) => ({ "instrument": state.instrument, "warned": state.warned }),
    "resolveNote": resolveNote
  });
  pluginApi.addCommand(
    "defineInstrument",
    defineInstrument,
    false,
    ["instrument", "params"]
  );
  function defineInstrument(options) {
    storeInstrument(options.instrument, options.params, service);
  }
}

// plugins/sound-advanced/periodic-noise.js
var periodic_noise_exports = {};
__export(periodic_noise_exports, {
  PERIODIC_TYPE: () => PERIODIC_TYPE,
  lfsrSequence: () => lfsrSequence,
  register: () => register7
});
var PERIODIC_TYPE = "periodic";
var LFSR_BITS = 15;
var SHORT_MODE_TAP = 6;
var LONG_MODE_TAP = 1;
var FRAMES_PER_STEP = 16;
var m_buffers = /* @__PURE__ */ new WeakMap();
function getBuffer(context) {
  let buffer = m_buffers.get(context);
  if (buffer) {
    return buffer;
  }
  const sequence = lfsrSequence(true);
  buffer = context.createBuffer(
    1,
    sequence.length * FRAMES_PER_STEP,
    context.sampleRate
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = sequence[Math.floor(i / FRAMES_PER_STEP)];
  }
  m_buffers.set(context, buffer);
  return buffer;
}
function createPeriodicSource(context) {
  const source = context.createBufferSource();
  source.buffer = getBuffer(context);
  source.loop = true;
  source.playbackRate.value = 0;
  const clock = context.createConstantSource();
  const scale = context.createGain();
  scale.gain.value = FRAMES_PER_STEP / context.sampleRate;
  clock.connect(scale);
  scale.connect(source.playbackRate);
  let stopAt = Infinity;
  let disposed = false;
  return {
    "output": source,
    "frequency": clock.offset,
    "detune": source.detune,
    "start": (when) => {
      clock.start(when);
      source.start(when);
    },
    "stop": (when) => {
      if (when >= stopAt) {
        return;
      }
      stopAt = when;
      clock.stop(when);
      source.stop(when);
    },
    "onEnded": (callback) => {
      source.onended = callback;
    },
    "dispose": () => {
      if (disposed) {
        return;
      }
      disposed = true;
      source.onended = null;
      source.disconnect();
      scale.disconnect();
      clock.disconnect();
    }
  };
}
function lfsrSequence(shortMode) {
  let tap = LONG_MODE_TAP;
  if (shortMode) {
    tap = SHORT_MODE_TAP;
  }
  const maxLength = (1 << LFSR_BITS) - 1;
  const values = [];
  let register10 = 1;
  do {
    if ((register10 & 1) === 0) {
      values.push(1);
    } else {
      values.push(-1);
    }
    const feedback = (register10 ^ register10 >> tap) & 1;
    register10 = register10 >> 1 | feedback << LFSR_BITS - 1;
  } while (register10 !== 1 && values.length < maxLength);
  return Int8Array.from(values);
}
function register7(pluginApi, service) {
  service.registerSource(PERIODIC_TYPE, createPeriodicSource);
}

// plugins/sound-advanced/recorder.js
var recorder_exports = {};
__export(recorder_exports, {
  RECORDING_BUSES: () => RECORDING_BUSES,
  register: () => register8
});

// plugins/sound-advanced/wav.js
var HEADER_BYTES = 44;
function writeId(view, offset, text) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
function toPcm16(samples) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i];
    if (sample > 1) {
      sample = 1;
    } else if (sample < -1) {
      sample = -1;
    }
    pcm[i] = Math.round(sample * 32767);
  }
  return pcm;
}
function encodeWav(chunks, channelCount, sampleRate, bitDepth) {
  let frames = 0;
  for (const chunk of chunks) {
    frames += chunk[0].length;
  }
  const sampleBytes = bitDepth / 8;
  const blockAlign = channelCount * sampleBytes;
  const dataBytes = frames * blockAlign;
  const buffer = new ArrayBuffer(HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);
  let format = 1;
  if (bitDepth === 32) {
    format = 3;
  }
  writeId(view, 0, "RIFF");
  view.setUint32(4, HEADER_BYTES - 8 + dataBytes, true);
  writeId(view, 8, "WAVE");
  writeId(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeId(view, 36, "data");
  view.setUint32(40, dataBytes, true);
  let samples;
  if (bitDepth === 32) {
    samples = new Float32Array(buffer, HEADER_BYTES);
  } else {
    samples = new Int16Array(buffer, HEADER_BYTES);
  }
  let index = 0;
  for (const chunk of chunks) {
    const length = chunk[0].length;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < channelCount; c++) {
        samples[index++] = chunk[c][i];
      }
    }
  }
  return buffer;
}

// plugins/sound-advanced/recorder.js
var RECORDING_BUSES = ["output", "master", "sfx", "music", "audio"];
var DEFAULT_MAX_DURATION = 60;
var MIN_DURATION = 1;
var MAX_DURATION = 600;
var m_state = "idle";
var m_recording = null;
function throwCode7(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function receive(recording, data) {
  let samples = data.samples;
  if (samples[0].length > 0) {
    if (recording.bitDepth === 16) {
      samples = samples.map(toPcm16);
    }
    recording.chunks.push(samples);
    recording.frames += samples[0].length;
  }
  if (data.end) {
    recording.untap();
  }
  if (data.end === "full") {
    m_state = "full";
  } else if (data.end === "done") {
    recording.node.port.close();
    const wav = encodeWav(
      recording.chunks,
      2,
      recording.sampleRate,
      recording.bitDepth
    );
    recording.chunks = null;
    m_state = "idle";
    m_recording = null;
    recording.finish(new Blob([wav], { "type": "audio/wav" }));
  }
}
function register8(pluginApi, service) {
  pluginApi.addCommand(
    "startRecording",
    startRecording,
    false,
    ["bus", "maxDuration", "bitDepth"]
  );
  function startRecording(options) {
    let bus = "output";
    if (options.bus != null) {
      bus = options.bus;
    }
    if (RECORDING_BUSES.indexOf(bus) === -1) {
      throwCode7(
        Error,
        "startRecording: Parameter bus must be one of: output, master, sfx, music, audio.",
        "INVALID_BUS"
      );
    }
    let maxDuration = DEFAULT_MAX_DURATION;
    if (options.maxDuration != null) {
      maxDuration = options.maxDuration;
    }
    if (typeof maxDuration !== "number" || !(maxDuration >= MIN_DURATION && maxDuration <= MAX_DURATION)) {
      throwCode7(
        RangeError,
        `startRecording: Parameter maxDuration must be a number between ${MIN_DURATION} and ${MAX_DURATION}.`,
        "INVALID_DURATION"
      );
    }
    let bitDepth = 16;
    if (options.bitDepth != null) {
      bitDepth = options.bitDepth;
    }
    if (bitDepth !== 16 && bitDepth !== 32) {
      throwCode7(
        RangeError,
        "startRecording: Parameter bitDepth must be 16 or 32.",
        "INVALID_BIT_DEPTH"
      );
    }
    if (m_recording) {
      throwCode7(
        Error,
        "startRecording: A recording is already active; call stopRecording() first.",
        "RECORDING_ACTIVE"
      );
    }
    const context = service.getContext();
    const recording = {
      "bitDepth": bitDepth,
      "sampleRate": context.sampleRate,
      "chunks": [],
      "frames": 0,
      "node": null,
      "untap": null,
      "started": null,
      "stopping": null,
      "finish": null
    };
    m_state = "starting";
    m_recording = recording;
    recording.started = loadWorklet(context).then(() => {
      const node = new AudioWorkletNode(context, RECORDER_PROCESSOR, {
        "numberOfInputs": 1,
        "numberOfOutputs": 0,
        "channelCount": 2,
        "channelCountMode": "explicit",
        "processorOptions": { "maxFrames": Math.round(maxDuration * context.sampleRate) }
      });
      node.port.onmessage = (event) => receive(recording, event.data);
      recording.node = node;
      recording.untap = service.tapBus(bus, node);
      m_state = "recording";
    }).catch((error) => {
      m_state = "idle";
      m_recording = null;
      const failure = new Error(
        "startRecording: Recording is unavailable; the audio worklet could not load.",
        { "cause": error }
      );
      failure.code = "RECORDING_UNAVAILABLE";
      throw failure;
    });
    return recording.started;
  }
  pluginApi.addCommand("stopRecording", stopRecording, false, []);
  function stopRecording() {
    const recording = m_recording;
    if (!recording) {
      throwCode7(Error, "stopRecording: No recording is active.", "NOT_RECORDING");
    }
    if (!recording.stopping) {
      recording.stopping = recording.started.then(() => new Promise((resolve) => {
        recording.finish = resolve;
        recording.node.port.postMessage("stop");
      }));
    }
    return recording.stopping;
  }
  pluginApi.addCommand("getRecordingState", getRecordingState, false, []);
  function getRecordingState() {
    let duration = 0;
    if (m_recording) {
      duration = m_recording.frames / m_recording.sampleRate;
    }
    return { "state": m_state, "duration": duration };
  }
  pluginApi.addCommand("saveRecording", saveRecording, false, ["blob", "filename"]);
  function saveRecording(options) {
    if (!(options.blob instanceof Blob)) {
      throwCode7(
        TypeError,
        "saveRecording: Parameter blob must be a Blob.",
        "INVALID_BLOB"
      );
    }
    let filename = "recording.wav";
    if (options.filename != null) {
      filename = options.filename;
    }
    if (typeof filename !== "string" || filename === "") {
      throwCode7(
        TypeError,
        "saveRecording: Parameter filename must be a non-empty string.",
        "INVALID_FILENAME"
      );
    }
    const url = URL.createObjectURL(options.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }
}

// plugins/sound-advanced/sync.js
var sync_exports = {};
__export(sync_exports, {
  LATE_LIMIT_MS: () => LATE_LIMIT_MS,
  PLAY_MODES: () => PLAY_MODES,
  createPlaySync: () => createPlaySync,
  getPageOffset: () => getPageOffset,
  register: () => register9
});
var PLAY_MODES = ["note", "end"];
var LATE_LIMIT_MS = 250;
function throwCode8(ErrorType, message, code) {
  const error = new ErrorType(message);
  error.code = code;
  throw error;
}
function validateMode(command, mode) {
  if (typeof mode !== "string") {
    throwCode8(
      TypeError,
      `${command}: Parameter mode must be a string.`,
      "INVALID_MODE"
    );
  }
  if (PLAY_MODES.indexOf(mode) === -1) {
    throwCode8(
      RangeError,
      `${command}: Parameter mode must be "note" or "end".`,
      "INVALID_MODE"
    );
  }
}
function validateFunction(command, fn) {
  if (typeof fn !== "function") {
    throwCode8(
      TypeError,
      `${command}: Parameter fn must be a function.`,
      "INVALID_FUNCTION"
    );
  }
}
function getPageOffset(context, now) {
  const latency = context.outputLatency || context.baseLatency || 0;
  const rendered = now - (context.currentTime - latency) * 1e3;
  if (typeof context.getOutputTimestamp === "function") {
    const stamp = context.getOutputTimestamp();
    if (stamp && stamp.performanceTime > 0) {
      return Math.max(stamp.performanceTime - stamp.contextTime * 1e3, rendered);
    }
  }
  return rendered;
}
function createPlaySync(host) {
  const handlers = { "note": [], "end": [] };
  let queue = [];
  let removeObserver = null;
  let isFramePending = false;
  function receive2(event) {
    let time = event.time;
    if (event.type === "end") {
      time = host.contextTime();
      if (event.stopped) {
        queue = queue.filter((entry) => entry.event.trackId !== event.trackId);
      }
    }
    let index = queue.length;
    while (index > 0 && queue[index - 1].time > time) {
      index -= 1;
    }
    queue.splice(index, 0, { "event": event, "time": time });
    requestDispatch();
  }
  function requestDispatch() {
    if (!isFramePending && queue.length > 0) {
      isFramePending = true;
      host.requestFrame(dispatchDue);
    }
  }
  function dispatchDue() {
    isFramePending = false;
    const now = host.now();
    const offset = host.pageOffset(now);
    while (queue.length > 0) {
      const entry = queue[0];
      const late = now - (entry.time * 1e3 + offset);
      if (late < 0) {
        break;
      }
      queue.shift();
      if (entry.event.type === "note" && late > LATE_LIMIT_MS) {
        continue;
      }
      dispatch(entry.event, late / 1e3);
    }
    requestDispatch();
  }
  function dispatch(event, delay) {
    const data = Object.freeze({ ...event, "delay": delay });
    const list = handlers[event.type];
    for (const handler of list.slice()) {
      if (list.indexOf(handler) === -1) {
        continue;
      }
      if (handler.once) {
        removeHandlers(event.type, handler.fn);
      }
      try {
        handler.fn(data);
      } catch (error) {
        console.error(`onPlay: Handler for "${event.type}" failed:`, error);
      }
    }
  }
  function removeHandlers(mode, fn) {
    const list = handlers[mode];
    for (let i = list.length - 1; i >= 0; i--) {
      if (fn === null || list[i].fn === fn) {
        list.splice(i, 1);
      }
    }
    if (removeObserver && handlers.note.length === 0 && handlers.end.length === 0) {
      removeObserver();
      removeObserver = null;
      queue = [];
    }
  }
  function onPlay(options) {
    validateMode("onPlay", options.mode);
    validateFunction("onPlay", options.fn);
    if (options.once != null && typeof options.once !== "boolean") {
      throwCode8(TypeError, "onPlay: Parameter once must be a boolean.", "INVALID_ONCE");
    }
    const list = handlers[options.mode];
    if (list.some((handler) => handler.fn === options.fn)) {
      return;
    }
    list.push({ "fn": options.fn, "once": options.once === true });
    if (!removeObserver) {
      removeObserver = host.observePlay(receive2);
    }
  }
  function offPlay(options) {
    const mode = options.mode ?? null;
    const fn = options.fn ?? null;
    if (mode === null && fn === null) {
      throwCode8(
        TypeError,
        'offPlay: Parameter mode or fn is required; use clearEvents( "play" ) to remove every handler.',
        "INVALID_MODE"
      );
    }
    if (mode !== null) {
      validateMode("offPlay", mode);
    }
    if (fn !== null) {
      validateFunction("offPlay", fn);
    }
    for (const each of PLAY_MODES) {
      if (mode === null || mode === each) {
        removeHandlers(each, fn);
      }
    }
  }
  function clear() {
    for (const mode of PLAY_MODES) {
      removeHandlers(mode, null);
    }
  }
  return { "onPlay": onPlay, "offPlay": offPlay, "clear": clear };
}
function register9(pluginApi, service) {
  const sync = createPlaySync({
    "observePlay": service.observePlay,
    "now": () => performance.now(),
    "contextTime": () => service.getContext().currentTime,
    "pageOffset": (now) => getPageOffset(service.getContext(), now),
    "requestFrame": (fn) => requestAnimationFrame(fn)
  });
  pluginApi.addCommand("onPlay", sync.onPlay, false, ["mode", "fn", "once"]);
  pluginApi.addCommand("offPlay", sync.offPlay, false, ["mode", "fn"]);
  pluginApi.registerClearEvents("play", sync.clear);
}

// plugins/sound-advanced/index.js
var SOUND_SERVICE_VERSION = 1;
var MODULES = [
  periodic_noise_exports,
  synth_exports,
  effects_exports,
  analyser_exports,
  presets_exports,
  generator_exports,
  instruments_exports,
  sync_exports,
  recorder_exports
];
function soundAdvancedPlugin(pluginApi) {
  const service = pluginApi.getService("sound");
  if (service.version !== SOUND_SERVICE_VERSION) {
    const error = new Error(
      `sound-advanced: Requires sound service version ${SOUND_SERVICE_VERSION}; found ${service.version}.`
    );
    error.code = "INCOMPATIBLE_SOUND_SERVICE";
    throw error;
  }
  for (const module of MODULES) {
    module.register(pluginApi, service);
  }
}
if (typeof window !== "undefined" && window.pi) {
  window.pi.registerPlugin({
    "name": "sound-advanced",
    "version": "1.0.0",
    "description": "Synthesis, bus effects, analyser, presets, generator, PLAY instruments, music sync, and recording",
    "dependencies": ["sound"],
    "init": soundAdvancedPlugin
  });
}
export {
  soundAdvancedPlugin as default
};
//# sourceMappingURL=sound-advanced.esm.js.map
