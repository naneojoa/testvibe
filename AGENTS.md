# 프로젝트 개발 가이드

## 기술 스택

- Frontend: React, TypeScript, Vite, Zustand, TanStack Query
- Backend: Java 17, Spring Boot 3.x, JPA, QueryDSL
- Database: PostgreSQL
- Build: Gradle Groovy DSL
- DB migration: Flyway

## 개발 규칙

- React 컴포넌트는 TypeScript로 작성한다.
- 전역 UI 상태와 로그인 사용자 상태는 Zustand로 관리한다.
- 게시글·댓글 같은 서버 데이터는 TanStack Query로 관리한다.
- JPA Entity를 API 응답으로 직접 반환하지 않고 DTO를 사용한다.
- 목록, 검색, 정렬, 페이지네이션 조회는 QueryDSL을 사용한다.
- DB 스키마 변경은 Flyway 마이그레이션으로만 수행한다.
- 비밀번호 원문과 DB 비밀번호를 코드나 Git에 저장하지 않는다.
- 모든 API 변경에는 입력 검증과 오류 응답을 포함한다.

## 데이터베이스 핵심 정책

- 기본 키는 UUID를 사용한다.
- 회원 권한은 USER, ADMIN으로 시작한다.
- 게시글과 댓글은 완전 삭제한다.
- 대댓글은 무제한 깊이를 허용한다.
- 게시글과 댓글 좋아요는 회원당 하나의 대상에 한 번만 허용한다.
- 비회원 조회는 원본 IP가 아닌 HMAC-SHA-256 IP 해시로 관리한다.
- 동일 회원 또는 IP 해시의 같은 게시글 조회 수는 24시간마다 한 번만 증가한다.

## 작업 방식

- 기능 단위로 작게 구현하고 테스트한다.
- 변경 전 기존 코드와 설정을 먼저 확인한다.
- 작업 완료 후 수정 파일, 실행한 검증, 남은 위험 요소를 간단히 보고한다.

## 프로젝트 구조

- `frontend/`: React 애플리케이션
- `backend/`: Spring Boot 애플리케이션
- `docs/`: 설계·API·운영 문서
- DB 마이그레이션: `backend/src/main/resources/db/migration`

현재 Spring Boot 애플리케이션은 `backend/`에 있다.

## 백엔드 명세 참조

- API, 요청·응답 DTO, 오류 코드, 인증·권한 또는 도메인 규칙을 변경하기 전에 `docs/backend-api-spec.md`를 확인한다.
- 위 계약을 변경하면 구현 코드와 `docs/backend-api-spec.md`를 같은 작업에서 함께 갱신한다.

## API 규칙

- REST API는 `/api`로 시작한다.
- 요청과 응답은 JSON을 사용한다.
- Entity를 Controller에서 직접 반환하지 않는다.
- 입력값은 Bean Validation으로 검증한다.
- 오류 응답 형식은 프로젝트 전체에서 통일한다.
- 인증이 필요한 API는 Spring Security에서 권한을 검증한다.

## 프론트엔드 상태 규칙

- Zustand: 로그인 사용자, 모달, 토스트, 테마 등 클라이언트 상태.
- TanStack Query: 게시글, 댓글, 좋아요 등 서버 상태.
- 서버 데이터를 Zustand에 중복 저장하지 않는다.
- API 응답과 요청은 TypeScript 타입을 선언한다.
- `any` 사용을 피하고 필요한 타입을 명시한다.

## 백엔드 데이터 접근 규칙

- JPA는 등록, 수정, 삭제, 단건 조회에 사용한다.
- QueryDSL은 목록, 검색, 동적 조건, 정렬, 페이지네이션에 사용한다.
- 연관 엔티티 조회 시 N+1 문제를 확인한다.
- Service 계층에서 트랜잭션 경계를 관리한다.
- DB 스키마 변경은 Flyway 파일로만 수행한다.

## 검증 규칙

- 기능 변경 후 관련 백엔드 테스트를 실행한다.
- 프론트 변경 후 TypeScript 검사와 lint를 실행한다.
- API 변경 시 정상·권한 없음·검증 실패 경우를 확인한다.
- 작업 완료 보고에는 변경 파일, 검증 결과, 남은 주의사항을 포함한다.

## 보안 규칙

- `.env`, DB 비밀번호, JWT 비밀키, IP 해시용 서버 비밀키는 Git에 커밋하지 않는다.
- 비밀번호 원문을 DB 또는 로그에 남기지 않는다.
- JWT를 localStorage에 저장하지 않는다.
- 비회원 원본 IP는 저장하지 않고 HMAC-SHA-256 해시만 저장한다.
- 기존 마이그레이션 파일은 수정하지 않고 새 버전 파일을 추가한다.

## 개발 명령어

현재 확인된 Gradle Wrapper 기준:

- Backend 실행: `cd backend; .\gradlew.bat bootRun`
- Backend 테스트: `cd backend; .\gradlew.bat test`

`frontend/`와 `package.json`이 생성된 뒤에만 아래 명령을 확인하여 사용한다.

- Frontend 실행: `pnpm dev`
- Frontend 검사: `pnpm lint`
- Frontend 빌드: `pnpm build`

## Quality and handoff references

- Read `docs/engineering-playbook.md` before non-trivial implementation or review work.
- Treat `docs/backend-api-spec.md` and `docs/front-spec.md` as the current product and API contracts.
- Update `docs/spec-test-traceability.md` whenever a contract scenario or its automated evidence changes.
- Follow `docs/quality-validation-plan.md` and `docs/release-checklist.md`; a skipped E2E suite is not a passing suite.
- Frontend standard verification is `pnpm format:check`, `pnpm lint`, `pnpm test`, and `pnpm build`.
