package com.example.board.post;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class PostControllerRequestBindingTests {
  @Autowired private MockMvc mockMvc;

  @Test
  void listUsesDefaultRequestParametersWithoutCompilerParameterMetadata() throws Exception {
    mockMvc
        .perform(get("/api/posts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isArray())
        .andExpect(jsonPath("$.data.page.number").value(0))
        .andExpect(jsonPath("$.data.page.size").value(20));
  }
}
