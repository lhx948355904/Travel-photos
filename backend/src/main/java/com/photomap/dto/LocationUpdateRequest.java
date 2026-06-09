package com.photomap.dto;

import lombok.Data;

@Data
public class LocationUpdateRequest {
    private String name;
    private String description;
    private Double longitude;
    private Double latitude;
    private String travelDate;
    private Long coverPhotoId;
}
