CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE photo_embedding
    ADD COLUMN IF NOT EXISTS embedding vector(1024),
    ADD COLUMN IF NOT EXISTS index_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS analysis_model VARCHAR(128),
    ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(128),
    ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS index_error TEXT,
    ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;

UPDATE photo_embedding
SET index_status = 'PENDING'
WHERE embedding IS NULL;

-- Older releases did not enforce one index row per photo. Keep the newest row
-- so adding the unique index remains safe on an existing database.
DELETE FROM photo_embedding
WHERE id IN (
    SELECT id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY photo_id
                ORDER BY updated_at DESC NULLS LAST, id DESC
            ) AS row_number
        FROM photo_embedding
    ) duplicates
    WHERE duplicates.row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_photo_embedding_photo
    ON photo_embedding (photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_embedding_status
    ON photo_embedding (user_id, index_status);
CREATE INDEX IF NOT EXISTS idx_photo_embedding_hnsw
    ON photo_embedding USING hnsw (embedding vector_cosine_ops);
