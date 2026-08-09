package com.photomap.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RagPhotoSearchResponse {
    private String answer;
    private String mode;
    private List<Long> citationPhotoIds;
    private List<SearchPhotoVO> evidence;
    private PhotoIndexCoverageVO indexCoverage;
    private String warning;
    private String requestId;
}
