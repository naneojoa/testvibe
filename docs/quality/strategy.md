# 테스트와 검증 전략

테스트 담당자는 테스트 작성·실행·재현·정리와 증거 수집을 맡는다. 검증 담당자는 요구사항, 구현, assertion과 실행 증거를 비교해 최종 판정한다. 역할 상세는 [에이전트 운영 가이드](quality-agents.md)를 따른다.

| 계층 | 대상 | 표준 명령 또는 문서 |
|---|---|---|
| 문서 하네스 | 필수 문서·AC·요구사항·테스트 경로·로컬 링크 | `python harness/check.py` |
| 하네스 자체 테스트 | 정상 입력 허용과 잘못된 입력 거부 | `python -m unittest discover -s harness/tests -v` |
| 프론트 정적·단위 | format, lint, Vitest, production build | `python harness/run_product.py --execute --suite frontend` |
| 백엔드 | Spotless와 Gradle test | `python harness/run_product.py --execute --suite backend` |
| PostgreSQL 통합 | migration·제약·trigger·동시성 | 환경 확정 전 `NOT RUN` |
| E2E | 쿠키·프록시·사용자 여정 | 격리 DB·계정 확인 전 `BLOCKED` |

상태는 `PASS`, `FAIL`, `BLOCKED`, `SKIPPED`, `NOT RUN`으로 기록한다. 과거 보고서나 테스트 파일 존재는 현재 실행 증거가 아니다.

제품 테스트는 격리 DB, 일회용 계정, 고정 fixture와 정리 절차를 사용한다. 실제 운영 데이터나 개인·공용 개발 DB에 데이터 변경 검사를 실행하지 않는다.
