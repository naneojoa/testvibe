package com.example.board.post.repository;

import com.example.board.post.entity.*;
import com.example.board.user.entity.QUser;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.*;
import org.springframework.data.domain.*;

public class PostQueryRepositoryImpl implements PostQueryRepository {
  private final JPAQueryFactory queryFactory;

  public PostQueryRepositoryImpl(JPAQueryFactory queryFactory) {
    this.queryFactory = queryFactory;
  }

  public Page<Post> search(String query, String sort, Pageable pageable) {
    QPost post = QPost.post;
    QUser user = QUser.user;
    BooleanBuilder where = new BooleanBuilder();
    if (query != null && !query.isBlank())
      where.and(
          post.title
              .containsIgnoreCase(query)
              .or(post.content.containsIgnoreCase(query))
              .or(user.nickname.containsIgnoreCase(query)));
    OrderSpecifier<?> order =
        switch (sort == null ? "latest" : sort) {
          case "views" -> post.viewCount.desc();
          case "likes" -> post.likeCount.desc();
          default -> post.createdAt.desc();
        };
    List<Post> items =
        queryFactory
            .selectFrom(post)
            .join(post.author, user)
            .fetchJoin()
            .where(where)
            .orderBy(order, post.id.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();
    Long total =
        queryFactory
            .select(post.count())
            .from(post)
            .join(post.author, user)
            .where(where)
            .fetchOne();
    return new PageImpl<>(items, pageable, total == null ? 0 : total);
  }
}
