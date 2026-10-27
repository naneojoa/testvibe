package com.example.board.post.repository;

import com.example.board.post.entity.Post;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PostRepository extends JpaRepository<Post, UUID>, PostQueryRepository {
  @EntityGraph(attributePaths = "author")
  @Query("select p from Post p where p.id = :id")
  Optional<Post> findWithAuthorById(UUID id);
}
