# 旅行摄影地图（Travel Photo Map）

一个以地图为核心交互载体的个人旅行摄影相册，把"去过的每一个地方"以照片封面的形式钉在地图上。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Ant Design 5 + 高德地图 JS API 2.0
- **后端**：Spring Boot 3.2 + Java 17 + MyBatis-Plus
- **数据库**：PostgreSQL 15 + PostGIS
- **对象存储**：腾讯云 COS
- **部署**：Docker + Docker Compose

## 快速开始

### 1. 环境准备

确保已安装：
- Docker & Docker Compose
- Node.js 20+（本地开发前端）
- Java 17 + Maven（本地开发后端）

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入您的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 数据库（默认即可）
DB_USER=photomap
DB_PASSWORD=photomap123

# 腾讯云 COS（必须配置）
COS_SECRET_ID=your-cos-secret-id
COS_SECRET_KEY=your-cos-secret-key
COS_BUCKET=your-bucket-name
COS_REGION=ap-guangzhou
COS_CDN_DOMAIN=https://your-cdn-domain.com

# JWT（默认即可，生产环境请修改）
JWT_SECRET=your-jwt-secret

# 管理员账号（默认即可）
ADMIN_USERNAME=admin
# 默认密码 admin123，如需修改请生成新的 BCrypt hash
ADMIN_PASSWORD_HASH=$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

### 3. 高德地图 Key（已配置）

前端 `.env` 中已配置：
- Key：`29cafa992646cf1f2492c25aa5916204`
- 安全密钥：`7575440d5c052f1d0862692e2c7b8cc6`

> **重要**：请在[高德控制台](https://console.amap.com/dev/key/app)为该 Key 添加 `Web端(JS API)` 的白名单域名，否则地图无法正常加载。

### 4. 启动项目

#### 方式一：Docker Compose（推荐）

```bash
docker-compose up -d
```

访问：
- 前端：`http://localhost`
- 后端 API：`http://localhost:8080/api`

#### 方式二：本地开发

**启动数据库：**
```bash
docker-compose up -d db
```

**启动后端：**
```bash
cd backend
mvn spring-boot:run
```

**启动前端：**
```bash
cd frontend
npm install
npm run dev
```

前端开发服务器：`http://localhost:3000`

### 5. 管理员登录

- 用户名：`admin`
- 密码：`admin123`

登录后可上传照片、添加地点。

## 项目结构

```
travel-photo-map/
├── docker-compose.yml      # Docker 部署配置
├── init.sql                # 数据库初始化脚本
├── .env.example            # 环境变量示例
├── backend/                # Spring Boot 后端
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/java/com/photomap/
├── frontend/               # React + Vite 前端
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
└── nginx/
    └── default.conf        # Nginx 反向代理配置
```

## 核心功能

1. **地图展示** - 全屏高德地图，自定义封面照片 Marker
2. **背景轮播** - Ken Burns 效果模糊背景
3. **地点搜索** - 高德 POI 搜索 + 自动补全
4. **照片上传** - 支持 EXIF GPS 读取、COS 直传
5. **全屏轮播** - Swiper 实现，支持缩放、键盘导航
6. **点聚合** - 地点数量多自动启用 MarkerCluster

## 腾讯云 COS 配置指南

### 1. 创建存储桶

1. 登录[腾讯云 COS 控制台](https://console.cloud.tencent.com/cos)
2. 创建存储桶，选择地域（如广州 `ap-guangzhou`）
3. 访问权限选择「私有读写」

### 2. 配置 CDN 加速（可选）

1. 在存储桶详情页开启 CDN 加速
2. 获取 CDN 加速域名，填入 `COS_CDN_DOMAIN`

### 3. 获取 API 密钥

1. 进入[访问管理 - API 密钥管理](https://console.cloud.tencent.com/cam/capi)
2. 创建密钥，获取 `SecretId` 和 `SecretKey`
3. 填入 `.env` 的 `COS_SECRET_ID` 和 `COS_SECRET_KEY`

### 4. 配置 CAM 子账号（推荐）

为安全起见，建议创建子账号专门用于 STS 临时凭证：
- 权限策略：`QcloudCOSDataWriteToPrefix`（限制只写指定前缀）
- 或自定义策略，限制 `sts:AssumeRole` 和 COS 上传权限

## 高德地图 Key 配置

当前已配置的 Key：`29cafa992646cf1f2492c25aa5916204`

请确保：
1. 在[高德控制台](https://console.amap.com/dev/key/app)找到该 Key
2. 添加 `Web端(JS API)` 的白名单域名
3. 本地开发可添加 `localhost` 或留空（不限制）
4. 生产环境请添加您的真实域名

## 注意事项

1. **坐标系转换**：EXIF GPS 为 WGS-84，已自动转换为高德 GCJ-02
2. **HEIC 兼容**：iPhone HEIC 照片建议在前端转码后上传
3. **图片处理**：利用 COS 数据万象生成缩略图，URL 后缀 `?imageMogr2/thumbnail/200x/format/webp`
4. **安全**：COS 使用 STS 临时凭证，前端不接触永久密钥

## 许可证

MIT
