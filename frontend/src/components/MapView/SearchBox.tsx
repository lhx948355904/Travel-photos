import { useEffect, useRef, useState } from 'react'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

interface SearchBoxProps {
  onSelectPoi?: (name: string, lng: number, lat: number) => void
}

const SearchBox = ({ onSelectPoi }: SearchBoxProps) => {
  const [keyword, setKeyword] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const autoCompleteRef = useRef<any>(null)
  const placeSearchRef = useRef<any>(null)

  useEffect(() => {
    if (!window.AMap) return

    window.AMap.plugin(['AMap.AutoComplete', 'AMap.PlaceSearch'], () => {
      autoCompleteRef.current = new window.AMap.AutoComplete({
        city: '全国',
      })
      placeSearchRef.current = new window.AMap.PlaceSearch({
        city: '全国',
        pageSize: 1,
      })
    })
  }, [])

  const handleSearch = (value: string) => {
    setKeyword(value)
    if (!value || !autoCompleteRef.current) {
      setSuggestions([])
      return
    }

    autoCompleteRef.current.search(value, (status: string, result: any) => {
      if (status === 'complete' && result.info === 'OK') {
        setSuggestions(result.tips || [])
      } else {
        setSuggestions([])
      }
    })
  }

  const handleSelect = (item: any) => {
    setKeyword(item.name)
    setSuggestions([])

    if (item.location && item.location.lng && item.location.lat) {
      const lng = item.location.lng
      const lat = item.location.lat
      onSelectPoi?.(item.name, lng, lat)
    } else if (placeSearchRef.current) {
      placeSearchRef.current.search(item.name, (status: string, result: any) => {
        if (status === 'complete' && result.info === 'OK' && result.poiList.pois.length > 0) {
          const poi = result.poiList.pois[0]
          const lng = poi.location.lng
          const lat = poi.location.lat
          onSelectPoi?.(poi.name, lng, lat)
        }
      })
    }
  }

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder="搜索地点..."
        value={keyword}
        onChange={(e) => handleSearch(e.target.value)}
        style={{
          width: 320,
          borderRadius: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
        size="large"
      />
      {suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 8,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}
        >
          {suggestions.map((item, index) => (
            <div
              key={index}
              onClick={() => handleSelect(item)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              <div style={{ fontWeight: 500 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: '#999' }}>{item.district}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchBox
