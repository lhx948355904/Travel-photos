CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS blog_category (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES app_user(id),
    name          VARCHAR(64) NOT NULL,
    slug          VARCHAR(80) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_blog_category_user_slug UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS blog_tag (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES app_user(id),
    name       VARCHAR(32) NOT NULL,
    slug       VARCHAR(48) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_blog_tag_user_slug UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS blog_asset (
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

CREATE TABLE IF NOT EXISTS blog_post (
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

CREATE TABLE IF NOT EXISTS blog_post_tag (
    post_id BIGINT NOT NULL REFERENCES blog_post(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES blog_tag(id),
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_public
    ON blog_post (user_id, status, published_at DESC)
    WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_blog_post_category
    ON blog_post (category_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_asset_user_deleted
    ON blog_asset (user_id, deleted);
CREATE INDEX IF NOT EXISTS idx_blog_post_tag_tag
    ON blog_post_tag (tag_id, post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_search_trgm
    ON blog_post USING GIN (
        lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content_markdown, '')) gin_trgm_ops
    );
