package com.example.board.user;

import com.example.board.common.exception.ApiException;
import com.example.board.user.entity.User;
import com.example.board.user.repository.UserRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
  private final UserRepository users;

  public UserService(UserRepository users) {
    this.users = users;
  }

  @Transactional(readOnly = true)
  public UserView me(UUID userId) {
    return UserView.from(findAuthenticated(userId));
  }

  @Transactional
  public UserView update(UUID userId, String nickname) {
    User user = findAuthenticated(userId);
    users
        .findByNickname(nickname)
        .filter(existing -> !existing.getId().equals(userId))
        .ifPresent(
            existing -> {
              throw new ApiException(
                  HttpStatus.CONFLICT, "NICKNAME_EXISTS", "Nickname already exists");
            });
    user.updateProfile(nickname);
    return UserView.from(user);
  }

  private User findAuthenticated(UUID userId) {
    return users
        .findById(userId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "User not found"));
  }
}
