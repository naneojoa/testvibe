package com.example.board.post.entity;

import com.example.board.common.entity.BaseEntity;
import com.example.board.user.entity.User;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseEntity {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "author_id", nullable = false)
  private User author;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(nullable = false, columnDefinition = "text")
  private String content;

  @Column(nullable = false)
  private long viewCount;

  @Column(nullable = false)
  private long likeCount;

  private Post(User author, String title, String content) {
    id = UUID.randomUUID();
    this.author = author;
    this.title = title;
    this.content = content;
  }

  public static Post create(User author, String title, String content) {
    return new Post(author, title, content);
  }

  public void update(String title, String content) {
    this.title = title;
    this.content = content;
  }
}
