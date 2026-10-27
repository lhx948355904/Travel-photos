package com.photomap.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.photomap.common.BusinessException;
import com.photomap.dto.ScoreGalleryEntryRequest;
import com.photomap.dto.ScoreGalleryEntryVO;
import com.photomap.dto.ScoreImageVO;
import com.photomap.entity.ScoreGalleryEntry;
import com.photomap.entity.ScoreGalleryImage;
import com.photomap.mapper.ScoreGalleryEntryMapper;
import com.photomap.mapper.ScoreGalleryImageMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScoreGalleryService {
    private final ScoreGalleryEntryMapper entryMapper;
    private final ScoreGalleryImageMapper imageMapper;
    private final SiteOwnerService siteOwnerService;
    private final CosStsService cosStsService;

    public List<ScoreGalleryEntryVO> list() {
        List<ScoreGalleryEntry> entries = entryMapper.selectList(new LambdaQueryWrapper<ScoreGalleryEntry>()
                .eq(ScoreGalleryEntry::getUserId, siteOwnerService.getOwnerId())
                .orderByDesc(ScoreGalleryEntry::getPlayedAt)
                .orderByDesc(ScoreGalleryEntry::getId));
        if (entries.isEmpty()) return List.of();
        List<Long> ids = entries.stream().map(ScoreGalleryEntry::getId).toList();
        Map<Long, List<ScoreImageVO>> imagesByEntry = imageMapper.selectList(
                        new LambdaQueryWrapper<ScoreGalleryImage>()
                                .in(ScoreGalleryImage::getEntryId, ids)
                                .orderByAsc(ScoreGalleryImage::getSortOrder))
                .stream().collect(Collectors.groupingBy(ScoreGalleryImage::getEntryId,
                        Collectors.mapping(this::toImageView, Collectors.toList())));
        return entries.stream()
                .map(entry -> toView(entry, imagesByEntry.getOrDefault(entry.getId(), List.of())))
                .toList();
    }

    @Transactional
    public ScoreGalleryEntryVO create(ScoreGalleryEntryRequest request, Long userId) {
        List<String> keys = validateImageKeys(request.getImageKeys(), userId);
        ScoreGalleryEntry entry = new ScoreGalleryEntry();
        entry.setUserId(userId);
        entry.setTitle(request.getTitle().trim());
        entry.setPlayedAt(request.getPlayedAt());
        entry.setNote(StringUtils.hasText(request.getNote()) ? request.getNote().trim() : null);
        entryMapper.insert(entry);
        for (int index = 0; index < keys.size(); index++) {
            ScoreGalleryImage image = new ScoreGalleryImage();
            image.setEntryId(entry.getId());
            image.setImageKey(keys.get(index));
            image.setSortOrder(index);
            imageMapper.insert(image);
        }
        return toView(entry, imagesFor(entry.getId()));
    }

    @Transactional
    public void delete(Long id, Long userId) {
        ScoreGalleryEntry entry = entryMapper.selectById(id);
        if (entry == null || !userId.equals(entry.getUserId())) {
            throw new BusinessException(404, "图库影像不存在");
        }
        entryMapper.deleteById(id);
    }

    private List<String> validateImageKeys(List<String> imageKeys, Long userId) {
        if (imageKeys == null || imageKeys.isEmpty()) throw new BusinessException("请至少上传一张图片");
        List<String> keys = imageKeys.stream().map(String::trim).toList();
        if (keys.stream().distinct().count() != keys.size()) throw new BusinessException("请勿重复添加同一张图片");
        String prefix = "users/" + userId + "/scores/";
        for (String key : keys) {
            if (!StringUtils.hasText(key) || !key.startsWith(prefix) || key.contains("..")
                    || key.length() > 512 || !cosStsService.objectExists(key)) {
                throw new BusinessException("图库图片不存在或不属于当前管理员");
            }
        }
        return keys;
    }

    private List<ScoreImageVO> imagesFor(Long entryId) {
        return imageMapper.selectList(new LambdaQueryWrapper<ScoreGalleryImage>()
                        .eq(ScoreGalleryImage::getEntryId, entryId)
                        .orderByAsc(ScoreGalleryImage::getSortOrder))
                .stream().map(this::toImageView).toList();
    }

    private ScoreImageVO toImageView(ScoreGalleryImage image) {
        return new ScoreImageVO(image.getImageKey(), cosStsService.resolvePublicUrl(image.getImageKey(), null));
    }

    private ScoreGalleryEntryVO toView(ScoreGalleryEntry entry, List<ScoreImageVO> images) {
        return new ScoreGalleryEntryVO(entry.getId(), entry.getTitle(), entry.getPlayedAt(),
                entry.getNote(), entry.getUpdatedAt(), images);
    }
}
