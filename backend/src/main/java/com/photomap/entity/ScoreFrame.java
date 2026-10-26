package com.photomap.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("score_frame")
public class ScoreFrame {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long recordId;
    private Integer frameNumber;
    private Integer pointsOne;
    private Integer pointsTwo;
}
