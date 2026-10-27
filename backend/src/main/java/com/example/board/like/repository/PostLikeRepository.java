package com.example.board.like.repository;

import com.example.board.like.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostLikeRepository extends JpaRepository<PostLike, PostLikeId> {}
