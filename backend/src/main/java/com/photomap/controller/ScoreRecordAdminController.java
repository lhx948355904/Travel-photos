package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.CosUploadResponse;
import com.photomap.dto.ScoreRecordRequest;
import com.photomap.dto.ScoreRecordVO;
import com.photomap.service.CosStsService;
import com.photomap.service.JwtService.JwtPrincipal;
import com.photomap.service.ScoreRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/scores")
@RequiredArgsConstructor
public class ScoreRecordAdminController {
    private final ScoreRecordService service;
    private final CosStsService cosStsService;

    @PostMapping
    public ApiResponse<ScoreRecordVO> create(@Valid @RequestBody ScoreRecordRequest request,
                                             @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.success(service.create(request, principal.userId()));
    }

    @PutMapping("/{id}")
    public ApiResponse<ScoreRecordVO> update(@PathVariable Long id, @Valid @RequestBody ScoreRecordRequest request,
                                             @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.success(service.update(id, request, principal.userId()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, @AuthenticationPrincipal JwtPrincipal principal) {
        service.delete(id, principal.userId());
        return ApiResponse.success();
    }

    @PostMapping(value = "/image", consumes = "multipart/form-data")
    public ApiResponse<CosUploadResponse> upload(@RequestPart("file") MultipartFile file,
                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.success(cosStsService.uploadScoreImage(principal.userId(), file));
    }
}
