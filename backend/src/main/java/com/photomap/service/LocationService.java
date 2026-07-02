package com.photomap.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.photomap.common.BusinessException;
import com.photomap.dto.LocationCreateRequest;
import com.photomap.dto.LocationDetailVO;
import com.photomap.dto.LocationUpdateRequest;
import com.photomap.dto.LocationVO;
import com.photomap.dto.PhotoDTO;
import com.photomap.dto.PhotoVO;
import com.photomap.entity.Location;
import com.photomap.entity.Photo;
import com.photomap.mapper.LocationMapper;
import com.photomap.mapper.PhotoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationMapper locationMapper;
    private final PhotoMapper photoMapper;
    private final PhotoEmbeddingService photoEmbeddingService;

    public List<LocationVO> listLocations(Long userId, String bbox) {
        List<Location> locations;
        if (StringUtils.hasText(bbox)) {
            String[] parts = bbox.split(",");
            if (parts.length == 4) {
                locations = locationMapper.selectByBbox(
                        userId,
                        Double.parseDouble(parts[0]),
                        Double.parseDouble(parts[1]),
                        Double.parseDouble(parts[2]),
                        Double.parseDouble(parts[3])
                );
            } else {
                locations = selectUserLocations(userId);
            }
        } else {
            locations = selectUserLocations(userId);
        }

        return locations.stream().map(location -> toLocationVO(userId, location)).collect(Collectors.toList());
    }

    public LocationDetailVO getLocationDetail(Long userId, Long id) {
        Location location = requireOwnedLocation(userId, id);

        LocationDetailVO vo = new LocationDetailVO();
        vo.setId(location.getId());
        vo.setName(location.getName());
        vo.setDescription(location.getDescription());
        vo.setLongitude(location.getLongitude());
        vo.setLatitude(location.getLatitude());
        vo.setTravelDate(location.getTravelDate() != null ? location.getTravelDate().toString() : null);
        vo.setCoverPhotoId(location.getCoverPhotoId());

        List<Photo> photos = photoMapper.selectByLocationId(userId, id);
        vo.setPhotos(photos.stream().map(this::toPhotoVO).collect(Collectors.toList()));

        return vo;
    }

    @Transactional
    public Long createLocation(Long userId, LocationCreateRequest request) {
        Location location = new Location();
        location.setUserId(userId);
        location.setName(request.getName());
        location.setDescription(request.getDescription());
        location.setLongitude(request.getLongitude());
        location.setLatitude(request.getLatitude());
        if (request.getTravelDate() != null) {
            location.setTravelDate(LocalDate.parse(request.getTravelDate()));
        }

        locationMapper.insert(location);

        List<PhotoDTO> photoDTOs = request.getPhotos();
        for (int i = 0; i < photoDTOs.size(); i++) {
            Photo photo = insertPhoto(userId, location, photoDTOs.get(i), i);
            if (request.getCoverIndex() != null && request.getCoverIndex() == i) {
                location.setCoverPhotoId(photo.getId());
            }
        }

        if (location.getCoverPhotoId() == null && !photoDTOs.isEmpty()) {
            List<Photo> insertedPhotos = photoMapper.selectByLocationId(userId, location.getId());
            if (!insertedPhotos.isEmpty()) {
                location.setCoverPhotoId(insertedPhotos.get(0).getId());
            }
        }

        locationMapper.updateById(location);
        return location.getId();
    }

    @Transactional
    public void updateLocation(Long userId, Long id, LocationUpdateRequest request) {
        Location location = requireOwnedLocation(userId, id);

        if (request.getName() != null) {
            location.setName(request.getName());
        }
        if (request.getDescription() != null) {
            location.setDescription(request.getDescription());
        }
        if (request.getLongitude() != null) {
            location.setLongitude(request.getLongitude());
        }
        if (request.getLatitude() != null) {
            location.setLatitude(request.getLatitude());
        }
        if (request.getTravelDate() != null) {
            location.setTravelDate(LocalDate.parse(request.getTravelDate()));
        }
        if (request.getCoverPhotoId() != null) {
            Photo cover = photoMapper.selectOwnedById(userId, request.getCoverPhotoId());
            if (cover == null || !id.equals(cover.getLocationId())) {
                throw new BusinessException(404, "Cover photo not found");
            }
            location.setCoverPhotoId(request.getCoverPhotoId());
        }

        locationMapper.updateById(location);
    }

    @Transactional
    public void deleteLocation(Long userId, Long id) {
        requireOwnedLocation(userId, id);
        locationMapper.deleteById(id);
    }

    @Transactional
    public void addPhotos(Long userId, Long locationId, List<PhotoDTO> photoDTOs) {
        Location location = requireOwnedLocation(userId, locationId);
        int startOrder = photoMapper.countByLocationId(userId, locationId);

        for (int i = 0; i < photoDTOs.size(); i++) {
            insertPhoto(userId, location, photoDTOs.get(i), startOrder + i);
        }
    }

    private List<Location> selectUserLocations(Long userId) {
        return locationMapper.selectList(new LambdaQueryWrapper<Location>()
                .eq(Location::getUserId, userId)
                .eq(Location::getDeleted, false));
    }

    private Location requireOwnedLocation(Long userId, Long id) {
        Location location = locationMapper.selectById(id);
        if (location == null || Boolean.TRUE.equals(location.getDeleted()) || !userId.equals(location.getUserId())) {
            throw new BusinessException(404, "Location not found");
        }
        return location;
    }

    private Photo insertPhoto(Long userId, Location location, PhotoDTO dto, int sortOrder) {
        validatePhotoPayload(userId, dto);

        Photo photo = new Photo();
        photo.setUserId(userId);
        photo.setLocationId(location.getId());
        photo.setCosKey(dto.getCosKey());
        photo.setUrl(dto.getUrl());
        photo.setThumbUrl(dto.getThumbUrl());
        photo.setWidth(dto.getWidth());
        photo.setHeight(dto.getHeight());
        photo.setOrientation(dto.getOrientation());
        photo.setFileSize(dto.getFileSize());
        if (dto.getShotDate() != null) {
            photo.setShotDate(LocalDate.parse(dto.getShotDate()));
        }
        photo.setStatus("approved");
        photo.setReviewedAt(LocalDateTime.now());
        photo.setSortOrder(sortOrder);
        photoMapper.insert(photo);
        photoEmbeddingService.indexPhoto(location, photo, dto);
        return photo;
    }

    private void validatePhotoPayload(Long userId, PhotoDTO dto) {
        if (dto == null || !StringUtils.hasText(dto.getCosKey()) || !StringUtils.hasText(dto.getUrl())) {
            throw new BusinessException("Photo upload metadata is incomplete");
        }

        String expectedPrefix = "users/" + userId + "/photos/";
        if (!dto.getCosKey().startsWith(expectedPrefix)) {
            throw new BusinessException(403, "Photo does not belong to current user");
        }
    }

    private LocationVO toLocationVO(Long userId, Location location) {
        LocationVO vo = new LocationVO();
        vo.setId(location.getId());
        vo.setName(location.getName());
        vo.setLongitude(location.getLongitude());
        vo.setLatitude(location.getLatitude());
        vo.setTravelDate(location.getTravelDate() != null ? location.getTravelDate().toString() : null);

        int count = photoMapper.countByLocationId(userId, location.getId());
        vo.setPhotoCount(count);

        if (location.getCoverPhotoId() != null) {
            Photo cover = photoMapper.selectOwnedById(userId, location.getCoverPhotoId());
            if (cover != null && "approved".equals(cover.getStatus())) {
                vo.setCoverThumbUrl(cover.getThumbUrl());
            }
        }

        return vo;
    }

    private PhotoVO toPhotoVO(Photo photo) {
        PhotoVO vo = new PhotoVO();
        vo.setId(photo.getId());
        vo.setUrl(photo.getUrl());
        vo.setThumbUrl(photo.getThumbUrl());
        vo.setWidth(photo.getWidth());
        vo.setHeight(photo.getHeight());
        vo.setOrientation(photo.getOrientation());
        vo.setShotDate(photo.getShotDate() != null ? photo.getShotDate().toString() : null);
        vo.setStatus(photo.getStatus());
        vo.setSortOrder(photo.getSortOrder());
        return vo;
    }
}
