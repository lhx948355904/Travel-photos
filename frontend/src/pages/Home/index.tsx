import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, message, Popconfirm } from 'antd'
import {
  CalendarOutlined,
  CameraOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import MapView from '../../components/MapView/MapView'
import SearchBox from '../../components/MapView/SearchBox'
import BlurredCarousel from '../../components/BlurredCarousel'
import UploadPanel from '../../components/UploadPanel'
import FullscreenGallery from '../../components/FullscreenGallery'
import { useAuthStore } from '../../store/useAuthStore'
import { useMapStore } from '../../store/useMapStore'
import { getLocations, getLocationDetail, deleteLocation } from '../../api/location'
import type { Location } from '../../types'

const Home = () => {
  const navigate = useNavigate()
  const { isAdmin, logout } = useAuthStore()
  const { locations, setLocations, selectedLocation, setSelectedLocation } = useMapStore()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [clickPosition, setClickPosition] = useState<{ lng: number; lat: number } | null>(null)
  const [searchPoi, setSearchPoi] = useState<{ name: string; lng: number; lat: number } | null>(null)
  const [focusPosition, setFocusPosition] = useState<{ name: string; lng: number; lat: number } | null>(null)

  const totalPhotos = useMemo(
    () => locations.reduce((sum, location) => sum + (location.photoCount || 0), 0),
    [locations]
  )

  const latestLocation = useMemo(() => {
    return [...locations]
      .filter((location) => location.travelDate)
      .sort((a, b) => String(b.travelDate).localeCompare(String(a.travelDate)))[0]
  }, [locations])

  const focusLabel = searchPoi?.name || latestLocation?.name || '暂无焦点地点'
  const latestDateLabel = latestLocation?.travelDate || '等待记录'

  const fetchLocations = useCallback(async () => {
    try {
      const data = await getLocations()
      setLocations(data)
    } catch (err: any) {
      message.error(err.message || '地点列表加载失败')
    }
  }, [setLocations])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  const handleMarkerClick = useCallback(async (location: Location) => {
    try {
      const detail = await getLocationDetail(location.id)
      setSelectedLocation(detail)
      setGalleryOpen(true)
    } catch (err: any) {
      message.error(err.message || '地点详情加载失败')
    }
  }, [setSelectedLocation])

  const handleMapClick = useCallback((lng: number, lat: number) => {
    if (!isAdmin) return
    setClickPosition({ lng, lat })
    setSearchPoi(null)
    setEditingLocation(null)
    setUploadOpen(true)
  }, [isAdmin])

  const handleSearchSelect = useCallback((name: string, lng: number, lat: number) => {
    setSearchPoi({ name, lng, lat })
    setClickPosition({ lng, lat })
    setFocusPosition({ name, lng, lat })
  }, [])

  const handleCloseGallery = () => {
    setGalleryOpen(false)
    setSelectedLocation(null)
  }

  const handleEditLocation = () => {
    if (!selectedLocation) return
    setEditingLocation(selectedLocation)
    setClickPosition({ lng: selectedLocation.longitude, lat: selectedLocation.latitude })
    setGalleryOpen(false)
    setUploadOpen(true)
  }

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return
    try {
      await deleteLocation(selectedLocation.id)
      message.success('删除成功')
      setGalleryOpen(false)
      setSelectedLocation(null)
      fetchLocations()
    } catch (err: any) {
      message.error(err.message || '删除失败')
    }
  }

  const handleUploadSuccess = () => {
    fetchLocations()
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
      <BlurredCarousel locations={locations} />
      <div className="home-atmosphere" aria-hidden="true" />

      <main className="home-content">
        <header className="home-header">
          <div className="home-brand">
            <div className="brand-mark" aria-hidden="true">
              <EnvironmentOutlined />
            </div>
            <div className="home-titlebar">
              <span>Travel Photo Map</span>
              <h1>旅行摄影地图</h1>
            </div>
          </div>

          <div className="home-search">
            <SearchBox onSelectPoi={handleSearchSelect} />
          </div>

          <div className="home-actions">
            <span className={isAdmin ? 'mode-pill admin' : 'mode-pill'}>
              {isAdmin ? '管理员' : '访客'}
            </span>
            {isAdmin ? (
              <Button
                type="primary"
                icon={<LogoutOutlined />}
                onClick={logout}
                className="header-action"
              >
                退出登录
              </Button>
            ) : (
              <Button
                type="primary"
                ghost
                icon={<LoginOutlined />}
                onClick={() => navigate('/login')}
                className="header-action"
              >
                管理员登录
              </Button>
            )}
          </div>
        </header>

        <section className="home-workspace">
          <aside className="story-panel" aria-label="旅行地图概览">
            <div className="panel-block">
              <span className="panel-label">空间相册</span>
              <h2>地点、照片、时间</h2>
              <p>{isAdmin ? '管理视图已开启' : '公开浏览视图'}</p>
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

            {isAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreatePanel}
                className="panel-create"
                block
              >
                新增地点
              </Button>
            )}
          </aside>

          <section className="map-stage" aria-label="旅行地图">
            <div className="map-stage-header">
              <div>
                <span>Map Canvas</span>
                <h2>旅行足迹</h2>
              </div>
              <div className="map-stage-status">
                <EnvironmentOutlined />
                <span>{locations.length > 0 ? `${locations.length} 个地点` : '暂无地点'}</span>
              </div>
            </div>

            <div className="map-shell">
              <MapView
                locations={locations}
                onMarkerClick={handleMarkerClick}
                onMapClick={handleMapClick}
                focusPosition={focusPosition}
                isAdmin={isAdmin}
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

      {galleryOpen && isAdmin && selectedLocation && (
        <div className="gallery-admin-actions">
          <Button type="primary" icon={<EditOutlined />} onClick={handleEditLocation}>
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
