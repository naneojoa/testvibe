# Frontend quality and test guide

## What is automated

Developers do not repeat the full checklist manually. `format:check`, `lint`, unit/component tests, and the production build run automatically in CI. Browser journeys run with Playwright against an isolated backend and database.

Manual testing remains only for exploratory UX, visual review, and a release smoke check in the real deployment environment.

## Local commands

```powershell
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

Start Spring Boot on port 8080 before `pnpm dev`; Vite proxies `/api` to it.

## E2E prerequisites

E2E tests must never point to a personal or shared development database. Start Vite and Spring Boot against a resettable E2E database, then provide a dedicated regular-user account:

```powershell
$env:E2E_USER_EMAIL = 'e2e-user@example.test'
$env:E2E_USER_PASSWORD = '<e2e-password>'
$env:E2E_ADMIN_EMAIL = 'e2e-admin@example.test'
$env:E2E_ADMIN_PASSWORD = '<e2e-admin-password>'
$env:E2E_BASE_URL = 'http://127.0.0.1:5173'
pnpm exec playwright install chromium
pnpm test:e2e
```

Without the E2E credentials, authenticated Playwright tests are skipped intentionally rather than accidentally running against an unknown account.

## Test ownership

- Unit tests: pure validation, parsing, response and error mapping.
- Component tests: a component's loading, error, validation, permission, and callback behavior.
- E2E tests: login cookies, redirects, routing, mutation success, and cache-visible user journeys.
- Backend PostgreSQL integration: database constraints, triggers, and concurrency.

Map each addition to the IDs in `../docs/quality/backend-api-test-scenarios.md` and update `../docs/quality/spec-test-traceability.md`.
