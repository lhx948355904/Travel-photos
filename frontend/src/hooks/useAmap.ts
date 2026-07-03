import { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE

if (AMAP_SECURITY_CODE) {
  (window as any)._AMapSecurityConfig = {
    securityJsCode: AMAP_SECURITY_CODE,
  }
}

export function useAmap(containerId: string) {
  const mapRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let map: any = null
    let cancelled = false

    const initMap = async () => {
      try {
        const AMap = await AMapLoader.load({
          key: AMAP_KEY || '',
          version: '2.0',
          plugins: [
            'AMap.MarkerCluster',
            'AMap.PlaceSearch',
            'AMap.AutoComplete',
            'AMap.Scale',
            'AMap.ToolBar',
          ],
        })

        map = new AMap.Map(containerId, {
          zoom: 5,
          center: [116.397428, 39.90923],
          viewMode: '2D',
        })

        map.addControl(new AMap.Scale())
        map.addControl(new AMap.ToolBar({
          position: 'RB',
        }))

        mapRef.current = map
        map.on('complete', () => {
          if (cancelled) return
          map.resize()
          setIsReady(true)
        })
      } catch (error) {
        console.error('Map init error:', error)
      }
    }

    initMap()

    return () => {
      cancelled = true
      setIsReady(false)
      mapRef.current = null
      if (map) {
        map.destroy()
      }
    }
  }, [containerId])

  return { map: mapRef, isReady }
}
