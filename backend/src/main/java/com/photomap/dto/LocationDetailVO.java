package com.photomap.dto;

import lombok.Data;

import java.util.List;

@Data
public class LocationDetailVO {
    private Long id;
    private String name;
    private String description;
    private Double longitude;
    private Double latitude;
    private String travelDate;
    private Long coverPhotoId;
    private List<PhotoVO> photos;
}
