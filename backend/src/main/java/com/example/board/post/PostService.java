package com.example.board.post;

import com.example.board.common.api.PageResponse;
import com.example.board.common.exception.ApiException;
import com.example.board.post.entity.Post;
import com.example.board.post.repository.PostRepository;
import com.example.board.user.entity.Role;
import com.example.board.user.entity.User;
import com.example.board.user.repository.UserRepository;
import com.example.board.view.PostViewService;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 게시글의 트랜잭션 경계와 작성자 또는 관리자 권한 검증을 소유한다.
 *
 * <p>Controller의 화면 제어는 보안 경계가 아니므로, 수정과 삭제 직전에 서비스에서 다시 권한을 확인한다.
 */
@Service
public class PostService {
  private final PostRepository posts;
  private final UserRepository users;
  private final PostViewService views;
  private final EntityManager entityManager;

  public PostService(
      PostRepository posts,
      UserRepository users,
      PostViewService views,
      EntityManager entityManager) {
    this.posts = posts;
    this.users = users;
    this.views = views;
    this.entityManager = entityManager;
  }

  @Transactional(readOnly = true)
  public PageResponse<PostView> list(String query, String sort, int page, int size) {
    if (!"latest".equals(sort) && !"views".equals(sort) && !"likes".equals(sort))
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Unsupported post sort");
    return PageResponse.of(
        posts.search(query, sort, PageRequest.of(page, size)).map(PostService::view));
  }

  @Transactional
  public PostView detail(UUID postId, HttpServletRequest request) {
    Post post = find(postId);
    views.record(postId, request);
    entityManager.refresh(post);
    return view(post);
  }

  @Transactional
  public PostView create(UUID userId, String title, String content) {
    User user = findUser(userId);
    return view(posts.save(Post.create(user, title, content)));
  }

  @Transactional
  public PostView update(UUID userId, UUID postId, String title, String content) {
    Post post = find(postId);
    ensurePermitted(userId, post);
    post.update(title, content);
    posts.flush();
    return view(post);
  }

  @Transactional
  public void delete(UUID userId, UUID postId) {
    Post post = find(postId);
    ensurePermitted(userId, post);
    posts.delete(post);
  }

  private Post find(UUID id) {
    return posts
        .findWithAuthorById(id)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "POST_NOT_FOUND", "Post not found"));
  }

  private User findUser(UUID id) {
    return users
        .findById(id)
        .orElseThrow(
            () -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "User not found"));
  }

  private void ensurePermitted(UUID userId, Post post) {
    // 현재 DB 역할을 기준으로 하므로 UI를 우회한 요청도 같은 정책을 적용받는다.
    User actor = findUser(userId);
    if (!post.getAuthor().getId().equals(userId) && actor.getRole() != Role.ADMIN)
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Post ownership is required");
  }

  static PostView view(Post post) {
    return new PostView(
        post.getId(),
        post.getTitle(),
        post.getContent(),
        post.getAuthor().getId(),
        post.getAuthor().getNickname(),
        post.getViewCount(),
        post.getLikeCount(),
        post.getCreatedAt(),
        post.getUpdatedAt());
  }

  public record PostView(
      UUID id,
      String title,
      String content,
      UUID authorId,
      String authorNickname,
      long viewCount,
      long likeCount,
      OffsetDateTime createdAt,
      OffsetDateTime updatedAt) {}
}
