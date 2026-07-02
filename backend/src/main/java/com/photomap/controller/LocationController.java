package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.LocationCreateRequest;
import com.photomap.dto.LocationDetailVO;
import com.photomap.dto.LocationUpdateRequest;
import com.photomap.dto.LocationVO;
import com.photomap.dto.PhotoDTO;
import com.photomap.service.LocationService;
import com.photomap.service.SiteOwnerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;
    private final SiteOwnerService siteOwnerService;

    @GetMapping
    public ApiResponse<List<LocationVO>> list(@RequestParam(required = false) String bbox) {
        return ApiResponse.success(locationService.listLocations(siteOwnerService.getOwnerId(), bbox));
    }

    @GetMapping("/{id}")
    public ApiResponse<LocationDetailVO> detail(@PathVariable Long id) {
        return ApiResponse.success(locationService.getLocationDetail(siteOwnerService.getOwnerId(), id));
    }

    @PostMapping
    public ApiResponse<Map<String, Long>> create(@Valid @RequestBody LocationCreateRequest request) {
        Long id = locationService.createLocation(siteOwnerService.getOwnerId(), request);
        return ApiResponse.success(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @RequestBody LocationUpdateRequest request) {
        locationService.updateLocation(siteOwnerService.getOwnerId(), id, request);
        return ApiResponse.success();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        locationService.deleteLocation(siteOwnerService.getOwnerId(), id);
        return ApiResponse.success();
    }

    @PostMapping("/{id}/photos")
    public ApiResponse<Void> addPhotos(@PathVariable Long id, @RequestBody List<PhotoDTO> photos) {
        locationService.addPhotos(siteOwnerService.getOwnerId(), id, photos);
        return ApiResponse.success();
    }
}
