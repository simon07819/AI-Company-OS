# Server Auth API Audit

## Public API

These routes remain intentionally public:

- `/api/status`
- `/api/system/health`
- `/api/demo/readiness`
- `/api/runtime-mode`

## Private API Prefixes

Protected by `middleware.ts` and local server auth:

- CEO/private workflow: `/api/ceo/*`
- Runtime state: `/api/runtime/*`
- Mission/artifact output state: `/api/mission/*`, `/api/missions/*`, `/api/artifacts/*`, `/api/visible-outputs/*`
- Autopilot mission operations: `/api/autopilot/*`

## Admin API Prefixes

Protected with admin-level auth:

- `/api/admin/*`
- `/api/runtime/reset`
- `/api/runtime/agent/*`
- `/api/logs/*`
- `/api/system/backup`
- `/api/system/backups`

## Auth Behavior

- Development: localhost requests can use the local dev bypass.
- Production: no dev bypass is allowed.
- Production without `AI_COMPANY_AUTH_TOKEN` or `AIOS_AUTH_TOKEN`: private routes return `403`.
- Production with a configured token: private routes require `Authorization: Bearer <token>`, `x-aios-auth-token`, or `aios_auth` cookie.

No token values are logged or rendered by the app.
