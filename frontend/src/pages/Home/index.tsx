import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, FloatButton, message, Popconfirm } from 'antd'
import {
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
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

  return (
    <div className="home-page">
      <BlurredCarousel locations={locations} />

      <div className="home-content">
        <div className="home-header">
          <div className="home-titlebar">
            <h1>旅行摄影地图</h1>
            <SearchBox onSelectPoi={handleSearchSelect} />
          </div>

          {isAdmin ? (
            <Button
              type="primary"
              ghost
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

        <div className="map-shell">
          <MapView
            locations={locations}
            onMarkerClick={handleMarkerClick}
            onMapClick={handleMapClick}
            focusPosition={focusPosition}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {isAdmin && (
        <FloatButton.Group trigger="hover" style={{ right: 24, bottom: 24 }}>
          <FloatButton
            icon={<PlusOutlined />}
            tooltip="添加地点"
            onClick={() => {
              setEditingLocation(null)
              setClickPosition(searchPoi ? { lng: searchPoi.lng, lat: searchPoi.lat } : null)
              setUploadOpen(true)
            }}
          />
        </FloatButton.Group>
      )}

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
