package com.photomap.controller;

import com.photomap.common.ApiResponse;
import com.photomap.dto.BlogPageVO;
import com.photomap.dto.BlogPostDetailVO;
import com.photomap.dto.BlogPostSummaryVO;
import com.photomap.dto.BlogTaxonomyVO;
import com.photomap.entity.BlogPost;
import com.photomap.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/blog")
@RequiredArgsConstructor
public class BlogController {

    private final BlogService blogService;

    @Value("${site.public-url:https://lhxjourney.cn}")
    private String publicUrl;

    @GetMapping("/posts")
    public ApiResponse<BlogPageVO<BlogPostSummaryVO>> listPosts(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "12") long pageSize,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "") String tag) {
        return ApiResponse.success(blogService.listPublished(page, pageSize, q, category, tag));
    }

    @GetMapping("/posts/{slug}")
    public ApiResponse<BlogPostDetailVO> getPost(@PathVariable String slug) {
        return ApiResponse.success(blogService.getPublishedDetail(slug));
    }

    @GetMapping("/categories")
    public ApiResponse<List<BlogTaxonomyVO>> categories() {
        return ApiResponse.success(blogService.listPublicCategories());
    }

    @GetMapping("/tags")
    public ApiResponse<List<BlogTaxonomyVO>> tags() {
        return ApiResponse.success(blogService.listPublicTags());
    }

    @GetMapping("/assets/{id}")
    public ResponseEntity<Void> asset(@PathVariable Long id) {
        return ResponseEntity.status(302)
                .location(URI.create(blogService.resolveAssetUrl(id)))
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
                .build();
    }

    @GetMapping(value = "/feed.xml", produces = "application/rss+xml;charset=UTF-8")
    public ResponseEntity<String> feed() {
        String base = normalizedPublicUrl();
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
                .append("<rss version=\"2.0\"><channel>")
                .append("<title>旅途拾光 · 知识博客</title>")
                .append("<link>").append(base).append("/blog</link>")
                .append("<description>前端、Java、运维、数据库与 AI 的实践笔记</description>")
                .append("<language>zh-CN</language>");
        for (BlogPost post : blogService.listAllPublished()) {
            String link = base + "/blog/" + post.getSlug();
            xml.append("<item><title>").append(escapeXml(post.getTitle())).append("</title>")
                    .append("<link>").append(link).append("</link>")
                    .append("<guid isPermaLink=\"true\">").append(link).append("</guid>")
                    .append("<description>").append(escapeXml(post.getExcerpt())).append("</description>");
            if (post.getPublishedAt() != null) {
                xml.append("<pubDate>").append(DateTimeFormatter.RFC_1123_DATE_TIME
                        .format(post.getPublishedAt().atOffset(ZoneOffset.ofHours(8)))).append("</pubDate>");
            }
            xml.append("</item>");
        }
        xml.append("</channel></rss>");
        return xmlResponse(xml.toString(), "application/rss+xml;charset=UTF-8");
    }

    @GetMapping(value = "/sitemap.xml", produces = "application/xml;charset=UTF-8")
    public ResponseEntity<String> sitemap() {
        String base = normalizedPublicUrl();
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
                .append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">")
                .append("<url><loc>").append(base).append("/blog</loc></url>");
        for (BlogPost post : blogService.listAllPublished()) {
            xml.append("<url><loc>").append(base).append("/blog/").append(post.getSlug()).append("</loc>");
            if (post.getUpdatedAt() != null) xml.append("<lastmod>").append(post.getUpdatedAt()).append("</lastmod>");
            xml.append("</url>");
        }
        xml.append("</urlset>");
        return xmlResponse(xml.toString(), "application/xml;charset=UTF-8");
    }

    private ResponseEntity<String> xmlResponse(String body, String contentType) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES).cachePublic())
                .body(body);
    }

    private String normalizedPublicUrl() {
        return publicUrl.replaceAll("/+$", "");
    }

    private String escapeXml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
    }
}
