package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.BlogPageVO;
import com.photomap.dto.ScoreCapabilitiesVO;
import com.photomap.dto.ScoreGalleryEntryVO;
import com.photomap.dto.ScoreRecordRequest;
import com.photomap.dto.ScoreRecordVO;
import com.photomap.service.ScoreRecordService;
import com.photomap.service.ScoreGalleryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/scores")
@RequiredArgsConstructor
public class ScoreRecordController {
    private final ScoreRecordService service;
    private final ScoreGalleryService galleryService;

    @GetMapping("/capabilities")
    public ApiResponse<ScoreCapabilitiesVO> capabilities() {
        return ApiResponse.success(new ScoreCapabilitiesVO(ScoreRecordRequest.MAX_IMAGES_PER_RECORD));
    }

    @GetMapping("/gallery")
    public ApiResponse<List<ScoreGalleryEntryVO>> gallery() {
        return ApiResponse.success(galleryService.list());
    }

    @GetMapping
    public ApiResponse<BlogPageVO<ScoreRecordVO>> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "12") long pageSize,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String month) {
        return ApiResponse.success(service.list(page, pageSize, q, month));
    }
}
