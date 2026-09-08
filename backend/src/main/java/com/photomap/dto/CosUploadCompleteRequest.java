package com.photomap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CosUploadCompleteRequest {

    @NotBlank(message = "对象 Key 不能为空")
    private String cosKey;

    @Positive(message = "文件大小必须大于 0")
    private long fileSize;
}
