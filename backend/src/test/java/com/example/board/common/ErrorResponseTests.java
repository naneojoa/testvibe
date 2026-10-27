package com.example.board.common;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ErrorResponseTests {
  @Autowired private MockMvc mockMvc;

  @Test
  void malformedUuidUsesStructuredValidationResponse() throws Exception {
    mockMvc
        .perform(get("/api/posts/not-a-uuid"))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith("application/json"))
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.requestId").isNotEmpty())
        .andExpect(jsonPath("$.path").value("/api/posts/not-a-uuid"))
        .andExpect(header().exists("X-Request-ID"));
  }

  @Test
  void unauthenticatedRequestUsesSameJsonErrorContract() throws Exception {
    mockMvc
        .perform(get("/api/users/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith("application/json"))
        .andExpect(jsonPath("$.code").value("INVALID_TOKEN"))
        .andExpect(jsonPath("$.requestId").isNotEmpty());
  }

  @Test
  void unsafeRequestRequiresCsrfToken() throws Exception {
    mockMvc
        .perform(post("/api/auth/logout"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void csrfEndpointProvidesHeaderAndToken() throws Exception {
    mockMvc
        .perform(get("/api/auth/csrf"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.token").isNotEmpty())
        .andExpect(jsonPath("$.data.headerName").value("X-XSRF-TOKEN"));
  }

  @Test
  void adminPaginationRejectsNegativePage() throws Exception {
    var authentication =
        new UsernamePasswordAuthenticationToken(
            UUID.randomUUID(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    mockMvc
        .perform(get("/api/admin/users?page=-1&size=20").with(authentication(authentication)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.fieldErrors.page").isNotEmpty());
  }
}
