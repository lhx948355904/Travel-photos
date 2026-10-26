package com.photomap.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ScoreRecordVO(
        Long id, String title, String playerOne, String playerTwo,
        Integer scoreOne, Integer scoreTwo, LocalDateTime playedAt,
        String venue, String note, String imageKey, String imageUrl,
        LocalDateTime updatedAt, List<ScoreFrameVO> frames, List<ScoreImageVO> images) {
}
