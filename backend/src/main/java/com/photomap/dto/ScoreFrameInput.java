package com.photomap.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ScoreFrameInput {
    @NotNull(message = "请输入选手一的单局得分")
    @Min(value = 0, message = "单局得分不能小于 0")
    @Max(value = 200, message = "单局得分不能超过 200")
    private Integer pointsOne;

    @NotNull(message = "请输入选手二的单局得分")
    @Min(value = 0, message = "单局得分不能小于 0")
    @Max(value = 200, message = "单局得分不能超过 200")
    private Integer pointsTwo;
}
