package com.example.board.admin;

import com.example.board.common.api.*;
import com.example.board.user.UserView;
import com.example.board.user.entity.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@Validated
public class AdminController {
  private final AdminUserService service;

  public AdminController(AdminUserService service) {
    this.service = service;
  }

  @GetMapping
  ApiResponse<PageResponse<UserView>> list(
      @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
      @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size) {
    return ApiResponse.of(service.list(page, size));
  }

  @PatchMapping("/{userId}/role")
  ApiResponse<UserView> role(
      @AuthenticationPrincipal UUID adminId,
      @PathVariable(name = "userId") UUID userId,
      @Valid @RequestBody RoleRequest request) {
    return ApiResponse.of(service.changeRole(adminId, userId, request.role()));
  }

  @DeleteMapping("/{userId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(@AuthenticationPrincipal UUID adminId, @PathVariable(name = "userId") UUID userId) {
    service.delete(adminId, userId);
  }

  public record RoleRequest(@NotNull Role role) {}
}
