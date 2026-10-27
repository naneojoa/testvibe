package com.example.board.common.api;

import com.example.board.common.web.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.Map;

public record ErrorResponse(
    String code,
    String message,
    Map<String, String> fieldErrors,
    String requestId,
    OffsetDateTime timestamp,
    String path) {

  public static ErrorResponse of(
      HttpServletRequest request, String code, String message, Map<String, String> fieldErrors) {
    return new ErrorResponse(
        code,
        message,
        Map.copyOf(fieldErrors),
        RequestIdFilter.requestId(request),
        OffsetDateTime.now(),
        request.getRequestURI());
  }
}
