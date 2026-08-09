package com.photomap.service;

import com.photomap.common.BusinessException;
import com.photomap.dto.BlogPostDetailVO;
import com.photomap.dto.BlogPostUpsertRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:blog-service;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;INIT=RUNSCRIPT FROM 'classpath:schema-h2.sql'",
        "spring.sql.init.mode=never",
        "spring.flyway.enabled=false",
        "thrift.server.enabled=false"
})
class BlogServiceIntegrationTest {

    @Autowired
    private BlogService blogService;

    @Autowired
    private SiteOwnerService siteOwnerService;

    @Test
    void draftIsPrivateAndFirstPublishedSlugRemainsLocked() {
        Long ownerId = siteOwnerService.getOwnerId();
        BlogPostUpsertRequest input = validInput("Spring Boot Notes");

        BlogPostDetailVO draft = blogService.createDraft(input, ownerId);
        assertThat(draft.getPost().getStatus()).isEqualTo(BlogService.DRAFT);
        assertThat(blogService.listPublished(1, 12, "", "", "").getTotal()).isZero();
        assertThatThrownBy(() -> blogService.getPublishedDetail(draft.getPost().getSlug()))
                .isInstanceOf(BusinessException.class);

        BlogPostDetailVO published = blogService.publish(draft.getPost().getId(), input, ownerId);
        assertThat(published.getPost().getSlug()).isEqualTo("spring-boot-notes");
        assertThat(blogService.listPublished(1, 12, "spring", "java", "backend").getTotal()).isEqualTo(1);

        input.setSlug("changed-online-address");
        input.setTitle("A clearer Spring Boot note");
        BlogPostDetailVO updated = blogService.publish(draft.getPost().getId(), input, ownerId);
        assertThat(updated.getPost().getSlug()).isEqualTo("spring-boot-notes");
        assertThatThrownBy(() -> blogService.saveDraft(draft.getPost().getId(), input, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("更新发布");

        BlogPostUpsertRequest duplicate = validInput("Spring Boot Notes");
        BlogPostDetailVO secondDraft = blogService.createDraft(duplicate, ownerId);
        BlogPostDetailVO secondPublished = blogService.publish(secondDraft.getPost().getId(), duplicate, ownerId);
        assertThat(secondPublished.getPost().getSlug()).isEqualTo("spring-boot-notes-2");

        blogService.deletePost(secondPublished.getPost().getId(), ownerId);
        BlogPostDetailVO thirdDraft = blogService.createDraft(duplicate, ownerId);
        BlogPostDetailVO thirdPublished = blogService.publish(thirdDraft.getPost().getId(), duplicate, ownerId);
        assertThat(thirdPublished.getPost().getSlug()).isEqualTo("spring-boot-notes-3");

        blogService.unpublish(draft.getPost().getId(), ownerId);
        assertThatThrownBy(() -> blogService.getPublishedDetail("spring-boot-notes"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void chineseTitleFallsBackToStablePostIdAndExcerptIsGenerated() {
        Long ownerId = siteOwnerService.getOwnerId();
        BlogPostUpsertRequest input = validInput("从前端走向全栈");
        input.setExcerpt("");

        BlogPostDetailVO draft = blogService.createDraft(input, ownerId);
        BlogPostDetailVO published = blogService.publish(draft.getPost().getId(), input, ownerId);

        assertThat(published.getPost().getSlug()).isEqualTo("post-" + draft.getPost().getId());
        assertThat(published.getPost().getExcerpt()).contains("Spring Boot");
        assertThat(published.getPost().getReadingTimeMinutes()).isGreaterThanOrEqualTo(1);
        assertThat(published.getHeadings()).extracting("text").contains("它是什么");
    }

    private BlogPostUpsertRequest validInput(String title) {
        BlogPostUpsertRequest input = new BlogPostUpsertRequest();
        input.setTitle(title);
        input.setExcerpt("一篇用于验证草稿、分类、标签和发布状态的文章。");
        input.setCategoryName("Java");
        input.setTagNames(List.of("backend", "Spring"));
        input.setContentMarkdown("## 它是什么\n\nSpring Boot 是 Java 服务端开发框架。\n\n```java\nSystem.out.println(\"ok\");\n```");
        return input;
    }
}
