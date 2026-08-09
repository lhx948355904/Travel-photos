package com.photomap.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RagPhotoSearchRequest {
    @NotBlank(message = "请输入照片问题")
    @Size(min = 2, max = 200, message = "问题长度需为 2 到 200 个字符")
    private String query;

    @Min(value = 1, message = "limit 不能小于 1")
    @Max(value = 12, message = "limit 不能大于 12")
    private Integer limit = 8;
}
