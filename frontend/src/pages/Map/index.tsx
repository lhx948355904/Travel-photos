import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, message, Popconfirm, Spin } from "antd";
import {
  CalendarOutlined,
  CameraOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import FullscreenGallery from "../../components/FullscreenGallery";
import MapView from "../../components/MapView/MapView";
import SearchBox from "../../components/MapView/SearchBox";
import UploadPanel from "../../components/UploadPanel";
import {
  deleteLocation,
  getLocationDetail,
  getLocations,
} from "../../api/location";
import { useAuthStore } from "../../store/useAuthStore";
import { useMapStore } from "../../store/useMapStore";
import type { Location } from "../../types";

const Map = () => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const logout = useAuthStore((state) => state.logout);
  const {
    locations,
    setLocations,
    selectedLocation,
    setSelectedLocation,
    resetMap,
  } = useMapStore();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [clickPosition, setClickPosition] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [searchPoi, setSearchPoi] = useState<{
    name: string;
    lng: number;
    lat: number;
  } | null>(null);
  const [focusPosition, setFocusPosition] = useState<{
    name: string;
    lng: number;
    lat: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const totalPhotos = useMemo(
    () =>
      locations.reduce((sum, location) => sum + (location.photoCount || 0), 0),
    [locations],
  );

  const latestLocation = useMemo(() => {
    return [...locations]
      .filter((location) => location.travelDate)
      .sort((a, b) => String(b.travelDate).localeCompare(String(a.travelDate)))[0];
  }, [locations]);

  const hasLocations = locations.length > 0;
  const latestDateLabel = latestLocation?.travelDate || "暂无记录";

  const fetchLocations = useCallback(async () => {
    setLocationLoading(true);
    try {
      const data = await getLocations();
      setLocations(data);
    } catch (err: any) {
      message.error(err.message || "地点列表加载失败");
    } finally {
      setLocationLoading(false);
    }
  }, [setLocations]);

  useEffect(() => {
    fetchLocations();
    return () => resetMap();
  }, [fetchLocations, resetMap]);

  const handleMarkerClick = useCallback(
    async (location: Location) => {
      try {
        const detail = await getLocationDetail(location.id);
        setSelectedLocation(detail);
        setGalleryOpen(true);
      } catch (err: any) {
        message.error(err.message || "地点详情加载失败");
      }
    },
    [setSelectedLocation],
  );

  const handleMapClick = useCallback(
    (lng: number, lat: number) => {
      if (!isAdmin) return;
      setClickPosition({ lng, lat });
      setSearchPoi(null);
      setEditingLocation(null);
      setUploadOpen(true);
    },
    [isAdmin],
  );

  const handleSearchSelect = useCallback(
    (name: string, lng: number, lat: number) => {
      setSearchPoi({ name, lng, lat });
      setClickPosition({ lng, lat });
      setFocusPosition({ name, lng, lat });

      if (isAdmin) {
        setEditingLocation(null);
        setUploadOpen(true);
      }
    },
    [isAdmin],
  );

  const handleCloseGallery = () => {
    setGalleryOpen(false);
    setSelectedLocation(null);
  };

  const handleEditLocation = () => {
    if (!selectedLocation || !isAdmin) return;
    setEditingLocation(selectedLocation);
    setClickPosition({
      lng: selectedLocation.longitude,
      lat: selectedLocation.latitude,
    });
    setSearchPoi(null);
    setGalleryOpen(false);
    setUploadOpen(true);
  };

  const handleDeleteLocation = async () => {
    if (!selectedLocation || !isAdmin) return;
    try {
      await deleteLocation(selectedLocation.id);
      message.success("删除成功");
      setGalleryOpen(false);
      setSelectedLocation(null);
      fetchLocations();
    } catch (err: any) {
      message.error(err.message || "删除失败");
    }
  };

  const handleUploadSuccess = async (location?: {
    name: string;
    lng: number;
    lat: number;
  }) => {
    await fetchLocations();
    if (location) {
      setSearchPoi(location);
      setFocusPosition(location);
    }
  };

  const handleCloseUpload = () => {
    setUploadOpen(false);
    setEditingLocation(null);
    setClickPosition(null);
  };

  const openCreatePanel = () => {
    if (!isAdmin) {
      navigate("/login");
      return;
    }

    setEditingLocation(null);
    setClickPosition(
      searchPoi ? { lng: searchPoi.lng, lat: searchPoi.lat } : null,
    );
    setUploadOpen(true);
  };

  const handleLogout = () => {
    logout();
    message.success("已退出管理员模式");
  };

  return (
    <div className="map-page">
      <main className="map-app-shell">
        <header className="map-topbar">
          <button
            type="button"
            className="map-brand"
            onClick={() => navigate("/")}
            aria-label="返回 Lumora 首页"
          >
            <span className="map-brand-logo">Lumora</span>
            <span className="map-titlebar">
              <span>Spatial Archive</span>
              <strong>旅行摄影地图</strong>
            </span>
          </button>

          <div className="map-topbar-search">
            <SearchBox onSelectPoi={handleSearchSelect} />
          </div>

          <div className="map-topbar-actions">
            <span className="map-mode-pill">
              {isAdmin ? "管理员模式" : "公开浏览"}
            </span>
            {isAdmin ? (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreatePanel}
                  className="map-primary-action"
                >
                  添加地点
                </Button>
                <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                  退出
                </Button>
              </>
            ) : (
              <Button icon={<LoginOutlined />} onClick={() => navigate("/login")}>
                管理登录
              </Button>
            )}
          </div>
        </header>

        <section className="map-workspace">
          <aside className="map-side-panel" aria-label="旅行地图概览">
            <section className="map-summary-card">
              <span className="map-section-label">Map Memory</span>
              <h2>把每次抵达，安静地放回地图里</h2>
              <p>
                地点、照片和旅行时间被收进同一张空间画布。浏览者从地图进入记忆，管理员在这里维护照片和故事。
              </p>
            </section>

            <div className="map-stats-grid" aria-label="地图统计">
              <div className="map-stat-card">
                <EnvironmentOutlined />
                <span>地点</span>
                <strong>{locations.length}</strong>
              </div>
              <div className="map-stat-card">
                <CameraOutlined />
                <span>照片</span>
                <strong>{totalPhotos}</strong>
              </div>
              <div className="map-stat-card map-stat-card-wide">
                <CalendarOutlined />
                <span>最近旅程</span>
                <strong>{latestDateLabel}</strong>
              </div>
            </div>

            {isAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreatePanel}
                className="map-panel-create"
                block
              >
                添加地点
              </Button>
            )}
          </aside>

          <section className="map-canvas-panel" aria-label="旅行地图">
            <div className="map-canvas-header">
              <div>
                <span className="map-section-label">Map Canvas</span>
                <h2>旅行足迹</h2>
              </div>
              {hasLocations && (
                <div className="map-canvas-status">
                  <EnvironmentOutlined />
                  <span>{locations.length} 个地点</span>
                </div>
              )}
            </div>

            <div className="map-shell">
              {locationLoading && (
                <div className="map-loading">
                  <Spin />
                </div>
              )}
              {!locationLoading && !hasLocations && (
                <div className="map-empty-state">
                  <EnvironmentOutlined />
                  <h3>还没有旅行地点</h3>
                  <p>
                    {isAdmin
                      ? "点击地图或搜索地点后，可以添加第一组照片。"
                      : "管理员添加地点后，照片会出现在这张地图上。"}
                  </p>
                  {isAdmin && (
                    <Button type="primary" onClick={openCreatePanel}>
                      添加地点
                    </Button>
                  )}
                </div>
              )}
              <MapView
                locations={locations}
                onMarkerClick={handleMarkerClick}
                onMapClick={handleMapClick}
                focusPosition={focusPosition}
                canCreateLocation={isAdmin}
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

      {isAdmin && galleryOpen && selectedLocation && (
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
  );
};

export default Map;
