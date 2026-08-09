package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.BlogAssetVO;
import com.photomap.dto.BlogPageVO;
import com.photomap.dto.BlogPostDetailVO;
import com.photomap.dto.BlogPostSummaryVO;
import com.photomap.dto.BlogPostUpsertRequest;
import com.photomap.service.BlogService;
import com.photomap.service.JwtService.JwtPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/blog")
@RequiredArgsConstructor
public class BlogAdminController {

    private final BlogService blogService;

    @GetMapping("/posts")
    public ApiResponse<BlogPageVO<BlogPostSummaryVO>> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long pageSize,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String status,
            @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.success(blogService.listAdmin(page, pageSize, q, status, principal.userId()));
    }

    @GetMapping("/posts/{id}")
    public ApiResponse<BlogPostDetailVO> detail(@PathVariable Long id,
                                                @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.success(blogService.getAdminDetail(id, principal.userId()));
    }

    @PostMapping("/posts")
    public ApiResponse<BlogPostDetailVO> create(@Valid @org.springframework.web.bind.annotation.RequestBody BlogPostUpsertRequest request,
                                                @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.success(blogService.createDraft(request, principal.userId()));
    }

    @PutMapping("/posts/{id}")
    public ApiResponse<BlogPostDetailVO> save(@PathVariable Long id,
                                              @Valid @org.springframework.web.bind.annotation.RequestBody BlogPostUpsertRequest request,
                                              @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.success(blogService.saveDraft(id, request, principal.userId()));
    }

    @PostMapping("/posts/{id}/publish")
    public ApiResponse<BlogPostDetailVO> publish(@PathVariable Long id,
                                                 @Valid @org.springframework.web.bind.annotation.RequestBody BlogPostUpsertRequest request,
                                                 @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.success(blogService.publish(id, request, principal.userId()));
    }

    @PostMapping("/posts/{id}/unpublish")
    public ApiResponse<BlogPostDetailVO> unpublish(@PathVariable Long id,
                                                   @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.success(blogService.unpublish(id, principal.userId()));
    }

    @DeleteMapping("/posts/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, @AuthenticationPrincipal JwtPrincipal principal) {
        blogService.deletePost(id, principal.userId());
        return ApiResponse.success();
    }

    @PostMapping(value = "/assets", consumes = "multipart/form-data")
    public ApiResponse<BlogAssetVO> upload(@RequestPart("file") MultipartFile file,
                                           @AuthenticationPrincipal JwtPrincipal principal) {
        return ApiResponse.success(blogService.uploadAsset(file, principal.userId()));
    }
}
