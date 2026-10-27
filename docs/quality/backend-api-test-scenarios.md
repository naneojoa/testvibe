# 백엔드 API 테스트 시나리오

## 1. 범위와 공통 규칙

- 기본 URL: `http://localhost:8080/api`
- 콘텐츠 유형: `application/json`
- 인증 API를 호출한 뒤 `Set-Cookie`의 `ACCESS_TOKEN`, `REFRESH_TOKEN`을 쿠키 저장소에 보관하고 후속 요청에 사용한다.
- UUID, 시간값은 실행마다 달라지므로 값 자체보다 형식과 참조 관계를 검증한다.
- `userA`, `userB`, `admin`, `postA`, `postB`, `commentRoot`, `commentChild`의 생성 ID를 테스트 변수로 저장해 후속 시나리오에서 사용한다.

이 문서는 API 테스트 케이스의 정의와 현재 자동화·실행 현황을 함께 관리한다. 문서별 책임은 다음과 같다.

- `../contracts/backend-api-spec.md`: 무엇을 구현해야 하는지 정의하는 API 계약
- 이 문서: 계약을 어떤 조건과 입력으로 검증할지 정의하는 테스트 케이스
- `spec-test-traceability.md`: 계약 ID와 자동화 테스트 파일의 연결
- CI 테스트 리포트 또는 이 문서의 실행 이력: 특정 실행 회차의 `PASS`, `FAIL`, `SKIP` 증적

`구현됨`은 테스트 코드가 있다는 뜻이며 `PASS`를 의미하지 않는다. 실행하지 않은 테스트는 `PASS`로 기록하지 않는다.

성공 응답은 `data`로 감싼다.

```json
{
  "data": {}
}
```

페이지 응답은 다음 구조다.

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

일반 오류 응답의 계약은 다음과 같다.

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "fieldErrors": {
    "title": "must not be blank"
  }
}
```

## 2. 사전 데이터 준비

1. `userA`, `userB`를 가입하고 각각 로그인하여 쿠키를 확보한다.
2. 환경 변수로 만든 `admin` 계정으로 로그인하여 관리자 쿠키를 확보한다.
3. `userA`가 `postA`, `postB`를 생성한다.
4. `postA`에 `commentRoot`를 작성하고, 그 하위에 `commentChild`를 작성한다.

> 비밀번호 원문은 테스트 실행 환경의 비밀값으로만 관리하며 문서나 저장소에 기록하지 않는다.

## 3. 정상 API 시나리오

| ID | 메서드 / URL | 인증 | 요청 본문 또는 조건 | 예상 상태 | 예상 응답 및 검증 |
| --- | --- | --- | --- | --- | --- |
| AUTH-01 | `POST /auth/sign-up` | 없음 | `{"email":"usera@example.com","password":"<valid-password>","nickname":"userA"}` | 200 | `data.id`가 UUID 문자열이다. |
| AUTH-02 | `POST /auth/login` | 없음 | `{"email":"usera@example.com","password":"<valid-password>"}` | 200 | `data.id`가 userA ID이고, `ACCESS_TOKEN` 및 `REFRESH_TOKEN` Set-Cookie가 존재한다. 두 쿠키는 HttpOnly, Path=/, SameSite=Strict다. |
| AUTH-03 | `POST /auth/refresh` | REFRESH 쿠키 | 본문 없음 | 200 | `data.id`가 userA ID이며 ACCESS/REFRESH 쿠키가 다시 설정된다. |
| AUTH-04 | `POST /auth/logout` | 선택 | 본문 없음 | 200 | `{"data":null}` 및 두 쿠키의 `Max-Age=0`을 확인한다. |
| USER-01 | `GET /users/me` | ACCESS 쿠키 | 본문 없음 | 200 | `data.id`, `email`, `nickname`, `role`를 확인한다. userA의 role은 `USER`다. |
| USER-02 | `PATCH /users/me` | ACCESS 쿠키 | `{"nickname":"userA2"}` | 200 | `data.nickname`이 `userA2`다. |
| ADMIN-01 | `GET /admin/users?page=0&size=20` | admin | 본문 없음 | 200 | `data.items` 및 `data.page.number`, `size`, `totalElements`, `totalPages`를 확인한다. |
| ADMIN-02 | `PATCH /admin/users/{userBId}/role` | admin | `{"role":"ADMIN"}` | 200 | `data.id`가 userB ID, `data.role`이 `ADMIN`이다. |
| ADMIN-03 | `DELETE /admin/users/{userBId}` | admin | 게시글이 없는 사용자 | 현재 200 | 현재 구현은 `{"data":null}`을 반환한다. 문서 계약의 204와 비교한다. |
| POST-01 | `GET /posts?q=&sort=latest&page=0&size=20` | 없음 | 본문 없음 | 200 | 페이지형 목록이며 `items`의 게시글마다 게시글 응답 필드를 포함한다. |
| POST-02 | `GET /posts?q=userA&sort=views&page=0&size=20` | 없음 | 본문 없음 | 200 | 제목·본문·작성자 닉네임 통합 검색 결과를 반환한다. |
| POST-03 | `GET /posts/{postAId}` | 없음 | 첫 번째 식별자 조회 | 200 | 게시글 응답을 반환하고 해당 식별자의 최초 조회라면 `viewCount`가 1 증가한다. |
| POST-04 | `POST /posts` | ACCESS 쿠키 | `{"title":"첫 글","content":"본문"}` | 200 | 생성 게시글의 모든 필드와 작성자 정보를 확인한다. 생성 ID를 `postAId`로 저장한다. |
| POST-05 | `PATCH /posts/{postAId}` | 작성자 또는 admin | `{"title":"수정 제목","content":"수정 본문"}` | 200 | 변경된 제목·본문과 `updatedAt` 변경을 확인한다. |
| POST-06 | `DELETE /posts/{postAId}` | 작성자 또는 admin | 본문 없음 | 204 | 본문이 없다. 후속 상세 조회는 404다. |
| POST-07 | `PUT /posts/{postAId}/like` | ACCESS 쿠키 | 본문 없음 | 200 | `{"data":null}`. 상세 재조회 시 `likeCount`가 1 증가한다. |
| POST-08 | `DELETE /posts/{postAId}/like` | ACCESS 쿠키 | 본문 없음 | 200 | `{"data":null}`. 상세 재조회 시 `likeCount`가 1 감소한다. |
| COMMENT-01 | `GET /posts/{postAId}/comments` | 없음 | 본문 없음 | 200 | `data`는 루트 댓글 배열이며 각 노드는 `children` 배열을 가진다. |
| COMMENT-02 | `POST /posts/{postAId}/comments` | ACCESS 쿠키 | `{"content":"루트 댓글","parentCommentId":null}` | 200 | 생성 댓글의 `children`은 빈 배열이다. 생성 ID를 `commentRootId`로 저장한다. |
| COMMENT-03 | `POST /posts/{postAId}/comments` | ACCESS 쿠키 | `{"content":"대댓글","parentCommentId":"{commentRootId}"}` | 200 | 생성 댓글을 반환한다. 댓글 트리 조회 시 루트의 children에 포함된다. |
| COMMENT-04 | `PATCH /comments/{commentRootId}` | 작성자 또는 admin | `{"content":"수정 댓글","parentCommentId":null}` | 200 | `data.content`가 변경된다. |
| COMMENT-05 | `DELETE /comments/{commentChildId}` | 작성자 또는 admin | 본문 없음 | 204 | 본문이 없다. |
| COMMENT-06 | `PUT /comments/{commentRootId}/like` | ACCESS 쿠키 | 본문 없음 | 200 | `{"data":null}`. 댓글 목록 재조회 시 `likeCount`가 1 증가한다. |
| COMMENT-07 | `DELETE /comments/{commentRootId}/like` | ACCESS 쿠키 | 본문 없음 | 200 | `{"data":null}`. 댓글 목록 재조회 시 `likeCount`가 1 감소한다. |

게시글 단건 응답의 필수 필드는 아래와 같다.

```json
{
  "data": {
    "id": "uuid",
    "title": "첫 글",
    "content": "본문",
    "authorId": "uuid",
    "authorNickname": "userA",
    "viewCount": 1,
    "likeCount": 0,
    "createdAt": "2026-07-20T10:00:00+09:00",
    "updatedAt": "2026-07-20T10:00:00+09:00"
  }
}
```

댓글 노드는 다음 필드를 가진다.

```json
{
  "id": "uuid",
  "authorId": "uuid",
  "authorNickname": "userA",
  "content": "루트 댓글",
  "likeCount": 0,
  "createdAt": "2026-07-20T10:00:00+09:00",
  "updatedAt": "2026-07-20T10:00:00+09:00",
  "children": []
}
```

## 4. 오류 및 경계 시나리오

| ID | 시나리오 | 요청 또는 조건 | 예상 상태 / 코드 |
| --- | --- | --- | --- |
| EDGE-01 | 중복 이메일 가입 | 기존 이메일로 `POST /auth/sign-up` | 409 / `EMAIL_EXISTS` |
| EDGE-02 | 중복 닉네임 가입 | 기존 닉네임으로 `POST /auth/sign-up` | 409 / `NICKNAME_EXISTS` |
| EDGE-03 | 가입 입력 검증 | 이메일 형식 오류, 7자 비밀번호, 1자 닉네임 | 400 / `VALIDATION_ERROR`, 해당 `fieldErrors` |
| EDGE-04 | 로그인 실패 | 존재하지 않는 이메일 또는 틀린 비밀번호 | 401 / `INVALID_CREDENTIALS` |
| EDGE-05 | 갱신 토큰 없음 | 쿠키 없이 `POST /auth/refresh` | 401 / `INVALID_TOKEN` |
| EDGE-06 | 보호 API 미인증 | 쿠키 없이 게시글/댓글 생성·수정·삭제·좋아요 또는 `/users/me` 호출 | 401 |
| EDGE-07 | 관리자 API 권한 없음 | 일반 사용자로 `/admin/users` 호출 | 403 |
| EDGE-08 | 타인 리소스 변경 | userA가 userB의 게시글 또는 댓글 수정·삭제 | 403 / `FORBIDDEN` |
| EDGE-09 | 존재하지 않는 대상 | 임의 UUID로 게시글·댓글·회원·좋아요 요청 | 404 / 대상별 `*_NOT_FOUND` |
| EDGE-10 | 게시글 입력 경계 | 공백 제목/본문, 제목 201자, 본문 10,001자 | 400 / `VALIDATION_ERROR` |
| EDGE-11 | 댓글 입력 경계 | 공백 내용, 내용 10,001자 | 400 / `VALIDATION_ERROR` |
| EDGE-12 | 중복 게시글 좋아요 | 같은 사용자가 같은 게시글에 두 번 PUT | 두 번째 요청 409 / `ALREADY_LIKED` |
| EDGE-13 | 중복 댓글 좋아요 | 같은 사용자가 같은 댓글에 두 번 PUT | 두 번째 요청 409 / `ALREADY_LIKED` |
| EDGE-14 | 없는 좋아요 취소 | 좋아요 기록 없이 좋아요 취소 DELETE 요청 | 404 / `LIKE_NOT_FOUND` |
| EDGE-15 | 다른 게시글의 부모 댓글 | postA URL에 postB 댓글 ID를 parentCommentId로 전달 | 409 / `PARENT_POST_MISMATCH` |
| EDGE-16 | 댓글 부모 변경 | 댓글 수정 시 null이 아닌 parentCommentId 전달 | 400 / `PARENT_IMMUTABLE` |
| EDGE-17 | 자식이 있는 댓글 삭제 | 자식 댓글보다 부모 댓글을 먼저 삭제 | 409 / `COMMENT_HAS_CHILDREN` |
| EDGE-18 | 관리자 자기 역할 변경 | admin이 자신의 role 변경 | 409 / `SELF_ROLE_CHANGE` |
| EDGE-19 | 관리자 자기 삭제 | admin이 자신의 계정 삭제 | 409 / `SELF_DELETE` |
| EDGE-20 | 페이지 경계 | `page=0,size=1`, 마지막 페이지, 빈 검색 결과 | 정확한 페이지 메타데이터와 빈 `items` |
| EDGE-21 | 정렬 | 생성 시각·조회수·좋아요 수가 다른 게시글 준비 후 각 sort 호출 | `latest`, `views`, `likes` 순서가 맞고 동점은 ID 내림차순 |
| EDGE-22 | 동일 사용자 조회수 | 같은 로그인 사용자로 같은 게시글을 연속 조회 | 최초 1회만 증가하고 24시간 안에는 증가하지 않음 |
| EDGE-23 | 비회원 조회수 | 같은 IP와 다른 IP로 같은 게시글 조회 | 같은 IP는 24시간 내 1회, 다른 IP의 최초 조회는 증가 |
| EDGE-24 | 식별자별 조회수 | userA, userB, 비회원이 같은 게시글 조회 | 서로 다른 식별자의 최초 조회마다 1회씩 증가 |
| EDGE-25 | 게시글 삭제 전파 | 댓글·게시글 좋아요·댓글 좋아요·조회 이력 생성 후 게시글 삭제 | 모든 종속 데이터가 삭제되고 후속 조회는 404 |
| EDGE-26 | 병렬 좋아요 | 동일 계정·동일 대상의 PUT like를 동시에 실행 | 성공 1건, 최종 likeCount=1, 나머지는 충돌 처리 |
| EDGE-27 | 병렬 조회 | 동일 식별자로 상세 조회를 동시에 실행 | 최종 조회수는 1만 증가 |

## 5. 구현-계약 확인 항목

다음은 자동화 테스트에서 별도 확인해야 하는 현재 구현의 위험 항목이다.

1. 관리자 회원 삭제: 명세는 `204 No Content`지만 현재 구현은 `200 {"data":null}`을 반환한다.
2. 관리자 목록 페이지 파라미터: 명세는 `page >= 0`, `size <= 100`이지만 현재 구현에 Bean Validation이 없다. 음수 또는 `size=0`이 400이 아닌 500으로 처리되는지 확인한다.
3. 오류 응답 일관성: Spring Security가 처리하는 미인증·권한 없음 응답은 공통 JSON 오류 형식 대신 기본 오류 응답이 될 수 있다. 상태 코드와 응답 본문을 함께 검증한다.
4. 잘못된 UUID 경로값, 만료·변조 refresh 토큰, 중복 닉네임 수정, 작성 게시글이 남은 회원 삭제는 통일된 4xx 오류가 아닌 500이 되는지 확인한다.
5. 동시 좋아요 요청은 사전 존재 확인 뒤 DB 복합 키 제약이 경합할 수 있으므로, 실패 요청이 `ALREADY_LIKED`로 매핑되는지 확인한다.
6. 좋아요 수 트리거와 24시간 조회수 함수는 PostgreSQL 전용 구현이다. H2 단위 테스트 외에 PostgreSQL Testcontainers 통합 테스트에서 검증한다.

## 6. 자동화 권장 구성

- API 흐름 테스트: 가입 → 로그인 → 게시글 → 댓글 → 좋아요 → 삭제 순으로 독립 데이터 세트를 만든다.
- 권한 매트릭스: 비회원, 작성자, 타 사용자, 관리자 네 주체로 동일 변경 API를 호출한다.
- DB 통합 테스트: PostgreSQL Testcontainers로 Flyway, 좋아요 트리거, 조회수 함수, 삭제 전파를 검증한다.
- 병렬성 테스트: 비동기 클라이언트 또는 동시 요청 도구로 EDGE-26, EDGE-27을 반복 실행한다.

## 7. 테스트 케이스 관리 형식

### 7.1 공통 컬럼

신규 테스트 케이스를 추가하거나 기존 케이스를 자동화할 때 다음 컬럼을 사용한다.

| 컬럼 | 필수 | 설명 |
| --- | --- | --- |
| ID | 필수 | 요구사항 및 결함과 연결되는 고유 테스트 ID |
| 기능 | 필수 | 검증 대상 기능 또는 업무 규칙 |
| 테스트 유형 | 필수 | 단위, 컴포넌트, 통합, API, DB, 예외, 경계값, 특수 조건, 동시성, 성능, 보안 중 하나 이상 |
| 사전 조건 | 필수 | 사용자, 권한, 데이터, 서버 및 DB 상태 |
| 입력/행동 | 필수 | 요청, 사용자 조작 또는 동시 실행 조건 |
| 예상 결과 | 필수 | 상태 코드, 응답 본문, 화면 또는 DB 최종 상태 |
| 자동화 상태 | 필수 | `IMPLEMENTED`, `PARTIAL`, `NOT_AUTOMATED`, `PENDING` |
| 최근 실행 결과 | 필수 | `PASS`, `FAIL`, `SKIP`, `NOT_RUN`, `BLOCKED` |
| 실행 환경/일시 | 실행 시 필수 | 실행 환경과 일시. 예: `local-h2 / 2026-09-16` |
| 자동화 증적 | 자동화 시 필수 | 테스트 파일, 테스트 메서드, CI 실행 또는 리포트 경로 |
| 비고 | 선택 | SKIP/BLOCKED 사유, 결함 ID, 부분 검증 범위, 남은 위험 |

예시는 다음과 같다.

| ID | 기능 | 테스트 유형 | 사전 조건 | 입력/행동 | 예상 결과 | 자동화 상태 | 최근 실행 결과 | 자동화 증적 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-02 | 로그인 | API, 통합, 보안 | 가입된 E2E 회원 | 올바른 계정으로 로그인 후 새로고침 | 200, 인증 쿠키 발급, 세션 유지 | IMPLEMENTED | SKIP | `frontend/e2e/auth.spec.ts` |
| EDGE-10 | 게시글 입력 경계 | 단위, 경계값, 예외 | 없음 | 공백 및 최대 길이 초과 입력 | 클라이언트 검증 오류 | PARTIAL | PASS | `frontend/src/lib/validation.test.ts` |
| EDGE-26 | 병렬 좋아요 | DB, 동시성, 특수 조건 | PostgreSQL, 회원과 게시글 | 같은 회원으로 동시에 PUT | 1건만 성공하고 최종 likeCount=1 | PENDING | NOT_RUN | 없음 |

### 7.2 상태 판정 규칙

자동화 상태와 실행 결과는 서로 다른 값으로 관리한다.

| 분류 | 값 | 판정 기준 |
| --- | --- | --- |
| 자동화 상태 | `IMPLEMENTED` | 기대 결과 전체를 검증하는 자동화 코드가 존재한다. |
| 자동화 상태 | `PARTIAL` | 일부 계층 또는 일부 기대 결과만 자동 검증한다. |
| 자동화 상태 | `NOT_AUTOMATED` | 시나리오는 있지만 자동화 코드가 없다. |
| 자동화 상태 | `PENDING` | 자동화하기로 결정했으나 환경 또는 구현이 준비되지 않았다. |
| 실행 결과 | `PASS` | 해당 실행 회차에서 테스트가 실행되어 통과했다. |
| 실행 결과 | `FAIL` | 실행되었으나 하나 이상의 검증이 실패했다. |
| 실행 결과 | `SKIP` | 테스트 러너가 조건에 따라 테스트를 건너뛰었다. |
| 실행 결과 | `NOT_RUN` | 해당 실행 회차에 실행하지 않았다. |
| 실행 결과 | `BLOCKED` | 실행을 시도했지만 환경 또는 외부 의존성 문제로 완료하지 못했다. |

부분 테스트가 통과한 경우 자동화 상태는 `PARTIAL`, 최근 실행 결과는 `PASS`로 기록하고 비고에 검증되지 않은 범위를 적는다. 예를 들어 프론트 입력 검증 테스트 통과는 백엔드가 동일 입력을 400으로 거부한다는 증거가 아니다.

### 7.3 요구사항 충족 판정

소스 구현 세부사항을 테스트 케이스에 그대로 복사하지 않는다. 대신 다음 연결이 추적되어야 한다.

```text
API 계약 또는 업무 요구사항
    → 인수 조건
    → 테스트 시나리오 ID
    → 자동화 테스트 파일과 메서드
    → 실행 결과 및 리포트
```

요구사항 충족 판정은 다음 기준을 모두 만족해야 `VERIFIED`로 기록할 수 있다.

1. 관련 정상·실패·경계·권한 시나리오가 식별되어 있다.
2. 요구사항 위험에 맞는 테스트 계층에서 자동화되었다.
3. 대상 커밋 또는 릴리스 후보에서 실제 실행 결과가 `PASS`다.
4. DB, 브라우저 또는 운영 환경 전용 동작을 더 낮은 계층의 테스트로 대신하지 않았다.
5. 미실행, SKIP, 수동 확인 항목과 남은 위험이 명시되어 있다.

가독성, 책임 분리, 중복, 네이밍과 같은 구조 품질은 테스트 케이스가 아니라 코드 리뷰 체크리스트에서 관리한다. 보안·성능 요구사항처럼 실행 가능한 인수 기준이 있는 항목은 별도의 테스트 케이스로 작성한다.

## 8. 테스트 계층과 수행 도구

| 계층 | 도구 | 실행 범위 | 현재 상태 |
| --- | --- | --- | --- |
| 프론트엔드 단위 | Vitest | 입력 검증, 값 해석, API·오류 변환 | 구현됨 |
| 프론트엔드 컴포넌트 | React Testing Library, jsdom | 렌더링, 입력, 권한, 콜백, 오류 상태 | 일부 구현 |
| 백엔드 단위·통합 | JUnit 5, `@SpringBootTest` | Service 트랜잭션과 Spring 애플리케이션 컨텍스트 | 일부 구현 |
| 백엔드 API | JUnit 5, MockMvc | HTTP 상태, JSON 계약, 입력 검증, 보안, CSRF | 일부 구현 |
| PostgreSQL 통합 | Testcontainers 권장 | Flyway, 제약, 함수, 트리거, 삭제 전파 | 미구현 |
| 브라우저 E2E | Playwright | React부터 Spring Boot와 DB까지 실제 사용자 흐름 | 5개 구현, 실행 환경 필요 |
| 성능 | 도구 및 목표 결정 필요 | 응답시간, 처리량, 오류율, 대량 데이터 | 미구현 |

JUnit 5는 Java 테스트의 실행 기반이다. MockMvc는 실제 포트에 서버를 띄우지 않고 Spring MVC, Security, Validation과 JSON 응답 계약을 검증한다. PostgreSQL 전용 기능은 H2 기반 `@SpringBootTest`로 검증 완료 처리하지 않고 Testcontainers 또는 격리된 실제 PostgreSQL에서 확인한다.

## 9. 최근 자동화 및 실행 현황

### 9.1 실행 스냅샷

아래 결과는 `2026-09-16` 로컬 검토 실행의 스냅샷이다. 새 커밋이나 릴리스 후보를 검증할 때는 실행 결과와 일시를 갱신하고 CI 리포트가 있으면 그 리포트를 우선 증적으로 사용한다.

| 실행 항목 | 명령 | 환경 | 결과 | 상세 |
| --- | --- | --- | --- | --- |
| 프론트엔드 코드 형식 | `pnpm format:check` | local | PASS | 전체 파일 Prettier 검사 통과 |
| 프론트엔드 린트 | `pnpm lint` | local | PASS | ESLint 통과 |
| 프론트엔드 단위·컴포넌트 | `pnpm test` | jsdom | PASS | 6개 파일, 21개 테스트 통과 |
| 프론트엔드 빌드·타입 | `pnpm build` | local | PASS | TypeScript와 Vite 빌드 통과 |
| 백엔드 JUnit | `.\gradlew.bat test --rerun-tasks` | H2, Flyway 비활성 | PASS | 9개 테스트, 실패·오류·SKIP 없음 |
| 브라우저 E2E | `pnpm test:e2e` | Playwright Chromium | SKIP | 5개 모두 E2E 계정 환경변수 미설정으로 SKIP |
| PostgreSQL 통합 | 미구현 | PostgreSQL | NOT_RUN | Testcontainers 및 Flyway 검증 필요 |
| 동시성 | 미구현 | PostgreSQL | NOT_RUN | EDGE-26, EDGE-27 구현 필요 |
| 성능 | 미구현 | 미정 | NOT_RUN | 데이터 규모와 성능 목표 결정 필요 |

### 9.2 시나리오별 자동화 증적

| ID | 테스트 유형 | 자동화 상태 | 최근 실행 결과 | 실행 환경/일시 | 자동화 증적 | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-02 | E2E, 보안 | IMPLEMENTED | SKIP | local / 2026-09-16 | `frontend/e2e/auth.spec.ts` | 격리 E2E 계정 필요 |
| POST-04, POST-05, POST-06 | E2E, API | IMPLEMENTED | SKIP | local / 2026-09-16 | `frontend/e2e/posts.spec.ts` | 격리 E2E 계정 필요 |
| COMMENT-02 | E2E, API | IMPLEMENTED | SKIP | local / 2026-09-16 | `frontend/e2e/comments.spec.ts` | 생성 데이터 정리 또는 DB 초기화 필요 |
| COMMENT-02, EDGE-06 | 컴포넌트, 보안 | PARTIAL | PASS | jsdom / 2026-09-16 | `frontend/src/features/comments/CommentSection.test.tsx` | 비회원 댓글 제출 차단만 검증, 백엔드 401은 별도 검증 필요 |
| EDGE-07 | E2E, 보안 | PARTIAL | SKIP | local / 2026-09-16 | `frontend/e2e/admin.spec.ts` | 메뉴 표시만 검증하며 관리자 API의 실제 403은 미검증 |
| EDGE-10, EDGE-11 | 단위, 경계값, 예외 | PARTIAL | PASS | jsdom / 2026-09-16 | `frontend/src/lib/validation.test.ts` | 프론트 검증만 확인, 백엔드 400 계약은 미검증 |
| EDGE-20 | 단위, 경계값 | PARTIAL | PASS | jsdom, H2 / 2026-09-16 | `frontend/src/pages/PostListPage.test.ts`, `PostControllerRequestBindingTests.java`, `ErrorResponseTests.java` | 일부 페이지 파싱·기본값·음수 page만 검증 |
| EDGE-09 | API, 예외 | PARTIAL | PASS | H2 / 2026-09-16 | `ErrorResponseTests.malformedUuidUsesStructuredValidationResponse` | 잘못된 게시글 UUID만 검증 |
| POST-01 | API, 경계값 | PARTIAL | PASS | H2 / 2026-09-16 | `PostControllerRequestBindingTests.listUsesDefaultRequestParametersWithoutCompilerParameterMetadata` | 빈 목록의 기본 page/size만 검증 |
| USER-02, POST-05, COMMENT-04 | 통합 | PARTIAL | PASS | H2 / 2026-09-16 | `ServiceTransactionTests` | Service 수정 영속성만 검증, HTTP 계약·권한은 미검증 |
| CSRF 발급·필수·재시도 | 단위, API, 보안 | PARTIAL | PASS | jsdom, H2 / 2026-09-16 | `frontend/src/lib/api.test.ts`, `ErrorResponseTests.java` | 실제 브라우저 쿠키 흐름은 E2E 미실행 |
| EDGE-26, EDGE-27 | DB, 동시성, 특수 조건 | PENDING | NOT_RUN | - | 없음 | PostgreSQL 동시성 테스트 필요 |
| 그 외 AUTH/USER/ADMIN/POST/COMMENT/EDGE 시나리오 | API, 통합, DB, 보안 | NOT_AUTOMATED | NOT_RUN | - | 없음 | 시나리오별 자동화 테스트 추가 필요 |

## 10. 표준 실행 절차

### 10.1 프론트엔드 정적 검사와 단위·컴포넌트 테스트

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

### 10.2 백엔드 JUnit·MockMvc 테스트

```powershell
cd backend
.\gradlew.bat spotlessCheck test --no-daemon
```

백엔드 테스트 리포트는 `backend/build/reports/tests/test/index.html`에서 확인한다.

### 10.3 Playwright E2E

Playwright는 개인 또는 공유 개발 DB에 연결하지 않는다. 초기화 가능한 E2E 전용 PostgreSQL DB와 전용 계정을 준비한 다음 아래 순서로 실행한다.

1. E2E DB를 가리키는 환경변수로 Spring Boot를 `8080` 포트에 실행한다.
2. `frontend/`에서 Vite를 실행한다.
3. Playwright Chromium을 최초 한 번 설치한다.
4. 같은 PowerShell 세션에 E2E 사용자·관리자 계정 변수를 설정한다.
5. 전체 또는 특정 테스트를 실행한다.
6. 결과가 `passed`, `failed`, `skipped` 중 무엇인지 확인하고 실행 증적에 기록한다.
7. 테스트가 만든 데이터를 제거하거나 E2E DB를 초기화한다.

터미널 1:

```powershell
.\backend\run-local.ps1
```

`run-local.ps1`은 루트 `.env.local`을 읽으므로, 해당 파일의 `DB_URL`이 E2E 전용 DB를 가리킬 때만 이 실행 방법을 사용한다.

터미널 2:

```powershell
cd frontend
pnpm dev --host 127.0.0.1
```

터미널 3:

```powershell
cd frontend
pnpm exec playwright install chromium
$env:E2E_USER_EMAIL = 'e2e-user@example.test'
$env:E2E_USER_PASSWORD = '<e2e-user-password>'
$env:E2E_ADMIN_EMAIL = 'e2e-admin@example.test'
$env:E2E_ADMIN_PASSWORD = '<e2e-admin-password>'
$env:E2E_BASE_URL = 'http://127.0.0.1:5173'
pnpm test:e2e
```

브라우저를 보면서 실행하거나 특정 테스트를 디버깅하려면 다음 명령을 사용한다.

```powershell
pnpm exec playwright test --headed
pnpm exec playwright test --ui
pnpm exec playwright test e2e/auth.spec.ts --debug
pnpm exec playwright test --reporter=html
pnpm exec playwright show-report
```

현재 `playwright.config.ts`에는 `webServer` 설정이 없으므로 Spring Boot와 Vite를 먼저 별도 프로세스로 실행해야 한다. 인증 환경변수가 없으면 현재의 인증 E2E 테스트는 의도적으로 `SKIP`된다. `SKIP`은 `PASS`로 기록하지 않는다.

## 11. 실행 이력 템플릿

실행 결과는 최신 상태만 덮어쓰지 말고 CI 리포트 또는 릴리스 기록에 회차별로 보존한다.

| 실행 ID | 일시 | 대상 커밋·배포 버전 | 환경 | 명령 | PASS | FAIL | SKIP | BLOCKED | 증적/비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 예시 | 2026-09-16 | `<commit>` | local-h2 | `.\gradlew.bat test` | 9 | 0 | 0 | 0 | `backend/build/reports/tests/test/index.html` |

커밋 식별자를 확인할 수 없는 환경에서는 임의 값을 쓰지 않고 `확인 불가`로 기록한다.
