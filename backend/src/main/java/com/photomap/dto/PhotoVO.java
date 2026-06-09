package com.photomap.dto;

import lombok.Data;

@Data
public class PhotoVO {
    private Long id;
    private String url;
    private String thumbUrl;
    private Integer width;
    private Integer height;
    private String orientation;
    private String shotDate;
    private Integer sortOrder;
}
