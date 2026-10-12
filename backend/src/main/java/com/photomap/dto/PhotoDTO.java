package com.photomap.dto;

import lombok.Data;

@Data
public class PhotoDTO {
    private String cosKey;
    private String url;
    private String thumbUrl;
    private Integer width;
    private Integer height;
    private String orientation;
    private Long fileSize;
    private String shotDate;
}
