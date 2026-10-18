/**
 * Reversed from gta_sa.exe v1.0 US
 * - CTimeCycle::Initialise       @ 0x5BBAC0
 * - CTimeCycle::Update           @ 0x561760
 * - CTimeCycle::CalcColoursForPoint @ 0x55FEC0
 * - m_nAmbientRed                @ 0xB7C3C8
 * - m_nSkyTopRed                 @ 0xB7BF78
 * - m_nSkyBottomRed              @ 0xB7BD50
 * - m_nSunCoreRed                @ 0xB7BB28
 * - m_nSunCoronaRed              @ 0xB7B900
 * - m_fPostFx1Red                @ 0xB7A7C0
 * - CPostEffects::Radiosity      @ 0x702080
 */

export type WeatherPresetId =
  | 'EXTRASUNNY_LA'
  | 'SUNNY_LA'
  | 'SMOG_LA'
  | 'OVERCAST_LA'
  | 'RAINY_LA'
  | 'ORANGE_SUNSET_21'
  | 'SANDSTORM_DESERT';

export type GraphicsModeId = 'ps2_2004' | 'pc_1_0' | 'remastered_next';

export interface GraphicsTuningConfig {
  mode: GraphicsModeId;
  pbrClearcoatIntensity: number;      // 0.0 to 1.5
  roadWetnessReflections: number;     // 0.0 to 1.0
  ps2RadiosityWarmth: number;         // 0.0 to 1.0
  shadowResolution: 1024 | 2048 | 4096;
  bloomIntensity: number;             // 0.0 to 1.2
  drawDistanceMultiplier: number;     // 1.0 to 4.0
  ambientOcclusionIntensity: number;  // 0.0 to 1.0
  trafficDensity: number;             // 0.2 to 2.0
  fovDegrees: number;                 // 55 to 90
  timeScale: number;                  // 0 (paused) to 60
}

export const DEFAULT_GRAPHICS_TUNING: GraphicsTuningConfig = {
  mode: 'remastered_next',
  pbrClearcoatIntensity: 1.0,
  roadWetnessReflections: 0.35,
  ps2RadiosityWarmth: 0.42,
  shadowResolution: 2048,
  bloomIntensity: 0.65,
  drawDistanceMultiplier: 2.5,
  ambientOcclusionIntensity: 0.75,
  trafficDensity: 1.0,
  fovDegrees: 66,
  timeScale: 1.0,
};

export interface TimeCycleSample {
  hour: number; // 0, 5, 6, 7, 12, 19, 20, 22 (eTimeType in TimeCycle.h)
  skyTop: [number, number, number];
  skyBottom: [number, number, number];
  sunCore: [number, number, number];
  sunCorona: [number, number, number];
  ambient: [number, number, number];
  directional: [number, number, number];
  postFx1: [number, number, number, number];
  water: [number, number, number, number];
  farClip: number;
  fogStart: number;
  sunIntensity: number;
}

/**
 * Authentic GTA San Andreas Los Santos timecyc.dat 8-period color keyframe table
 */
export const LOS_SANTOS_TIMECYC_KEYFRAMES: TimeCycleSample[] = [
  {
    hour: 0, // TIME_MIDNIGHT
    skyTop: [8, 12, 28],
    skyBottom: [18, 24, 46],
    sunCore: [140, 160, 210],
    sunCorona: [90, 110, 160],
    ambient: [28, 32, 48],
    directional: [45, 52, 76],
    postFx1: [16, 20, 38, 60],
    water: [14, 28, 48, 210],
    farClip: 420,
    fogStart: 85,
    sunIntensity: 0.25,
  },
  {
    hour: 5, // TIME_5AM
    skyTop: [34, 42, 78],
    skyBottom: [145, 92, 72],
    sunCore: [255, 165, 105],
    sunCorona: [245, 130, 80],
    ambient: [68, 58, 72],
    directional: [140, 102, 88],
    postFx1: [120, 75, 55, 80],
    water: [32, 54, 78, 215],
    farClip: 480,
    fogStart: 95,
    sunIntensity: 0.65,
  },
  {
    hour: 6, // TIME_6AM (Golden Los Santos Dawn)
    skyTop: [62, 95, 148],
    skyBottom: [232, 148, 92],
    sunCore: [255, 205, 135],
    sunCorona: [255, 165, 95],
    ambient: [110, 92, 82],
    directional: [215, 165, 120],
    postFx1: [185, 118, 64, 95],
    water: [46, 82, 112, 220],
    farClip: 540,
    fogStart: 110,
    sunIntensity: 1.05,
  },
  {
    hour: 7, // TIME_7AM
    skyTop: [74, 125, 195],
    skyBottom: [215, 178, 135],
    sunCore: [255, 232, 180],
    sunCorona: [255, 200, 130],
    ambient: [135, 122, 108],
    directional: [235, 205, 165],
    postFx1: [165, 130, 82, 75],
    water: [42, 98, 136, 220],
    farClip: 620,
    fogStart: 140,
    sunIntensity: 1.25,
  },
  {
    hour: 12, // TIME_MIDDAY (Los Santos Warm Smog Noon)
    skyTop: [56, 118, 208],
    skyBottom: [178, 196, 215],
    sunCore: [255, 250, 225],
    sunCorona: [255, 235, 185],
    ambient: [152, 146, 136],
    directional: [255, 242, 215],
    postFx1: [148, 124, 78, 64],
    water: [34, 112, 156, 215],
    farClip: 720,
    fogStart: 165,
    sunIntensity: 1.55,
  },
  {
    hour: 19, // TIME_7PM (Iconic Los Santos Amber Sunset)
    skyTop: [68, 72, 128],
    skyBottom: [248, 126, 54],
    sunCore: [255, 178, 84],
    sunCorona: [255, 118, 42],
    ambient: [138, 88, 68],
    directional: [245, 142, 78],
    postFx1: [235, 112, 42, 115],
    water: [58, 74, 98, 225],
    farClip: 560,
    fogStart: 100,
    sunIntensity: 1.30,
  },
  {
    hour: 20, // TIME_8PM (Dusk / OFVIAC Orange Sky)
    skyTop: [36, 38, 78],
    skyBottom: [212, 88, 42],
    sunCore: [255, 130, 55],
    sunCorona: [230, 85, 35],
    ambient: [86, 56, 58],
    directional: [175, 92, 62],
    postFx1: [195, 78, 32, 105],
    water: [32, 48, 74, 220],
    farClip: 480,
    fogStart: 90,
    sunIntensity: 0.80,
  },
  {
    hour: 22, // TIME_10PM
    skyTop: [14, 18, 38],
    skyBottom: [32, 36, 62],
    sunCore: [150, 170, 215],
    sunCorona: [95, 115, 165],
    ambient: [36, 40, 58],
    directional: [58, 65, 92],
    postFx1: [24, 28, 48, 65],
    water: [18, 34, 58, 215],
    farClip: 440,
    fogStart: 88,
    sunIntensity: 0.32,
  },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

/**
 * Replicates CTimeCycle::CalcColoursForPoint (0x55FEC0)
 * Interpolates smoothly across the 8 time-of-day periods and weather modifier.
 */
export function interpolateTimeCycle(
  currentHourFloat: number,
  weather: WeatherPresetId,
  tuning: GraphicsTuningConfig
): TimeCycleSample {
  const h = ((currentHourFloat % 24) + 24) % 24;
  const frames = LOS_SANTOS_TIMECYC_KEYFRAMES;

  let prevIdx = frames.length - 1;
  let nextIdx = 0;

  for (let i = 0; i < frames.length; i++) {
    if (h >= frames[i].hour) {
      prevIdx = i;
      nextIdx = (i + 1) % frames.length;
    }
  }

  const prev = frames[prevIdx];
  const next = frames[nextIdx];
  const span =
    next.hour > prev.hour
      ? next.hour - prev.hour
      : 24 - prev.hour + next.hour;
  const elapsed =
    h >= prev.hour ? h - prev.hour : 24 - prev.hour + h;
  const t = span > 0 ? Math.min(1, Math.max(0, elapsed / span)) : 0;

  let skyTop = lerpVec3(prev.skyTop, next.skyTop, t);
  let skyBottom = lerpVec3(prev.skyBottom, next.skyBottom, t);
  let sunCore = lerpVec3(prev.sunCore, next.sunCore, t);
  let sunCorona = lerpVec3(prev.sunCorona, next.sunCorona, t);
  let ambient = lerpVec3(prev.ambient, next.ambient, t);
  let directional = lerpVec3(prev.directional, next.directional, t);
  let farClip = lerp(prev.farClip, next.farClip, t) * tuning.drawDistanceMultiplier;
  let fogStart = lerp(prev.fogStart, next.fogStart, t) * tuning.drawDistanceMultiplier;
  let sunIntensity = lerp(prev.sunIntensity, next.sunIntensity, t);

  // Apply weather overrides
  if (weather === 'ORANGE_SUNSET_21') {
    skyTop = [58, 42, 88];
    skyBottom = [252, 108, 32];
    sunCore = [255, 165, 60];
    sunCorona = [255, 95, 25];
    ambient = [148, 82, 52];
    directional = [250, 128, 58];
    sunIntensity = 1.35;
  } else if (weather === 'RAINY_LA') {
    skyTop = [38, 46, 58];
    skyBottom = [68, 78, 92];
    ambient = [64, 72, 84];
    directional = [85, 95, 110];
    farClip *= 0.55;
    fogStart *= 0.45;
    sunIntensity *= 0.4;
  } else if (weather === 'SANDSTORM_DESERT') {
    skyTop = [168, 118, 68];
    skyBottom = [212, 152, 88];
    ambient = [165, 122, 78];
    directional = [195, 145, 92];
    farClip *= 0.38;
    fogStart *= 0.25;
  }

  // Apply PS2 2004 Amber Radiosity vs PC 1.0 vs Remastered Next-Gen
  const warmth =
    tuning.mode === 'ps2_2004'
      ? 0.85
      : tuning.mode === 'pc_1_0'
      ? 0.08
      : tuning.ps2RadiosityWarmth;

  skyBottom = [
    Math.min(255, Math.round(skyBottom[0] + warmth * 26)),
    Math.min(255, Math.round(skyBottom[1] + warmth * 8)),
    Math.max(0, Math.round(skyBottom[2] - warmth * 14)),
  ];

  return {
    hour: h,
    skyTop,
    skyBottom,
    sunCore,
    sunCorona,
    ambient,
    directional,
    postFx1: [
      Math.round(lerp(prev.postFx1[0], next.postFx1[0], t)),
      Math.round(lerp(prev.postFx1[1], next.postFx1[1], t)),
      Math.round(lerp(prev.postFx1[2], next.postFx1[2], t)),
      Math.round(lerp(prev.postFx1[3], next.postFx1[3], t)),
    ],
    water: [
      Math.round(lerp(prev.water[0], next.water[0], t)),
      Math.round(lerp(prev.water[1], next.water[1], t)),
      Math.round(lerp(prev.water[2], next.water[2], t)),
      Math.round(lerp(prev.water[3], next.water[3], t)),
    ],
    farClip,
    fogStart,
    sunIntensity,
  };
}
