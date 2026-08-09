package com.photomap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogTaxonomyVO {
    private Long id;
    private String name;
    private String slug;
    private Long postCount;
}
