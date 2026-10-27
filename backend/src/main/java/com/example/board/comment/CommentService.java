package com.example.board.comment;

import com.example.board.comment.entity.Comment;
import com.example.board.comment.repository.CommentRepository;
import com.example.board.common.exception.ApiException;
import com.example.board.post.entity.Post;
import com.example.board.post.repository.PostRepository;
import com.example.board.user.entity.Role;
import com.example.board.user.entity.User;
import com.example.board.user.repository.UserRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 댓글 트리의 무결성과 작성자 또는 관리자 권한 검증을 트랜잭션 안에서 처리한다.
 *
 * <p>부모 댓글과 요청 URL의 게시글이 다르면 댓글 트리가 섞이지 않도록 생성 요청을 거부한다.
 */
@Service
public class CommentService {
  private final CommentRepository comments;
  private final PostRepository posts;
  private final UserRepository users;

  public CommentService(CommentRepository comments, PostRepository posts, UserRepository users) {
    this.comments = comments;
    this.posts = posts;
    this.users = users;
  }

  @Transactional(readOnly = true)
  public List<CommentView> list(UUID postId) {
    if (!posts.existsById(postId)) throw notFound("POST_NOT_FOUND", "Post not found");
    return tree(comments.findAllByPostId(postId));
  }

  @Transactional
  public CommentView create(UUID userId, UUID postId, UUID parentCommentId, String content) {
    Post post =
        posts.findById(postId).orElseThrow(() -> notFound("POST_NOT_FOUND", "Post not found"));
    Comment parent =
        parentCommentId == null
            ? null
            : comments
                .findById(parentCommentId)
                .orElseThrow(() -> notFound("COMMENT_NOT_FOUND", "Parent comment not found"));
    // 다른 게시물의 댓글을 부모로 연결해 트리를 변조하는 요청을 막는다.
    if (parent != null && !parent.getPost().getId().equals(postId))
      throw new ApiException(
          HttpStatus.CONFLICT, "PARENT_POST_MISMATCH", "Parent comment belongs to another post");
    User user = findUser(userId);
    return view(comments.save(Comment.create(post, user, parent, content)));
  }

  @Transactional
  public CommentView update(UUID userId, UUID commentId, String content) {
    Comment comment = find(commentId);
    ensurePermitted(userId, comment);
    comment.update(content);
    comments.flush();
    return view(comment);
  }

  @Transactional
  public void delete(UUID userId, UUID commentId) {
    Comment comment = find(commentId);
    ensurePermitted(userId, comment);
    if (comments.existsByParentId(commentId))
      throw new ApiException(
          HttpStatus.CONFLICT, "COMMENT_HAS_CHILDREN", "Delete child comments first");
    comments.delete(comment);
  }

  private Comment find(UUID id) {
    return comments
        .findWithAuthorById(id)
        .orElseThrow(() -> notFound("COMMENT_NOT_FOUND", "Comment not found"));
  }

  private User findUser(UUID id) {
    return users
        .findById(id)
        .orElseThrow(
            () -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "User not found"));
  }

  private void ensurePermitted(UUID userId, Comment comment) {
    // Controller가 아닌 서비스에서 강제해 직접 API 호출에도 소유권 정책을 적용한다.
    User actor = findUser(userId);
    if (!comment.getAuthor().getId().equals(userId) && actor.getRole() != Role.ADMIN)
      throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Comment ownership is required");
  }

  private ApiException notFound(String code, String message) {
    return new ApiException(HttpStatus.NOT_FOUND, code, message);
  }

  private List<CommentView> tree(List<Comment> source) {
    Map<UUID, CommentView> nodes = new LinkedHashMap<>();
    List<CommentView> roots = new ArrayList<>();
    for (Comment comment : source) nodes.put(comment.getId(), view(comment));
    for (Comment comment : source) {
      CommentView node = nodes.get(comment.getId());
      if (comment.getParent() == null) {
        roots.add(node);
      } else {
        CommentView parent = nodes.get(comment.getParent().getId());
        if (parent != null) parent.children().add(node);
      }
    }
    return roots;
  }

  static CommentView view(Comment comment) {
    return new CommentView(
        comment.getId(),
        comment.getAuthor().getId(),
        comment.getAuthor().getNickname(),
        comment.getContent(),
        comment.getLikeCount(),
        comment.getCreatedAt(),
        comment.getUpdatedAt(),
        new ArrayList<>());
  }

  public record CommentView(
      UUID id,
      UUID authorId,
      String authorNickname,
      String content,
      long likeCount,
      OffsetDateTime createdAt,
      OffsetDateTime updatedAt,
      List<CommentView> children) {}
}
