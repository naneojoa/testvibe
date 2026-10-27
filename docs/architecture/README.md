# 공통 설계와 ADR

시스템 경계, 데이터 흐름, 보안·권한, 배포 구조처럼 여러 기능에 영향을 주는 결정을 관리한다. 중요한 선택은 `templates/decision.md`를 복사해 `adr/0002-...md`처럼 작성한다.

기능별 동작은 `features/`, API·화면·DB의 현재 계약은 `contracts/`, 실행 결과는 `quality/`에 둔다.
