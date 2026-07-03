import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { Location } from "../../types";

interface MapTrailAmbientProps {
  locations: Location[];
}

interface TrailPoint {
  x: number;
  y: number;
}

const MAX_TRAIL_POINTS = 10;
const FALLBACK_POINTS: TrailPoint[] = [
  { x: 24, y: 12 },
  { x: 62, y: 22 },
  { x: 38, y: 34 },
  { x: 70, y: 48 },
  { x: 30, y: 62 },
  { x: 58, y: 78 },
  { x: 42, y: 90 },
];

const toFiniteNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeValue = (value: number, min: number, max: number) => {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
};

const clampPoint = (value: number) => Math.min(88, Math.max(12, value));

const buildPointsFromLocations = (locations: Location[]) => {
  const validLocations = locations
    .map((location) => ({
      lng: toFiniteNumber(location.longitude),
      lat: toFiniteNumber(location.latitude),
      date: location.travelDate || "",
    }))
    .filter(
      (location): location is { lng: number; lat: number; date: string } =>
        location.lng !== null && location.lat !== null,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_TRAIL_POINTS);

  if (validLocations.length < 2) return FALLBACK_POINTS;

  const lngValues = validLocations.map((location) => location.lng);
  const latValues = validLocations.map((location) => location.lat);
  const minLng = Math.min(...lngValues);
  const maxLng = Math.max(...lngValues);
  const minLat = Math.min(...latValues);
  const maxLat = Math.max(...latValues);

  return validLocations.map((location) => ({
    x: clampPoint(normalizeValue(location.lng, minLng, maxLng)),
    y: clampPoint(100 - normalizeValue(location.lat, minLat, maxLat)),
  }));
};

const toPath = (points: TrailPoint[]) => {
  const [firstPoint, ...restPoints] = points;
  return restPoints.reduce(
    (path, point, index) => {
      const previous = points[index];
      const controlX = (previous.x + point.x) / 2;
      return `${path} C ${controlX.toFixed(1)} ${previous.y.toFixed(1)}, ${controlX.toFixed(
        1,
      )} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    },
    `M ${firstPoint.x.toFixed(1)} ${firstPoint.y.toFixed(1)}`,
  );
};

const toNodeStyle = (point: TrailPoint, index: number) =>
  ({
    "--trail-x": `${point.x}%`,
    "--trail-y": `${point.y}%`,
    "--trail-delay": `${index * 260}ms`,
  }) as CSSProperties;

const MapTrailAmbient = ({ locations }: MapTrailAmbientProps) => {
  const leftPoints = useMemo(() => buildPointsFromLocations(locations), [locations]);
  const rightPoints = useMemo(
    () =>
      leftPoints
        .map((point) => ({
          x: 100 - point.x,
          y: point.y,
        }))
        .reverse(),
    [leftPoints],
  );
  const leftPath = useMemo(() => toPath(leftPoints), [leftPoints]);
  const rightPath = useMemo(() => toPath(rightPoints), [rightPoints]);

  return (
    <div className="map-trail-ambient" aria-hidden="true">
      <div className="map-trail-ambient__veil" />
      <div className="map-trail-ambient__panel map-trail-ambient__panel--left">
        <svg className="map-trail-ambient__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path className="map-trail-ambient__path map-trail-ambient__path--base" d={leftPath} />
          <path className="map-trail-ambient__path map-trail-ambient__path--glow" d={leftPath} />
        </svg>
        {leftPoints.map((point, index) => (
          <span
            key={`left-${point.x}-${point.y}-${index}`}
            className="map-trail-ambient__node"
            style={toNodeStyle(point, index)}
          />
        ))}
      </div>
      <div className="map-trail-ambient__panel map-trail-ambient__panel--right">
        <svg className="map-trail-ambient__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path className="map-trail-ambient__path map-trail-ambient__path--base" d={rightPath} />
          <path className="map-trail-ambient__path map-trail-ambient__path--glow" d={rightPath} />
        </svg>
        {rightPoints.map((point, index) => (
          <span
            key={`right-${point.x}-${point.y}-${index}`}
            className="map-trail-ambient__node"
            style={toNodeStyle(point, index)}
          />
        ))}
      </div>
    </div>
  );
};

export default MapTrailAmbient;
