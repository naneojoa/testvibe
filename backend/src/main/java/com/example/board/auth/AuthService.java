package com.example.board.auth;

import static com.example.board.auth.AuthController.*;

import com.example.board.common.api.ApiResponse;
import com.example.board.common.exception.ApiException;
import com.example.board.security.JwtService;
import com.example.board.user.entity.User;
import com.example.board.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.transaction.Transactional;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * 계정 생성, 자격 증명 검증 및 HttpOnly JWT 쿠키 발급을 담당한다.
 *
 * <p>토큰 원문은 응답 본문에 넣지 않아 브라우저 JavaScript와 로그 노출 경로를 줄인다. 현재 로그아웃은 이 브라우저의 쿠키만 만료시키며, 서버 측 refresh
 * token 폐기 정책은 별도 구현이 필요하다.
 */
@Service
@Transactional
public class AuthService {
  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;
  private final boolean cookieSecure;

  public AuthService(
      UserRepository users,
      PasswordEncoder encoder,
      JwtService jwt,
      @Value("${app.security.cookie-secure}") boolean cookieSecure) {
    this.users = users;
    this.encoder = encoder;
    this.jwt = jwt;
    this.cookieSecure = cookieSecure;
  }

  public Map<String, String> signUp(SignUpRequest r) {
    if (users.existsByEmail(r.email()))
      throw new ApiException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "Email already exists");
    if (users.existsByNickname(r.nickname()))
      throw new ApiException(HttpStatus.CONFLICT, "NICKNAME_EXISTS", "Nickname already exists");
    User user = users.save(User.create(r.email(), encoder.encode(r.password()), r.nickname()));
    return Map.of("id", user.getId().toString());
  }

  public ResponseEntity<ApiResponse<Map<String, String>>> login(LoginRequest r) {
    User user =
        users
            .findByEmail(r.email())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "INVALID_CREDENTIALS",
                        "Invalid email or password"));
    if (!encoder.matches(r.password(), user.getPasswordHash()))
      throw new ApiException(
          HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password");
    return tokens(user);
  }

  public ResponseEntity<ApiResponse<Map<String, String>>> refresh(String refresh) {
    if (refresh == null)
      throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Refresh token is required");
    Claims claims;
    try {
      claims = jwt.claims(refresh, "refresh");
    } catch (JwtException | IllegalArgumentException exception) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Refresh token is invalid");
    }
    User user =
        users
            .findById(UUID.fromString(claims.getSubject()))
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "User no longer exists"));
    return tokens(user);
  }

  public ResponseEntity<ApiResponse<Void>> logout() {
    // 같은 Path로 만료 쿠키를 내려야 기존 인증 쿠키를 정확히 대체할 수 있다.
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, cookie("ACCESS_TOKEN", "", 0))
        .header(HttpHeaders.SET_COOKIE, cookie("REFRESH_TOKEN", "", 0))
        .body(ApiResponse.of(null));
  }

  private ResponseEntity<ApiResponse<Map<String, String>>> tokens(User u) {
    return ResponseEntity.ok()
        .header(
            HttpHeaders.SET_COOKIE,
            cookie(
                "ACCESS_TOKEN", jwt.accessToken(u.getId(), u.getRole()), jwt.accessTokenSeconds()))
        .header(
            HttpHeaders.SET_COOKIE,
            cookie(
                "REFRESH_TOKEN",
                jwt.refreshToken(u.getId(), u.getRole()),
                jwt.refreshTokenSeconds()))
        .body(ApiResponse.of(Map.of("id", u.getId().toString())));
  }

  private String cookie(String name, String value, long maxAge) {
    // local 프로필 외에는 HTTPS 전송으로 제한하고, JavaScript에는 토큰 값을 노출하지 않는다.
    return ResponseCookie.from(name, value)
        .httpOnly(true)
        .secure(cookieSecure)
        .sameSite("Strict")
        .path("/")
        .maxAge(maxAge)
        .build()
        .toString();
  }
}
