package com.photomap.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "cos")
public class CosProperties {
    private String secretId;
    private String secretKey;
    private String bucket;
    private String region;
    private String cdnDomain;
    private String localUploadDir = "data/uploads";
    private String localPublicPath = "/uploads";
    private boolean localUploadEnabled = false;
    private boolean localFallbackEnabled = true;
    private boolean publicReadAclEnabled = true;
    private int connectTimeoutMillis = 10000;
    private int socketTimeoutMillis = 120000;
    private int requestTimeoutMillis = 120000;
}
