package com.example.board.config;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.*;

@Configuration
public class QuerydslConfig {
  @Bean
  JPAQueryFactory queryFactory(EntityManager entityManager) {
    return new JPAQueryFactory(entityManager);
  }
}
