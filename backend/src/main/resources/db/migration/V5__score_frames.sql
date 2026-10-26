CREATE TABLE score_frame (
    id BIGSERIAL PRIMARY KEY,
    record_id BIGINT NOT NULL REFERENCES score_record(id) ON DELETE CASCADE,
    frame_number INT NOT NULL,
    points_one INT NOT NULL,
    points_two INT NOT NULL,
    CONSTRAINT uk_score_frame_number UNIQUE (record_id, frame_number),
    CONSTRAINT ck_score_frame_range CHECK (points_one BETWEEN 0 AND 200 AND points_two BETWEEN 0 AND 200),
    CONSTRAINT ck_score_frame_winner CHECK (points_one <> points_two)
);

CREATE INDEX idx_score_frame_record ON score_frame (record_id, frame_number);
