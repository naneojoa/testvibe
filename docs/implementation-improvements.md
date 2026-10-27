# 프론트·백엔드 개선 구현 기록

## 문서 역할

이 문서는 특정 개선 작업에서 실제로 변경한 소스, 검증 결과와 남은 위험을 기록하는 구현 문서다.

- `backend-api-spec.md`: 외부 API 계약, 보안·트랜잭션 설계 원칙과 변경 사유
- `front-spec.md`: UX, 상태 관리, 프론트 모듈 경계와 변경 사유
- `implementation-improvements.md`: 파일별 구현 내역, 실행 명령, 검증 결과와 미적용 항목

설계 문서에는 다음 작업에서도 지켜야 할 결정을 남기고, 구현 문서에는 현재 시점의 파일과 명령처럼 바뀔 수 있는 증거를 남긴다. 이 구분은 spec이 긴 작업 일지로 변해 핵심 계약을 찾기 어려워지는 것을 방지한다.

## 2026-07-28

### 백엔드 적용 내용

#### Service 트랜잭션 경계

- `PostService`, `CommentService`, `UserService`, `AdminUserService`, `LikeService`를 추가했다.
- Controller에서 수행하던 Entity 조회·권한 확인·변경을 Service로 이동했다.
- 게시글과 댓글 수정은 flush 이후 DTO를 생성해 `updatedAt`을 포함한 응답이 실제 저장 상태와 일치하게 했다.
- 게시글·댓글 Repository에 작성자와 부모 관계를 위한 EntityGraph/fetch join 조회를 추가했다.

변경 사유는 `open-in-view=false` 환경에서 Controller가 영속성 컨텍스트에서 분리된 엔티티를 수정하거나 LAZY 연관관계를 읽어 수정이 저장되지 않고 500이 발생할 수 있었기 때문이다.

#### 오류 및 디버깅 계약

- `ErrorResponse`와 `RequestIdFilter`를 추가했다.
- 오류 응답과 `X-Request-ID` 헤더에 같은 요청 식별자를 포함한다.
- 예상하지 못한 5xx 예외는 HTTP 메서드, 경로, 요청 식별자와 스택 추적 정보를 `ERROR` 로그에 기록한다.
- UUID·JSON·enum·Bean Validation 오류를 400으로, DB 제약 충돌을 409로 변환한다.
- Spring Security 401·403도 공통 JSON 오류 형식을 사용한다.

변경 사유는 기존 `INTERNAL_ERROR` 응답만으로 원인과 발생 요청을 연결할 수 없었기 때문이다. 응답에는 내부 예외를 노출하지 않고 요청 식별자만 제공해 보안과 추적성을 함께 유지한다.

#### 인증·보안

- 액세스 토큰 사용 시 회원 존재 여부와 현재 역할을 DB에서 다시 확인한다.
- `GET /api/auth/csrf`와 Cookie 기반 CSRF 보호를 추가했다.
- 잘못된 리프레시 토큰을 `401 INVALID_TOKEN`으로 변환한다.
- 관리자 회원 삭제 성공 응답을 204로 수정했다.

변경 사유는 삭제·강등된 관리자의 기존 역할 claim 사용과 쿠키 인증의 CSRF 방어 공백을 해소하기 위함이다.

#### 회귀 테스트

- `ErrorResponseTests`: 오류 JSON, 요청 식별자, 401, CSRF, 관리자 페이지 검증
- `ServiceTransactionTests`: 게시글·댓글·프로필 수정 영속화
- 기존 컨텍스트와 요청 바인딩 테스트 포함 총 9개 성공

실행 명령:

```powershell
cd backend
.\gradlew.bat spotlessApply spotlessCheck test --no-daemon --console=plain
```

### 프론트 적용 내용

#### 공통 API

- `jsonRequest`를 `features/auth/api.ts`에서 `lib/api.ts`로 이동했다.
- POST·PUT·PATCH·DELETE 전에 CSRF 토큰을 한 번 확보하고 서버가 알려 준 헤더에 포함한다.
- `ApiError`가 `requestId`, `timestamp`, `path`를 보존한다.
- 미분류 서버 오류에 사용자 전달용 오류 번호를 표시한다.

#### 구조와 접근성

- 댓글 조회·트리·작성·수정·삭제 UI를 `features/comments/CommentSection.tsx`로 분리했다.
- 오류 토스트는 `role="alert"`, 일반 알림은 `role="status"`를 사용한다.
- `frontend/node_modules/`, `frontend/dist/`, `frontend/coverage/`를 Git 제외 대상으로 추가했다.
- Prettier 설정과 `format`, `format:check` 명령을 추가하고 기존 TSX·CSS를 포맷했다.

#### 검증

```powershell
cd frontend
pnpm format
pnpm lint
pnpm test
pnpm build
```

- 테스트 파일 5개, 테스트 16개 성공
- JavaScript 305.39KB, gzip 96.19KB
- CSS 5.84KB, gzip 1.91KB

### 의도적으로 미적용한 항목

- 리프레시 토큰 서버 폐기·회전: 토큰 저장 모델과 다중 기기 정책 결정이 필요하다.
- 프록시 환경의 비회원 IP 식별: 신뢰할 프록시 범위와 배포 구조가 확정되어야 한다.
- 댓글 페이지네이션·가상화: 백엔드 API 계약과 실제 대량 데이터 측정이 필요하다.
- 경로별 지연 로딩: 현재 초기 번들이 약 96KB gzip으로, 추가 코드 묶음 관리 비용보다 이득이 크다는 근거가 없다.
- 검색용 PostgreSQL trigram 인덱스와 커서 기반 페이지네이션: 실제 데이터 크기와 실행 계획을 측정한 뒤 Flyway 변경으로 진행한다.
- 좋아요 낙관적 업데이트: 현재 응답에 `likedByMe`와 최종 `likeCount`가 없어 서버 트리거 상태와 불일치할 수 있다.

미적용 항목은 구현 누락이 아니라 제품·운영 결정 또는 측정 근거가 필요한 작업이다. 조건이 확정되면 API·DB·프론트 계약을 함께 변경한다.
