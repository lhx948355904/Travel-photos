package com.photomap.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Data
@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    private boolean enabled;
    private boolean publicEnabled;
    private String provider = "dashscope";
    private String apiKey;
    private String baseUrl = "https://dashscope.aliyuncs.com";
    private String embeddingModel = "qwen3-vl-embedding";
    private int embeddingDimension = 1024;
    private String visionModel = "qwen3-vl-flash";
    private String chatModel = "qwen3.6-flash";
    private int connectTimeoutMs = 10000;
    private int readTimeoutMs = 60000;
    private Rag rag = new Rag();
    private Index index = new Index();

    public boolean isProviderReady() {
        return enabled && StringUtils.hasText(apiKey);
    }

    @Data
    public static class Rag {
        private double minScore = 0.30;
        private int candidateLimit = 20;
        private int evidenceLimit = 8;
        private int dailyGenerationLimit = 300;
        private int rateLimitCount = 10;
        private int rateLimitWindowSeconds = 300;
        private int cacheSeconds = 600;
    }

    @Data
    public static class Index {
        private int batchSize = 5;
        private long pollDelayMs = 5000;
        private int maxRetries = 3;
    }
}
