# 검증 하네스

하네스는 같은 입력과 명령으로 검사를 반복하는 실행 진입점이다. Python 3.11 이상 표준 라이브러리만 사용한다.

## 문서 구조

```powershell
python -m unittest discover -s harness/tests -v
python harness/check.py
```

필수 문서, 기능 spec의 섹션, AC 중복·누락, 요구사항 원문과 ID, 테스트 파일, 로컬 Markdown 링크와 이전 평면 경로 잔존 여부를 검사한다. 결과는 `artifacts/harness-result.json`에 저장한다.

자연어의 정확성, 고객 승인, 테스트 assertion의 충분성, 제품 동작은 문서 하네스가 판단하지 않는다.

## 제품 명령

실행 없이 계획만 확인하면 `NOT RUN`과 종료 코드 2를 반환한다.

```powershell
python harness/run_product.py --suite all
python harness/run_product.py --execute --suite frontend
python harness/run_product.py --execute --suite backend
python harness/run_product.py --execute --suite all
```

제품 하네스는 프론트의 `format:check`, `lint`, `test`, `build`와 백엔드의 `spotlessCheck test`를 실행한다. 한 단계가 실패하거나 차단되면 이후 단계는 `NOT RUN`으로 둔다. 결과는 `artifacts/product/`에 저장되며 Git에서 제외된다.

이 명령은 의존성을 설치하지 않는다. PostgreSQL 통합 및 Playwright E2E는 격리 DB·전용 계정·초기화·정리 절차가 확인된 뒤 별도 실행한다.
