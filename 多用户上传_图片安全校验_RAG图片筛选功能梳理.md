# 多用户上传、图片安全校验与 RAG 图片筛选功能梳理

> 本文档结合当前 `Travel Photo Map / 旅行摄影地图` 项目，梳理截图与需求备注中的功能，并给出后续开发方案。
>
> 当前目标是：把“单管理员维护公共旅行相册”升级为“每个注册用户都有自己的私有旅行摄影地图”，并为图片安全校验与 RAG 图片语义筛选预留清晰的后端设计。

## 1. 先给结论

当前项目已经具备这些基础能力：

- 地图展示旅行地点。
- 点击地点查看照片。
- 管理员登录。
- 管理员上传照片、创建地点、编辑地点、删除地点。
- 后端把图片上传到腾讯云 COS。
- 后端使用 JWT 保护部分管理接口。

但截图备注中提出的功能，当前还没有完整实现：

- 还没有普通用户注册功能。
- 还没有“每个用户只能看到自己的照片”的数据隔离。
- 还没有真正的图片内容安全审核。
- 还没有 RAG / 向量检索 / 语义搜索图片能力。

推荐后续把功能拆成 3 个阶段实现：

1. 第一阶段：增加用户注册登录和用户数据隔离。
2. 第二阶段：增加图片安全校验，确保只有安全图片能进入相册。
3. 第三阶段：增加图片描述、标签、向量化和 RAG 搜索能力。

## 2. 截图与备注中的功能目标

图片备注里有 3 个核心需求：

### 2.1 面向不同用户上传照片

原备注：

> 做成面向不同用户，每个用户都可以上传自己的照片旅行行程，而不是做成管理员。每个人只能看到自己的上传，上传时就关注注册。增加注册功能。

整理成产品语言：

- 用户打开网站后，可以注册自己的账号。
- 用户登录后，可以上传自己的旅行地点和照片。
- 用户 A 只能看到用户 A 自己上传的地点和照片。
- 用户 B 只能看到用户 B 自己上传的地点和照片。
- 管理员不再是唯一上传者，普通用户也能维护自己的旅行地图。

这意味着项目要从“管理员模式”变成“多用户模式”。

### 2.2 图片安全校验

原备注：

> 如何做图片安全校验，只允许用户上传安全图片。可以通过大模型筛选吗？

整理成产品语言：

- 上传图片时，不只看文件后缀，还要确认它真的是图片。
- 损坏图片、伪装成图片的脚本、超大图片、不合规内容都应该被拦截。
- 可以引入图片内容审核服务或多模态大模型，判断图片是否安全。
- 审核未通过的图片不能展示给用户，也不应该进入正常相册。

这里的“安全”包含两层：

- 技术安全：文件本身不能攻击系统。
- 内容安全：图片内容不能违规或不适合展示。

### 2.3 结合 RAG 筛选对应图片

原备注：

> 结合 RAG 筛选对应图片

整理成产品语言：

- 用户可以用自然语言搜索自己的图片，例如：
  - “找一下海边日落的照片”
  - “我在寺庙拍的照片”
  - “雪山和湖泊”
  - “2026 年春天拍的花”
- 系统不只是按文件名查，而是理解图片内容、地点、时间、描述和标签。
- 搜索结果必须仍然遵守用户隔离：只能返回当前登录用户自己的图片。

## 3. 当前项目现状

### 3.1 当前项目是什么

当前项目是一个前后端分离的旅行摄影地图：

- 前端：React + TypeScript + Vite + Ant Design + 高德地图。
- 后端：Spring Boot + Spring Security + JWT + MyBatis-Plus。
- 数据库：PostgreSQL + PostGIS。
- 图片存储：腾讯云 COS。

核心体验是：

1. 地图上显示地点 Marker。
2. Marker 使用地点封面图。
3. 点击 Marker 打开全屏照片画廊。
4. 管理员登录后可以新增、编辑、删除地点和照片。

从当前截图也能看到：

- 顶部是搜索框和“管理员登录”入口。
- 左侧是地点、照片、最近旅程等统计。
- 中间是地图画布。
- 当前访问身份显示为“游客”。

### 3.2 当前鉴权方式

当前登录入口在：

- 前端：`frontend/src/pages/Login/index.tsx`
- 前端状态：`frontend/src/store/useAuthStore.ts`
- 后端控制器：`backend/src/main/java/com/photomap/controller/AuthController.java`
- 后端服务：`backend/src/main/java/com/photomap/service/AuthService.java`
- JWT 工具：`backend/src/main/java/com/photomap/util/JwtUtil.java`

当前逻辑是：

1. 用户访问 `/login`。
2. 输入管理员账号和密码。
3. 后端拿请求里的用户名，和配置文件里的 `ADMIN_USERNAME` 对比。
4. 后端用 BCrypt 校验密码哈希。
5. 登录成功后返回 JWT。
6. 前端把 token 存进 `localStorage`。
7. 后续请求自动带上 `Authorization: Bearer <token>`。

问题是：当前没有用户表，也没有注册接口。

也就是说，当前系统只有一个配置出来的管理员账号，不支持普通用户注册。

### 3.3 当前权限控制方式

权限配置主要在：

- `backend/src/main/java/com/photomap/config/WebSecurityConfig.java`

当前规则大致是：

- `POST /api/auth/login`：允许所有人访问。
- `GET /api/locations/**`：允许所有人访问。
- `GET /api/photos/**`：允许所有人访问。
- `POST /api/locations`：必须登录。
- `PUT /api/locations/**`：必须登录。
- `DELETE /api/locations/**`：必须登录。
- `POST /api/locations/**/photos`：必须登录。
- `POST /api/cos/upload`：必须登录。

这说明当前项目是“游客可看，管理员可改”的模式。

如果要做到“每个人只能看到自己的上传”，就不能继续让 `GET /api/locations/**` 完全公开。至少在私有相册模式下，地点列表、地点详情、图片列表都应该要求登录，并且按当前用户过滤。

### 3.4 当前数据表结构

当前主要有两张表：

- `location`：保存旅行地点。
- `photo`：保存照片元数据。

简化理解：

```sql
location
- id
- name
- description
- longitude
- latitude
- cover_photo_id
- travel_date
- deleted

photo
- id
- location_id
- cos_key
- url
- thumb_url
- width
- height
- orientation
- file_size
- shot_date
- deleted
```

当前最大的问题是：

- `location` 没有 `user_id`。
- `photo` 没有 `user_id`。
- 数据库无法判断一个地点或一张照片属于哪个用户。

前端隐藏数据不等于安全。真正的数据隔离必须在后端和数据库层面完成。

### 3.5 当前上传方式

上传相关代码主要在：

- 前端上传面板：`frontend/src/components/UploadPanel/index.tsx`
- 前端 EXIF 读取：`frontend/src/components/UploadPanel/useExif.ts`
- 前端上传 API：`frontend/src/api/cos.ts`
- 后端上传控制器：`backend/src/main/java/com/photomap/controller/CosController.java`
- 后端上传服务：`backend/src/main/java/com/photomap/service/CosStsService.java`

当前上传链路更接近：

1. 管理员在前端选择图片。
2. 前端检查文件类型和大小。
3. 前端读取 EXIF，尝试提取 GPS 和拍摄日期。
4. 前端调用 `POST /api/cos/upload`。
5. 后端检查文件是否为空、是否超过 20MB、是否是图片类型或 `.heic`。
6. 后端上传到腾讯云 COS。
7. 前端提交地点和照片元数据到后端。
8. 后端写入 `location` 和 `photo` 表。

当前已经有基础校验，但还不够完整：

- 后端主要依赖 `Content-Type` 和文件名判断。
- 没有检查文件魔数。
- 没有真正解码图片确认它可读。
- 没有限制图片像素尺寸。
- 没有内容安全审核。
- 没有审核状态字段。

## 4. 需要新增或改造的能力

### 4.1 用户注册与多用户登录

#### 它是什么

用户注册，就是让每个访问者创建自己的账号。系统会保存用户的登录身份，以后用户可以用自己的账号管理自己的照片和行程。

#### 为什么需要它

当前项目只有管理员账号。所有上传行为都属于管理员，不适合多用户使用。

如果每个人都要上传自己的旅行照片，就必须知道：

- 当前是谁在上传？
- 这张照片属于谁？
- 查询时应该返回谁的数据？
- 删除时这个用户有没有权限删？

这些问题都依赖用户体系。

#### 它解决了什么问题

用户体系解决的是“身份识别”问题。

没有用户体系时，后端只能知道“有人发了一个请求”。有了用户体系后，后端才能知道“用户 123 发了一个请求”。

#### 和前端中类似概念的对比

前端里你可能熟悉“组件状态”或“登录态”：

- `isAdmin = true` 表示当前页面展示管理员按钮。
- `token` 表示当前用户已登录。

但前端状态只能影响页面显示，不能保证安全。

后端用户体系更像一个“服务端可信状态”：

- 后端通过 JWT 解析出当前用户 ID。
- 后端根据用户 ID 查询数据库。
- 后端不相信前端传来的 `userId`。

#### 实际项目中怎么用

推荐新增用户表。表名不要直接叫 `user`，因为 `user` 在一些数据库里容易和关键字冲突。推荐叫 `app_user`。

```sql
CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_app_user_username ON app_user (username);
```

注册时：

1. 用户输入用户名和密码。
2. 后端校验用户名是否已存在。
3. 后端用 BCrypt 把密码加密成哈希。
4. 后端保存用户。
5. 返回注册成功，或直接返回登录 token。

登录时：

1. 用户输入用户名和密码。
2. 后端从数据库查用户。
3. 后端用 BCrypt 对比密码。
4. 登录成功后生成 JWT。
5. JWT 里放 `userId`、`username`、`role`。

#### 常见误区或坑

- 不要明文保存密码。
- 不要只在前端判断“这个用户能不能看”。
- 不要让前端传 `userId` 来决定数据归属。
- 不要把管理员账号和普通用户账号混成无法区分的一种身份。
- 不要把 JWT 密钥写死在代码里，应该放环境变量。

#### 简单代码示例

注册接口的请求体可以是：

```json
{
  "username": "alice",
  "password": "123456"
}
```

登录成功后返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "jwt-token",
    "expiresIn": 86400,
    "user": {
      "id": 1,
      "username": "alice",
      "role": "USER"
    }
  }
}
```

### 4.2 用户数据隔离

#### 它是什么

用户数据隔离，就是用户只能访问自己拥有的数据。

在这个项目里，就是：

- 用户 A 只能看到用户 A 的地点。
- 用户 A 只能看到用户 A 的照片。
- 用户 A 不能通过改 URL 访问用户 B 的地点详情。
- 用户 A 不能删除用户 B 的照片。

#### 为什么需要它

多用户系统里，数据隔离是基础安全要求。

如果没有数据隔离，即使页面上不显示别人的照片，用户也可能通过接口直接访问：

```text
GET /api/locations/999
```

如果 `999` 是别人的地点，而后端没有校验归属权，就会发生越权访问。

#### 它解决了什么问题

它解决的是“越权访问”问题。

越权访问是后端安全里非常常见的问题：用户登录了，但访问了不属于自己的资源。

#### 和前端中类似概念的对比

前端可以用路由守卫隐藏页面：

```tsx
if (!token) {
  return <Navigate to="/login" />
}
```

但这只是用户体验层面的限制。

后端数据隔离更像“接口级别的路由守卫 + 数据过滤”：

```java
Long currentUserId = authContext.getCurrentUserId();
Location location = locationMapper.selectById(id);
if (!location.getUserId().equals(currentUserId)) {
    throw new BusinessException(403, "Forbidden");
}
```

#### 实际项目中怎么用

推荐给 `location` 表增加 `user_id`：

```sql
ALTER TABLE location ADD COLUMN user_id BIGINT;
ALTER TABLE location ADD CONSTRAINT fk_location_user
    FOREIGN KEY (user_id) REFERENCES app_user(id);
CREATE INDEX idx_location_user_deleted ON location (user_id, deleted);
```

是否给 `photo` 也增加 `user_id` 有两种方案。

方案 A：只给 `location` 增加 `user_id`。

- 优点：结构简单，照片通过地点间接归属用户。
- 缺点：查询照片时经常需要 join `location`。

方案 B：`location` 和 `photo` 都增加 `user_id`。

- 优点：查照片更直接，RAG 搜索时更方便按用户过滤。
- 缺点：需要保证 `photo.user_id` 和 `location.user_id` 一致。

推荐本项目使用方案 B，因为后续要做图片 RAG 搜索，照片表直接有 `user_id` 会更方便。

```sql
ALTER TABLE photo ADD COLUMN user_id BIGINT;
ALTER TABLE photo ADD CONSTRAINT fk_photo_user
    FOREIGN KEY (user_id) REFERENCES app_user(id);
CREATE INDEX idx_photo_user_deleted ON photo (user_id, deleted);
```

后端查询地点列表时，不再是：

```sql
SELECT * FROM location WHERE deleted = false;
```

而应该是：

```sql
SELECT * FROM location
WHERE user_id = :currentUserId
  AND deleted = false;
```

#### 常见误区或坑

- 只改前端列表，不改后端接口。
- 详情接口忘记校验 owner。
- 删除接口忘记校验 owner。
- RAG 搜索忘记按 `user_id` 过滤。
- COS 文件 key 没有按用户隔离，导致对象存储难管理。

#### 简单代码示例

创建地点时，后端不要相信前端传来的 `userId`：

```java
@PostMapping("/api/locations")
public ApiResponse<Map<String, Long>> create(@Valid @RequestBody LocationCreateRequest request) {
    Long currentUserId = currentUser.getId();
    Long id = locationService.createLocation(currentUserId, request);
    return ApiResponse.success(Map.of("id", id));
}
```

Service 层写入：

```java
public Long createLocation(Long currentUserId, LocationCreateRequest request) {
    Location location = new Location();
    location.setUserId(currentUserId);
    location.setName(request.getName());
    location.setLongitude(request.getLongitude());
    location.setLatitude(request.getLatitude());
    locationMapper.insert(location);
    return location.getId();
}
```

### 4.3 图片安全校验

#### 它是什么

图片安全校验，是在图片进入系统前，对图片做检查和审核。

它至少包括三层：

1. 基础文件校验：大小、后缀、MIME、文件魔数。
2. 图片解码校验：确认图片能被真实解码，尺寸合理。
3. 内容安全审核：确认图片内容不违规。

#### 为什么需要它

用户上传文件是后端系统里风险很高的入口。

攻击者可能上传：

- 把脚本改成 `.jpg` 的伪图片。
- 超大图片，拖垮服务器内存。
- 损坏图片，触发图片库异常。
- 带恶意内容的文件。
- 不适合展示的违规图片。

如果后端只看文件名，很容易被绕过。

#### 它解决了什么问题

图片安全校验解决两个问题：

- 防止系统被恶意文件攻击。
- 防止不安全内容进入相册。

#### 和前端中类似概念的对比

前端上传组件里的 `beforeUpload` 可以检查：

```ts
file.type.startsWith('image/')
file.size < 20 * 1024 * 1024
```

这类似表单校验，可以提升用户体验。

但前端校验不安全，因为用户可以绕过浏览器，直接用 Postman 或脚本请求后端。

所以真正的安全校验必须放在后端。

#### 实际项目中怎么用

当前后端已经有基础大小和类型校验：

- 文件不能为空。
- 文件不能超过 20MB。
- `Content-Type` 要是 `image/*`，或者文件名是 `.heic`。

建议升级为：

1. 校验文件大小。
2. 读取文件头，判断真实格式。
3. 使用 Java 图片库解码图片。
4. 限制宽高和总像素。
5. 去掉或忽略不可信 EXIF。
6. 调用内容安全审核服务。
7. 审核通过后才写入正常照片记录。

推荐在 `photo` 表增加审核字段：

```sql
ALTER TABLE photo ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'pending';
ALTER TABLE photo ADD COLUMN review_reason TEXT;
ALTER TABLE photo ADD COLUMN reviewed_at TIMESTAMP;
CREATE INDEX idx_photo_user_status ON photo (user_id, status);
```

状态建议：

- `pending`：等待审核。
- `approved`：审核通过，可展示。
- `rejected`：审核拒绝，不展示。

#### 可以通过大模型筛选吗

可以，但不建议只依赖大模型。

推荐组合方案：

1. 技术安全校验用传统程序完成。
2. 内容安全审核优先用云厂商内容安全服务。
3. 大模型用于补充判断、生成图片描述和标签。

原因是：

- 文件是否真的是图片，程序判断更稳定。
- 图片是否违规，专业内容安全服务更适合。
- 图片里有什么内容，大模型更擅长描述和理解。

#### 常见误区或坑

- 只相信文件后缀。
- 只相信浏览器传来的 `Content-Type`。
- 先公开展示，再异步审核。
- 审核失败后只隐藏数据库记录，不清理 COS 文件。
- 图片审核没有保存原因，后续无法排查。
- 没有限制图片像素，导致内存压力过大。

#### 简单代码示例

后端伪代码：

```java
public void validateImage(MultipartFile file) {
    if (file == null || file.isEmpty()) {
        throw new BusinessException("请选择要上传的图片");
    }

    if (file.getSize() > 20L * 1024L * 1024L) {
        throw new BusinessException("图片大小不能超过 20MB");
    }

    byte[] header = readFirstBytes(file, 16);
    if (!isKnownImageMagicNumber(header)) {
        throw new BusinessException("文件格式不是合法图片");
    }

    ImageInfo info = decodeImage(file);
    if (info.width() <= 0 || info.height() <= 0) {
        throw new BusinessException("图片无法解析");
    }

    if ((long) info.width() * info.height() > 40_000_000L) {
        throw new BusinessException("图片像素过大");
    }
}
```

### 4.4 RAG 图片筛选

#### 它是什么

RAG 是 Retrieval-Augmented Generation 的缩写，通常翻译为“检索增强生成”。

简单理解：

1. 先从数据库或向量库中检索相关资料。
2. 再把这些资料交给大模型。
3. 大模型基于检索结果回答问题。

在本项目里，RAG 不是只用来“聊天”，而是用来“找图片”：

- 用户输入：“找海边日落照片。”
- 系统把这句话变成向量。
- 系统从当前用户的图片向量里找最相似的图片。
- 返回相关照片和地点。

#### 为什么需要它

传统搜索主要依赖关键词：

- 图片名称包含“海边”才能搜到。
- 描述里写了“日落”才能搜到。

但很多图片没有详细文件名或描述。

RAG / 向量检索可以根据语义匹配：

- “海边落日”
- “傍晚的沙滩”
- “夕阳下的海”

这些表达不同，但语义接近，可以匹配到相似图片。

#### 它解决了什么问题

它解决的是“自然语言找图片”的问题。

用户不需要记得照片文件名，也不需要手动打很多标签。

#### 和前端中类似概念的对比

前端里常见搜索是：

```ts
items.filter(item => item.name.includes(keyword))
```

这叫关键词匹配。

RAG 更像是：

```ts
items.sort((a, b) => similarity(query, b) - similarity(query, a))
```

它比较的是“意思像不像”，不是字符串是否包含。

#### 实际项目中怎么用

推荐流程：

1. 用户上传图片。
2. 后端完成安全校验。
3. 后端或异步任务调用多模态模型，为图片生成描述和标签。
4. 系统把图片描述、地点名、旅行日期、用户补充描述组合成文本。
5. 调用 embedding 模型，把文本转成向量。
6. 把向量存入 PostgreSQL `pgvector`。
7. 搜索时，把用户问题也转成向量。
8. 在当前用户范围内做向量相似度搜索。
9. 返回相关图片。

推荐新增一张图片索引表：

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE photo_embedding (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    photo_id BIGINT NOT NULL REFERENCES photo(id),
    caption TEXT,
    tags TEXT,
    embedding vector(1536),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_embedding_user ON photo_embedding (user_id);
```

实际向量维度要根据所选 embedding 模型决定。这里的 `1536` 只是示例，不应该写死成不可调整的常量。

搜索接口可以设计为：

```http
GET /api/search/photos?q=海边日落
Authorization: Bearer <token>
```

返回示例：

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "photoId": 12,
      "locationId": 3,
      "locationName": "三亚海边",
      "url": "https://example.com/photo.jpg",
      "thumbUrl": "https://example.com/photo-thumb.jpg",
      "score": 0.82,
      "caption": "海边日落，天空呈橙红色，远处有海浪"
    }
  ]
}
```

#### 常见误区或坑

- RAG 搜索忘记加 `user_id` 过滤，导致搜到别人的图片。
- 只保存向量，不保存 caption，后续无法解释为什么命中。
- 图片一上传就同步调用大模型，导致上传接口很慢。
- 没有处理 embedding 失败的重试。
- 没有区分“审核通过的图片”和“待审核图片”。
- 没有给搜索结果做权限校验。

#### 简单代码示例

向量检索 SQL 示例：

```sql
SELECT
    pe.photo_id,
    p.url,
    p.thumb_url,
    l.id AS location_id,
    l.name AS location_name,
    pe.caption,
    1 - (pe.embedding <=> :queryEmbedding) AS score
FROM photo_embedding pe
JOIN photo p ON p.id = pe.photo_id
JOIN location l ON l.id = p.location_id
WHERE pe.user_id = :currentUserId
  AND p.status = 'approved'
  AND p.deleted = false
  AND l.deleted = false
ORDER BY pe.embedding <=> :queryEmbedding
LIMIT 20;
```

这里最重要的是：

```sql
WHERE pe.user_id = :currentUserId
```

没有这一句，多用户系统就会有数据泄露风险。

## 5. 推荐 API 设计

### 5.1 鉴权接口

#### 注册

```http
POST /api/auth/register
Content-Type: application/json
```

请求：

```json
{
  "username": "alice",
  "password": "123456"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "username": "alice"
  }
}
```

#### 登录

```http
POST /api/auth/login
Content-Type: application/json
```

请求：

```json
{
  "username": "alice",
  "password": "123456"
}
```

响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "jwt-token",
    "expiresIn": 86400,
    "user": {
      "id": 1,
      "username": "alice",
      "role": "USER"
    }
  }
}
```

### 5.2 地点接口

地点接口要从“公开读取”改为“登录后读取自己的数据”。

```http
GET /api/locations
Authorization: Bearer <token>
```

只返回当前登录用户的地点。

```http
POST /api/locations
Authorization: Bearer <token>
Content-Type: application/json
```

创建当前用户自己的地点。

```http
GET /api/locations/{id}
Authorization: Bearer <token>
```

只有地点属于当前用户时才返回，否则返回 404 或 403。

推荐对外返回 404，避免暴露“这个 ID 存在但不属于你”。

### 5.3 照片接口

```http
POST /api/locations/{id}/photos
Authorization: Bearer <token>
Content-Type: application/json
```

只能给自己的地点追加照片。

```http
DELETE /api/photos/{id}
Authorization: Bearer <token>
```

只能删除自己的照片。

### 5.4 图片上传接口

当前接口可以保留：

```http
POST /api/cos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

推荐增强为：

1. 校验登录用户。
2. 校验文件技术安全。
3. 上传到用户隔离路径，例如：

```text
users/{userId}/photos/yyyy/MM/{uuid}.jpg
```

4. 创建待审核记录或返回临时上传结果。
5. 内容审核通过后，照片状态变为 `approved`。

### 5.5 RAG 搜索接口

```http
GET /api/search/photos?q=海边日落
Authorization: Bearer <token>
```

只搜索当前用户自己的图片。

可选参数：

- `limit`：返回数量，默认 20。
- `locationId`：只在某个地点内搜索。
- `fromDate` / `toDate`：按拍摄时间过滤。

## 6. 推荐数据库改造

### 6.1 用户表

```sql
CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE
);
```

### 6.2 location 表增加用户归属

```sql
ALTER TABLE location ADD COLUMN user_id BIGINT;

ALTER TABLE location
ADD CONSTRAINT fk_location_user
FOREIGN KEY (user_id) REFERENCES app_user(id);

CREATE INDEX idx_location_user_deleted ON location (user_id, deleted);
```

### 6.3 photo 表增加用户归属和审核状态

```sql
ALTER TABLE photo ADD COLUMN user_id BIGINT;
ALTER TABLE photo ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'pending';
ALTER TABLE photo ADD COLUMN review_reason TEXT;
ALTER TABLE photo ADD COLUMN reviewed_at TIMESTAMP;

ALTER TABLE photo
ADD CONSTRAINT fk_photo_user
FOREIGN KEY (user_id) REFERENCES app_user(id);

CREATE INDEX idx_photo_user_deleted ON photo (user_id, deleted);
CREATE INDEX idx_photo_user_status ON photo (user_id, status);
```

### 6.4 RAG 图片索引表

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE photo_embedding (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    photo_id BIGINT NOT NULL REFERENCES photo(id),
    caption TEXT,
    tags TEXT,
    embedding vector(1536),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_embedding_user ON photo_embedding (user_id);
```

## 7. 推荐后端分层改造

当前后端已经有比较清晰的分层：

- Controller：接收 HTTP 请求。
- Service：写业务逻辑。
- Mapper：访问数据库。
- Entity：数据库实体。
- DTO：请求和响应结构。
- Config：安全和配置。

后续推荐新增或调整：

```text
controller/
  AuthController.java
  SearchController.java

service/
  AuthService.java
  UserService.java
  ImageSafetyService.java
  PhotoEmbeddingService.java
  SearchService.java

entity/
  User.java
  Location.java
  Photo.java
  PhotoEmbedding.java

mapper/
  UserMapper.java
  PhotoEmbeddingMapper.java

dto/
  RegisterRequest.java
  UserVO.java
  SearchPhotoVO.java
```

### 7.1 Controller 应该做什么

Controller 只做三件事：

1. 接收参数。
2. 获取当前登录用户。
3. 调用 Service。

不要把复杂业务逻辑写在 Controller 里。

### 7.2 Service 应该做什么

Service 负责业务规则：

- 用户名是否重复。
- 密码如何加密。
- 地点是否属于当前用户。
- 图片是否安全。
- 审核失败如何处理。
- RAG 搜索如何过滤用户数据。

### 7.3 Mapper 应该做什么

Mapper 负责数据库操作：

- 根据用户名查用户。
- 根据 `user_id` 查询地点。
- 根据 `user_id` 查询照片。
- 根据向量相似度查询图片。

## 8. 推荐前端改造

### 8.1 登录页改为登录 + 注册

当前前端只有管理员登录。

推荐改成：

- 登录 tab。
- 注册 tab。
- 注册成功后自动登录，或跳回登录表单。

前端状态从：

```ts
interface AuthState {
  token: string | null
  isAdmin: boolean
}
```

扩展为：

```ts
interface AuthState {
  token: string | null
  user: {
    id: number
    username: string
    role: 'USER' | 'ADMIN'
  } | null
  isLoggedIn: boolean
  isAdmin: boolean
}
```

### 8.2 首页从游客公开视图改为用户私有视图

如果目标是“每个人只能看到自己的上传”，首页加载地点前应该判断登录态：

- 未登录：展示登录/注册入口和空状态。
- 已登录：加载当前用户自己的地点。

也可以保留一个“公开示例地图”，但这会引入“公开数据”和“私有数据”的概念，第一版不建议增加复杂度。

### 8.3 上传面板增加审核状态提示

上传后如果内容安全审核是异步的，前端应该显示：

- 上传中。
- 审核中。
- 审核通过。
- 审核未通过。

不要让用户误以为上传成功就一定会公开展示。

### 8.4 增加语义搜索入口

可以在当前顶部搜索框旁边增加一个“搜照片”的模式。

两种搜索要区分：

- 地图地点搜索：调用高德 POI。
- 我的照片搜索：调用 `/api/search/photos?q=...`。

## 9. 推荐实现顺序

### 第一阶段：用户体系和数据隔离

目标：每个用户可以注册、登录、上传自己的地点和照片，并且只能看到自己的数据。

需要做：

- 新增 `app_user` 表。
- 新增注册接口。
- 改造登录接口，从数据库用户登录。
- JWT 增加 `userId` 和 `role`。
- `location` 增加 `user_id`。
- `photo` 增加 `user_id`。
- 查询、详情、修改、删除都按当前用户过滤。
- 前端增加注册入口。
- 首页改成登录后加载个人地点。

### 第二阶段：图片安全校验

目标：只允许安全图片进入相册。

需要做：

- 后端增强文件真实类型校验。
- 后端增加图片解码校验。
- 限制图片像素尺寸。
- 增加 `photo.status`。
- 接入内容安全审核。
- 前端展示审核状态。
- 审核失败时不展示图片。

### 第三阶段：RAG 图片筛选

目标：用户可以用自然语言搜索自己的图片。

需要做：

- 增加图片 caption / tags。
- 增加 embedding 生成任务。
- 增加 `photo_embedding` 表。
- 接入 `pgvector`。
- 新增 `/api/search/photos`。
- 搜索时必须按当前 `user_id` 过滤。
- 前端增加语义搜索结果展示。

## 10. 测试与验收标准

### 10.1 注册登录

必须满足：

- 新用户可以注册。
- 用户名不能重复。
- 密码不能明文存储。
- 用户可以登录并拿到 token。
- token 过期后接口返回 401。

### 10.2 用户隔离

必须满足：

- 用户 A 上传地点后，用户 B 的地点列表看不到。
- 用户 A 不能通过 URL 访问用户 B 的地点详情。
- 用户 A 不能删除用户 B 的照片。
- RAG 搜索结果不能返回其他用户的图片。

### 10.3 图片安全

必须满足：

- `.txt` 改成 `.jpg` 不能通过。
- 超过大小限制的图片不能上传。
- 损坏图片不能上传。
- 像素过大的图片不能上传。
- 审核拒绝的图片不能展示。

### 10.4 RAG 搜索

必须满足：

- 搜索“海边日落”能返回语义相关图片。
- 搜索“寺庙”“雪山”“花园”等能根据 caption / tags 命中。
- 没有结果时返回空列表。
- 搜索只在当前用户数据内进行。

## 11. 对前端转全栈学习者的重点知识

### 11.1 HTTP 请求和登录态

前端调用接口时，本质是发 HTTP 请求。

登录后，后端返回 token。前端后续请求带上：

```http
Authorization: Bearer <token>
```

后端解析 token，知道当前用户是谁。

### 11.2 REST API

当前项目使用 REST 风格接口：

- `GET /api/locations`：查询地点。
- `POST /api/locations`：创建地点。
- `PUT /api/locations/{id}`：更新地点。
- `DELETE /api/locations/{id}`：删除地点。

REST 的核心是：用 URL 表示资源，用 HTTP 方法表示动作。

### 11.3 Controller / Service / Model

可以用前端类比理解：

- Controller 像页面事件入口，负责接收请求。
- Service 像业务 hooks，负责业务规则。
- Mapper 像 API client 或数据访问层，负责和数据库交互。
- Entity 像数据库类型定义。
- DTO 像前后端传输的数据类型。

### 11.4 数据库表和索引

表用来保存结构化数据。

索引用来加速查询。

多用户场景下，经常会按 `user_id` 查询，所以需要：

```sql
CREATE INDEX idx_location_user_deleted ON location (user_id, deleted);
```

否则用户数据多了以后，查询会越来越慢。

### 11.5 JWT

JWT 是一种登录凭证。

它不是用来保存大量用户信息的，只应该放少量必要字段：

- 用户 ID。
- 用户名。
- 角色。
- 过期时间。

不要把密码、手机号、隐私信息放进 JWT。

### 11.6 RAG 和向量检索

RAG 可以理解为“先搜索资料，再让模型基于资料回答”。

在图片搜索里，关键不是让大模型凭空猜，而是先把图片内容变成可检索的 caption 和 embedding。

真正重要的是这条原则：

> 任何检索都必须先按当前用户过滤，再做语义匹配。

## 12. 最终建议

这个需求不要一次性全部做完。推荐先实现“注册 + 登录 + 用户隔离”，因为它是后面所有能力的基础。

如果没有用户隔离，图片安全和 RAG 都会有严重风险：

- 图片审核不知道审核谁的图片。
- RAG 搜索可能搜到别人的图片。
- 删除和编辑可能越权。

所以最稳妥的路线是：

```text
用户体系 -> 用户数据隔离 -> 图片安全审核 -> 图片语义索引 -> RAG 搜索
```

这条路线从后端基础能力开始，逐步扩展到 AI 能力，比较适合当前项目的技术栈和学习路径。
