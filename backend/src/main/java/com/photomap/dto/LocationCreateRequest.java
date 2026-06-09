package com.photomap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class LocationCreateRequest {
    @NotBlank(message = "地点名称不能为空")
    private String name;

    private String description;

    @NotNull(message = "经度不能为空")
    private Double longitude;

    @NotNull(message = "纬度不能为空")
    private Double latitude;

    private String travelDate;
    private Integer coverIndex;

    @NotNull(message = "照片列表不能为空")
    private List<PhotoDTO> photos;
}
