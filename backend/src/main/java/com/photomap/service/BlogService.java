package com.photomap.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.photomap.common.BusinessException;
import com.photomap.dto.*;
import com.photomap.entity.BlogAsset;
import com.photomap.entity.BlogCategory;
import com.photomap.entity.BlogPost;
import com.photomap.entity.BlogTag;
import com.photomap.mapper.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlogService {

    public static final String DRAFT = "DRAFT";
    public static final String PUBLISHED = "PUBLISHED";
    private static final Pattern MARKDOWN_TOKEN = Pattern.compile("[`*_>#\\[\\]()]|!\\[[^]]*]|https?://\\S+");
    private static final Pattern HEADING = Pattern.compile("^(#{2,4})\\s+(.+?)\\s*#*\\s*$");
    private static final Pattern CJK = Pattern.compile("[\\p{IsHan}\\p{IsHiragana}\\p{IsKatakana}\\p{IsHangul}]");
    private static final Pattern LATIN_WORD = Pattern.compile("[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*");

    private final BlogPostMapper postMapper;
    private final BlogCategoryMapper categoryMapper;
    private final BlogTagMapper tagMapper;
    private final BlogPostTagMapper postTagMapper;
    private final BlogAssetMapper assetMapper;
    private final SiteOwnerService siteOwnerService;
    private final CosStsService cosStsService;

    public BlogPageVO<BlogPostSummaryVO> listPublished(long page, long pageSize, String q,
                                                       String categorySlug, String tagSlug) {
        long safePage = Math.max(1, page);
        long safeSize = Math.min(50, Math.max(1, pageSize));
        String keyword = trim(q);
        if (keyword.length() > 100) {
            throw new BusinessException("搜索关键词不能超过 100 个字符");
        }

        LambdaQueryWrapper<BlogPost> query = publicQuery();
        if (StringUtils.hasText(categorySlug)) {
            BlogCategory category = findCategoryBySlug(siteOwnerService.getOwnerId(), categorySlug);
            if (category == null) return emptyPage(safePage, safeSize);
            query.eq(BlogPost::getCategoryId, category.getId());
        }
        if (StringUtils.hasText(tagSlug)) {
            BlogTag tag = findTagBySlug(siteOwnerService.getOwnerId(), tagSlug);
            if (tag == null) return emptyPage(safePage, safeSize);
            List<Long> postIds = postTagMapper.selectPostIdsByTagId(tag.getId());
            if (postIds.isEmpty()) return emptyPage(safePage, safeSize);
            query.in(BlogPost::getId, postIds);
        }
        if (StringUtils.hasText(keyword)) {
            String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            query.and(w -> w.apply("LOWER(title) LIKE {0}", pattern)
                    .or().apply("LOWER(excerpt) LIKE {0}", pattern)
                    .or().apply("LOWER(content_markdown) LIKE {0}", pattern));
        }
        query.orderByDesc(BlogPost::getPublishedAt).orderByDesc(BlogPost::getUpdatedAt);

        Page<BlogPost> result = postMapper.selectPage(new Page<>(safePage, safeSize), query);
        List<BlogPostSummaryVO> items = result.getRecords().stream().map(this::toSummary).toList();
        return BlogPageVO.<BlogPostSummaryVO>builder()
                .items(items).page(safePage).pageSize(safeSize)
                .total(result.getTotal()).totalPages(result.getPages()).build();
    }

    public BlogPostDetailVO getPublishedDetail(String slug) {
        BlogPost post = postMapper.selectOne(publicQuery().eq(BlogPost::getSlug, slug).last("LIMIT 1"));
        if (post == null) throw new BusinessException(404, "文章不存在或尚未发布");
        return toDetail(post, true);
    }

    public List<BlogTaxonomyVO> listPublicCategories() {
        List<BlogPost> posts = postMapper.selectList(publicQuery());
        Map<Long, Long> counts = posts.stream().filter(p -> p.getCategoryId() != null)
                .collect(Collectors.groupingBy(BlogPost::getCategoryId, Collectors.counting()));
        if (counts.isEmpty()) return List.of();
        return categoryMapper.selectBatchIds(counts.keySet()).stream()
                .map(c -> new BlogTaxonomyVO(c.getId(), c.getName(), c.getSlug(), counts.getOrDefault(c.getId(), 0L)))
                .sorted(Comparator.comparing(BlogTaxonomyVO::getName)).toList();
    }

    public List<BlogTaxonomyVO> listPublicTags() {
        List<BlogPost> posts = postMapper.selectList(publicQuery());
        Set<Long> publishedIds = posts.stream().map(BlogPost::getId).collect(Collectors.toSet());
        Map<Long, Long> counts = new HashMap<>();
        for (Long postId : publishedIds) {
            for (Long tagId : postTagMapper.selectTagIdsByPostId(postId)) counts.merge(tagId, 1L, Long::sum);
        }
        if (counts.isEmpty()) return List.of();
        return tagMapper.selectBatchIds(counts.keySet()).stream()
                .map(t -> new BlogTaxonomyVO(t.getId(), t.getName(), t.getSlug(), counts.getOrDefault(t.getId(), 0L)))
                .sorted(Comparator.comparing(BlogTaxonomyVO::getPostCount).reversed()
                        .thenComparing(BlogTaxonomyVO::getName)).toList();
    }

    public BlogPageVO<BlogPostSummaryVO> listAdmin(long page, long pageSize, String q, String status, Long userId) {
        long safePage = Math.max(1, page);
        long safeSize = Math.min(50, Math.max(1, pageSize));
        LambdaQueryWrapper<BlogPost> query = new LambdaQueryWrapper<BlogPost>()
                .eq(BlogPost::getUserId, userId);
        if (DRAFT.equalsIgnoreCase(status) || PUBLISHED.equalsIgnoreCase(status)) {
            query.eq(BlogPost::getStatus, status.toUpperCase(Locale.ROOT));
        }
        String keyword = trim(q);
        if (keyword.length() > 100) throw new BusinessException("搜索关键词不能超过 100 个字符");
        if (StringUtils.hasText(keyword)) {
            String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            query.and(w -> w.apply("LOWER(title) LIKE {0}", pattern)
                    .or().apply("LOWER(excerpt) LIKE {0}", pattern));
        }
        query.orderByDesc(BlogPost::getUpdatedAt);
        Page<BlogPost> result = postMapper.selectPage(new Page<>(safePage, safeSize), query);
        return BlogPageVO.<BlogPostSummaryVO>builder()
                .items(result.getRecords().stream().map(this::toSummary).toList())
                .page(safePage).pageSize(safeSize).total(result.getTotal()).totalPages(result.getPages()).build();
    }

    public BlogPostDetailVO getAdminDetail(Long id, Long userId) {
        return toDetail(requireOwnedPost(id, userId), false);
    }

    @Transactional
    public BlogPostDetailVO createDraft(BlogPostUpsertRequest request, Long userId) {
        BlogPost post = new BlogPost();
        post.setUserId(userId);
        post.setStatus(DRAFT);
        post.setSlug("draft-" + UUID.randomUUID());
        applyRequest(post, request, userId, false);
        postMapper.insert(post);
        replaceTags(post.getId(), request.getTagNames(), userId);
        return toDetail(postMapper.selectById(post.getId()), false);
    }

    @Transactional
    public BlogPostDetailVO saveDraft(Long id, BlogPostUpsertRequest request, Long userId) {
        BlogPost post = requireOwnedPost(id, userId);
        if (PUBLISHED.equals(post.getStatus())) {
            throw new BusinessException("已发布文章只能通过“更新发布”修改线上内容");
        }
        applyRequest(post, request, userId, false);
        postMapper.updateById(post);
        replaceTags(post.getId(), request.getTagNames(), userId);
        return toDetail(postMapper.selectById(id), false);
    }

    @Transactional
    public BlogPostDetailVO publish(Long id, BlogPostUpsertRequest request, Long userId) {
        BlogPost post = requireOwnedPost(id, userId);
        validatePublish(request);
        boolean firstPublish = post.getPublishedAt() == null;
        applyRequest(post, request, userId, true);
        if (firstPublish) {
            post.setSlug(uniquePostSlug(userId, request.getSlug(), request.getTitle(), post.getId()));
            post.setPublishedAt(LocalDateTime.now());
        }
        post.setStatus(PUBLISHED);
        postMapper.updateById(post);
        replaceTags(post.getId(), request.getTagNames(), userId);
        return toDetail(postMapper.selectById(id), false);
    }

    @Transactional
    public BlogPostDetailVO unpublish(Long id, Long userId) {
        BlogPost post = requireOwnedPost(id, userId);
        post.setStatus(DRAFT);
        postMapper.updateById(post);
        return toDetail(postMapper.selectById(id), false);
    }

    @Transactional
    public void deletePost(Long id, Long userId) {
        BlogPost post = requireOwnedPost(id, userId);
        postTagMapper.deleteByPostId(post.getId());
        postMapper.deleteById(post.getId());
    }

    public BlogAssetVO uploadAsset(MultipartFile file, Long userId) {
        var uploaded = cosStsService.uploadBlogImage(userId, file);
        BlogAsset asset = new BlogAsset();
        asset.setUserId(userId);
        asset.setObjectKey(uploaded.getCosKey());
        asset.setOriginalName(file.getOriginalFilename());
        asset.setContentType(file.getContentType());
        asset.setFallbackUrl(uploaded.getUrl());
        try {
            BufferedImage image = ImageIO.read(file.getInputStream());
            if (image != null) {
                asset.setWidth(image.getWidth());
                asset.setHeight(image.getHeight());
            }
        } catch (Exception ignored) {
            // WebP dimensions may not be readable by the JDK image codec.
        }
        assetMapper.insert(asset);
        return toAssetVO(asset);
    }

    public String resolveAssetUrl(Long id) {
        BlogAsset asset = assetMapper.selectById(id);
        if (asset == null) throw new BusinessException(404, "图片不存在");
        return cosStsService.resolvePublicUrl(asset.getObjectKey(), asset.getFallbackUrl());
    }

    public List<BlogPost> listAllPublished() {
        return postMapper.selectList(publicQuery().orderByDesc(BlogPost::getPublishedAt));
    }

    private void applyRequest(BlogPost post, BlogPostUpsertRequest request, Long userId, boolean publishing) {
        post.setTitle(trim(request.getTitle()));
        post.setContentMarkdown(request.getContentMarkdown() == null ? "" : request.getContentMarkdown());
        String excerpt = trim(request.getExcerpt());
        post.setExcerpt(StringUtils.hasText(excerpt) ? excerpt : generateExcerpt(post.getContentMarkdown()));
        post.setCategoryId(resolveCategoryId(request.getCategoryName(), userId));
        post.setCoverAssetId(validateCover(request.getCoverAssetId(), userId));
        if (!publishing && StringUtils.hasText(request.getSlug()) && post.getPublishedAt() == null) {
            String candidate = slugify(request.getSlug());
            if (StringUtils.hasText(candidate)) post.setSlug(uniquePostSlug(userId, candidate, post.getTitle(), post.getId()));
        }
    }

    private void validatePublish(BlogPostUpsertRequest request) {
        if (!StringUtils.hasText(request.getTitle())) throw new BusinessException("发布前请填写标题");
        if (!StringUtils.hasText(request.getContentMarkdown())) throw new BusinessException("发布前请填写正文");
        if (!StringUtils.hasText(request.getCategoryName())) throw new BusinessException("发布前请选择分类");
    }

    private Long resolveCategoryId(String categoryName, Long userId) {
        String name = trim(categoryName);
        if (!StringUtils.hasText(name)) return null;
        String slug = taxonomySlug(name);
        BlogCategory existing = findCategoryBySlug(userId, slug);
        if (existing != null) return existing.getId();
        BlogCategory category = new BlogCategory();
        category.setUserId(userId); category.setName(name); category.setSlug(slug); category.setDisplayOrder(0);
        categoryMapper.insert(category);
        return category.getId();
    }

    private void replaceTags(Long postId, List<String> names, Long userId) {
        postTagMapper.deleteByPostId(postId);
        if (names == null || names.isEmpty()) return;
        LinkedHashMap<String, String> unique = new LinkedHashMap<>();
        for (String raw : names) {
            String name = trim(raw);
            if (StringUtils.hasText(name)) unique.putIfAbsent(taxonomySlug(name), name);
        }
        if (unique.size() > 8) throw new BusinessException("每篇文章最多添加 8 个标签");
        for (Map.Entry<String, String> entry : unique.entrySet()) {
            BlogTag tag = findTagBySlug(userId, entry.getKey());
            if (tag == null) {
                tag = new BlogTag(); tag.setUserId(userId); tag.setName(entry.getValue()); tag.setSlug(entry.getKey());
                tagMapper.insert(tag);
            }
            postTagMapper.insertRelation(postId, tag.getId());
        }
    }

    private Long validateCover(Long assetId, Long userId) {
        if (assetId == null) return null;
        BlogAsset asset = assetMapper.selectOne(new LambdaQueryWrapper<BlogAsset>()
                .eq(BlogAsset::getId, assetId).eq(BlogAsset::getUserId, userId));
        if (asset == null) throw new BusinessException("封面图片不存在或不属于当前用户");
        return assetId;
    }

    private BlogPost requireOwnedPost(Long id, Long userId) {
        BlogPost post = postMapper.selectOne(new LambdaQueryWrapper<BlogPost>()
                .eq(BlogPost::getId, id).eq(BlogPost::getUserId, userId));
        if (post == null) throw new BusinessException(404, "文章不存在");
        return post;
    }

    private BlogPostDetailVO toDetail(BlogPost post, boolean withRelated) {
        List<BlogPostSummaryVO> related = List.of();
        if (withRelated && post.getCategoryId() != null) {
            related = postMapper.selectList(publicQuery()
                            .eq(BlogPost::getCategoryId, post.getCategoryId())
                            .ne(BlogPost::getId, post.getId())
                            .orderByDesc(BlogPost::getPublishedAt).last("LIMIT 3"))
                    .stream().map(this::toSummary).toList();
        }
        return BlogPostDetailVO.builder().post(toSummary(post)).contentMarkdown(post.getContentMarkdown())
                .headings(extractHeadings(post.getContentMarkdown())).relatedPosts(related).build();
    }

    private BlogPostSummaryVO toSummary(BlogPost post) {
        BlogTaxonomyVO category = null;
        if (post.getCategoryId() != null) {
            BlogCategory c = categoryMapper.selectById(post.getCategoryId());
            if (c != null) category = new BlogTaxonomyVO(c.getId(), c.getName(), c.getSlug(), null);
        }
        List<BlogTaxonomyVO> tags = postTagMapper.selectTagsByPostId(post.getId()).stream()
                .map(t -> new BlogTaxonomyVO(t.getId(), t.getName(), t.getSlug(), null)).toList();
        return BlogPostSummaryVO.builder().id(post.getId()).slug(post.getSlug()).title(post.getTitle())
                .excerpt(post.getExcerpt()).category(category).tags(tags).coverAssetId(post.getCoverAssetId())
                .coverUrl(post.getCoverAssetId() == null ? null : "/api/blog/assets/" + post.getCoverAssetId())
                .status(post.getStatus()).publishedAt(post.getPublishedAt()).updatedAt(post.getUpdatedAt())
                .readingTimeMinutes(readingTime(post.getContentMarkdown())).build();
    }

    private List<BlogHeadingVO> extractHeadings(String markdown) {
        if (!StringUtils.hasText(markdown)) return List.of();
        List<BlogHeadingVO> result = new ArrayList<>();
        Map<String, Integer> used = new HashMap<>();
        boolean fenced = false;
        for (String line : markdown.split("\\R")) {
            if (line.stripLeading().startsWith("```")) { fenced = !fenced; continue; }
            if (fenced) continue;
            Matcher matcher = HEADING.matcher(line);
            if (!matcher.matches()) continue;
            String text = matcher.group(2).replaceAll("[`*_\\[\\]]", "").trim();
            String base = headingSlug(text);
            int count = used.merge(base, 1, Integer::sum);
            String id = count == 1 ? base : base + "-" + (count - 1);
            result.add(new BlogHeadingVO(id, text, matcher.group(1).length()));
        }
        return result;
    }

    private int readingTime(String markdown) {
        String text = markdown == null ? "" : markdown;
        long cjk = CJK.matcher(text).results().count();
        long latin = LATIN_WORD.matcher(text).results().count();
        return Math.max(1, (int) Math.ceil(cjk / 400.0 + latin / 200.0));
    }

    private String generateExcerpt(String markdown) {
        String plain = MARKDOWN_TOKEN.matcher(markdown == null ? "" : markdown)
                .replaceAll(" ").replaceAll("\\s+", " ").trim();
        return plain.length() <= 220 ? plain : plain.substring(0, 219).stripTrailing() + "…";
    }

    private String uniquePostSlug(Long userId, String requested, String title, Long currentId) {
        String base = slugify(StringUtils.hasText(requested) ? requested : title);
        if (!StringUtils.hasText(base)) base = currentId == null ? "post" : "post-" + currentId;
        String candidate = base;
        int suffix = 2;
        while (postMapper.countAnyBySlug(userId, candidate, currentId) > 0) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String slugify(String value) {
        String ascii = Normalizer.normalize(trim(value), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return ascii.length() > 170 ? ascii.substring(0, 170).replaceAll("-+$", "") : ascii;
    }

    private String taxonomySlug(String value) {
        String slug = slugify(value);
        if (StringUtils.hasText(slug)) return slug;
        return "zh-" + Integer.toUnsignedString(value.hashCode(), 36);
    }

    private String headingSlug(String value) {
        String slug = trim(value).toLowerCase(Locale.ROOT).replaceAll("\\s+", "-")
                .replaceAll("[^\\p{L}\\p{N}_-]", "").replaceAll("-+", "-");
        return StringUtils.hasText(slug) ? slug : "section";
    }

    private BlogCategory findCategoryBySlug(Long userId, String slug) {
        return categoryMapper.selectOne(new LambdaQueryWrapper<BlogCategory>()
                .eq(BlogCategory::getUserId, userId).eq(BlogCategory::getSlug, slug));
    }

    private BlogTag findTagBySlug(Long userId, String slug) {
        return tagMapper.selectOne(new LambdaQueryWrapper<BlogTag>()
                .eq(BlogTag::getUserId, userId).eq(BlogTag::getSlug, slug));
    }

    private LambdaQueryWrapper<BlogPost> publicQuery() {
        return new LambdaQueryWrapper<BlogPost>().eq(BlogPost::getUserId, siteOwnerService.getOwnerId())
                .eq(BlogPost::getStatus, PUBLISHED);
    }

    private BlogPageVO<BlogPostSummaryVO> emptyPage(long page, long pageSize) {
        return BlogPageVO.<BlogPostSummaryVO>builder().items(List.of()).page(page).pageSize(pageSize)
                .total(0L).totalPages(0L).build();
    }

    private BlogAssetVO toAssetVO(BlogAsset asset) {
        return BlogAssetVO.builder().id(asset.getId()).url("/api/blog/assets/" + asset.getId())
                .originalName(asset.getOriginalName()).contentType(asset.getContentType())
                .width(asset.getWidth()).height(asset.getHeight()).build();
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
