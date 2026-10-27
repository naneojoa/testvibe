---
name: board-test
description: 게시판 회귀 테스트를 작성·실행하고 실패를 재현해 프론트·백엔드·E2E 증거를 수집할 때 사용한다. 제품 수정이나 독립적인 최종 판정에는 사용하지 않는다.
---

# 게시판 테스트 절차

`.agents/roles/board-tester.md`의 역할 지침과 `AGENTS.md`, `docs/engineering-playbook.md`, `docs/quality-agents.md`, `docs/quality-validation-plan.md`를 읽는다. 부모가 전달한 검증 계획과 해당 명세의 시나리오 ID를 확인한다. 단독 요청이라면 명세에서 사례를 도출하고 독립 검토가 없었음을 보고한다.

1. 소스 상태, 기존 변경, 도구 버전, 실제 스크립트와 테스트 설정을 확인한다. 기억한 테스트 수나 설정을 현재 상태로 단정하지 않는다.
2. 데이터 변경 API/E2E 전에 전용 DB의 식별 정보, 백엔드의 실제 접속 대상, 프론트 프록시, 일회용 USER/ADMIN 계정과 정리 방법을 확인한다. `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`는 존재 여부만 확인하고 비밀값은 출력하지 않는다. 격리가 확인되지 않으면 해당 실행을 `BLOCKED`로 두고 독립적인 검사를 계속한다.
3. 행동을 증명하는 최소 테스트 계층을 고른다. UI 로직은 Vitest/Testing Library, API는 MVC·서비스 테스트, DB 고유 동작은 PostgreSQL 통합 테스트, 브라우저 여정은 Playwright를 사용한다. assertion을 약화하거나 skip을 추가해 통과시키지 않는다.
4. 현재 구성에서 프론트 기본 명령은 `frontend/`의 `pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm build`이다. 빌드가 TypeScript 검사도 포함하는지 다시 확인한다. 백엔드는 Windows `backend/`에서 `./gradlew.bat spotlessCheck test`, Git Bash/WSL에서는 `./gradlew spotlessCheck test`를 사용한다.
5. E2E 전 `frontend/playwright.config.ts`와 `pnpm exec playwright test --list`를 확인한다. Chromium이 없으면 설치한다. `webServer`가 없으면 검증용 백엔드와 프론트를 각각 준비한 뒤 `pnpm test:e2e`를 실행한다. PostgreSQL 통합 환경이 없으면 H2 결과를 PostgreSQL 증거라고 보고하지 않는다.
6. 실패를 제품·테스트·환경 문제로 분류한다. 새 분석 없이 일시적 오류를 재시도하는 횟수는 한 번으로 제한하고 첫 실패를 남긴다. 자신이 만든 데이터와 프로세스만 정리한다.

요청 범위의 테스트 파일·테스트 전용 설정·픽스처를 관리한다. 자동화 근거가 바뀌면 `docs/spec-test-traceability.md`를 갱신한다. 제품 코드, 제품 계약, 적용된 Flyway 마이그레이션은 수정하지 않는다. 부모가 지정한 실행 디렉터리의 `test-results.md`에 시나리오별 명령·디렉터리·소스 상태·종료 코드·통과/실패/건너뜀 수·기대/실제 결과·증거 경로·정리 결과와 남은 위험을 적는다. 상태는 `PASS`, `FAIL`, `BLOCKED`, `SKIPPED`, `NOT RUN`으로 구분하고 비밀값과 민감한 브라우저 산출물을 가린다. 결과는 독립 검토를 위해 부모에게 전달한다.
