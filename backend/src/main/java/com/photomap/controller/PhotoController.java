package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.service.PhotoService;
import com.photomap.service.SiteOwnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
public class PhotoController {

    private final PhotoService photoService;
    private final SiteOwnerService siteOwnerService;

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        photoService.deletePhoto(siteOwnerService.getOwnerId(), id);
        return ApiResponse.success();
    }
}
