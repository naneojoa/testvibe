package com.example.board.like.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "post_likes")
public class PostLike {
  @EmbeddedId private PostLikeId id;

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  protected PostLike() {}

  public PostLike(PostLikeId id) {
    this.id = id;
    this.createdAt = OffsetDateTime.now();
  }
}
