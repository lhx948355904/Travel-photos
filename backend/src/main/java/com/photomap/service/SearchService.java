package com.photomap.service;

import com.photomap.dto.SearchPhotoVO;
import com.photomap.mapper.PhotoEmbeddingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final PhotoEmbeddingMapper photoEmbeddingMapper;

    public List<SearchPhotoVO> searchPhotos(Long userId, String query, Integer limit) {
        if (!StringUtils.hasText(query)) {
            return List.of();
        }

        int safeLimit = limit == null ? DEFAULT_LIMIT : Math.max(1, Math.min(limit, MAX_LIMIT));
        return photoEmbeddingMapper.searchPhotos(userId, query.trim(), safeLimit);
    }
}
