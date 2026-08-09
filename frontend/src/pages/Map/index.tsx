import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, message, Popconfirm, Skeleton, Spin } from "antd";
import {
  CalendarOutlined,
  CameraOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ActivityPanel from "../../components/ActivityPanel";
import FullscreenGallery from "../../components/FullscreenGallery";
import MapView from "../../components/MapView/MapView";
import SearchBox from "../../components/MapView/SearchBox";
import UploadPanel from "../../components/UploadPanel";
import { useActivitySocket } from "../../hooks/useActivitySocket";
import {
  deleteLocation,
  getLocationDetail,
  getLocations,
} from "../../api/location";
import {
  getPhotoIndexStatus,
  rebuildPhotoIndex,
  searchPhotosWithRag,
} from "../../api/search";
import { useAuthStore } from "../../store/useAuthStore";
import { useMapStore } from "../../store/useMapStore";
import type {
  Location,
  PhotoIndexStatus,
  RagPhotoSearchResponse,
  SearchPhotoResult,
} from "../../types";
import { getPhotoRagModeLabel } from "./photoRagPresentation";

const PHOTO_QUERY_EXAMPLES = [
  "找出所有海边日落",
  "哪次旅行拍过古建筑？",
  "有没有下雨天拍摄的照片？",
];

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
  const [photoQuery, setPhotoQuery] = useState("");
  const [photoSearchError, setPhotoSearchError] = useState("");
  const [photoRagResult, setPhotoRagResult] =
    useState<RagPhotoSearchResponse | null>(null);
  const [initialPhotoId, setInitialPhotoId] = useState<number | null>(null);
  const [photoIndexStatus, setPhotoIndexStatus] =
    useState<PhotoIndexStatus | null>(null);
  const [indexActionLoading, setIndexActionLoading] = useState(false);

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
  const focusLabel = searchPoi?.name || selectedLocation?.name || "未选择地点";
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

  const fetchPhotoIndexStatus = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setPhotoIndexStatus(await getPhotoIndexStatus());
    } catch {
      setPhotoIndexStatus(null);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setPhotoIndexStatus(null);
      return;
    }
    fetchPhotoIndexStatus();
    const timer = window.setInterval(fetchPhotoIndexStatus, 10000);
    return () => window.clearInterval(timer);
  }, [fetchPhotoIndexStatus, isAdmin]);

  const handleMarkerClick = useCallback(
    async (location: Location) => {
      try {
        const detail = await getLocationDetail(location.id);
        setSelectedLocation(detail);
        setInitialPhotoId(null);
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
    setPhotoQuery(query);
    if (!keyword) {
      setPhotoSearchTouched(false);
      setPhotoRagResult(null);
      setPhotoSearchError("");
      return;
    }
    if (keyword.length < 2) {
      setPhotoSearchTouched(true);
      setPhotoRagResult(null);
      setPhotoSearchError("问题至少需要 2 个字符");
      return;
    }

    setPhotoSearchTouched(true);
    setPhotoSearchLoading(true);
    setPhotoSearchError("");
    try {
      setPhotoRagResult(await searchPhotosWithRag(keyword));
    } catch (err: any) {
      setPhotoRagResult(null);
      setPhotoSearchError(err.message || "照片搜索失败，请稍后重试");
    } finally {
      setPhotoSearchLoading(false);
    }
  };

  const handlePhotoQueryChange = (value: string) => {
    setPhotoQuery(value);
    if (!value.trim()) {
      setPhotoSearchTouched(false);
      setPhotoRagResult(null);
      setPhotoSearchError("");
    }
  };

  const handleExampleQuery = (query: string) => {
    setPhotoQuery(query);
    handlePhotoSearch(query);
  };

  const openSearchResult = async (result: SearchPhotoResult) => {
    try {
      const detail = await getLocationDetail(result.locationId);
      setSelectedLocation(detail);
      setFocusPosition({
        name: detail.name,
        lng: detail.longitude,
        lat: detail.latitude,
      });
      setInitialPhotoId(result.photoId);
      setGalleryOpen(true);
      sendActivity(`从搜索打开了 ${result.locationName}`);
    } catch (err: any) {
      message.error(err.message || "照片详情加载失败");
    }
  };

  const handleCloseGallery = () => {
    setGalleryOpen(false);
    setSelectedLocation(null);
    setInitialPhotoId(null);
  };

  const handleRebuildIndex = async (scope: "missing" | "all") => {
    setIndexActionLoading(true);
    try {
      const result = await rebuildPhotoIndex(scope);
      message.success(
        result.queued > 0
          ? `已将 ${result.queued} 张照片加入 AI 索引队列`
          : "当前没有需要处理的照片",
      );
      await fetchPhotoIndexStatus();
    } catch (err: any) {
      message.error(err.message || "AI 索引任务启动失败");
    } finally {
      setIndexActionLoading(false);
    }
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

  const indexPercent = photoIndexStatus?.total
    ? Math.round((photoIndexStatus.ready / photoIndexStatus.total) * 100)
    : 0;
  const searchModeLabel = getPhotoRagModeLabel(photoRagResult);

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
            <Button icon={<GlobalOutlined />} onClick={() => navigate("/universe")}>
              照片宇宙
            </Button>
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

            <section className="map-focus-card" aria-label="当前焦点">
              <span>当前焦点</span>
              <strong>{focusLabel}</strong>
              {searchPoi && <small>已定位到地图坐标，可继续添加照片地点。</small>}
            </section>

            <section className="map-photo-search-card">
              <div className="photo-search-heading">
                <span className="map-section-label">AI Photo Search</span>
                <span className="photo-search-heading__status">
                  <RobotOutlined />
                  单轮问答
                </span>
              </div>
              <p className="photo-search-intro">
                用自然语言提问，回答只引用这本旅行相册中的照片。
              </p>
              <Input.Search
                allowClear
                enterButton={<SearchOutlined />}
                placeholder="例如：哪次旅行拍到了海边日落？"
                value={photoQuery}
                maxLength={200}
                onChange={(event) => handlePhotoQueryChange(event.target.value)}
                onSearch={handlePhotoSearch}
                aria-label="向旅行照片提问"
                aria-busy={photoSearchLoading}
              />
              {!photoSearchTouched && (
                <div className="photo-query-examples" aria-label="示例问题">
                  {PHOTO_QUERY_EXAMPLES.map((query) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => handleExampleQuery(query)}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              )}
              {(photoSearchLoading || photoSearchTouched) && (
                <div className="photo-search-results" aria-live="polite">
                  {photoSearchLoading && (
                    <div className="photo-search-skeleton">
                      <span>正在理解问题并检索照片…</span>
                      <Skeleton
                        active
                        title={{ width: "58%" }}
                        paragraph={{ rows: 2, width: ["100%", "72%"] }}
                      />
                    </div>
                  )}
                  {!photoSearchLoading && photoSearchError && (
                    <div className="photo-search-error" role="alert">
                      <span>{photoSearchError}</span>
                      <Button
                        size="small"
                        onClick={() => handlePhotoSearch(photoQuery)}
                      >
                        重试
                      </Button>
                    </div>
                  )}
                  {!photoSearchLoading && photoRagResult && (
                    <>
                      <div className="photo-rag-answer">
                        <div className="photo-rag-answer__meta">
                          <strong>{searchModeLabel}</strong>
                          <span>
                            已索引 {photoRagResult.indexCoverage.ready}/
                            {photoRagResult.indexCoverage.total}
                          </span>
                        </div>
                        {photoRagResult.answer && (
                          <p>{photoRagResult.answer}</p>
                        )}
                        {photoRagResult.warning && (
                          <small>{photoRagResult.warning}</small>
                        )}
                      </div>
                      {photoRagResult.evidence.length === 0 && (
                        <div className="photo-search-empty">
                          暂时没有可作为证据的照片
                        </div>
                      )}
                    </>
                  )}
                  {!photoSearchLoading &&
                    photoRagResult?.evidence.map((result, index) => (
                      <button
                        key={result.photoId}
                        type="button"
                        className="photo-result"
                        onClick={() => openSearchResult(result)}
                      >
                        <img
                          src={result.thumbUrl || result.url}
                          alt={
                            result.caption || `${result.locationName}的匹配照片`
                          }
                        />
                        <span>
                          <strong>
                            <em>{index + 1}</em>
                            {result.locationName}
                          </strong>
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
              {isAdmin && (
                <div className="photo-index-admin" aria-label="AI 照片索引状态">
                  <div className="photo-index-admin__summary">
                    <span>
                      AI 索引
                      {photoIndexStatus?.providerReady === false && (
                        <small>未就绪</small>
                      )}
                    </span>
                    <strong>
                      {photoIndexStatus
                        ? `${photoIndexStatus.ready}/${photoIndexStatus.total}`
                        : "加载中"}
                    </strong>
                  </div>
                  <div
                    className="photo-index-progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={indexPercent}
                  >
                    <span style={{ width: `${indexPercent}%` }} />
                  </div>
                  {photoIndexStatus && (
                    <p>
                      {photoIndexStatus.pending + photoIndexStatus.processing} 张等待，
                      {photoIndexStatus.failed} 张失败
                    </p>
                  )}
                  <div className="photo-index-admin__actions">
                    <Button
                      size="small"
                      icon={<SyncOutlined />}
                      loading={indexActionLoading}
                      onClick={() => handleRebuildIndex("missing")}
                    >
                      构建缺失索引
                    </Button>
                    <Popconfirm
                      title="重建全部 AI 索引？"
                      description="会重新调用模型分析所有照片，可能消耗免费额度。"
                      okText="开始重建"
                      cancelText="取消"
                      onConfirm={() => handleRebuildIndex("all")}
                    >
                      <Button size="small" disabled={indexActionLoading}>
                        重建全部
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              )}
            </section>

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
        initialPhotoId={initialPhotoId}
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
