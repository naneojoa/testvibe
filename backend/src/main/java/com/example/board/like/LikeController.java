package com.example.board.like;

import com.example.board.common.api.ApiResponse;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class LikeController {
  private final LikeService service;

  public LikeController(LikeService service) {
    this.service = service;
  }

  @PutMapping("/api/posts/{postId}/like")
  ApiResponse<Void> likePost(
      @AuthenticationPrincipal UUID userId, @PathVariable(name = "postId") UUID postId) {
    service.likePost(userId, postId);
    return ApiResponse.of(null);
  }

  @DeleteMapping("/api/posts/{postId}/like")
  ApiResponse<Void> unlikePost(
      @AuthenticationPrincipal UUID userId, @PathVariable(name = "postId") UUID postId) {
    service.unlikePost(userId, postId);
    return ApiResponse.of(null);
  }

  @PutMapping("/api/comments/{commentId}/like")
  ApiResponse<Void> likeComment(
      @AuthenticationPrincipal UUID userId, @PathVariable(name = "commentId") UUID commentId) {
    service.likeComment(userId, commentId);
    return ApiResponse.of(null);
  }

  @DeleteMapping("/api/comments/{commentId}/like")
  ApiResponse<Void> unlikeComment(
      @AuthenticationPrincipal UUID userId, @PathVariable(name = "commentId") UUID commentId) {
    service.unlikeComment(userId, commentId);
    return ApiResponse.of(null);
  }
}
