package com.photomap.service;

import com.photomap.ai.PhotoAiProvider;
import com.photomap.config.AiProperties;
import com.photomap.dto.PhotoIndexCoverageVO;
import com.photomap.dto.RagPhotoSearchResponse;
import com.photomap.dto.SearchPhotoVO;
import com.photomap.entity.Photo;
import com.photomap.mapper.PhotoEmbeddingMapper;
import com.photomap.mapper.PhotoMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SearchServiceTest {

    private PhotoAiProvider provider;
    private PhotoIndexRepository repository;
    private RagAccessGuard guard;
    private SearchService service;

    @BeforeEach
    void setUp() {
        PhotoEmbeddingMapper embeddingMapper = mock(PhotoEmbeddingMapper.class);
        PhotoMapper photoMapper = mock(PhotoMapper.class);
        CosStsService cosStsService = mock(CosStsService.class);
        repository = mock(PhotoIndexRepository.class);
        provider = mock(PhotoAiProvider.class);
        guard = mock(RagAccessGuard.class);

        AiProperties properties = new AiProperties();
        properties.setEnabled(true);
        properties.setPublicEnabled(true);
        properties.setApiKey("test-key");

        Photo storedPhoto = new Photo();
        storedPhoto.setId(12L);
        storedPhoto.setUserId(1L);
        storedPhoto.setCosKey("users/1/photos/test.jpg");
        when(photoMapper.selectOwnedById(1L, 12L)).thenReturn(storedPhoto);
        when(cosStsService.objectExists(storedPhoto.getCosKey())).thenReturn(true);
        when(cosStsService.resolvePublicUrl(anyString(), anyString())).thenReturn("https://example/photo.jpg");
        when(repository.isVectorSearchAvailable()).thenReturn(true);
        when(repository.coverage(1L)).thenReturn(new PhotoIndexCoverageVO(1, 1));
        when(provider.isAvailable()).thenReturn(true);
        when(provider.embedQuery(anyString())).thenReturn(new float[1024]);
        when(guard.tryConsumeGeneration()).thenReturn(true);

        service = new SearchService(
                embeddingMapper,
                photoMapper,
                cosStsService,
                repository,
                provider,
                properties,
                guard
        );
    }

    @Test
    void returnsRagAnswerWhenCitationBelongsToEvidence() {
        when(repository.vectorSearch(anyLong(), anyString(), any(float[].class), anyInt()))
                .thenReturn(List.of(evidence()));
        when(provider.generateAnswer(anyString(), any()))
                .thenReturn(new PhotoAiProvider.GeneratedAnswer("在海边拍到了日落。", List.of(12L)));

        RagPhotoSearchResponse result = service.searchRag(1L, "哪里拍过日落", 8, "127.0.0.1");

        assertThat(result.getMode()).isEqualTo("rag");
        assertThat(result.getCitationPhotoIds()).containsExactly(12L);
        assertThat(result.getEvidence()).hasSize(1);
    }

    @Test
    void rejectsHallucinatedCitationAndKeepsSemanticEvidence() {
        when(repository.vectorSearch(anyLong(), anyString(), any(float[].class), anyInt()))
                .thenReturn(List.of(evidence()));
        when(provider.generateAnswer(anyString(), any()))
                .thenReturn(new PhotoAiProvider.GeneratedAnswer("错误引用。", List.of(999L)));

        RagPhotoSearchResponse result = service.searchRag(1L, "哪里拍过日落", 8, "127.0.0.1");

        assertThat(result.getMode()).isEqualTo("semantic");
        assertThat(result.getAnswer()).isNull();
        assertThat(result.getWarning()).contains("无法生成回答");
        assertThat(result.getEvidence()).hasSize(1);
    }

    private SearchPhotoVO evidence() {
        SearchPhotoVO evidence = new SearchPhotoVO();
        evidence.setPhotoId(12L);
        evidence.setLocationId(3L);
        evidence.setLocationName("海边");
        evidence.setUrl("https://example/original.jpg");
        evidence.setThumbUrl("https://example/thumb.jpg");
        evidence.setCaption("橙色夕阳落在海面");
        evidence.setTags("海边,日落");
        evidence.setScore(0.88);
        return evidence;
    }
}
