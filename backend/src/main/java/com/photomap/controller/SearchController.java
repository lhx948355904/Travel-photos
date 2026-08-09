package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.SearchPhotoVO;
import com.photomap.dto.RagPhotoSearchRequest;
import com.photomap.dto.RagPhotoSearchResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import com.photomap.service.SearchService;
import com.photomap.service.SiteOwnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;
    private final SiteOwnerService siteOwnerService;

    @GetMapping("/photos")
    public ApiResponse<List<SearchPhotoVO>> searchPhotos(@RequestParam("q") String query,
                                                         @RequestParam(required = false) Integer limit) {
        return ApiResponse.success(searchService.searchPhotos(siteOwnerService.getOwnerId(), query, limit));
    }

    @PostMapping("/photos/rag")
    public ApiResponse<RagPhotoSearchResponse> searchPhotosWithRag(
            @Valid @RequestBody RagPhotoSearchRequest request,
            HttpServletRequest servletRequest) {
        return ApiResponse.success(searchService.searchRag(
                siteOwnerService.getOwnerId(),
                request.getQuery(),
                request.getLimit(),
                resolveClientIp(servletRequest)
        ));
    }

    private String resolveClientIp(HttpServletRequest request) {
        // nginx overwrites X-Real-IP with the actual peer address. Prefer it
        // over a client-supplied X-Forwarded-For chain to avoid bypassing the
        // public RAG rate limit by spoofing the first forwarded address.
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
