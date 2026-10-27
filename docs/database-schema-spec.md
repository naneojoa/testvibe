# 게시판 데이터베이스 설계서

## 1. 개요

- 데이터베이스: PostgreSQL
- 기본 키: UUID (`gen_random_uuid()`)
- 시간 타입: `TIMESTAMPTZ`
- 게시판: 자유게시판 1개
- 삭제 정책: 게시글과 댓글은 완전 삭제
- 댓글 정책: 무제한 깊이의 대댓글 허용

## 2. 회원

### `users`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | UUID | PK | 회원 식별자 |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | 로그인 이메일 |
| `password_hash` | VARCHAR(255) | NOT NULL | BCrypt로 해시된 비밀번호 |
| `nickname` | VARCHAR(50) | NOT NULL, UNIQUE | 화면 표시 이름 |
| `role` | VARCHAR(20) | NOT NULL | `USER` 또는 `ADMIN` |
| `created_at` | TIMESTAMPTZ | NOT NULL | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 수정 시각 |

- 비밀번호 원문은 저장하지 않는다.
- 애플리케이션은 `community_app` DB 계정으로만 접속하며, `postgres` 슈퍼유저를 사용하지 않는다.

## 3. 게시글

### `posts`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | UUID | PK | 게시글 식별자 |
| `author_id` | UUID | FK → `users.id` | 작성자 |
| `title` | VARCHAR(200) | NOT NULL | 제목 |
| `content` | TEXT | NOT NULL | 본문 |
| `view_count` | BIGINT | NOT NULL, 기본값 0 | 누적 조회 수 |
| `like_count` | BIGINT | NOT NULL, 기본값 0 | 누적 좋아요 수 |
| `created_at` | TIMESTAMPTZ | NOT NULL | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 수정 시각 |

- 게시글을 삭제하면 댓글, 게시글 좋아요, 조회 이력이 함께 삭제된다.
- 작성자 회원은 게시글이 존재하는 동안 삭제할 수 없다.

## 4. 댓글과 대댓글

### `comments`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | UUID | PK | 댓글 식별자 |
| `post_id` | UUID | FK → `posts.id` | 소속 게시글 |
| `author_id` | UUID | FK → `users.id` | 작성자 |
| `parent_comment_id` | UUID | FK → `comments.id`, NULL 가능 | 부모 댓글 |
| `content` | TEXT | NOT NULL | 댓글 내용 |
| `like_count` | BIGINT | NOT NULL, 기본값 0 | 누적 좋아요 수 |
| `created_at` | TIMESTAMPTZ | NOT NULL | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 수정 시각 |

- `parent_comment_id`가 `NULL`이면 일반 댓글, 값이 있으면 대댓글이다.
- 대댓글은 깊이 제한 없이 작성할 수 있다.
- 부모 댓글과 대댓글은 반드시 같은 게시글에 속해야 한다.
- 부모 댓글에 대댓글이 남아 있으면 부모 댓글 삭제를 차단한다. 대댓글부터 삭제해야 한다.

## 5. 좋아요

### `post_likes`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `post_id` | UUID | PK, FK → `posts.id` | 게시글 |
| `user_id` | UUID | PK, FK → `users.id` | 좋아요한 회원 |
| `created_at` | TIMESTAMPTZ | NOT NULL | 좋아요 시각 |

### `comment_likes`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `comment_id` | UUID | PK, FK → `comments.id` | 댓글 |
| `user_id` | UUID | PK, FK → `users.id` | 좋아요한 회원 |
| `created_at` | TIMESTAMPTZ | NOT NULL | 좋아요 시각 |

- 복합 기본 키로 회원당 게시글/댓글 하나에 한 번만 좋아요할 수 있다.
- 좋아요 생성·취소 트리거가 `posts.like_count`, `comments.like_count`를 자동 갱신한다.

## 6. 조회 수

### `post_views`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `post_id` | UUID | FK → `posts.id` | 조회한 게시글 |
| `user_id` | UUID | NULL 가능, FK → `users.id` | 로그인 회원 식별자 |
| `viewer_key` | VARCHAR(64) | NULL 가능 | 비회원 IP HMAC-SHA-256 해시 |
| `first_viewed_at` | TIMESTAMPTZ | NOT NULL | 최초 집계 시각 |
| `last_counted_at` | TIMESTAMPTZ | NOT NULL | 마지막으로 조회 수를 증가시킨 시각 |

- 한 행에는 `user_id` 또는 `viewer_key` 중 정확히 하나만 저장한다.
- 로그인 회원은 `(post_id, user_id)`, 비회원은 `(post_id, viewer_key)` 조합으로 식별한다.
- 같은 식별자의 동일 게시글 조회는 마지막 집계 후 24시간이 지나야 `view_count`를 다시 증가시킨다.
- 비회원의 원본 IP는 저장하지 않는다. 백엔드에서 서버 비밀키로 HMAC-SHA-256 해시를 생성해 `viewer_key`로 전달한다.
- 조회 수 증가는 `record_post_view` DB 함수를 통해 원자적으로 처리한다.

## 7. 인덱스 및 무결성 규칙

- 게시글 목록: `posts(created_at DESC, id DESC)`
- 작성자별 게시글: `posts(author_id, created_at DESC, id DESC)`
- 게시글 댓글: `comments(post_id, created_at, id)`
- 대댓글 탐색: `comments(parent_comment_id, created_at, id)`
- 이메일과 닉네임은 각각 중복 불가다.
- 역할은 `USER`, `ADMIN`만 허용한다.
- 제목·본문·댓글 내용은 빈 문자열을 허용하지 않는다.
- 좋아요 수와 조회 수는 음수가 될 수 없다.

## 8. 애플리케이션 구현 규칙

- JPA Entity를 API 응답으로 직접 노출하지 않고 DTO로 변환한다.
- 목록·검색·정렬·페이지네이션은 QueryDSL DTO 조회로 구현한다.
- DDL 변경은 DBeaver 또는 pgAdmin에서 수동 변경하지 않고 Flyway 마이그레이션으로 관리한다.
- 시간은 DB에 `TIMESTAMPTZ`로 저장하고, React 화면에서 `Asia/Seoul` 기준으로 표시한다.
