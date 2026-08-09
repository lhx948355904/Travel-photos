package com.photomap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogPostDetailVO {
    private BlogPostSummaryVO post;
    private String contentMarkdown;
    private List<BlogHeadingVO> headings;
    private List<BlogPostSummaryVO> relatedPosts;
}
