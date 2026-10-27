package com.example.board.comment.entity;

import com.example.board.common.entity.BaseEntity;
import com.example.board.post.entity.Post;
import com.example.board.user.entity.User;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "comments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Comment extends BaseEntity {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "post_id", nullable = false)
  private Post post;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "author_id", nullable = false)
  private User author;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "parent_comment_id")
  private Comment parent;

  @Column(nullable = false, columnDefinition = "text")
  private String content;

  @Column(nullable = false)
  private long likeCount;

  private Comment(Post post, User author, Comment parent, String content) {
    id = UUID.randomUUID();
    this.post = post;
    this.author = author;
    this.parent = parent;
    this.content = content;
  }

  public static Comment create(Post post, User author, Comment parent, String content) {
    return new Comment(post, author, parent, content);
  }

  public void update(String content) {
    this.content = content;
  }
}
