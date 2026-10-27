package com.example.board.post.repository;

import com.example.board.post.entity.Post;
import org.springframework.data.domain.*;

public interface PostQueryRepository {
  Page<Post> search(String query, String sort, Pageable pageable);
}
