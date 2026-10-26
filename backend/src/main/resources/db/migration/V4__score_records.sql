CREATE TABLE score_record (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    title VARCHAR(100) NOT NULL,
    player_one VARCHAR(60) NOT NULL,
    player_two VARCHAR(60) NOT NULL,
    score_one INT NOT NULL,
    score_two INT NOT NULL,
    played_at TIMESTAMP NOT NULL,
    venue VARCHAR(100),
    note VARCHAR(300),
    image_key VARCHAR(512),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_score_nonnegative CHECK (score_one >= 0 AND score_two >= 0),
    CONSTRAINT ck_score_not_empty CHECK (score_one + score_two > 0)
);

CREATE INDEX idx_score_record_public ON score_record (user_id, played_at DESC) WHERE deleted = FALSE;
