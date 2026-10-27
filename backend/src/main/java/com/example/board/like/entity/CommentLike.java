package com.example.board.like.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "comment_likes")
public class CommentLike {
  @EmbeddedId private CommentLikeId id;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  protected CommentLike() {}

  public CommentLike(CommentLikeId id) {
    this.id = id;
    this.createdAt = OffsetDateTime.now();
  }
}
