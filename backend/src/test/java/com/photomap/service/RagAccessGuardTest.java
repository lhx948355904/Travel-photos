package com.photomap.service;

import com.photomap.common.RateLimitException;
import com.photomap.config.AiProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RagAccessGuardTest {

    @Test
    void rejectsRequestsAbovePerIpWindow() {
        AiProperties properties = new AiProperties();
        properties.getRag().setRateLimitCount(1);
        properties.getRag().setRateLimitWindowSeconds(300);
        RagAccessGuard guard = new RagAccessGuard(properties);

        guard.checkRateLimit("203.0.113.8");

        assertThatThrownBy(() -> guard.checkRateLimit("203.0.113.8"))
                .isInstanceOf(RateLimitException.class)
                .hasMessageContaining("秒后重试");
    }

    @Test
    void enforcesDailyGenerationBudget() {
        AiProperties properties = new AiProperties();
        properties.getRag().setDailyGenerationLimit(1);
        RagAccessGuard guard = new RagAccessGuard(properties);

        assertThat(guard.tryConsumeGeneration()).isTrue();
        assertThat(guard.tryConsumeGeneration()).isFalse();
    }
}
