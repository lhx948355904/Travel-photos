package com.photomap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ScoreGalleryEntryRequest {
    @NotBlank(message = "请输入影像标题")
    @Size(max = 100)
    private String title;

    @NotNull(message = "请选择比赛时间")
    private LocalDateTime playedAt;

    @Size(max = 300)
    private String note;

    @NotEmpty(message = "请至少上传一张图片")
    @Size(max = ScoreRecordRequest.MAX_IMAGES_PER_RECORD, message = "每次最多上传 20 张图片")
    private List<@NotBlank String> imageKeys;
}
