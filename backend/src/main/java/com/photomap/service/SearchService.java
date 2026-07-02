package com.photomap.service;

import com.photomap.dto.SearchPhotoVO;
import com.photomap.entity.Photo;
import com.photomap.mapper.PhotoEmbeddingMapper;
import com.photomap.mapper.PhotoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final PhotoEmbeddingMapper photoEmbeddingMapper;
    private final PhotoMapper photoMapper;
    private final CosStsService cosStsService;

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
