package com.photomap.service;

import com.photomap.common.BusinessException;
import com.photomap.entity.Photo;
import com.photomap.mapper.LocationMapper;
import com.photomap.mapper.PhotoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PhotoService {

    private final PhotoMapper photoMapper;
    private final LocationMapper locationMapper;

    public void deletePhoto(Long id) {
        Photo photo = photoMapper.selectById(id);
        if (photo == null) {
            throw new BusinessException(404, "照片不存在");
        }
        photoMapper.deleteById(id);
    }
}
