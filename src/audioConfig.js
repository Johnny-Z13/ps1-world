export const ZOMBIE_GRUNT_LOOP_URL = './assets/audio/sfx/zombie-idle-grunt-8bit-loop.mp3?v=1';
export const LIGHTNING_SOUND_URL = './assets/audio/sfx/lightning-bolt-strike.mp3?v=1';
export const MENU_START_CONFIRM_SOUND_URL = './assets/audio/sfx/menu-start-confirm-8bit.mp3?v=1';
export const TITLE_MUSIC_LOOP_URL = './assets/audio/music/title-menu-psx-8bit-loop.mp3?v=2';
export const FREE_ROAM_MUSIC_LOOP_URL = './assets/audio/music/free-roam-dread-8bit-loop.mp3?v=1';
export const CUT_UP_MUSIC_LOOP_URL = './assets/audio/music/cut-up-clockwork-8bit-loop.mp3?v=1';
export const FREE_ROAM_START_SOUND_URL = './assets/audio/sfx/free-roam-start-warp-8bit.mp3?v=1';
export const CUT_UP_START_SOUND_URL = './assets/audio/sfx/cut-up-start-burst-8bit.mp3?v=1';
export const CUT_UP_SCENE_SLICE_SOUND_URL = './assets/audio/sfx/cut-up-scene-slice-8bit.mp3?v=1';
export const CUT_UP_COUNTDOWN_TICK_SOUND_URL = './assets/audio/sfx/cut-up-countdown-tick-8bit.mp3?v=1';
export const ROGUE_WIN_SOUND_URL = './assets/audio/sfx/rogue-win-confetti.wav?v=1';
export const OPTIONS_OPEN_SOUND_URL = './assets/audio/sfx/options-open-static-8bit.mp3?v=1';
export const OPTIONS_CLOSE_SOUND_URL = './assets/audio/sfx/options-close-click-8bit.mp3?v=1';
export const HEALTH_PICKUP_SOUND_URL = './assets/audio/sfx/health-pickup-bing-8bit.mp3?v=1';
export const PLAYER_DEATH_SOUND_URL = './assets/audio/sfx/player-death-8bit.mp3?v=1';
export const PLAYER_DAMAGE_SOUND_URL = './assets/audio/sfx/player-damage-grunt-8bit.mp3?v=1';
export const PLAYER_JUMP_SOUND_URL = './assets/audio/sfx/player-jump-8bit.wav?v=1';
export const PLAYER_LAND_SOUND_URL = './assets/audio/sfx/player-land-thud-8bit.wav?v=1';
export const PLAYER_WALK_FOOTSTEP_LOOP_URL = './assets/audio/sfx/player-footsteps-walk-8bit-loop.mp3?v=1';
export const PLAYER_SPRINT_FOOTSTEP_LOOP_URL = './assets/audio/sfx/player-footsteps-sprint-8bit-loop.mp3?v=1';
export const PLAYER_LOW_HEALTH_BREATHING_LOOP_URL = './assets/audio/sfx/player-low-health-breathing-8bit-loop.mp3?v=1';
export const UI_HOVER_SOUND_URL = './assets/audio/sfx/ui-hover-blip-8bit.wav?v=1';
export const UI_TOGGLE_SOUND_URL = './assets/audio/sfx/ui-toggle-tick-8bit.wav?v=1';
export const UI_SELECT_SOUND_URL = './assets/audio/sfx/ui-select-change-8bit.wav?v=1';
export const RAIN_SPOT_DRIP_SOUND_URL = './assets/audio/sfx/rain-spot-drip-8bit.wav?v=1';
export const WORLD_RARE_STINGER_SOUND_URL = './assets/audio/sfx/world-rare-stinger-8bit.wav?v=1';
export const ENEMY_AUDIO_PROFILES = Object.freeze({
  zombie: Object.freeze({
    loopUrl: ZOMBIE_GRUNT_LOOP_URL,
    attackUrl: './assets/audio/sfx/enemy-zombie-attack-bite-8bit.wav?v=1',
    attackGain: 0.36,
    maxLoopGain: 0.085,
    openFilterHz: 4200,
    occludedFilterHz: 760,
  }),
  'one-eye-alien': Object.freeze({
    loopUrl: './assets/audio/sfx/enemy-alien-idle-warble-8bit-loop.wav?v=1',
    attackUrl: './assets/audio/sfx/enemy-alien-attack-shriek-8bit.wav?v=1',
    attackGain: 0.28,
    maxLoopGain: 0.058,
    openFilterHz: 1850,
    occludedFilterHz: 720,
  }),
  'molten-sentinel': Object.freeze({
    loopUrl: './assets/audio/sfx/enemy-sentinel-idle-furnace-8bit-loop.wav?v=1',
    attackUrl: './assets/audio/sfx/enemy-sentinel-attack-impact-8bit.wav?v=1',
    attackGain: 0.42,
    maxLoopGain: 0.085,
    openFilterHz: 760,
    occludedFilterHz: 360,
  }),
});
export const SCENE_AMBIENCE_URLS = Object.freeze({
  dungeon: './assets/audio/ambience/dungeon-8bit-loop.mp3?v=1',
  'alien-landscape': './assets/audio/ambience/alien-landscape-8bit-loop.mp3?v=1',
  'derelict-starship': './assets/audio/ambience/derelict-starship-8bit-loop.mp3?v=1',
  'neon-backstreets': './assets/audio/ambience/neon-backstreets-8bit-loop.mp3?v=1',
  'sunken-temple': './assets/audio/ambience/sunken-temple-8bit-loop.mp3?v=1',
  'one-bit-cathedral': './assets/audio/ambience/one-bit-cathedral-8bit-loop.mp3?v=1',
  'rotwood-forest': './assets/audio/ambience/rotwood-forest-storm-wind-leaves-loop.wav?v=1',
  'astral-geometry-garden': './assets/audio/ambience/astral-geometry-garden-8bit-loop.mp3?v=1',
  'motel-mirage': './assets/audio/ambience/motel-mirage-8bit-loop.mp3?v=1',
});
export const SCENE_AMBIENCE_MAX_GAIN = 0.16;
export const LIGHTNING_SOUND_GAIN = 0.55;
export const MENU_START_CONFIRM_SOUND_GAIN = 0.5;
export const TITLE_MUSIC_GAIN = 0.22;
export const FREE_ROAM_MUSIC_GAIN = 0.12;
export const CUT_UP_MUSIC_GAIN = 0.18;
export const UI_SFX_GAIN = 0.58;
export const TRANSITION_SFX_GAIN = 0.72;
export const CUT_UP_AUDIO_DUCK_DURATION_MS = 420;
export const HEALTH_PICKUP_SOUND_GAIN = 0.46;
export const PLAYER_DEATH_SOUND_GAIN = 0.72;
export const PLAYER_DAMAGE_SOUND_GAIN = 0.5;
export const PLAYER_JUMP_SOUND_GAIN = 0.22;
export const PLAYER_LAND_SOUND_GAIN = 0.24;
export const PLAYER_WALK_FOOTSTEP_GAIN = 0.13;
export const PLAYER_SPRINT_FOOTSTEP_GAIN = 0.19;
export const PLAYER_LOW_HEALTH_BREATHING_GAIN = 0.24;
export const DAMAGE_SCRATCH_MAX_OFFSET = 0.055;
export const DAMAGE_SCRATCH_MAX_ROTATION = 0.18;
export const LOW_HEALTH_NOTICE_DURATION_MS = 2200;
export const ZOMBIE_BITE_COOLDOWN_MS = 1150;
export const DAMAGE_ZONE_SOUND_INTERVAL_MS = 760;
export const PLAYER_HEARTBEAT_BASE_INTERVAL_MS = 1320;
export const PLAYER_HEARTBEAT_DANGER_INTERVAL_MS = 560;
export const PLAYER_HEARTBEAT_BASE_GAIN = 0.018;
export const PLAYER_HEARTBEAT_DANGER_GAIN = 0.07;
export const PLAYER_HEARTBEAT_DANGER_DISTANCE = 9;
export const TORCH_CRACKLE_MAX_DISTANCE = 16;
export const TORCH_CRACKLE_REF_DISTANCE = 1.2;
export const TORCH_CRACKLE_GAIN = 0.045;
export const RAIN_WATER_MAX_DISTANCE = 34;
export const RAIN_WATER_REF_DISTANCE = 3.4;
export const RAIN_WATER_BED_GAIN = 0.038;
export const RAIN_DRIP_GAIN = 0.075;
export const ZOMBIE_GRUNT_FULL_VOLUME_DISTANCE = 1.0;
export const ZOMBIE_GRUNT_MAX_DISTANCE = 22;
export const ZOMBIE_GRUNT_MAX_GAIN = 0.085;
export const ZOMBIE_GRUNT_OCCLUDED_GAIN_MULTIPLIER = 0.32;
export const ZOMBIE_GRUNT_OPEN_FILTER_HZ = 4200;
export const ZOMBIE_GRUNT_OCCLUDED_FILTER_HZ = 760;
export const SPECIAL_ENEMY_LOOP_FULL_VOLUME_DISTANCE = 1.2;
export const SPECIAL_ENEMY_LOOP_MAX_DISTANCE = 24;
export const SPECIAL_ENEMY_ATTACK_COOLDOWN_MS = 1450;
export const SCENE_REVERB_PRESETS = Object.freeze({
  'tight-room': Object.freeze({ duration: 0.42, decay: 2.8, wet: 0.11 }),
  'open-air': Object.freeze({ duration: 0.28, decay: 4.6, wet: 0.045 }),
  'metal-hall': Object.freeze({ duration: 0.68, decay: 2.2, wet: 0.16 }),
  'stone-vault': Object.freeze({ duration: 0.86, decay: 2.5, wet: 0.19 }),
  'dream-space': Object.freeze({ duration: 1.1, decay: 1.9, wet: 0.22 }),
});
