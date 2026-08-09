package com.photomap.service;

import com.photomap.common.RateLimitException;
import com.photomap.config.AiProperties;
import com.photomap.dto.RagPhotoSearchResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class RagAccessGuard {

    private final AiProperties properties;
    private final Map<String, WindowCounter> rateWindows = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final Object generationLock = new Object();
    private LocalDate generationDate = LocalDate.now();
    private final AtomicInteger generationsToday = new AtomicInteger();

    public void checkRateLimit(String clientKey) {
        long now = System.currentTimeMillis();
        long windowMillis = Math.max(1, properties.getRag().getRateLimitWindowSeconds()) * 1000L;
        int limit = Math.max(1, properties.getRag().getRateLimitCount());
        String key = clientKey == null || clientKey.isBlank() ? "unknown" : clientKey;
        WindowCounter counter = rateWindows.compute(key, (ignored, existing) -> {
            if (existing == null || now - existing.startedAt >= windowMillis) {
                return new WindowCounter(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });
        if (counter.count.get() > limit) {
            long retrySeconds = Math.max(1, (windowMillis - (now - counter.startedAt)) / 1000L);
            throw new RateLimitException("查询过于频繁，请在 " + retrySeconds + " 秒后重试");
        }
        if (rateWindows.size() > 5000) {
            rateWindows.entrySet().removeIf(entry -> now - entry.getValue().startedAt > windowMillis * 2);
        }
    }

    public RagPhotoSearchResponse getCached(String key) {
        CacheEntry entry = cache.get(key);
        if (entry == null) {
            return null;
        }
        if (entry.expiresAt < System.currentTimeMillis()) {
            cache.remove(key);
            return null;
        }
        return entry.response;
    }

    public void cache(String key, RagPhotoSearchResponse response) {
        long ttl = Math.max(1, properties.getRag().getCacheSeconds()) * 1000L;
        cache.put(key, new CacheEntry(System.currentTimeMillis() + ttl, response));
        if (cache.size() > 1000) {
            long now = System.currentTimeMillis();
            cache.entrySet().removeIf(entry -> entry.getValue().expiresAt < now);
        }
    }

    public boolean tryConsumeGeneration() {
        synchronized (generationLock) {
            LocalDate today = LocalDate.now();
            if (!today.equals(generationDate)) {
                generationDate = today;
                generationsToday.set(0);
            }
            int limit = Math.max(0, properties.getRag().getDailyGenerationLimit());
            if (limit == 0 || generationsToday.get() >= limit) {
                return false;
            }
            generationsToday.incrementAndGet();
            return true;
        }
    }

    private record WindowCounter(long startedAt, AtomicInteger count) {
    }

    private record CacheEntry(long expiresAt, RagPhotoSearchResponse response) {
    }
}
