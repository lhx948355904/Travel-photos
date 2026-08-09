package com.photomap.service;

import com.photomap.ai.PhotoAiProvider;
import com.photomap.config.AiProperties;
import com.photomap.dto.PhotoIndexCandidate;
import com.photomap.dto.PhotoIndexRebuildVO;
import com.photomap.dto.PhotoIndexStatusVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PhotoIndexingService {

    private final AiProperties properties;
    private final PhotoAiProvider photoAiProvider;
    private final PhotoIndexRepository photoIndexRepository;
    private final CosStsService cosStsService;
    private final SiteOwnerService siteOwnerService;

    @Scheduled(fixedDelayString = "${ai.index.poll-delay-ms:5000}")
    public void processPendingPhotos() {
        if (!properties.isProviderReady()
                || !photoAiProvider.isAvailable()
                || !photoIndexRepository.isVectorSearchAvailable()) {
            return;
        }
        Long ownerId = siteOwnerService.getOwnerId();
        int recovered = photoIndexRepository.recoverStaleProcessing();
        if (recovered > 0) {
            log.warn("Recovered {} interrupted photo AI index tasks", recovered);
        }
        List<PhotoIndexCandidate> candidates = photoIndexRepository.findCandidates(
                ownerId,
                Math.max(1, properties.getIndex().getBatchSize())
        );
        for (PhotoIndexCandidate candidate : candidates) {
            process(candidate);
        }
    }

    public PhotoIndexStatusVO status(Long userId) {
        photoIndexRepository.queueMissing(userId);
        return photoIndexRepository.status(
                userId,
                properties.isEnabled(),
                photoAiProvider.isAvailable() && photoIndexRepository.isVectorSearchAvailable()
        );
    }

    public PhotoIndexRebuildVO rebuild(Long userId, String scope) {
        boolean all = "all".equalsIgnoreCase(scope);
        int queued = photoIndexRepository.rebuild(userId, all);
        return new PhotoIndexRebuildVO(queued);
    }

    private void process(PhotoIndexCandidate candidate) {
        if (!photoIndexRepository.markProcessing(candidate.getPhotoId())) {
            return;
        }
        String context = buildContext(candidate);
        String hash = sha256(
                candidate.getCosKey() + "|" + context + "|"
                        + properties.getVisionModel() + "|"
                        + properties.getEmbeddingModel() + "|"
                        + properties.getEmbeddingDimension()
        );

        try {
            if (photoIndexRepository.restoreReadyIfUnchanged(candidate.getPhotoId(), hash)) {
                return;
            }
            String imageInput = cosStsService.resolveAiImageInput(
                    candidate.getCosKey(),
                    firstText(candidate.getThumbUrl(), candidate.getUrl())
            );
            PhotoAiProvider.PhotoAnalysis analysis = photoAiProvider.analyzePhoto(imageInput, context);
            String tags = String.join(",", analysis.tags());
            String searchText = String.join(" ", compact(
                    analysis.caption(),
                    tags,
                    context
            ));
            float[] embedding = photoAiProvider.embedPhoto(imageInput, searchText);
            photoIndexRepository.markReady(
                    candidate.getPhotoId(),
                    analysis.caption(),
                    tags,
                    searchText,
                    embedding,
                    properties.getVisionModel(),
                    properties.getEmbeddingModel(),
                    hash
            );
            log.info("Photo AI index ready, photoId={}", candidate.getPhotoId());
        } catch (Exception e) {
            int retryCount = (candidate.getRetryCount() == null ? 0 : candidate.getRetryCount()) + 1;
            photoIndexRepository.markRetry(
                    candidate.getPhotoId(),
                    retryCount,
                    Math.max(1, properties.getIndex().getMaxRetries()),
                    e.getMessage()
            );
            log.warn("Photo AI index failed, photoId={}, retry={}, message={}",
                    candidate.getPhotoId(), retryCount, e.getMessage());
        }
    }

    private String buildContext(PhotoIndexCandidate candidate) {
        return String.join(" ", compact(
                candidate.getLocationName(),
                candidate.getLocationDescription(),
                candidate.getTravelDate() == null ? null : "旅行日期 " + candidate.getTravelDate(),
                candidate.getShotDate() == null ? null : "拍摄日期 " + candidate.getShotDate(),
                candidate.getOrientation() == null ? null : "画面方向 " + candidate.getOrientation()
        ));
    }

    private List<String> compact(String... values) {
        return java.util.Arrays.stream(values)
                .filter(StringUtils::hasText)
                .map(String::trim)
                .toList();
    }

    private String firstText(String preferred, String fallback) {
        return StringUtils.hasText(preferred) ? preferred : fallback;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
