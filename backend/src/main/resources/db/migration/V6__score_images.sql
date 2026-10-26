CREATE TABLE score_image (
    id BIGSERIAL PRIMARY KEY,
    record_id BIGINT NOT NULL REFERENCES score_record(id) ON DELETE CASCADE,
    image_key VARCHAR(512) NOT NULL,
    sort_order INT NOT NULL,
    CONSTRAINT uk_score_image_order UNIQUE (record_id, sort_order)
);

CREATE INDEX idx_score_image_record ON score_image (record_id, sort_order);

INSERT INTO score_image (record_id, image_key, sort_order)
SELECT id, image_key, 0 FROM score_record WHERE image_key IS NOT NULL;
