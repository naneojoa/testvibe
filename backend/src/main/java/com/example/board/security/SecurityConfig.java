package com.example.board.security;

import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

/**
 * 쿠키 기반 JWT API의 공통 보안 경계를 정의한다.
 *
 * <p>브라우저가 인증 쿠키를 자동 전송하므로 세션을 만들지 않더라도 상태 변경 요청에는 CSRF 검증이 필요하다. 실제 권한 판단은 이 URL 규칙과 서비스 계층의 소유자
 * 검증이 함께 수행한다.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  SecurityFilterChain filterChain(
      HttpSecurity http, JwtAuthenticationFilter jwt, SecurityErrorHandler errors)
      throws Exception {
    // JavaScript가 읽어 요청 헤더로 되돌려 보낼 수 있어야 하므로 CSRF 쿠키만 HttpOnly가 아니다.
    CookieCsrfTokenRepository csrfRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
    csrfRepository.setCookiePath("/");
    return http.csrf(
            csrf ->
                csrf.csrfTokenRepository(csrfRepository)
                    .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler()))
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a ->
                // 인증 API와 공개 게시물 조회만 익명 접근을 허용한다.
                a.requestMatchers("/api/auth/**", "/v3/api-docs/**", "/swagger-ui/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/posts/**")
                    .permitAll()
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(e -> e.authenticationEntryPoint(errors).accessDeniedHandler(errors))
        // SecurityContext를 만들기 전에 쿠키의 access token을 검증한다.
        .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
        .build();
  }
}
