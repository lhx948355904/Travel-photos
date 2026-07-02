import { useCallback, useEffect, useMemo, useState } from "react"
import { Button, Empty, Input, message, Popconfirm, Spin } from "antd"
import {
  CalendarOutlined,
  CameraOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons"
import ActivityPanel from "../../components/ActivityPanel"
import FullscreenGallery from "../../components/FullscreenGallery"
import MapView from "../../components/MapView/MapView"
import SearchBox from "../../components/MapView/SearchBox"
import UploadPanel from "../../components/UploadPanel"
import { useActivitySocket } from "../../hooks/useActivitySocket"
import { getLocationDetail, getLocations, deleteLocation } from "../../api/location"
import { searchPhotos } from "../../api/search"
import { useMapStore } from "../../store/useMapStore"
import type { Location, SearchPhotoResult } from "../../types"

const Home = () => {
  const {
    locations,
    setLocations,
    selectedLocation,
    setSelectedLocation,
    resetMap,
  } = useMapStore()
  const {
    status,
    onlineCount,
    messages: activityMessages,
    sendActivity,
  } = useActivitySocket()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [clickPosition, setClickPosition] = useState<{
    lng: number
    lat: number
  } | null>(null)
  const [searchPoi, setSearchPoi] = useState<{
    name: string
    lng: number
    lat: number
  } | null>(null)
  const [focusPosition, setFocusPosition] = useState<{
    name: string
    lng: number
    lat: number
  } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [photoSearchLoading, setPhotoSearchLoading] = useState(false)
  const [photoResults, setPhotoResults] = useState<SearchPhotoResult[]>([])

  const totalPhotos = useMemo(
    () => locations.reduce((sum, location) => sum + (location.photoCount || 0), 0),
    [locations],
  )

  const latestLocation = useMemo(() => {
    return [...locations]
      .filter((location) => location.travelDate)
      .sort((a, b) => String(b.travelDate).localeCompare(String(a.travelDate)))[0]
  }, [locations])

  const focusLabel = searchPoi?.name || latestLocation?.name || "等待第一处地点"
  const latestDateLabel = latestLocation?.travelDate || "尚未记录"

  const fetchLocations = useCallback(async () => {
    setLocationLoading(true)
    try {
      const data = await getLocations()
      setLocations(data)
    } catch (err: any) {
      message.error(err.message || "地点列表加载失败")
    } finally {
      setLocationLoading(false)
    }
  }, [setLocations])

  useEffect(() => {
    fetchLocations()
    return () => resetMap()
  }, [fetchLocations, resetMap])

  const handleMarkerClick = useCallback(
    async (location: Location) => {
      try {
        const detail = await getLocationDetail(location.id)
        setSelectedLocation(detail)
        setGalleryOpen(true)
        sendActivity(`查看了 ${location.name}`)
      } catch (err: any) {
        message.error(err.message || "地点详情加载失败")
      }
    },
    [sendActivity, setSelectedLocation],
  )

  const handleMapClick = useCallback((lng: number, lat: number) => {
    setClickPosition({ lng, lat })
    setSearchPoi(null)
    setEditingLocation(null)
    setUploadOpen(true)
  }, [])

  const handleSearchSelect = useCallback(
    (name: string, lng: number, lat: number) => {
      setSearchPoi({ name, lng, lat })
      setClickPosition({ lng, lat })
      setFocusPosition({ name, lng, lat })
      setEditingLocation(null)
      setUploadOpen(true)
      sendActivity(`定位到 ${name}`)
    },
    [sendActivity],
  )

  const handlePhotoSearch = async (query: string) => {
    const keyword = query.trim()
    if (!keyword) return

    setPhotoSearchLoading(true)
    try {
      const results = await searchPhotos(keyword)
      setPhotoResults(results)
      if (results.length === 0) {
        message.info("没有找到匹配的照片")
      }
    } catch (err: any) {
      message.error(err.message || "照片搜索失败")
    } finally {
      setPhotoSearchLoading(false)
    }
  }

  const openSearchResult = async (result: SearchPhotoResult) => {
    try {
      const detail = await getLocationDetail(result.locationId)
      setSelectedLocation(detail)
      setGalleryOpen(true)
      sendActivity(`从搜索打开了 ${result.locationName}`)
    } catch (err: any) {
      message.error(err.message || "照片详情加载失败")
    }
  }

  const handleCloseGallery = () => {
    setGalleryOpen(false)
    setSelectedLocation(null)
  }

  const handleEditLocation = () => {
    if (!selectedLocation) return
    setEditingLocation(selectedLocation)
    setClickPosition({
      lng: selectedLocation.longitude,
      lat: selectedLocation.latitude,
    })
    setSearchPoi(null)
    setGalleryOpen(false)
    setUploadOpen(true)
  }

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return
    try {
      await deleteLocation(selectedLocation.id)
      message.success("删除成功")
      setGalleryOpen(false)
      setSelectedLocation(null)
      fetchLocations()
      sendActivity(`删除了 ${selectedLocation.name}`)
    } catch (err: any) {
      message.error(err.message || "删除失败")
    }
  }

  const handleUploadSuccess = () => {
    fetchLocations()
    sendActivity("更新了旅行地图")
  }

  const handleCloseUpload = () => {
    setUploadOpen(false)
    setEditingLocation(null)
    setClickPosition(null)
  }

  const openCreatePanel = () => {
    setEditingLocation(null)
    setClickPosition(searchPoi ? { lng: searchPoi.lng, lat: searchPoi.lat } : null)
    setUploadOpen(true)
  }

  return (
    <div className="home-page">
      <div className="home-atmosphere" aria-hidden="true" />

      <main className="home-content">
        <header className="home-header">
          <div className="home-brand">
            <div className="brand-mark" aria-hidden="true">
              MAP
            </div>
            <div className="home-titlebar">
              <span>Travel Photo Map</span>
              <h1>旅行摄影地图</h1>
            </div>
          </div>

          <nav className="home-nav-strip" aria-label="地图工作区">
            <span>地图</span>
            <span>地点</span>
            <span>相册</span>
            <span>上传</span>
          </nav>

          <div className="home-search">
            <SearchBox onSelectPoi={handleSearchSelect} />
          </div>

          <div className="home-actions">
            <span className="mode-pill">单站点</span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreatePanel}
              className="header-action"
            >
              添加地点
            </Button>
          </div>
        </header>

        <section className="home-workspace">
          <aside className="story-panel" aria-label="旅行地图概览">
            <div className="panel-block">
              <span className="panel-label">站点相册</span>
              <h2>地点、照片、时间</h2>
              <p>把旅行中的每一个坐标固定成照片标记，让路线和记忆一起保留。</p>
            </div>

            <div className="metric-grid">
              <div className="metric-card">
                <EnvironmentOutlined />
                <span>地点</span>
                <strong>{locations.length}</strong>
              </div>
              <div className="metric-card">
                <CameraOutlined />
                <span>照片</span>
                <strong>{totalPhotos}</strong>
              </div>
              <div className="metric-card wide">
                <CalendarOutlined />
                <span>最近旅程</span>
                <strong>{latestDateLabel}</strong>
              </div>
            </div>

            <div className="focus-card">
              <span>当前焦点</span>
              <strong>{focusLabel}</strong>
              {searchPoi && (
                <small>
                  {searchPoi.lng.toFixed(4)}, {searchPoi.lat.toFixed(4)}
                </small>
              )}
            </div>

            <div className="semantic-search-panel">
              <span className="panel-label">照片语义搜索</span>
              <Input.Search
                allowClear
                enterButton={<SearchOutlined />}
                placeholder="搜索海边日落、寺庙、花园..."
                loading={photoSearchLoading}
                onSearch={handlePhotoSearch}
              />
              <div className="photo-search-results">
                {photoSearchLoading && <Spin size="small" />}
                {!photoSearchLoading &&
                  photoResults.map((result) => (
                    <button
                      key={result.photoId}
                      type="button"
                      className="photo-result"
                      onClick={() => openSearchResult(result)}
                    >
                      <img
                        src={result.thumbUrl || result.url}
                        alt={result.locationName}
                      />
                      <span>
                        <strong>{result.locationName}</strong>
                        <small>
                          {result.caption || result.tags || result.shotDate || "匹配照片"}
                        </small>
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            <ActivityPanel
              status={status}
              onlineCount={onlineCount}
              messages={activityMessages}
            />

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreatePanel}
              className="panel-create"
              block
            >
              添加地点
            </Button>
          </aside>

          <section className="map-stage" aria-label="旅行地图">
            <div className="map-stage-header">
              <div>
                <span>Map Canvas</span>
                <h2>旅行足迹</h2>
              </div>
              <div className="map-stage-status">
                <EnvironmentOutlined />
                <span>
                  {locations.length > 0 ? `${locations.length} 个地点` : "暂无地点"}
                </span>
              </div>
            </div>

            <div className="map-shell">
              {locationLoading && (
                <div className="map-loading">
                  <Spin />
                </div>
              )}
              {!locationLoading && locations.length === 0 && (
                <div className="map-empty-state">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="第一处地点"
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreatePanel}
                  >
                    添加地点
                  </Button>
                </div>
              )}
              <MapView
                locations={locations}
                onMarkerClick={handleMarkerClick}
                onMapClick={handleMapClick}
                focusPosition={focusPosition}
                canCreateLocation
              />
            </div>
          </section>
        </section>
      </main>

      <UploadPanel
        open={uploadOpen}
        onClose={handleCloseUpload}
        initialLng={clickPosition?.lng}
        initialLat={clickPosition?.lat}
        initialName={searchPoi?.name}
        editingLocation={editingLocation}
        onSuccess={handleUploadSuccess}
      />

      <FullscreenGallery
        location={selectedLocation}
        open={galleryOpen}
        onClose={handleCloseGallery}
      />

      {galleryOpen && selectedLocation && (
        <div className="gallery-admin-actions">
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEditLocation}
          >
            编辑地点
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={handleDeleteLocation}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              删除地点
            </Button>
          </Popconfirm>
        </div>
      )}
    </div>
  )
}

export default Home
