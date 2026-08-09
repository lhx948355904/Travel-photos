package com.photomap.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PhotoIndexCoverageVO {
    private long ready;
    private long total;
}
