package com.photomap.dto;

import lombok.Data;

@Data
public class LocationVO {
    private Long id;
    private String name;
    private Double longitude;
    private Double latitude;
    private String travelDate;
    private String coverThumbUrl;
    private Integer photoCount;
}
