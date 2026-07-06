package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.CosCredentialResponse;
import com.photomap.dto.CosUploadResponse;
import com.photomap.service.CosStsService;
import com.photomap.service.SiteOwnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/cos")
@RequiredArgsConstructor
public class CosController {

    private final CosStsService cosStsService;
    private final SiteOwnerService siteOwnerService;

    @GetMapping("/credential")
    public ApiResponse<CosCredentialResponse> getCredential() {
        return ApiResponse.success(cosStsService.getCredential(siteOwnerService.getOwnerId()));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CosUploadResponse> upload(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success(cosStsService.uploadFile(siteOwnerService.getOwnerId(), file));
    }
}
