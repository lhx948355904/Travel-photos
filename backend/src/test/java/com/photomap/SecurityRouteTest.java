package com.photomap;

import com.photomap.dto.PhotoIndexCoverageVO;
import com.photomap.dto.RagPhotoSearchResponse;
import com.photomap.service.SearchService;
import com.photomap.service.SiteOwnerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:photo-rag-security-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;INIT=RUNSCRIPT FROM 'classpath:schema-h2.sql'",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.sql.init.mode=never",
        "spring.task.scheduling.enabled=false",
        "ai.enabled=false"
})
@AutoConfigureMockMvc
class SecurityRouteTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SearchService searchService;

    @MockBean
    private SiteOwnerService siteOwnerService;

    @Test
    void allowsVisitorPhotoRagQuery() throws Exception {
        when(siteOwnerService.getOwnerId()).thenReturn(1L);
        when(searchService.searchRag(anyLong(), anyString(), anyInt(), any()))
                .thenReturn(RagPhotoSearchResponse.builder()
                        .answer(null)
                        .mode("keyword")
                        .citationPhotoIds(List.of())
                        .evidence(List.of())
                        .indexCoverage(new PhotoIndexCoverageVO(0, 0))
                        .warning("AI 未启用")
                        .requestId("test-request")
                        .build());

        mockMvc.perform(post("/api/search/photos/rag")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"海边日落\",\"limit\":8}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.mode").value("keyword"));
    }

    @Test
    void protectsPhotoIndexManagementRoutes() throws Exception {
        mockMvc.perform(get("/api/ai/photo-index/status"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }
}
