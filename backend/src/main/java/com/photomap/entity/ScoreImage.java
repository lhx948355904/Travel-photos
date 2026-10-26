package com.photomap.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("score_image")
public class ScoreImage {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long recordId;
    private String imageKey;
    private Integer sortOrder;
}
