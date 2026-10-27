package com.example.board.view;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 게시물 조회 수 증가의 식별자 생성과 DB 함수를 통한 원자적 기록을 담당한다.
 *
 * <p>비회원의 원본 IP는 저장하지 않는다. 서버 비밀키로 만든 HMAC만 전달해 같은 방문자를 24시간 동안 판별하면서도 DB 유출만으로 원본 IP를 복원하기 어렵게 한다.
 */
@Service
public class PostViewService {
  private final EntityManager entityManager;
  private final String secret;

  public PostViewService(
      EntityManager entityManager, @Value("${app.security.ip-hmac-secret}") String secret) {
    this.entityManager = entityManager;
    this.secret = secret;
  }

  @Transactional
  public void record(UUID postId, HttpServletRequest request) {
    Object principal =
        SecurityContextHolder.getContext().getAuthentication() == null
            ? null
            : SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    UUID userId = principal instanceof UUID id ? id : null;
    // 회원은 계정 UUID, 비회원은 원본 IP가 아닌 일방향 HMAC을 식별자로 사용한다.
    String viewerKey = userId == null ? hmac(request.getRemoteAddr()) : null;
    // 동시 조회의 중복 증가 방지는 PostgreSQL 함수의 트랜잭션 잠금에서 처리한다.
    entityManager
        .createNativeQuery("select record_post_view(:postId, :userId, :viewerKey)")
        .setParameter("postId", postId)
        .setParameter("userId", userId)
        .setParameter("viewerKey", viewerKey)
        .getSingleResult();
  }

  private String hmac(String ip) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(ip.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException("Cannot hash viewer identity", e);
    }
  }
}
