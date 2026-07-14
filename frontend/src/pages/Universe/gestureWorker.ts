/// <reference lib="webworker" />

import {
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import wasmLoaderPath from "../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_module_internal.js?url";
import wasmBinaryPath from "../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_module_internal.wasm?url";
import { createGestureMemory, interpretHandLandmarks } from "./galaxyMath";
import type { HandLandmark } from "./types";

let landmarker: HandLandmarker | null = null;
const memory = createGestureMemory();

const initialize = async () => {
  const files = { wasmLoaderPath, wasmBinaryPath };
  const options = {
    runningMode: "VIDEO" as const,
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };
  try {
    landmarker = await HandLandmarker.createFromOptions(files, {
      ...options,
      baseOptions: {
        modelAssetPath: "/vendor/mediapipe/hand_landmarker.task",
        delegate: "GPU",
      },
    });
  } catch {
    landmarker = await HandLandmarker.createFromOptions(files, {
      ...options,
      baseOptions: { modelAssetPath: "/vendor/mediapipe/hand_landmarker.task" },
    });
  }
  self.postMessage({ type: "ready" });
};

const confidenceFrom = (result: HandLandmarkerResult) =>
  result.handedness[0]?.[0]?.score ?? 0;

self.onmessage = async (
  event: MessageEvent<
    | { type: "init" }
    | { type: "frame"; bitmap: ImageBitmap; timestamp: number }
    | { type: "dispose" }
  >,
) => {
  try {
    if (event.data.type === "init") {
      await initialize();
      return;
    }

    if (event.data.type === "dispose") {
      landmarker?.close();
      landmarker = null;
      return;
    }

    const { bitmap, timestamp } = event.data;
    if (!landmarker) {
      bitmap.close();
      self.postMessage({ type: "result", gesture: interpretHandLandmarks([], 0, timestamp, memory) });
      return;
    }

    const result = landmarker.detectForVideo(bitmap, timestamp);
    bitmap.close();
    const landmarks = (result.landmarks[0] ?? []) as HandLandmark[];
    self.postMessage({
      type: "result",
      gesture: interpretHandLandmarks(
        landmarks,
        confidenceFrom(result),
        timestamp,
        memory,
      ),
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "手势识别失败",
    });
  }
};

export {};
