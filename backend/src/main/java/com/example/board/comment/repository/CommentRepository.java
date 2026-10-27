package com.example.board.comment.repository;

import com.example.board.comment.entity.Comment;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface CommentRepository extends JpaRepository<Comment, UUID> {
  @Query(
      "select c from Comment c join fetch c.author left join fetch c.parent where c.post.id = :postId order by c.createdAt asc, c.id asc")
  List<Comment> findAllByPostId(UUID postId);

  @EntityGraph(attributePaths = "author")
  @Query("select c from Comment c where c.id = :id")
  Optional<Comment> findWithAuthorById(UUID id);

  boolean existsByParentId(UUID parentId);
}
