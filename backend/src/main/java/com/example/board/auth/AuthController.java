package com.example.board.auth;

import com.example.board.common.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService service;

  public AuthController(AuthService service) {
    this.service = service;
  }

  @PostMapping("/sign-up")
  ResponseEntity<ApiResponse<Map<String, String>>> signUp(
      @Valid @RequestBody SignUpRequest request) {
    return ResponseEntity.ok(ApiResponse.of(service.signUp(request)));
  }

  @PostMapping("/login")
  ResponseEntity<ApiResponse<Map<String, String>>> login(@Valid @RequestBody LoginRequest request) {
    return service.login(request);
  }

  @PostMapping("/refresh")
  ResponseEntity<ApiResponse<Map<String, String>>> refresh(
      @CookieValue(name = "REFRESH_TOKEN", required = false) String refresh) {
    return service.refresh(refresh);
  }

  @PostMapping("/logout")
  ResponseEntity<ApiResponse<Void>> logout() {
    return service.logout();
  }

  @GetMapping("/csrf")
  ApiResponse<CsrfResponse> csrf(CsrfToken token) {
    return ApiResponse.of(new CsrfResponse(token.getToken(), token.getHeaderName()));
  }

  public record SignUpRequest(
      @Email @NotBlank String email,
      @NotBlank @Size(min = 8, max = 72) String password,
      @NotBlank @Size(min = 2, max = 50) String nickname) {}

  public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

  public record CsrfResponse(String token, String headerName) {}
}
