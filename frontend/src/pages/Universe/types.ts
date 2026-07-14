export type GestureMode = "idle" | "palm" | "point" | "fist" | "two-finger";

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureState {
  mode: GestureMode;
  openness: number;
  rotationDelta: number;
  zoomDelta: number;
  flightX: number;
  flightY: number;
  flightStrength: number;
  confidence: number;
  tracking: boolean;
  landmarks: HandLandmark[];
  timestamp: number;
}

export const IDLE_GESTURE: GestureState = {
  mode: "idle",
  openness: 0.5,
  rotationDelta: 0,
  zoomDelta: 0,
  flightX: 0,
  flightY: 0,
  flightStrength: 0,
  confidence: 0,
  tracking: false,
  landmarks: [],
  timestamp: 0,
};

export type CameraStatus =
  | "idle"
  | "requesting"
  | "loading-model"
  | "active"
  | "denied"
  | "unsupported"
  | "error";
