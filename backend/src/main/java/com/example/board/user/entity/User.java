package com.example.board.user.entity;

import com.example.board.common.entity.BaseEntity;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {
  @Id private UUID id;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String passwordHash;

  @Column(nullable = false, unique = true, length = 50)
  private String nickname;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private Role role;

  private User(String email, String passwordHash, String nickname, Role role) {
    this.id = UUID.randomUUID();
    this.email = email;
    this.passwordHash = passwordHash;
    this.nickname = nickname;
    this.role = role;
  }

  public static User create(String email, String hash, String nickname) {
    return new User(email, hash, nickname, Role.USER);
  }

  public void updateProfile(String nickname) {
    this.nickname = nickname;
  }

  public void changeRole(Role role) {
    this.role = role;
  }
}
