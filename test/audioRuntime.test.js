import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applySceneReverb,
  connectSceneAudioNode,
  createAudioRuntimeState,
  createReverbImpulse,
  createWaterNoiseBuffer,
  createAmbienceSlot,
  ensureSceneAmbienceLoop,
  getCutUpAudioDuckAmount,
  getCinematicMusicTargetGains,
  getEnemyAudioUrls,
  getPlayerHeartbeatParams,
  getPlayerFootstepTargetGains,
  getRainWaterVoice,
  getSceneAmbienceTargetGain,
  getSpecialEnemyVoice,
  getTorchCrackleVoice,
  ensureMusicLoop,
  ensureLoopSource,
  ensurePlayerFootstepLoopSources,
  ensurePlayerHeartbeatLoop,
  ensureZombieGruntLoop,
  getZombieVoice,
  isAudioPathOccluded,
  loadAudioBuffer,
  playAssetOneShot,
  playBusOneShot,
  playEnemyAttackSound,
  playHeartbeatThump,
  playRainDripPulse,
  playTorchCracklePulse,
  playOneShotToNode,
  playSpatialOneShot,
  setAudioParam,
  syncPlayerHeartbeatGain,
  stopRainWaterVoice,
  stopSpecialEnemyVoice,
  stopTorchCrackleVoice,
  stopZombieVoice,
  stopZombieVoices,
  updateAudioListener,
} from '../src/audioRuntime.js';

function fakeNode(name, connections) {
  return {
    name,
    gain: {
      value: 1,
      calls: [],
      setTargetAtTime(value, time, smoothing) {
        this.calls.push(['target', value, time, smoothing]);
        this.value = value;
      },
      setValueAtTime(value, time) {
        this.calls.push(['value', value, time]);
        this.value = value;
      },
      linearRampToValueAtTime(value, time) {
        this.calls.push(['linear', value, time]);
        this.value = value;
      },
      exponentialRampToValueAtTime(value, time) {
        this.calls.push(['exponential', value, time]);
        this.value = value;
      },
    },
    connect(target) {
      connections.push([name, target.name]);
    },
  };
}

function createFakeAudioContextClass(connections = []) {
  return class FakeAudioContext {
    constructor() {
      this.sampleRate = 8;
      this.currentTime = 0;
      this.state = 'running';
      this.destination = fakeNode('destination', connections);
      this.listener = {};
      this.createdBuffers = [];
      this.createdFilters = [];
      this.createdOscillators = [];
      this.startedSources = [];
      this.stoppedSources = [];
    }

    createGain() {
      return fakeNode(`gain${connections.length}`, connections);
    }

    createConvolver() {
      return fakeNode(`convolver${connections.length}`, connections);
    }

    createBiquadFilter() {
      const node = fakeNode(`filter${connections.length}`, connections);
      node.type = '';
      node.frequency = createFakeAudioParam();
      node.Q = createFakeAudioParam();
      this.createdFilters.push(node);
      return node;
    }

    createBuffer(channels, length, sampleRate) {
      const channelData = Array.from({ length: channels }, () => new Float32Array(length));
      const buffer = {
        channels,
        length,
        sampleRate,
        getChannelData(channel) {
          return channelData[channel];
        },
      };
      this.createdBuffers.push(buffer);
      return buffer;
    }

    createBufferSource() {
      const node = fakeNode(`source${connections.length}`, connections);
      node.buffer = null;
      node.loop = false;
      node.start = () => {
        this.startedSources.push(node);
      };
      node.stop = () => {
        this.stoppedSources.push(node);
      };
      return node;
    }

    createPanner() {
      const node = fakeNode(`panner${connections.length}`, connections);
      node.positionX = createFakeAudioParam();
      node.positionY = createFakeAudioParam();
      node.positionZ = createFakeAudioParam();
      return node;
    }

    createOscillator() {
      const node = fakeNode(`oscillator${connections.length}`, connections);
      node.type = 'sine';
      node.frequency = createFakeAudioParam();
      node.starts = [];
      node.stops = [];
      node.start = (time) => {
        node.starts.push(time);
      };
      node.stop = (time) => {
        node.stops.push(time);
      };
      this.createdOscillators.push(node);
      return node;
    }
  };
}

function createFakeAudioParam() {
  return {
    value: 0,
    calls: [],
    setTargetAtTime(value, time, smoothing) {
      this.calls.push(['target', value, time, smoothing]);
      this.value = value;
    },
    setValueAtTime(value, time) {
      this.calls.push(['value', value, time]);
      this.value = value;
    },
    linearRampToValueAtTime(value, time) {
      this.calls.push(['linear', value, time]);
      this.value = value;
    },
    exponentialRampToValueAtTime(value, time) {
      this.calls.push(['exponential', value, time]);
      this.value = value;
    },
  };
}

test('connects scene audio nodes to dry and reverb buses', () => {
  const connections = [];
  const source = fakeNode('source', connections);
  const dry = fakeNode('dry', connections);
  const reverb = fakeNode('reverb', connections);

  connectSceneAudioNode(source, dry, reverb);

  assert.deepEqual(connections, [
    ['source', 'dry'],
    ['source', 'reverb'],
  ]);
});

test('creates muted ambience slots connected to the ambience bus', () => {
  const connections = [];
  const context = {
    createGain() {
      return fakeNode('slotGain', connections);
    },
  };
  const ambience = fakeNode('ambience', connections);

  const slot = createAmbienceSlot(context, ambience);

  assert.deepEqual(slot, {
    id: null,
    source: null,
    gain: slot.gain,
    loadingId: null,
  });
  assert.equal(slot.gain.gain.value, 0);
  assert.deepEqual(connections, [['slotGain', 'ambience']]);
});

test('creates deterministic water noise buffers for rain beds', () => {
  const ContextClass = createFakeAudioContextClass();
  const context = new ContextClass();
  const buffer = createWaterNoiseBuffer(context, () => 1);
  const data = buffer.getChannelData(0);

  assert.equal(buffer.channels, 1);
  assert.equal(buffer.length, 16);
  assert.equal(buffer.sampleRate, 8);
  assert.ok(data[0] > 0);
  assert.ok(data.every((value) => value <= 0.7 && value >= -0.7));
});

test('creates the audio runtime graph state with default buses and bookkeeping', () => {
  const connections = [];
  const AudioContextClass = createFakeAudioContextClass(connections);

  const state = createAudioRuntimeState({
    AudioContextClass,
    now: 2000,
    sceneId: 'dungeon',
    random: () => 0.5,
  });

  assert.equal(state.context.sampleRate, 8);
  assert.equal(state.dryGain.gain.value, 1);
  assert.equal(state.reverbInput.gain.value, 0.8);
  assert.equal(state.reverbWetGain.gain.value, 0);
  assert.equal(state.ambienceGain.gain.value, 0);
  assert.equal(state.lightningGain.gain.value, 0.55);
  assert.equal(state.musicGain.gain.value, 1);
  assert.equal(state.titleMusicGain.gain.value, 0);
  assert.equal(state.uiSfxGain.gain.value, 0.58);
  assert.equal(state.transitionSfxGain.gain.value, 0.72);
  assert.equal(state.ambienceSlots.length, 2);
  assert.equal(state.activeAmbienceSlotIndex, 0);
  assert.equal(state.nextWorldStingerAt, 16000);
  assert.equal(state.worldStingerSceneId, 'dungeon');
  assert.equal(state.waterNoiseBuffer.length, 16);
  assert.ok(state.audioBuffers instanceof Map);
  assert.ok(state.musicLoopsLoading instanceof Set);
  assert.ok(connections.some(([from, to]) => from === state.dryGain.name && to === 'destination'));
});

test('flattens enemy audio profile URLs for preloading', () => {
  const urls = getEnemyAudioUrls({
    zombie: { loopUrl: 'zombie-loop', attackUrl: 'zombie-attack' },
    alien: { loopUrl: 'alien-loop', attackUrl: 'alien-attack' },
  });

  assert.deepEqual(urls, ['zombie-loop', 'zombie-attack', 'alien-loop', 'alien-attack']);
});

test('loads, decodes, caches, and coalesces audio buffer requests', async () => {
  const decodedBuffer = { decoded: true };
  const calls = [];
  const state = {
    audioBuffers: new Map(),
    audioBufferLoads: new Map(),
    context: {
      decodeAudioData(arrayBuffer) {
        calls.push(['decode', arrayBuffer.byteLength]);
        return Promise.resolve(decodedBuffer);
      },
    },
  };
  const fetchAudio = (url) => {
    calls.push(['fetch', url]);
    return Promise.resolve({
      ok: true,
      arrayBuffer() {
        calls.push(['arrayBuffer', url]);
        return Promise.resolve(new ArrayBuffer(6));
      },
    });
  };

  const first = loadAudioBuffer(state, 'sound.wav', fetchAudio);
  const second = loadAudioBuffer(state, 'sound.wav', fetchAudio);

  assert.equal(first, second);
  assert.equal(await first, decodedBuffer);
  assert.equal(await loadAudioBuffer(state, 'sound.wav', fetchAudio), decodedBuffer);
  assert.deepEqual(calls, [
    ['fetch', 'sound.wav'],
    ['arrayBuffer', 'sound.wav'],
    ['decode', 6],
  ]);
  assert.equal(state.audioBuffers.get('sound.wav'), decodedBuffer);
  assert.equal(state.audioBufferLoads.has('sound.wav'), false);
});

test('crossfades loaded scene ambience into the next slot', async () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const ambience = fakeNode('ambience', connections);
  const state = {
    context,
    ambienceSource: null,
    activeAmbienceId: 'dungeon',
    loadingAmbienceId: null,
    activeAmbienceSlotIndex: 0,
    ambienceSlots: [createAmbienceSlot(context, ambience), createAmbienceSlot(context, ambience)],
  };
  const previousSource = context.createBufferSource();
  state.ambienceSlots[0].source = previousSource;
  state.ambienceSlots[0].id = 'dungeon';
  const scheduled = [];

  ensureSceneAmbienceLoop(state, 'forest', { forest: 'forest.wav' }, {
    loadAudio: (runtimeState, url) => Promise.resolve({ id: url }),
    isCurrent: () => true,
    setTimeoutFn: (callback, delay) => {
      scheduled.push([callback, delay]);
      return scheduled.length;
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(context.startedSources.length, 1);
  assert.equal(state.activeAmbienceId, 'forest');
  assert.equal(state.activeAmbienceSlotIndex, 1);
  assert.equal(state.ambienceSource, context.startedSources[0]);
  assert.equal(state.ambienceSlots[1].id, 'forest');
  assert.deepEqual(state.ambienceSlots[1].gain.gain.calls, [['target', 1, 0, 0.42]]);
  assert.deepEqual(state.ambienceSlots[0].gain.gain.calls, [['target', 0, 0, 0.42]]);
  assert.equal(state.loadingAmbienceId, null);
  assert.equal(scheduled[0][1], 900);

  scheduled[0][0]();
  assert.deepEqual(context.stoppedSources, [previousSource]);
  assert.equal(state.ambienceSlots[0].source, null);
  assert.equal(state.ambienceSlots[0].id, null);
});

test('ignores stale scene ambience loads and clears loading state', async () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const state = {
    context,
    ambienceSource: null,
    activeAmbienceId: null,
    loadingAmbienceId: null,
    activeAmbienceSlotIndex: 0,
    ambienceSlots: [
      createAmbienceSlot(context, fakeNode('ambience', connections)),
      createAmbienceSlot(context, fakeNode('ambience', connections)),
    ],
  };

  ensureSceneAmbienceLoop(state, 'forest', { forest: 'forest.wav' }, {
    loadAudio: () => Promise.resolve({ id: 'forest' }),
    isCurrent: () => false,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(context.startedSources.length, 0);
  assert.equal(state.activeAmbienceId, null);
  assert.equal(state.loadingAmbienceId, null);
});

test('clears failed audio buffer loads before rethrowing', async () => {
  const state = {
    audioBuffers: new Map(),
    audioBufferLoads: new Map(),
    context: {
      decodeAudioData() {
        throw new Error('decode should not run');
      },
    },
  };

  await assert.rejects(
    loadAudioBuffer(state, 'missing.wav', () => Promise.resolve({ ok: false, status: 404 }), () => {}),
    /Could not load audio asset missing\.wav: 404/,
  );
  assert.equal(state.audioBufferLoads.has('missing.wav'), false);
  assert.equal(state.audioBuffers.has('missing.wav'), false);
});

test('plays cached audio buffers directly to a gain node', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const output = fakeNode('output', connections);
  const buffer = { id: 'buffer' };
  const state = {
    context,
    audioBuffers: new Map([['hit.wav', buffer]]),
    audioBufferLoads: new Map(),
  };

  playAssetOneShot(state, 'hit.wav', output);

  assert.equal(context.startedSources.length, 1);
  assert.equal(context.startedSources[0].buffer, buffer);
  assert.deepEqual(connections, [['source0', 'output']]);
});

test('routes one-shots through a gain bus at the requested volume', () => {
  const calls = [];
  const state = {
    context: { currentTime: 12.25 },
  };
  const gainNode = {
    gain: {
      calls: [],
      setValueAtTime(value, time) {
        this.calls.push([value, time]);
      },
    },
  };
  const isCurrent = () => true;

  const result = playBusOneShot(state, 'menu.wav', gainNode, 0.46, {
    isCurrent,
    playAsset: (...args) => {
      calls.push(args);
      return 'source';
    },
  });

  assert.equal(result, 'source');
  assert.deepEqual(gainNode.gain.calls, [[0.46, 12.25]]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], state);
  assert.equal(calls[0][1], 'menu.wav');
  assert.equal(calls[0][2], gainNode);
  assert.equal(calls[0][3].isCurrent, isCurrent);
});

test('loads missing direct one-shots and plays only while state is current', async () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const output = fakeNode('output', connections);
  const loaded = { id: 'loaded' };
  const state = {
    context,
    audioBuffers: new Map(),
    audioBufferLoads: new Map(),
  };

  playAssetOneShot(state, 'late.wav', output, {
    loadAudio: () => Promise.resolve(loaded),
    isCurrent: () => true,
  });
  await Promise.resolve();

  assert.equal(context.startedSources.length, 1);
  assert.equal(context.startedSources[0].buffer, loaded);

  playAssetOneShot(state, 'stale.wav', output, {
    loadAudio: () => Promise.resolve({ id: 'stale' }),
    isCurrent: () => false,
  });
  await Promise.resolve();

  assert.equal(context.startedSources.length, 1);
});

test('plays one-shots through a temporary gain node', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const output = fakeNode('output', connections);
  const state = {
    context,
    audioBuffers: new Map([['spot.wav', { id: 'spot' }]]),
    audioBufferLoads: new Map(),
  };

  playOneShotToNode(state, 'spot.wav', output, 0.35);

  assert.equal(context.startedSources.length, 1);
  const gain = connections.find(([from, to]) => from.startsWith('gain') && to === 'output')?.[0];
  assert.ok(gain);
  assert.deepEqual(connections, [
    ['source0', gain],
    [gain, 'output'],
  ]);
});

test('plays spatial one-shots through a configured panner', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const state = {
    context,
    audioBuffers: new Map([['spatial.wav', { id: 'spatial' }]]),
    audioBufferLoads: new Map(),
    dryGain: fakeNode('dry', connections),
    reverbInput: fakeNode('reverb', connections),
  };

  const panner = playSpatialOneShot(state, 'spatial.wav', { x: 2, z: -3 }, 0.8, {
    fallbackY: 1.4,
    refDistance: 4,
    maxDistance: 30,
    rolloffFactor: 0.9,
  });

  assert.equal(context.startedSources.length, 1);
  assert.equal(panner.panningModel, 'HRTF');
  assert.equal(panner.distanceModel, 'inverse');
  assert.equal(panner.refDistance, 4);
  assert.equal(panner.maxDistance, 30);
  assert.equal(panner.rolloffFactor, 0.9);
  assert.deepEqual(panner.positionX.calls, [['value', 2, 0]]);
  assert.deepEqual(panner.positionY.calls, [['value', 1.4, 0]]);
  assert.deepEqual(panner.positionZ.calls, [['value', -3, 0]]);
});

test('loads and starts music loops once per id', async () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const gain = fakeNode('musicGain', connections);
  const buffer = { id: 'music' };
  const state = {
    context,
    musicSources: new Map(),
    musicLoopsLoading: new Set(),
    musicLoopsFailed: new Set(),
  };
  const loads = [];

  ensureMusicLoop(state, 'title', 'title.wav', gain, {
    loadAudio: (runtimeState, url) => {
      loads.push([runtimeState, url]);
      return Promise.resolve(buffer);
    },
    isCurrent: () => true,
  });
  ensureMusicLoop(state, 'title', 'title.wav', gain, {
    loadAudio: () => {
      throw new Error('duplicate load should not start');
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(loads, [[state, 'title.wav']]);
  assert.equal(context.startedSources.length, 1);
  assert.equal(context.startedSources[0].buffer, buffer);
  assert.equal(context.startedSources[0].loop, true);
  assert.equal(state.musicSources.get('title'), context.startedSources[0]);
  assert.equal(state.musicLoopsLoading.has('title'), false);
});

test('marks failed music loop loads without keeping them loading', async () => {
  const ContextClass = createFakeAudioContextClass();
  const context = new ContextClass();
  const state = {
    context,
    musicSources: new Map(),
    musicLoopsLoading: new Set(),
    musicLoopsFailed: new Set(),
  };

  ensureMusicLoop(state, 'bad', 'bad.wav', fakeNode('musicGain', []), {
    loadAudio: () => Promise.reject(new Error('bad music')),
    warn: () => {},
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(state.musicLoopsFailed.has('bad'), true);
  assert.equal(state.musicLoopsLoading.has('bad'), false);
  assert.equal(state.musicSources.has('bad'), false);
});

test('loads and starts a named looping source once', async () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const output = fakeNode('breathingGain', connections);
  const buffer = { id: 'breath' };
  const state = {
    context,
    lowHealthBreathingSource: null,
    lowHealthBreathingLoading: false,
    lowHealthBreathingFailed: false,
  };

  ensureLoopSource(state, {
    url: 'breath.wav',
    outputNode: output,
    sourceKey: 'lowHealthBreathingSource',
    loadingKey: 'lowHealthBreathingLoading',
    failedKey: 'lowHealthBreathingFailed',
    loadAudio: () => Promise.resolve(buffer),
    isCurrent: () => true,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(context.startedSources.length, 1);
  assert.equal(context.startedSources[0].buffer, buffer);
  assert.equal(context.startedSources[0].loop, true);
  assert.equal(state.lowHealthBreathingSource, context.startedSources[0]);
  assert.equal(state.lowHealthBreathingLoading, false);
  assert.equal(state.lowHealthBreathingFailed, false);
});

test('marks failed named looping sources', async () => {
  const ContextClass = createFakeAudioContextClass();
  const state = {
    context: new ContextClass(),
    source: null,
    loading: false,
    failed: false,
  };

  ensureLoopSource(state, {
    url: 'bad-loop.wav',
    outputNode: fakeNode('gain', []),
    sourceKey: 'source',
    loadingKey: 'loading',
    failedKey: 'failed',
    loadAudio: () => Promise.reject(new Error('bad loop')),
    warn: () => {},
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(state.source, null);
  assert.equal(state.loading, false);
  assert.equal(state.failed, true);
});

test('loads and starts walk and sprint footstep loops together', async () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const state = {
    context,
    footstepWalkGain: fakeNode('walkGain', connections),
    footstepSprintGain: fakeNode('sprintGain', connections),
    footstepWalkSource: null,
    footstepSprintSource: null,
    footstepLoopsLoading: false,
    footstepLoopsFailed: false,
  };
  const buffers = {
    'walk.wav': { id: 'walk' },
    'sprint.wav': { id: 'sprint' },
  };

  ensurePlayerFootstepLoopSources(state, {
    walkUrl: 'walk.wav',
    sprintUrl: 'sprint.wav',
    loadAudio: (runtimeState, url) => Promise.resolve(buffers[url]),
    isCurrent: () => true,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(context.startedSources.length, 2);
  assert.equal(state.footstepWalkSource.buffer, buffers['walk.wav']);
  assert.equal(state.footstepSprintSource.buffer, buffers['sprint.wav']);
  assert.equal(state.footstepWalkSource.loop, true);
  assert.equal(state.footstepSprintSource.loop, true);
  assert.equal(state.footstepLoopsLoading, false);
  assert.equal(state.footstepLoopsFailed, false);
});

test('marks failed footstep loop loads without keeping them loading', async () => {
  const ContextClass = createFakeAudioContextClass();
  const state = {
    context: new ContextClass(),
    footstepWalkGain: fakeNode('walkGain', []),
    footstepSprintGain: fakeNode('sprintGain', []),
    footstepWalkSource: null,
    footstepSprintSource: null,
    footstepLoopsLoading: false,
    footstepLoopsFailed: false,
  };

  ensurePlayerFootstepLoopSources(state, {
    walkUrl: 'walk.wav',
    sprintUrl: 'sprint.wav',
    loadAudio: () => Promise.reject(new Error('bad footsteps')),
    warn: () => {},
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(state.footstepWalkSource, null);
  assert.equal(state.footstepSprintSource, null);
  assert.equal(state.footstepLoopsLoading, false);
  assert.equal(state.footstepLoopsFailed, true);
});

test('calculates Cut-Up audio ducking from state and time', () => {
  const state = { cutUpAudioDuckStartedAt: 1000 };

  assert.equal(getCutUpAudioDuckAmount(null, 1000, 420), 0);
  assert.equal(getCutUpAudioDuckAmount(state, 999, 420), 0);
  assert.equal(getCutUpAudioDuckAmount(state, 1000, 420), 1);
  assert.equal(getCutUpAudioDuckAmount(state, 1210, 420), 0.5);
  assert.equal(getCutUpAudioDuckAmount(state, 1421, 420), 0);
});

test('calculates scene ambience target gain from UI and ducking state', () => {
  assert.equal(getSceneAmbienceTargetGain({ hasAmbience: false }), 0);
  assert.equal(getSceneAmbienceTargetGain({ hasAmbience: true, titleActive: true }), 0);
  assert.equal(getSceneAmbienceTargetGain({ hasAmbience: true, deathActive: true }), 0);
  assert.equal(getSceneAmbienceTargetGain({ hasAmbience: true, maxGain: 0.2 }), 0.2);
  assert.equal(getSceneAmbienceTargetGain({
    hasAmbience: true,
    maxGain: 0.2,
    optionsOpen: true,
    duckAmount: 0.5,
  }), 0.05179999999999999);
});

test('calculates cinematic music target gains by title and game mode', () => {
  assert.deepEqual(getCinematicMusicTargetGains({
    titleActive: true,
    gameMode: 'normal',
    deathActive: false,
    optionsOpen: false,
    duckAmount: 0,
    titleGain: 0.22,
    freeRoamGain: 0.12,
    cutUpGain: 0.18,
  }), {
    title: 0.22,
    freeRoam: 0,
    cutUp: 0,
  });

  assert.deepEqual(getCinematicMusicTargetGains({
    titleActive: false,
    gameMode: 'cut-up',
    deathActive: false,
    optionsOpen: true,
    duckAmount: 0.5,
    titleGain: 0.22,
    freeRoamGain: 0.12,
    cutUpGain: 0.18,
  }), {
    title: 0,
    freeRoam: 0,
    cutUp: 0.18 * 0.48 * (1 - 0.5 * 0.45),
  });

  assert.deepEqual(getCinematicMusicTargetGains({
    titleActive: false,
    gameMode: 'normal',
    deathActive: true,
    duckAmount: 0,
    titleGain: 0.22,
    freeRoamGain: 0.12,
    cutUpGain: 0.18,
  }), {
    title: 0,
    freeRoam: 0,
    cutUp: 0,
  });
});

test('calculates player footstep target gains from movement state', () => {
  assert.deepEqual(getPlayerFootstepTargetGains({
    grounded: false,
    moving: true,
  }), { walk: 0, sprint: 0 });

  assert.deepEqual(getPlayerFootstepTargetGains({
    grounded: true,
    moving: false,
  }), { walk: 0, sprint: 0 });

  assert.deepEqual(getPlayerFootstepTargetGains({
    grounded: true,
    moving: true,
    sprinting: false,
    walkGain: 0.13,
    sprintGain: 0.19,
  }), { walk: 0.13, sprint: 0 });

  assert.deepEqual(getPlayerFootstepTargetGains({
    grounded: true,
    moving: true,
    sprinting: true,
    walkGain: 0.13,
    sprintGain: 0.19,
  }), { walk: 0, sprint: 0.19 });

  assert.deepEqual(getPlayerFootstepTargetGains({
    titleActive: true,
    grounded: true,
    moving: true,
    sprinting: true,
    walkGain: 0.13,
    sprintGain: 0.19,
  }), { walk: 0, sprint: 0 });
});

test('calculates player heartbeat params from nearest enemy distance', () => {
  assert.deepEqual(getPlayerHeartbeatParams({
    titleActive: true,
    nearestEnemyDistance: 0,
    baseIntervalMs: 1320,
    dangerIntervalMs: 560,
    baseGain: 0.018,
    dangerGain: 0.07,
    dangerDistance: 9,
  }), { intervalMs: 1320, gain: 0, masterGain: 0 });

  assert.deepEqual(getPlayerHeartbeatParams({
    nearestEnemyDistance: null,
    baseIntervalMs: 1320,
    dangerIntervalMs: 560,
    baseGain: 0.018,
    dangerGain: 0.07,
    dangerDistance: 9,
  }), { intervalMs: 1320, gain: 0.018, masterGain: 1 });

  assert.deepEqual(getPlayerHeartbeatParams({
    nearestEnemyDistance: 4.5,
    baseIntervalMs: 1320,
    dangerIntervalMs: 560,
    baseGain: 0.018,
    dangerGain: 0.07,
    dangerDistance: 9,
  }), { intervalMs: 940, gain: 0.044, masterGain: 1 });

  assert.deepEqual(getPlayerHeartbeatParams({
    nearestEnemyDistance: -1,
    baseIntervalMs: 1320,
    dangerIntervalMs: 560,
    baseGain: 0.018,
    dangerGain: 0.07,
    dangerDistance: 9,
  }), { intervalMs: 560, gain: 0.07, masterGain: 1 });
});

test('plays heartbeat thumps through square oscillator envelopes', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const state = {
    context,
    heartbeatGain: fakeNode('heartbeatGain', connections),
  };

  playHeartbeatThump(state, 1.5, 84, 0.05);

  const oscillator = context.createdOscillators[0];
  assert.equal(oscillator.type, 'square');
  assert.deepEqual(oscillator.frequency.calls, [['value', 84, 1.5]]);
  assert.deepEqual(oscillator.starts, [1.5]);
  assert.equal(oscillator.stops.length, 1);
  assert.equal(Math.round(oscillator.stops[0] * 100), 164);
  const envelopeName = connections.find(([from, to]) => from.startsWith('oscillator') && to.startsWith('gain'))?.[1];
  assert.ok(envelopeName);
  assert.deepEqual(connections, [
    [oscillator.name, envelopeName],
    [envelopeName, 'heartbeatGain'],
  ]);
});

test('schedules heartbeat pulses and reschedules using current danger params', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const callbacks = [];
  const state = {
    context,
    heartbeatGain: fakeNode('heartbeatGain', connections),
    heartbeatLoopTimer: null,
  };

  ensurePlayerHeartbeatLoop(state, {
    getHeartbeatParams: () => ({ gain: 0.06, intervalMs: 640, masterGain: 1 }),
    isCurrent: () => true,
    setTimeoutFn: (callback, delay) => {
      callbacks.push({ callback, delay });
      return callbacks.length;
    },
    baseIntervalMs: 1200,
  });

  assert.equal(state.heartbeatLoopTimer, 1);
  assert.equal(callbacks[0].delay, 1200);

  callbacks[0].callback();

  assert.equal(context.createdOscillators.length, 2);
  assert.deepEqual(context.createdOscillators.map((oscillator) => oscillator.frequency.calls[0]), [
    ['value', 84, 0],
    ['value', 64, 0.16],
  ]);
  assert.equal(state.heartbeatLoopTimer, 2);
  assert.equal(callbacks[1].delay, 640);
});

test('does not emit heartbeat thumps when audio state is stale', () => {
  const ContextClass = createFakeAudioContextClass();
  const context = new ContextClass();
  const callbacks = [];
  const state = {
    context,
    heartbeatGain: fakeNode('heartbeatGain', []),
    heartbeatLoopTimer: null,
  };

  ensurePlayerHeartbeatLoop(state, {
    getHeartbeatParams: () => {
      throw new Error('stale state should not read heartbeat params');
    },
    isCurrent: () => false,
    setTimeoutFn: (callback, delay) => {
      callbacks.push({ callback, delay });
      return callbacks.length;
    },
    baseIntervalMs: 1200,
  });
  callbacks[0].callback();

  assert.equal(context.createdOscillators.length, 0);
  assert.equal(state.heartbeatLoopTimer, null);
});

test('syncs heartbeat master gain from current params', () => {
  const state = {
    context: { currentTime: 2.5 },
    heartbeatGain: fakeNode('heartbeatGain', []),
  };

  syncPlayerHeartbeatGain(state, { masterGain: 0.42 });

  assert.deepEqual(state.heartbeatGain.gain.calls, [['target', 0.42, 2.5, 0.18]]);
});

test('creates and schedules spatial torch crackle voices', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const scheduled = [];
  const state = {
    context,
    dryGain: fakeNode('dry', connections),
    reverbInput: fakeNode('reverb', connections),
    torchCrackleVoices: new Map(),
  };

  const voice = getTorchCrackleVoice(state, 'torch:1', { x: 2, y: 3, z: -4 }, 2, {
    random: () => 0.25,
    isCurrent: () => true,
    setTimeoutFn: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
  });

  assert.equal(state.torchCrackleVoices.get('torch:1'), voice);
  assert.equal(voice.gain.gain.value, 0);
  assert.equal(voice.filter.type, 'bandpass');
  assert.equal(voice.filter.frequency.value, 1300);
  assert.equal(voice.filter.Q.value, 2.8);
  assert.equal(voice.panner.panningModel, 'HRTF');
  assert.equal(voice.panner.distanceModel, 'inverse');
  assert.equal(voice.panner.refDistance, 1.2);
  assert.equal(voice.panner.maxDistance, 16);
  assert.deepEqual(voice.panner.positionX.calls, [['value', 2, 0]]);
  assert.deepEqual(voice.panner.positionY.calls, [['value', 3, 0]]);
  assert.deepEqual(voice.panner.positionZ.calls, [['value', -4, 0]]);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 55 + Math.floor(0.25 * 145 + voice.seed % 37));
});

test('torch crackle pulses use deterministic oscillator envelopes', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const voice = { gain: fakeNode('voiceGain', connections) };
  const state = { context };

  playTorchCracklePulse(state, voice, { random: () => 0.5 });

  const oscillator = context.createdOscillators[0];
  assert.equal(oscillator.type, 'sawtooth');
  assert.deepEqual(oscillator.frequency.calls, [['value', 1670, 0]]);
  assert.deepEqual(oscillator.starts, [0]);
  assert.deepEqual(oscillator.stops, [0.14]);
});

test('torch crackle timers stop stale voices without emitting pulses', () => {
  const ContextClass = createFakeAudioContextClass();
  const context = new ContextClass();
  const scheduled = [];
  const state = {
    context,
    dryGain: fakeNode('dry', []),
    reverbInput: fakeNode('reverb', []),
    torchCrackleVoices: new Map(),
  };

  getTorchCrackleVoice(state, 'torch:stale', { x: 0, y: 0, z: 0 }, 0, {
    random: () => 0,
    isCurrent: () => false,
    setTimeoutFn: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
  });
  scheduled[0].callback();

  assert.equal(context.createdOscillators.length, 0);
});

test('stopping torch crackle voices clears timers and fades out gain', () => {
  const cleared = [];
  const state = {
    context: { currentTime: 4 },
  };
  const voice = {
    timerId: 12,
    gain: fakeNode('voiceGain', []),
  };

  stopTorchCrackleVoice(state, voice, {
    clearTimeoutFn: (timerId) => cleared.push(timerId),
  });

  assert.deepEqual(cleared, [12]);
  assert.equal(voice.timerId, null);
  assert.deepEqual(voice.gain.gain.calls, [['target', 0, 4, 0.08]]);
});

test('creates and schedules spatial rain water voices', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const scheduled = [];
  const state = {
    context,
    dryGain: fakeNode('dry', connections),
    reverbInput: fakeNode('reverb', connections),
    waterNoiseBuffer: { id: 'water-noise' },
    waterfallVoices: new Map(),
  };
  const source = { index: 7, x: 4, y: 12, z: -3, height: 10 };

  const voice = getRainWaterVoice(state, 'rain:7', source, {
    random: () => 0.25,
    isCurrent: () => true,
    setTimeoutFn: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
  });

  assert.equal(state.waterfallVoices.get('rain:7'), voice);
  assert.equal(voice.source.buffer, state.waterNoiseBuffer);
  assert.equal(voice.source.loop, true);
  assert.equal(context.startedSources[0], voice.source);
  assert.equal(voice.filter.type, 'bandpass');
  assert.equal(voice.filter.frequency.value, 1450 + (source.index % 5) * 180);
  assert.equal(voice.filter.Q.value, 0.75);
  assert.equal(voice.gain.gain.value, 0);
  assert.equal(voice.panner.refDistance, 3.4);
  assert.equal(voice.panner.maxDistance, 34);
  assert.deepEqual(voice.panner.positionX.calls, [['value', 4, 0]]);
  assert.deepEqual(voice.panner.positionY.calls, [['value', 12 - 10 * 0.42, 0]]);
  assert.deepEqual(voice.panner.positionZ.calls, [['value', -3, 0]]);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 220 + Math.floor(0.25 * 980 + voice.seed % 160));
});

test('rain drip pulses use cached spot assets when available', () => {
  const calls = [];
  const state = {
    audioBuffers: new Map([['./assets/audio/sfx/rain-spot-drip-8bit.wav?v=1', { id: 'drip' }]]),
  };
  const voice = { panner: fakeNode('panner', []) };

  playRainDripPulse(state, voice, {
    random: () => 0.5,
    isCurrent: () => true,
    playOneShot: (runtimeState, url, outputNode, volume, options) => {
      calls.push({ runtimeState, url, outputNode, volume, options });
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].runtimeState, state);
  assert.equal(calls[0].url, './assets/audio/sfx/rain-spot-drip-8bit.wav?v=1');
  assert.equal(calls[0].outputNode, voice.panner);
  assert.equal(calls[0].volume, 0.075 * (0.55 + 0.5 * 0.7));
  assert.equal(calls[0].options.isCurrent(), true);
});

test('rain drip pulses fall back to triangle oscillator droplets', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const state = {
    context,
    audioBuffers: new Map(),
  };
  const voice = { panner: fakeNode('rainPanner', connections) };

  playRainDripPulse(state, voice, { random: () => 0.5 });

  const oscillator = context.createdOscillators[0];
  assert.equal(oscillator.type, 'triangle');
  assert.deepEqual(oscillator.frequency.calls, [['value', 1730, 0]]);
  assert.deepEqual(oscillator.starts, [0]);
  assert.deepEqual(oscillator.stops, [0.18]);
});

test('rain drip timers stop stale voices without emitting pulses', () => {
  const ContextClass = createFakeAudioContextClass();
  const context = new ContextClass();
  const scheduled = [];
  const state = {
    context,
    dryGain: fakeNode('dry', []),
    reverbInput: fakeNode('reverb', []),
    waterNoiseBuffer: { id: 'water-noise' },
    waterfallVoices: new Map(),
  };

  getRainWaterVoice(state, 'rain:stale', { index: 0, x: 0, y: 0, z: 0, height: 2 }, {
    random: () => 0,
    isCurrent: () => false,
    setTimeoutFn: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
  });
  scheduled[0].callback();

  assert.equal(context.createdOscillators.length, 0);
});

test('stopping rain water voices clears timers, fades out, and stops source after fade', () => {
  const cleared = [];
  const scheduled = [];
  const ContextClass = createFakeAudioContextClass();
  const context = new ContextClass();
  const source = context.createBufferSource();
  const state = {
    context: { currentTime: 5 },
  };
  const voice = {
    timerId: 9,
    source,
    gain: fakeNode('rainGain', []),
  };

  stopRainWaterVoice(state, voice, {
    clearTimeoutFn: (timerId) => cleared.push(timerId),
    setTimeoutFn: (callback, delay) => {
      scheduled.push({ callback, delay });
    },
  });

  assert.deepEqual(cleared, [9]);
  assert.equal(voice.timerId, null);
  assert.deepEqual(voice.gain.gain.calls, [['target', 0, 5, 0.12]]);
  assert.equal(scheduled[0].delay, 220);

  scheduled[0].callback();
  assert.deepEqual(context.stoppedSources, [source]);
});

test('loads zombie grunt loop assets once and tracks failure state', async () => {
  const state = {
    audioBuffers: new Map(),
    zombieLoopLoading: false,
    zombieLoopFailed: false,
  };
  const calls = [];

  ensureZombieGruntLoop(state, {
    loadAudio: (runtimeState, url) => {
      calls.push([runtimeState, url]);
      return Promise.resolve({ id: 'grunt-loop' });
    },
  });
  ensureZombieGruntLoop(state, {
    loadAudio: () => {
      throw new Error('duplicate load should not run');
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], state);
  assert.equal(calls[0][1], './assets/audio/sfx/zombie-idle-grunt-8bit-loop.mp3?v=1');
  assert.equal(state.zombieLoopLoading, false);
  assert.equal(state.zombieLoopFailed, false);

  ensureZombieGruntLoop(state, {
    loadAudio: () => Promise.reject(new Error('bad zombie loop')),
    warn: () => {},
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(state.zombieLoopLoading, false);
  assert.equal(state.zombieLoopFailed, true);
});

test('creates spatial zombie grunt voices from cached loop buffers', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const state = {
    context,
    dryGain: fakeNode('dry', connections),
    reverbInput: fakeNode('reverb', connections),
    zombieVoices: new Map(),
  };
  const zombie = { id: 'z1', x: 1, y: 2, z: -3 };
  const buffer = { id: 'zombie-loop' };

  const voice = getZombieVoice(state, zombie, buffer);

  assert.equal(state.zombieVoices.get('z1'), voice);
  assert.equal(voice.source.buffer, buffer);
  assert.equal(voice.source.loop, true);
  assert.equal(context.startedSources[0], voice.source);
  assert.equal(voice.filter.type, 'lowpass');
  assert.equal(voice.filter.frequency.value, 4200);
  assert.equal(voice.filter.Q.value, 0.6);
  assert.equal(voice.gain.gain.value, 0);
  assert.equal(voice.panner.refDistance, 1);
  assert.equal(voice.panner.maxDistance, 22);
  assert.equal(voice.panner.rolloffFactor, 2.9);
  assert.deepEqual(voice.panner.positionX.calls, [['value', 1, 0]]);
  assert.deepEqual(voice.panner.positionY.calls, [['value', 2, 0]]);
  assert.deepEqual(voice.panner.positionZ.calls, [['value', -3, 0]]);
});

test('stopping zombie voices fades and stops sources after the fade', () => {
  const scheduled = [];
  const ContextClass = createFakeAudioContextClass();
  const context = new ContextClass();
  const first = { source: context.createBufferSource(), gain: fakeNode('firstGain', []) };
  const second = { source: context.createBufferSource(), gain: fakeNode('secondGain', []) };
  const state = {
    context: { currentTime: 6 },
    zombieVoices: new Map([
      ['first', first],
      ['second', second],
    ]),
  };
  const options = {
    setTimeoutFn: (callback, delay) => {
      scheduled.push({ callback, delay });
    },
  };

  stopZombieVoice(state, first, options);
  assert.deepEqual(first.gain.gain.calls, [['target', 0, 6, 0.08]]);
  assert.equal(scheduled[0].delay, 160);
  scheduled[0].callback();
  assert.deepEqual(context.stoppedSources, [first.source]);

  stopZombieVoices(state, options);
  assert.equal(state.zombieVoices.size, 0);
  assert.deepEqual(second.gain.gain.calls, [['target', 0, 6, 0.08]]);
});

test('creates special enemy loop voices with enemy-specific filters', () => {
  const connections = [];
  const ContextClass = createFakeAudioContextClass(connections);
  const context = new ContextClass();
  const state = {
    context,
    dryGain: fakeNode('dry', connections),
    reverbInput: fakeNode('reverb', connections),
    specialEnemyVoices: new Map(),
  };
  const profile = { openFilterHz: 1800 };
  const buffer = { id: 'alien-loop' };
  const alien = { id: 'alien-1', enemyType: 'one-eye-alien', x: 3, y: 1.5, z: -2 };

  const alienVoice = getSpecialEnemyVoice(state, alien, buffer, profile);

  assert.equal(state.specialEnemyVoices.get(alien.id), alienVoice);
  assert.equal(alienVoice.source.buffer, buffer);
  assert.equal(alienVoice.source.loop, true);
  assert.equal(alienVoice.filter.type, 'bandpass');
  assert.equal(alienVoice.filter.frequency.value, 1800);
  assert.equal(alienVoice.filter.Q.value, 5.5);
  assert.equal(alienVoice.panner.refDistance, 1.2);
  assert.equal(alienVoice.panner.maxDistance, 24);
  assert.equal(alienVoice.panner.rolloffFactor, 2.4);
  assert.deepEqual(alienVoice.panner.positionX.calls, [['value', 3, 0]]);
  assert.deepEqual(alienVoice.panner.positionY.calls, [['value', 1.5, 0]]);
  assert.deepEqual(alienVoice.panner.positionZ.calls, [['value', -2, 0]]);

  const sentinel = { id: 'sentinel-1', enemyType: 'molten-sentinel', x: -1, y: 2, z: 5 };
  const sentinelVoice = getSpecialEnemyVoice(state, sentinel, { id: 'sentinel-loop' }, { openFilterHz: 960 });

  assert.equal(sentinelVoice.filter.type, 'lowpass');
  assert.equal(sentinelVoice.filter.frequency.value, 960);
  assert.equal(sentinelVoice.filter.Q.value, 1.4);
  assert.equal(sentinelVoice.panner.rolloffFactor, 2.0);
});

test('stopping special enemy voices fades and stops sources after the fade', () => {
  const scheduled = [];
  const ContextClass = createFakeAudioContextClass();
  const context = new ContextClass();
  const voice = {
    source: context.createBufferSource(),
    gain: fakeNode('specialGain', []),
  };
  const state = { context: { currentTime: 7 } };

  stopSpecialEnemyVoice(state, voice, {
    setTimeoutFn: (callback, delay) => {
      scheduled.push({ callback, delay });
    },
  });

  assert.deepEqual(voice.gain.gain.calls, [['target', 0, 7, 0.08]]);
  assert.equal(scheduled[0].delay, 160);
  scheduled[0].callback();
  assert.deepEqual(context.stoppedSources, [voice.source]);
});

test('plays special enemy attack sounds with cooldown and enemy-specific rolloff', () => {
  const state = {
    enemyAttackTimes: new Map(),
  };
  const calls = [];
  const profile = {
    attackUrl: 'alien-attack.wav',
    attackGain: 0.28,
  };
  const enemy = { id: 'alien-1', enemyType: 'one-eye-alien', x: 2, y: 1, z: -3 };

  playEnemyAttackSound(state, enemy, profile, {
    now: 2000,
    playerY: 1.6,
    volumeScale: 0.72,
    isCurrent: () => true,
    playSpatial: (...args) => calls.push(args),
  });

  assert.equal(state.enemyAttackTimes.get(enemy.id), 2000);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [
    state,
    'alien-attack.wav',
    enemy,
    0.28 * 0.72,
    {
      refDistance: 1,
      maxDistance: 20,
      rolloffFactor: 2.2,
      fallbackY: 1.6,
      isCurrent: calls[0][4].isCurrent,
    },
  ]);
  assert.equal(calls[0][4].isCurrent(), true);

  playEnemyAttackSound(state, enemy, profile, {
    now: 3000,
    playerY: 1.6,
    playSpatial: (...args) => calls.push(args),
  });

  assert.equal(calls.length, 1);

  playEnemyAttackSound(
    state,
    { id: 'sentinel-1', enemyType: 'molten-sentinel', x: 0, y: 0, z: 0 },
    { attackUrl: 'sentinel.wav', attackGain: 0.42 },
    {
      now: 4000,
      playerY: 1.4,
      volumeScale: 1.18,
      playSpatial: (...args) => calls.push(args),
    },
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[1][1], 'sentinel.wav');
  assert.equal(calls[1][3], 0.42 * 1.18);
  assert.equal(calls[1][4].rolloffFactor, 1.6);
});

test('detects 2D collider occlusion for spatial audio paths', () => {
  const wall = { minX: -1, maxX: 1, minY: 0, maxY: 3, minZ: -0.5, maxZ: 0.5 };

  assert.equal(isAudioPathOccluded(
    { x: -3, y: 1, z: 0 },
    { x: 3, y: 1, z: 0 },
    [wall],
  ), true);

  assert.equal(isAudioPathOccluded(
    { x: -3, y: 4, z: 0 },
    { x: 3, y: 4, z: 0 },
    [wall],
  ), false);

  assert.equal(isAudioPathOccluded(
    { x: -3, y: 1, z: 2 },
    { x: 3, y: 1, z: 2 },
    [wall],
  ), false);

  assert.equal(isAudioPathOccluded(
    { x: 0, y: 1, z: 0 },
    { x: 3, y: 1, z: 0 },
    [wall],
  ), false);
});

test('creates deterministic crushed stereo reverb impulses', () => {
  const buffers = [];
  const context = {
    sampleRate: 10,
    createBuffer(channels, length, sampleRate) {
      const channelData = Array.from({ length: channels }, () => new Float32Array(length));
      const buffer = {
        channels,
        length,
        sampleRate,
        getChannelData(channel) {
          return channelData[channel];
        },
      };
      buffers.push(buffer);
      return buffer;
    },
  };

  const impulse = createReverbImpulse(context, { duration: 0.4, decay: 2 });

  assert.equal(impulse.channels, 2);
  assert.equal(impulse.length, 4);
  assert.equal(impulse.sampleRate, 10);
  assert.notDeepEqual(
    [...impulse.getChannelData(0)],
    [...impulse.getChannelData(1)],
  );
  assert.deepEqual(buffers, [impulse]);
});

test('applies scene reverb presets only when the active preset changes', () => {
  const targetCalls = [];
  const context = {
    sampleRate: 10,
    currentTime: 12,
    createBuffer(channels, length, sampleRate) {
      const channelData = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        channels,
        length,
        sampleRate,
        getChannelData(channel) {
          return channelData[channel];
        },
      };
    },
  };
  const state = {
    context,
    convolver: { buffer: null },
    reverbWetGain: {
      gain: {
        setTargetAtTime(value, time, smoothing) {
          targetCalls.push({ value, time, smoothing });
        },
      },
    },
    activeReverbId: null,
  };
  const presets = {
    room: { duration: 0.2, decay: 2, wet: 0.11 },
    fallback: { duration: 0.4, decay: 3, wet: 0.2 },
  };

  applySceneReverb(state, 'room', presets, 'fallback');
  const firstBuffer = state.convolver.buffer;
  applySceneReverb(state, 'room', presets, 'fallback');
  applySceneReverb(state, 'missing', presets, 'fallback');

  assert.notEqual(firstBuffer, null);
  assert.equal(state.convolver.buffer.length, 4);
  assert.equal(state.activeReverbId, 'missing');
  assert.deepEqual(targetCalls, [
    { value: 0.11, time: 12, smoothing: 0.8 },
    { value: 0.11, time: 12, smoothing: 0.8 },
    { value: 0.2, time: 12, smoothing: 0.8 },
  ]);
});

test('sets AudioParam values directly or with smoothing', () => {
  const calls = [];
  const param = {
    setTargetAtTime(value, time, smoothing) {
      calls.push(['target', value, time, smoothing]);
    },
    setValueAtTime(value, time) {
      calls.push(['value', value, time]);
    },
  };

  setAudioParam(param, 4, 12, 0);
  setAudioParam(param, 9, 13, 0.2);

  assert.deepEqual(calls, [
    ['value', 4, 12],
    ['target', 9, 13, 0.2],
  ]);
});

test('updates modern AudioListener position and orientation params', () => {
  const calls = [];
  const makeParam = (name) => ({
    setTargetAtTime(value, time, smoothing) {
      calls.push([name, value, time, smoothing]);
    },
  });
  const listener = {
    positionX: makeParam('positionX'),
    positionY: makeParam('positionY'),
    positionZ: makeParam('positionZ'),
    forwardX: makeParam('forwardX'),
    forwardY: makeParam('forwardY'),
    forwardZ: makeParam('forwardZ'),
    upX: makeParam('upX'),
    upY: makeParam('upY'),
    upZ: makeParam('upZ'),
  };

  updateAudioListener(listener, { x: 3, y: 1.5, z: -2, yaw: 0, pitch: 0 }, 8);

  assert.deepEqual(calls, [
    ['positionX', 3, 8, 0.05],
    ['positionY', 1.5, 8, 0.05],
    ['positionZ', -2, 8, 0.05],
    ['forwardX', 0, 8, 0.05],
    ['forwardY', 0, 8, 0.05],
    ['forwardZ', -1, 8, 0.05],
    ['upX', 0, 8, 0.05],
    ['upY', 1, 8, 0.05],
    ['upZ', 0, 8, 0.05],
  ]);
});

test('updates legacy AudioListener position and orientation methods', () => {
  const calls = [];
  const listener = {
    setPosition(x, y, z) {
      calls.push(['position', x, y, z]);
    },
    setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ) {
      calls.push(['orientation', forwardX, forwardY, forwardZ, upX, upY, upZ]);
    },
  };

  updateAudioListener(listener, { x: -1, y: 2, z: 4, yaw: 0, pitch: 0 }, 5);

  assert.deepEqual(calls, [
    ['position', -1, 2, 4],
    ['orientation', 0, 0, -1, 0, 1, 0],
  ]);
});
