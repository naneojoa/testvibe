package com.example.board.common.api;

import java.util.List;
import org.springframework.data.domain.Page;

public record PageResponse<T>(List<T> items, PageMeta page) {
  public static <T> PageResponse<T> of(Page<T> source) {
    return new PageResponse<>(
        source.getContent(),
        new PageMeta(
            source.getNumber(),
            source.getSize(),
            source.getTotalElements(),
            source.getTotalPages()));
  }

  public record PageMeta(int number, int size, long totalElements, int totalPages) {}
}
