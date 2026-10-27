package com.photomap.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("score_gallery_image")
public class ScoreGalleryImage {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long entryId;
    private String imageKey;
    private Integer sortOrder;
}
