package com.photomap.dto;

import lombok.Data;

@Data
public class CosUploadResponse {
    private String cosKey;
    private String url;
    private String status;
    private String reviewReason;
}
