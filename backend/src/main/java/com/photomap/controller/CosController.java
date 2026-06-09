package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.CosCredentialResponse;
import com.photomap.service.CosStsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cos")
@RequiredArgsConstructor
public class CosController {

    private final CosStsService cosStsService;

    @GetMapping("/credential")
    public ApiResponse<CosCredentialResponse> getCredential() {
        return ApiResponse.success(cosStsService.getCredential());
    }
}
