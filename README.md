# BBS board

React/Vite frontend and Spring Boot/PostgreSQL backend for a community board.

## Quick start

1. Configure local-only environment values as described in `docs/operations/backend-operations.md`.
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
- `docs/README.md`: documentation directory roles and reading order.
- `docs/product/prd.md`: product scope and core acceptance criteria.
- `docs/contracts/`: API, frontend, database, and SQL reference contracts.
- `docs/features/`: feature PRDs, plans, and machine-readable traceability.
- `docs/quality/`: test strategy, scenarios, evidence, and validation reports.
- `docs/operations/`: development, local operation, and release procedures.
- `docs/architecture/adr/`: durable architecture decisions.
- `harness/`: repeatable documentation and product verification entry points.

Start documentation work with `docs/workflow.md`. Run the documentation harness with:

```powershell
python -m unittest discover -s harness/tests -v
python harness/check.py
```
