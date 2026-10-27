package com.example.board.post;

import com.example.board.common.api.ApiResponse;
import com.example.board.common.api.PageResponse;
import com.example.board.post.PostService.PostView;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
@Validated
public class PostController {
  private final PostService service;

  public PostController(PostService service) {
    this.service = service;
  }

  @GetMapping
  ApiResponse<PageResponse<PostView>> list(
      @RequestParam(required = false, name = "q") @Size(max = 200) String q,
      @RequestParam(name = "sort", defaultValue = "latest") String sort,
      @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
      @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size) {
    return ApiResponse.of(service.list(q, sort, page, size));
  }

  @GetMapping("/{postId}")
  ApiResponse<PostView> detail(
      @PathVariable(name = "postId") UUID postId, HttpServletRequest request) {
    return ApiResponse.of(service.detail(postId, request));
  }

  @PostMapping
  ApiResponse<PostView> create(
      @AuthenticationPrincipal UUID userId, @Valid @RequestBody PostRequest request) {
    return ApiResponse.of(service.create(userId, request.title(), request.content()));
  }

  @PatchMapping("/{postId}")
  ApiResponse<PostView> update(
      @AuthenticationPrincipal UUID userId,
      @PathVariable(name = "postId") UUID postId,
      @Valid @RequestBody PostRequest request) {
    return ApiResponse.of(service.update(userId, postId, request.title(), request.content()));
  }

  @DeleteMapping("/{postId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(@AuthenticationPrincipal UUID userId, @PathVariable(name = "postId") UUID postId) {
    service.delete(userId, postId);
  }

  public record PostRequest(
      @NotBlank @Size(max = 200) String title, @NotBlank @Size(max = 10000) String content) {}
}
