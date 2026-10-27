package com.example.board.common.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
@MappedSuperclass
public abstract class BaseEntity {
  @Column(nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  @PrePersist
  void prePersist() {
    createdAt = updatedAt = OffsetDateTime.now();
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = OffsetDateTime.now();
  }
}
