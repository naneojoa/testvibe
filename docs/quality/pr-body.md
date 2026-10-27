## 문제와 변경 결과

기존 문서가 `docs/` 한 단계에 섞여 있어 고객 요구사항, 제품 계약, 운영 절차와 실행 증거의 책임을 구분하기 어려웠습니다. 기존 계약과 시나리오 ID를 보존하면서 요구사항·제품·기능·계약·설계·품질·운영·이력 디렉토리로 재구성했습니다.

기능별 PRD·인수 기준·추적 JSON 양식과 문서 검사기, 실제 프론트·백엔드 품질 명령을 실행하는 하네스, CI와 PR 양식을 추가했습니다.

## 검증

- 문서 하네스 PASS.
- 하네스 자체 테스트 16개 PASS.
- 프론트 format, lint, Vitest 21개, build PASS.
- 백엔드 `spotlessCheck test` PASS.
- 상세: `docs/quality/docs-harness-validation.md`.

## 제한과 위험

PostgreSQL 전용 통합과 Playwright E2E는 `NOT RUN`입니다. 고객 미정 정책은 `docs/product/questions.md`에 남겼습니다. 제품 코드와 적용된 Flyway migration은 변경하지 않았습니다.
