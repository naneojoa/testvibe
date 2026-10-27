package com.example.board.user.repository;

import com.example.board.user.entity.User;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmail(String email);

  Optional<User> findByNickname(String nickname);

  boolean existsByEmail(String email);

  boolean existsByNickname(String nickname);
}
