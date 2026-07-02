package com.photomap.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("photo")
public class Photo {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("location_id")
    private Long locationId;

    @TableField("cos_key")
    private String cosKey;

    private String url;

    @TableField("thumb_url")
    private String thumbUrl;

    private Integer width;
    private Integer height;
    private String orientation;

    @TableField("file_size")
    private Long fileSize;

    @TableField("shot_date")
    private LocalDate shotDate;

    private String status;

    @TableField("review_reason")
    private String reviewReason;

    @TableField("reviewed_at")
    private LocalDateTime reviewedAt;

    @TableField("sort_order")
    private Integer sortOrder;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableLogic
    @TableField("deleted")
    private Boolean deleted;
}
