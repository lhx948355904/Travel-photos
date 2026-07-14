import type { GestureState, HandLandmark } from "./types";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const COS_MEDIA_HOST = "travel-1255378306.cos.ap-guangzhou.myqcloud.com";

export const toUniverseMediaUrl = (source?: string) => {
  if (!source) return "";
  try {
    const baseOrigin =
      typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const url = new URL(source, baseOrigin);
    if (url.hostname === COS_MEDIA_HOST) {
      return `/cos-media${url.pathname}${url.search}`;
    }
  } catch {
    return source;
  }
  return source;
};

export const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const gaussian = (random: () => number) => {
  const a = Math.max(random(), 1e-7);
  const b = random();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
};

export interface GalaxyParticles {
  positions: Float32Array;
  scatter: Float32Array;
  sizes: Float32Array;
  tint: Float32Array;
  core: Float32Array;
}

export const generateGalaxyParticles = (
  count: number,
  seed = 20260711,
): GalaxyParticles => {
  const random = createSeededRandom(seed);
  const positions = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const tint = new Float32Array(count);
  const core = new Float32Array(count);
  const arms = 5;

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    const isCore = random() < 0.18;
    const radius = isCore
      ? Math.pow(random(), 2.15) * 3.6
      : 1.25 + Math.pow(random(), 1.18) * 10.6;
    const arm = index % arms;
    const angle = (arm / arms) * Math.PI * 2 + radius * 0.54;
    const armNoise = gaussian(random) * (isCore ? 0.42 : 0.08 + radius * 0.032);
    const verticalNoise = gaussian(random) *
      (isCore ? 0.16 + (1 - radius / 3.6) * 0.58 : 0.025 + radius * 0.016);

    positions[offset] = Math.cos(angle) * radius + Math.cos(angle + 1.57) * armNoise;
    positions[offset + 1] = verticalNoise;
    positions[offset + 2] = Math.sin(angle) * radius + Math.sin(angle + 1.57) * armNoise;

    scatter[offset] = gaussian(random) * (0.14 + radius * 0.055);
    scatter[offset + 1] = gaussian(random) * (0.08 + radius * 0.03);
    scatter[offset + 2] = gaussian(random) * (0.14 + radius * 0.055);
    sizes[index] = (isCore ? 0.78 : 0.58) + Math.pow(random(), 4) * (isCore ? 2.8 : 2.25);
    tint[index] = random();
    core[index] = isCore ? clamp(1 - radius / 3.8) : 0;
  }

  return { positions, scatter, sizes, tint, core };
};

export const getPhotoGalaxyPosition = (id: number) => {
  const random = createSeededRandom(id * 2654435761);
  const radius = 2.3 + Math.pow(random(), 0.82) * 8.2;
  const arm = id % 5;
  const angle = (arm / 5) * Math.PI * 2 + radius * 0.55 + (random() - 0.5) * 0.32;
  return {
    x: Math.cos(angle) * radius,
    y: (random() - 0.5) * (0.4 + radius * 0.05),
    z: Math.sin(angle) * radius,
  };
};

const distance = (a: HandLandmark, b: HandLandmark) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const applyDeadZone = (value: number, deadZone: number) => {
  const magnitude = Math.abs(value);
  if (magnitude <= deadZone) return 0;
  return Math.sign(value) * ((magnitude - deadZone) / (1 - deadZone));
};

export interface GestureMemory {
  palmSize: number | null;
  fistAnchor: number | null;
  openness: number;
  rotationDelta: number;
  zoomDelta: number;
  flightX: number;
  flightY: number;
  flightStrength: number;
}

export const createGestureMemory = (): GestureMemory => ({
  palmSize: null,
  fistAnchor: null,
  openness: 0.5,
  rotationDelta: 0,
  zoomDelta: 0,
  flightX: 0,
  flightY: 0,
  flightStrength: 0,
});

export const interpretHandLandmarks = (
  landmarks: HandLandmark[],
  confidence: number,
  timestamp: number,
  memory: GestureMemory,
): GestureState => {
  if (landmarks.length < 21) {
    return {
      mode: "idle",
      openness: memory.openness,
      rotationDelta: 0,
      zoomDelta: 0,
      flightX: 0,
      flightY: 0,
      flightStrength: 0,
      confidence: 0,
      tracking: false,
      landmarks: [],
      timestamp,
    };
  }

  const wrist = landmarks[0];
  const palmWidth = Math.max(distance(landmarks[5], landmarks[17]), 0.025);
  const tipIndices = [8, 12, 16, 20];
  const pipIndices = [6, 10, 14, 18];
  const opennessRaw =
    tipIndices.reduce((sum, index) => sum + distance(wrist, landmarks[index]), 0) /
    tipIndices.length /
    palmWidth;
  const opennessTarget = clamp((opennessRaw - 1.25) / 1.35);

  const extended = tipIndices.map(
    (tip, index) =>
      distance(wrist, landmarks[tip]) >
      distance(wrist, landmarks[pipIndices[index]]) * 1.18,
  );
  const isPointing = extended[0] && !extended[1] && !extended[2] && !extended[3];
  const isTwoFinger = extended[0] && extended[1] && !extended[2] && !extended[3];
  const isFist = !extended.some(Boolean) && opennessTarget < 0.32;
  const palmSize = distance(wrist, landmarks[9]);
  const rotationTarget = isPointing
    ? applyDeadZone(clamp((0.5 - landmarks[8].x) * 2, -1, 1), 0.12)
    : 0;
  if (isFist && memory.fistAnchor === null) memory.fistAnchor = palmSize;
  if (!isFist) memory.fistAnchor = null;
  const zoomTarget = isFist && memory.fistAnchor
    ? applyDeadZone(clamp((palmSize / memory.fistAnchor - 1) / 0.32, -1, 1), 0.08)
    : 0;

  const twoFingerX = (landmarks[8].x + landmarks[12].x) * 0.5;
  const twoFingerY = (landmarks[8].y + landmarks[12].y) * 0.5;
  const palmCenterX = (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5;
  const palmCenterY = (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5;
  const rawFlightX = clamp((palmCenterX - twoFingerX) * 3.2, -1, 1);
  const rawFlightY = clamp((palmCenterY - twoFingerY) * 3.2, -1, 1);
  const flightMagnitude = Math.hypot(rawFlightX, rawFlightY);
  const flightTargetStrength = isTwoFinger ? clamp((flightMagnitude - 0.12) / 0.72) : 0;
  const flightTargetX = isTwoFinger && flightMagnitude > 0.001 ? rawFlightX / flightMagnitude : 0;
  const flightTargetY = isTwoFinger && flightMagnitude > 0.001 ? rawFlightY / flightMagnitude : 0;
  const smoothing = 0.22;

  memory.palmSize = palmSize;
  memory.openness += (opennessTarget - memory.openness) * smoothing;
  memory.rotationDelta += (rotationTarget - memory.rotationDelta) * smoothing;
  memory.zoomDelta += (zoomTarget - memory.zoomDelta) * smoothing;
  memory.flightX += (flightTargetX - memory.flightX) * 0.3;
  memory.flightY += (flightTargetY - memory.flightY) * 0.3;
  memory.flightStrength += (flightTargetStrength - memory.flightStrength) * 0.25;

  const mode = isTwoFinger
    ? "two-finger"
    : isPointing
      ? "point"
      : isFist
        ? "fist"
        : "palm";

  return {
    mode,
    openness: clamp(memory.openness),
    rotationDelta: clamp(memory.rotationDelta, -1, 1),
    zoomDelta: clamp(memory.zoomDelta, -1, 1),
    flightX: clamp(memory.flightX, -1, 1),
    flightY: clamp(memory.flightY, -1, 1),
    flightStrength: clamp(memory.flightStrength),
    confidence: clamp(confidence),
    tracking: true,
    landmarks,
    timestamp,
  };
};
