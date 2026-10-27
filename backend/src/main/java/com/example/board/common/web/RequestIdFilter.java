package com.example.board.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 모든 요청에 추적 ID를 부여하고 HTTP 응답, 요청 속성, MDC에 같은 값을 연결한다.
 *
 * <p>사용자는 오류 번호로 지원 요청을 할 수 있고, 운영자는 해당 번호로 로그를 찾을 수 있다. 내부 예외 내용은 응답에 포함하지 않는다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {
  public static final String ATTRIBUTE = RequestIdFilter.class.getName() + ".requestId";
  public static final String HEADER = "X-Request-ID";

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String requestId = UUID.randomUUID().toString();
    // 필터 체인 안의 예외 처리와 애플리케이션 로그가 같은 요청을 가리키도록 한다.
    request.setAttribute(ATTRIBUTE, requestId);
    response.setHeader(HEADER, requestId);
    MDC.put("requestId", requestId);
    try {
      filterChain.doFilter(request, response);
    } finally {
      MDC.remove("requestId");
    }
  }

  public static String requestId(HttpServletRequest request) {
    Object value = request.getAttribute(ATTRIBUTE);
    return value instanceof String requestId ? requestId : "unavailable";
  }
}
