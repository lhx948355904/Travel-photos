package com.photomap.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("score_record")
public class ScoreRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String title;
    private String playerOne;
    private String playerTwo;
    private Integer scoreOne;
    private Integer scoreTwo;
    private LocalDateTime playedAt;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String venue;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String note;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String imageKey;
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Boolean deleted;
}
