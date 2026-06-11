import { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import { Empty, Input, Spin } from 'antd'
import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons'

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE

if (AMAP_SECURITY_CODE) {
  ;(window as any)._AMapSecurityConfig = {
    securityJsCode: AMAP_SECURITY_CODE,
  }
}

interface PoiSuggestion {
  id?: string
  name: string
  district?: string
  address?: string
  location?: {
    lng: number
    lat: number
  }
}

interface SearchBoxProps {
  onSelectPoi?: (name: string, lng: number, lat: number) => void
}

const SearchBox = ({ onSelectPoi }: SearchBoxProps) => {
  const [keyword, setKeyword] = useState('')
  const [suggestions, setSuggestions] = useState<PoiSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const autoCompleteRef = useRef<any>(null)
  const placeSearchRef = useRef<any>(null)
  const searchSeqRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    AMapLoader.load({
      key: AMAP_KEY || '',
      version: '2.0',
      plugins: ['AMap.AutoComplete', 'AMap.PlaceSearch'],
    })
      .then((AMap) => {
        if (cancelled) return
        autoCompleteRef.current = new AMap.AutoComplete({ city: '全国' })
        placeSearchRef.current = new AMap.PlaceSearch({ city: '全国', pageSize: 10 })
        setReady(true)
      })
      .catch((error) => {
        console.error('AMap search init error:', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSearch = (value: string) => {
    setKeyword(value)
    const seq = searchSeqRef.current + 1
    searchSeqRef.current = seq

    if (!value.trim() || !autoCompleteRef.current) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    autoCompleteRef.current.search(value.trim(), (status: string, result: any) => {
      if (seq !== searchSeqRef.current) return
      setLoading(false)

      if (status === 'complete' && result.info === 'OK') {
        const tips = (result.tips || [])
          .filter((item: any) => item.name && item.name !== 'undefined')
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            district: item.district,
            address: item.address,
            location: item.location
              ? {
                  lng: Number(item.location.lng),
                  lat: Number(item.location.lat),
                }
              : undefined,
          }))
        setSuggestions(tips)
      } else {
        setSuggestions([])
      }
    })
  }

  const selectPoi = (name: string, lng: number, lat: number) => {
    setKeyword(name)
    setSuggestions([])
    onSelectPoi?.(name, lng, lat)
  }

  const handleSelect = (item: PoiSuggestion) => {
    if (item.location && Number.isFinite(item.location.lng) && Number.isFinite(item.location.lat)) {
      selectPoi(item.name, item.location.lng, item.location.lat)
      return
    }

    if (!placeSearchRef.current) return
    setLoading(true)
    placeSearchRef.current.search(item.name, (status: string, result: any) => {
      setLoading(false)
      const pois = result?.poiList?.pois || []
      if (status === 'complete' && result.info === 'OK' && pois.length > 0) {
        const poi = pois[0]
        selectPoi(poi.name || item.name, Number(poi.location.lng), Number(poi.location.lat))
      }
    })
  }

  return (
    <div className="search-box">
      <Input
        prefix={<SearchOutlined />}
        placeholder="搜索地点"
        value={keyword}
        onChange={(e) => handleSearch(e.target.value)}
        disabled={!ready}
        size="large"
      />

      {(suggestions.length > 0 || loading) && (
        <div className="search-results">
          {loading && (
            <div className="search-status">
              <Spin size="small" />
            </div>
          )}

          {!loading &&
            suggestions.map((item, index) => (
              <button
                key={`${item.id || item.name}-${index}`}
                className="search-result-item"
                type="button"
                onClick={() => handleSelect(item)}
              >
                <EnvironmentOutlined />
                <span>
                  <strong>{item.name}</strong>
                  <small>{[item.district, item.address].filter(Boolean).join(' · ')}</small>
                </span>
              </button>
            ))}

          {!loading && suggestions.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        </div>
      )}
    </div>
  )
}

export default SearchBox
