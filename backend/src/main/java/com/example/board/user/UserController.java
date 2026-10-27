package com.example.board.user;

import com.example.board.common.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
  private final UserService service;

  public UserController(UserService service) {
    this.service = service;
  }

  @GetMapping("/me")
  ApiResponse<UserView> me(@AuthenticationPrincipal UUID id) {
    return ApiResponse.of(service.me(id));
  }

  @PatchMapping("/me")
  ApiResponse<UserView> update(
      @AuthenticationPrincipal UUID id, @Valid @RequestBody UpdateProfileRequest request) {
    return ApiResponse.of(service.update(id, request.nickname()));
  }

  public record UpdateProfileRequest(@NotBlank @Size(min = 2, max = 50) String nickname) {}
}
