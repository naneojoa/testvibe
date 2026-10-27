package com.example.board.comment;

import com.example.board.comment.CommentService.CommentView;
import com.example.board.common.api.ApiResponse;
import com.example.board.common.exception.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class CommentController {
  private final CommentService service;

  public CommentController(CommentService service) {
    this.service = service;
  }

  @GetMapping("/api/posts/{postId}/comments")
  ApiResponse<List<CommentView>> list(@PathVariable(name = "postId") UUID postId) {
    return ApiResponse.of(service.list(postId));
  }

  @PostMapping("/api/posts/{postId}/comments")
  ApiResponse<CommentView> create(
      @AuthenticationPrincipal UUID userId,
      @PathVariable(name = "postId") UUID postId,
      @Valid @RequestBody CommentRequest request) {
    return ApiResponse.of(
        service.create(userId, postId, request.parentCommentId(), request.content()));
  }

  @PatchMapping("/api/comments/{commentId}")
  ApiResponse<CommentView> update(
      @AuthenticationPrincipal UUID userId,
      @PathVariable(name = "commentId") UUID commentId,
      @Valid @RequestBody CommentRequest request) {
    if (request.parentCommentId() != null)
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "PARENT_IMMUTABLE", "Parent comment cannot be changed");
    return ApiResponse.of(service.update(userId, commentId, request.content()));
  }

  @DeleteMapping("/api/comments/{commentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(
      @AuthenticationPrincipal UUID userId, @PathVariable(name = "commentId") UUID commentId) {
    service.delete(userId, commentId);
  }

  public record CommentRequest(@NotBlank @Size(max = 10000) String content, UUID parentCommentId) {}
}
