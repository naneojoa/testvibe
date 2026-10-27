package com.example.board.admin;

import com.example.board.common.api.PageResponse;
import com.example.board.common.exception.ApiException;
import com.example.board.user.UserView;
import com.example.board.user.entity.Role;
import com.example.board.user.entity.User;
import com.example.board.user.repository.UserRepository;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {
  private final UserRepository users;

  public AdminUserService(UserRepository users) {
    this.users = users;
  }

  @Transactional(readOnly = true)
  public PageResponse<UserView> list(int page, int size) {
    return PageResponse.of(
        users
            .findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))
            .map(UserView::from));
  }

  @Transactional
  public UserView changeRole(UUID adminId, UUID userId, Role role) {
    ensureNotSelf(adminId, userId, "SELF_ROLE_CHANGE");
    User user = find(userId);
    user.changeRole(role);
    return UserView.from(user);
  }

  @Transactional
  public void delete(UUID adminId, UUID userId) {
    ensureNotSelf(adminId, userId, "SELF_DELETE");
    users.delete(find(userId));
  }

  private User find(UUID userId) {
    return users
        .findById(userId)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
  }

  private void ensureNotSelf(UUID adminId, UUID userId, String code) {
    if (adminId.equals(userId)) {
      String message =
          "SELF_ROLE_CHANGE".equals(code)
              ? "Administrators cannot change their own role"
              : "Administrators cannot delete themselves";
      throw new ApiException(HttpStatus.CONFLICT, code, message);
    }
  }
}
