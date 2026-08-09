package com.photomap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogPageVO<T> {
    private List<T> items;
    private Long page;
    private Long pageSize;
    private Long total;
    private Long totalPages;
}
