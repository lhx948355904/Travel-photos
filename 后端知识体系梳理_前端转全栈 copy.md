# 前端转全栈：用本项目读懂后端

> 本文以本仓库（旅行摄影地图）的真实代码为教材，沿着"一个 HTTP 请求从进来到出去"的完整生命周期，梳理后端开发的全部基础知识点。
>
> **本项目技术栈**：Spring Boot 3 (Java 17) + MyBatis-Plus + PostgreSQL/PostGIS + Spring Security(JWT) + 腾讯云 COS + Docker + Nginx

---

## 目录

1. [整体心智模型：请求是怎么流动的](#一整体心智模型请求是怎么流动的)
2. [分层架构详解](#二分层架构详解对照本项目代码)
3. [数据库知识](#三数据库知识前端最陌生的部分)
4. [安全与认证（Spring Security + JWT）](#四安全与认证spring-security--jwt)
5. [统一响应与全局异常处理](#五统一响应与全局异常处理工程化思维)
6. [配置管理与环境隔离](#六配置管理与环境隔离)
7. [第三方服务集成（对象存储 COS）](#七第三方服务集成腾讯云-cos-对象存储)
8. [部署与运维（Docker + Nginx）](#八部署与运维docker--nginx)
9. [学习路径建议](#九学习路径建议)
10. [核心术语速查表](#十核心术语速查表前端--后端对照)

---

## 一、整体心智模型：请求是怎么流动的

作为前端，你熟悉 `axios.get('/api/locations')`。这行代码发出后，后端发生了一连串的事：

```
浏览器
  │  GET /api/locations?bbox=...
  ▼
Nginx (nginx/default.conf)            ← 反向代理：静态文件自己处理，/api 转发给后端
  │  proxy_pass http://backend:8080
  ▼
Spring Boot 内嵌 Tomcat (端口 8080)    ← Web 服务器，接收 HTTP
  │
  ▼
Security 过滤器链 (WebSecurityConfig)  ← 鉴权：这个请求要不要登录？解析 JWT
  │
  ▼
DispatcherServlet (Spring 内部)        ← 路由分发：找到哪个方法处理
  │
  ▼
LocationController.list()             ← 控制层：解析参数，调用 service
  │
  ▼
LocationService.listLocations()       ← 业务层：真正的业务逻辑、事务
  │
  ▼
LocationMapper.selectByBbox()         ← 数据访问层：执行 SQL
  │
  ▼
PostgreSQL                            ← 数据库：返回数据
  │
  ▲ 原路返回，层层封装成 ApiResponse JSON
```

**Controller → Service → Mapper → DB** 这套分层是后端最核心的结构。理解了它，后端就懂了一半。

---

## 二、分层架构详解（对照本项目代码）

### 1. Controller 层（控制层）——相当于前端的"路由 + 接口定义"

参考 `backend/.../controller/LocationController.java`：

```java
@RestController                          // REST 控制器，返回值自动转 JSON
@RequestMapping("/api/locations")        // 类下所有接口的路径前缀
@RequiredArgsConstructor                 // Lombok：自动生成构造函数（用于依赖注入）
public class LocationController {
    private final LocationService locationService;

    @GetMapping                          // GET /api/locations
    public ApiResponse<List<LocationVO>> list(@RequestParam(required = false) String bbox) {
        return ApiResponse.success(locationService.listLocations(bbox));
    }

    @PostMapping                         // POST /api/locations
    public ApiResponse<Map<String, Long>> create(@Valid @RequestBody LocationCreateRequest request) { ... }
}
```

**关键注解**（后端的"语法糖"，前端没有的概念）：

- `@RestController`：处理 HTTP 请求，返回值自动序列化成 JSON。
- `@GetMapping / @PostMapping / @PutMapping / @DeleteMapping`：对应 HTTP 四个动词，是 **RESTful API** 的核心——用 HTTP 动词表达增删改查。本项目 `GET=查、POST=增、PUT=改、DELETE=删`，非常标准。
- 三种取参数方式（本项目全都用到了）：
  - `@RequestParam String bbox`：取 URL 查询参数 `?bbox=1,2,3,4`
  - `@PathVariable Long id`：取路径变量 `/api/locations/{id}`
  - `@RequestBody LocationCreateRequest request`：取请求体 JSON

**职责边界**：Controller 只负责接收请求、校验入参、调用 service、返回结果，**不写业务逻辑**。把业务塞进 Controller 是新手常见错误。

### 2. DTO / VO / Entity——前后端的"数据契约"

Java 是强类型语言，每个请求体/返回体都要有明确的类来承接。参考 `dto/LocationCreateRequest.java`：

```java
@Data                                    // Lombok：自动生成 getter/setter/toString
public class LocationCreateRequest {
    @NotBlank(message = "地点名称不能为空")   // 参数校验注解
    private String name;
    @NotNull(message = "经度不能为空")
    private Double longitude;
    private List<PhotoDTO> photos;
}
```

**命名约定**（行业惯例，本项目遵守得很好）：

| 类型 | 含义 | 本项目示例 | 用途 |
|------|------|-----------|------|
| DTO | Data Transfer Object | `LocationCreateRequest`, `PhotoDTO` | 接收前端传来的数据 |
| VO | View Object | `LocationVO`, `LocationDetailVO` | 返回给前端展示的数据 |
| Entity | 数据库实体 | `Location`, `Photo` | 与数据库表一一对应 |

**为什么要分层、不直接用 Entity 走天下？** 数据库的样子和接口想暴露的样子往往不一样。`Location` 实体里有 `deleted`（逻辑删除标记）、`geom`（地理字段），但返回前端时不该带这些。这种隔离能防止数据库结构泄露、防止过度暴露字段。`LocationService.toLocationVO()` 做的就是 Entity → VO 的转换。

### 3. 参数校验（Validation）——后端的"第一道防线"

`@Valid @RequestBody LocationCreateRequest request` 中的 `@Valid` 触发校验，配合 DTO 里的 `@NotBlank`、`@NotNull`，前端传空值时请求直接被拦下，到不了 service。

> **核心心法**：前端校验是为了用户体验（即时反馈），后端校验是为了安全和数据完整性。**永远不要信任前端传来的任何数据**——请求可以被绕过前端直接伪造（Postman、curl）。两边都要校验。

### 4. Service 层（业务层）——后端的"大脑"

所有真正的业务逻辑都在这。参考 `service/LocationService.createLocation()`：

```java
@Transactional                           // ← 事务注解，极其重要
public Long createLocation(LocationCreateRequest request) {
    Location location = new Location();
    location.setName(request.getName());
    locationMapper.insert(location);     // 第 1 步：插入地点，拿到自增 id

    for (...) {                          // 第 2 步：循环插入每张照片
        Photo photo = new Photo();
        photo.setLocationId(location.getId());
        photoMapper.insert(photo);
    }
    locationMapper.updateById(location); // 第 3 步：回写封面照片 id
    return location.getId();
}
```

**事务（Transaction）——后端核心概念**：

`@Transactional` 保证方法内多次数据库操作"要么全成功，要么全失败"。如果插完地点、插了 2 张照片后程序崩了，没有事务会留下"有地点但照片不全"的脏数据；有了事务，一旦中途出错，前面所有插入都会**回滚（rollback）**，数据库恢复到操作前状态。这就是数据库 **ACID** 特性中的 A（原子性）。前端没有这个概念，后端面试必问。

### 5. Mapper 层（数据访问层 / DAO）——和数据库对话

本项目用 **MyBatis-Plus**。参考 `mapper/LocationMapper.java`：

```java
@Mapper
public interface LocationMapper extends BaseMapper<Location> {   // 注意：接口，无实现类！
    @Select("SELECT * FROM location WHERE deleted = false " +
            "AND longitude BETWEEN #{minLng} AND #{maxLng} ...")
    List<Location> selectByBbox(@Param("minLng") Double minLng, ...);
}
```

它是个 **interface，没有实现类**——这是 ORM 框架的魔法。`extends BaseMapper<Location>` 后白嫖一堆现成方法：`insert()`、`selectById()`、`updateById()`、`deleteById()`、`selectList()`，一行 SQL 不用写。只有复杂查询（如按地理范围 bbox 查）才需自己写 `@Select` 里的 SQL。

> **ORM（对象关系映射）的意义**：用"操作 Java 对象"的方式去"操作数据库表"，不用手写大量重复 SQL。这是后端开发效率的关键。

### 6. Entity 与数据库映射

参考 `entity/Location.java`：

```java
@TableName("location")                   // 对应数据库的 location 表
public class Location {
    @TableId(type = IdType.AUTO)         // 主键，自增
    private Long id;
    @TableField("cover_photo_id")        // Java 驼峰 ↔ 数据库下划线
    private Long coverPhotoId;
    @TableField(value = "created_at", fill = FieldFill.INSERT)  // 插入时自动填充时间
    private LocalDateTime createdAt;
    @TableLogic                          // 逻辑删除：delete 时不真删，只把 deleted 置 true
    private Boolean deleted;
}
```

两个值得记住的设计：

- **驼峰转下划线**：Java 习惯 `coverPhotoId`，数据库习惯 `cover_photo_id`，ORM 帮你映射。
- **逻辑删除**：`@TableLogic` + 配置 `logic-delete-field: deleted`。调用 `deleteById()` 时实际执行 `UPDATE location SET deleted=true` 而非 `DELETE`。数据没真消失，可恢复、可审计。生产环境重要数据常用逻辑删除。

---

## 三、数据库知识（前端最陌生的部分）

### 1. 表设计与关系

参考 `init.sql`，有两张表：`location`（地点）和 `photo`（照片），是**一对多**关系：一个地点有多张照片。靠外键建立关联：

```sql
location_id BIGINT NOT NULL REFERENCES location(id)  -- 外键
```

`photo.location_id` 指向 `location.id`，这叫**外键（Foreign Key）**，保证"照片必须属于某个真实存在的地点"。这就是**关系型数据库**的精髓——数据之间有明确关联和约束。

### 2. 索引（Index）——查询加速的关键

```sql
CREATE INDEX idx_photo_location ON photo (location_id);
```

索引像书的目录。没索引时找"location_id=5 的所有照片"得全表扫描；有索引可直接定位。代价是占空间、拖慢写入。**经验法则**：经常出现在 `WHERE`、`JOIN`、`ORDER BY` 里的字段加索引。本项目对 `location_id`、`deleted` 都建了索引，很合理。

### 3. SQL 基础（必须掌握）

| 操作 | 语法 |
|------|------|
| 查 | `SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ...` |
| 增 | `INSERT INTO ... VALUES ...` |
| 改 | `UPDATE ... SET ... WHERE ...` |
| 删 | `DELETE FROM ... WHERE ...` |
| 连表 | `JOIN`（把多张表的数据拼起来查） |

本项目的 `selectByBbox` 是带 `WHERE ... BETWEEN` 的查询，可作为练手起点。

### 4. 连接池（Connection Pool）

参考 `application.yml`：

```yaml
hikari:
  maximum-pool-size: 10    # 最多 10 个数据库连接
  minimum-idle: 5
```

建立数据库连接很昂贵（握手、认证）。连接池预先建好一批连接复用，用完归还而非关闭。HikariCP 是目前最快的连接池，Spring Boot 默认使用。这是后端性能优化的基础设施。

---

## 四、安全与认证（Spring Security + JWT）

前端转后端必须翻越的一座山。参考 `config/WebSecurityConfig.java`。

### 1. 整体思路：无状态 JWT 认证

```java
.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```

`STATELESS`（无状态）意味着服务器**不保存登录状态**。传统 Session 方式服务器要记住"谁登录了"；JWT 方式是：登录成功后发给前端一个**令牌（token）**，之后每个请求前端都带着它，服务器只验证令牌真假，不记任何东西。对扩展性极好（多台服务器无需共享 session）。

### 2. 完整的登录与鉴权流程

**登录阶段**（`AuthService.login()`）：

1. 前端 POST `/api/auth/login`，带用户名密码。
2. 校验用户名是否匹配。
3. `passwordEncoder.matches(明文密码, 数据库存的哈希)` 校验密码。**密码绝不能明文存储！** 本项目用 **BCrypt** 哈希（docker-compose 里 `ADMIN_PASSWORD_HASH: $2a$10$...`）。BCrypt 不可逆、自带"加盐"，即使两人密码相同存的哈希也不同。
4. 校验通过，`jwtUtil.generateToken()` 生成 JWT 返回前端。

**访问受保护接口阶段**（`JwtAuthenticationFilter`）：

1. 前端在请求头带 `Authorization: Bearer <token>`。
2. 过滤器（Filter）在请求到达 Controller **之前**拦截，取出 token。
3. `jwtUtil.validateToken(token)` 验证签名、是否过期。
4. 通过则把"已认证用户"放进 `SecurityContextHolder`，放行。

### 3. JWT 是什么（参考 `util/JwtUtil.java`）

JWT = 一个加密签名的字符串，三部分用 `.` 分隔：头部、载荷（`subject(username)`、`issuedAt`、`expiration`）、签名。

**关键点**：签名用密钥（`jwt.secret`）生成。前端可解码看到内容（所以别放敏感信息），但**无法伪造**——没有服务器密钥就签不出有效签名，一旦篡改签名校验就失败。这就是 JWT 防伪原理。

### 4. 接口权限控制

```java
.requestMatchers(HttpMethod.GET, "/api/locations/**").permitAll()      // 查看无需登录
.requestMatchers(HttpMethod.POST, "/api/locations").authenticated()    // 新增必须登录
```

"读公开、写鉴权"在个人内容站很常见——访客能看，只有管理员能改。

### 5. 过滤器链（Filter Chain）——后端的"中间件"

前端有 axios 拦截器，后端有 Filter。请求到达 Controller 前会穿过一串 Filter（鉴权、跨域、日志…），思想与前端中间件一致。`JwtAuthenticationFilter` 继承 `OncePerRequestFilter`，保证每个请求只过一次。

### 6. CORS（跨域）

参考独立的 `config/CorsConfig.java`。浏览器同源策略下，前端 `localhost:5173` 调后端 `localhost:8080` 会被拦，后端需显式声明"允许这些来源跨域访问"。这是前后端分离开发的常见问题。

---

## 五、统一响应与全局异常处理（工程化思维）

### 1. 统一响应格式

所有接口返回 `ApiResponse<T>`：

```json
{ "code": 0, "message": "success", "data": {} }
```

好处：前端拿到任何接口的返回结构都一样，可统一处理。`code=0` 成功，非 0 表示各种错误。这是国内 API 设计的事实标准。

### 2. 全局异常处理（参考 `common/GlobalExceptionHandler.java`）

```java
@RestControllerAdvice   // 全局拦截所有 Controller 抛出的异常
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public ApiResponse<Void> handleBusinessException(BusinessException e) {
        return ApiResponse.error(e.getCode(), e.getMessage());
    }
}
```

工程化精髓：Service 只要 `throw new BusinessException(404, "地点不存在")`，剩下的"转成标准错误 JSON 返回前端"由全局处理器统一兜底，不用在每个 Controller 写 try-catch。它还分三档：业务异常（用户能看懂的提示）、404、兜底 500（对外只说"系统异常"，不泄露堆栈——安全考量）。

---

## 六、配置管理与环境隔离

参考 `application.yml` 大量的 `${DB_URL:默认值}` 写法：

```yaml
url: "${DB_URL:jdbc:h2:file:./data/photomap...}"
```

这叫**外部化配置**：冒号前是环境变量名，冒号后是默认值。本地开发没设 `DB_URL` 时自动用内嵌 H2 数据库（轻量、免安装）；线上部署时 docker-compose 注入真正的 PostgreSQL 地址。**同一份代码，不同环境跑不同配置**，是后端部署核心理念。敏感信息（密码、密钥）通过 `.env` 注入，绝不硬编码进代码、不提交 git。

---

## 七、第三方服务集成（腾讯云 COS 对象存储）

照片不存在自己服务器，而是存腾讯云 COS。参考 `controller/CosController.java`、`service/CosStsService.java`。

**关键设计——STS 临时凭证 + 前端直传**：后端不接收图片文件本身（会占满后端带宽），而是给登录用户颁发**临时上传凭证**（有效期短、权限受限），前端拿凭证**直接把图片传到 COS**。后端只管业务数据，文件流量全走云存储。这是处理文件上传的现代最佳实践。schema 里 `photo` 表存 `cos_key`、`url`，正是这个思路——数据库只存文件"地址"，不存文件本身。

---

## 八、部署与运维（Docker + Nginx）

### 1. 容器化（Docker）

参考 `docker-compose.yml`，应用被拆成 3 个容器：`db`（PostGIS 数据库）、`backend`（Spring Boot）、`frontend`（Nginx + Vue 静态资源）。Docker 把"应用 + 它需要的所有环境"打包成镜像，做到"我电脑能跑，服务器也一模一样能跑"，解决环境不一致问题。

值得学的点：

- `depends_on` + `healthcheck`：backend 等 db **健康**了才启动，避免连不上数据库。
- `volumes: pgdata`：数据卷，容器删了数据还在（持久化）。
- `ports: "127.0.0.1:5432:5432"`：数据库只绑定本机，不对公网暴露（安全）。

### 2. Nginx 反向代理

参考 `nginx/default.conf`：

- `location /` 处理前端静态文件，`try_files ... /index.html` 是 SPA 单页应用标准配置（前端路由刷新不 404）。
- `location /api` 把 API 请求转发给后端容器。前后端同域，从根上避免跨域。
- 还有一段拦截 `.env`、`.git`、`wp-` 的规则——防黑客扫描敏感文件，是实战安全加固。

---

## 九、学习路径建议

**第一阶段：跑通请求链路**
亲手用 Postman 调一遍自己的接口（先登录拿 token，再带 token 调 POST 接口），打断点单步跟一遍 Controller → Service → Mapper。比看书快十倍。

**第二阶段：啃透三个核心概念**
事务（`@Transactional`）、JWT 鉴权、ORM 映射。这三个是前端完全没有的、也是后端命根子。

**第三阶段：补 SQL**
能独立写出带 JOIN 的查询，理解索引、连接池。

**第四阶段：理解部署**
能自己 `docker-compose up` 把整套跑起来，看懂 Nginx 配置。

---

## 十、核心术语速查表（前端 ↔ 后端对照）

| 前端概念 | 后端对应 | 本项目位置 |
|---------|---------|-----------|
| 路由表 / 接口定义 | Controller + `@RequestMapping` | `LocationController` |
| axios 拦截器 | Filter / 过滤器链 | `JwtAuthenticationFilter` |
| TypeScript interface | DTO / VO / Entity 类 | `dto/`, `entity/` |
| 表单校验 | `@Valid` + `@NotBlank` 等 | `LocationCreateRequest` |
| localStorage 存 token | JWT 令牌机制 | `JwtUtil` |
| 状态管理 (Pinia/Vuex) | 数据库 + 事务 | `@Transactional` |
| fetch 调后端 | Mapper 调数据库 | `LocationMapper` |
| 统一 request 封装 | 统一响应 ApiResponse | `common/ApiResponse` |
| try-catch 全局错误处理 | `@RestControllerAdvice` | `GlobalExceptionHandler` |
| .env 环境变量 | 外部化配置 `${...}` | `application.yml` |
| 部署到 Vercel/OSS | Docker + Nginx | `docker-compose.yml` |

---

*本文档基于本仓库真实代码生成，可随项目演进持续补充。*
