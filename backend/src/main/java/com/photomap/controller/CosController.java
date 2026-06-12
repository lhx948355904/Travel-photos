package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.CosCredentialResponse;
import com.photomap.dto.CosUploadResponse;
import com.photomap.service.CosStsService;
import lombok.RequiredArgsConstructor;
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

    @GetMapping("/credential")
    public ApiResponse<CosCredentialResponse> getCredential() {
        return ApiResponse.success(cosStsService.getCredential());
    }

    @PostMapping("/upload")
    public ApiResponse<CosUploadResponse> upload(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success(cosStsService.uploadFile(file));
    }
}
