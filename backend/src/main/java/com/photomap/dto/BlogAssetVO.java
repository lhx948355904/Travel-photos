package com.photomap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogAssetVO {
    private Long id;
    private String url;
    private String originalName;
    private String contentType;
    private Integer width;
    private Integer height;
}
