package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.*;
import com.photomap.service.LocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    public ApiResponse<List<LocationVO>> list(@RequestParam(required = false) String bbox) {
        return ApiResponse.success(locationService.listLocations(bbox));
    }

    @GetMapping("/{id}")
    public ApiResponse<LocationDetailVO> detail(@PathVariable Long id) {
        return ApiResponse.success(locationService.getLocationDetail(id));
    }

    @PostMapping
    public ApiResponse<Map<String, Long>> create(@Valid @RequestBody LocationCreateRequest request) {
        Long id = locationService.createLocation(request);
        return ApiResponse.success(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @RequestBody LocationUpdateRequest request) {
        locationService.updateLocation(id, request);
        return ApiResponse.success();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        locationService.deleteLocation(id);
        return ApiResponse.success();
    }

    @PostMapping("/{id}/photos")
    public ApiResponse<Void> addPhotos(@PathVariable Long id, @RequestBody List<PhotoDTO> photos) {
        locationService.addPhotos(id, photos);
        return ApiResponse.success();
    }
}
