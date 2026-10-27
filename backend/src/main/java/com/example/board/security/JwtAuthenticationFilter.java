package com.example.board.security;

import com.example.board.user.entity.Role;
import com.example.board.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * ACCESS_TOKEN 쿠키를 Spring Security의 인증 정보로 변환한다.
 *
 * <p>JWT에 든 역할 claim은 권한 부여에 사용하지 않는다. 매 요청 DB의 현재 역할을 다시 읽어 관리자 강등 또는 사용자 삭제 뒤에도 기존 access token이
 * 권한을 유지하지 못하게 한다.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
  private final JwtService jwtService;
  private final UserRepository users;

  public JwtAuthenticationFilter(JwtService jwtService, UserRepository users) {
    this.jwtService = jwtService;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String token =
        Arrays.stream(Optional.ofNullable(request.getCookies()).orElse(new Cookie[0]))
            .filter(c -> "ACCESS_TOKEN".equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    if (token != null)
      try {
        Claims claims = jwtService.claims(token, "access");
        UUID id = UUID.fromString(claims.getSubject());
        // 토큰 발급 시점의 claim 대신 현재 DB 상태를 권한의 기준으로 삼는다.
        Role role =
            users
                .findById(id)
                .orElseThrow(() -> new IllegalStateException("Authenticated user no longer exists"))
                .getRole();
        var authentication =
            new UsernamePasswordAuthenticationToken(
                id, null, List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
        SecurityContextHolder.getContext().setAuthentication(authentication);
      } catch (RuntimeException exception) {
        log.debug("Access token rejected: reason={}", exception.getClass().getSimpleName());
        SecurityContextHolder.clearContext();
      }
    chain.doFilter(request, response);
  }
}
