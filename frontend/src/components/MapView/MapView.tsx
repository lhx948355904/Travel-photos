import { useEffect, useRef, useCallback } from 'react'
import { useAmap } from '../../hooks/useAmap'
import type { Location } from '../../types'
import { getMarkerThumbnailUrl } from '../../utils/image'

interface MapViewProps {
  locations: Location[]
  onMarkerClick: (location: Location) => void
  onMapClick?: (lng: number, lat: number) => void
  focusPosition?: { lng: number; lat: number; name?: string } | null
  isAdmin: boolean
}

const MapView = ({ locations, onMarkerClick, onMapClick, focusPosition, isAdmin }: MapViewProps) => {
  const containerId = 'amap-container'
  const { map: mapRef, isReady } = useAmap(containerId)
  const markersRef = useRef<any[]>([])
  const searchMarkerRef = useRef<any>(null)
  const clusterRef = useRef<any>(null)
  const map = mapRef.current
  const AMap = (window as any).AMap

  const createMarkerContent = useCallback((location: Location) => {
    const thumbUrl = getMarkerThumbnailUrl(location.coverThumbUrl || '')
    const div = document.createElement('div')
    div.className = 'photo-marker'
    div.innerHTML = `
      <img src="${thumbUrl}" alt="${location.name}" loading="lazy" />
      ${location.photoCount > 1 ? `<span class="count">${location.photoCount}</span>` : ''}
    `
    return div
  }, [])

  useEffect(() => {
    if (!map || !isReady) return

    if (clusterRef.current) {
      clusterRef.current.setMap(null)
      clusterRef.current = null
    }
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    if (locations.length === 0) return

    const markers = locations.map((location) => {
      const marker = new AMap.Marker({
        position: [location.longitude, location.latitude],
        content: createMarkerContent(location),
        offset: new AMap.Pixel(-28, -28),
        anchor: 'center',
        extData: location,
      })

      marker.on('click', () => {
        onMarkerClick(location)
      })

      return marker
    })

    markersRef.current = markers

    if (markers.length > 20) {
      AMap.plugin(['AMap.MarkerCluster'], () => {
        clusterRef.current = new AMap.MarkerCluster(map, markers, {
          gridSize: 60,
          renderClusterMarker: (context: any) => {
            const count = context.count
            const div = document.createElement('div')
            div.className = 'cluster-marker'
            div.textContent = count
            context.marker.setContent(div)
          },
        })
      })
    } else {
      map.add(markers)
    }

    if (locations.length > 0) {
      const bounds = new AMap.Bounds()
      locations.forEach((loc) => {
        bounds.extend([loc.longitude, loc.latitude])
      })
      map.setBounds(bounds, [60, 60, 60, 60])
    }
  }, [map, isReady, locations, onMarkerClick, createMarkerContent])

  useEffect(() => {
    if (!map || !isReady || !focusPosition) return

    const position = [focusPosition.lng, focusPosition.lat]
    map.setZoomAndCenter(15, position, true)

    if (searchMarkerRef.current) {
      searchMarkerRef.current.setMap(null)
    }

    const marker = new AMap.Marker({
      position,
      title: focusPosition.name,
      anchor: 'bottom-center',
    })
    marker.setMap(map)
    searchMarkerRef.current = marker
  }, [map, isReady, focusPosition])

  useEffect(() => {
    if (!map || !isReady || !isAdmin) return

    const clickHandler = (e: any) => {
      const lng = e.lnglat.getLng()
      const lat = e.lnglat.getLat()
      onMapClick?.(lng, lat)
    }

    map.on('click', clickHandler)
    return () => {
      map.off('click', clickHandler)
    }
  }, [map, isReady, isAdmin, onMapClick])

  return (
    <div
      id={containerId}
      className="map-surface"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  )
}

export default MapView
