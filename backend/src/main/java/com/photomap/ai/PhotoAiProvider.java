package com.photomap.ai;

import java.util.List;

public interface PhotoAiProvider {

    boolean isAvailable();

    PhotoAnalysis analyzePhoto(String imageInput, String context);

    float[] embedPhoto(String imageInput, String searchableText);

    float[] embedQuery(String query);

    GeneratedAnswer generateAnswer(String query, List<AnswerEvidence> evidence);

    record PhotoAnalysis(String caption, List<String> tags) {
    }

    record AnswerEvidence(Long photoId,
                          String locationName,
                          String shotDate,
                          String caption,
                          String tags,
                          double score) {
    }

    record GeneratedAnswer(String answer, List<Long> citationPhotoIds) {
    }
}
