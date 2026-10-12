package com.photomap;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:security-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;INIT=RUNSCRIPT FROM 'classpath:schema-h2.sql'",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.sql.init.mode=never"
})
@AutoConfigureMockMvc
class SecurityRouteTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void protectsCosUploadCredentialRoute() throws Exception {
        mockMvc.perform(get("/api/cos/credential"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void removedMapFeatureRoutesAreUnavailable() throws Exception {
        mockMvc.perform(get("/api/search/photos"))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/search/photos/rag"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/ai/photo-index/status"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/ws/activity"))
                .andExpect(status().isNotFound());
    }
}
