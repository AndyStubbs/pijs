/**
 * sound - Music playback and sound effects using Web Audio API
 * @version 1.0.0
 * @author Andy Stubbs
 * @license Apache-2.0
 * @preserve
 */

// plugins/sound/sound.js
var m_audioContext = null;
var m_masterGain = null;
var m_audioPools = {};
var m_nextAudioId = 0;
var m_soundPool = {};
var m_nextSoundId = 0;
var m_volume = 0.75;
var MAX_VOICES = 64;
function loadAudioItem(pluginApi, audioItem, audio, retryCount = 3) {
  function audioReady() {
    audioItem.pool.push({
      "audio": audio,
      "timeout": 0,
      "volume": 1
    });
    audio.removeEventListener("canplay", audioReady);
    pluginApi.done();
  }
  function audioError() {
    const errors = [
      "MEDIA_ERR_ABORTED - fetching process aborted by user",
      "MEDIA_ERR_NETWORK - error occurred when downloading",
      "MEDIA_ERR_DECODE - error occurred when decoding",
      "MEDIA_ERR_SRC_NOT_SUPPORTED - audio/video not supported"
    ];
    const errorCode = audio.error.code;
    const index = errorCode - 1;
    if (index >= 0 && index < errors.length) {
      console.error("loadAudio: " + errors[index]);
      if (retryCount > 0) {
        setTimeout(() => {
          audio.removeEventListener("canplay", audioReady);
          audio.removeEventListener("error", audioError);
          const newAudio = new Audio(audio.src);
          loadAudioItem(pluginApi, audioItem, newAudio, retryCount - 1);
        }, 100);
      } else {
        console.error("loadAudio: Max retries exceeded for " + audio.src);
        pluginApi.done();
      }
    } else {
      console.error("loadAudio: Unknown error - " + errorCode);
      pluginApi.done();
    }
  }
  if (retryCount === 3) {
    pluginApi.wait();
  }
  audio.addEventListener("canplay", audioReady);
  audio.addEventListener("error", audioError);
}
function getAudioContext() {
  if (!m_audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    m_audioContext = new AudioContextClass();
  }
  return m_audioContext;
}
function getMasterGain() {
  const audioContext = getAudioContext();
  if (!m_masterGain) {
    m_masterGain = audioContext.createGain();
    m_masterGain.gain.value = 1;
    m_masterGain.connect(audioContext.destination);
  }
  return m_masterGain;
}
function cleanupSound(soundId) {
  const sound = m_soundPool[soundId];
  if (!sound) {
    return;
  }
  try {
    sound.oscillator.disconnect();
  } catch (_e) {
  }
  try {
    sound.envelope.disconnect();
  } catch (_e) {
  }
  try {
    sound.master.disconnect();
  } catch (_e) {
  }
  delete m_soundPool[soundId];
}
function enforceVoiceLimit() {
  const audioContext = getAudioContext();
  const now = audioContext.currentTime;
  const activeIds = [];
  for (const soundId in m_soundPool) {
    const sound = m_soundPool[soundId];
    if (sound.startTime <= now) {
      activeIds.push(soundId);
    }
  }
  if (activeIds.length < MAX_VOICES) {
    return;
  }
  const removeCount = activeIds.length - MAX_VOICES + 1;
  for (let i = 0; i < removeCount; i++) {
    stopSoundById(activeIds[i]);
  }
}
function stopSoundById(soundId) {
  const sound = m_soundPool[soundId];
  if (!sound) {
    return;
  }
  try {
    sound.oscillator.stop();
  } catch (_e) {
    cleanupSound(soundId);
  }
}
function createSound(audioContext, frequency, volume, attackTime, sustainTime, decayTime, stopTime, oType, waveTables, delay) {
  enforceVoiceLimit();
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  const master = audioContext.createGain();
  const startTime = audioContext.currentTime + delay;
  master.gain.value = m_volume;
  oscillator.frequency.value = frequency;
  if (oType === "custom") {
    const real = waveTables[0];
    const imag = waveTables[1];
    const wave = audioContext.createPeriodicWave(real, imag);
    oscillator.setPeriodicWave(wave);
  } else {
    oscillator.type = oType;
  }
  oscillator.connect(envelope);
  envelope.connect(master);
  master.connect(getMasterGain());
  const soundId = "sound_" + m_nextSoundId;
  m_nextSoundId += 1;
  m_soundPool[soundId] = {
    "oscillator": oscillator,
    "envelope": envelope,
    "master": master,
    "audioContext": audioContext,
    "startTime": startTime
  };
  oscillator.onended = function() {
    cleanupSound(soundId);
  };
  try {
    const attackEnd = startTime + attackTime;
    const sustainEnd = attackEnd + sustainTime;
    const decayEnd = sustainEnd + decayTime;
    let endTime = startTime + stopTime;
    if (endTime < decayEnd) {
      endTime = decayEnd;
    }
    if (attackTime > 0) {
      envelope.gain.setValueAtTime(0, startTime);
      envelope.gain.linearRampToValueAtTime(volume, attackEnd);
    } else {
      envelope.gain.setValueAtTime(volume, startTime);
    }
    if (sustainTime > 0) {
      envelope.gain.linearRampToValueAtTime(0.8 * volume, sustainEnd);
    }
    if (decayTime > 0) {
      envelope.gain.linearRampToValueAtTime(0.1 * volume, sustainEnd + decayTime * 0.5);
      envelope.gain.linearRampToValueAtTime(0, decayEnd);
    } else {
      envelope.gain.linearRampToValueAtTime(0, endTime);
    }
    oscillator.start(startTime);
    oscillator.stop(endTime);
  } catch (err) {
    cleanupSound(soundId);
    throw err;
  }
  return soundId;
}
function registerSound(pluginApi) {
  const utils = pluginApi.utils;
  pluginApi.addCommand("loadAudio", loadAudio, false, ["src", "name", "poolSize"]);
  function loadAudio(options) {
    const src = options.src;
    let poolSize = utils.getInt(options.poolSize, 1);
    let audioName = options.name;
    if (!src || typeof src !== "string") {
      const error = new TypeError("loadAudio: Parameter src must be a non-empty string.");
      error.code = "INVALID_SRC";
      throw error;
    }
    let audioId = "audioPool_" + m_nextAudioId;
    if (audioName) {
      if (m_audioPools[audioName]) {
        const error = new Error(
          `loadAudio: Audio pool name "${audioName}" is already in use.`
        );
        error.code = "DUPLICATE_AUDIO_NAME";
        throw error;
      }
      audioId = audioName;
    } else {
      m_nextAudioId += 1;
    }
    if (poolSize < 1) {
      const error = new RangeError(
        "loadAudio: Parameter poolSize must be an integer greater than 0."
      );
      error.code = "INVALID_POOL_SIZE";
      throw error;
    }
    const audioItem = {
      "pool": [],
      "index": 0
    };
    for (let i = 0; i < poolSize; i++) {
      const audio = new Audio(src);
      loadAudioItem(pluginApi, audioItem, audio);
    }
    m_audioPools[audioId] = audioItem;
    return audioId;
  }
  pluginApi.addCommand("removeAudio", removeAudio, false, ["audioId"]);
  function removeAudio(options) {
    const audioId = options.audioId;
    if (!m_audioPools[audioId]) {
      const error = new Error(`removeAudio: Audio pool "${audioId}" not found.`);
      error.code = "AUDIO_POOL_NOT_FOUND";
      throw error;
    }
    for (let i = 0; i < m_audioPools[audioId].pool.length; i++) {
      const poolItem = m_audioPools[audioId].pool[i];
      poolItem.audio.pause();
      clearTimeout(poolItem.timeout);
    }
    delete m_audioPools[audioId];
  }
  pluginApi.addCommand(
    "playAudio",
    playAudio,
    false,
    ["audioId", "volume", "startTime", "duration"]
  );
  function playAudio(options) {
    const audioId = options.audioId;
    const volume = utils.getFloat(options.volume, 1);
    const startTime = utils.getFloat(options.startTime, 0);
    const duration = utils.getFloat(options.duration, 0);
    if (!m_audioPools[audioId]) {
      const error = new Error(`playAudio: Audio pool "${audioId}" not found.`);
      error.code = "AUDIO_POOL_NOT_FOUND";
      throw error;
    }
    if (volume < 0 || volume > 1) {
      const error = new RangeError(
        "playAudio: Parameter volume must be a number between 0 and 1."
      );
      error.code = "INVALID_VOLUME";
      throw error;
    }
    if (startTime < 0) {
      const error = new RangeError(
        "playAudio: Parameter startTime must be a number greater than or equal to 0."
      );
      error.code = "INVALID_START_TIME";
      throw error;
    }
    if (duration < 0) {
      const error = new RangeError(
        "playAudio: Parameter duration must be a number greater than or equal to 0."
      );
      error.code = "INVALID_DURATION";
      throw error;
    }
    const audioItem = m_audioPools[audioId];
    if (audioItem.pool.length === 0) {
      const error = new Error("playAudio: Audio pool has no sounds loaded.");
      error.code = "EMPTY_POOL";
      throw error;
    }
    const poolItem = audioItem.pool[audioItem.index];
    const audio = poolItem.audio;
    audio.volume = m_volume * volume;
    poolItem.volume = volume;
    audio.currentTime = startTime;
    if (duration > 0) {
      clearTimeout(poolItem.timeout);
      poolItem.timeout = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, duration * 1e3);
    }
    const playPromise = audio.play();
    if (playPromise !== void 0) {
      playPromise.catch((error) => {
        console.warn("playAudio: Audio playback failed:", error.message);
      });
    }
    audioItem.index += 1;
    if (audioItem.index >= audioItem.pool.length) {
      audioItem.index = 0;
    }
  }
  pluginApi.addCommand("stopAudio", stopAudio, false, ["audioId"]);
  function stopAudio(options) {
    const audioId = options.audioId;
    if (audioId == null) {
      for (const poolId in m_audioPools) {
        for (let j = 0; j < m_audioPools[poolId].pool.length; j++) {
          const poolItem = m_audioPools[poolId].pool[j];
          poolItem.audio.pause();
          clearTimeout(poolItem.timeout);
        }
      }
      return;
    }
    if (!m_audioPools[audioId]) {
      const error = new Error(`stopAudio: Audio pool "${audioId}" not found.`);
      error.code = "AUDIO_POOL_NOT_FOUND";
      throw error;
    }
    for (let i = 0; i < m_audioPools[audioId].pool.length; i++) {
      const poolItem = m_audioPools[audioId].pool[i];
      poolItem.audio.pause();
      clearTimeout(poolItem.timeout);
    }
  }
  pluginApi.addCommand("sound", sound, false, [
    "frequency",
    "duration",
    "volume",
    "oType",
    "delay",
    "attack",
    "decay"
  ]);
  function sound(options) {
    const frequency = Math.round(utils.getFloat(options.frequency, 440));
    const duration = utils.getFloat(options.duration, 1);
    const volume = utils.getFloat(options.volume, 1);
    let oType = options.oType != null ? options.oType : "triangle";
    const delay = utils.getFloat(options.delay, 0);
    const attack = utils.getFloat(options.attack, 0);
    const decay = utils.getFloat(options.decay, 0.1);
    if (duration < 0) {
      const error = new RangeError(
        "sound: Parameter duration must be a number greater than or equal to 0."
      );
      error.code = "INVALID_DURATION";
      throw error;
    }
    if (volume < 0 || volume > 1) {
      const error = new RangeError("sound: Parameter volume must be a number between 0 and 1.");
      error.code = "INVALID_VOLUME";
      throw error;
    }
    if (attack < 0) {
      const error = new RangeError(
        "sound: Parameter attack must be a number greater than or equal to 0."
      );
      error.code = "INVALID_ATTACK";
      throw error;
    }
    if (delay < 0) {
      const error = new RangeError(
        "sound: Parameter delay must be a number greater than or equal to 0."
      );
      error.code = "INVALID_DELAY";
      throw error;
    }
    let waveTables = null;
    if (Array.isArray(oType)) {
      if (oType.length !== 2 || oType[0].length === 0 || oType[1].length === 0 || oType[0].length !== oType[1].length) {
        const error = new TypeError(
          "sound: Parameter oType array must contain two non-empty arrays of equal length."
        );
        error.code = "INVALID_WAVE_TABLE";
        throw error;
      }
      waveTables = [];
      for (let i = 0; i < oType.length; i++) {
        for (let j = 0; j < oType[i].length; j++) {
          if (isNaN(oType[i][j])) {
            const error = new TypeError(
              "sound: Parameter oType array must only contain numbers."
            );
            error.code = "INVALID_WAVE_TABLE_VALUE";
            throw error;
          }
        }
        waveTables.push(new Float32Array(oType[i]));
      }
      oType = "custom";
    } else if (typeof oType !== "string") {
      const error = new TypeError("sound: Parameter oType must be a string or an array.");
      error.code = "INVALID_OTYPE";
      throw error;
    } else {
      const validTypes = ["triangle", "sine", "square", "sawtooth"];
      if (validTypes.indexOf(oType) === -1) {
        const error = new Error(
          "sound: Parameter oType must be one of: triangle, sine, square, sawtooth."
        );
        error.code = "INVALID_OTYPE";
        throw error;
      }
    }
    const stopTime = attack + duration + decay;
    return createSound(
      getAudioContext(),
      frequency,
      volume,
      attack,
      duration,
      decay,
      stopTime,
      oType,
      waveTables,
      delay
    );
  }
  pluginApi.addCommand("stopSound", stopSound, false, ["soundId"]);
  function stopSound(options) {
    const soundId = options.soundId;
    if (soundId == null) {
      const soundIds = Object.keys(m_soundPool);
      for (let i = 0; i < soundIds.length; i++) {
        stopSoundById(soundIds[i]);
      }
      return;
    }
    stopSoundById(soundId);
  }
  pluginApi.addCommand("setVolume", setVolume, false, ["volume"]);
  function setVolume(options) {
    const volume = utils.getFloat(options.volume, 0.75);
    if (volume < 0 || volume > 1) {
      const error = new RangeError(
        "setVolume: Parameter volume must be a number between 0 and 1."
      );
      error.code = "INVALID_VOLUME";
      throw error;
    }
    m_volume = volume;
    for (const soundId in m_soundPool) {
      const sound2 = m_soundPool[soundId];
      if (volume === 0) {
        sound2.master.gain.exponentialRampToValueAtTime(
          0.01,
          sound2.audioContext.currentTime + 0.1
        );
        sound2.master.gain.setValueAtTime(
          0,
          sound2.audioContext.currentTime + 0.11
        );
      } else {
        sound2.master.gain.exponentialRampToValueAtTime(
          volume,
          sound2.audioContext.currentTime + 0.1
        );
      }
    }
    for (const poolId in m_audioPools) {
      for (let j = 0; j < m_audioPools[poolId].pool.length; j++) {
        const poolItem = m_audioPools[poolId].pool[j];
        poolItem.audio.volume = m_volume * poolItem.volume;
      }
    }
  }
}

// plugins/sound/play.js
var m_tracks = {};
var m_allTracks = [];
var m_lastTrackId = 0;
var m_playData = [];
var m_utils = null;
var m_notesData = {
  "A": [27.5, 55, 110, 220, 440, 880, 1760, 3520, 7040, 14080],
  "A#": [29.14, 58.27, 116.541, 233.082, 466.164, 932.328, 1864.655, 3729.31, 7458.62, 14917.24],
  "B": [30.87, 61.74, 123.471, 246.942, 493.883, 987.767, 1975.533, 3951.066, 7902.132, 15804.264],
  "C": [16.35, 32.7, 65.41, 130.813, 261.626, 523.251, 1046.502, 2093.005, 4186.009, 8372.018],
  "C#": [17.32, 34.65, 69.296, 138.591, 277.183, 554.365, 1108.731, 2217.461, 4434.922, 8869.844],
  "D": [18.35, 36.71, 73.416, 146.832, 293.665, 587.33, 1174.659, 2349.318, 4698.636, 9397.272],
  "D#": [19.45, 38.89, 77.782, 155.563, 311.127, 622.254, 1244.508, 2489.016, 4978.032, 9956.064],
  "E": [20.6, 41.2, 82.407, 164.814, 329.628, 659.255, 1318.51, 2637.021, 5274.042, 10548.084],
  "F": [21.83, 43.65, 87.307, 174.614, 349.228, 698.456, 1396.913, 2793.826, 5587.652, 11175.304],
  "F#": [23.12, 46.25, 92.499, 184.997, 369.994, 739.989, 1479.978, 2959.955, 5919.91, 11839.82],
  "G": [24.5, 49, 97.999, 195.998, 391.995, 783.991, 1567.982, 3135.964, 6271.928, 12543.856],
  "G#": [25.96, 51.91, 103.826, 207.652, 415.305, 830.609, 1661.219, 3322.438, 6644.876, 13289.752]
};
var m_allNotes = [
  0,
  16.35,
  17.32,
  18.35,
  19.45,
  20.6,
  21.83,
  23.12,
  24.5,
  25.96,
  27.5,
  29.14,
  30.87,
  32.7,
  34.65,
  36.71,
  38.89,
  41.2,
  43.65,
  46.25,
  49,
  51.91,
  55,
  58.27,
  61.74,
  65.406,
  69.296,
  73.416,
  77.782,
  82.407,
  87.307,
  92.499,
  97.999,
  103.826,
  110,
  116.541,
  123.471,
  130.813,
  138.591,
  146.832,
  155.563,
  164.814,
  174.614,
  184.997,
  195.998,
  207.652,
  220,
  233.082,
  246.942,
  261.626,
  277.183,
  293.665,
  311.127,
  329.628,
  349.228,
  369.994,
  391.995,
  415.305,
  440,
  466.164,
  493.883,
  523.251,
  554.365,
  587.33,
  622.254,
  659.255,
  698.456,
  739.989,
  783.991,
  830.609,
  880,
  932.328,
  987.767,
  1046.502,
  1108.731,
  1174.659,
  1244.508,
  1318.51,
  1396.913,
  1479.978,
  1567.982,
  1661.219,
  1760,
  1864.655,
  1975.533,
  2093.005,
  2217.461,
  2349.318,
  2489.016,
  2637.021,
  2793.826,
  2959.955,
  3135.964,
  3322.438,
  3520,
  3729.31,
  3951.066,
  4186.009,
  4434.922,
  4698.636,
  4978.032,
  5274.042,
  5587.652,
  5919.91,
  6271.928,
  6644.876,
  7040,
  7458.62,
  7902.132,
  8372.018,
  8869.844,
  9397.272,
  9956.064,
  10548.084,
  11175.304,
  11839.82,
  13289.752,
  14080,
  14917.24,
  15804.264
];
function createTrack(playString) {
  let firstTrackId;
  playString = playString.split(/\s+/).join("").toUpperCase();
  const waveTables = [];
  let start = 0;
  while (start > -1) {
    start = playString.indexOf("[[");
    if (start > -1) {
      const end = playString.indexOf("]]", start);
      waveTables.push(playString.substring(start, end + 2));
      const i = waveTables.length - 1;
      playString = playString.replace(waveTables[i], "W" + i);
    }
  }
  for (let i = 0; i < waveTables.length; i++) {
    waveTables[i] = JSON.parse(waveTables[i]);
    if (waveTables[i].length !== 2 || waveTables[i][0].length !== waveTables[i][1].length) {
      console.error(
        "play: Wavetables must have 2 arrays of same length. Defaulting to triangle wave."
      );
      waveTables[i] = "triangle";
      continue;
    }
    for (let j = 0; j < 2; j++) {
      for (let k = 0; k < waveTables[i][j].length; k++) {
        waveTables[i][j][k] = parseFloat(waveTables[i][j][k]);
        if (isNaN(waveTables[i][j][k])) {
          waveTables[i][j][k] = 0;
        }
      }
      waveTables[i][j] = new Float32Array(waveTables[i][j]);
    }
  }
  const trackStrings = playString.split(",");
  const trackIds = [];
  const regString = "(?=WS|WQ|WW|WT|W\\d[\\d]?|V\\d|Q\\d|O\\d|\\<|\\>|N\\d\\d?|L\\d\\d?|MS|MN|ML|MU\\d|MU\\-\\d|MK\\d[\\d]?[\\d]?|MZ\\d[\\d]?[\\d]?|MX\\d[\\d]?[\\d]?|MY\\d[\\d]?[\\d]?|MW|P[\\d]?|T\\d|[[A|B|C|D|E|F|G][\\d]?[\\+|\\-|\\#|\\.\\.?]?)";
  const reg = new RegExp(regString);
  let lastNote;
  for (let i = 0; i < trackStrings.length; i++) {
    trackStrings[i] = trackStrings[i].replace(/SINE/g, "WS");
    trackStrings[i] = trackStrings[i].replace(/SQUARE/g, "WQ");
    trackStrings[i] = trackStrings[i].replace(/SAWTOOTH/g, "WW");
    trackStrings[i] = trackStrings[i].replace(/TRIANGLE/g, "WT");
    trackStrings[i] = trackStrings[i].replace(/MD/g, "MZ");
    trackStrings[i] = trackStrings[i].replace(/MA/g, "MY");
    trackStrings[i] = trackStrings[i].replace(/MT/g, "MX");
    trackStrings[i] = trackStrings[i].replace(/MO/g, "MU");
    trackStrings[i] = trackStrings[i].replace(/MB/g, "");
    trackStrings[i] = trackStrings[i].replace(/MF/g, "");
    const trackId = m_lastTrackId;
    if (firstTrackId === void 0) {
      firstTrackId = trackId;
    }
    m_lastTrackId += 1;
    m_tracks[trackId] = {
      "id": trackId,
      "notes": [],
      "noteId": 0,
      "decayRate": 0.2,
      "attackRate": 0.15,
      "sustainRate": 0.65,
      "fullNote": false,
      "extra": 1,
      "space": "normal",
      "interval": 0,
      "time": 0,
      "simultaneousPlay": i > 0,
      "tempo": 60 / 120,
      "noteLength": 0.25,
      "pace": 0.875,
      "octave": 4,
      "octaveExtra": 0,
      "volume": 1,
      "trackIds": trackIds,
      "type": "triangle",
      "waveTables": waveTables,
      "sounds": []
    };
    m_allTracks.push(trackId);
    trackIds.push(trackId);
    if (i > 0) {
      lastNote.simultaneousPlay = trackId;
    }
    const trackParts = trackStrings[i].split(reg);
    for (let j = 0; j < trackParts.length; j++) {
      const index = trackParts[j].indexOf("-");
      if (index > -1 && "ABCDEFG".indexOf(trackParts[j][0]) === -1) {
        const noteData = {
          "name": trackParts[j].substring(0, index),
          "val": trackParts[j].substring(index)
        };
        m_tracks[trackId].notes.push(noteData);
        lastNote = noteData;
      } else {
        const noteParts = trackParts[j].split(/(\d+)/);
        const noteData = {
          "name": noteParts[0]
        };
        if (noteParts.length > 1) {
          noteData.val = noteParts[1];
        }
        m_tracks[trackId].notes.push(noteData);
        lastNote = noteData;
      }
    }
  }
  return firstTrackId;
}
function playTrack(trackId) {
  const track = m_tracks[trackId];
  if (track.noteId >= track.notes.length) {
    return;
  }
  const cmd = track.notes[track.noteId];
  let frequency = 0;
  let val;
  let wait = false;
  track.extra = 0;
  switch (cmd.name.charAt(0)) {
    case "A":
    case "B":
    case "C":
    case "D":
    case "E":
    case "F":
    case "G":
      frequency = processNote(track, cmd);
      wait = true;
      break;
    case "N":
      if (!isNaN(Number(cmd.val))) {
        val = m_utils.getInt(cmd.val, 0);
        if (val >= 0 && val < m_allNotes.length) {
          frequency = m_allNotes[val];
        }
        wait = true;
      }
      break;
    case "O":
      if (!isNaN(Number(cmd.val))) {
        val = m_utils.getInt(cmd.val, 4);
        if (val >= 0 && val < m_notesData["A"].length) {
          track.octave = val;
        }
      }
      break;
    case ">":
      track.octave += 1;
      if (track.octave >= m_notesData["A"].length) {
        track.octave = m_notesData["A"].length - 1;
      }
      break;
    case "<":
      track.octave -= 1;
      if (track.octave < 0) {
        track.octave = 0;
      }
      break;
    case "L":
      if (!isNaN(Number(cmd.val))) {
        val = m_utils.getInt(cmd.val, 1);
        track.noteLength = getNoteLength(val);
      }
      break;
    case "T":
      if (!isNaN(Number(cmd.val))) {
        val = m_utils.getInt(cmd.val, 120);
        if (val >= 32 && val < 256) {
          track.tempo = 60 / val;
        }
      }
      break;
    case "M":
      processMusic(track, cmd);
      break;
    case "P":
      if (!isNaN(Number(cmd.val))) {
        wait = true;
        val = m_utils.getInt(cmd.val, 1);
        track.extra = getNoteLength(val);
      }
      break;
    case "V":
      if (!isNaN(Number(cmd.val))) {
        val = m_utils.getInt(cmd.val, 50);
        if (val < 0) {
          val = 0;
        } else if (val > 100) {
          val = 100;
        }
        track.volume = val / 100;
      }
      break;
    case "W":
      processWaveform(track, cmd);
      break;
  }
  if (track.extra > 0) {
    track.interval = track.tempo * track.extra * track.pace * 4;
  } else {
    track.interval = track.tempo * track.noteLength * track.pace * 4;
  }
  if (m_tracks[cmd.simultaneousPlay]) {
    m_tracks[cmd.simultaneousPlay].time = track.time;
    copyTrackData(m_tracks[cmd.simultaneousPlay].id, trackId);
    playTrack(m_tracks[cmd.simultaneousPlay].id);
  }
  if (frequency > 0) {
    playNote(track, frequency);
  }
  track.noteId += 1;
  if (track.noteId < track.notes.length) {
    if (wait) {
      track.time += track.interval;
    }
    playTrack(trackId);
  } else {
    setTimeout(() => {
      if (m_tracks[trackId]) {
        removeTrack(trackId);
      }
    }, (track.time + track.interval) * 1e3);
  }
}
function processNote(track, cmd) {
  let note = cmd.name;
  note = note.replace(/\+/g, "#");
  note = note.replace("C-", "B");
  note = note.replace("D-", "C#");
  note = note.replace("E-", "D#");
  note = note.replace("G-", "F#");
  note = note.replace("A-", "G#");
  note = note.replace("B-", "A#");
  note = note.replace("E#", "F");
  note = note.replace("B#", "C");
  if (cmd.name.indexOf("..") > 0) {
    track.extra = 1.75 * track.noteLength;
  } else if (cmd.name.indexOf(".") > 0) {
    track.extra = 1.5 * track.noteLength;
  }
  note = note.replace(/\./g, "");
  let frequency = 0;
  if (m_notesData[note]) {
    const octave = track.octave + track.octaveExtra;
    if (octave < m_notesData[note].length) {
      frequency = m_notesData[note][octave];
    }
  }
  if (!isNaN(Number(cmd.val))) {
    const val = m_utils.getInt(cmd.val, 1);
    track.extra = getNoteLength(val);
  }
  return frequency;
}
function processMusic(track, cmd) {
  switch (cmd.name) {
    case "MS":
      track.pace = 0.75;
      break;
    case "MN":
      track.pace = 0.875;
      break;
    case "ML":
      track.pace = 1;
      break;
    case "MU":
      if (!isNaN(Number(cmd.val))) {
        const val = m_utils.getInt(cmd.val, 0);
        track.octaveExtra = val;
      }
      break;
    case "MY":
      if (!isNaN(Number(cmd.val))) {
        const val = m_utils.getInt(cmd.val, 25);
        track.attackRate = val / 100;
      }
      break;
    case "MX":
      if (!isNaN(Number(cmd.val))) {
        const val = m_utils.getInt(cmd.val, 25);
        track.sustainRate = val / 100;
      }
      break;
    case "MZ":
      if (!isNaN(Number(cmd.val))) {
        const val = m_utils.getInt(cmd.val, 25);
        track.decayRate = val / 100;
      }
      break;
    case "MW":
      track.fullNote = !track.fullNote;
      break;
  }
}
function processWaveform(track, cmd) {
  if (cmd.name === "WS") {
    track.type = "sine";
  } else if (cmd.name === "WQ") {
    track.type = "square";
  } else if (cmd.name === "WW") {
    track.type = "sawtooth";
  } else if (cmd.name === "WT") {
    track.type = "triangle";
  } else if (!isNaN(Number(cmd.val))) {
    const val = m_utils.getInt(cmd.val, -1);
    if (track.waveTables[val]) {
      track.type = val;
    }
  }
}
function playNote(track, frequency) {
  const volume = track.volume;
  const attackTime = track.interval * track.attackRate;
  const sustainTime = track.interval * track.sustainRate;
  const decayTime = track.interval * track.decayRate;
  let stopTime;
  if (track.fullNote && attackTime + sustainTime + decayTime > track.interval) {
    stopTime = track.interval;
  } else {
    stopTime = attackTime + sustainTime + decayTime;
  }
  let oType;
  let waveTables = null;
  if (typeof track.type === "string") {
    oType = track.type;
  } else {
    waveTables = track.waveTables[track.type];
    if (Array.isArray(waveTables)) {
      oType = "custom";
    } else {
      oType = waveTables;
      waveTables = null;
    }
  }
  const soundData = {
    "frequency": frequency,
    "volume": volume,
    "attackTime": attackTime,
    "sustainTime": sustainTime,
    "decayTime": decayTime,
    "stopTime": stopTime,
    "oType": oType,
    "waveTables": waveTables,
    "time": track.time,
    "track": track
  };
  m_playData.push(soundData);
}
function copyTrackData(trackDestId, trackSourceId) {
  const trackDest = m_tracks[trackDestId];
  const trackSource = m_tracks[trackSourceId];
  trackDest.decayRate = trackSource.decayRate;
  trackDest.attackRate = trackSource.attackRate;
  trackDest.sustainRate = trackSource.sustainRate;
  trackDest.fullNote = trackSource.fullNote;
  trackDest.extra = trackSource.extra;
  trackDest.space = trackSource.space;
  trackDest.interval = trackSource.interval;
  trackDest.tempo = trackSource.tempo;
  trackDest.noteLength = trackSource.noteLength;
  trackDest.pace = trackSource.pace;
  trackDest.octave = trackSource.octave;
  trackDest.octaveExtra = trackSource.octaveExtra;
  trackDest.volume = trackSource.volume;
  trackDest.type = trackSource.type;
}
function removeTrack(trackId) {
  const trackIds = m_tracks[trackId].trackIds;
  for (let i = trackIds.length; i >= 0; i--) {
    delete m_tracks[trackIds[i]];
  }
  for (let i = m_allTracks.length - 1; i >= 0; i--) {
    if (!m_tracks[m_allTracks[i]]) {
      m_allTracks.splice(i, 1);
    }
  }
}
function getNoteLength(val) {
  if (val >= 1 && val < 65) {
    return 1 / val;
  }
  return 0.875;
}
function registerPlay(pluginApi) {
  m_utils = pluginApi.utils;
  pluginApi.addCommand("play", play, false, ["playString"]);
  function play(options) {
    let playString = options.playString;
    if (typeof playString !== "string") {
      const error = new TypeError("play: Parameter playString must be a string.");
      error.code = "INVALID_PLAY_STRING";
      throw error;
    }
    const trackId = createTrack(playString);
    m_playData = [];
    playTrack(trackId);
    m_playData.sort((a, b) => a.time - b.time);
    const audioContext = getAudioContext();
    for (let i = 0; i < m_playData.length; i++) {
      const playData = m_playData[i];
      playData.track.sounds.push(
        createSound(
          audioContext,
          playData.frequency,
          playData.volume,
          playData.attackTime,
          playData.sustainTime,
          playData.decayTime,
          playData.stopTime,
          playData.oType,
          playData.waveTables,
          playData.time
        )
      );
    }
    return trackId;
  }
  pluginApi.addCommand("stopPlay", stopPlay, false, ["trackId"]);
  function stopPlay(options) {
    const trackId = options.trackId;
    if (trackId === null) {
      for (let i = 0; i < m_allTracks.length; i++) {
        const track = m_tracks[m_allTracks[i]];
        if (track) {
          for (let j = 0; j < track.sounds.length; j++) {
            stopSoundById(track.sounds[j]);
          }
          delete m_tracks[m_allTracks[i]];
        }
      }
      m_allTracks.length = 0;
      return;
    }
    if (m_tracks[trackId]) {
      const track = m_tracks[trackId];
      for (let j = 0; j < track.sounds.length; j++) {
        stopSoundById(track.sounds[j]);
      }
      removeTrack(trackId);
    }
  }
}

// plugins/sound/index.js
function playSoundPlugin(pluginApi) {
  registerSound(pluginApi);
  registerPlay(pluginApi);
}
if (typeof window !== "undefined" && window.pi) {
  window.pi.registerPlugin({
    "name": "sound",
    "version": "1.0.0",
    "description": "Music playback and sound effects using Web Audio API",
    "init": playSoundPlugin
  });
}
export {
  playSoundPlugin as default
};
//# sourceMappingURL=sound.esm.js.map
