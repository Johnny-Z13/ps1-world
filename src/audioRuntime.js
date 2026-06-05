import {
  CUT_UP_AUDIO_DUCK_DURATION_MS,
  CUT_UP_MUSIC_GAIN,
  ENEMY_AUDIO_PROFILES,
  FREE_ROAM_MUSIC_GAIN,
  PLAYER_HEARTBEAT_BASE_GAIN,
  PLAYER_HEARTBEAT_BASE_INTERVAL_MS,
  PLAYER_HEARTBEAT_DANGER_DISTANCE,
  PLAYER_HEARTBEAT_DANGER_GAIN,
  PLAYER_HEARTBEAT_DANGER_INTERVAL_MS,
  PLAYER_SPRINT_FOOTSTEP_LOOP_URL,
  PLAYER_SPRINT_FOOTSTEP_GAIN,
  PLAYER_WALK_FOOTSTEP_LOOP_URL,
  PLAYER_WALK_FOOTSTEP_GAIN,
  RAIN_DRIP_GAIN,
  RAIN_SPOT_DRIP_SOUND_URL,
  RAIN_WATER_MAX_DISTANCE,
  RAIN_WATER_REF_DISTANCE,
  SCENE_AMBIENCE_MAX_GAIN,
  SCENE_REVERB_PRESETS,
  TORCH_CRACKLE_MAX_DISTANCE,
  TORCH_CRACKLE_REF_DISTANCE,
  LIGHTNING_SOUND_GAIN,
  TRANSITION_SFX_GAIN,
  UI_SFX_GAIN,
  TITLE_MUSIC_GAIN,
  SPECIAL_ENEMY_ATTACK_COOLDOWN_MS,
  SPECIAL_ENEMY_LOOP_FULL_VOLUME_DISTANCE,
  SPECIAL_ENEMY_LOOP_MAX_DISTANCE,
  ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE,
  ZOMBIE_GRUNT_LOOP_URL,
  ZOMBIE_GRUNT_MAX_DISTANCE,
  ZOMBIE_GRUNT_OPEN_FILTER_HZ,
} from './audioConfig.js';

export function createAudioRuntimeState({
  AudioContextClass,
  now,
  sceneId,
  random = Math.random,
} = {}) {
  const context = new AudioContextClass();
  const dryGain = context.createGain();
  const reverbInput = context.createGain();
  const convolver = context.createConvolver();
  const reverbWetGain = context.createGain();
  const ambienceGain = context.createGain();
  const lightningGain = context.createGain();
  const musicGain = context.createGain();
  const sfxGain = context.createGain();
  const sfxReverbInput = context.createGain();
  const titleMusicGain = context.createGain();
  const freeRoamMusicGain = context.createGain();
  const cutUpMusicGain = context.createGain();
  const uiSfxGain = context.createGain();
  const transitionSfxGain = context.createGain();
  const playerSfxGain = context.createGain();
  const footstepWalkGain = context.createGain();
  const footstepSprintGain = context.createGain();
  const lowHealthBreathingGain = context.createGain();
  const heartbeatGain = context.createGain();

  dryGain.gain.value = 1;
  dryGain.connect(context.destination);
  reverbInput.gain.value = 0.8;
  reverbInput.connect(convolver);
  convolver.connect(reverbWetGain);
  reverbWetGain.gain.value = 0;
  reverbWetGain.connect(context.destination);
  ambienceGain.gain.value = 0;
  connectSceneAudioNode(ambienceGain, dryGain, reverbInput);
  lightningGain.gain.value = LIGHTNING_SOUND_GAIN;
  connectSceneAudioNode(lightningGain, sfxGain, sfxReverbInput);
  musicGain.gain.value = 1;
  musicGain.connect(dryGain);
  sfxGain.gain.value = 1;
  sfxGain.connect(dryGain);
  sfxReverbInput.gain.value = 1;
  sfxReverbInput.connect(reverbInput);
  titleMusicGain.gain.value = 0;
  titleMusicGain.connect(musicGain);
  freeRoamMusicGain.gain.value = 0;
  freeRoamMusicGain.connect(musicGain);
  cutUpMusicGain.gain.value = 0;
  cutUpMusicGain.connect(musicGain);
  uiSfxGain.gain.value = UI_SFX_GAIN;
  uiSfxGain.connect(sfxGain);
  transitionSfxGain.gain.value = TRANSITION_SFX_GAIN;
  transitionSfxGain.connect(sfxGain);
  playerSfxGain.gain.value = 1;
  connectSceneAudioNode(playerSfxGain, sfxGain, sfxReverbInput);
  footstepWalkGain.gain.value = 0;
  connectSceneAudioNode(footstepWalkGain, sfxGain, sfxReverbInput);
  footstepSprintGain.gain.value = 0;
  connectSceneAudioNode(footstepSprintGain, sfxGain, sfxReverbInput);
  lowHealthBreathingGain.gain.value = 0;
  lowHealthBreathingGain.connect(sfxGain);
  heartbeatGain.gain.value = 0;
  heartbeatGain.connect(sfxGain);

  return {
    context,
    audioBuffers: new Map(),
    audioBufferLoads: new Map(),
    dryGain,
    reverbInput,
    convolver,
    reverbWetGain,
    activeReverbId: null,
    ambienceGain,
    ambienceSource: null,
    activeAmbienceId: null,
    loadingAmbienceId: null,
    ambienceSlots: [createAmbienceSlot(context, ambienceGain), createAmbienceSlot(context, ambienceGain)],
    activeAmbienceSlotIndex: 0,
    musicGain,
    sfxGain,
    sfxReverbInput,
    titleMusicGain,
    freeRoamMusicGain,
    cutUpMusicGain,
    uiSfxGain,
    transitionSfxGain,
    musicSources: new Map(),
    musicLoopsLoading: new Set(),
    musicLoopsFailed: new Set(),
    lightningGain,
    playerSfxGain,
    footstepWalkGain,
    footstepSprintGain,
    lowHealthBreathingGain,
    heartbeatGain,
    footstepWalkSource: null,
    footstepSprintSource: null,
    footstepLoopsLoading: false,
    footstepLoopsFailed: false,
    lowHealthBreathingSource: null,
    lowHealthBreathingLoading: false,
    lowHealthBreathingFailed: false,
    heartbeatLoopTimer: null,
    torchCrackleVoices: new Map(),
    waterfallVoices: new Map(),
    waterNoiseBuffer: createWaterNoiseBuffer(context, random),
    zombieVoices: new Map(),
    specialEnemyVoices: new Map(),
    enemyAttackTimes: new Map(),
    zombieLoopLoading: false,
    zombieLoopFailed: false,
    lastLightningIndex: -1,
    lastCutUpCountdownTick: null,
    cutUpAudioDuckStartedAt: -Infinity,
    nextWorldStingerAt: now + 14000,
    worldStingerSceneId: sceneId,
  };
}

export function createWaterNoiseBuffer(context, random = Math.random) {
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, sampleRate * 2, sampleRate);
  const channel = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < channel.length; index += 1) {
    previous = previous * 0.82 + (random() * 2 - 1) * 0.18;
    channel[index] = previous * 0.7;
  }
  return buffer;
}

export function connectSceneAudioNode(node, dryGain, reverbInput) {
  node.connect(dryGain);
  node.connect(reverbInput);
}

function getSfxDryGain(state) {
  return state.sfxGain ?? state.dryGain;
}

function getSfxReverbInput(state) {
  return state.sfxReverbInput ?? state.reverbInput;
}

export function createAmbienceSlot(context, ambienceGain) {
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.connect(ambienceGain);
  return {
    id: null,
    source: null,
    gain,
    loadingId: null,
  };
}

export function getEnemyAudioUrls(profiles = ENEMY_AUDIO_PROFILES) {
  return Object.values(profiles).flatMap((profile) => [profile.loopUrl, profile.attackUrl]);
}

export function loadAudioBuffer(state, url, fetchAudio = fetch, warn = console.warn) {
  if (state.audioBuffers.has(url)) return Promise.resolve(state.audioBuffers.get(url));
  if (state.audioBufferLoads.has(url)) return state.audioBufferLoads.get(url);

  const loading = fetchAudio(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load audio asset ${url}: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((arrayBuffer) => state.context.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      state.audioBuffers.set(url, buffer);
      state.audioBufferLoads.delete(url);
      return buffer;
    })
    .catch((error) => {
      state.audioBufferLoads.delete(url);
      warn(error);
      throw error;
    });

  state.audioBufferLoads.set(url, loading);
  return loading;
}

export function playAssetOneShot(state, url, gainNode, options = {}) {
  const { loadAudio = loadAudioBuffer, isCurrent = () => true } = options;
  const buffer = state.audioBuffers.get(url);
  if (!buffer) {
    loadAudio(state, url)
      .then((loadedBuffer) => {
        if (!isCurrent(state)) return;
        const source = state.context.createBufferSource();
        source.buffer = loadedBuffer;
        source.connect(gainNode);
        source.start();
      })
      .catch(() => {});
    return null;
  }

  const source = state.context.createBufferSource();
  source.buffer = buffer;
  source.connect(gainNode);
  source.start();
  return source;
}

export function playBusOneShot(state, url, gainNode, volume, options = {}) {
  const { playAsset = playAssetOneShot, ...assetOptions } = options;
  gainNode.gain.setValueAtTime(volume, state.context.currentTime);
  return playAsset(state, url, gainNode, assetOptions);
}

export function playOneShotToNode(state, url, outputNode, volume = 1, options = {}) {
  const { loadAudio = loadAudioBuffer, isCurrent = () => true } = options;
  const buffer = state.audioBuffers.get(url);
  if (!buffer) {
    loadAudio(state, url)
      .then(() => {
        if (isCurrent(state)) playOneShotToNode(state, url, outputNode, volume, options);
      })
      .catch(() => {});
    return null;
  }

  const source = state.context.createBufferSource();
  const gain = state.context.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(outputNode);
  source.start();
  return source;
}

export function playSpatialOneShot(state, url, position, volume = 1, options = {}) {
  const { loadAudio = loadAudioBuffer, isCurrent = () => true, fallbackY = 0 } = options;
  const buffer = state.audioBuffers.get(url);
  if (!buffer) {
    loadAudio(state, url)
      .then(() => {
        if (isCurrent(state)) playSpatialOneShot(state, url, position, volume, options);
      })
      .catch(() => {});
    return null;
  }

  const source = state.context.createBufferSource();
  const gain = state.context.createGain();
  const panner = state.context.createPanner();
  source.buffer = buffer;
  gain.gain.value = volume;
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = options.refDistance ?? 1.2;
  panner.maxDistance = options.maxDistance ?? 20;
  panner.rolloffFactor = options.rolloffFactor ?? 1.8;
  setAudioParam(panner.positionX, position.x, state.context.currentTime, 0);
  setAudioParam(panner.positionY, position.y ?? fallbackY, state.context.currentTime, 0);
  setAudioParam(panner.positionZ, position.z, state.context.currentTime, 0);
  source.connect(gain);
  gain.connect(panner);
  connectSceneAudioNode(panner, getSfxDryGain(state), getSfxReverbInput(state));
  source.start();
  return panner;
}

export function ensureMusicLoop(state, id, url, gainNode, options = {}) {
  const {
    loadAudio = loadAudioBuffer,
    isCurrent = () => true,
    warn = console.warn,
  } = options;
  if (state.musicSources.has(id) || state.musicLoopsLoading.has(id) || state.musicLoopsFailed.has(id)) return;

  state.musicLoopsLoading.add(id);
  loadAudio(state, url)
    .then((buffer) => {
      if (!isCurrent(state)) return;

      const source = state.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gainNode);
      source.start();
      state.musicSources.set(id, source);
    })
    .catch((error) => {
      state.musicLoopsFailed.add(id);
      warn(error);
    })
    .finally(() => {
      state.musicLoopsLoading.delete(id);
    });
}

export function ensureSceneAmbienceLoop(state, sceneId, ambienceUrls, options = {}) {
  const {
    loadAudio = loadAudioBuffer,
    isCurrent = () => true,
    setTimeoutFn = globalThis.setTimeout,
  } = options;
  const url = ambienceUrls[sceneId];
  if (!url || state.activeAmbienceId === sceneId || state.loadingAmbienceId === sceneId) return;

  state.loadingAmbienceId = sceneId;
  loadAudio(state, url)
    .then((buffer) => {
      if (!isCurrent(state, sceneId)) return;

      const nextSlotIndex = (state.activeAmbienceSlotIndex + 1) % state.ambienceSlots.length;
      const nextSlot = state.ambienceSlots[nextSlotIndex];
      if (nextSlot.source) nextSlot.source.stop();
      nextSlot.source = state.context.createBufferSource();
      nextSlot.source.buffer = buffer;
      nextSlot.source.loop = true;
      nextSlot.source.connect(nextSlot.gain);
      nextSlot.id = sceneId;
      nextSlot.source.start();

      const previousSlot = state.ambienceSlots[state.activeAmbienceSlotIndex];
      nextSlot.gain.gain.setTargetAtTime(1, state.context.currentTime, 0.42);
      previousSlot.gain.gain.setTargetAtTime(0, state.context.currentTime, 0.42);
      stopAmbienceSlotAfterFade(state, previousSlot, { isCurrent, setTimeoutFn });

      state.ambienceSource = nextSlot.source;
      state.activeAmbienceId = sceneId;
      state.activeAmbienceSlotIndex = nextSlotIndex;
    })
    .catch(() => {})
    .finally(() => {
      if (state.loadingAmbienceId === sceneId) state.loadingAmbienceId = null;
    });
}

export function stopAmbienceSlotAfterFade(state, slot, options = {}) {
  const {
    isCurrent = () => true,
    setTimeoutFn = globalThis.setTimeout,
    fadeDurationMs = 900,
  } = options;

  setTimeoutFn(() => {
    if (!isCurrent(state) || !slot.source || state.ambienceSlots[state.activeAmbienceSlotIndex] === slot) return;
    try {
      slot.source.stop();
    } catch {
      // Already stopped by the browser audio engine.
    }
    slot.source = null;
    slot.id = null;
  }, fadeDurationMs);
}

export function ensureLoopSource(state, {
  url,
  outputNode,
  sourceKey,
  loadingKey,
  failedKey,
  loadAudio = loadAudioBuffer,
  isCurrent = () => true,
  warn = console.warn,
}) {
  if (state[sourceKey] || state[loadingKey] || state[failedKey]) return;

  state[loadingKey] = true;
  loadAudio(state, url)
    .then((buffer) => {
      if (!isCurrent(state)) return;

      const source = state.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(outputNode);
      source.start();
      state[sourceKey] = source;
    })
    .catch((error) => {
      state[failedKey] = true;
      warn(error);
    })
    .finally(() => {
      state[loadingKey] = false;
    });
}

export function ensurePlayerFootstepLoopSources(state, options = {}) {
  const {
    walkUrl = PLAYER_WALK_FOOTSTEP_LOOP_URL,
    sprintUrl = PLAYER_SPRINT_FOOTSTEP_LOOP_URL,
    loadAudio = loadAudioBuffer,
    isCurrent = () => true,
    warn = console.warn,
  } = options;

  if (
    state.footstepWalkSource
    || state.footstepSprintSource
    || state.footstepLoopsLoading
    || state.footstepLoopsFailed
  ) return;

  state.footstepLoopsLoading = true;
  Promise.all([
    loadAudio(state, walkUrl),
    loadAudio(state, sprintUrl),
  ])
    .then(([walkBuffer, sprintBuffer]) => {
      if (!isCurrent(state)) return;

      const walkSource = state.context.createBufferSource();
      walkSource.buffer = walkBuffer;
      walkSource.loop = true;
      walkSource.connect(state.footstepWalkGain);
      walkSource.start();

      const sprintSource = state.context.createBufferSource();
      sprintSource.buffer = sprintBuffer;
      sprintSource.loop = true;
      sprintSource.connect(state.footstepSprintGain);
      sprintSource.start();

      state.footstepWalkSource = walkSource;
      state.footstepSprintSource = sprintSource;
    })
    .catch((error) => {
      state.footstepLoopsFailed = true;
      warn(error);
    })
    .finally(() => {
      state.footstepLoopsLoading = false;
    });
}

export function getCutUpAudioDuckAmount(
  state,
  now,
  durationMs = CUT_UP_AUDIO_DUCK_DURATION_MS,
) {
  if (!state) return 0;
  const elapsed = now - state.cutUpAudioDuckStartedAt;
  if (elapsed < 0 || elapsed > durationMs) return 0;
  return 1 - elapsed / durationMs;
}

export function getSceneAmbienceTargetGain({
  titleActive = false,
  deathActive = false,
  hasAmbience = false,
  optionsOpen = false,
  duckAmount = 0,
  maxGain = SCENE_AMBIENCE_MAX_GAIN,
} = {}) {
  if (titleActive || deathActive || !hasAmbience) return 0;

  const optionsDuck = optionsOpen ? 0.35 : 1;
  return maxGain * optionsDuck * (1 - duckAmount * 0.52);
}

export function getCinematicMusicTargetGains({
  titleActive = false,
  gameMode = 'normal',
  deathActive = false,
  optionsOpen = false,
  duckAmount = 0,
  titleGain = TITLE_MUSIC_GAIN,
  freeRoamGain = FREE_ROAM_MUSIC_GAIN,
  cutUpGain = CUT_UP_MUSIC_GAIN,
} = {}) {
  const optionsDuck = optionsOpen ? 0.48 : 1;
  const musicDuck = optionsDuck * (1 - duckAmount * 0.45);

  return {
    title: (titleActive ? titleGain : 0) * musicDuck,
    freeRoam: (!titleActive && gameMode === 'normal' && !deathActive ? freeRoamGain : 0) * musicDuck,
    cutUp: (!titleActive && gameMode === 'cut-up' && !deathActive ? cutUpGain : 0) * musicDuck,
  };
}

export function getPlayerFootstepTargetGains({
  titleActive = false,
  optionsOpen = false,
  deathActive = false,
  grounded = false,
  moving = false,
  sprinting = false,
  walkGain = PLAYER_WALK_FOOTSTEP_GAIN,
  sprintGain = PLAYER_SPRINT_FOOTSTEP_GAIN,
} = {}) {
  if (titleActive || optionsOpen || deathActive || !grounded || !moving) return { walk: 0, sprint: 0 };

  return {
    walk: sprinting ? 0 : walkGain,
    sprint: sprinting ? sprintGain : 0,
  };
}

export function getPlayerHeartbeatParams({
  titleActive = false,
  optionsOpen = false,
  deathActive = false,
  nearestEnemyDistance = null,
  baseIntervalMs = PLAYER_HEARTBEAT_BASE_INTERVAL_MS,
  dangerIntervalMs = PLAYER_HEARTBEAT_DANGER_INTERVAL_MS,
  baseGain = PLAYER_HEARTBEAT_BASE_GAIN,
  dangerGain = PLAYER_HEARTBEAT_DANGER_GAIN,
  dangerDistance = PLAYER_HEARTBEAT_DANGER_DISTANCE,
} = {}) {
  if (titleActive || optionsOpen || deathActive) {
    return { intervalMs: baseIntervalMs, gain: 0, masterGain: 0 };
  }

  const danger = nearestEnemyDistance === null
    ? 0
    : Math.max(0, Math.min(1, 1 - nearestEnemyDistance / dangerDistance));

  return {
    intervalMs: Math.round(baseIntervalMs + (dangerIntervalMs - baseIntervalMs) * danger),
    gain: baseGain + (dangerGain - baseGain) * danger,
    masterGain: 1,
  };
}

export function ensurePlayerHeartbeatLoop(state, options = {}) {
  if (state.heartbeatLoopTimer) return;

  schedulePlayerHeartbeatPulse(state, options.baseIntervalMs ?? PLAYER_HEARTBEAT_BASE_INTERVAL_MS, options);
}

export function schedulePlayerHeartbeatPulse(state, delayMs, options = {}) {
  const {
    getHeartbeatParams,
    isCurrent = () => true,
    setTimeoutFn = globalThis.setTimeout,
  } = options;

  state.heartbeatLoopTimer = setTimeoutFn(() => {
    state.heartbeatLoopTimer = null;
    if (!isCurrent(state)) return;

    const heartbeat = getHeartbeatParams();
    if (heartbeat.gain > 0) {
      playHeartbeatThump(state, state.context.currentTime, 84, heartbeat.gain);
      playHeartbeatThump(state, state.context.currentTime + 0.16, 64, heartbeat.gain * 0.72);
    }

    schedulePlayerHeartbeatPulse(state, heartbeat.intervalMs, options);
  }, delayMs);
}

export function playHeartbeatThump(state, startTime, frequency, gain) {
  const oscillator = state.context.createOscillator();
  const envelope = state.context.createGain();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  envelope.gain.setValueAtTime(0, startTime);
  envelope.gain.linearRampToValueAtTime(gain, startTime + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.11);
  oscillator.connect(envelope);
  envelope.connect(state.heartbeatGain);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.14);
}

export function syncPlayerHeartbeatGain(state, heartbeat) {
  state.heartbeatGain.gain.setTargetAtTime(heartbeat.masterGain, state.context.currentTime, 0.18);
}

export function getTorchCrackleVoice(state, id, torchLight, index, options = {}) {
  if (state.torchCrackleVoices.has(id)) return state.torchCrackleVoices.get(id);

  const gain = state.context.createGain();
  const filter = state.context.createBiquadFilter();
  const panner = state.context.createPanner();
  gain.gain.value = 0;
  filter.type = 'bandpass';
  filter.frequency.value = 1300;
  filter.Q.value = 2.8;
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = TORCH_CRACKLE_REF_DISTANCE;
  panner.maxDistance = TORCH_CRACKLE_MAX_DISTANCE;
  panner.rolloffFactor = 2.2;
  setAudioParam(panner.positionX, torchLight.x, state.context.currentTime, 0);
  setAudioParam(panner.positionY, torchLight.y, state.context.currentTime, 0);
  setAudioParam(panner.positionZ, torchLight.z, state.context.currentTime, 0);
  gain.connect(filter);
  filter.connect(panner);
  connectSceneAudioNode(panner, getSfxDryGain(state), getSfxReverbInput(state));

  const voice = { id, gain, filter, panner, timerId: null, seed: index * 19.13 };
  state.torchCrackleVoices.set(id, voice);
  scheduleTorchCracklePulse(state, voice, options);
  return voice;
}

export function scheduleTorchCracklePulse(state, voice, options = {}) {
  const {
    random = Math.random,
    isCurrent = () => true,
    setTimeoutFn = globalThis.setTimeout,
  } = options;
  const delay = 55 + Math.floor(random() * 145 + voice.seed % 37);
  voice.timerId = setTimeoutFn(() => {
    voice.timerId = null;
    if (!isCurrent(state) || !state.torchCrackleVoices.has(voice.id)) return;

    playTorchCracklePulse(state, voice, { random });
    scheduleTorchCracklePulse(state, voice, options);
  }, delay);
}

export function playTorchCracklePulse(state, voice, options = {}) {
  const { random = Math.random } = options;
  const now = state.context.currentTime;
  const oscillator = state.context.createOscillator();
  const envelope = state.context.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(620 + random() * 2100, now);
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(0.16 + random() * 0.22, now + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.045 + random() * 0.07);
  oscillator.connect(envelope);
  envelope.connect(voice.gain);
  oscillator.start(now);
  oscillator.stop(now + 0.14);
}

export function stopTorchCrackleVoice(state, voice, options = {}) {
  const { clearTimeoutFn = globalThis.clearTimeout } = options;
  if (voice.timerId) {
    clearTimeoutFn(voice.timerId);
    voice.timerId = null;
  }
  voice.gain.gain.setTargetAtTime(0, state.context.currentTime, 0.08);
}

export function getRainWaterVoice(state, id, source, options = {}) {
  if (state.waterfallVoices.has(id)) return state.waterfallVoices.get(id);

  const sourceNode = state.context.createBufferSource();
  const filter = state.context.createBiquadFilter();
  const gain = state.context.createGain();
  const panner = state.context.createPanner();
  sourceNode.buffer = state.waterNoiseBuffer;
  sourceNode.loop = true;
  filter.type = 'bandpass';
  filter.frequency.value = 1450 + (source.index % 5) * 180;
  filter.Q.value = 0.75;
  gain.gain.value = 0;
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = RAIN_WATER_REF_DISTANCE;
  panner.maxDistance = RAIN_WATER_MAX_DISTANCE;
  panner.rolloffFactor = 1.4;
  setAudioParam(panner.positionX, source.x, state.context.currentTime, 0);
  setAudioParam(panner.positionY, source.y - source.height * 0.42, state.context.currentTime, 0);
  setAudioParam(panner.positionZ, source.z, state.context.currentTime, 0);
  sourceNode.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  connectSceneAudioNode(panner, getSfxDryGain(state), getSfxReverbInput(state));
  sourceNode.start();

  const voice = { id, source: sourceNode, filter, gain, panner, timerId: null, seed: source.index * 23.41 };
  state.waterfallVoices.set(id, voice);
  scheduleRainDripPulse(state, voice, options);
  return voice;
}

export function scheduleRainDripPulse(state, voice, options = {}) {
  const {
    random = Math.random,
    isCurrent = () => true,
    setTimeoutFn = globalThis.setTimeout,
  } = options;
  const delay = 220 + Math.floor(random() * 980 + voice.seed % 160);
  voice.timerId = setTimeoutFn(() => {
    voice.timerId = null;
    if (!isCurrent(state) || !state.waterfallVoices.has(voice.id)) return;

    playRainDripPulse(state, voice, options);
    scheduleRainDripPulse(state, voice, options);
  }, delay);
}

export function playRainDripPulse(state, voice, options = {}) {
  const {
    random = Math.random,
    isCurrent = () => true,
    playOneShot = playOneShotToNode,
  } = options;

  if (state.audioBuffers?.has(RAIN_SPOT_DRIP_SOUND_URL)) {
    playOneShot(
      state,
      RAIN_SPOT_DRIP_SOUND_URL,
      voice.panner,
      RAIN_DRIP_GAIN * (0.55 + random() * 0.7),
      { isCurrent },
    );
    return;
  }

  const now = state.context.currentTime;
  const oscillator = state.context.createOscillator();
  const envelope = state.context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(880 + random() * 1700, now);
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(RAIN_DRIP_GAIN * (0.45 + random() * 0.55), now + 0.006);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.055 + random() * 0.08);
  oscillator.connect(envelope);
  envelope.connect(voice.panner);
  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

export function stopRainWaterVoice(state, voice, options = {}) {
  const {
    clearTimeoutFn = globalThis.clearTimeout,
    setTimeoutFn = globalThis.setTimeout,
  } = options;
  if (voice.timerId) {
    clearTimeoutFn(voice.timerId);
    voice.timerId = null;
  }
  voice.gain.gain.setTargetAtTime(0, state.context.currentTime, 0.12);
  setTimeoutFn(() => {
    try {
      voice.source.stop();
    } catch {
      // Already stopped by the browser audio engine.
    }
  }, 220);
}

export function ensureZombieGruntLoop(state, options = {}) {
  const {
    loadAudio = loadAudioBuffer,
    warn = console.warn,
    url = ZOMBIE_GRUNT_LOOP_URL,
  } = options;
  if (state.audioBuffers.has(url) || state.zombieLoopLoading || state.zombieLoopFailed) return;

  state.zombieLoopLoading = true;
  loadAudio(state, url)
    .catch((error) => {
      state.zombieLoopFailed = true;
      warn(error);
    })
    .finally(() => {
      state.zombieLoopLoading = false;
    });
}

export function getZombieVoice(state, zombie, buffer) {
  if (state.zombieVoices.has(zombie.id)) return state.zombieVoices.get(zombie.id);

  const source = state.context.createBufferSource();
  const gain = state.context.createGain();
  const filter = state.context.createBiquadFilter();
  const panner = state.context.createPanner();
  source.buffer = buffer;
  source.loop = true;
  gain.gain.value = 0;
  filter.type = 'lowpass';
  filter.frequency.value = ZOMBIE_GRUNT_OPEN_FILTER_HZ;
  filter.Q.value = 0.6;
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE;
  panner.maxDistance = ZOMBIE_GRUNT_MAX_DISTANCE;
  panner.rolloffFactor = 2.9;
  setAudioParam(panner.positionX, zombie.x, state.context.currentTime, 0);
  setAudioParam(panner.positionY, zombie.y, state.context.currentTime, 0);
  setAudioParam(panner.positionZ, zombie.z, state.context.currentTime, 0);
  source.connect(gain);
  gain.connect(filter);
  filter.connect(panner);
  connectSceneAudioNode(panner, getSfxDryGain(state), getSfxReverbInput(state));
  source.start();

  const voice = { source, gain, filter, panner };
  state.zombieVoices.set(zombie.id, voice);
  return voice;
}

export function stopZombieVoices(state, options = {}) {
  for (const voice of state.zombieVoices.values()) {
    stopZombieVoice(state, voice, options);
  }
  state.zombieVoices.clear();
}

export function stopZombieVoice(state, voice, options = {}) {
  const { setTimeoutFn = globalThis.setTimeout } = options;
  voice.gain.gain.setTargetAtTime(0, state.context.currentTime, 0.08);
  setTimeoutFn(() => {
    try {
      voice.source.stop();
    } catch {
      // Already stopped by the browser audio engine.
    }
  }, 160);
}

export function getSpecialEnemyVoice(state, enemy, buffer, profile) {
  if (state.specialEnemyVoices.has(enemy.id)) return state.specialEnemyVoices.get(enemy.id);

  const source = state.context.createBufferSource();
  const gain = state.context.createGain();
  const filter = state.context.createBiquadFilter();
  const panner = state.context.createPanner();

  source.buffer = buffer;
  source.loop = true;
  gain.gain.value = 0;
  filter.type = enemy.enemyType === 'one-eye-alien' ? 'bandpass' : 'lowpass';
  filter.frequency.value = profile.openFilterHz;
  filter.Q.value = enemy.enemyType === 'one-eye-alien' ? 5.5 : 1.4;
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = SPECIAL_ENEMY_LOOP_FULL_VOLUME_DISTANCE;
  panner.maxDistance = SPECIAL_ENEMY_LOOP_MAX_DISTANCE;
  panner.rolloffFactor = enemy.enemyType === 'one-eye-alien' ? 2.4 : 2.0;
  setAudioParam(panner.positionX, enemy.x, state.context.currentTime, 0);
  setAudioParam(panner.positionY, enemy.y, state.context.currentTime, 0);
  setAudioParam(panner.positionZ, enemy.z, state.context.currentTime, 0);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  connectSceneAudioNode(panner, getSfxDryGain(state), getSfxReverbInput(state));
  source.start();

  const voice = {
    source,
    gain,
    filter,
    panner,
  };
  state.specialEnemyVoices.set(enemy.id, voice);
  return voice;
}

export function stopSpecialEnemyVoice(state, voice, options = {}) {
  const { setTimeoutFn = globalThis.setTimeout } = options;
  voice.gain.gain.setTargetAtTime(0, state.context.currentTime, 0.08);
  setTimeoutFn(() => {
    try {
      voice.source.stop();
    } catch {
      // Already stopped by the browser audio engine.
    }
  }, 160);
}

export function playEnemyAttackSound(state, enemy, profile, options = {}) {
  const {
    now = performance.now(),
    playerY = 0,
    volumeScale = 1,
    isCurrent = () => true,
    playSpatial = playSpatialOneShot,
    cooldownMs = SPECIAL_ENEMY_ATTACK_COOLDOWN_MS,
  } = options;
  const lastAttackAt = state.enemyAttackTimes.get(enemy.id) ?? -Infinity;
  if (now - lastAttackAt < cooldownMs) return false;

  state.enemyAttackTimes.set(enemy.id, now);
  playSpatial(state, profile.attackUrl, enemy, profile.attackGain * volumeScale, {
    refDistance: 1,
    maxDistance: 20,
    rolloffFactor: enemy.enemyType === 'molten-sentinel' ? 1.6 : 2.2,
    fallbackY: playerY,
    isCurrent,
  });
  return true;
}

export function applySceneReverb(
  state,
  reverbId,
  presets = SCENE_REVERB_PRESETS,
  fallbackId = 'tight-room',
) {
  const preset = presets[reverbId] ?? presets[fallbackId];
  if (state.activeReverbId !== reverbId) {
    state.convolver.buffer = createReverbImpulse(state.context, preset);
    state.activeReverbId = reverbId;
  }
  state.reverbWetGain.gain.setTargetAtTime(preset.wet, state.context.currentTime, 0.8);
}

export function createReverbImpulse(context, preset) {
  const length = Math.max(1, Math.floor(context.sampleRate * preset.duration));
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const phase = i / length;
      const bitCrush = ((i * 1103515245 + channel * 12345) & 255) / 128 - 1;
      data[i] = bitCrush * ((1 - phase) ** preset.decay) * 0.42;
    }
  }

  return impulse;
}

export function setAudioParam(param, value, time, smoothing) {
  if (smoothing > 0) {
    param.setTargetAtTime(value, time, smoothing);
  } else {
    param.setValueAtTime(value, time);
  }
}

export function updateAudioListener(listener, player, time) {
  const forwardX = Math.sin(player.yaw) * Math.cos(player.pitch);
  const forwardY = Math.sin(player.pitch);
  const forwardZ = -Math.cos(player.yaw) * Math.cos(player.pitch);

  if (listener.positionX) {
    listener.positionX.setTargetAtTime(player.x, time, 0.05);
    listener.positionY.setTargetAtTime(player.y, time, 0.05);
    listener.positionZ.setTargetAtTime(player.z, time, 0.05);
    listener.forwardX.setTargetAtTime(forwardX, time, 0.05);
    listener.forwardY.setTargetAtTime(forwardY, time, 0.05);
    listener.forwardZ.setTargetAtTime(forwardZ, time, 0.05);
    listener.upX.setTargetAtTime(0, time, 0.05);
    listener.upY.setTargetAtTime(1, time, 0.05);
    listener.upZ.setTargetAtTime(0, time, 0.05);
  } else {
    listener.setPosition(player.x, player.y, player.z);
    listener.setOrientation(forwardX, forwardY, forwardZ, 0, 1, 0);
  }
}

export function isAudioPathOccluded(start, end, colliders) {
  return colliders.some((collider) => {
    if (!collider) return false;
    if (Math.max(start.y, end.y) < collider.minY || Math.min(start.y, end.y) > collider.maxY) return false;
    return lineIntersectsCollider2D(start, end, collider);
  });
}

function lineIntersectsCollider2D(start, end, collider) {
  if (pointInsideCollider2D(start, collider) || pointInsideCollider2D(end, collider)) return false;

  const dx = end.x - start.x;
  const dz = end.z - start.z;
  let tMin = 0;
  let tMax = 1;

  const xHit = clipSegmentAxis(start.x, dx, collider.minX, collider.maxX, tMin, tMax);
  if (!xHit.hit) return false;
  tMin = xHit.tMin;
  tMax = xHit.tMax;

  const zHit = clipSegmentAxis(start.z, dz, collider.minZ, collider.maxZ, tMin, tMax);
  return zHit.hit;
}

function clipSegmentAxis(start, delta, min, max, tMin, tMax) {
  if (Math.abs(delta) < 0.0001) {
    return { hit: start >= min && start <= max, tMin, tMax };
  }

  const inverse = 1 / delta;
  let near = (min - start) * inverse;
  let far = (max - start) * inverse;
  if (near > far) {
    const swap = near;
    near = far;
    far = swap;
  }

  const nextMin = Math.max(tMin, near);
  const nextMax = Math.min(tMax, far);
  return { hit: nextMin <= nextMax, tMin: nextMin, tMax: nextMax };
}

function pointInsideCollider2D(point, collider) {
  return point.x >= collider.minX
    && point.x <= collider.maxX
    && point.z >= collider.minZ
    && point.z <= collider.maxZ;
}
