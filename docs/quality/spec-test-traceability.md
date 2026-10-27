# 명세·테스트 연결표

| 계약 ID 또는 검증 항목 | 테스트 계층 | 자동화 증거 | 상태 |
| --- | --- | --- | --- |
| AUTH-02 | Playwright | `frontend/e2e/auth.spec.ts` 로그인·새로고침 | 구현됨; 격리된 E2E 계정 필요 |
| POST-04, POST-05, POST-06 | Playwright | `frontend/e2e/posts.spec.ts` 로그인 완료 확인 후 작성·수정·삭제 | 로그인 대기 보완; 격리된 E2E 계정으로 재검증 필요 |
| COMMENT-02 | Playwright | `frontend/e2e/comments.spec.ts` 로그인 완료 확인 후 최상위 댓글 작성 | 로그인 대기 보완; 격리된 E2E 계정으로 재검증 필요 |
| COMMENT-02, EDGE-06 | React Testing Library | `CommentSection.test.tsx` 비회원 제출 시 POST 없이 로그인 안내 실행 | 구현됨 |
| EDGE-07 | Playwright | `frontend/e2e/admin.spec.ts` 로그인 완료 확인 후 일반 회원·관리자의 메뉴 표시 여부 | 로그인 대기 보완; 격리된 E2E 계정으로 재검증 필요 |
| EDGE-10, EDGE-11 | Vitest | `validation.test.ts` | 구현됨 |
| EDGE-20 | Vitest | `PostListPage.test.ts` 페이지 범위와 잘못된 페이지 값 해석 | 구현됨 |
| CSRF 쿠키 헤더·오류 복구 | Vitest | `api.test.ts` 쿠키 토큰 전달, 쿠키 누락 거부, 오래된 토큰의 403 응답 시 한 번 재시도 | 구현됨 |
| EDGE-26, EDGE-27 | PostgreSQL 통합 테스트 | 백엔드 동시성 테스트 묶음 | 대기 중 |

API 계약이나 테스트 시나리오가 바뀌면 같은 작업에서 이 표도 갱신한다.
