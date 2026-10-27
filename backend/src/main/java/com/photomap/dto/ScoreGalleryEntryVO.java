package com.photomap.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ScoreGalleryEntryVO(
        Long id, String title, LocalDateTime playedAt, String note,
        LocalDateTime updatedAt, List<ScoreImageVO> images) {
}
