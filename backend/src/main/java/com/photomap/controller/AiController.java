package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.PhotoIndexRebuildRequest;
import com.photomap.dto.PhotoIndexRebuildVO;
import com.photomap.dto.PhotoIndexStatusVO;
import com.photomap.service.PhotoIndexingService;
import com.photomap.service.SiteOwnerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/photo-index")
@RequiredArgsConstructor
public class AiController {

    private final PhotoIndexingService photoIndexingService;
    private final SiteOwnerService siteOwnerService;

    @GetMapping("/status")
    public ApiResponse<PhotoIndexStatusVO> status() {
        return ApiResponse.success(photoIndexingService.status(siteOwnerService.getOwnerId()));
    }

    @PostMapping("/rebuild")
    public ApiResponse<PhotoIndexRebuildVO> rebuild(
            @Valid @RequestBody PhotoIndexRebuildRequest request) {
        return ApiResponse.success(photoIndexingService.rebuild(
                siteOwnerService.getOwnerId(),
                request.getScope()
        ));
    }
}
