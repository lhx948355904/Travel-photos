# Travel Photo Map 项目设计说明

> 本文档用于帮助后续 AI 或开发者快速理解项目功能、技术栈、架构边界和关键代码位置。当前项目是一个以地图为入口的个人旅行摄影相册：地点以照片 Marker 的形式展示在高德地图上，点击地点可进入全屏照片浏览；管理员登录后可新增、编辑、删除地点并上传照片到腾讯云 COS。

## 1. 项目概览

- 项目名称：Travel Photo Map / 旅行摄影地图
- 项目类型：前后端分离 Web 应用
- 核心目标：把旅行地点、照片、拍摄时间和地理坐标组织为可交互地图相册
- 用户角色：
  - 游客：查看地图地点、搜索地点、打开地点照片画廊
  - 管理员：登录后新增/编辑/删除地点、上传照片、追加照片
- 主要入口：
  - 前端页面：`frontend/src/pages/Home/index.tsx`
  - 后端入口：`backend/src/main/java/com/photomap/PhotoMapApplication.java`
  - Docker 编排：`docker-compose.yml`

## 2. 技术栈

### 前端

- React 18 + TypeScript
- Vite 5
- React Router 6：页面路由，当前有 `/` 和 `/login`
- Ant Design 5：表单、按钮、弹窗、消息、日期选择等 UI
- Zustand：轻量状态管理
- Axios：API 请求封装
- 高德地图 JS API 2.0：地图、Marker、聚合、POI 搜索、自动补全
- `@amap/amap-jsapi-loader`：动态加载高德地图 SDK
- Swiper 11：全屏图片浏览、缩略图、缩放、键盘导航
- Framer Motion：背景轮播与画廊动效
- exifr：读取照片 EXIF 和 GPS 信息
- cos-js-sdk-v5：前端直传腾讯云 COS
- heic2any：依赖已安装，当前代码未明显调用，可用于后续 HEIC 转码
- dayjs：日期处理

### 后端

- Java 17
- Spring Boot 3.2.5
- Spring Web：REST API
- Spring Security：JWT 鉴权与接口访问控制
- Spring Validation：请求参数校验
- MyBatis-Plus 3.5.5：ORM、逻辑删除
- PostgreSQL Driver
- JJWT 0.12.5：JWT 生成和校验
- 腾讯云 COS Java SDK / COS STS：签发临时上传凭证
- Lombok：简化 DTO、实体和配置类

### 数据库与部署

- PostgreSQL 15 + PostGIS
- Docker + Docker Compose
- Nginx：前端静态资源服务与 `/api` 反向代理

## 3. 目录结构与职责

```text
.
├── backend/                         # Spring Boot 后端
│   ├── pom.xml                       # Maven 依赖与构建配置
│   ├── Dockerfile                    # 后端镜像构建
│   └── src/main/
│       ├── java/com/photomap/
│       │   ├── controller/           # REST API 控制器
│       │   ├── service/              # 业务逻辑
│       │   ├── mapper/               # MyBatis-Plus Mapper
│       │   ├── entity/               # 数据库实体
│       │   ├── dto/                  # 请求/响应 DTO
│       │   ├── config/               # 安全、CORS、配置属性
│       │   ├── common/               # 统一响应和异常
│       │   └── util/                 # JWT 工具
│       └── resources/application.yml # 后端运行配置
├── frontend/                         # React + Vite 前端
│   ├── package.json                  # 前端依赖与脚本
│   ├── vite.config.ts                # Vite 配置
│   ├── Dockerfile                    # 前端镜像构建
│   └── src/
│       ├── api/                      # Axios API 封装
│       ├── components/               # 地图、上传、画廊、背景轮播组件
│       ├── hooks/                    # 高德地图、响应式 Hook
│       ├── pages/                    # Home、Login 页面
│       ├── store/                    # Zustand 状态
│       ├── styles/                   # 全局样式
│       ├── types/                    # 前端类型定义
│       └── utils/                    # 图片 URL、坐标转换、COS 上传
├── nginx/default.conf                # Nginx 配置
├── init.sql                          # 数据库初始化脚本
├── docker-compose.yml                # 本地/容器部署编排
├── .env.example                      # 环境变量示例
└── README.md                         # 原始项目说明
```

## 4. 核心功能点

### 地图展示

- 页面入口：`frontend/src/pages/Home/index.tsx`
- 地图组件：`frontend/src/components/MapView/MapView.tsx`
- 地图初始化：`frontend/src/hooks/useAmap.ts`
- 功能：
  - 加载高德地图 JS API 2.0
  - 默认中心点为北京，初始 zoom 为 5
  - 展示所有地点的自定义照片 Marker
  - Marker 使用地点封面缩略图，照片数量大于 1 时显示数量角标
  - 地点超过 20 个时启用 `AMap.MarkerCluster`
  - 地点加载完成后自动计算 bounds 并适配地图视野
  - 管理员点击地图可打开上传/新增地点弹窗，并带入经纬度

### 地点搜索

- 组件：`frontend/src/components/MapView/SearchBox.tsx`
- 高德插件：
  - `AMap.AutoComplete`
  - `AMap.PlaceSearch`
- 功能：
  - 输入关键词后请求高德自动补全
  - 选择建议项后返回 POI 名称、经纬度
  - 管理员选择 POI 后直接打开新增地点弹窗

### 背景轮播

- 组件：`frontend/src/components/BlurredCarousel/index.tsx`
- 功能：
  - 从已有地点的 `coverThumbUrl` 中提取背景图
  - 每 6 秒切换一张
  - 使用 Framer Motion 做淡入与轻微缩放
  - 使用模糊和暗色蒙层作为地图页面背景

### 照片上传与地点创建

- 组件：`frontend/src/components/UploadPanel/index.tsx`
- EXIF Hook：`frontend/src/components/UploadPanel/useExif.ts`
- COS 上传工具：`frontend/src/utils/cosUpload.ts`
- 图片工具：`frontend/src/utils/image.ts`
- 功能：
  - 支持多图选择，限制图片类型和小于 20MB
  - 支持 `.heic` 后缀进入上传列表，但当前未看到实际 HEIC 转码流程
  - 通过 exifr 读取照片 GPS 与拍摄时间
  - EXIF GPS 为 WGS-84，上传前转换为高德地图使用的 GCJ-02
  - 管理员调用后端 `/api/cos/credential` 获取 COS 临时凭证
  - 使用 `cos-js-sdk-v5` 直传文件到 COS
  - 上传成功后生成原图 URL、缩略图 URL、宽高、方向、大小、拍摄日期等元数据
  - 新建地点时调用 `POST /api/locations`
  - 编辑地点时可调用 `POST /api/locations/{id}/photos` 追加照片，并调用 `PUT /api/locations/{id}` 更新地点基础信息

### 全屏画廊

- 组件：`frontend/src/components/FullscreenGallery/index.tsx`
- 功能：
  - 点击地图 Marker 后打开
  - 使用 Swiper 展示地点下所有照片
  - 支持左右箭头、键盘方向键、ESC 关闭
  - 支持图片缩放、底部缩略图导航
  - 顶部展示地点名、当前照片序号、拍摄日期
  - 管理员在画廊中可编辑或删除地点

### 登录与权限

- 登录页：`frontend/src/pages/Login/index.tsx`
- 前端状态：`frontend/src/store/useAuthStore.ts`
- 后端控制器：`backend/src/main/java/com/photomap/controller/AuthController.java`
- 后端服务：`backend/src/main/java/com/photomap/service/AuthService.java`
- JWT 工具：`backend/src/main/java/com/photomap/util/JwtUtil.java`
- 功能：
  - 管理员账号来自环境变量或 `application.yml`
  - 密码使用 BCrypt Hash 验证
  - 登录成功后返回 JWT token
  - 前端将 token 存入 `localStorage`
  - Axios 请求拦截器自动带上 `Authorization: Bearer <token>`

## 5. 前端架构

### 路由

- `frontend/src/App.tsx`
  - `/`：地图主页 `Home`
  - `/login`：管理员登录页 `Login`

### 状态管理

- `frontend/src/store/useAuthStore.ts`
  - 保存 `token` 和 `isAdmin`
  - 从 `localStorage` 初始化登录状态
  - 提供 `setToken` 和 `logout`
- `frontend/src/store/useMapStore.ts`
  - 保存地点列表 `locations`
  - 保存当前选中地点 `selectedLocation`
  - 提供地点列表增删改和选中状态更新方法

### API 封装

- `frontend/src/api/request.ts`
  - Axios 实例
  - 默认 `baseURL` 为 `VITE_API_BASE` 或 `/api`
  - 统一处理后端 `{ code, message, data }` 响应结构
  - 非 `code === 0` 视为错误
  - 响应 HTTP 401 时清理 token 并跳转登录页
- `frontend/src/api/auth.ts`
  - `login`
- `frontend/src/api/location.ts`
  - `getLocations`
  - `getLocationDetail`
  - `createLocation`
  - `updateLocation`
  - `deleteLocation`
  - `addPhotos`
  - `deletePhoto`
- `frontend/src/api/cos.ts`
  - `getCosCredential`

### 前端类型

- `frontend/src/types/index.ts`
  - `Photo`
  - `Location`
  - `PhotoUploadInfo`
  - `CosCredential`
  - `Orientation`

## 6. 后端架构

### 分层结构

- Controller：暴露 REST API，只做请求接收和响应包装
- Service：业务逻辑、事务、DTO/Entity 转换
- Mapper：MyBatis-Plus 数据访问
- Entity：数据库表映射
- DTO：API 请求/响应对象
- Config：安全、CORS、配置属性绑定
- Common：统一响应和全局异常处理

### 统一响应

- 类：`backend/src/main/java/com/photomap/common/ApiResponse.java`
- 成功格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

- 业务异常由 `BusinessException` 抛出，由 `GlobalExceptionHandler` 转成统一响应

### 鉴权

- 配置：`backend/src/main/java/com/photomap/config/WebSecurityConfig.java`
- 无状态 Session：`SessionCreationPolicy.STATELESS`
- CSRF 已关闭
- JWT 从 `Authorization` 请求头读取
- 当前过滤器校验 token 后将用户名写入 request attribute：`currentUser`
- 访问控制：
  - 公开：
    - `POST /api/auth/login`
    - `GET /api/locations/**`
    - `GET /api/photos/**`
  - 需要登录：
    - `GET /api/cos/credential`
    - `POST /api/locations`
    - `PUT /api/locations/**`
    - `DELETE /api/locations/**`
    - `POST /api/locations/**/photos`
    - `DELETE /api/photos/**`

### CORS

- 配置：`backend/src/main/java/com/photomap/config/CorsConfig.java`
- `/api/**` 允许任意来源、常见 HTTP 方法和任意请求头

## 7. 后端 API 清单

### 认证

- `POST /api/auth/login`
  - 请求：`{ username, password }`
  - 响应：`{ token, expiresIn }`

### 地点

- `GET /api/locations`
  - 查询参数：`bbox` 可选，格式为 `minLng,minLat,maxLng,maxLat`
  - 响应：地点摘要列表
- `GET /api/locations/{id}`
  - 响应：地点详情，包含照片列表
- `POST /api/locations`
  - 权限：管理员
  - 请求：地点基础信息 + 照片元数据列表 + `coverIndex`
  - 响应：`{ id }`
- `PUT /api/locations/{id}`
  - 权限：管理员
  - 请求：可部分更新地点名、描述、经纬度、旅行日期、封面照片 ID
- `DELETE /api/locations/{id}`
  - 权限：管理员
  - 逻辑删除地点
- `POST /api/locations/{id}/photos`
  - 权限：管理员
  - 给已有地点追加照片

### 照片

- `DELETE /api/photos/{id}`
  - 权限：管理员
  - 逻辑删除照片

### COS

- `GET /api/cos/credential`
  - 权限：管理员
  - 返回腾讯云 COS 临时上传凭证
  - 后端限制允许上传前缀为 `photos/yyyy/MM/*`
  - 凭证有效期当前为 1800 秒

## 8. 数据模型

数据库初始化脚本：`init.sql`

### location 表

用途：保存旅行地点。

关键字段：

- `id`：主键
- `name`：地点名称
- `description`：描述
- `longitude` / `latitude`：经纬度
- `geom`：PostGIS geography point，由触发器根据经纬度生成
- `cover_photo_id`：封面照片 ID
- `travel_date`：旅行日期
- `created_at` / `updated_at`：时间戳
- `deleted`：逻辑删除标记

索引：

- `idx_location_geom`：GIST 空间索引
- `idx_location_deleted`：逻辑删除查询索引

### photo 表

用途：保存照片元数据，真实图片文件在腾讯云 COS。

关键字段：

- `id`：主键
- `location_id`：所属地点
- `cos_key`：COS 对象 Key
- `url`：原图 URL
- `thumb_url`：缩略图 URL
- `width` / `height`：图片尺寸
- `orientation`：横图、竖图或方图
- `file_size`：文件大小
- `shot_date`：拍摄日期
- `sort_order`：地点内排序
- `created_at`
- `deleted`

索引：

- `idx_photo_location`
- `idx_photo_deleted`

## 9. 关键业务流程

### 游客查看照片

1. 进入 `/`
2. `Home` 调用 `getLocations()`
3. 后端 `LocationController.list()` 返回地点摘要
4. `MapView` 创建照片 Marker
5. 用户点击 Marker
6. 当前代码直接用 `selectedLocation` 打开 `FullscreenGallery`

注意：地点摘要 `LocationVO` 不包含 `photos` 字段，而画廊依赖 `location.photos`。如果当前运行中点击 Marker 没有照片，通常需要在 Marker 点击时调用 `getLocationDetail(id)` 后再打开画廊。

### 管理员新增地点并上传照片

1. 管理员登录，前端保存 JWT
2. 点击地图或搜索 POI，打开 `UploadPanel`
3. 选择照片，前端读取 EXIF
4. 若存在 GPS，则 WGS-84 转 GCJ-02 并填入经纬度
5. 点击开始上传
6. 前端请求 `/api/cos/credential`
7. 后端通过腾讯云 STS 签发临时凭证
8. 前端直传 COS
9. 前端生成照片元数据和缩略图 URL
10. 提交表单到 `POST /api/locations`
11. 后端创建地点、创建照片记录、设置封面照片
12. 前端刷新地点列表

### 管理员编辑地点

1. 在画廊中点击编辑
2. 打开 `UploadPanel`，传入 `editingLocation`
3. 可追加新照片
4. 调用 `POST /api/locations/{id}/photos`
5. 调用 `PUT /api/locations/{id}` 更新地点基础字段

注意：当前编辑提交只更新名称、描述、旅行日期，没有提交经纬度；如果需要支持编辑坐标，应同步修改前端提交参数。

### 管理员删除地点/照片

- 删除地点：`DELETE /api/locations/{id}`，MyBatis-Plus 逻辑删除
- 删除照片：`DELETE /api/photos/{id}`，MyBatis-Plus 逻辑删除
- 当前删除只影响数据库记录，不会删除 COS 上的对象

## 10. 环境变量与配置

### 后端环境变量

由 `application.yml` 读取：

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET`
- `COS_REGION`
- `COS_CDN_DOMAIN`
- `JWT_SECRET`
- `JWT_EXPIRE_SECONDS`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`

### 前端环境变量

代码中使用：

- `VITE_API_BASE`：API Base URL，默认 `/api`
- `VITE_AMAP_KEY`：高德地图 Web JS API Key
- `VITE_AMAP_SECURITY_CODE`：高德安全密钥

### 安全提醒

- `.env` 不应提交到仓库
- `.env.example` 应仅保留占位符，不要放真实腾讯云 COS Key
- `JWT_SECRET` 生产环境必须换成高强度随机字符串
- 管理员默认账号和默认密码 Hash 只能用于本地开发
- COS 永久密钥只应保存在后端环境变量中，前端只使用 STS 临时凭证

## 11. 部署方式

### Docker Compose

编排文件：`docker-compose.yml`

服务：

- `db`
  - 镜像：`postgis/postgis:15-3.4`
  - 初始化脚本：`init.sql`
  - 端口：`5432:5432`
- `backend`
  - 构建目录：`./backend`
  - 端口：`8080:8080`
  - 依赖数据库 healthcheck
- `frontend`
  - 构建目录：`./frontend`
  - 端口：`80:80`

启动：

```bash
docker-compose up -d
```

访问：

- 前端：`http://localhost`
- 后端 API：`http://localhost:8080/api`

### 本地开发

后端：

```bash
cd backend
mvn spring-boot:run
```

前端：

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器默认：

```text
http://localhost:3000
```

## 12. 当前实现中的注意点

- README 在当前 PowerShell 输出中出现编码乱码，建议确认文件保存编码为 UTF-8。
- 代码中部分中文字符串在终端输出中也显示为乱码，实际编译前应确认源文件编码。
- `Home` 中点击 Marker 后没有调用 `getLocationDetail(id)`，但 `FullscreenGallery` 需要 `photos`；建议补充详情请求。
- `AuthService.login()` 返回的 `expiresIn` 固定为 `86400L`，没有直接读取 `JwtProperties.expireSeconds`。
- `WebSecurityConfig.JwtAuthenticationFilter` 只设置 request attribute，没有创建 Spring Security `Authentication`；在部分 Spring Security 配置下，`.authenticated()` 可能无法识别该请求为已认证，建议改为设置 `SecurityContextHolder`。
- `PhotoService` 注入了 `LocationMapper` 但当前未使用。
- 删除照片/地点不会删除 COS 文件，长期运行可能产生对象存储垃圾。
- `CosProperties.cdnDomain` 已配置但当前前端上传 URL 主要使用 COS 返回地址，未明显使用 CDN 域名拼接。
- `LocationMapper.selectByBbox()` 当前使用经纬度 between 查询，没有使用 PostGIS 空间索引；如果地点量变大，可改为 PostGIS 查询。
- 前端 `UploadPanel` 对 `.heic` 放行，但当前没有显式调用 `heic2any` 转码。
- `frontend/Dockerfile` 中有 `COPY nginx/default.conf /etc/nginx/conf.d/default.conf`，但 Docker Compose 的前端 build context 是 `./frontend`；如果 `frontend/nginx/default.conf` 不存在，构建可能失败。可将 `nginx/default.conf` 移入前端构建上下文，或调整 build context / Dockerfile 路径。

## 13. 适合后续 AI 优先查看的文件

- 全局说明：`README.md`、`design.md`
- 前端入口：`frontend/src/App.tsx`、`frontend/src/pages/Home/index.tsx`
- 地图：`frontend/src/hooks/useAmap.ts`、`frontend/src/components/MapView/MapView.tsx`
- 搜索：`frontend/src/components/MapView/SearchBox.tsx`
- 上传：`frontend/src/components/UploadPanel/index.tsx`、`frontend/src/components/UploadPanel/useExif.ts`
- 图片/COS 工具：`frontend/src/utils/image.ts`、`frontend/src/utils/cosUpload.ts`
- API：`frontend/src/api/*.ts`
- 后端接口：`backend/src/main/java/com/photomap/controller/*.java`
- 后端业务：`backend/src/main/java/com/photomap/service/*.java`
- 安全配置：`backend/src/main/java/com/photomap/config/WebSecurityConfig.java`
- 数据模型：`init.sql`、`backend/src/main/java/com/photomap/entity/*.java`
- 部署：`docker-compose.yml`、`nginx/default.conf`、`backend/Dockerfile`、`frontend/Dockerfile`

## 14. 后续开发建议

- 修复 Marker 点击后画廊缺少照片详情的问题。
- 正确设置 Spring Security `Authentication`，确保受保护接口能稳定识别 JWT 登录态。
- 统一文件编码为 UTF-8，避免中文乱码。
- 替换 `.env.example` 中的真实密钥为占位符。
- 使用 `CosProperties.cdnDomain` 生成公开访问 URL，或明确保留 COS 默认域名策略。
- 删除照片或地点时增加 COS 对象清理策略。
- 支持编辑地点经纬度和封面照片。
- 为后端 Service 和 Controller 添加基础测试。
- 为前端上传、地图 Marker、画廊详情加载流程添加回归测试或最小 E2E 测试。
