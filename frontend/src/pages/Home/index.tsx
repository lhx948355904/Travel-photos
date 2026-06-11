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
import { getLocations, deleteLocation } from '../../api/location'
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

  const fetchLocations = useCallback(async () => {
    try {
      const data = await getLocations()
      setLocations(data)
    } catch (err) {
      console.error('Failed to fetch locations', err)
    }
  }, [setLocations])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  const handleMarkerClick = useCallback((location: Location) => {
    setSelectedLocation(location)
    setGalleryOpen(true)
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
    if (isAdmin) {
      setClickPosition({ lng, lat })
      setEditingLocation(null)
      setUploadOpen(true)
    }
  }, [isAdmin])

  const handleCloseGallery = () => {
    setGalleryOpen(false)
    setSelectedLocation(null)
  }

  const handleEditLocation = () => {
    if (selectedLocation) {
      setEditingLocation(selectedLocation)
      setClickPosition({ lng: selectedLocation.longitude, lat: selectedLocation.latitude })
      setGalleryOpen(false)
      setUploadOpen(true)
    }
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
    setSearchPoi(null)
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background carousel */}
      <BlurredCarousel locations={locations} />

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1
              style={{
                margin: 0,
                color: '#fff',
                fontSize: 24,
                fontWeight: 600,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              旅行摄影地图
            </h1>
            <SearchBox onSelectPoi={handleSearchSelect} />
          </div>
          <div>
            {isAdmin ? (
              <Button
                type="primary"
                ghost
                icon={<LogoutOutlined />}
                onClick={logout}
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
              >
                退出登录
              </Button>
            ) : (
              <Button
                type="primary"
                ghost
                icon={<LoginOutlined />}
                onClick={() => navigate('/login')}
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
              >
                管理员登录
              </Button>
            )}
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <MapView
            locations={locations}
            onMarkerClick={handleMarkerClick}
            onMapClick={handleMapClick}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {/* Admin FAB */}
      {isAdmin && (
        <FloatButton.Group trigger="hover" style={{ right: 24, bottom: 24 }}>
          <FloatButton
            icon={<PlusOutlined />}
            tooltip="添加地点"
            onClick={() => {
              setEditingLocation(null)
              setClickPosition(null)
              setSearchPoi(null)
              setUploadOpen(true)
            }}
          />
        </FloatButton.Group>
      )}

      {/* Upload Panel */}
      <UploadPanel
        open={uploadOpen}
        onClose={handleCloseUpload}
        initialLng={clickPosition?.lng}
        initialLat={clickPosition?.lat}
        initialName={searchPoi?.name}
        editingLocation={editingLocation}
        onSuccess={handleUploadSuccess}
      />

      {/* Gallery */}
      <FullscreenGallery
        location={selectedLocation}
        open={galleryOpen}
        onClose={handleCloseGallery}
      />

      {/* Gallery admin actions */}
      {galleryOpen && isAdmin && selectedLocation && (
        <div
          style={{
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1001,
            display: 'flex',
            gap: 12,
          }}
        >
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
