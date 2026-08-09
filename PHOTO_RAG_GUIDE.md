# 照片 RAG 查询使用与部署说明

## 1. 先给结论

`/map` 页面现在支持用自然语言查询旅行照片，例如：

- 哪次旅行拍到了海边日落？
- 找出有古建筑和红墙的照片。
- 有没有下雨天拍摄的照片？

系统不会让大模型直接浏览整个数据库。它先从照片索引中找出相关照片，再让模型只根据这些照片的描述、地点和日期回答，并把实际照片作为证据返回。

没有配置 AI、免费额度用完或云服务故障时，地图、上传、画廊和原有关键词搜索仍然可以使用。

## 2. RAG 是什么

RAG 是 Retrieval-Augmented Generation，即“检索增强生成”。

### 它是什么

RAG 把一次问答拆成两个主要阶段：

1. 检索：从可信数据中找出与问题相关的内容。
2. 生成：大模型只根据检索内容组织回答。

本项目还多了一个离线索引阶段：

```text
照片 -> 视觉描述/标签 -> 多模态向量 -> pgvector
问题 -> 查询向量 -> 召回照片 -> 有证据的回答
```

### 为什么需要它

普通大模型不知道你的私人旅行照片。即使知道“厦门有海”，也不能据此断言你的相册里拍过厦门海边。

RAG 解决的是“回答必须来自当前相册”的问题：

- 模型不能凭常识伪造相册内容。
- 回答可以链接到真实照片。
- 照片删除或新增后，索引可以同步更新。

### 前端类比

可以把它类比成一个前端搜索页面：

- Embedding 类似把不同写法转换成统一的“语义查询参数”。
- pgvector 类似为语义距离建立的数据库索引。
- Retrieval 类似接口先返回匹配记录。
- Generation 类似前端拿到记录后生成一段摘要，但摘要只能使用接口返回的数据。

## 3. 游客如何使用

1. 打开 `/map`。
2. 在侧栏找到“AI Photo Search”。
3. 输入 2～200 字的问题，或者点击示例问题。
4. 查看回答和编号照片证据。
5. 点击任意证据，画廊会打开并定位到对应照片。

页面可能显示以下模式：

| 模式 | 含义 |
|---|---|
| AI 回答 | 已完成向量检索，并基于照片证据生成回答 |
| 语义找图 | 找到了语义相关照片，但回答额度用完或生成模型暂时不可用 |
| 关键词结果 | AI 未启用或向量服务不可用，使用原有关键词搜索 |
| 证据不足 | 当前照片与问题相关度不足，系统不会强行作答 |

## 4. 管理员如何建立索引

### 第一次使用

1. 登录管理员账号。
2. 打开 `/map` 的 AI 搜索区域。
3. 确认“AI 索引”显示“已就绪”。
4. 点击“构建缺失索引”。
5. 页面每 10 秒刷新一次进度。

建议第一次只准备约 10 张照片，确认百炼额度、图片访问和检索效果正常后再全量构建。

### 两个重建选项

- 构建缺失索引：处理新照片、失败照片和未处理照片，日常优先使用。
- 重建全部：重新分析所有照片，会再次调用云模型；仅在更换模型或照片描述规则后使用。

新上传照片会自动进入后台队列，不会阻塞上传操作。

### 状态含义

| 状态 | 含义 |
|---|---|
| `PENDING` | 等待处理或等待重试 |
| `PROCESSING` | 正在调用视觉和向量模型 |
| `READY` | 可以参与语义检索 |
| `FAILED` | 达到最大重试次数，需要处理错误后重新构建 |

## 5. 阿里云百炼准备

1. 在阿里云百炼华北 2（北京）地域开通服务。
2. 创建 API Key。
3. 在免费额度页面检查以下模型：
   - `qwen3-vl-embedding`
   - `qwen3-vl-flash`
   - `qwen3.6-flash`
4. 为有免费额度的模型开启“免费额度用完即停”。
5. 把 Key 只写入服务器 `.env`，不要写入前端变量或提交 Git。

免费额度不是永久免费的。北京地域新人额度通常有效 90 天；额度耗尽或过期后，已认证账号可能继续按量扣费。以百炼控制台当日显示为准。

参考：

- [百炼新人免费额度](https://help.aliyun.com/zh/model-studio/new-free-quota/)
- [多模态向量 API](https://help.aliyun.com/zh/model-studio/multimodal-embedding-api-reference)
- [模型价格](https://help.aliyun.com/zh/model-studio/model-pricing)

## 6. 环境变量

复制 `.env.example` 中的 AI 部分到实际 `.env`：

```properties
AI_ENABLED=true
AI_PUBLIC_ENABLED=false
AI_PROVIDER=dashscope
DASHSCOPE_API_KEY=sk-your-key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com

AI_EMBEDDING_MODEL=qwen3-vl-embedding
AI_EMBEDDING_DIMENSION=1024
AI_VISION_MODEL=qwen3-vl-flash
AI_CHAT_MODEL=qwen3.6-flash
AI_REQUEST_CONNECT_TIMEOUT_MS=10000
AI_REQUEST_READ_TIMEOUT_MS=60000

AI_RAG_MIN_SCORE=0.30
AI_RAG_CANDIDATE_LIMIT=20
AI_RAG_EVIDENCE_LIMIT=8
AI_RAG_DAILY_GENERATION_LIMIT=300
AI_RAG_RATE_LIMIT_COUNT=10
AI_RAG_RATE_LIMIT_WINDOW_SECONDS=300
AI_RAG_CACHE_SECONDS=600
AI_INDEX_BATCH_SIZE=5
AI_INDEX_POLL_DELAY_MS=5000
AI_INDEX_MAX_RETRIES=3
```

推荐上线顺序：

1. 先设置 `AI_ENABLED=true`、`AI_PUBLIC_ENABLED=false`。
2. 管理员构建 10 张照片并测试。
3. 确认结果和费用后设置 `AI_PUBLIC_ENABLED=true`。

### 关键开关

- `AI_ENABLED`：是否允许后台建立索引。
- `AI_PUBLIC_ENABLED`：是否允许游客使用语义问答。
- `AI_RAG_DAILY_GENERATION_LIMIT`：每日最多生成多少次回答，达到后只返回照片。
- `AI_RAG_RATE_LIMIT_COUNT`：单个 IP 在一个窗口内最多请求次数。

## 7. 数据库升级

### 为什么需要 pgvector

普通数据库索引擅长比较数字和字符串；pgvector 给 PostgreSQL 增加了向量类型和“哪些向量更接近”的查询能力。

项目使用：

- `vector(1024)` 保存照片向量。
- 余弦距离比较问题和照片的语义相似度。
- HNSW 索引提高照片数量较多时的查询速度。

### Docker 部署

升级前先备份数据库：

```powershell
docker compose exec -T db pg_dump -U photomap photomap > backups/photomap-before-rag.sql
```

然后构建并启动：

```powershell
docker compose build db backend frontend
docker compose up -d
docker compose logs -f backend
```

如果 `ADMIN_PASSWORD_HASH` 是 BCrypt 字符串，`.env` 中请用单引号包住整个值，例如
`ADMIN_PASSWORD_HASH='$2a$10$...'`。否则 Docker Compose 会把 `$` 后的内容误当成变量并给出插值警告。

后端启动时 Flyway 会：

1. 为现有数据库建立迁移基线。
2. 启用 `vector` 和 `pg_trgm` 扩展。
3. 扩展 `photo_embedding` 表。
4. 创建唯一索引和 HNSW 索引。

Flyway 只在 Docker PostgreSQL 环境默认开启。本地 H2 会保留关键词降级，不支持真实向量查询。

## 8. 接口说明

### 公开 RAG 查询

```http
POST /api/search/photos/rag
Content-Type: application/json

{
  "query": "哪里拍过海边日落？",
  "limit": 8
}
```

### 管理员索引状态

```http
GET /api/ai/photo-index/status
Authorization: Bearer <JWT>
```

### 管理员建立索引

```http
POST /api/ai/photo-index/rebuild
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "scope": "missing"
}
```

`scope` 只能是 `missing` 或 `all`。

## 9. 费用和隐私

### 费用来源

- 照片首次分析：视觉模型 + 多模态 Embedding。
- 每次新问题：文本 Embedding。
- 有足够证据的查询：额外调用一次回答模型。
- 腾讯云 COS：云模型读取照片时可能产生少量外网流量。

控制成本的措施：

- 图片优先使用缩略图。
- 相同问题缓存 10 分钟。
- 单 IP 每 5 分钟最多 10 次。
- 默认每天最多生成 300 次回答。
- 没有足够证据时不调用回答模型。

### 隐私边界

- 只有已审核照片会进入索引。
- 图片通过 COS URL 或 Base64 发送给百炼模型处理。
- COS 私有对象使用短期签名 URL，不保存到数据库。
- API Key 只存在后端环境变量中。
- 回答模型只接收召回照片的描述、地点、日期和照片 ID。
- 不做人脸身份推断，不根据照片猜测敏感身份。

如果照片不允许发送到第三方云模型，应关闭 AI，或后续接入本地模型适配器。

## 10. 常见问题

### 页面显示“AI 未就绪”

检查：

- `AI_ENABLED=true`
- `DASHSCOPE_API_KEY` 是否正确
- PostgreSQL 是否已安装 `vector`
- Flyway V2 是否执行成功
- 后端能否访问 `dashscope.aliyuncs.com`

### 照片一直失败

常见原因：

- COS URL 无法被外部访问。
- 本地图片 Base64 超过 10MB。
- 图片格式不受模型支持。
- 免费额度耗尽或触发百炼限流。
- Embedding 维度与数据库 `vector(1024)` 不一致。

修复配置后点击“构建缺失索引”。

### 为什么更换模型后必须重建

不同 Embedding 模型产生的向量空间不同。它们看起来都是数字数组，但数字之间不可直接比较，类似不能把两个不同坐标系的坐标混在同一张地图上。

### 为什么有照片却回答“证据不足”

向量分数只表示语义相关度，不代表事实正确。默认阈值 `0.30` 是首版保护值，应使用真实照片和测试问题评估后调整。

## 11. 常见误区

- 把 Embedding 当成照片描述：Embedding 是数字向量，不是可阅读文本。
- 认为有向量检索就是完整 RAG：没有基于证据的生成和引用校验时，只是语义搜索。
- 在上传事务里调用模型：模型超时会导致正常照片上传失败。
- 把 API Key 放进 `VITE_*`：Vite 环境变量会进入浏览器构建产物。
- 只看回答不看证据：RAG 仍可能出错，照片证据才是可核验来源。
- 修改 Embedding 维度却不迁移数据库：会导致向量写入失败。

## 12. 易错题

### 题目一

问题：用户搜索“晚霞”，数据库里只有标签“日落”，普通 SQL `LIKE` 和向量搜索都一定能找到吗？

答案：不是。`LIKE` 通常找不到不同词；向量搜索更可能找到，但仍取决于模型和阈值，不能保证百分之百召回。

### 题目二

问题：回答模型说照片 ID 999 支持结论，但检索结果没有 ID 999，可以直接展示吗？

答案：不可以。后端必须校验引用属于本次召回证据，否则退化为只展示语义搜索结果。

### 题目三

问题：免费额度用完后，网站必须停止服务吗？

答案：不需要。只关闭 AI 调用并降级到关键词搜索，地图、照片上传和画廊继续工作。
