package com.photomap.service;

import com.photomap.dto.PhotoDTO;
import com.photomap.entity.Location;
import com.photomap.entity.Photo;
import com.photomap.entity.PhotoEmbedding;
import com.photomap.mapper.PhotoEmbeddingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PhotoEmbeddingService {

    private final PhotoEmbeddingMapper photoEmbeddingMapper;

    public void indexPhoto(Location location, Photo photo, PhotoDTO dto) {
        String caption = firstText(dto.getCaption(), buildCaption(location, photo));
        String tags = firstText(dto.getTags(), buildTags(location, photo));
        String searchText = String.join(" ", compact(
                caption,
                tags,
                location.getName(),
                location.getDescription(),
                location.getTravelDate() != null ? location.getTravelDate().toString() : null,
                photo.getShotDate() != null ? photo.getShotDate().toString() : null,
                photo.getOrientation()
        ));

        photoEmbeddingMapper.deleteByPhotoId(photo.getId());

        PhotoEmbedding embedding = new PhotoEmbedding();
        embedding.setUserId(photo.getUserId());
        embedding.setPhotoId(photo.getId());
        embedding.setLocationId(location.getId());
        embedding.setCaption(caption);
        embedding.setTags(tags);
        embedding.setSearchText(searchText);
        photoEmbeddingMapper.insert(embedding);
    }

    public void deleteByPhotoId(Long photoId) {
        photoEmbeddingMapper.deleteByPhotoId(photoId);
    }

    private String buildCaption(Location location, Photo photo) {
        List<String> parts = compact(
                location.getName(),
                location.getDescription(),
                location.getTravelDate() != null ? "travel date " + location.getTravelDate() : null,
                photo.getShotDate() != null ? "shot date " + photo.getShotDate() : null,
                photo.getOrientation() != null ? "orientation " + photo.getOrientation() : null
        );
        return String.join(", ", parts);
    }

    private String buildTags(Location location, Photo photo) {
        List<String> tags = compact(
                location.getName(),
                location.getTravelDate() != null ? location.getTravelDate().toString() : null,
                photo.getShotDate() != null ? photo.getShotDate().toString() : null,
                photo.getOrientation()
        );
        return String.join(",", tags);
    }

    private String firstText(String preferred, String fallback) {
        return StringUtils.hasText(preferred) ? preferred.trim() : fallback;
    }

    private List<String> compact(String... values) {
        List<String> result = new ArrayList<>();
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                result.add(value.trim());
            }
        }
        return result;
    }
}
