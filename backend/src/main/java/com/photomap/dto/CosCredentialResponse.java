package com.photomap.dto;

import lombok.Data;

@Data
public class CosCredentialResponse {
    private String tmpSecretId;
    private String tmpSecretKey;
    private String sessionToken;
    private String bucket;
    private String region;
    private Long startTime;
    private Long expiredTime;
    private String allowPrefix;
}
