-- Enable PostGIS extension.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Application users.
CREATE TABLE app_user (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    role          VARCHAR(32) NOT NULL DEFAULT 'USER',
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now(),
    deleted       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_app_user_username ON app_user (username);

-- Locations owned by a user.
CREATE TABLE location (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES app_user(id),
    name            VARCHAR(128) NOT NULL,
    description     TEXT,
    longitude       DOUBLE PRECISION NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    geom            GEOGRAPHY(Point, 4326),
    cover_photo_id  BIGINT,
    travel_date     DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    deleted         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_location_geom ON location USING GIST (geom);
CREATE INDEX idx_location_deleted ON location (deleted);
CREATE INDEX idx_location_user_deleted ON location (user_id, deleted);

-- Photo metadata. Real image files are stored in Tencent COS.
CREATE TABLE photo (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES app_user(id),
    location_id   BIGINT NOT NULL REFERENCES location(id),
    cos_key       VARCHAR(512) NOT NULL,
    url           VARCHAR(1024) NOT NULL,
    thumb_url     VARCHAR(1024),
    width         INT,
    height        INT,
    orientation   VARCHAR(16),
    file_size     BIGINT,
    shot_date     DATE,
    status        VARCHAR(32) NOT NULL DEFAULT 'pending',
    review_reason TEXT,
    reviewed_at   TIMESTAMP,
    sort_order    INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    deleted       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_photo_location ON photo (location_id);
CREATE INDEX idx_photo_deleted ON photo (deleted);
CREATE INDEX idx_photo_user_deleted ON photo (user_id, deleted);
CREATE INDEX idx_photo_user_status ON photo (user_id, status);

-- Text search/RAG placeholder index. A later migration can add pgvector columns.
CREATE TABLE photo_embedding (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES app_user(id),
    photo_id    BIGINT NOT NULL REFERENCES photo(id),
    location_id BIGINT NOT NULL REFERENCES location(id),
    caption     TEXT,
    tags        TEXT,
    search_text TEXT,
    embedding   vector(1024),
    index_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    analysis_model VARCHAR(128),
    embedding_model VARCHAR(128),
    retry_count INT NOT NULL DEFAULT 0,
    index_error TEXT,
    content_hash VARCHAR(64),
    indexed_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_embedding_user ON photo_embedding (user_id);
CREATE INDEX idx_photo_embedding_photo ON photo_embedding (photo_id);
CREATE UNIQUE INDEX uk_photo_embedding_photo ON photo_embedding (photo_id);
CREATE INDEX idx_photo_embedding_status ON photo_embedding (user_id, index_status);
CREATE INDEX idx_photo_embedding_hnsw
    ON photo_embedding USING hnsw (embedding vector_cosine_ops);

-- Knowledge blog categories, tags, assets and posts.
CREATE TABLE blog_category (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES app_user(id),
    name          VARCHAR(64) NOT NULL,
    slug          VARCHAR(80) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_blog_category_user_slug UNIQUE (user_id, slug)
);

CREATE TABLE blog_tag (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES app_user(id),
    name       VARCHAR(32) NOT NULL,
    slug       VARCHAR(48) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_blog_tag_user_slug UNIQUE (user_id, slug)
);

CREATE TABLE blog_asset (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES app_user(id),
    object_key    VARCHAR(512) NOT NULL,
    original_name VARCHAR(255),
    content_type  VARCHAR(128),
    width         INT,
    height        INT,
    fallback_url  VARCHAR(1024),
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    deleted       BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_blog_asset_object_key UNIQUE (object_key)
);

CREATE TABLE blog_post (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES app_user(id),
    category_id      BIGINT REFERENCES blog_category(id),
    cover_asset_id   BIGINT REFERENCES blog_asset(id),
    title            VARCHAR(160) NOT NULL DEFAULT '',
    slug             VARCHAR(180) NOT NULL,
    excerpt          VARCHAR(320),
    content_markdown TEXT NOT NULL DEFAULT '',
    status           VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    published_at     TIMESTAMP,
    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP NOT NULL DEFAULT now(),
    deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_blog_post_user_slug UNIQUE (user_id, slug),
    CONSTRAINT ck_blog_post_status CHECK (status IN ('DRAFT', 'PUBLISHED'))
);

CREATE TABLE blog_post_tag (
    post_id BIGINT NOT NULL REFERENCES blog_post(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES blog_tag(id),
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_blog_post_public ON blog_post (user_id, status, published_at DESC) WHERE deleted = FALSE;
CREATE INDEX idx_blog_post_category ON blog_post (category_id, status, published_at DESC);
CREATE INDEX idx_blog_asset_user_deleted ON blog_asset (user_id, deleted);
CREATE INDEX idx_blog_post_tag_tag ON blog_post_tag (tag_id, post_id);
CREATE INDEX idx_blog_post_search_trgm ON blog_post USING GIN (
    lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content_markdown, '')) gin_trgm_ops
);

-- Keep geography point in sync with longitude/latitude.
CREATE OR REPLACE FUNCTION set_geom() RETURNS trigger AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_location_geom
    BEFORE INSERT OR UPDATE OF longitude, latitude ON location
    FOR EACH ROW EXECUTE FUNCTION set_geom();
