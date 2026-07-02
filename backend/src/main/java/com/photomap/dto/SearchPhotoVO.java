package com.photomap.dto;

import lombok.Data;

@Data
public class SearchPhotoVO {
    private Long photoId;
    private Long locationId;
    private String locationName;
    private String url;
    private String thumbUrl;
    private String shotDate;
    private String caption;
    private String tags;
    private Double score;
}
