import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, message, Popconfirm, Spin } from "antd";
import {
  CalendarOutlined,
  CameraOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ActivityPanel from "../../components/ActivityPanel";
import FullscreenGallery from "../../components/FullscreenGallery";
import MapView from "../../components/MapView/MapView";
import MapTrailAmbient from "../../components/MapTrailAmbient";
import SearchBox from "../../components/MapView/SearchBox";
import UploadPanel from "../../components/UploadPanel";
import { useActivitySocket } from "../../hooks/useActivitySocket";
import {
  deleteLocation,
  getLocationDetail,
  getLocations,
} from "../../api/location";
import { searchPhotos } from "../../api/search";
import { useAuthStore } from "../../store/useAuthStore";
import { useMapStore } from "../../store/useMapStore";
import type { Location, SearchPhotoResult } from "../../types";

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
  const {
    status,
    onlineCount,
    messages: activityMessages,
    sendActivity,
  } = useActivitySocket();

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
  const [photoSearchLoading, setPhotoSearchLoading] = useState(false);
  const [photoSearchTouched, setPhotoSearchTouched] = useState(false);
  const [photoResults, setPhotoResults] = useState<SearchPhotoResult[]>([]);

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

  const focusLabel = searchPoi?.name || selectedLocation?.name || "尚未选择地点";
  const latestDateLabel = latestLocation?.travelDate || "尚未记录";

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
        sendActivity(`查看了 ${location.name}`);
      } catch (err: any) {
        message.error(err.message || "地点详情加载失败");
      }
    },
    [sendActivity, setSelectedLocation],
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

      sendActivity(`定位到 ${name}`);
    },
    [isAdmin, sendActivity],
  );

  const handlePhotoSearch = async (query: string) => {
    const keyword = query.trim();
    if (!keyword) {
      setPhotoSearchTouched(false);
      setPhotoResults([]);
      return;
    }

    setPhotoSearchTouched(true);
    setPhotoSearchLoading(true);
    try {
      const results = await searchPhotos(keyword);
      setPhotoResults(results);
    } catch (err: any) {
      message.error(err.message || "照片搜索失败");
    } finally {
      setPhotoSearchLoading(false);
    }
  };

  const openSearchResult = async (result: SearchPhotoResult) => {
    try {
      const detail = await getLocationDetail(result.locationId);
      setSelectedLocation(detail);
      setGalleryOpen(true);
      sendActivity(`从搜索打开了 ${result.locationName}`);
    } catch (err: any) {
      message.error(err.message || "照片详情加载失败");
    }
  };

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
      sendActivity(`删除了 ${selectedLocation.name}`);
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
    sendActivity("更新了旅行地图");
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
    <div className="home-page">
      <MapTrailAmbient locations={locations} />

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
            {isAdmin && <span>上传</span>}
          </nav>

          <div className="home-search">
            <SearchBox onSelectPoi={handleSearchSelect} />
          </div>

          <div className="home-actions">
            <span className="mode-pill">
              {isAdmin ? "管理员模式" : "公开浏览"}
            </span>
            {isAdmin ? (
              <>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreatePanel}
                  className="header-action"
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

        <section className="home-workspace">
          <aside className="story-panel" aria-label="旅行地图概览">
            <div className="panel-block">
              <span className="panel-label">空间相册</span>
              <h2>地点、照片、时间一起被保存。</h2>
              <p>
                每个坐标都可以成为一个照片 Marker。游客从地图进入记忆，管理员在同一个画布上维护内容。
              </p>
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
              {searchPoi && <small>已定位到地图坐标</small>}
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
              {(photoSearchLoading || photoSearchTouched) && (
                <div className="photo-search-results">
                  {photoSearchLoading && <Spin size="small" />}
                  {!photoSearchLoading && photoResults.length === 0 && (
                    <div className="photo-search-empty">没有找到匹配照片</div>
                  )}
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
                            {result.caption ||
                              result.tags ||
                              result.shotDate ||
                              "匹配照片"}
                          </small>
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <ActivityPanel
              status={status}
              onlineCount={onlineCount}
              messages={activityMessages}
            />

            {isAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreatePanel}
                className="panel-create"
                block
              >
                添加地点
              </Button>
            )}
          </aside>

          <section className="map-stage" aria-label="旅行地图">
            <div className="map-stage-header">
              <div>
                <span>Map Canvas</span>
                <h2>旅行足迹</h2>
              </div>
              {locations.length > 0 && (
                <div className="map-stage-status">
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
