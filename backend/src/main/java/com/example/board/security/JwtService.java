package com.example.board.security;

import com.example.board.user.entity.Role;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.*;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;
  private final long accessSeconds;
  private final long refreshSeconds;

  public JwtService(
      @Value("${app.security.jwt-secret}") String secret,
      @Value("${app.security.access-token-seconds}") long accessSeconds,
      @Value("${app.security.refresh-token-seconds}") long refreshSeconds) {
    this.key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
    this.accessSeconds = accessSeconds;
    this.refreshSeconds = refreshSeconds;
  }

  public String accessToken(UUID userId, Role role) {
    return create(userId, role, accessSeconds, "access");
  }

  public String refreshToken(UUID userId, Role role) {
    return create(userId, role, refreshSeconds, "refresh");
  }

  public long accessTokenSeconds() {
    return accessSeconds;
  }

  public long refreshTokenSeconds() {
    return refreshSeconds;
  }

  private String create(UUID id, Role role, long seconds, String type) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(id.toString())
        .claim("role", role.name())
        .claim("type", type)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusSeconds(seconds)))
        .signWith(key)
        .compact();
  }

  public Claims claims(String token, String expectedType) {
    Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    if (!expectedType.equals(claims.get("type", String.class)))
      throw new JwtException("Invalid token type");
    return claims;
  }
}
