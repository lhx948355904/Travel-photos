import {
  ArrowLeftOutlined,
  CameraOutlined,
  CompressOutlined,
  ExpandOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLocationDetail, getLocations } from "../../api/location";
import FullscreenGallery from "../../components/FullscreenGallery";
import type { Location } from "../../types";
import { UniverseScene } from "./UniverseScene";
import { useHandTracking } from "./useHandTracking";
import type { CameraStatus, GestureState } from "./types";
import "./universe.css";

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
] as const;

const statusCopy: Record<CameraStatus, string> = {
  idle: "手势未启用",
  requesting: "等待摄像头授权",
  "loading-model": "正在加载本地手势模型",
  active: "摄像头已启用",
  denied: "摄像头权限未开启",
  unsupported: "当前设备不支持手势识别",
  error: "手势识别暂不可用",
};

const gestureCopy = (gesture: GestureState) => {
  if (!gesture.tracking) return "请将一只手放入画面";
  if (gesture.mode === "two-finger") return "双指引导 · 粒子正在飞行";
  if (gesture.mode === "fist") {
    if (gesture.zoomDelta > 0.2) return "握拳前伸 · 放大视角";
    if (gesture.zoomDelta < -0.2) return "握拳回拉 · 缩小视角";
    return "握拳已识别 · 前后推拉";
  }
  if (gesture.mode === "point") {
    if (Math.abs(gesture.rotationDelta) > 0.18) return "单指旋转";
    return "单指已识别";
  }
  if (gesture.openness > 0.68) return "张掌 · 银河扩散";
  if (gesture.openness < 0.34) return "握拳 · 银河聚合";
  return "手掌已识别";
};

const HandPreview = ({
  videoRef,
  gesture,
  collapsed,
  onToggle,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  gesture: GestureState;
  collapsed: boolean;
  onToggle: () => void;
}) => (
  <aside className={`universe-camera${collapsed ? " is-collapsed" : ""}`}>
    <button type="button" className="universe-camera-toggle" onClick={onToggle}>
      {collapsed ? <EyeOutlined /> : <EyeInvisibleOutlined />}
      <span>{collapsed ? "显示手势画面" : "隐藏手势画面"}</span>
    </button>
    {!collapsed && (
      <div className="universe-camera-stage">
        <video ref={videoRef} muted playsInline aria-label="实时手势摄像头预览" />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          {HAND_CONNECTIONS.map(([from, to]) => {
            const start = gesture.landmarks[from];
            const end = gesture.landmarks[to];
            if (!start || !end) return null;
            return (
              <line
                key={`${from}-${to}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
              />
            );
          })}
          {gesture.landmarks.map((landmark, index) => (
            <circle key={index} cx={landmark.x} cy={landmark.y} r="0.012" />
          ))}
        </svg>
        <div className="universe-camera-label">{gestureCopy(gesture)}</div>
      </div>
    )}
  </aside>
);

const Universe = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [particleColor, setParticleColor] = useState("#8ecbff");
  const [resetSignal, setResetSignal] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(() =>
    window.matchMedia("(max-width: 760px)").matches,
  );
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const { videoRef, status, gesture, error, start, stop } = useHandTracking();

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setLocations(await getLocations());
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "照片封面加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice("浏览器未允许进入全屏模式");
    }
  };

  const openPhoto = useCallback(async (locationId: number) => {
    if (photoLoading) return;
    setPhotoLoading(true);
    setNotice("正在打开地点照片…");
    try {
      const detail = await getLocationDetail(locationId);
      setSelectedLocation(detail);
      setGalleryOpen(true);
      setNotice("");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "地点照片加载失败");
    } finally {
      setPhotoLoading(false);
    }
  }, [photoLoading]);

  const cameraActive = status === "active" || status === "loading-model" || status === "requesting";

  return (
    <main className="universe-page">
      <UniverseScene
        color={particleColor}
        gesture={gesture}
        locations={locations}
        resetSignal={resetSignal}
        reducedMotion={reducedMotion}
        onPhotoSelect={openPhoto}
      />

      <div className="universe-vignette" aria-hidden="true" />

      <header className="universe-topbar">
        <button type="button" className="universe-back" onClick={() => navigate(-1)}>
          <ArrowLeftOutlined />
          <span>返回</span>
        </button>
        <div className="universe-title">
          <strong>照片宇宙</strong>
          <span>{locations.length} 个旅行坐标正在银河中运行</span>
        </div>
        <button type="button" className="universe-icon-button" onClick={toggleFullscreen} aria-label={isFullscreen ? "退出全屏" : "进入全屏"}>
          {isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
        </button>
      </header>

      <aside className="universe-controls" aria-label="银河控制面板">
        <div className="universe-control-heading">
          <span>Galaxy Control</span>
          <strong>实时银河控制</strong>
        </div>

        <label className="universe-color-control">
          <span>
            <small>粒子颜色</small>
            <strong>{particleColor.toUpperCase()}</strong>
          </span>
          <input
            type="color"
            value={particleColor}
            onChange={(event) => setParticleColor(event.target.value)}
            aria-label="调整银河粒子颜色"
          />
        </label>

        <div className="universe-camera-status" aria-live="polite">
          <span className={`universe-status-dot is-${status}`} />
          <div>
            <strong>{statusCopy[status]}</strong>
            <small>{status === "active" ? gestureCopy(gesture) : error || "摄像头画面只在本机处理，不会上传"}</small>
          </div>
        </div>

        <button
          type="button"
          className={`universe-primary-control${cameraActive ? " is-active" : ""}`}
          onClick={cameraActive ? () => stop() : start}
          disabled={status === "requesting" || status === "loading-model"}
        >
          <CameraOutlined />
          <span>{cameraActive ? "关闭手势" : status === "idle" ? "启用手势" : "重新启用手势"}</span>
        </button>

        <button type="button" className="universe-secondary-control" onClick={() => setResetSignal((value) => value + 1)}>
          <ReloadOutlined />
          <span>重置视角</span>
        </button>
      </aside>

      {cameraActive && (
        <HandPreview
          videoRef={videoRef}
          gesture={gesture}
          collapsed={previewCollapsed}
          onToggle={() => setPreviewCollapsed((value) => !value)}
        />
      )}

      <footer className="universe-guide">
        <span>张掌扩散</span>
        <span>握拳前后缩放</span>
        <span>单指旋转</span>
        <span>双指引导飞行</span>
        <span className="universe-guide-desktop">拖拽 / 滚轮也可控制</span>
      </footer>

      {(loading || loadError || (!loading && locations.length === 0)) && (
        <div className="universe-data-state" role="status">
          {loading ? (
            <><span className="universe-loader" /><strong>正在接入照片坐标</strong></>
          ) : loadError ? (
            <><strong>照片坐标暂时不可用</strong><button type="button" onClick={loadLocations}>重新加载</button></>
          ) : (
            <><strong>银河中还没有照片</strong><button type="button" onClick={() => navigate("/map")}>前往地图</button></>
          )}
        </div>
      )}

      {(notice || photoLoading) && <div className="universe-notice" aria-live="polite">{notice}</div>}

      <FullscreenGallery
        location={selectedLocation}
        open={galleryOpen}
        onClose={() => {
          setGalleryOpen(false);
          setSelectedLocation(null);
        }}
      />
    </main>
  );
};

export default Universe;
