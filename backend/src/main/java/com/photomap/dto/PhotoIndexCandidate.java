package com.photomap.dto;

import lombok.Data;

@Data
public class PhotoIndexCandidate {
    private Long photoId;
    private Long locationId;
    private String cosKey;
    private String url;
    private String thumbUrl;
    private String locationName;
    private String locationDescription;
    private String travelDate;
    private String shotDate;
    private String orientation;
    private String caption;
    private String tags;
    private Integer retryCount;
    private String contentHash;
}
