package com.photomap;

import com.photomap.dto.BlogPostDetailVO;
import com.photomap.dto.BlogPostUpsertRequest;
import com.photomap.service.BlogService;
import com.photomap.service.SiteOwnerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:blog-security;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;INIT=RUNSCRIPT FROM 'classpath:schema-h2.sql'",
        "spring.sql.init.mode=never",
        "spring.flyway.enabled=false",
        "thrift.server.enabled=false"
})
@AutoConfigureMockMvc
class BlogSecurityRouteTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BlogService blogService;

    @Autowired
    private SiteOwnerService siteOwnerService;

    @Test
    void publicReadDoesNotRequireLogin() throws Exception {
        mockMvc.perform(get("/api/blog/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    void adminWriteRequiresJwt() throws Exception {
        mockMvc.perform(post("/api/admin/blog/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void draftReturnsHttp404FromPublicRoute() throws Exception {
        BlogPostUpsertRequest input = new BlogPostUpsertRequest();
        input.setTitle("private draft");
        input.setContentMarkdown("draft content");
        input.setCategoryName("Java");
        input.setTagNames(List.of());
        BlogPostDetailVO draft = blogService.createDraft(input, siteOwnerService.getOwnerId());

        mockMvc.perform(get("/api/blog/posts/{slug}", draft.getPost().getSlug()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404));
    }
}
