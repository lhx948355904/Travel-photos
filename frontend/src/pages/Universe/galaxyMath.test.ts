import { describe, expect, it } from "vitest";
import {
  createGestureMemory,
  generateGalaxyParticles,
  getPhotoGalaxyPosition,
  interpretHandLandmarks,
  toUniverseMediaUrl,
} from "./galaxyMath";
import type { HandLandmark } from "./types";

const point = (x: number, y: number, z = 0): HandLandmark => ({ x, y, z });

const makeLandmarks = (pointing: boolean) => {
  const landmarks = Array.from({ length: 21 }, () => point(0.5, 0.58));
  landmarks[0] = point(0.5, 0.82);
  landmarks[5] = point(0.36, 0.58);
  landmarks[9] = point(0.5, 0.52);
  landmarks[17] = point(0.64, 0.58);
  landmarks[6] = point(0.4, 0.5);
  landmarks[8] = point(0.35, pointing ? 0.2 : 0.55, -0.12);
  [10, 14, 18].forEach((index) => {
    landmarks[index] = point(0.5 + (index - 14) * 0.02, 0.5);
  });
  [12, 16, 20].forEach((index) => {
    landmarks[index] = point(0.5 + (index - 16) * 0.02, pointing ? 0.62 : 0.2);
  });
  return landmarks;
};

const makeTwoFingerLandmarks = () => {
  const landmarks = makeLandmarks(true);
  landmarks[10] = point(0.52, 0.5);
  landmarks[12] = point(0.58, 0.18, -0.1);
  return landmarks;
};

const makeFistLandmarks = (palmY = 0.52) => {
  const landmarks = makeLandmarks(true);
  landmarks[9] = point(0.5, palmY);
  [8, 12, 16, 20].forEach((index, finger) => {
    landmarks[index] = point(0.42 + finger * 0.055, 0.65);
  });
  return landmarks;
};

describe("galaxy generation", () => {
  it("is deterministic for a fixed seed", () => {
    const first = generateGalaxyParticles(12, 42);
    const second = generateGalaxyParticles(12, 42);
    expect(Array.from(first.positions)).toEqual(Array.from(second.positions));
  });

  it("rewrites only the configured COS host to the same-origin proxy", () => {
    expect(
      toUniverseMediaUrl(
        "https://travel-1255378306.cos.ap-guangzhou.myqcloud.com/users/1/photo.jpg?imageMogr2/thumbnail/600x",
      ),
    ).toBe("/cos-media/users/1/photo.jpg?imageMogr2/thumbnail/600x");
    expect(toUniverseMediaUrl("/uploads/photo.jpg")).toBe("/uploads/photo.jpg");
    expect(toUniverseMediaUrl("https://example.com/photo.jpg")).toBe(
      "https://example.com/photo.jpg",
    );
  });

  it("keeps photo positions stable by location id", () => {
    expect(getPhotoGalaxyPosition(17)).toEqual(getPhotoGalaxyPosition(17));
    expect(getPhotoGalaxyPosition(17)).not.toEqual(getPhotoGalaxyPosition(18));
  });
});

describe("gesture interpretation", () => {
  it("gives the pointing gesture priority over palm openness", () => {
    const gesture = interpretHandLandmarks(
      makeLandmarks(true),
      0.92,
      100,
      createGestureMemory(),
    );
    expect(gesture.mode).toBe("point");
    expect(gesture.rotationDelta).toBeGreaterThan(0);
    expect(gesture.zoomDelta).toBe(0);
  });

  it("maps a two-finger direction to particle flight", () => {
    const gesture = interpretHandLandmarks(
      makeTwoFingerLandmarks(),
      0.94,
      100,
      createGestureMemory(),
    );
    expect(gesture.mode).toBe("two-finger");
    expect(gesture.flightStrength).toBeGreaterThan(0);
    expect(Math.hypot(gesture.flightX, gesture.flightY)).toBeGreaterThan(0);
  });

  it("uses fist depth to zoom in and out", () => {
    const memory = createGestureMemory();
    const first = interpretHandLandmarks(makeFistLandmarks(0.52), 0.9, 100, memory);
    const nearer = interpretHandLandmarks(makeFistLandmarks(0.42), 0.9, 140, memory);
    expect(first.mode).toBe("fist");
    expect(nearer.mode).toBe("fist");
    expect(nearer.zoomDelta).toBeGreaterThan(0);
  });

  it("clamps output values and falls back when landmarks are absent", () => {
    const memory = createGestureMemory();
    const palm = interpretHandLandmarks(makeLandmarks(false), 2, 100, memory);
    expect(palm.mode).toBe("palm");
    expect(palm.openness).toBeGreaterThanOrEqual(0);
    expect(palm.openness).toBeLessThanOrEqual(1);
    expect(palm.confidence).toBe(1);

    const idle = interpretHandLandmarks([], 0, 200, memory);
    expect(idle.tracking).toBe(false);
    expect(idle.mode).toBe("idle");
  });
});
