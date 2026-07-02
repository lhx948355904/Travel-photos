-- Enable PostGIS extension.
CREATE EXTENSION IF NOT EXISTS postgis;

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
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_embedding_user ON photo_embedding (user_id);
CREATE INDEX idx_photo_embedding_photo ON photo_embedding (photo_id);

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
