package com.photomap.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.photomap.common.BusinessException;
import com.photomap.dto.*;
import com.photomap.entity.Location;
import com.photomap.entity.Photo;
import com.photomap.mapper.LocationMapper;
import com.photomap.mapper.PhotoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationMapper locationMapper;
    private final PhotoMapper photoMapper;

    public List<LocationVO> listLocations(String bbox) {
        List<Location> locations;
        if (bbox != null && !bbox.isEmpty()) {
            String[] parts = bbox.split(",");
            if (parts.length == 4) {
                locations = locationMapper.selectByBbox(
                        Double.parseDouble(parts[0]),
                        Double.parseDouble(parts[1]),
                        Double.parseDouble(parts[2]),
                        Double.parseDouble(parts[3])
                );
            } else {
                locations = locationMapper.selectList(new LambdaQueryWrapper<Location>()
                        .eq(Location::getDeleted, false));
            }
        } else {
            locations = locationMapper.selectList(new LambdaQueryWrapper<Location>()
                    .eq(Location::getDeleted, false));
        }

        return locations.stream().map(this::toLocationVO).collect(Collectors.toList());
    }

    public LocationDetailVO getLocationDetail(Long id) {
        Location location = locationMapper.selectById(id);
        if (location == null || Boolean.TRUE.equals(location.getDeleted())) {
            throw new BusinessException(404, "地点不存在");
        }

        LocationDetailVO vo = new LocationDetailVO();
        vo.setId(location.getId());
        vo.setName(location.getName());
        vo.setDescription(location.getDescription());
        vo.setLongitude(location.getLongitude());
        vo.setLatitude(location.getLatitude());
        vo.setTravelDate(location.getTravelDate() != null ? location.getTravelDate().toString() : null);
        vo.setCoverPhotoId(location.getCoverPhotoId());

        List<Photo> photos = photoMapper.selectByLocationId(id);
        vo.setPhotos(photos.stream().map(this::toPhotoVO).collect(Collectors.toList()));

        return vo;
    }

    @Transactional
    public Long createLocation(LocationCreateRequest request) {
        Location location = new Location();
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
            PhotoDTO dto = photoDTOs.get(i);
            Photo photo = new Photo();
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
            photo.setSortOrder(i);
            photoMapper.insert(photo);

            if (request.getCoverIndex() != null && request.getCoverIndex() == i) {
                location.setCoverPhotoId(photo.getId());
            }
        }

        if (location.getCoverPhotoId() == null && !photoDTOs.isEmpty()) {
            List<Photo> insertedPhotos = photoMapper.selectByLocationId(location.getId());
            if (!insertedPhotos.isEmpty()) {
                location.setCoverPhotoId(insertedPhotos.get(0).getId());
            }
        }

        locationMapper.updateById(location);
        return location.getId();
    }

    @Transactional
    public void updateLocation(Long id, LocationUpdateRequest request) {
        Location location = locationMapper.selectById(id);
        if (location == null || Boolean.TRUE.equals(location.getDeleted())) {
            throw new BusinessException(404, "地点不存在");
        }

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
            location.setCoverPhotoId(request.getCoverPhotoId());
        }

        locationMapper.updateById(location);
    }

    @Transactional
    public void deleteLocation(Long id) {
        Location location = locationMapper.selectById(id);
        if (location == null) {
            throw new BusinessException(404, "地点不存在");
        }
        locationMapper.deleteById(id);
    }

    @Transactional
    public void addPhotos(Long locationId, List<PhotoDTO> photoDTOs) {
        Location location = locationMapper.selectById(locationId);
        if (location == null || Boolean.TRUE.equals(location.getDeleted())) {
            throw new BusinessException(404, "地点不存在");
        }

        int startOrder = photoMapper.countByLocationId(locationId);

        for (int i = 0; i < photoDTOs.size(); i++) {
            PhotoDTO dto = photoDTOs.get(i);
            Photo photo = new Photo();
            photo.setLocationId(locationId);
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
            photo.setSortOrder(startOrder + i);
            photoMapper.insert(photo);
        }
    }

    private LocationVO toLocationVO(Location location) {
        LocationVO vo = new LocationVO();
        vo.setId(location.getId());
        vo.setName(location.getName());
        vo.setLongitude(location.getLongitude());
        vo.setLatitude(location.getLatitude());
        vo.setTravelDate(location.getTravelDate() != null ? location.getTravelDate().toString() : null);

        int count = photoMapper.countByLocationId(location.getId());
        vo.setPhotoCount(count);

        if (location.getCoverPhotoId() != null) {
            Photo cover = photoMapper.selectById(location.getCoverPhotoId());
            if (cover != null) {
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
        vo.setSortOrder(photo.getSortOrder());
        return vo;
    }
}
