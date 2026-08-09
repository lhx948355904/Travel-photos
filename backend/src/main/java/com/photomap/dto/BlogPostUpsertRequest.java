package com.photomap.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class BlogPostUpsertRequest {

    @Size(max = 160, message = "标题不能超过 160 个字符")
    private String title;

    @Size(max = 180, message = "固定链接不能超过 180 个字符")
    private String slug;

    @Size(max = 320, message = "摘要不能超过 320 个字符")
    private String excerpt;

    @Size(max = 1_048_576, message = "文章正文不能超过 1MB")
    private String contentMarkdown;

    @Size(max = 64, message = "分类名称不能超过 64 个字符")
    private String categoryName;

    @Size(max = 8, message = "每篇文章最多添加 8 个标签")
    private List<@Size(max = 32, message = "标签名称不能超过 32 个字符") String> tagNames = new ArrayList<>();

    private Long coverAssetId;
}
