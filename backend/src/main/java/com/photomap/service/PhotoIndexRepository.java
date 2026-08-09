package com.photomap.service;

import com.photomap.dto.PhotoIndexCandidate;
import com.photomap.dto.PhotoIndexCoverageVO;
import com.photomap.dto.PhotoIndexStatusVO;
import com.photomap.dto.SearchPhotoVO;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import javax.sql.DataSource;
import java.sql.DatabaseMetaData;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Repository
@RequiredArgsConstructor
public class PhotoIndexRepository {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;
    private volatile Boolean postgres;

    public boolean isVectorSearchAvailable() {
        if (!isPostgres()) {
            return false;
        }
        try {
            Boolean installed = jdbcTemplate.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')",
                    Boolean.class
            );
            return Boolean.TRUE.equals(installed);
        } catch (Exception ignored) {
            return false;
        }
    }

    public List<PhotoIndexCandidate> findCandidates(Long userId, int limit) {
        return jdbcTemplate.query("""
                SELECT
                    p.id AS photo_id,
                    p.location_id,
                    p.cos_key,
                    p.url,
                    p.thumb_url,
                    l.name AS location_name,
                    l.description AS location_description,
                    CAST(l.travel_date AS VARCHAR) AS travel_date,
                    CAST(p.shot_date AS VARCHAR) AS shot_date,
                    p.orientation,
                    pe.caption,
                    pe.tags,
                    pe.retry_count,
                    pe.content_hash
                FROM photo_embedding pe
                JOIN photo p ON p.id = pe.photo_id
                JOIN location l ON l.id = pe.location_id
                WHERE pe.user_id = ?
                  AND pe.index_status = 'PENDING'
                  AND (pe.next_retry_at IS NULL OR pe.next_retry_at <= CURRENT_TIMESTAMP)
                  AND p.deleted = false
                  AND l.deleted = false
                  AND p.status = 'approved'
                ORDER BY pe.updated_at, pe.photo_id
                LIMIT ?
                """, (rs, rowNum) -> {
            PhotoIndexCandidate candidate = new PhotoIndexCandidate();
            candidate.setPhotoId(rs.getLong("photo_id"));
            candidate.setLocationId(rs.getLong("location_id"));
            candidate.setCosKey(rs.getString("cos_key"));
            candidate.setUrl(rs.getString("url"));
            candidate.setThumbUrl(rs.getString("thumb_url"));
            candidate.setLocationName(rs.getString("location_name"));
            candidate.setLocationDescription(rs.getString("location_description"));
            candidate.setTravelDate(rs.getString("travel_date"));
            candidate.setShotDate(rs.getString("shot_date"));
            candidate.setOrientation(rs.getString("orientation"));
            candidate.setCaption(rs.getString("caption"));
            candidate.setTags(rs.getString("tags"));
            candidate.setRetryCount(rs.getInt("retry_count"));
            candidate.setContentHash(rs.getString("content_hash"));
            return candidate;
        }, userId, limit);
    }

    public boolean markProcessing(Long photoId) {
        return jdbcTemplate.update("""
                UPDATE photo_embedding
                SET index_status = 'PROCESSING', index_error = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE photo_id = ? AND index_status = 'PENDING'
                """, photoId) == 1;
    }

    public int recoverStaleProcessing() {
        return jdbcTemplate.update("""
                UPDATE photo_embedding
                SET index_status = 'PENDING',
                    index_error = '上一次索引任务中断，已自动重新排队',
                    next_retry_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE index_status = 'PROCESSING'
                  AND updated_at < ?
                """, LocalDateTime.now().minusMinutes(10));
    }

    public void markReady(Long photoId,
                          String caption,
                          String tags,
                          String searchText,
                          float[] embedding,
                          String analysisModel,
                          String embeddingModel,
                          String contentHash) {
        if (!isVectorSearchAvailable()) {
            throw new IllegalStateException("PostgreSQL pgvector 扩展未启用");
        }
        jdbcTemplate.update("""
                UPDATE photo_embedding
                SET caption = ?,
                    tags = ?,
                    search_text = ?,
                    embedding = CAST(? AS vector),
                    index_status = 'READY',
                    analysis_model = ?,
                    embedding_model = ?,
                    retry_count = 0,
                    index_error = NULL,
                    content_hash = ?,
                    indexed_at = CURRENT_TIMESTAMP,
                    next_retry_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE photo_id = ?
                """,
                caption,
                tags,
                searchText,
                vectorLiteral(embedding),
                analysisModel,
                embeddingModel,
                contentHash,
                photoId
        );
    }

    public boolean restoreReadyIfUnchanged(Long photoId, String contentHash) {
        if (!isVectorSearchAvailable() || !StringUtils.hasText(contentHash)) {
            return false;
        }
        return jdbcTemplate.update("""
                UPDATE photo_embedding
                SET index_status = 'READY',
                    retry_count = 0,
                    index_error = NULL,
                    next_retry_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE photo_id = ?
                  AND embedding IS NOT NULL
                  AND content_hash = ?
                """, photoId, contentHash) == 1;
    }

    public void markRetry(Long photoId, int retryCount, int maxRetries, String error) {
        boolean exhausted = retryCount >= maxRetries;
        long delaySeconds = Math.min(300, 15L * (1L << Math.max(0, retryCount - 1)));
        LocalDateTime nextRetry = exhausted ? null : LocalDateTime.now().plusSeconds(delaySeconds);
        jdbcTemplate.update("""
                UPDATE photo_embedding
                SET index_status = ?,
                    retry_count = ?,
                    index_error = ?,
                    next_retry_at = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE photo_id = ?
                """,
                exhausted ? "FAILED" : "PENDING",
                retryCount,
                truncate(error, 1000),
                nextRetry,
                photoId
        );
    }

    public int queueMissing(Long userId) {
        if (!isPostgres()) {
            return 0;
        }
        return jdbcTemplate.update("""
                INSERT INTO photo_embedding (
                    user_id, photo_id, location_id, caption, tags, search_text,
                    index_status, retry_count, created_at, updated_at
                )
                SELECT
                    p.user_id,
                    p.id,
                    p.location_id,
                    l.name,
                    CONCAT_WS(',', l.name, CAST(l.travel_date AS VARCHAR), CAST(p.shot_date AS VARCHAR), p.orientation),
                    CONCAT_WS(' ', l.name, l.description, CAST(l.travel_date AS VARCHAR),
                              CAST(p.shot_date AS VARCHAR), p.orientation),
                    'PENDING',
                    0,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                FROM photo p
                JOIN location l ON l.id = p.location_id
                WHERE p.user_id = ?
                  AND l.user_id = ?
                  AND p.deleted = false
                  AND l.deleted = false
                  AND p.status = 'approved'
                ON CONFLICT (photo_id) DO NOTHING
                """, userId, userId);
    }

    public int rebuild(Long userId, boolean all) {
        queueMissing(userId);
        String condition = all
                ? "pe.user_id = ?"
                : "pe.user_id = ? AND (pe.index_status <> 'READY' OR pe.embedding IS NULL)";
        return jdbcTemplate.update("""
                UPDATE photo_embedding pe
                SET index_status = 'PENDING',
                    retry_count = 0,
                    index_error = NULL,
                    content_hash = CASE WHEN ? THEN NULL ELSE content_hash END,
                    next_retry_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE """ + condition, all, userId);
    }

    public void requeueLocation(Long userId, Long locationId) {
        jdbcTemplate.update("""
                UPDATE photo_embedding
                SET index_status = 'PENDING',
                    retry_count = 0,
                    index_error = NULL,
                    next_retry_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND location_id = ?
                """, userId, locationId);
    }

    public List<SearchPhotoVO> vectorSearch(Long userId, String query, float[] embedding, int limit) {
        if (!isVectorSearchAvailable()) {
            return List.of();
        }
        return jdbcTemplate.query("""
                WITH ranked AS (
                    SELECT
                        p.id AS photo_id,
                        l.id AS location_id,
                        l.name AS location_name,
                        p.url,
                        p.thumb_url,
                        CAST(p.shot_date AS VARCHAR) AS shot_date,
                        pe.caption,
                        pe.tags,
                        1 - (pe.embedding <=> CAST(? AS vector)) AS vector_score,
                        GREATEST(
                            similarity(LOWER(COALESCE(pe.search_text, '')), LOWER(?)),
                            CASE WHEN LOWER(COALESCE(pe.search_text, '')) LIKE
                                      CONCAT('%', LOWER(?), '%')
                                 THEN 1.0 ELSE 0.0 END
                        ) AS text_score
                    FROM photo_embedding pe
                    JOIN photo p ON p.id = pe.photo_id
                    JOIN location l ON l.id = pe.location_id
                    WHERE pe.user_id = ?
                      AND p.user_id = ?
                      AND l.user_id = ?
                      AND pe.index_status = 'READY'
                      AND pe.embedding IS NOT NULL
                      AND p.deleted = false
                      AND l.deleted = false
                      AND p.status = 'approved'
                )
                SELECT *,
                       (0.85 * vector_score + 0.15 * text_score) AS score
                FROM ranked
                ORDER BY score DESC
                LIMIT ?
                """, (rs, rowNum) -> mapSearchResult(rs),
                vectorLiteral(embedding), query, query, userId, userId, userId, limit);
    }

    public PhotoIndexCoverageVO coverage(Long userId) {
        return jdbcTemplate.queryForObject("""
                SELECT
                    COUNT(*) AS total,
                    COALESCE(SUM(CASE WHEN pe.index_status = 'READY' THEN 1 ELSE 0 END), 0) AS ready
                FROM photo_embedding pe
                JOIN photo p ON p.id = pe.photo_id
                JOIN location l ON l.id = pe.location_id
                WHERE pe.user_id = ?
                  AND p.deleted = false
                  AND l.deleted = false
                  AND p.status = 'approved'
                """, (rs, rowNum) ->
                new PhotoIndexCoverageVO(rs.getLong("ready"), rs.getLong("total")), userId);
    }

    public PhotoIndexStatusVO status(Long userId, boolean aiEnabled, boolean providerReady) {
        return jdbcTemplate.queryForObject("""
                SELECT
                    COUNT(*) AS total,
                    COALESCE(SUM(CASE WHEN pe.index_status = 'READY' THEN 1 ELSE 0 END), 0) AS ready,
                    COALESCE(SUM(CASE WHEN pe.index_status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending,
                    COALESCE(SUM(CASE WHEN pe.index_status = 'PROCESSING' THEN 1 ELSE 0 END), 0) AS processing,
                    COALESCE(SUM(CASE WHEN pe.index_status = 'FAILED' THEN 1 ELSE 0 END), 0) AS failed,
                    MAX(pe.indexed_at) AS last_indexed_at
                FROM photo_embedding pe
                JOIN photo p ON p.id = pe.photo_id
                JOIN location l ON l.id = pe.location_id
                WHERE pe.user_id = ?
                  AND p.deleted = false
                  AND l.deleted = false
                  AND p.status = 'approved'
                """, (rs, rowNum) -> PhotoIndexStatusVO.builder()
                .total(rs.getLong("total"))
                .ready(rs.getLong("ready"))
                .pending(rs.getLong("pending"))
                .processing(rs.getLong("processing"))
                .failed(rs.getLong("failed"))
                .lastIndexedAt(rs.getTimestamp("last_indexed_at") == null
                        ? null
                        : rs.getTimestamp("last_indexed_at").toLocalDateTime().toString())
                .aiEnabled(aiEnabled)
                .providerReady(providerReady)
                .build(), userId);
    }

    private SearchPhotoVO mapSearchResult(ResultSet rs) throws SQLException {
        SearchPhotoVO result = new SearchPhotoVO();
        result.setPhotoId(rs.getLong("photo_id"));
        result.setLocationId(rs.getLong("location_id"));
        result.setLocationName(rs.getString("location_name"));
        result.setUrl(rs.getString("url"));
        result.setThumbUrl(rs.getString("thumb_url"));
        result.setShotDate(rs.getString("shot_date"));
        result.setCaption(rs.getString("caption"));
        result.setTags(rs.getString("tags"));
        result.setScore(rs.getDouble("score"));
        return result;
    }

    private boolean isPostgres() {
        if (postgres != null) {
            return postgres;
        }
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metadata = connection.getMetaData();
            postgres = metadata.getDatabaseProductName().toLowerCase(Locale.ROOT).contains("postgres");
        } catch (SQLException e) {
            postgres = false;
        }
        return postgres;
    }

    private String vectorLiteral(float[] embedding) {
        StringBuilder builder = new StringBuilder(embedding.length * 10).append('[');
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(Float.toString(embedding[i]));
        }
        return builder.append(']').toString();
    }

    private String truncate(String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return "未知索引错误";
        }
        String normalized = value.trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }
}
