package com.photomap.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PhotoIndexStatusVO {
    private long total;
    private long ready;
    private long pending;
    private long processing;
    private long failed;
    private String lastIndexedAt;
    private boolean aiEnabled;
    private boolean providerReady;
}
