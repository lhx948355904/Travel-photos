-- 启用 PostGIS 扩展
CREATE EXTENSION IF NOT EXISTS postgis;

-- 地点表
CREATE TABLE location (
    id              BIGSERIAL PRIMARY KEY,
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

-- 照片表
CREATE TABLE photo (
    id          BIGSERIAL PRIMARY KEY,
    location_id BIGINT NOT NULL REFERENCES location(id),
    cos_key     VARCHAR(512) NOT NULL,
    url         VARCHAR(1024) NOT NULL,
    thumb_url   VARCHAR(1024),
    width       INT,
    height      INT,
    orientation VARCHAR(16),
    file_size   BIGINT,
    shot_date   DATE,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    deleted     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_photo_location ON photo (location_id);
CREATE INDEX idx_photo_deleted ON photo (deleted);

-- 触发器：写入 longitude/latitude 时自动生成 geom
CREATE OR REPLACE FUNCTION set_geom() RETURNS trigger AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_location_geom
    BEFORE INSERT OR UPDATE OF longitude, latitude ON location
    FOR EACH ROW EXECUTE FUNCTION set_geom();
