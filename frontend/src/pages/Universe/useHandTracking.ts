import { useCallback, useEffect, useRef, useState } from "react";
import { IDLE_GESTURE, type CameraStatus, type GestureState } from "./types";

const FRAME_INTERVAL = 1000 / 24;

export const useHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const activeRef = useRef(false);
  const workerReadyRef = useRef(false);
  const frameBusyRef = useRef(false);
  const lastFrameRef = useRef(0);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [gesture, setGesture] = useState<GestureState>(IDLE_GESTURE);
  const [error, setError] = useState("");

  const stop = useCallback((resetStatus = true) => {
    activeRef.current = false;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = undefined;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    workerRef.current?.postMessage({ type: "dispose" });
    workerRef.current?.terminate();
    workerRef.current = null;
    workerReadyRef.current = false;
    frameBusyRef.current = false;
    if (videoRef.current) videoRef.current.srcObject = null;
    setGesture(IDLE_GESTURE);
    if (resetStatus) setStatus("idle");
  }, []);

  const capture = useCallback(async () => {
    if (!activeRef.current) return;
    const video = videoRef.current;
    const now = performance.now();

    if (
      video &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      workerReadyRef.current &&
      !frameBusyRef.current &&
      now - lastFrameRef.current >= FRAME_INTERVAL
    ) {
      lastFrameRef.current = now;
      frameBusyRef.current = true;
      try {
        const bitmap = await createImageBitmap(video);
        workerRef.current?.postMessage(
          { type: "frame", bitmap, timestamp: now },
          [bitmap],
        );
      } catch {
        frameBusyRef.current = false;
      }
    }

    animationRef.current = requestAnimationFrame(capture);
  }, []);

  const start = useCallback(async () => {
    stop(false);
    setError("");

    if (!navigator.mediaDevices?.getUserMedia || typeof Worker === "undefined") {
      setStatus("unsupported");
      setError("当前浏览器不支持摄像头手势，已切换到鼠标与触控模式。");
      return;
    }

    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus("loading-model");
      const worker = new Worker(new URL("./gestureWorker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      activeRef.current = true;

      worker.onmessage = (
        event: MessageEvent<
          | { type: "ready" }
          | { type: "result"; gesture: GestureState }
          | { type: "error"; message: string }
        >,
      ) => {
        if (event.data.type === "ready") {
          workerReadyRef.current = true;
          setStatus("active");
          return;
        }
        if (event.data.type === "result") {
          frameBusyRef.current = false;
          setGesture(event.data.gesture);
          return;
        }
        frameBusyRef.current = false;
        setStatus("error");
        setError(event.data.message || "手势模型加载失败，已保留鼠标与触控操作。");
      };
      worker.onerror = () => {
        frameBusyRef.current = false;
        setStatus("error");
        setError("手势识别线程启动失败，已保留鼠标与触控操作。");
      };
      worker.postMessage({ type: "init" });
      animationRef.current = requestAnimationFrame(capture);
    } catch (reason) {
      const denied =
        reason instanceof DOMException &&
        (reason.name === "NotAllowedError" || reason.name === "SecurityError");
      stop(false);
      setStatus(denied ? "denied" : "error");
      setError(
        denied
          ? "摄像头权限未开启，仍可使用鼠标拖拽、滚轮和触控操作。"
          : "无法启动摄像头，仍可使用鼠标与触控操作。",
      );
    }
  }, [capture, stop]);

  useEffect(() => () => stop(false), [stop]);

  return { videoRef, status, gesture, error, start, stop };
};

