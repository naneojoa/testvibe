# 백엔드 API 상세 명세

## 1. 목적과 적용 범위

이 문서는 게시판 백엔드의 공개 API 계약과 도메인 규칙의 기준 문서다. API URI, 요청·응답 DTO, 인증·권한, 오류 코드 또는 조회 규칙을 변경할 때 구현과 함께 갱신한다.

지속적으로 지켜야 하는 API 계약, 트랜잭션 경계, 보안 원칙과 그 결정 사유는 이 문서에 기록한다. 특정 작업에서 수정한 파일과 실행한 검증 같은 구현 이력은 `implementation-improvements.md`에 기록하고, 이 문서의 변경 이력에는 계약에 영향을 주는 결과만 요약한다.

- 기본 URL: `/api`
- 콘텐츠 유형: `application/json`
- 식별자: UUID
- 시간: 시간대 오프셋을 포함한 ISO-8601 날짜·시간 (`TIMESTAMPTZ`)
- API 문서 UI: `/swagger-ui/index.html`

## 2. 공통 API 계약

### 성공 응답

일반 성공 응답은 `data`로 감싼다.

```json
{
  "data": {}
}
```

목록 응답은 `items`와 페이지 메타데이터를 반환한다.

```json
{
  "data": {
    "items": [],
    "page": {
      "number": 0,
      "size": 20,
      "totalElements": 0,
      "totalPages": 0
    }
  }
}
```

### 오류 응답

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "fieldErrors": {
    "title": "must not be blank"
  },
  "requestId": "2fc71bf1-6c38-4d5c-a90d-7e53dcb9ee11",
  "timestamp": "2026-07-28T00:00:00+09:00",
  "path": "/api/posts"
}
```

모든 오류 응답은 응답 헤더의 `X-Request-ID`와 본문의 `requestId`로 같은 요청을 식별한다. 사용자는 문의 시 이 값을 전달할 수 있고, 개발자는 동일한 값을 서버 로그에서 검색한다. 내부 예외 메시지와 스택 추적 정보는 응답에 포함하지 않고 서버 로그에만 기록한다.

대표 오류 코드는 다음과 같다.

| HTTP | 코드 | 의미 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Bean Validation 실패 |
| 401 | `INVALID_CREDENTIALS`, `INVALID_TOKEN` | 로그인 정보 또는 토큰이 유효하지 않음 |
| 403 | `FORBIDDEN` | 역할 또는 작성자 권한 없음 |
| 404 | `USER_NOT_FOUND`, `POST_NOT_FOUND`, `COMMENT_NOT_FOUND`, `LIKE_NOT_FOUND` | 대상 없음 |
| 409 | `EMAIL_EXISTS`, `NICKNAME_EXISTS`, `ALREADY_LIKED`, `COMMENT_HAS_CHILDREN`, `PARENT_POST_MISMATCH`, `SELF_ROLE_CHANGE`, `SELF_DELETE`, `DATA_CONFLICT` | 중복, 외래 키 제약 또는 현재 상태와 충돌 |

잘못된 UUID·JSON·enum·요청 파라미터는 `400 VALIDATION_ERROR`로 통일한다. 예상하지 못한 예외는 `500 INTERNAL_ERROR`로 응답하되 `ERROR` 로그에 요청 식별자, HTTP 메서드, 경로와 스택 추적 정보를 남긴다. Spring Security의 401·403도 같은 JSON 형식을 사용한다.

## 3. 인증과 권한

- 가입·로그인·게시글 및 댓글 조회는 비회원도 가능하다.
- 작성·수정·삭제·좋아요·내 정보는 인증이 필요하다.
- 관리자 회원 API는 `ADMIN` 역할만 호출할 수 있다.
- 액세스 토큰은 `ACCESS_TOKEN`, 갱신 토큰은 `REFRESH_TOKEN` HttpOnly 쿠키에 저장한다.
- 쿠키는 `SameSite=Strict`, `Path=/`를 사용하고 운영 환경에서는 `Secure=true`여야 한다.
- JWT를 localStorage에 저장하지 않는다.
- 게시글과 댓글은 작성자 또는 `ADMIN`만 수정·삭제할 수 있다.
- `ADMIN`은 자신의 역할을 변경하거나 자기 계정을 삭제할 수 없다.
- 액세스 토큰에 역할이 들어 있어도 요청 시 현재 DB 회원과 역할을 다시 확인한다. 삭제되거나 강등된 관리자의 기존 액세스 토큰으로 관리자 API를 계속 호출하지 못하게 하기 위함이다.
- 상태 변경 요청은 CSRF 토큰이 필요하다. 클라이언트는 먼저 `GET /auth/csrf`를 호출해 `XSRF-TOKEN` 쿠키와 헤더 이름을 받은 뒤, POST·PUT·PATCH·DELETE 요청에 쿠키 값을 해당 헤더로 포함한다. 응답 본문의 토큰은 BREACH 방어를 위해 XOR 마스킹될 수 있으므로 헤더 값으로 사용하지 않는다.

## 4. 인증·회원 API

| 메서드 | URI | 인증 | 요청 본문 | 성공 응답 |
| --- | --- | --- | --- | --- |
| POST | `/auth/sign-up` | 없음 | `email`, `password`, `nickname` | 생성 회원 `id` |
| POST | `/auth/login` | 없음 | `email`, `password` | 회원 `id`, 토큰 쿠키 발급 |
| POST | `/auth/refresh` | Refresh 쿠키 | 없음 | 회원 `id`, 새 토큰 쿠키 발급 |
| POST | `/auth/logout` | 선택 | 없음 | 토큰 쿠키 만료 |
| GET | `/auth/csrf` | 없음 | 없음 | CSRF `token`, `headerName` |
| GET | `/users/me` | 필요 | 없음 | `id`, `email`, `nickname`, `role` |
| PATCH | `/users/me` | 필요 | `nickname` | 수정된 회원 정보 |

검증 규칙:

- `email`: 비어 있지 않은 이메일 형식, 중복 불가
- `password`: 8~72자, BCrypt 해시로만 저장
- `nickname`: 2~50자, 중복 불가

## 5. 관리자 회원 API

| 메서드 | URI | 요청·파라미터 | 성공 응답 |
| --- | --- | --- | --- |
| GET | `/admin/users?page=0&size=20` | `page`(0 이상), `size`(최대 100) | 페이지형 회원 목록 |
| PATCH | `/admin/users/{userId}/role` | `{ "role": "USER" \| "ADMIN" }` | 수정된 회원 정보 |
| DELETE | `/admin/users/{userId}` | 없음 | 204 No Content |

회원은 작성 게시글이 남아 있으면 외래 키 제약으로 삭제할 수 없다. 이 경우 호출자는 충돌로 처리해야 한다.

## 6. 게시글 API

| 메서드 | URI | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/posts?q=&sort=latest&page=0&size=20` | 없음 | 통합 검색·정렬·페이지 목록 |
| GET | `/posts/{postId}` | 없음 | 상세 조회 및 조회 수 집계 |
| POST | `/posts` | 필요 | 게시글 작성 |
| PATCH | `/posts/{postId}` | 작성자 또는 ADMIN | 게시글 수정 |
| DELETE | `/posts/{postId}` | 작성자 또는 ADMIN | 게시글 완전 삭제 |
| PUT | `/posts/{postId}/like` | 필요 | 좋아요 생성 |
| DELETE | `/posts/{postId}/like` | 필요 | 좋아요 취소 |

게시글 요청 본문:

```json
{
  "title": "제목",
  "content": "본문"
}
```

- `title`: 1~200자
- `content`: 1~10,000자
- `q`: 제목·본문·작성자 닉네임 통합 검색
- `sort`: `latest`(기본값), `views`, `likes`
- `q`: 최대 200자
- 목록·검색·정렬·페이지네이션은 QueryDSL로 구현한다.

게시글 응답은 `id`, `title`, `content`, `authorId`, `authorNickname`, `viewCount`, `likeCount`, `createdAt`, `updatedAt`을 포함한다.

### 조회 수 규칙

- 로그인 회원은 회원 UUID를 식별자로 사용한다.
- 비회원은 원본 IP를 저장하지 않고 서버 비밀키의 HMAC-SHA-256 해시만 사용한다.
- 동일 식별자의 동일 게시글 조회 수는 24시간마다 한 번만 증가한다.
- PostgreSQL `record_post_view` 함수와 트랜잭션 잠금으로 조회 수 증가를 처리한다.

## 7. 댓글 API

| 메서드 | URI | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/posts/{postId}/comments` | 없음 | 댓글 트리 조회 |
| POST | `/posts/{postId}/comments` | 필요 | 댓글 또는 대댓글 작성 |
| PATCH | `/comments/{commentId}` | 작성자 또는 ADMIN | 내용 수정 |
| DELETE | `/comments/{commentId}` | 작성자 또는 ADMIN | 완전 삭제 |
| PUT | `/comments/{commentId}/like` | 필요 | 좋아요 생성 |
| DELETE | `/comments/{commentId}/like` | 필요 | 좋아요 취소 |

댓글 요청 본문:

```json
{
  "content": "댓글 내용",
  "parentCommentId": "부모 댓글 UUID 또는 null"
}
```

- `content`: 1~10,000자
- `parentCommentId`가 `null`이면 루트 댓글이며, 값이 있으면 대댓글이다.
- 대댓글 깊이는 제한하지 않는다.
- 부모 댓글은 요청 URI의 게시글과 같아야 한다.
- 수정 시 `parentCommentId`는 변경할 수 없다.
- 자식 댓글이 있는 댓글은 삭제할 수 없다. 자식부터 삭제해야 한다.
- 댓글 조회 응답은 각 노드의 `children` 배열로 트리를 표현한다.

## 8. 좋아요와 삭제 정책

- 게시글·댓글 좋아요는 `(대상 ID, 사용자 ID)` 복합 키로 회원당 하나의 대상에 한 번만 허용한다.
- 중복 좋아요는 `409 ALREADY_LIKED`다.
- 좋아요 수는 DB 트리거가 자동으로 증감시킨다.
- 게시글 삭제 시 댓글·게시글 좋아요·조회 이력은 함께 완전 삭제된다.
- 댓글 삭제 시 해당 댓글의 좋아요는 함께 삭제된다.

## 9. 데이터·운영 규칙

- DB 변경은 `backend/src/main/resources/db/migration`에 새 Flyway 파일로만 추가한다.
- 기존 마이그레이션 파일은 수정하지 않는다.
- 첫 ADMIN 계정은 `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` 환경변수 Flyway placeholder로 만든다.
- DB 비밀번호, JWT 비밀키, IP HMAC 비밀키, 비밀번호 원문은 코드·문서·Git에 저장하지 않는다.
- 실행 환경 변수와 명령은 `docs/backend-operations.md`를 따른다.

## 10. 애플리케이션 계층과 트랜잭션 기준

- Controller는 HTTP 바인딩, Bean Validation과 응답 상태만 담당한다.
- 등록·수정·삭제·권한 확인의 트랜잭션 경계는 Service 계층에서 관리한다.
- Entity를 Controller에서 직접 조작하거나 트랜잭션 밖에서 LAZY 연관관계를 DTO로 변환하지 않는다.
- 목록과 단건 조회는 필요한 연관관계를 fetch join 또는 EntityGraph로 명시한다.
- 수정 응답에 `updatedAt`이 포함되면 flush 이후 값을 반환한다.
- DB unique·외래 키 제약은 최종 동시성 방어선으로 유지하고, 알려진 충돌은 도메인 오류로 변환한다.

이 기준은 Controller에서 조회한 영속성 컨텍스트에서 분리된 엔티티를 수정해 변경이 저장되지 않거나, `open-in-view=false` 환경에서 응답 변환 중 `LazyInitializationException`이 발생한 문제를 방지하기 위해 도입했다.

## 변경 이력

### 2026-07-28

#### 변경 사유와 설계 결정

- Controller가 트랜잭션 밖에서 Entity를 수정하고 LAZY 작성자 정보를 읽어 수정 미반영과 상세 조회 500 가능성이 있었다. 게시글·댓글·회원·관리자·좋아요 로직을 Service 트랜잭션 경계로 이동했다.
- 미분류 예외가 스택 추적 정보 없이 `INTERNAL_ERROR`로만 변환되어 운영 디버깅이 불가능했다. 공통 오류 DTO와 요청 식별자를 도입하고 5xx 원인을 서버 로그에 기록하도록 했다.
- JWT의 역할 claim만 신뢰하면 강등되거나 삭제된 관리자가 토큰 만료 전까지 관리자 권한을 유지할 수 있었다. 요청 시 현재 DB 회원과 역할을 확인하도록 변경했다.
- HttpOnly 쿠키 인증에서 CSRF가 비활성화되어 있던 방어 공백을 해소하기 위해 Cookie 기반 CSRF 토큰 계약을 추가했다.
- 잘못된 UUID·JSON·관리자 페이지 값과 DB 제약 오류가 500으로 합쳐지던 문제를 각각 400과 409로 구조화했다.

#### 구현 결과

- 관리자 삭제 성공 응답을 명세대로 204로 통일했다.
- 게시글 검색어 최대 길이와 정렬 허용값, 관리자 페이지 범위를 검증한다.
- 댓글 트리 조회와 게시글 단건 조회에 필요한 연관관계를 명시적으로 함께 조회한다.
- H2 기반 회귀 테스트 9개가 성공했다. PostgreSQL 함수·트리거와 실제 브라우저 CSRF 통합은 별도 실환경 점검이 남아 있다.
- 상세 수정 파일과 검증 명령은 `implementation-improvements.md`에 기록했다.

### 2026-07-22

#### 로컬 기동 중 확인한 문제

- VS Code가 Spring Boot 3.3.x 지원 종료와 3.5.16 업데이트 안내를 표시했다. 이는 빌드 오류가 아닌 지원 주기 경고이며, 기동 문제의 원인은 아니었다. 3.5 업그레이드는 호환성 검토와 회귀 테스트가 필요한 별도 작업으로 남겼다.
- JShell에서는 `System.console()`이 `null`이어서 `readPassword()`를 사용할 수 없었고, 현재 PowerShell/.NET 환경에서는 `RandomNumberGenerator.Fill()`도 사용할 수 없었다.
- 애플리케이션은 정상 기동됐지만 `GET /api/posts`가 500을 반환했다. Dashboard의 Java 컴파일 결과에 메서드 파라미터 이름 정보가 없어, 이름을 생략한 `@RequestParam`과 `@PathVariable`을 Spring MVC가 해석하지 못한 것이 원인이었다.
- 공통 예외 처리기가 예상하지 못한 예외를 `INTERNAL_ERROR`로 변환하면서 실제 예외를 로그에 기록하지 않아 최초 원인 확인이 어려웠다. 예외 로깅 보완은 후속 작업으로 남아 있다.
- VS Code의 Java 디버거 실행과 Spring Boot의 상세 DEBUG 로그가 혼동됐다. 중단점 디버깅에는 Spring Boot의 `debug=true`가 필요하지 않다.

#### 적용한 조치

- Spring Boot Dashboard가 사용할 `.vscode/launch.json`을 구성하고 `backend/` 작업 디렉터리, `local` 프로필, `.env.local` 환경 파일을 연결했다.
- `scripts/setup-backend-local-env.ps1`을 추가했다. DB 비밀번호와 ADMIN BCrypt 해시는 화면에 표시하지 않고 입력받으며, JWT·IP HMAC 키는 `RandomNumberGenerator.Create().GetBytes()`로 생성한다.
- `.env.local`은 `.gitignore`의 `.env.*` 규칙으로 Git에서 제외한다. 로컬 평문 비밀값을 포함하므로 공유하거나 커밋하지 않는다.
- `PostController`, `AdminController`, `CommentController`, `LikeController`의 모든 `@RequestParam`과 `@PathVariable`에 `name`을 명시해 컴파일러의 `-parameters` 여부와 무관하게 요청을 바인딩하도록 수정했다.
- Dashboard 일반 실행과 Java 중단점 디버그 실행 모두 `--debug=false`, `--logging.level.root=INFO`를 사용하도록 설정했다. 일반 실행은 실행 아이콘, 중단점 디버깅은 벌레 모양 아이콘을 사용하며 두 프로세스는 동시에 8080 포트를 사용할 수 없다.

#### 검증 결과와 다음 확인

- `spotlessJavaApply spotlessCheck test --no-daemon --console=plain`: 성공했다.
- `BoardApplicationTests`와 `PostControllerRequestBindingTests` 총 2개가 성공했다. 후자는 파라미터 이름 메타데이터에 의존하지 않고 `GET /api/posts` 기본 요청이 200과 기본 페이지 정보를 반환하는지 검증한다.
- 실제 PostgreSQL을 사용하는 Dashboard 재기동 후 `/api/posts`, Swagger, 인증·게시글·댓글 API의 수동 점검은 계속 진행한다.
- Spring Boot 3.5 업그레이드와 `GlobalExceptionHandler`의 예상하지 못한 예외 로깅은 로컬 기동 확인과 분리해 후속 작업으로 진행한다.

### 2026-07-20

- Spring Boot 애플리케이션을 `backend/`로 분리하고 Spring Boot 3.x 기반으로 정비했다.
- 회원·JWT 쿠키 인증·관리자 회원 관리·게시글·댓글·좋아요·조회 수 API의 초기 계약과 구현을 추가했다.
- PostgreSQL Flyway 스키마, 좋아요 수 트리거, 24시간 조회 수 집계 함수를 추가했다.
- QueryDSL 기반 게시글 목록·통합 검색·정렬·페이지네이션을 추가했다.
- Spotless 포매터와 백엔드 운영 환경 변수 문서를 추가했다.
