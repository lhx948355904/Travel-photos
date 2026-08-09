package com.photomap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogPostSummaryVO {
    private Long id;
    private String slug;
    private String title;
    private String excerpt;
    private BlogTaxonomyVO category;
    private List<BlogTaxonomyVO> tags;
    private Long coverAssetId;
    private String coverUrl;
    private String status;
    private LocalDateTime publishedAt;
    private LocalDateTime updatedAt;
    private Integer readingTimeMinutes;
}
