package com.example.board.user;

import com.example.board.user.entity.User;
import java.util.UUID;

public record UserView(UUID id, String email, String nickname, String role) {
  public static UserView from(User user) {
    return new UserView(user.getId(), user.getEmail(), user.getNickname(), user.getRole().name());
  }
}
