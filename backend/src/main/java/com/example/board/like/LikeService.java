package com.example.board.like;

import com.example.board.comment.repository.CommentRepository;
import com.example.board.common.exception.ApiException;
import com.example.board.like.entity.CommentLike;
import com.example.board.like.entity.CommentLikeId;
import com.example.board.like.entity.PostLike;
import com.example.board.like.entity.PostLikeId;
import com.example.board.like.repository.CommentLikeRepository;
import com.example.board.like.repository.PostLikeRepository;
import com.example.board.post.repository.PostRepository;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LikeService {
  private final PostRepository posts;
  private final CommentRepository comments;
  private final PostLikeRepository postLikes;
  private final CommentLikeRepository commentLikes;

  public LikeService(
      PostRepository posts,
      CommentRepository comments,
      PostLikeRepository postLikes,
      CommentLikeRepository commentLikes) {
    this.posts = posts;
    this.comments = comments;
    this.postLikes = postLikes;
    this.commentLikes = commentLikes;
  }

  @Transactional
  public void likePost(UUID userId, UUID postId) {
    if (!posts.existsById(postId)) throw missing("POST_NOT_FOUND");
    PostLikeId id = new PostLikeId(postId, userId);
    if (postLikes.existsById(id)) throw alreadyLiked("Post");
    try {
      postLikes.saveAndFlush(new PostLike(id));
    } catch (DataIntegrityViolationException exception) {
      throw alreadyLiked("Post");
    }
  }

  @Transactional
  public void unlikePost(UUID userId, UUID postId) {
    PostLikeId id = new PostLikeId(postId, userId);
    if (!postLikes.existsById(id)) throw missing("LIKE_NOT_FOUND");
    postLikes.deleteById(id);
  }

  @Transactional
  public void likeComment(UUID userId, UUID commentId) {
    if (!comments.existsById(commentId)) throw missing("COMMENT_NOT_FOUND");
    CommentLikeId id = new CommentLikeId(commentId, userId);
    if (commentLikes.existsById(id)) throw alreadyLiked("Comment");
    try {
      commentLikes.saveAndFlush(new CommentLike(id));
    } catch (DataIntegrityViolationException exception) {
      throw alreadyLiked("Comment");
    }
  }

  @Transactional
  public void unlikeComment(UUID userId, UUID commentId) {
    CommentLikeId id = new CommentLikeId(commentId, userId);
    if (!commentLikes.existsById(id)) throw missing("LIKE_NOT_FOUND");
    commentLikes.deleteById(id);
  }

  private ApiException alreadyLiked(String target) {
    return new ApiException(HttpStatus.CONFLICT, "ALREADY_LIKED", target + " is already liked");
  }

  private ApiException missing(String code) {
    return new ApiException(HttpStatus.NOT_FOUND, code, "Resource not found");
  }
}
