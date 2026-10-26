package com.photomap.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.photomap.common.BusinessException;
import com.photomap.dto.BlogPageVO;
import com.photomap.dto.ScoreFrameInput;
import com.photomap.dto.ScoreFrameVO;
import com.photomap.dto.ScoreRecordRequest;
import com.photomap.dto.ScoreRecordVO;
import com.photomap.entity.ScoreFrame;
import com.photomap.entity.ScoreRecord;
import com.photomap.mapper.ScoreFrameMapper;
import com.photomap.mapper.ScoreRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScoreRecordService {
    private final ScoreRecordMapper mapper;
    private final ScoreFrameMapper frameMapper;
    private final SiteOwnerService siteOwnerService;
    private final CosStsService cosStsService;

    public BlogPageVO<ScoreRecordVO> list(long page, long pageSize, String query, String month) {
        long safePage = Math.max(1, page);
        long safeSize = Math.max(1, Math.min(pageSize, 30));
        Long ownerId = siteOwnerService.getOwnerId();
        LambdaQueryWrapper<ScoreRecord> filter = new LambdaQueryWrapper<ScoreRecord>()
                .eq(ScoreRecord::getUserId, ownerId)
                .orderByDesc(ScoreRecord::getPlayedAt)
                .orderByDesc(ScoreRecord::getId);
        String keyword = query == null ? "" : query.trim();
        if (!keyword.isEmpty()) {
            if (keyword.length() > 100) throw new BusinessException("搜索词不能超过 100 个字符");
            filter.and(w -> w.like(ScoreRecord::getTitle, keyword)
                    .or().like(ScoreRecord::getPlayerOne, keyword)
                    .or().like(ScoreRecord::getPlayerTwo, keyword)
                    .or().like(ScoreRecord::getVenue, keyword));
        }
        if (StringUtils.hasText(month)) {
            try {
                YearMonth selected = YearMonth.parse(month);
                filter.ge(ScoreRecord::getPlayedAt, selected.atDay(1).atStartOfDay())
                        .lt(ScoreRecord::getPlayedAt, selected.plusMonths(1).atDay(1).atStartOfDay());
            } catch (DateTimeParseException e) {
                throw new BusinessException("月份格式应为 YYYY-MM");
            }
        }
        Page<ScoreRecord> result = mapper.selectPage(new Page<>(safePage, safeSize), filter);
        List<Long> recordIds = result.getRecords().stream().map(ScoreRecord::getId).toList();
        Map<Long, List<ScoreFrameVO>> framesByRecord = recordIds.isEmpty() ? Map.of() :
                frameMapper.selectList(new LambdaQueryWrapper<ScoreFrame>()
                                .in(ScoreFrame::getRecordId, recordIds)
                                .orderByAsc(ScoreFrame::getFrameNumber))
                        .stream().collect(Collectors.groupingBy(ScoreFrame::getRecordId,
                                Collectors.mapping(this::toFrameView, Collectors.toList())));
        return BlogPageVO.<ScoreRecordVO>builder()
                .items(result.getRecords().stream()
                        .map(record -> toView(record, framesByRecord.getOrDefault(record.getId(), List.of())))
                        .toList())
                .page(result.getCurrent()).pageSize(result.getSize())
                .total(result.getTotal()).totalPages(result.getPages()).build();
    }

    @Transactional
    public ScoreRecordVO create(ScoreRecordRequest request, Long userId) {
        ScoreRecord record = new ScoreRecord();
        record.setUserId(userId);
        apply(record, request, userId);
        mapper.insert(record);
        saveFrames(record.getId(), request.getFrames());
        return toView(record, framesFor(record.getId()));
    }

    @Transactional
    public ScoreRecordVO update(Long id, ScoreRecordRequest request, Long userId) {
        ScoreRecord record = owned(id, userId);
        apply(record, request, userId);
        mapper.updateById(record);
        saveFrames(record.getId(), request.getFrames());
        return toView(record, framesFor(record.getId()));
    }

    @Transactional
    public void delete(Long id, Long userId) {
        mapper.deleteById(owned(id, userId).getId());
    }

    private ScoreRecord owned(Long id, Long userId) {
        ScoreRecord record = mapper.selectById(id);
        if (record == null || !userId.equals(record.getUserId())) {
            throw new BusinessException(404, "比分记录不存在");
        }
        return record;
    }

    private void apply(ScoreRecord record, ScoreRecordRequest input, Long userId) {
        if (input.getScoreOne() + input.getScoreTwo() == 0) {
            throw new BusinessException("双方比分不能同时为 0");
        }
        validateFrames(input);
        String key = StringUtils.hasText(input.getImageKey()) ? input.getImageKey().trim() : null;
        if (key != null) {
            String prefix = "users/" + userId + "/scores/";
            if (!key.startsWith(prefix) || key.contains("..") || key.length() > 512 || !cosStsService.objectExists(key)) {
                throw new BusinessException("比分图片不存在或不属于当前管理员");
            }
        }
        record.setTitle(input.getTitle().trim());
        record.setPlayerOne(input.getPlayerOne().trim());
        record.setPlayerTwo(input.getPlayerTwo().trim());
        record.setScoreOne(input.getScoreOne());
        record.setScoreTwo(input.getScoreTwo());
        record.setPlayedAt(input.getPlayedAt());
        record.setVenue(StringUtils.hasText(input.getVenue()) ? input.getVenue().trim() : null);
        record.setNote(StringUtils.hasText(input.getNote()) ? input.getNote().trim() : null);
        record.setImageKey(key);
    }

    private void validateFrames(ScoreRecordRequest input) {
        List<ScoreFrameInput> frames = input.getFrames();
        if (frames == null || frames.isEmpty()) return;
        int firstWins = 0;
        int secondWins = 0;
        for (ScoreFrameInput frame : frames) {
            if (frame == null || frame.getPointsOne() == null || frame.getPointsTwo() == null
                    || frame.getPointsOne() < 0 || frame.getPointsTwo() < 0
                    || frame.getPointsOne() > 200 || frame.getPointsTwo() > 200) {
                throw new BusinessException("逐局得分需为 0–200 的整数");
            }
            if (frame.getPointsOne().equals(frame.getPointsTwo())) {
                throw new BusinessException("每局需要分出胜负，请确认双方得分");
            }
            if (frame.getPointsOne() > frame.getPointsTwo()) firstWins++;
            else secondWins++;
        }
        if (firstWins != input.getScoreOne() || secondWins != input.getScoreTwo()) {
            throw new BusinessException("整场比分应等于逐局胜局数");
        }
    }

    private void saveFrames(Long recordId, List<ScoreFrameInput> frames) {
        frameMapper.delete(new LambdaQueryWrapper<ScoreFrame>().eq(ScoreFrame::getRecordId, recordId));
        if (frames == null) return;
        for (int index = 0; index < frames.size(); index++) {
            ScoreFrame frame = new ScoreFrame();
            frame.setRecordId(recordId);
            frame.setFrameNumber(index + 1);
            frame.setPointsOne(frames.get(index).getPointsOne());
            frame.setPointsTwo(frames.get(index).getPointsTwo());
            frameMapper.insert(frame);
        }
    }

    private List<ScoreFrameVO> framesFor(Long recordId) {
        return frameMapper.selectList(new LambdaQueryWrapper<ScoreFrame>()
                        .eq(ScoreFrame::getRecordId, recordId)
                        .orderByAsc(ScoreFrame::getFrameNumber))
                .stream().map(this::toFrameView).toList();
    }

    private ScoreFrameVO toFrameView(ScoreFrame frame) {
        return new ScoreFrameVO(frame.getFrameNumber(), frame.getPointsOne(), frame.getPointsTwo());
    }

    private ScoreRecordVO toView(ScoreRecord record, List<ScoreFrameVO> frames) {
        String key = record.getImageKey();
        String url = StringUtils.hasText(key) ? cosStsService.resolvePublicUrl(key, null) : null;
        return new ScoreRecordVO(record.getId(), record.getTitle(), record.getPlayerOne(),
                record.getPlayerTwo(), record.getScoreOne(), record.getScoreTwo(), record.getPlayedAt(),
                record.getVenue(), record.getNote(), key, url, record.getUpdatedAt(), frames);
    }
}
