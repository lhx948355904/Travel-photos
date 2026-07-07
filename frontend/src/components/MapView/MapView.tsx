import { memo, useCallback, useEffect, useRef } from "react";
import { useAmap } from "../../hooks/useAmap";
import type { Location } from "../../types";
import { getMarkerThumbnailUrl } from "../../utils/image";

interface MapViewProps {
  locations: Location[];
  onMarkerClick: (location: Location) => void;
  onMapClick?: (lng: number, lat: number) => void;
  focusPosition?: { lng: number; lat: number; name?: string } | null;
  canCreateLocation: boolean;
}

const toFiniteNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const isValidLngLat = (longitude: number, latitude: number) => {
  return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
};

const getLocationPosition = (location: Location): [number, number] | null => {
  const longitude = toFiniteNumber(location.longitude);
  const latitude = toFiniteNumber(location.latitude);

  if (longitude === null || latitude === null || !isValidLngLat(longitude, latitude)) {
    return null;
  }

  return [longitude, latitude];
};

const MapView = ({
  locations,
  onMarkerClick,
  onMapClick,
  focusPosition,
  canCreateLocation,
}: MapViewProps) => {
  const containerId = "amap-container";
  const { map: mapRef, isReady } = useAmap(containerId);
  const markersRef = useRef<any[]>([]);
  const searchMarkerRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapClickRef = useRef(onMapClick);
  const map = mapRef.current;
  const AMap = (window as any).AMap;

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const createMarkerContent = useCallback((location: Location) => {
    const thumbUrl = getMarkerThumbnailUrl(location.coverThumbUrl || "");
    const div = document.createElement("div");
    div.className = "photo-marker";
    const appendFallback = () => {
      div.replaceChildren();
      const fallback = document.createElement("span");
      fallback.className = "photo-marker-fallback";
      fallback.textContent = location.name.slice(0, 1) || "旅";
      div.appendChild(fallback);
    };

    if (thumbUrl) {
      const image = document.createElement("img");
      image.src = thumbUrl;
      image.alt = location.name;
      image.loading = "lazy";
      image.onerror = () => {
        const originalUrl = thumbUrl.split("?")[0];
        if (originalUrl && originalUrl !== image.src) {
          image.onerror = appendFallback;
          image.src = originalUrl;
          return;
        }
        appendFallback();
      };
      div.appendChild(image);
    } else {
      appendFallback();
    }

    if (location.photoCount > 1) {
      const count = document.createElement("span");
      count.className = "count";
      count.textContent = String(location.photoCount);
      div.appendChild(count);
    }

    return div;
  }, []);

  useEffect(() => {
    if (!map || !isReady || !AMap) return;

    let cancelled = false;
    let frameId: number | null = null;

    const clearMapMarkers = () => {
      if (clusterRef.current) {
        clusterRef.current.setMap(null);
        clusterRef.current = null;
      }
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };

    clearMapMarkers();

    if (locations.length === 0) return;

    frameId = window.requestAnimationFrame(() => {
      if (cancelled) return;

      const validLocations = locations
        .map((location) => ({
          location,
          position: getLocationPosition(location),
        }))
        .filter(
          (item): item is { location: Location; position: [number, number] } =>
            item.position !== null,
        );

      if (validLocations.length === 0) return;

      if (validLocations.length !== locations.length) {
        console.warn(
          "Some locations were skipped because their coordinates are invalid.",
          locations,
        );
      }

      const markers = validLocations.map(({ location, position }) => {
        const marker = new AMap.Marker({
          position,
          content: createMarkerContent(location),
          offset: new AMap.Pixel(-28, -28),
          extData: location,
        });

        marker.on("click", () => {
          onMarkerClickRef.current(location);
        });

        return marker;
      });

      markersRef.current = markers;

      if (markers.length > 20) {
        AMap.plugin(["AMap.MarkerCluster"], () => {
          if (cancelled) return;
          clusterRef.current = new AMap.MarkerCluster(map, markers, {
            gridSize: 60,
            renderClusterMarker: (context: any) => {
              const count = context.count;
              const div = document.createElement("div");
              div.className = "cluster-marker";
              div.textContent = count;
              context.marker.setContent(div);
            },
          });
        });
      } else {
        map.add(markers);
      }

      if (validLocations.length === 1) {
        map.setZoomAndCenter(12, validLocations[0].position, true);
        return;
      }

      map.setFitView(markers, true, [60, 60, 60, 60]);
    });

    return () => {
      cancelled = true;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      clearMapMarkers();
    };
  }, [map, isReady, locations, AMap, createMarkerContent]);

  useEffect(() => {
    if (!map || !isReady || !focusPosition) return;

    const lng = toFiniteNumber(focusPosition.lng);
    const lat = toFiniteNumber(focusPosition.lat);

    if (lng === null || lat === null || !isValidLngLat(lng, lat)) return;

    const position: [number, number] = [lng, lat];
    map.setZoomAndCenter(15, position, true);

    if (searchMarkerRef.current) {
      searchMarkerRef.current.setMap(null);
    }

    const marker = new AMap.Marker({
      position,
      title: focusPosition.name,
      anchor: "bottom-center",
    });
    marker.on("click", () => {
      onMapClickRef.current?.(lng, lat);
    });
    marker.setMap(map);
    searchMarkerRef.current = marker;
  }, [map, isReady, focusPosition]);

  useEffect(() => {
    if (!map || !isReady || !canCreateLocation) return;

    const clickHandler = (event: any) => {
      const lng = event.lnglat.getLng();
      const lat = event.lnglat.getLat();
      onMapClickRef.current?.(lng, lat);
    };

    map.on("click", clickHandler);
    return () => {
      map.off("click", clickHandler);
    };
  }, [map, isReady, canCreateLocation]);

  return (
    <div
      id={containerId}
      className="map-surface"
      role="application"
      aria-label="高德旅行照片地图"
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
};

export default memo(MapView);
