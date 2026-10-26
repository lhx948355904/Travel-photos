package com.photomap.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class ScoreRecordRequest {
    @NotBlank(message = "请输入比赛名称")
    @Size(max = 100)
    private String title;
    @NotBlank(message = "请输入选手一")
    @Size(max = 60)
    private String playerOne;
    @NotBlank(message = "请输入选手二")
    @Size(max = 60)
    private String playerTwo;
    @NotNull @Min(0) @Max(99)
    private Integer scoreOne;
    @NotNull @Min(0) @Max(99)
    private Integer scoreTwo;
    @NotNull(message = "请选择比赛时间")
    private LocalDateTime playedAt;
    @Size(max = 100)
    private String venue;
    @Size(max = 300)
    private String note;
    private String imageKey;

    @Size(max = 35, message = "最多记录 35 局")
    private List<@Valid ScoreFrameInput> frames = new ArrayList<>();
}
