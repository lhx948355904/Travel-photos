package com.photomap.service;

import com.photomap.dto.PhotoDTO;
import com.photomap.entity.Location;
import com.photomap.entity.Photo;
import com.photomap.entity.PhotoEmbedding;
import com.photomap.mapper.PhotoEmbeddingMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class PhotoEmbeddingServiceTest {

    @Test
    void queuesPhotoWithoutCallingCloudModel() {
        PhotoEmbeddingMapper mapper = mock(PhotoEmbeddingMapper.class);
        PhotoEmbeddingService service = new PhotoEmbeddingService(mapper);

        Location location = new Location();
        location.setId(3L);
        location.setName("海边");
        Photo photo = new Photo();
        photo.setId(12L);
        photo.setUserId(1L);
        photo.setLocationId(3L);
        PhotoDTO dto = new PhotoDTO();
        dto.setCaption("日落");
        dto.setTags("海边,晚霞");

        service.indexPhoto(location, photo, dto);

        ArgumentCaptor<PhotoEmbedding> captor = ArgumentCaptor.forClass(PhotoEmbedding.class);
        verify(mapper).insert(captor.capture());
        assertThat(captor.getValue().getIndexStatus()).isEqualTo("PENDING");
        assertThat(captor.getValue().getRetryCount()).isZero();
        assertThat(captor.getValue().getSearchText()).contains("日落", "海边");
    }
}
