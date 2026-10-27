package com.example.board.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.board.comment.CommentService;
import com.example.board.comment.entity.Comment;
import com.example.board.comment.repository.CommentRepository;
import com.example.board.post.PostService;
import com.example.board.post.entity.Post;
import com.example.board.post.repository.PostRepository;
import com.example.board.user.UserService;
import com.example.board.user.entity.User;
import com.example.board.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ServiceTransactionTests {
  @Autowired private PostService postService;
  @Autowired private CommentService commentService;
  @Autowired private UserService userService;
  @Autowired private PostRepository posts;
  @Autowired private CommentRepository comments;
  @Autowired private UserRepository users;

  @AfterEach
  void cleanUp() {
    comments.deleteAll();
    posts.deleteAll();
    users.deleteAll();
  }

  @Test
  void postUpdatePersistsOutsideControllerTransaction() {
    User user = users.save(User.create("post@example.com", "hash", "post-user"));
    Post post = posts.save(Post.create(user, "before", "before content"));

    postService.update(user.getId(), post.getId(), "after", "after content");

    Post reloaded = posts.findById(post.getId()).orElseThrow();
    assertThat(reloaded.getTitle()).isEqualTo("after");
    assertThat(reloaded.getContent()).isEqualTo("after content");
  }

  @Test
  void commentAndProfileUpdatesPersist() {
    User user = users.save(User.create("comment@example.com", "hash", "comment-user"));
    Post post = posts.save(Post.create(user, "title", "content"));
    Comment comment = comments.save(Comment.create(post, user, null, "before"));

    commentService.update(user.getId(), comment.getId(), "after");
    userService.update(user.getId(), "updated-user");

    assertThat(comments.findById(comment.getId()).orElseThrow().getContent()).isEqualTo("after");
    assertThat(users.findById(user.getId()).orElseThrow().getNickname()).isEqualTo("updated-user");
  }
}
