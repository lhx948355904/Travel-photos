package com.photomap.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("location")
public class Location {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;
    private String description;
    private Double longitude;
    private Double latitude;

    @TableField(exist = false)
    private String geom;

    @TableField("cover_photo_id")
    private Long coverPhotoId;

    @TableField("travel_date")
    private LocalDate travelDate;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic
    @TableField("deleted")
    private Boolean deleted;
}
