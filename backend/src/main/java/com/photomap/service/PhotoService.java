package com.photomap.service;

import com.photomap.common.BusinessException;
import com.photomap.entity.Photo;
import com.photomap.mapper.PhotoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PhotoService {

    private final PhotoMapper photoMapper;
    private final PhotoEmbeddingService photoEmbeddingService;

    @Transactional
    public void deletePhoto(Long userId, Long id) {
        Photo photo = photoMapper.selectOwnedById(userId, id);
        if (photo == null) {
            throw new BusinessException(404, "照片不存在");
        }
        photoMapper.deleteById(id);
        photoEmbeddingService.deleteByPhotoId(id);
    }
}
