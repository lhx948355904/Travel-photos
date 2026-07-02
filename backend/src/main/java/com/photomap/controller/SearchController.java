package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.SearchPhotoVO;
import com.photomap.service.SearchService;
import com.photomap.service.SiteOwnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
}
