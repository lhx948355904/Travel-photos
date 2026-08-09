package com.photomap.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class PhotoIndexRebuildRequest {
    @Pattern(regexp = "missing|all", message = "scope 只能是 missing 或 all")
    private String scope = "missing";
}
