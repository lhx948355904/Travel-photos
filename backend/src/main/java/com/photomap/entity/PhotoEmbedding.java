package com.photomap.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("photo_embedding")
public class PhotoEmbedding {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("photo_id")
    private Long photoId;

    @TableField("location_id")
    private Long locationId;

    private String caption;

    private String tags;

    @TableField("search_text")
    private String searchText;

    @TableField("index_status")
    private String indexStatus;

    @TableField("analysis_model")
    private String analysisModel;

    @TableField("embedding_model")
    private String embeddingModel;

    @TableField("retry_count")
    private Integer retryCount;

    @TableField("index_error")
    private String indexError;

    @TableField("content_hash")
    private String contentHash;

    @TableField("indexed_at")
    private LocalDateTime indexedAt;

    @TableField("next_retry_at")
    private LocalDateTime nextRetryAt;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
