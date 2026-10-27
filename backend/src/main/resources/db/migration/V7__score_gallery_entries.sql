CREATE TABLE score_gallery_entry (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    title VARCHAR(100) NOT NULL,
    played_at TIMESTAMP NOT NULL,
    note VARCHAR(300),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_score_gallery_entry_public
    ON score_gallery_entry (user_id, played_at DESC) WHERE deleted = FALSE;

CREATE TABLE score_gallery_image (
    id BIGSERIAL PRIMARY KEY,
    entry_id BIGINT NOT NULL REFERENCES score_gallery_entry(id) ON DELETE CASCADE,
    image_key VARCHAR(512) NOT NULL,
    sort_order INT NOT NULL,
    CONSTRAINT uk_score_gallery_image_order UNIQUE (entry_id, sort_order)
);

CREATE INDEX idx_score_gallery_image_entry ON score_gallery_image (entry_id, sort_order);
