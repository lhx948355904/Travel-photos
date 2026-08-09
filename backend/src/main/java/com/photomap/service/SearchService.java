package com.photomap.service;

import com.photomap.ai.PhotoAiProvider;
import com.photomap.config.AiProperties;
import com.photomap.dto.PhotoIndexCoverageVO;
import com.photomap.dto.RagPhotoSearchResponse;
import com.photomap.dto.SearchPhotoVO;
import com.photomap.entity.Photo;
import com.photomap.mapper.PhotoEmbeddingMapper;
import com.photomap.mapper.PhotoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final PhotoEmbeddingMapper photoEmbeddingMapper;
    private final PhotoMapper photoMapper;
    private final CosStsService cosStsService;
    private final PhotoIndexRepository photoIndexRepository;
    private final PhotoAiProvider photoAiProvider;
    private final AiProperties aiProperties;
    private final RagAccessGuard ragAccessGuard;

    public List<SearchPhotoVO> searchPhotos(Long userId, String query, Integer limit) {
        if (!StringUtils.hasText(query)) {
            return List.of();
        }

        int safeLimit = limit == null ? DEFAULT_LIMIT : Math.max(1, Math.min(limit, MAX_LIMIT));
        return photoEmbeddingMapper.searchPhotos(userId, query.trim(), MAX_LIMIT).stream()
                .map(result -> resolveExistingPhotoResult(userId, result))
                .filter(Objects::nonNull)
                .limit(safeLimit)
                .collect(Collectors.toList());
    }

    public RagPhotoSearchResponse searchRag(Long userId, String query, Integer limit, String clientKey) {
        String normalizedQuery = query == null ? "" : query.trim().replaceAll("\\s+", " ");
        int safeLimit = limit == null
                ? Math.min(8, aiProperties.getRag().getEvidenceLimit())
                : Math.max(1, Math.min(limit, Math.min(12, aiProperties.getRag().getEvidenceLimit())));
        ragAccessGuard.checkRateLimit(clientKey);

        String cacheKey = userId + "|" + normalizedQuery.toLowerCase() + "|" + safeLimit;
        RagPhotoSearchResponse cached = ragAccessGuard.getCached(cacheKey);
        if (cached != null) {
            return cached;
        }

        PhotoIndexCoverageVO coverage = safeCoverage(userId);
        String requestId = UUID.randomUUID().toString();
        if (!aiProperties.isPublicEnabled()
                || !photoAiProvider.isAvailable()
                || !photoIndexRepository.isVectorSearchAvailable()) {
            RagPhotoSearchResponse fallback = keywordFallback(
                    userId,
                    normalizedQuery,
                    safeLimit,
                    coverage,
                    "AI 语义查询暂未启用，已使用关键词搜索",
                    requestId
            );
            ragAccessGuard.cache(cacheKey, fallback);
            return fallback;
        }

        List<SearchPhotoVO> evidence;
        try {
            float[] queryEmbedding = photoAiProvider.embedQuery(normalizedQuery);
            evidence = photoIndexRepository.vectorSearch(
                            userId,
                            normalizedQuery,
                            queryEmbedding,
                            Math.max(safeLimit, aiProperties.getRag().getCandidateLimit())
                    ).stream()
                    .map(result -> resolveExistingPhotoResult(userId, result))
                    .filter(Objects::nonNull)
                    .limit(safeLimit)
                    .toList();
        } catch (Exception e) {
            RagPhotoSearchResponse fallback = keywordFallback(
                    userId,
                    normalizedQuery,
                    safeLimit,
                    coverage,
                    "语义向量服务暂不可用，已降级为关键词搜索",
                    requestId
            );
            ragAccessGuard.cache(cacheKey, fallback);
            return fallback;
        }

        if (evidence.isEmpty()
                || evidence.get(0).getScore() == null
                || evidence.get(0).getScore() < aiProperties.getRag().getMinScore()) {
            RagPhotoSearchResponse insufficient = response(
                    "现有照片不足以回答这个问题。",
                    "semantic",
                    List.of(),
                    evidence,
                    coverage,
                    evidence.isEmpty() ? "没有找到足够相关的照片证据" : "照片相关度不足，未调用回答模型",
                    requestId
            );
            ragAccessGuard.cache(cacheKey, insufficient);
            return insufficient;
        }

        if (!ragAccessGuard.tryConsumeGeneration()) {
            RagPhotoSearchResponse semantic = response(
                    null,
                    "semantic",
                    List.of(),
                    evidence,
                    coverage,
                    "今日 AI 回答额度已用完，仍可查看语义检索结果",
                    requestId
            );
            ragAccessGuard.cache(cacheKey, semantic);
            return semantic;
        }

        try {
            List<PhotoAiProvider.AnswerEvidence> promptEvidence = evidence.stream()
                    .limit(6)
                    .map(item -> new PhotoAiProvider.AnswerEvidence(
                            item.getPhotoId(),
                            item.getLocationName(),
                            item.getShotDate(),
                            item.getCaption(),
                            item.getTags(),
                            item.getScore() == null ? 0 : item.getScore()
                    ))
                    .toList();
            PhotoAiProvider.GeneratedAnswer generated =
                    photoAiProvider.generateAnswer(normalizedQuery, promptEvidence);
            Set<Long> validIds = evidence.stream().map(SearchPhotoVO::getPhotoId).collect(Collectors.toSet());
            List<Long> citations = generated.citationPhotoIds().stream()
                    .filter(validIds::contains)
                    .distinct()
                    .toList();
            if (citations.isEmpty()) {
                throw new IllegalStateException("回答没有引用有效照片证据");
            }
            RagPhotoSearchResponse rag = response(
                    generated.answer(),
                    "rag",
                    citations,
                    evidence,
                    coverage,
                    null,
                    requestId
            );
            ragAccessGuard.cache(cacheKey, rag);
            return rag;
        } catch (Exception e) {
            RagPhotoSearchResponse semantic = response(
                    null,
                    "semantic",
                    List.of(),
                    evidence,
                    coverage,
                    "照片已找到，但 AI 暂时无法生成回答",
                    requestId
            );
            ragAccessGuard.cache(cacheKey, semantic);
            return semantic;
        }
    }

    private RagPhotoSearchResponse keywordFallback(Long userId,
                                                   String query,
                                                   int limit,
                                                   PhotoIndexCoverageVO coverage,
                                                   String warning,
                                                   String requestId) {
        return response(
                null,
                "keyword",
                List.of(),
                searchPhotos(userId, query, limit),
                coverage,
                warning,
                requestId
        );
    }

    private RagPhotoSearchResponse response(String answer,
                                            String mode,
                                            List<Long> citations,
                                            List<SearchPhotoVO> evidence,
                                            PhotoIndexCoverageVO coverage,
                                            String warning,
                                            String requestId) {
        return RagPhotoSearchResponse.builder()
                .answer(answer)
                .mode(mode)
                .citationPhotoIds(citations)
                .evidence(evidence)
                .indexCoverage(coverage)
                .warning(warning)
                .requestId(requestId)
                .build();
    }

    private PhotoIndexCoverageVO safeCoverage(Long userId) {
        try {
            return photoIndexRepository.coverage(userId);
        } catch (Exception ignored) {
            return new PhotoIndexCoverageVO(0, 0);
        }
    }

    private SearchPhotoVO resolveExistingPhotoResult(Long userId, SearchPhotoVO result) {
        if (result.getPhotoId() == null) {
            return null;
        }
        Photo photo = photoMapper.selectOwnedById(userId, result.getPhotoId());
        if (photo == null || !StringUtils.hasText(photo.getCosKey())
                || !cosStsService.objectExists(photo.getCosKey())) {
            return null;
        }

        String fallbackUrl = StringUtils.hasText(result.getUrl()) ? result.getUrl() : result.getThumbUrl();
        String publicUrl = cosStsService.resolvePublicUrl(photo.getCosKey(), fallbackUrl);
        result.setUrl(publicUrl);
        result.setThumbUrl(publicUrl);
        return result;
    }
}
