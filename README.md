# BBS board

React/Vite frontend and Spring Boot/PostgreSQL backend for a community board.

## Quick start

1. Configure local-only environment values as described in `docs/backend-operations.md`.
2. Start the backend from `backend/` with `./gradlew.bat bootRun --args='--spring.profiles.active=local'`.
3. Start the frontend from `frontend/` with `pnpm install --frozen-lockfile` and `pnpm dev`.
4. Open `http://localhost:5173`. Vite proxies `/api` to backend port 8080.

Never commit `.env.local`, database credentials, JWT secrets, or E2E account credentials.

## Quality commands

```powershell
cd backend
.\gradlew.bat spotlessCheck test --no-daemon

cd ../frontend
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

Browser E2E prerequisites and commands are in `frontend/README.md`.

## Documentation map

- `AGENTS.md`: concise project rules and required checks.
- `docs/backend-api-spec.md`: API, DTO, authentication, authorization, and error contract.
- `docs/front-spec.md`: frontend UX, state, and structure decisions.
- `docs/engineering-playbook.md`: development, review, test, and regression rules.
- `docs/quality-validation-plan.md`: test layers, environments, and release gates.
- `docs/spec-test-traceability.md`: contract ID to automated evidence.
- `docs/release-checklist.md`: release candidate manual and automated checks.
- `docs/adr/`: durable architecture decisions and unresolved operational decisions.
